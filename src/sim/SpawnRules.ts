import { CFG } from '../config/GameConfig';
import { lerp, smoothstep } from '../core/Mathf';
import { Xoroshiro128StarStar } from '../core/RNG';
import { PlatformMovement } from '../core/Types';
import { PlatformType, Platform } from './Platform';
import { PowerupType } from './Powerup';

export interface PlatformSpawn {
  x: number;
  y: number;
  type: PlatformType;
  movement?: PlatformMovement;
}

export interface PowerupSpawn {
  x: number;
  y: number;
  type: PowerupType;
  attachedPlatformId?: number;
}

export class SpawnRules {
  private readonly rng: Xoroshiro128StarStar;
  private platformIndex = 0;

  constructor(rng: Xoroshiro128StarStar) {
    this.rng = rng;
  }

  reset(): void {
    this.platformIndex = 0;
  }

  nextPlatform(lastY: number, currentHeight: number): PlatformSpawn {
    const difficulty = smoothstep(0, 50000, currentHeight);
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
    const gap = lerp(gapMin, gapMax, this.rng.nextFloat());
    const y = lastY + gap;
    let x: number;
    if (this.platformIndex < 6) {
      const center = CFG.world.worldWidth / 2 - CFG.world.platformWidth / 2;
      const jitter = (this.rng.nextFloat() - 0.5) * 40;
      x = center + jitter;
    } else {
      x = this.rng.nextRange(
        40,
        CFG.world.worldWidth - CFG.world.platformWidth - 40
      );
    }

    const typeRoll = this.rng.nextFloat();
    let type = PlatformType.Static;
    let movement: PlatformMovement | undefined;
    if (typeRoll < 0.1 + difficulty * 0.1) {
      type = PlatformType.Moving;
      const amplitude = 80 + this.rng.nextFloat() * 80;
      const periodTicks = 180 + Math.floor(this.rng.nextFloat() * 240);
      const phase = this.rng.nextFloat() * Math.PI * 2;
      movement = { amplitude, periodTicks, phase };
    } else if (typeRoll < 0.15 + difficulty * 0.15) {
      type = PlatformType.Breakable;
    } else if (typeRoll < 0.22 + difficulty * 0.15) {
      type = PlatformType.OneShot;
    }

    this.platformIndex += 1;
    return { x, y, type, movement };
  }

  maybeSpawnPowerup(
    platform: Platform,
    height: number
  ): PowerupSpawn | undefined {
    const difficulty = smoothstep(0, 50000, height);
    const springChance = lerp(
      CFG.difficulty.springChanceStart,
      CFG.difficulty.springChanceEnd,
      difficulty
    );

    if (this.rng.nextFloat() < springChance) {
      return this.spawnForPlatform(platform, PowerupType.Spring);
    }

    if (this.rng.nextFloat() < CFG.difficulty.jetpackChance) {
      return this.spawnForPlatform(platform, PowerupType.Jetpack);
    }

    return undefined;
  }

  private spawnForPlatform(
    platform: Platform,
    type: PowerupType
  ): PowerupSpawn {
    const x = platform.position.x + platform.width / 2;
    const y = platform.position.y + platform.height + 24;
    return { x, y, type, attachedPlatformId: platform.id };
  }
}
