import { Vec2 } from '../core/Types';

export enum PowerupType {
  Spring = 0,
  Jetpack = 1,
}

export class Powerup {
  public id = 0;
  public readonly position: Vec2 = { x: 0, y: 0 };
  public type: PowerupType = PowerupType.Spring;
  public active = true;
  public width = 40;
  public height = 40;
  public attachedPlatformId?: number;

  init(
    id: number,
    x: number,
    y: number,
    type: PowerupType,
    attachedPlatformId?: number
  ): Powerup {
    this.id = id;
    this.position.x = x;
    this.position.y = y;
    this.type = type;
    this.active = true;
    this.attachedPlatformId = attachedPlatformId;
    return this;
  }
}

export class PowerupPool {
  private readonly pool: Powerup[] = [];

  get(
    id: number,
    x: number,
    y: number,
    type: PowerupType,
    attachedPlatformId?: number
  ): Powerup {
    const powerup = this.pool.pop() ?? new Powerup();
    return powerup.init(id, x, y, type, attachedPlatformId);
  }

  release(powerup: Powerup): void {
    powerup.active = false;
    powerup.attachedPlatformId = undefined;
    this.pool.push(powerup);
  }
}
