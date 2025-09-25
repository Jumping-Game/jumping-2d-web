import Phaser from 'phaser';
import { GameScene } from './render/GameScene';
import { CFG } from './config/GameConfig';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CFG.world.worldWidth,
  height: 1024, // A reasonable default height
  parent: 'app',
  scene: [GameScene],
  backgroundColor: '#000020',
};

const game = new Phaser.Game(gameConfig);