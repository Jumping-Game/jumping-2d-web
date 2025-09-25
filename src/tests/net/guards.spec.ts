import { describe, expect, it } from 'vitest';
import { parseServerEnvelope } from '../../net/guards';
import { PROTOCOL_PV } from '../../net/Protocol';

const baseEnvelope = {
  pv: PROTOCOL_PV,
  seq: 1,
  ts: Date.now(),
};

const makeConfig = () => ({
  tps: 60,
  snapshotRateHz: 10,
  maxRollbackTicks: 120,
  inputLeadTicks: 2,
  world: {
    worldWidth: 1080,
    platformWidth: 120,
    platformHeight: 18,
    gapMin: 120,
    gapMax: 240,
    gravity: -2200,
    jumpVy: 1200,
    springVy: 1800,
    maxVx: 900,
    tiltAccel: 1200,
  },
  difficulty: {
    gapMinStart: 120,
    gapMinEnd: 180,
    gapMaxStart: 240,
    gapMaxEnd: 320,
    springChanceStart: 0.1,
    springChanceEnd: 0.03,
  },
});

describe('parseServerEnvelope', () => {
  it('accepts a valid welcome envelope', () => {
    const welcome = {
      ...baseEnvelope,
      type: 'welcome' as const,
      payload: {
        playerId: 'p_master',
        resumeToken: 'resume',
        roomId: 'room-1',
        seed: 'seed-1',
        role: 'master' as const,
        roomState: 'lobby' as const,
        lobby: {
          players: [
            {
              id: 'p_master',
              name: 'Master',
              ready: true,
              role: 'master' as const,
              characterId: 'aurora',
            },
            {
              id: 'p_member',
              name: 'Member',
              ready: false,
              role: 'member' as const,
              characterId: 'cobalt',
            },
          ],
          maxPlayers: 4,
        },
        cfg: makeConfig(),
        featureFlags: { countdown: true },
      },
    };

    const result = parseServerEnvelope(welcome);
    expect(result.ok).toBe(true);
    if (!result.value || result.value.type !== 'welcome') {
      throw new Error('Expected welcome envelope');
    }
    expect(result.value.payload.playerId).toBe('p_master');
  });

  it('rejects lobby_state messages with malformed players', () => {
    const invalid = {
      ...baseEnvelope,
      type: 'lobby_state' as const,
      payload: {
        roomState: 'lobby' as const,
        players: [
          {
            id: 'p_master',
            name: 'Master',
            ready: true,
            role: 'master' as const,
          },
          // Missing ready flag
          { id: 'p_member', name: 'Member', role: 'member' as const },
        ],
      },
    } as unknown;

    const result = parseServerEnvelope(invalid);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('player.ready');
  });

  it('rejects lobby players with invalid character ids', () => {
    const invalid = {
      ...baseEnvelope,
      type: 'lobby_state' as const,
      payload: {
        roomState: 'lobby' as const,
        players: [
          {
            id: 'p_master',
            name: 'Master',
            ready: true,
            role: 'master' as const,
            characterId: 'not-real',
          },
        ],
      },
    } as unknown;

    const result = parseServerEnvelope(invalid);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('characterId');
  });

  it('accepts start_countdown payloads', () => {
    const countdown = {
      ...baseEnvelope,
      type: 'start_countdown' as const,
      payload: {
        startAtMs: Date.now() + 3000,
        serverTick: 1200,
        countdownSec: 3,
      },
    };

    const result = parseServerEnvelope(countdown);
    expect(result.ok).toBe(true);
    if (!result.value || result.value.type !== 'start_countdown') {
      throw new Error('Expected start_countdown envelope');
    }
    expect(result.value.payload.countdownSec).toBe(3);
  });

  it('rejects invalid snapshot payloads', () => {
    const snapshot = {
      ...baseEnvelope,
      type: 'snapshot' as const,
      payload: {
        tick: 42,
        full: true,
        players: [
          {
            id: 'p_master',
            x: 'not-a-number',
          },
        ],
      },
    } as unknown;

    const result = parseServerEnvelope(snapshot);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('snapshot player.x');
  });
});
