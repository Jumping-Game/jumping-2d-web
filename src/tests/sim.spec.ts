import { describe, it, expect } from 'vitest';
import { World } from '../sim/World';
import { Player } from '../sim/Player';
import { Platform, PlatformType } from '../sim/Platform';
import { CFG } from '../config/GameConfig';

describe('Simulation', () => {
  it('should be deterministic', () => {
    const world1 = new World('sim-seed');
    const world2 = new World('sim-seed');

    for (let i = 0; i < 5000; i++) {
      const input = Math.sin(i / 100);
      world1.update(1 / CFG.tps, input);
      world2.update(1 / CFG.tps, input);
    }

    expect(world1.player.position).toEqual(world2.player.position);
    expect(world1.platforms.length).toEqual(world2.platforms.length);
  });

  it('should handle player jumping and gravity', () => {
    const player = new Player();
    player.jump();
    expect(player.velocity.y).toBe(CFG.world.jumpVy);

    player.update(1 / CFG.tps, 0);
    expect(player.velocity.y).toBeLessThan(CFG.world.jumpVy);
  });

  it('should correctly resolve collisions with platforms', () => {
    const player = new Player();
    const platform = new Platform().init(
      player.position.x,
      player.position.y - 20,
      PlatformType.Static,
      0
    );

    // Move player down to collide with the platform
    player.velocity.y = -1000;
    player.update(1 / CFG.tps, 0);

    const landed = platform.position.y + platform.height;
    expect(player.position.y).toBeCloseTo(landed, -1);
    expect(player.velocity.y).toBe(CFG.world.jumpVy); // Should bounce
  });
});