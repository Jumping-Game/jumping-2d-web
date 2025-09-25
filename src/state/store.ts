import { create } from 'zustand';
import type {
  LobbyPlayer,
  NetRoomState,
  PlayerRole,
} from '../net/Protocol';

export interface CountdownState {
  startAtMs: number;
  seconds: number;
}

export interface NetMetricsState {
  rtt: number;
  skew: number;
  ackTick?: number;
  lastInputSeq?: number;
  droppedSnapshots?: number;
}

export interface NetStoreState {
  playerId?: string;
  roomId?: string;
  resumeToken?: string;
  role: PlayerRole;
  roomState: NetRoomState;
  players: LobbyPlayer[];
  lobbyMaxPlayers?: number;
  countdown: CountdownState | null;
  net: NetMetricsState;
  setIdentity: (params: {
    playerId: string;
    roomId: string;
    resumeToken: string;
  }) => void;
  setRole: (role: PlayerRole) => void;
  setRoomState: (state: NetRoomState) => void;
  setLobby: (players: LobbyPlayer[], maxPlayers?: number) => void;
  setCountdown: (countdown: CountdownState | null) => void;
  updateNetMetrics: (metrics: Partial<NetMetricsState>) => void;
  resetCountdown: () => void;
  reset: () => void;
}

const initialNet: NetMetricsState = {
  rtt: 0,
  skew: 0,
};

export const useNetStore = create<NetStoreState>((set) => ({
  playerId: undefined,
  roomId: undefined,
  resumeToken: undefined,
  role: 'member',
  roomState: 'lobby',
  players: [],
  lobbyMaxPlayers: undefined,
  countdown: null,
  net: { ...initialNet },
  setIdentity: ({ playerId, roomId, resumeToken }) =>
    set((state) => ({
      ...state,
      playerId,
      roomId,
      resumeToken,
    })),
  setRole: (role) =>
    set((state) => ({
      ...state,
      role,
    })),
  setRoomState: (roomState) =>
    set((state) => ({
      ...state,
      roomState,
    })),
  setLobby: (players, maxPlayers) =>
    set((state) => ({
      ...state,
      players,
      lobbyMaxPlayers: maxPlayers ?? state.lobbyMaxPlayers,
    })),
  setCountdown: (countdown) =>
    set((state) => ({
      ...state,
      countdown,
    })),
  resetCountdown: () =>
    set((state) => ({
      ...state,
      countdown: null,
    })),
  updateNetMetrics: (metrics) =>
    set((state) => ({
      ...state,
      net: { ...state.net, ...metrics },
    })),
  reset: () =>
    set(() => ({
      playerId: undefined,
      roomId: undefined,
      resumeToken: undefined,
      role: 'member',
      roomState: 'lobby',
      players: [],
      lobbyMaxPlayers: undefined,
      countdown: null,
      net: { ...initialNet },
    })),
}));

export const getNetStore = (): NetStoreState => useNetStore.getState();
