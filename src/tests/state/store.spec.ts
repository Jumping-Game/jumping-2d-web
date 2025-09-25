import { afterEach, describe, expect, it } from 'vitest';
import { useNetStore } from '../../state/store';

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
        { id: 'p1', name: 'Master', ready: true, role: 'master' },
        { id: 'p2', name: 'Ally', ready: false, role: 'member' },
      ],
      4
    );

    const next = useNetStore.getState();
    expect(next.playerId).toBe('p1');
    expect(next.roomId).toBe('room');
    expect(next.players).toHaveLength(2);
    expect(next.lobbyMaxPlayers).toBe(4);
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
});
