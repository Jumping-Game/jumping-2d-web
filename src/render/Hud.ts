import { Scene } from 'phaser';

export class Hud {
  private scene: Scene;
  private scoreText: Phaser.GameObjects.Text;
  private fpsText: Phaser.GameObjects.Text;

  constructor(scene: Scene) {
    this.scene = scene;
    this.scoreText = this.scene.add
      .text(10, 10, 'Score: 0', {
        fontSize: '24px',
        color: '#fff',
      })
      .setScrollFactor(0);
    this.fpsText = this.scene.add
      .text(10, 40, 'FPS: 0', {
        fontSize: '18px',
        color: '#fff',
      })
      .setScrollFactor(0);
  }

  update(score: number, fps: number) {
    this.scoreText.setText(`Score: ${Math.floor(score)}`);
    this.fpsText.setText(`FPS: ${Math.round(fps)}`);
  }
}