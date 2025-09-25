import { CFG } from '../config/GameConfig';
import { clamp, lerp } from '../core/Mathf';
import { PlayerInput, Tick, Vec2 } from '../core/Types';

export enum PlayerState {
  Alive = 0,
  Jetpacking = 1,
  Dead = 2,
}

const DT = 1 / CFG.tps;

export class Player {
  public readonly position: Vec2 = {
    x: CFG.world.worldWidth / 2,
    y: CFG.world.platformHeight + 180,
  };
  public readonly previousPosition: Vec2 = {
    x: this.position.x,
    y: this.position.y,
  };
  public readonly velocity: Vec2 = { x: 0, y: 0 };
  public state: PlayerState = PlayerState.Alive;
  private jetpackTicksRemaining = 0;

  reset(): void {
    this.position.x = CFG.world.worldWidth / 2;
    this.position.y = CFG.world.platformHeight + 180;
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.state = PlayerState.Alive;
    this.jetpackTicksRemaining = 0;
  }

  step(_tick: Tick, input: PlayerInput): void {
    if (this.state === PlayerState.Dead) {
      this.cachePrevious();
      return;
    }

    this.cachePrevious();

    const axis = clamp(input.axisX, -1, 1);
    const accel = CFG.world.accel * axis;
    this.velocity.x += accel * DT;

    if (axis === 0) {
      this.velocity.x *= CFG.world.friction;
    }

    this.velocity.x = clamp(this.velocity.x, -CFG.world.maxVx, CFG.world.maxVx);

    if (this.jetpackTicksRemaining > 0) {
      this.state = PlayerState.Jetpacking;
      this.velocity.y = CFG.world.jetpackVy;
      this.jetpackTicksRemaining -= 1;
    } else if (this.state === PlayerState.Jetpacking) {
      this.state = PlayerState.Alive;
    }

    this.velocity.y += CFG.world.gravity * DT;

    this.position.x += this.velocity.x * DT;
    this.position.y += this.velocity.y * DT;

    if (this.position.x < 0) {
      this.position.x += CFG.world.worldWidth;
      this.previousPosition.x = this.position.x;
    } else if (this.position.x > CFG.world.worldWidth) {
      this.position.x -= CFG.world.worldWidth;
      this.previousPosition.x = this.position.x;
    }

    if (this.position.y < -CFG.camera.cullMargin) {
      this.state = PlayerState.Dead;
    }
  }

  applyBounce(multiplier = CFG.player.bounceDamp): void {
    this.velocity.y = CFG.world.jumpVy * multiplier;
  }

  applySpring(): void {
    this.velocity.y = CFG.world.springVy;
  }

  applyJetpack(): void {
    this.jetpackTicksRemaining = CFG.powerups.jetpackDurationTicks;
    this.state = PlayerState.Jetpacking;
    this.velocity.y = CFG.world.jetpackVy;
  }

  die(): void {
    this.state = PlayerState.Dead;
  }

  getFeetY(): number {
    return this.position.y;
  }

  getPreviousFeetY(): number {
    return this.previousPosition.y;
  }

  getHalfWidth(): number {
    return CFG.player.width / 2;
  }

  getHeight(): number {
    return CFG.player.height;
  }

  getRenderPosition(alpha: number): Vec2 {
    return {
      x: lerp(this.previousPosition.x, this.position.x, alpha),
      y: lerp(this.previousPosition.y, this.position.y, alpha),
    };
  }

  private cachePrevious(): void {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
  }
}
