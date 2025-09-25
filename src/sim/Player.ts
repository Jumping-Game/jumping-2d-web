import { Vec2 } from '../core/Types';
import { CFG } from '../config/GameConfig';
import { clamp } from '../core/Mathf';

export enum PlayerState {
  Alive,
  Dead,
}

export class Player {
  public position: Vec2;
  public velocity: Vec2;
  public state: PlayerState;

  constructor() {
    this.position = { x: CFG.world.worldWidth / 2, y: 200 };
    this.velocity = { x: 0, y: 0 };
    this.state = PlayerState.Alive;
  }

  update(dt: number, inputAxisX: number) {
    if (this.state !== PlayerState.Alive) return;

    // Apply gravity
    this.velocity.y += CFG.world.gravity * dt;

    // Apply horizontal acceleration
    this.velocity.x += inputAxisX * CFG.world.accel * dt;

    // Apply friction
    if (inputAxisX === 0) {
      this.velocity.x *= 0.9; // A simple friction factor
    }

    // Clamp horizontal velocity
    this.velocity.x = clamp(this.velocity.x, -CFG.world.maxVx, CFG.world.maxVx);

    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Wrap around the world
    if (this.position.x < 0) {
      this.position.x = CFG.world.worldWidth;
    } else if (this.position.x > CFG.world.worldWidth) {
      this.position.x = 0;
    }
  }

  jump() {
    this.velocity.y = CFG.world.jumpVy;
  }

  die() {
    this.state = PlayerState.Dead;
    this.velocity = { x: 0, y: 0 };
  }
}