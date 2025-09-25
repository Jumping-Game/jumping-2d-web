import {
  type Envelope,
  type LobbyPlayer,
  type LobbySnapshot,
  type NetConfig,
  type NetDifficultyCfg,
  type NetEvent,
  type NetPlayer,
  type NetRoomState,
  type NetWorldCfg,
  type S2CError,
  type S2CFinish,
  type S2CLobbyState,
  type S2CPong,
  type S2CPlayerPresence,
  type S2CRoleChanged,
  type S2CSnapshot,
  type S2CStart,
  type S2CStartCountdown,
  type S2CWelcome,
  type ServerEnvelope,
  PROTOCOL_PV,
  type ServerMessageType,
} from './Protocol';
import { CHARACTER_OPTION_MAP } from '../config/characters';
import type { CharacterId } from '../config/characters';

export interface GuardResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

const ok = <T>(value: T): GuardResult<T> => ({ ok: true, value });
const fail = <T>(error: string): GuardResult<T> => ({ ok: false, error });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

const isString = (value: unknown): value is string => typeof value === 'string';

const isCharacterId = (value: unknown): value is CharacterId =>
  isString(value) && CHARACTER_OPTION_MAP.has(value as CharacterId);

const clonePrimitive = <T extends number | string | boolean>(value: T): T =>
  value;

const asRoomState = (value: unknown): GuardResult<NetRoomState> => {
  if (!isString(value)) {
    return fail('roomState must be string');
  }
  if (
    value === 'lobby' ||
    value === 'starting' ||
    value === 'running' ||
    value === 'finished'
  ) {
    return ok(value);
  }
  return fail(`invalid roomState: ${value}`);
};

const asRole = (value: unknown): GuardResult<'master' | 'member'> => {
  if (!isString(value)) {
    return fail('role must be string');
  }
  if (value === 'master' || value === 'member') {
    return ok(value);
  }
  return fail(`invalid role: ${value}`);
};

const validateWorldCfg = (value: unknown): GuardResult<NetWorldCfg> => {
  if (!isRecord(value)) {
    return fail('world config must be object');
  }
  const cfg: Partial<NetWorldCfg> = {};
  const keys: Array<keyof NetWorldCfg> = [
    'worldWidth',
    'platformWidth',
    'platformHeight',
    'gapMin',
    'gapMax',
    'gravity',
    'jumpVy',
    'springVy',
    'maxVx',
    'tiltAccel',
  ];
  for (const key of keys) {
    if (!isFiniteNumber(value[key])) {
      return fail(`world.${key} must be number`);
    }
    cfg[key] = value[key] as number;
  }
  return ok(cfg as NetWorldCfg);
};

const validateDifficultyCfg = (
  value: unknown
): GuardResult<NetDifficultyCfg> => {
  if (!isRecord(value)) {
    return fail('difficulty config must be object');
  }
  const cfg: Partial<NetDifficultyCfg> = {};
  const keys: Array<keyof NetDifficultyCfg> = [
    'gapMinStart',
    'gapMinEnd',
    'gapMaxStart',
    'gapMaxEnd',
    'springChanceStart',
    'springChanceEnd',
  ];
  for (const key of keys) {
    if (!isFiniteNumber(value[key])) {
      return fail(`difficulty.${key} must be number`);
    }
    cfg[key] = value[key] as number;
  }
  return ok(cfg as NetDifficultyCfg);
};

