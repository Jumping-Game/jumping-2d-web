import type { PlayerInput } from '../core/Types';
import type { CharacterId } from '../config/characters';

export type Pv = 1;
export const PROTOCOL_PV: Pv = 1;

export type ClientMessageType =
  | 'join'
  | 'input'
  | 'input_batch'
  | 'ping'
  | 'reconnect'
  | 'ready_set'
  | 'start_request'
  | 'character_select';

export type ServerMessageType =
  | 'welcome'
  | 'lobby_state'
  | 'start_countdown'
  | 'start'
  | 'snapshot'
  | 'role_changed'
  | 'pong'
  | 'player_presence'
  | 'finish'
  | 'error';

export interface Envelope<TPayload, TType extends string = string> {
  type: TType;
  pv: Pv;
  seq: number;
  ts: number;
  payload: TPayload;
}

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

export type PlayerRole = 'master' | 'member';
export type NetRoomState = 'lobby' | 'starting' | 'running' | 'finished';

export interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  role: PlayerRole;
  characterId?: CharacterId;
}

export interface LobbySnapshot {
  players: LobbyPlayer[];
  maxPlayers: number;
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

export interface C2SReadySet {
  ready: boolean;
}

export interface C2SStartRequest {
  countdownSec?: number;
}

export interface C2SCharacterSelect {
  characterId: CharacterId;
}

// Server → Client
export interface S2CWelcome {
  playerId: string;
  resumeToken: string;
  roomId: string;
  seed: string;
  role: PlayerRole;
  roomState: NetRoomState;
  lobby?: LobbySnapshot;
  cfg: NetConfig;
  featureFlags?: Record<string, boolean>;
}

export interface NetPlayer {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  alive?: boolean;
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
  players: NetPlayer[];
  events?: NetEvent[];
  stats?: {
    droppedSnapshots?: number;
  };
}

export interface S2CStartCountdown {
  startAtMs: number;
  serverTick: number;
  countdownSec: number;
}

export interface S2CStart {
  startTick: number;
  serverTick: number;
  serverTimeMs: number;
  tps: number;
  players: LobbyPlayer[];
}

export interface S2CRoleChanged {
  newMasterId: string;
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

export interface S2CLobbyState {
  roomState: NetRoomState;
  players: LobbyPlayer[];
  maxPlayers?: number;
}

export type ClientEnvelope =
  | Envelope<C2SJoin, 'join'>
  | Envelope<C2SInput, 'input'>
  | Envelope<C2SInputBatch, 'input_batch'>
  | Envelope<C2SPing, 'ping'>
  | Envelope<C2SReconnect, 'reconnect'>
  | Envelope<C2SReadySet, 'ready_set'>
  | Envelope<C2SStartRequest, 'start_request'>
  | Envelope<C2SCharacterSelect, 'character_select'>;

export type ServerEnvelope =
  | Envelope<S2CWelcome, 'welcome'>
  | Envelope<S2CLobbyState, 'lobby_state'>
  | Envelope<S2CStartCountdown, 'start_countdown'>
  | Envelope<S2CStart, 'start'>
  | Envelope<S2CSnapshot, 'snapshot'>
  | Envelope<S2CRoleChanged, 'role_changed'>
  | Envelope<S2CPong, 'pong'>
  | Envelope<S2CPlayerPresence, 'player_presence'>
  | Envelope<S2CFinish, 'finish'>
  | Envelope<S2CError, 'error'>;

export type NetInputPayload = Pick<PlayerInput, 'tick' | 'axisX' | 'jump'>;
