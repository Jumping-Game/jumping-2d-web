import { Scene } from 'phaser';

export class Assets {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  preload() {
    // Use simple colored rectangles as placeholders
    this.scene.load.image('player', 'assets/player.png');
    this.scene.load.image('platform', 'assets/platform.png');
    this.scene.load.image('spring', 'assets/spring.png');
  }

  create() {
    // Create placeholder graphics if assets are missing
    if (!this.scene.textures.exists('player')) {
      const playerGraphics = this.scene.add.graphics();
      playerGraphics.fillStyle(0x00ff00, 1);
      playerGraphics.fillRect(0, 0, 48, 64);
      playerGraphics.generateTexture('player', 48, 64);
      playerGraphics.destroy();
    }

    if (!this.scene.textures.exists('platform')) {
      const platformGraphics = this.scene.add.graphics();
      platformGraphics.fillStyle(0x8B4513, 1);
      platformGraphics.fillRect(0, 0, 120, 18);
      platformGraphics.generateTexture('platform', 120, 18);
      platformGraphics.destroy();
    }

    if (!this.scene.textures.exists('spring')) {
        const springGraphics = this.scene.add.graphics();
        springGraphics.fillStyle(0xffff00, 1);
        springGraphics.fillRect(0, 0, 32, 32);
        springGraphics.generateTexture('spring', 32, 32);
        springGraphics.destroy();
      }
  }
}