const validateConfig = (value: unknown): GuardResult<NetConfig> => {
  if (!isRecord(value)) {
    return fail('cfg must be object');
  }
  if (!isFiniteNumber(value.tps)) {
    return fail('cfg.tps must be number');
  }
  if (!isFiniteNumber(value.snapshotRateHz)) {
    return fail('cfg.snapshotRateHz must be number');
  }
  if (!isFiniteNumber(value.maxRollbackTicks)) {
    return fail('cfg.maxRollbackTicks must be number');
  }
  if (!isFiniteNumber(value.inputLeadTicks)) {
    return fail('cfg.inputLeadTicks must be number');
  }
  const world = validateWorldCfg(value.world);
  if (!world.ok || !world.value) {
    return fail(world.error ?? 'invalid cfg.world');
  }
  const difficulty = validateDifficultyCfg(value.difficulty);
  if (!difficulty.ok || !difficulty.value) {
    return fail(difficulty.error ?? 'invalid cfg.difficulty');
  }
  return ok({
    tps: value.tps as number,
    snapshotRateHz: value.snapshotRateHz as number,
    maxRollbackTicks: value.maxRollbackTicks as number,
    inputLeadTicks: value.inputLeadTicks as number,
    world: world.value,
    difficulty: difficulty.value,
  });
};

const validateLobbyPlayer = (value: unknown): GuardResult<LobbyPlayer> => {
  if (!isRecord(value)) {
    return fail('player must be object');
  }
  if (!isString(value.id)) {
    return fail('player.id must be string');
  }
  if (!isString(value.name)) {
    return fail('player.name must be string');
  }
  if (!isBoolean(value.ready)) {
    return fail('player.ready must be boolean');
  }
  const role = asRole(value.role);
  if (!role.ok || !role.value) {
    return fail(role.error ?? 'invalid player.role');
  }
  let characterId: CharacterId | undefined;
  if ('characterId' in value) {
    if (value.characterId === undefined || value.characterId === null) {
      characterId = undefined;
    } else if (!isCharacterId(value.characterId)) {
      return fail('player.characterId invalid');
    } else {
      characterId = value.characterId;
    }
  }
  return ok({
    id: value.id,
    name: value.name,
    ready: value.ready,
    role: role.value,
    characterId,
  });
};

const validateLobbySnapshot = (value: unknown): GuardResult<LobbySnapshot> => {
  if (!isRecord(value)) {
    return fail('lobby must be object');
  }
  if (!Array.isArray(value.players)) {
    return fail('lobby.players must be array');
  }
  const players: LobbyPlayer[] = [];
  for (let i = 0; i < value.players.length; i += 1) {
    const result = validateLobbyPlayer(value.players[i]);
    if (!result.ok || !result.value) {
      return fail(result.error ?? `invalid lobby.players[${i}]`);
    }
    players.push(result.value);
  }
  if (!isFiniteNumber(value.maxPlayers)) {
    return fail('lobby.maxPlayers must be number');
  }
  return ok({
    players,
    maxPlayers: value.maxPlayers,
  });
};

const validateWelcome = (value: unknown): GuardResult<S2CWelcome> => {
  if (!isRecord(value)) {
    return fail('welcome payload must be object');
  }
  if (!isString(value.playerId)) {
    return fail('welcome.playerId must be string');
  }
  if (!isString(value.resumeToken)) {
    return fail('welcome.resumeToken must be string');
  }
  if (!isString(value.roomId)) {
    return fail('welcome.roomId must be string');
  }
  if (!isString(value.seed)) {
    return fail('welcome.seed must be string');
  }
  const role = asRole(value.role);
  if (!role.ok || !role.value) {
    return fail(role.error ?? 'invalid welcome.role');
  }
  const roomState = asRoomState(value.roomState);
  if (!roomState.ok || !roomState.value) {
    return fail(roomState.error ?? 'invalid welcome.roomState');
  }
  const lobby = validateLobbySnapshot(value.lobby);
  if (!lobby.ok || !lobby.value) {
    return fail(lobby.error ?? 'invalid welcome.lobby');
  }
  const cfg = validateConfig(value.cfg);
  if (!cfg.ok || !cfg.value) {
    return fail(cfg.error ?? 'invalid welcome.cfg');
  }
  const featureFlags = isRecord(value.featureFlags)
    ? Object.fromEntries(
        Object.entries(value.featureFlags).filter(
          (entry): entry is [string, boolean] => isBoolean(entry[1])
        )
      )
    : undefined;

  return ok({
    playerId: value.playerId,
    resumeToken: value.resumeToken,
    roomId: value.roomId,
    seed: value.seed,
    role: role.value,
    roomState: roomState.value,
    lobby: lobby.value,
    cfg: cfg.value,
    featureFlags,
  });
};

