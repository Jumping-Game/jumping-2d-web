import { describe, it, expect } from 'vitest';
import { World } from '../sim/World';
import { hashWorld } from '../sim/Determinism';
import { CFG } from '../config/GameConfig';

const TICKS = CFG.rng.snapshotInterval * 2;

describe('World hashing and spawning', () => {
  it('produces identical hashes for identical inputs', () => {
    const worldA = new World('hash-seed');
    const worldB = new World('hash-seed');

    for (let tick = 0; tick < TICKS; tick += 1) {
      const input = { tick, axisX: Math.sin(tick * 0.01), jump: false };
      worldA.step(input);
      worldB.step(input);
    }

    expect(hashWorld(worldA)).toEqual(hashWorld(worldB));
  });

  it('produces different hashes for divergent inputs', () => {
    const worldA = new World('hash-seed');
    const worldB = new World('hash-seed');

    for (let tick = 0; tick < TICKS; tick += 1) {
      worldA.step({ tick, axisX: 0, jump: false });
      worldB.step({ tick, axisX: tick % 2 === 0 ? 0.5 : -0.5, jump: false });
    }

    expect(hashWorld(worldA)).not.toEqual(hashWorld(worldB));
  });

  it('keeps platform gaps within configured bounds', () => {
    const world = new World('spacing-seed');
    let lastY = -Infinity;
    for (let tick = 0; tick < 2000; tick += 1) {
      world.step({ tick, axisX: 0, jump: false });
      for (const platform of world.platforms) {
        if (platform.position.y > lastY) {
          const gap = platform.position.y - lastY;
          if (lastY !== -Infinity) {
            expect(gap).toBeGreaterThanOrEqual(CFG.difficulty.gapMinStart - 1);
            expect(gap).toBeLessThanOrEqual(CFG.difficulty.gapMaxEnd + 40);
          }
          lastY = platform.position.y;
        }
      }
    }
  });
});
