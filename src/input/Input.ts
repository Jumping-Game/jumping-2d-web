import { Scene } from 'phaser';
import { CFG } from '../config/GameConfig';
import { applyDeadzone, clamp } from '../core/Mathf';
import { PlayerInput, Tick } from '../core/Types';

export class InputManager {
  private readonly scene: Scene;
  private readonly left: Phaser.Input.Keyboard.Key;
  private readonly right: Phaser.Input.Keyboard.Key;
  private readonly a: Phaser.Input.Keyboard.Key;
  private readonly d: Phaser.Input.Keyboard.Key;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;

  private pointerAxis = 0;
  private keyboardAxis = 0;
  private jumpBuffered = false;

  constructor(scene: Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard!;
    this.left = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      true,
      false
    );
    this.right = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      true,
      false
    );
    this.a = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, true, false);
    this.d = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, true, false);
    this.jumpKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      true,
      false
    );

    this.scene.input.addPointer(2);
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const width = this.scene.scale.width;
      this.pointerAxis = pointer.x < width / 2 ? -1 : 1;
      this.consumeJump(pointer.downX === pointer.upX);
    });
    this.scene.input.on('pointerup', () => {
      this.pointerAxis = 0;
    });

    document.body.style.touchAction = 'none';
  }

  sample(tick: Tick): PlayerInput {
    this.keyboardAxis = 0;
    if (this.left.isDown || this.a.isDown) {
      this.keyboardAxis -= 1;
    }
    if (this.right.isDown || this.d.isDown) {
      this.keyboardAxis += 1;
    }

    const axis = clamp(this.pointerAxis || this.keyboardAxis, -1, 1);
    const normalized = applyDeadzone(axis, CFG.input.keyboardDeadzone);

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      this.jumpBuffered = true;
    }

    const jump = this.consumeJump();

    return {
      tick,
      axisX: normalized,
      jump,
    };
  }

  private consumeJump(force = false): boolean {
    if (force) {
      const wasBuffered = this.jumpBuffered;
      this.jumpBuffered = false;
      return wasBuffered;
    }
    if (this.jumpBuffered) {
      this.jumpBuffered = false;
      return true;
    }
    return false;
  }
}