const validateNetEvent = (value: unknown): GuardResult<NetEvent> => {
  if (!isRecord(value)) {
    return fail('event must be object');
  }
  if (value.kind !== 'spring' && value.kind !== 'break') {
    return fail('event.kind invalid');
  }
  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.tick)
  ) {
    return fail('event numeric fields invalid');
  }
  return ok({
    kind: value.kind,
    x: value.x,
    y: value.y,
    tick: value.tick,
  });
};

const validateNetPlayer = (value: unknown): GuardResult<NetPlayer> => {
  if (!isRecord(value)) {
    return fail('snapshot player must be object');
  }
  if (!isString(value.id)) {
    return fail('snapshot player id missing');
  }
  const player: NetPlayer = { id: value.id };
  if ('x' in value) {
    if (!isFiniteNumber(value.x)) {
      return fail('snapshot player.x must be number');
    }
    player.x = clonePrimitive(value.x as number);
  }
  if ('y' in value) {
    if (!isFiniteNumber(value.y)) {
      return fail('snapshot player.y must be number');
    }
    player.y = clonePrimitive(value.y as number);
  }
  if ('vx' in value) {
    if (!isFiniteNumber(value.vx)) {
      return fail('snapshot player.vx must be number');
    }
    player.vx = clonePrimitive(value.vx as number);
  }
  if ('vy' in value) {
    if (!isFiniteNumber(value.vy)) {
      return fail('snapshot player.vy must be number');
    }
    player.vy = clonePrimitive(value.vy as number);
  }
  if ('alive' in value) {
    if (!isBoolean(value.alive)) {
      return fail('snapshot player.alive must be boolean');
    }
    player.alive = clonePrimitive(value.alive as boolean);
  }
  return ok(player);
};

const validateSnapshot = (value: unknown): GuardResult<S2CSnapshot> => {
  if (!isRecord(value)) {
    return fail('snapshot payload must be object');
  }
  if (!isFiniteNumber(value.tick)) {
    return fail('snapshot.tick must be number');
  }
  if (!Array.isArray(value.players)) {
    return fail('snapshot.players must be array');
  }
  const players: NetPlayer[] = [];
  for (let i = 0; i < value.players.length; i += 1) {
    const result = validateNetPlayer(value.players[i]);
    if (!result.ok || !result.value) {
      return fail(result.error ?? `snapshot.players[${i}] invalid`);
    }
    players.push(result.value);
  }
  let events: NetEvent[] | undefined;
  if (Array.isArray(value.events)) {
    events = [];
    for (let i = 0; i < value.events.length; i += 1) {
      const result = validateNetEvent(value.events[i]);
      if (!result.ok || !result.value) {
        return fail(result.error ?? `snapshot.events[${i}] invalid`);
      }
      events.push(result.value);
    }
  }
  let stats: { droppedSnapshots?: number } | undefined;
  if (isRecord(value.stats)) {
    stats = {};
    if ('droppedSnapshots' in value.stats) {
      if (!isFiniteNumber(value.stats.droppedSnapshots)) {
        return fail('snapshot.stats.droppedSnapshots must be number');
      }
      stats.droppedSnapshots = clonePrimitive(
        value.stats.droppedSnapshots as number
      );
    }
  }
  const payload: S2CSnapshot = {
    tick: value.tick as number,
    full: Boolean(value.full),
    players,
  };
  if (isFiniteNumber(value.ackTick)) {
    payload.ackTick = value.ackTick as number;
  }
  if (isFiniteNumber(value.lastInputSeq)) {
    payload.lastInputSeq = value.lastInputSeq as number;
  }
  if (events) {
    payload.events = events;
  }
  if (stats) {
    payload.stats = stats;
  }
  return ok(payload);
};

