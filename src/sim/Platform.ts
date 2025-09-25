import { CFG } from '../config/GameConfig';
import { PlatformMovement, Tick, Vec2 } from '../core/Types';

export enum PlatformType {
  Static = 0,
  Moving = 1,
  Breakable = 2,
  OneShot = 3,
}

export class Platform {
  public id = 0;
  public type: PlatformType = PlatformType.Static;
  public readonly position: Vec2 = { x: 0, y: 0 };
  public width = CFG.world.platformWidth;
  public height = CFG.world.platformHeight;
  public movement?: PlatformMovement;
  public broken = false;
  public spawnTick: Tick = 0;
  public oscillationCenterX = 0;

  init(
    id: number,
    x: number,
    y: number,
    type: PlatformType,
    tick: Tick,
    movement?: PlatformMovement
  ): Platform {
    this.id = id;
    this.type = type;
    this.position.x = x;
    this.position.y = y;
    this.movement = movement;
    this.spawnTick = tick;
    this.oscillationCenterX = x;
    this.broken = false;
    return this;
  }

  isPassable(): boolean {
    return this.type === PlatformType.Breakable && this.broken;
  }

  update(tick: Tick): void {
    if (!this.movement) {
      this.position.x = wrapX(this.oscillationCenterX);
      return;
    }

    const { amplitude, periodTicks, phase } = this.movement;
    const theta = (2 * Math.PI * (tick + phase)) / periodTicks;
    const oscillated = this.oscillationCenterX + Math.sin(theta) * amplitude;
    this.position.x = wrapX(oscillated);
  }

  getRenderX(tick: Tick, alpha: number): number {
    if (!this.movement) {
      return this.position.x;
    }
    const targetTick = tick + alpha;
    const { amplitude, periodTicks, phase } = this.movement;
    const theta = (2 * Math.PI * (targetTick + phase)) / periodTicks;
    const oscillated = this.oscillationCenterX + Math.sin(theta) * amplitude;
    return wrapX(oscillated);
  }
}

export class PlatformPool {
  private readonly pool: Platform[] = [];

  get(
    id: number,
    x: number,
    y: number,
    type: PlatformType,
    tick: Tick,
    movement?: PlatformMovement
  ): Platform {
    const platform = this.pool.pop() ?? new Platform();
    return platform.init(id, x, y, type, tick, movement);
  }

  release(platform: Platform): void {
    platform.broken = false;
    platform.movement = undefined;
    this.pool.push(platform);
  }
}

function wrapX(x: number): number {
  const width = CFG.world.worldWidth;
  if (x < 0) {
    return ((x % width) + width) % width;
  }
  if (x >= width) {
    return x % width;
  }
  return x;
}
