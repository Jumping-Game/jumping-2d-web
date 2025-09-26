import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetClient } from '../../net/NetClient';
import type {
  LobbyPlayer,
  NetConfig,
  NetRoomState,
  S2CLobbyState,
  S2CSnapshot,
  S2CStart,
  S2CStartCountdown,
  S2CWelcome,
} from '../../net/Protocol';
import { useNetStore } from '../../state/store';
const setupCanvasStub = vi.hoisted(() => {
  if (typeof HTMLCanvasElement === 'undefined') {
    return null;
  }
  const canvasContextStub: Record<string, unknown> = {
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
  };
  Object.defineProperty(canvasContextStub, 'fillStyle', {
    value: '#000000',
    writable: true,
    configurable: true,
  });
  Object.defineProperty(canvasContextStub, 'globalCompositeOperation', {
    value: 'source-over',
    writable: true,
    configurable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(() => canvasContextStub),
    configurable: true,
  });
  return canvasContextStub;
});
void setupCanvasStub;

vi.mock('phaser', () => {
  const stubDisplayObject = () => ({
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setShadow: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  });

  class Scene {
    public time = { now: 0 };
    public add = {
      image: vi.fn(() => stubDisplayObject()),
      text: vi.fn(() => stubDisplayObject()),
      tileSprite: vi.fn(() => stubDisplayObject()),
    };
    public input = {
      keyboard: {
        addKey: vi.fn(() => ({ on: vi.fn(), isDown: false })),
      },
      addPointer: vi.fn(),
      on: vi.fn(),
    };
    public cameras = { main: { setBounds: vi.fn(), startFollow: vi.fn() } };
    public scale = { width: 0, height: 0 };
    public physics = { world: { setBounds: vi.fn() } };
  }

  return {
    __esModule: true,
    default: {
      Scene,
      Input: {
        Keyboard: {
          KeyCodes: new Proxy(
            {},
            {
              get: () => 0,
            }
          ),
          JustDown: () => false,
        },
      },
    },
    Scene,
    Input: {
      Keyboard: {
        KeyCodes: new Proxy(
          {},
          {
            get: () => 0,
          }
        ),
        JustDown: () => false,
      },
    },
    GameObjects: {
      Image: class {},
      Text: class {},
      TileSprite: class {},
    },
  };
});

import { GameScene } from '../../render/GameScene';

const SAMPLE_CFG: NetConfig = {
  tps: 60,
  snapshotRateHz: 20,
  maxRollbackTicks: 6,
  inputLeadTicks: 2,
  world: {
    worldWidth: 480,
    platformWidth: 64,
    platformHeight: 18,
    gapMin: 24,
    gapMax: 96,
    gravity: 9.8,
    jumpVy: 320,
    springVy: 520,
    maxVx: 240,
    tiltAccel: 160,
  },
  difficulty: {
    gapMinStart: 24,
    gapMinEnd: 32,
    gapMaxStart: 96,
    gapMaxEnd: 112,
    springChanceStart: 0.1,
    springChanceEnd: 0.3,
  },
};

const LOBBY_PLAYERS: LobbyPlayer[] = [
  {
    id: 'p1',
    name: 'Master',
    ready: true,
    role: 'master',
    characterId: 'aurora',
  },
  {
    id: 'p2',
    name: 'Member',
    ready: true,
    role: 'member',
    characterId: 'cobalt',
  },
];

const createClient = () =>
  new NetClient({
    clientVersion: 'test-suite',
    flushIntervalMs: 16,
    pingIntervalMs: 1000,
    debug: false,
  });

const invokeHandleLobbyState = (client: NetClient, state: S2CLobbyState) => {
  (
    client as unknown as { handleLobbyState(payload: S2CLobbyState): void }
  ).handleLobbyState(state);
};

const invokeHandleStartCountdown = (
  client: NetClient,
  payload: S2CStartCountdown
) => {
  (
    client as unknown as {
      handleStartCountdown(payload: S2CStartCountdown): void;
    }
  ).handleStartCountdown(payload);
};