const validateStartCountdown = (
  value: unknown
): GuardResult<S2CStartCountdown> => {
  if (!isRecord(value)) {
    return fail('start_countdown payload must be object');
  }
  if (!isFiniteNumber(value.startAtMs)) {
    return fail('start_countdown.startAtMs must be number');
  }
  if (!isFiniteNumber(value.serverTick)) {
    return fail('start_countdown.serverTick must be number');
  }
  if (!isFiniteNumber(value.countdownSec)) {
    return fail('start_countdown.countdownSec must be number');
  }
  return ok({
    startAtMs: value.startAtMs as number,
    serverTick: value.serverTick as number,
    countdownSec: value.countdownSec as number,
  });
};

const validateStart = (value: unknown): GuardResult<S2CStart> => {
  if (!isRecord(value)) {
    return fail('start payload must be object');
  }
  if (!isFiniteNumber(value.startTick)) {
    return fail('start.startTick must be number');
  }
  if (!isFiniteNumber(value.serverTick)) {
    return fail('start.serverTick must be number');
  }
  if (!isFiniteNumber(value.serverTimeMs)) {
    return fail('start.serverTimeMs must be number');
  }
  if (!isFiniteNumber(value.tps)) {
    return fail('start.tps must be number');
  }
  return ok({
    startTick: value.startTick as number,
    serverTick: value.serverTick as number,
    serverTimeMs: value.serverTimeMs as number,
    tps: value.tps as number,
  });
};

const validateRoleChanged = (value: unknown): GuardResult<S2CRoleChanged> => {
  if (!isRecord(value)) {
    return fail('role_changed payload must be object');
  }
  if (!isString(value.newMasterId)) {
    return fail('role_changed.newMasterId must be string');
  }
  return ok({ newMasterId: value.newMasterId });
};

const validatePong = (value: unknown): GuardResult<S2CPong> => {
  if (!isRecord(value)) {
    return fail('pong payload must be object');
  }
  if (!isFiniteNumber(value.t0)) {
    return fail('pong.t0 must be number');
  }
  if (!isFiniteNumber(value.t1)) {
    return fail('pong.t1 must be number');
  }
  return ok({
    t0: value.t0 as number,
    t1: value.t1 as number,
  });
};

const validateError = (value: unknown): GuardResult<S2CError> => {
  if (!isRecord(value)) {
    return fail('error payload must be object');
  }
  if (!isString(value.code)) {
    return fail('error.code must be string');
  }
  if (value.message !== undefined && !isString(value.message)) {
    return fail('error.message must be string when present');
  }
  const payload: S2CError = { code: value.code };
  if (typeof value.message === 'string') {
    payload.message = value.message;
  }
  return ok(payload);
};

const validateFinish = (value: unknown): GuardResult<S2CFinish> => {
  if (!isRecord(value)) {
    return fail('finish payload must be object');
  }
  if (
    value.reason !== 'room_closed' &&
    value.reason !== 'timeout' &&
    value.reason !== 'error'
  ) {
    return fail('finish.reason invalid');
  }
  return ok({ reason: value.reason });
};

const validatePlayerPresence = (
  value: unknown
): GuardResult<S2CPlayerPresence> => {
  if (!isRecord(value)) {
    return fail('player_presence payload must be object');
  }
  if (!isString(value.id)) {
    return fail('player_presence.id must be string');
  }
  if (
    value.state !== 'active' &&
    value.state !== 'disconnected' &&
    value.state !== 'left'
  ) {
    return fail('player_presence.state invalid');
  }
  return ok({ id: value.id, state: value.state });
};

