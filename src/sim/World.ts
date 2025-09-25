import { Player } from './Player';
import { Platform, PlatformPool, PlatformType } from './Platform';
import { Powerup, PowerupPool, PowerupType } from './Powerup';
import { SpawnRules } from './SpawnRules';
import { checkCollision, resolveCollision } from './Collision';
import { SplitMix64, seedFromString } from '../core/RNG';
import { Seed, Tick } from '../core/Types';
import { CFG } from '../config/GameConfig';

export class World {
  public player: Player;
  public platforms: Platform[];
  public powerups: Powerup[];
  public tick: Tick;
  public currentHeight: number;

  private platformPool: PlatformPool;
  private powerupPool: PowerupPool;
  private spawnRules: SpawnRules;
  private rng: SplitMix64;

  constructor(seed: Seed) {
    const seed64 = seedFromString(seed);
    this.rng = new SplitMix64(seed64);
    this.spawnRules = new SpawnRules(this.rng);

    this.player = new Player();
    this.platforms = [];
    this.powerups = [];
    this.tick = 0;
    this.currentHeight = 0;

    this.platformPool = new PlatformPool();
    this.powerupPool = new PowerupPool();

    this.initWorld();
  }

  update(dt: number, inputAxisX: number) {
    this.tick++;
    this.player.update(dt, inputAxisX);
    this.currentHeight = Math.max(this.currentHeight, this.player.position.y);

    for (const platform of this.platforms) {
      platform.update(this.tick);
      if (resolveCollision(this.player, platform)) {
        if (platform.type === PlatformType.Breakable) {
          platform.isBroken = true;
        } else if (platform.type === PlatformType.OneShot) {
          // Disappears after one jump
          platform.isBroken = true;
        }
      }
    }

    // Powerup collision
    for (const powerup of this.powerups) {
      if (checkCollision(this.player, powerup as any)) {
        this.applyPowerup(powerup);
      }
    }

    this.cullObjects();
    this.spawnObjects();
  }

  private initWorld() {
    // Create the initial platform
    const initialPlatform = this.platformPool.get(
      CFG.world.worldWidth / 2 - CFG.world.platformWidth / 2,
      100,
      PlatformType.Static,
      0
    );
    this.platforms.push(initialPlatform);
  }

  private applyPowerup(powerup: Powerup) {
    if (powerup.type === PowerupType.Spring) {
      this.player.velocity.y = CFG.world.springVy;
    }
    // Remove powerup after use
    this.powerups = this.powerups.filter((p) => p !== powerup);
    this.powerupPool.release(powerup);
  }

  private cullObjects() {
    // Cull platforms
    this.platforms = this.platforms.filter((p) => {
      if (p.position.y < this.currentHeight - 800 || p.isBroken) {
        this.platformPool.release(p);
        return false;
      }
      return true;
    });

    // Cull powerups
    this.powerups = this.powerups.filter((p) => {
      if (p.position.y < this.currentHeight - 800) {
        this.powerupPool.release(p);
        return false;
      }
      return true;
    });
  }

  private spawnObjects() {
    let lastPlatformY = 0;
    for (const p of this.platforms) {
      if (p.position.y > lastPlatformY) {
        lastPlatformY = p.position.y;
      }
    }

    while (lastPlatformY < this.currentHeight + 800) {
      const nextPlatformData = this.spawnRules.generateNextPlatform(
        lastPlatformY,
        this.currentHeight
      );
      const newPlatform = this.platformPool.get(
        nextPlatformData.position!.x,
        nextPlatformData.position!.y,
        nextPlatformData.type!,
        this.tick
      );
      this.platforms.push(newPlatform);
      lastPlatformY = newPlatform.position.y;

      if (this.spawnRules.shouldSpawnPowerup(this.currentHeight)) {
        const powerupData = this.spawnRules.generatePowerup(newPlatform);
        const newPowerup = this.powerupPool.get(
          powerupData.position!.x,
          powerupData.position!.y,
          powerupData.type!
        );
        this.powerups.push(newPowerup);
      }
    }
  }
}