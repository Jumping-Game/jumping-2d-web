import { Vec2 } from '../core/Types';
import { CFG } from '../config/GameConfig';

export enum PlatformType {
  Static,
  Moving,
  Breakable,
  OneShot,
}

export class Platform {
  public position: Vec2;
  public type: PlatformType;
  public width: number;
  public height: number;
  public isBroken: boolean;
  public initialTime: number; // For moving platforms

  constructor() {
    this.position = { x: 0, y: 0 };
    this.type = PlatformType.Static;
    this.width = CFG.world.platformWidth;
    this.height = CFG.world.platformHeight;
    this.isBroken = false;
    this.initialTime = 0;
  }

  init(x: number, y: number, type: PlatformType, tick: number) {
    this.position.x = x;
    this.position.y = y;
    this.type = type;
    this.isBroken = false;
    this.initialTime = tick / CFG.tps;
    return this;
  }

  update(tick: number) {
    if (this.type === PlatformType.Moving) {
      const time = tick / CFG.tps - this.initialTime;
      const amplitude = (CFG.world.worldWidth - this.width) / 2;
      this.position.x =
        CFG.world.worldWidth / 2 +
        amplitude * Math.sin((2 * Math.PI * time) / 4); // 4-second period
    }
  }
}

export class PlatformPool {
  private pool: Platform[] = [];

  get(x: number, y: number, type: PlatformType, tick: number): Platform {
    if (this.pool.length > 0) {
      const platform = this.pool.pop()!;
      return platform.init(x, y, type, tick);
    }
    return new Platform().init(x, y, type, tick);
  }

  release(platform: Platform) {
    this.pool.push(platform);
  }
}