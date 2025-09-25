import {
  C2SInputBatch,
  C2SJoin,
  ClientEnvelope,
  Envelope,
  NetInputPayload,
  Pv,
  S2CError,
  S2CFinish,
  S2CPong,
  S2CPlayerPresence,
  S2CSnapshot,
  S2CStart,
  S2CWelcome,
  ServerEnvelope,
} from './Protocol';

export interface NetClientOptions {
  url?: string;
  token?: string;
  playerName?: string;
  clientVersion: string;
  device?: string;
  capabilities?: {
    tilt: boolean;
    vibrate: boolean;
  };
  flushIntervalMs: number;
  pingIntervalMs: number;
  debug?: boolean;
}

type DisconnectHandler = (event?: CloseEvent) => void;
type ErrorHandler = (error: S2CError | Error) => void;
type LatencyHandler = (latencyMs: number) => void;
type SnapshotHandler = (snapshot: S2CSnapshot) => void;
type WelcomeHandler = (welcome: S2CWelcome) => void;
type StartHandler = (start: S2CStart) => void;
type FinishHandler = (finish: S2CFinish) => void;
type PresenceHandler = (presence: S2CPlayerPresence) => void;
type PongHandler = (pong: S2CPong) => void;

const PV: Pv = 1;

const nowMs = (): number => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

export class NetClient {
  readonly enabled: boolean;

  private readonly opts: NetClientOptions;
  private readonly inputBuffer: NetInputPayload[] = [];
  private readonly snapshotHandlers = new Set<SnapshotHandler>();
  private readonly welcomeHandlers = new Set<WelcomeHandler>();
  private readonly startHandlers = new Set<StartHandler>();
  private readonly finishHandlers = new Set<FinishHandler>();
  private readonly presenceHandlers = new Set<PresenceHandler>();
  private readonly pongHandlers = new Set<PongHandler>();
  private readonly latencyHandlers = new Set<LatencyHandler>();
  private readonly connectHandlers = new Set<() => void>();
  private readonly disconnectHandlers = new Set<DisconnectHandler>();
  private readonly errorHandlers = new Set<ErrorHandler>();

  private ws?: WebSocket;
  private seq = 1;
  private playerName = 'web-player';
  private lastFlushTime = 0;
  private pingTimer?: ReturnType<typeof setInterval>;
  private pendingPings = new Map<number, number>();
  private resumeToken?: string;

  public playerId?: string;
  public roomId?: string;

  constructor(opts: NetClientOptions) {
    this.opts = opts;
    this.enabled = Boolean(opts.url);
    if (opts.playerName) {
      this.playerName = opts.playerName;
    }
  }

  prepareJoin(name: string): void {
    this.playerName = name;
    if (!this.enabled) {
      if (this.opts.debug) {
        console.info('[NetClient] Multiplayer disabled; running offline');
      }
      return;
    }
    this.openSocket();
  }

  bufferInput(tick: number, axisX: number, jump: boolean): void {
    this.inputBuffer.push({ tick, axisX, jump });
    if (!this.enabled) {
      return;
    }
    const now = nowMs();
    if (!this.lastFlushTime) {
      this.lastFlushTime = now;
    }
    if (now - this.lastFlushTime >= this.opts.flushIntervalMs) {
      this.flushInputBatch();
    }
  }

  flushInputBatch(): NetInputPayload[] {
    if (this.inputBuffer.length === 0) {
      return [];
    }

    const batch = [...this.inputBuffer];
    this.inputBuffer.length = 0;

    if (!this.enabled || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return batch;
    }

    const startTick = batch[0]!.tick;
    const frames = batch.map((input) => ({
      d: input.tick - startTick,
      axisX: Number(input.axisX.toFixed(3)),
      jump: input.jump || undefined,
    }));

    const payload: C2SInputBatch = {
      startTick,
      frames,
    };

    this.sendEnvelope('input_batch', payload);
    this.lastFlushTime = nowMs();

    return batch;
  }

  onSnapshot(handler: (snapshot: S2CSnapshot) => void): void {
    this.snapshotHandlers.add(handler);
  }

  onWelcome(handler: (welcome: S2CWelcome) => void): void {
    this.welcomeHandlers.add(handler);
  }

  onStart(handler: (start: S2CStart) => void): void {
    this.startHandlers.add(handler);
  }

  onFinish(handler: (finish: S2CFinish) => void): void {
    this.finishHandlers.add(handler);
  }

  onPresence(handler: (presence: S2CPlayerPresence) => void): void {
    this.presenceHandlers.add(handler);
  }

  onPong(handler: (pong: S2CPong) => void): void {
    this.pongHandlers.add(handler);
  }

  onLatency(handler: LatencyHandler): void {
    this.latencyHandlers.add(handler);
  }