const validateLobbyState = (value: unknown): GuardResult<S2CLobbyState> => {
  if (!isRecord(value)) {
    return fail('lobby_state payload must be object');
  }
  const roomState = asRoomState(value.roomState);
  if (!roomState.ok || !roomState.value) {
    return fail(roomState.error ?? 'invalid lobby_state.roomState');
  }
  if (!Array.isArray(value.players)) {
    return fail('lobby_state.players must be array');
  }
  const players: LobbyPlayer[] = [];
  for (let i = 0; i < value.players.length; i += 1) {
    const result = validateLobbyPlayer(value.players[i]);
    if (!result.ok || !result.value) {
      return fail(result.error ?? `lobby_state.players[${i}] invalid`);
    }
    players.push(result.value);
  }
  const payload: S2CLobbyState = {
    roomState: roomState.value,
    players,
  };
  if ('maxPlayers' in value && value.maxPlayers !== undefined) {
    if (!isFiniteNumber(value.maxPlayers)) {
      return fail('lobby_state.maxPlayers must be number when present');
    }
    payload.maxPlayers = value.maxPlayers as number;
  }
  return ok(payload);
};

const buildEnvelope = <T, TType extends ServerMessageType>(
  type: TType,
  base: Record<string, unknown>,
  payload: T
): Envelope<T, TType> => ({
  type,
  pv: PROTOCOL_PV,
  seq: base.seq as number,
  ts: base.ts as number,
  payload,
});

export const parseServerEnvelope = (
  raw: unknown
): GuardResult<ServerEnvelope> => {
  if (!isRecord(raw)) {
    return fail('Envelope must be object');
  }
  if (!isString(raw.type)) {
    return fail('Envelope.type must be string');
  }
  if (raw.pv !== PROTOCOL_PV) {
    return fail(
      `Envelope.pv ${String(raw.pv)} mismatches client pv ${PROTOCOL_PV}`
    );
  }
  if (!isFiniteNumber(raw.seq)) {
    return fail('Envelope.seq must be number');
  }
  if (!isFiniteNumber(raw.ts)) {
    return fail('Envelope.ts must be number');
  }

  const payload =
    'payload' in raw ? (raw as Record<string, unknown>).payload : undefined;
  const type = raw.type as ServerMessageType;

  switch (type) {
    case 'welcome': {
      const result = validateWelcome(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid welcome payload');
      }
      return ok(buildEnvelope('welcome', raw, result.value));
    }
    case 'lobby_state': {
      const result = validateLobbyState(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid lobby_state payload');
      }
      return ok(buildEnvelope('lobby_state', raw, result.value));
    }
    case 'start_countdown': {
      const result = validateStartCountdown(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid start_countdown payload');
      }
      return ok(buildEnvelope('start_countdown', raw, result.value));
    }
    case 'start': {
      const result = validateStart(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid start payload');
      }
      return ok(buildEnvelope('start', raw, result.value));
    }
    case 'snapshot': {
      const result = validateSnapshot(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid snapshot payload');
      }
      return ok(buildEnvelope('snapshot', raw, result.value));
    }
    case 'role_changed': {
      const result = validateRoleChanged(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid role_changed payload');
      }
      return ok(buildEnvelope('role_changed', raw, result.value));
    }
    case 'pong': {
      const result = validatePong(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid pong payload');
      }
      return ok(buildEnvelope('pong', raw, result.value));
    }
    case 'player_presence': {
      const result = validatePlayerPresence(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid player_presence payload');
      }
      return ok(buildEnvelope('player_presence', raw, result.value));
    }
    case 'finish': {
      const result = validateFinish(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid finish payload');
      }
      return ok(buildEnvelope('finish', raw, result.value));
    }
    case 'error': {
      const result = validateError(payload);
      if (!result.ok || !result.value) {
        return fail(result.error ?? 'Invalid error payload');
      }
      return ok(buildEnvelope('error', raw, result.value));
    }
    default:
      return fail(`Unknown envelope type: ${String(type)}`);
  }
};
