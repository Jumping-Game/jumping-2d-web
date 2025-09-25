import { Scene } from 'phaser';
import { AssetLoader } from './Assets';
import { SceneKeys } from './SceneKeys';

export class BootScene extends Scene {
  private loader!: AssetLoader;

  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.loader = new AssetLoader(this);
    this.loader.preload();

    this.load.on('complete', () => {
      this.loader.create();
      this.scene.start(SceneKeys.Menu);
    });
  }
}
