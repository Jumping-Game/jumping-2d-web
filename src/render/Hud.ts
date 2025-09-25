import { Scene } from 'phaser';

interface HudOptions {
  showFps?: boolean;
}

export class Hud {
  private readonly scene: Scene;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly highScoreText: Phaser.GameObjects.Text;
  private readonly fpsText: Phaser.GameObjects.Text;
  private readonly pauseButton: Phaser.GameObjects.Text;

  constructor(scene: Scene, options: HudOptions = {}) {
    this.scene = scene;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    };

    this.scoreText = scene.add
      .text(16, 16, 'Score: 0', style)
      .setScrollFactor(0);
    this.highScoreText = scene.add
      .text(16, 44, 'High: 0', { ...style, fontSize: '14px' })
      .setScrollFactor(0);

    this.pauseButton = scene.add
      .text(scene.scale.width - 24, 16, '⏸', style)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setInteractive({ cursor: 'pointer' });

    this.pauseButton.on('pointerup', () => {
      scene.events.emit('hud-pause');
    });

    this.fpsText = scene.add
      .text(scene.scale.width - 24, 46, 'FPS: 0', {
        ...style,
        fontSize: '12px',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(options.showFps ?? false);
  }

  update(score: number, highScore: number, fps: number): void {
    this.scoreText.setText(`Score: ${score}`);
    this.highScoreText.setText(`High: ${highScore}`);
    if (this.fpsText.visible) {
      this.fpsText.setText(`FPS: ${Math.round(fps)}`);
    }
  }

  onPause(handler: () => void): void {
    this.scene.events.on('hud-pause', handler);
  }
}
