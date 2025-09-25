import { Scene } from 'phaser';
import { assetManifest } from '../assets/manifest';

export const TextureKeys = {
  Player: 'player',
  Platform: 'platform',
  Spring: 'spring',
  Jetpack: 'jetpack',
  BgFar: 'bg_far',
  BgMid: 'bg_mid',
  BgNear: 'bg_near',
} as const;

export const AudioKeys = {
  Jump: 'sfx_jump',
  Spring: 'sfx_spring',
  Break: 'sfx_break',
} as const;

export class AssetLoader {
  constructor(private readonly scene: Scene) {}

  preload(): void {
    const { images, audio } = assetManifest;
    this.scene.load.image(TextureKeys.Player, images.player);
    this.scene.load.image(TextureKeys.Platform, images.platform);
    this.scene.load.image(TextureKeys.Spring, images.spring);
    this.scene.load.image(TextureKeys.Jetpack, images.jetpack);
    this.scene.load.image(TextureKeys.BgFar, images.bgFar);
    this.scene.load.image(TextureKeys.BgMid, images.bgMid);
    this.scene.load.image(TextureKeys.BgNear, images.bgNear);

    this.scene.load.audio(AudioKeys.Jump, audio.jump);
    this.scene.load.audio(AudioKeys.Spring, audio.spring);
    this.scene.load.audio(AudioKeys.Break, audio.break);
  }

  create(): void {
    this.scene.textures
      .get(TextureKeys.Player)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.textures
      .get(TextureKeys.Platform)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.textures
      .get(TextureKeys.Spring)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.textures
      .get(TextureKeys.Jetpack)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
