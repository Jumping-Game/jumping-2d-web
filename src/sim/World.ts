import { CFG } from '../config/GameConfig';
import { seedFromString, Xoroshiro128StarStar } from '../core/RNG';
import { Player } from './Player';
import { Platform, PlatformPool, PlatformType } from './Platform';
import { Powerup, PowerupPool, PowerupType } from './Powerup';
import { SpawnRules } from './SpawnRules';
import { resolveLanding } from './Collision';
import { PlayerInput, Seed, Tick, WorldSnapshot } from '../core/Types';

export enum SimEventType {
  Bounce = 'bounce',
  Spring = 'spring',
  Jetpack = 'jetpack',
  PlatformBreak = 'platform-break',
}

export interface SimEvent {
  tick: Tick;
  type: SimEventType;
  x: number;
  y: number;
}

export class World {
  public readonly player = new Player();
  public readonly platforms: Platform[] = [];
  public readonly powerups: Powerup[] = [];
  public tick: Tick = 0;
  public score = 0;
  public highestHeight = 0;

  private rng: Xoroshiro128StarStar;
  private spawnRules: SpawnRules;
  private readonly platformPool = new PlatformPool();
  private readonly powerupPool = new PowerupPool();
  private highestPlatformY = 0;
  private nextPlatformId = 0;
  private nextPowerupId = 0;
  private seed: Seed;
  private events: SimEvent[] = [];

  constructor(seed: Seed) {
    this.seed = seed;
    this.rng = new Xoroshiro128StarStar(seedFromString(seed));
    this.spawnRules = new SpawnRules(this.rng);
    this.bootstrap();
  }

  reset(newSeed?: Seed): void {
    this.platforms.forEach((platform) => this.platformPool.release(platform));
    this.powerups.forEach((powerup) => this.powerupPool.release(powerup));
    this.platforms.length = 0;
    this.powerups.length = 0;
    this.events = [];
    this.tick = 0;
    this.score = 0;
    this.highestHeight = 0;
    this.highestPlatformY = 0;
    this.nextPlatformId = 0;
    this.nextPowerupId = 0;
    if (newSeed) {
      this.seed = newSeed;
    }
    this.rng = new Xoroshiro128StarStar(seedFromString(this.seed));
    this.spawnRules = new SpawnRules(this.rng);
    this.player.reset();
    this.bootstrap();
  }

