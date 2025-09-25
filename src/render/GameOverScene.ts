import { Scene } from 'phaser';
import { TextureKeys } from './Assets';
import { SceneKeys } from './SceneKeys';
import { getUIManager } from '../ui';

interface GameOverData {
  score: number;
  highScore: number;
}

export class GameOverScene extends Scene {
  constructor() {
    super(SceneKeys.GameOver);
  }

  create(data: GameOverData): void {
    this.add.image(0, 0, TextureKeys.BgFar).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgMid).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgNear).setOrigin(0);

    const ui = getUIManager();
    ui.showGameOver(
      () => {
        ui.hide();
        this.scene.start(SceneKeys.Game, { seed: Date.now().toString() });
      },
      data.score,
      data.highScore
    );
  }
}