  onConnect(handler: () => void): void {
    this.connectHandlers.add(handler);
  }

  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandlers.add(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  simulateSnapshot(snapshot: S2CSnapshot): void {
    this.emitSnapshot(snapshot);
  }

  getResumeToken(): string | undefined {
    return this.resumeToken;
  }

  destroy(): void {
    this.stopPingTimer();
    this.pendingPings.clear();
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleSocketError);
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    }
    this.ws = undefined;
  }

  private openSocket(): void {
    if (!this.opts.url) {
      return;
    }
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    const url = new URL(this.opts.url);
    if (this.opts.token) {
      url.searchParams.set('token', this.opts.token);
    }

    this.ws = new WebSocket(url.toString());
    this.ws.addEventListener('open', this.handleOpen);
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);
    this.ws.addEventListener('error', this.handleSocketError);
  }

  private readonly handleOpen = (): void => {
    this.seq = 1;
    this.startPingTimer();
    this.connectHandlers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[NetClient] connect handler error', err);
      }
    });
    this.sendJoin();
  };

  private readonly handleMessage = (event: MessageEvent): void => {
    if (typeof event.data !== 'string') {
      return;
    }
    try {
      const envelope = JSON.parse(event.data) as ServerEnvelope;
      this.processServerEnvelope(envelope);
    } catch (err) {
      console.error('[NetClient] Failed to parse message', err);
    }
  };

  private readonly handleClose = (event: CloseEvent): void => {
    this.stopPingTimer();
    this.ws = undefined;
    this.disconnectHandlers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[NetClient] disconnect handler error', err);
      }
    });
  };

  private readonly handleSocketError = (event: Event): void => {
    const error = new Error('WebSocket error');
    if (this.opts.debug) {
      console.error('[NetClient] socket error', event);
    }
    this.emitError(error);
  };

  private processServerEnvelope(envelope: ServerEnvelope): void {
    if (envelope.pv !== PV) {
      this.emitError({
        code: 'BAD_VERSION',
        message: `Server pv=${envelope.pv}, client pv=${PV}`,
      });
      return;
    }

    switch (envelope.type) {
      case 'welcome':
        this.handleWelcome(envelope.payload);
        break;
      case 'start':
        this.startHandlers.forEach((cb) => {
          try {
            cb(envelope.payload);
          } catch (err) {
            console.error('[NetClient] start handler error', err);
          }
        });
        break;
      case 'snapshot':
        this.emitSnapshot(envelope.payload);
        break;
      case 'pong':
        this.handlePong(envelope.payload);
        break;
      case 'error':
        this.emitError(envelope.payload);
        break;
      case 'finish':
        this.finishHandlers.forEach((cb) => {
          try {
            cb(envelope.payload);
          } catch (err) {
            console.error('[NetClient] finish handler error', err);
          }
        });
        break;
      case 'player_presence':
        this.presenceHandlers.forEach((cb) => {
          try {
            cb(envelope.payload);
          } catch (err) {
            console.error('[NetClient] presence handler error', err);
          }
        });
        break;
      default:
        if (this.opts.debug) {
          console.warn('[NetClient] Unhandled message type', envelope.type);
        }
    }
  }

  private handleWelcome(welcome: S2CWelcome): void {
    this.playerId = welcome.playerId;
    this.roomId = welcome.roomId;
    this.resumeToken = welcome.resumeToken;
    this.welcomeHandlers.forEach((cb) => {
      try {
        cb(welcome);
      } catch (err) {
        console.error('[NetClient] welcome handler error', err);
      }
    });
  }

  private handlePong(pong: S2CPong): void {
    this.pongHandlers.forEach((cb) => {
      try {
        cb(pong);
      } catch (err) {
        console.error('[NetClient] pong handler error', err);
      }
    });
    if (pong.t0) {
      const sentAt = this.pendingPings.get(pong.t0);
      if (sentAt !== undefined) {
        const rtt = nowMs() - sentAt;
        this.pendingPings.delete(pong.t0);
        this.latencyHandlers.forEach((cb) => {
          try {
            cb(rtt);
          } catch (err) {
            console.error('[NetClient] latency handler error', err);
          }
        });
      }
    }
  }

  private sendJoin(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const payload: C2SJoin = {
      name: this.playerName,
      clientVersion: this.opts.clientVersion,
      device: this.opts.device,
      capabilities: this.opts.capabilities,
    };

    this.sendEnvelope('join', payload);
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const t0 = Date.now();
    this.pendingPings.set(t0, nowMs());
    this.sendEnvelope('ping', { t0 });
  }

  private startPingTimer(): void {
    if (this.pingTimer) {
      return;
    }
    this.sendPing();
    this.pingTimer = setInterval(
      () => this.sendPing(),
      this.opts.pingIntervalMs
    );
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  private sendEnvelope<TPayload>(
    type: ClientEnvelope['type'],
    payload: TPayload
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.opts.debug) {
        console.warn('[NetClient] Dropping message; socket not open', type);
      }
      return;
    }

    const envelope: Envelope<TPayload> = {
      type,
      pv: PV,
      seq: this.seq++,
      ts: Date.now(),
      payload,
    };

    this.ws.send(JSON.stringify(envelope));
  }

  private emitSnapshot(snapshot: S2CSnapshot): void {
    const ackTick = snapshot.ackTick;
    if (typeof ackTick === 'number' && this.inputBuffer.length > 0) {
      const dropIndex = this.inputBuffer.findIndex(
        (input) => input.tick > ackTick
      );
      if (dropIndex === -1) {
        this.inputBuffer.length = 0;
      } else if (dropIndex > 0) {
        this.inputBuffer.splice(0, dropIndex);
      }
    }
    this.snapshotHandlers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('[NetClient] snapshot handler error', err);
      }
    });
  }

  private emitError(error: S2CError | Error): void {
    this.errorHandlers.forEach((cb) => {
      try {
        cb(error);
      } catch (err) {
        console.error('[NetClient] error handler error', err);
      }
    });
  }
}
