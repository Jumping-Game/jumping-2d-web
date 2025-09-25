import { Scene } from 'phaser';

export class InputManager {
  public axisX: number = 0;
  private scene: Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(scene: Scene) {
    this.scene = scene;
    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    // Touch controls
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < this.scene.scale.width / 2) {
        this.axisX = -1;
      } else {
        this.axisX = 1;
      }
    });

    this.scene.input.on('pointerup', () => {
      this.axisX = 0;
    });
  }

  update() {
    // Keyboard controls
    if (this.cursors.left.isDown || this.scene.input.keyboard!.addKey('A').isDown) {
      this.axisX = -1;
    } else if (this.cursors.right.isDown || this.scene.input.keyboard!.addKey('D').isDown) {
      this.axisX = 1;
    } else {
      // If no keyboard input, rely on touch or reset
      if (this.axisX !== -1 && this.axisX !== 1) {
        this.axisX = 0;
      }
    }
  }
}