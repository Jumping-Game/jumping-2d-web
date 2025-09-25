import { PlayerInput } from '../core/Types';

export type Pv = 1;

export interface Envelope<TPayload> {
  type: string;
  pv: Pv;
  seq: number;
  ts: number;
  payload: TPayload;
}

// Client → Server
export interface C2SJoin {
  name: string;
  clientVersion: string;
  device?: string;
  capabilities?: {
    tilt: boolean;
    vibrate: boolean;
  };
}

export interface C2SInput {
  tick: number;
  axisX: number;
  jump?: boolean;
  shoot?: boolean;
  checksum?: string;
}

export interface C2SInputBatch {
  startTick: number;
  frames: Array<{
    d: number;
    axisX: number;
    jump?: boolean;
    shoot?: boolean;
  }>;
}

export interface C2SPing {
  t0: number;
}

export interface C2SReconnect {
  playerId: string;
  resumeToken: string;
  lastAckTick: number;
}

// Server → Client
export interface NetWorldCfg {
  worldWidth: number;
  platformWidth: number;
  platformHeight: number;
  gapMin: number;
  gapMax: number;
  gravity: number;
  jumpVy: number;
  springVy: number;
  maxVx: number;
  tiltAccel: number;
}

export interface NetDifficultyCfg {
  gapMinStart: number;
  gapMinEnd: number;
  gapMaxStart: number;
  gapMaxEnd: number;
  springChanceStart: number;
  springChanceEnd: number;
}

export interface NetConfig {
  tps: number;
  snapshotRateHz: number;
  maxRollbackTicks: number;
  inputLeadTicks: number;
  world: NetWorldCfg;
  difficulty: NetDifficultyCfg;
}

export interface S2CWelcome {
  playerId: string;
  resumeToken: string;
  roomId: string;
  seed: string;
  cfg: NetConfig;
  featureFlags?: Record<string, boolean>;
}

export interface S2CStart {
  startTick: number;
  serverTick: number;
  serverTimeMs: number;
  tps: number;
}

export interface NetPlayer {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

export type NetEvent = {
  kind: 'spring' | 'break';
  x: number;
  y: number;
  tick: number;
};

export interface S2CSnapshot {
  tick: number;
  ackTick?: number;
  lastInputSeq?: number;
  full: boolean;
  players: Array<Partial<NetPlayer> & { id: string }>;
  events?: NetEvent[];
  stats?: {
    droppedSnapshots?: number;
  };
}

export interface S2CPong {
  t0: number;
  t1: number;
}

export interface S2CError {
  code: string;
  message?: string;
}

export interface S2CFinish {
  reason: 'room_closed' | 'timeout' | 'error';
}

export interface S2CPlayerPresence {
  id: string;
  state: 'active' | 'disconnected' | 'left';
}

export type ClientEnvelope =
  | Envelope<C2SJoin>
  | Envelope<C2SInput>
  | Envelope<C2SInputBatch>
  | Envelope<C2SPing>
  | Envelope<C2SReconnect>;

export type ServerEnvelope =
  | Envelope<S2CWelcome>
  | Envelope<S2CStart>
  | Envelope<S2CSnapshot>
  | Envelope<S2CPong>
  | Envelope<S2CError>
  | Envelope<S2CFinish>
  | Envelope<S2CPlayerPresence>;

export type NetInputPayload = Pick<PlayerInput, 'tick' | 'axisX' | 'jump'>;
