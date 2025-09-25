import { create } from 'zustand';
import type { LobbyPlayer, NetRoomState, PlayerRole } from '../net/Protocol';
import type { CharacterId } from '../config/characters';
import { pickDefaultCharacter } from '../config/characters';

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
  characterSelections: Record<string, CharacterId>;
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
  setCharacterSelection: (
    playerId: string,
    characterId: CharacterId
  ) => boolean;
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
  characterSelections: {},
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
    set((state) => {
      const assignments = reconcileCharacterSelections(
        state.characterSelections,
        players
      );
      const playersWithCharacters = players.map((player) => ({
        ...player,
        characterId: assignments[player.id],
      }));
      return {
        ...state,
        players: playersWithCharacters,
        lobbyMaxPlayers: maxPlayers ?? state.lobbyMaxPlayers,
        characterSelections: assignments,
      };
    }),
  setCountdown: (countdown) =>
    set((state) => ({
      ...state,
      countdown,
    })),
  setCharacterSelection: (playerId, characterId) => {
    let changed = false;
    set((state) => {
      const playerExists = state.players.some(
        (player) => player.id === playerId
      );
      if (!playerExists) {
        return state;
      }
      const currentSelection = state.characterSelections[playerId];
      if (currentSelection === characterId) {
        return state;
      }
      const inUseByOther = Object.entries(state.characterSelections).some(
        ([id, existing]) => id !== playerId && existing === characterId
      );
      if (inUseByOther) {
        return state;
      }
      changed = true;
      const updatedSelections = {
        ...state.characterSelections,
        [playerId]: characterId,
      };
      const players = state.players.map((player) =>
        player.id === playerId ? { ...player, characterId } : player
      );
      return {
        ...state,
        characterSelections: updatedSelections,
        players,
      };
    });
    return changed;
  },
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
      characterSelections: {},
    })),
}));

const reconcileCharacterSelections = (
  current: Record<string, CharacterId>,
  players: LobbyPlayer[]
): Record<string, CharacterId> => {
  const next: Record<string, CharacterId> = {};
  const used = new Set<CharacterId>();

  const claim = (
    candidate: CharacterId | undefined
  ): CharacterId | undefined => {
    if (!candidate) {
      return undefined;
    }
    if (used.has(candidate)) {
      return undefined;
    }
    used.add(candidate);
    return candidate;
  };

  for (const player of players) {
    const preferred = claim(player.characterId);
    if (preferred) {
      next[player.id] = preferred;
      continue;
    }
    const existing = current[player.id];
    if (existing && !used.has(existing)) {
      used.add(existing);
      next[player.id] = existing;
      continue;
    }
    const assigned = pickDefaultCharacter(player.id, next);
    used.add(assigned);
    next[player.id] = assigned;
  }
  return next;
};

export const getNetStore = (): NetStoreState => useNetStore.getState();
