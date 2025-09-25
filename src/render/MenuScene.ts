import { Scene } from 'phaser';
import { TextureKeys } from './Assets';
import { SceneKeys } from './SceneKeys';
import { getUIManager } from '../ui';
import { loadHighScore } from './Storage';

export class MenuScene extends Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    this.add.image(0, 0, TextureKeys.BgFar).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgMid).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgNear).setOrigin(0);

    const ui = getUIManager();
    ui.showMenu(() => {
      ui.hide();
      this.scene.start(SceneKeys.Game, { seed: Date.now().toString() });
    }, loadHighScore());
  }
}
