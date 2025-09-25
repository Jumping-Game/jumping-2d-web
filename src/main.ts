import Phaser from 'phaser';
import { CFG } from './config/GameConfig';
import { BootScene } from './render/BootScene';
import { MenuScene } from './render/MenuScene';
import { GameScene } from './render/GameScene';
import { GameOverScene } from './render/GameOverScene';
import { initUIManager } from './ui';

const uiContainer = document.getElementById('ui-layer');
if (!uiContainer) {
  throw new Error('Missing UI container');
}

initUIManager(uiContainer);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#050915',
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'app',
    width: CFG.world.worldWidth,
    height: 1280,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { pixelArt: true },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  parent: 'app',
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(CFG.world.worldWidth, 1280);
});
