import { SplitMix64 } from '../core/RNG';
import { Platform, PlatformType } from './Platform';
import { Powerup, PowerupType } from './Powerup';
import { CFG } from '../config/GameConfig';
import { lerp } from '../core/Mathf';

export class SpawnRules {
  private rng: SplitMix64;

  constructor(rng: SplitMix64) {
    this.rng = rng;
  }

  generateNextPlatform(
    lastPlatformY: number,
    currentHeight: number
  ): Partial<Platform> {
    const difficulty = Math.min(currentHeight / 50000, 1); // Full difficulty at 50k height
    const gapMin = lerp(
      CFG.difficulty.gapMinStart,
      CFG.difficulty.gapMinEnd,
      difficulty
    );
    const gapMax = lerp(
      CFG.difficulty.gapMaxStart,
      CFG.difficulty.gapMaxEnd,
      difficulty
    );

    const y = lastPlatformY + gapMin + this.rng.random() * (gapMax - gapMin);
    const x =
      this.rng.random() * (CFG.world.worldWidth - CFG.world.platformWidth);

    let type = PlatformType.Static;
    const typeRng = this.rng.random();
    if (typeRng < 0.1) {
      type = PlatformType.Moving;
    } else if (typeRng < 0.15) {
      type = PlatformType.Breakable;
    } else if (typeRng < 0.2) {
      type = PlatformType.OneShot;
    }

    return { position: { x, y }, type };
  }

  shouldSpawnPowerup(currentHeight: number): boolean {
    const difficulty = Math.min(currentHeight / 50000, 1);
    const chance = lerp(
      CFG.difficulty.springChanceStart,
      CFG.difficulty.springChanceEnd,
      difficulty
    );
    return this.rng.random() < chance;
  }

  generatePowerup(platform: Platform): Partial<Powerup> {
    const x = platform.position.x + platform.width / 2;
    const y = platform.position.y + platform.height;
    return { position: { x, y }, type: PowerupType.Spring };
  }
}