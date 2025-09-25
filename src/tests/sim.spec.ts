import { describe, it, expect } from 'vitest';
import { World } from '../sim/World';
import { CFG } from '../config/GameConfig';
import { hashWorld } from '../sim/Determinism';
import { Player } from '../sim/Player';
import { Platform, PlatformType } from '../sim/Platform';
import { resolveLanding } from '../sim/Collision';

describe('Simulation', () => {
  it('is deterministic for identical seeds and inputs', () => {
    const worldA = new World('det-seed');
    const worldB = new World('det-seed');

    for (let tick = 0; tick < 5000; tick += 1) {
      const axis = Math.sin(tick * 0.123);
      const input = { tick, axisX: axis, jump: tick % 240 === 0 };
      worldA.step(input);
      worldB.step(input);
    }

    expect(hashWorld(worldA)).toEqual(hashWorld(worldB));
  });

  it('applies gravity and bounce when landing', () => {
    const player = new Player();
    const platform = new Platform().init(
      0,
      player.position.x - CFG.world.platformWidth / 2,
      player.position.y - 80,
      PlatformType.Static,
      0
    );

    player.velocity.y = -400;
    let landed = false;
    for (let tick = 0; tick < 240; tick += 1) {
      player.step(tick, { tick, axisX: 0, jump: false });
      if (resolveLanding(player, platform)) {
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
    expect(player.position.y).toBeCloseTo(
      platform.position.y + platform.height,
      4
    );
    expect(player.velocity.y).toBeCloseTo(CFG.world.jumpVy, 4);
  });
});