  step(input: PlayerInput): void {
    if (input.tick !== this.tick) {
      this.tick = input.tick;
    }

    this.player.step(this.tick, input);
    this.tick += 1;

    this.updatePlatforms();
    this.handlePlatformCollisions();
    this.updatePowerups();
    this.handlePowerupCollisions();
    this.cullObjects();
    this.spawnAhead();

    this.highestHeight = Math.max(this.highestHeight, this.player.position.y);
    this.score = Math.max(this.score, Math.floor(this.highestHeight));
    if (
      this.player.position.y + CFG.camera.verticalOffset <
      this.highestHeight - CFG.camera.spawnAhead
    ) {
      this.player.die();
    }
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  toSnapshot(): WorldSnapshot {
    return {
      tick: this.tick,
      score: this.score,
      player: {
        x: this.player.position.x,
        y: this.player.position.y,
        vx: this.player.velocity.x,
        vy: this.player.velocity.y,
        state: this.player.state,
      },
      platforms: this.platforms.map((p) => ({
        id: p.id,
        type: p.type,
        x: p.position.x,
        y: p.position.y,
        broken: p.broken,
      })),
      powerups: this.powerups.map((p) => ({
        id: p.id,
        type: p.type,
        x: p.position.x,
        y: p.position.y,
        active: p.active,
      })),
    };
  }

  private bootstrap(): void {
    this.player.reset();
    const groundX = CFG.world.worldWidth / 2 - CFG.world.platformWidth / 2;
    const ground = this.platformPool.get(
      this.nextPlatformId++,
      groundX,
      0,
      PlatformType.Static,
      0
    );
    this.platforms.push(ground);
    this.highestPlatformY = ground.position.y;

    let lastY = ground.position.y;
    while (this.highestPlatformY < 800) {
      const spawn = this.spawnRules.nextPlatform(lastY, this.highestHeight);
      const platform = this.platformPool.get(
        this.nextPlatformId++,
        spawn.x,
        spawn.y,
        spawn.type,
        this.tick,
        spawn.movement
      );
      this.platforms.push(platform);
      this.highestPlatformY = Math.max(
        this.highestPlatformY,
        platform.position.y
      );
      lastY = platform.position.y;
    }
  }

  private updatePlatforms(): void {
    for (const platform of this.platforms) {
      platform.update(this.tick);
    }
  }

  private handlePlatformCollisions(): void {
    for (const platform of this.platforms) {
      if (resolveLanding(this.player, platform)) {
        this.events.push({
          tick: this.tick,
          type: SimEventType.Bounce,
          x: this.player.position.x,
          y: this.player.position.y,
        });
        if (platform.broken) {
          this.events.push({
            tick: this.tick,
            type: SimEventType.PlatformBreak,
            x: platform.position.x,
            y: platform.position.y,
          });
        }
      }
    }
  }

  private updatePowerups(): void {
    const platformMap = new Map<number, Platform>();
    for (const platform of this.platforms) {
      platformMap.set(platform.id, platform);
    }
    for (const powerup of this.powerups) {
      if (!powerup.active) continue;
      if (powerup.attachedPlatformId) {
        const parent = platformMap.get(powerup.attachedPlatformId);
        if (parent) {
          powerup.position.x = parent.position.x + parent.width / 2;
          powerup.position.y = parent.position.y + parent.height + 24;
        }
      }
    }
  }

  private handlePowerupCollisions(): void {
    for (const powerup of this.powerups) {
      if (!powerup.active) continue;
      if (this.overlapsPowerup(powerup)) {
        powerup.active = false;
        if (powerup.type === PowerupType.Spring) {
          this.player.applySpring();
          this.events.push({
            tick: this.tick,
            type: SimEventType.Spring,
            x: powerup.position.x,
            y: powerup.position.y,
          });
        } else {
          this.player.applyJetpack();
          this.events.push({
            tick: this.tick,
            type: SimEventType.Jetpack,
            x: powerup.position.x,
            y: powerup.position.y,
          });
        }
      }
    }
  }

  private overlapsPowerup(powerup: Powerup): boolean {
    const half = this.player.getHalfWidth();
    const playerLeft = this.player.position.x - half;
    const playerRight = this.player.position.x + half;
    const playerBottom = this.player.position.y;
    const playerTop = this.player.position.y + this.player.getHeight();
    const powerLeft = powerup.position.x - powerup.width / 2;
    const powerRight = powerup.position.x + powerup.width / 2;
    const powerBottom = powerup.position.y;
    const powerTop = powerup.position.y + powerup.height;

    return (
      playerRight >= powerLeft &&
      playerLeft <= powerRight &&
      playerTop >= powerBottom &&
      playerBottom <= powerTop
    );
  }

  private cullObjects(): void {
    const minY = this.player.position.y - CFG.camera.cullMargin;
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (platform.position.y < minY || platform.broken) {
        this.platformPool.release(platform);
        this.platforms.splice(i, 1);
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      if (!powerup.active || powerup.position.y < minY) {
        this.powerupPool.release(powerup);
        this.powerups.splice(i, 1);
      }
    }
  }

  private spawnAhead(): void {
    while (
      this.highestPlatformY <
      this.player.position.y + CFG.camera.spawnAhead
    ) {
      const spawn = this.spawnRules.nextPlatform(
        this.highestPlatformY,
        this.highestHeight
      );
      const platform = this.platformPool.get(
        this.nextPlatformId++,
        spawn.x,
        spawn.y,
        spawn.type,
        this.tick,
        spawn.movement
      );
      this.platforms.push(platform);
      this.highestPlatformY = Math.max(
        this.highestPlatformY,
        platform.position.y
      );

      const powerupSpawn = this.spawnRules.maybeSpawnPowerup(
        platform,
        this.highestHeight
      );
      if (powerupSpawn) {
        const powerup = this.powerupPool.get(
          this.nextPowerupId++,
          powerupSpawn.x,
          powerupSpawn.y,
          powerupSpawn.type,
          powerupSpawn.attachedPlatformId
        );
        this.powerups.push(powerup);
      }
    }
  }
}