const invokeHandleStart = (client: NetClient, payload: S2CStart) => {
  (client as unknown as { handleStart(payload: S2CStart): void }).handleStart(
    payload
  );
};

const invokeHandleWelcome = (client: NetClient, payload: S2CWelcome) => {
  (
    client as unknown as { handleWelcome(payload: S2CWelcome): void }
  ).handleWelcome(payload);
};

type DisplayStub = {
  setPosition: ReturnType<typeof vi.fn>;
  setVisible: ReturnType<typeof vi.fn>;
  setAlpha: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

interface RemoteStub {
  sprite: DisplayStub;
  label: DisplayStub;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  lastSeen: number;
}

type GameSceneInternals = Omit<
  GameScene,
  'netClient' | 'netRoomState' | 'localPlayerId' | 'remotePlayers'
> & {
  netClient: NetClient;
  netRoomState: NetRoomState;
  localPlayerId?: string;
  remotePlayers: Map<string, RemoteStub>;
  getOrCreateRemotePlayer(id: string): RemoteStub;
  handleStartMatch(): void;
  handleNetSnapshot(snapshot: S2CSnapshot): void;
};

describe('NetClient protocol alignment', () => {
  beforeEach(() => {
    useNetStore.getState().reset();
  });

  afterEach(() => {
    useNetStore.getState().reset();
  });

  it('requires a full snapshot after start and captures the full roster', () => {
    const client = createClient();
    const snapshots: S2CSnapshot[] = [];
    client.onSnapshot((snapshot) => {
      snapshots.push(snapshot);
    });

    invokeHandleLobbyState(client, {
      roomState: 'lobby',
      players: LOBBY_PLAYERS,
      maxPlayers: 2,
    });

    const countdown: S2CStartCountdown = {
      startAtMs: Date.now() + 3000,
      serverTick: 10,
      countdownSec: 3,
    };
    invokeHandleStartCountdown(client, countdown);

    const start: S2CStart = {
      startTick: 120,
      serverTick: 120,
      serverTimeMs: Date.now(),
      tps: 60,
      players: LOBBY_PLAYERS,
    };
    invokeHandleStart(client, start);

    client.simulateSnapshot({
      tick: 121,
      full: false,
      players: [
        {
          id: 'p1',
          alive: true,
        },
      ],
    });

    expect(snapshots).toHaveLength(0);

    client.simulateSnapshot({
      tick: 122,
      full: true,
      players: [
        { id: 'p1', x: 10, y: 20, alive: true },
        { id: 'p2', x: 15, y: 25, alive: true },
      ],
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.full).toBe(true);
    expect(snapshots[0]?.players).toHaveLength(2);

    const store = useNetStore.getState();
    expect(store.roomState).toBe('running');
    expect(store.players.map((player) => player.id)).toEqual(['p1', 'p2']);
  });

  it('drops delta snapshots until a full frame arrives after reconnect', () => {
    const client = createClient();
    const snapshots: S2CSnapshot[] = [];
    client.onSnapshot((snapshot) => snapshots.push(snapshot));

    const welcome: S2CWelcome = {
      playerId: 'p2',
      resumeToken: 'resume-token',
      roomId: 'room-42',
      seed: 'seed',
      role: 'member',
      roomState: 'running',
      lobby: { players: LOBBY_PLAYERS, maxPlayers: 2 },
      cfg: SAMPLE_CFG,
    };
    invokeHandleWelcome(client, welcome);

    client.simulateSnapshot({
      tick: 400,
      full: false,
      players: [{ id: 'p1', x: 0, y: 0, alive: true }],
    });

    expect(snapshots).toHaveLength(0);

    client.simulateSnapshot({
      tick: 401,
      full: true,
      players: [
        { id: 'p1', x: 1, y: 2, alive: true },
        { id: 'p2', x: 3, y: 4, alive: true },
      ],
    });

    expect(snapshots).toHaveLength(1);
    expect(new Set(snapshots[0]?.players.map((player) => player.id))).toEqual(
      new Set(['p1', 'p2'])
    );
  });

  it('preserves lobby character selection into start and later snapshots', () => {
    const client = createClient();

    invokeHandleLobbyState(client, {
      roomState: 'lobby',
      players: LOBBY_PLAYERS,
      maxPlayers: 2,
    });

    const start: S2CStart = {
      startTick: 200,
      serverTick: 200,
      serverTimeMs: Date.now(),
      tps: 60,
      players: LOBBY_PLAYERS,
    };
    invokeHandleStart(client, start);

    const storeAfterStart = useNetStore.getState();
    expect(
      storeAfterStart.players.find((player) => player.id === 'p2')?.characterId
    ).toBe('cobalt');

    client.simulateSnapshot({
      tick: 201,
      full: true,
      players: [
        { id: 'p1', x: 0, y: 0, alive: true },
        { id: 'p2', x: 2, y: 2, alive: true },
      ],
    });

    const storeAfterSnapshot = useNetStore.getState();
    expect(storeAfterSnapshot.characterSelections.p1).toBe('aurora');
    expect(storeAfterSnapshot.characterSelections.p2).toBe('cobalt');
  });
});

describe('Lobby start restrictions and snapshot reconciliation', () => {
  beforeEach(() => {
    useNetStore.getState().reset();
  });

  afterEach(() => {
    useNetStore.getState().reset();
  });

  it('prevents members from sending start requests', () => {
    const scene = new GameScene() as unknown as GameSceneInternals;

    const requestStart = vi.fn();
    scene.netClient = {
      enabled: true,
      requestStart,
    } as unknown as NetClient;

    const store = useNetStore.getState();
    store.setRoomState('lobby');
    store.setRole('member');
    scene.handleStartMatch();
    expect(requestStart).not.toHaveBeenCalled();

    store.setRole('master');
    scene.handleStartMatch();
    expect(requestStart).toHaveBeenCalledWith(3);
  });

  it('hides remote players missing from a full snapshot broadcast', () => {
    const scene = new GameScene() as unknown as GameSceneInternals;

    scene.netClient = { enabled: true } as unknown as NetClient;
    scene.netRoomState = 'running';
    scene.localPlayerId = 'p1';
    scene.time.now = 5000;

    const createRemote = (): RemoteStub => ({
      sprite: {
        setPosition: vi.fn(),
        setVisible: vi.fn(),
        setAlpha: vi.fn(),
        destroy: vi.fn(),
      },
      label: {
        setPosition: vi.fn(),
        setVisible: vi.fn(),
        setAlpha: vi.fn(),
        destroy: vi.fn(),
      },
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      alive: true,
      lastSeen: 0,
    });

    const remotePlayers = scene.remotePlayers;
    remotePlayers.clear();
    const keep = createRemote();
    const hide = createRemote();
    remotePlayers.set('p2', keep);
    remotePlayers.set('p3', hide);

    scene.getOrCreateRemotePlayer = vi.fn((id: string) => {
      let state = remotePlayers.get(id);
      if (!state) {
        state = createRemote();
        remotePlayers.set(id, state);
      }
      return state;
    });

    scene.handleNetSnapshot({
      tick: 999,
      full: true,
      players: [
        { id: 'p1', x: 1, y: 1, alive: true },
        { id: 'p2', x: 2, y: 2, alive: true },
      ],
    });

    expect(hide.alive).toBe(false);
    expect(hide.sprite.setVisible).toHaveBeenCalledWith(false);
    expect(hide.label.setVisible).toHaveBeenCalledWith(false);
    expect(keep.sprite.setPosition).toHaveBeenCalledWith(2, -2);
    expect(keep.sprite.setVisible).toHaveBeenCalledWith(true);
  });
});
