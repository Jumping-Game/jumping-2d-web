import { Vec2 } from '../core/Types';

export enum PowerupType {
  Spring,
  Jetpack,
}

export class Powerup {
  public position: Vec2;
  public type: PowerupType;

  constructor() {
    this.position = { x: 0, y: 0 };
    this.type = PowerupType.Spring;
  }

  init(x: number, y: number, type: PowerupType) {
    this.position.x = x;
    this.position.y = y;
    this.type = type;
    return this;
  }
}

export class PowerupPool {
  private pool: Powerup[] = [];

  get(x: number, y: number, type: PowerupType): Powerup {
    if (this.pool.length > 0) {
      const powerup = this.pool.pop()!;
      return powerup.init(x, y, type);
    }
    return new Powerup().init(x, y, type);
  }

  release(powerup: Powerup) {
    this.pool.push(powerup);
  }
}