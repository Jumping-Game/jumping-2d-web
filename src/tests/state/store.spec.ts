import { afterEach, describe, expect, it } from 'vitest';
import { useNetStore } from '../../state/store';
import type { CharacterId } from '../../config/characters';

const asId = (value: CharacterId | undefined): CharacterId => value ?? 'aurora';

const resetStore = () => {
  useNetStore.getState().reset();
};

describe('net store', () => {
  afterEach(() => {
    resetStore();
  });

  it('stores identity and lobby data', () => {
    const store = useNetStore.getState();
    store.setIdentity({
      playerId: 'p1',
      roomId: 'room',
      resumeToken: 'token',
    });
    store.setLobby(
      [
        {
          id: 'p1',
          name: 'Master',
          ready: true,
          role: 'master',
          characterId: 'aurora',
        },
        {
          id: 'p2',
          name: 'Ally',
          ready: false,
          role: 'member',
          characterId: 'cobalt',
        },
      ],
      4
    );

    const next = useNetStore.getState();
    expect(next.playerId).toBe('p1');
    expect(next.roomId).toBe('room');
    expect(next.players).toHaveLength(2);
    expect(next.lobbyMaxPlayers).toBe(4);
    expect(asId(next.characterSelections.p1)).toBe('aurora');
    expect(asId(next.characterSelections.p2)).toBe('cobalt');
  });

  it('updates countdown and resets it', () => {
    const store = useNetStore.getState();
    store.setCountdown({ startAtMs: Date.now() + 1000, seconds: 1 });
    expect(useNetStore.getState().countdown).not.toBeNull();
    store.resetCountdown();
    expect(useNetStore.getState().countdown).toBeNull();
  });

  it('merges net metrics', () => {
    const store = useNetStore.getState();
    store.updateNetMetrics({ rtt: 42, ackTick: 10 });
    store.updateNetMetrics({ lastInputSeq: 7 });
    const metrics = useNetStore.getState().net;
    expect(metrics.rtt).toBe(42);
    expect(metrics.ackTick).toBe(10);
    expect(metrics.lastInputSeq).toBe(7);
    expect(metrics.skew).toBe(0);
  });

  it('tracks character selection changes', () => {
    const store = useNetStore.getState();
    store.setLobby(
      [
        {
          id: 'p1',
          name: 'Player',
          ready: true,
          role: 'master',
          characterId: 'aurora',
        },
        {
          id: 'p2',
          name: 'Ally',
          ready: false,
          role: 'member',
          characterId: 'cobalt',
        },
      ],
      4
    );
    const changed = store.setCharacterSelection('p1', 'violet');
    expect(changed).toBe(true);
    const after = useNetStore.getState();
    expect(after.characterSelections.p1).toBe('violet');
    expect(after.players.find((p) => p.id === 'p1')?.characterId).toBe(
      'violet'
    );
    const rejected = after.setCharacterSelection('p2', 'violet');
    expect(rejected).toBe(false);
    expect(useNetStore.getState().characterSelections.p2).toBe('cobalt');
  });

  it('reconciles missing character ids with defaults', () => {
    const store = useNetStore.getState();
    store.setLobby(
      [
        { id: 'p1', name: 'Master', ready: true, role: 'master' },
        { id: 'p2', name: 'Member', ready: false, role: 'member' },
      ],
      4
    );
    const assigned = useNetStore.getState().characterSelections;
    expect(Object.keys(assigned)).toContain('p1');
    expect(Object.keys(assigned)).toContain('p2');
    expect(assigned.p1).not.toBe(assigned.p2);
  });
});
