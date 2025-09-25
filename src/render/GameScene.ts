import Phaser from 'phaser';
import { CFG } from '../config/GameConfig';
import { Clock } from '../core/Clock';
import { World, SimEventType } from '../sim/World';
import { PlayerState } from '../sim/Player';
import { Platform, PlatformType } from '../sim/Platform';
import { Powerup, PowerupType } from '../sim/Powerup';
import { InputManager } from '../input/Input';
import { Hud } from './Hud';
import { AudioKeys, TextureKeys } from './Assets';
import { SceneKeys } from './SceneKeys';
import { saveHighScore, loadHighScore } from './Storage';
import { getUIManager } from '../ui';
import { NetClientStub } from '../net/NetClientStub';

declare global {
  interface Window {
    __skyhopper?: { score: number; tick: number };
  }
}

interface GameSceneData {
  seed: string;
}

export class GameScene extends Phaser.Scene {
  private world!: World;
  private clock!: Clock;
  private inputManager!: InputManager;
  private hud!: Hud;
  private highScore = 0;
  private paused = false;
  private renderAlpha = 0;
  private readonly platformSprites = new Map<
    number,
    Phaser.GameObjects.Image
  >();
  private readonly powerupSprites = new Map<number, Phaser.GameObjects.Image>();
  private playerSprite!: Phaser.GameObjects.Image;
  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private pendingEvents: SimEventType[] = [];
  private netClient = new NetClientStub();

  constructor() {
    super(SceneKeys.Game);
  }

  init(data: GameSceneData): void {
    const seed = data?.seed ?? 'default-seed';
    this.world = new World(seed);
    this.pendingEvents = [];
    this.highScore = loadHighScore();
    this.paused = false;
  }

  create(): void {
    this.bgFar = this.add
      .tileSprite(
        0,
        0,
        CFG.world.worldWidth,
        this.scale.height * 2,
        TextureKeys.BgFar
      )
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.bgMid = this.add
      .tileSprite(
        0,
        0,
        CFG.world.worldWidth,
        this.scale.height * 2,
        TextureKeys.BgMid
      )
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.bgNear = this.add
      .tileSprite(
        0,
        0,
        CFG.world.worldWidth,
        this.scale.height * 2,
        TextureKeys.BgNear
      )
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.playerSprite = this.add
      .image(0, 0, TextureKeys.Player)
      .setOrigin(0.5, 1)
      .setDepth(10);

    this.inputManager = new InputManager(this);
    this.hud = new Hud(this, { showFps: import.meta.env.DEV });
    this.hud.onPause(() => this.togglePause());

    const esc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    esc.on('down', () => this.togglePause());
    this.cameras.main.setBounds(0, -Infinity, CFG.world.worldWidth, Infinity);
    this.cameras.main.startFollow(
      this.playerSprite,
      true,
      CFG.camera.followLerp,
      CFG.camera.followLerp,
      0,
      -CFG.camera.verticalOffset
    );

    this.netClient.prepareJoin('solo');

    this.clock = new Clock(
      CFG.tps,
      (tick) => this.fixedStep(tick),
      (alpha) => {
        this.renderAlpha = alpha;
      }
    );
    this.clock.start();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
  }

  update(): void {
    this.syncSprites();
    this.updateBackground();
    this.processEvents();
    this.hud.update(this.world.score, this.highScore, this.game.loop.actualFps);
    window.__skyhopper = {
      score: this.world.score,
      tick: this.world.tick,
    };

    if (this.world.player.state === PlayerState.Dead && !this.paused) {
      this.handleGameOver();
    }
  }

  private onShutdown(): void {
    this.clock.stop();
    this.platformSprites.forEach((sprite) => sprite.destroy());
    this.powerupSprites.forEach((sprite) => sprite.destroy());
    this.platformSprites.clear();
    this.powerupSprites.clear();
  }

  private fixedStep(tick: number): void {
    const input = this.inputManager.sample(tick);
    this.world.step(input);
    this.netClient.bufferInput(tick, input.axisX, input.jump);

    for (const event of this.world.drainEvents()) {
      this.pendingEvents.push(event.type);
    }
  }

  private syncSprites(): void {
    const playerPos = this.world.player.getRenderPosition(this.renderAlpha);
    this.playerSprite.setPosition(
      Math.round(playerPos.x),
      Math.round(-playerPos.y)
    );

    const activePlatformIds = new Set<number>();
    for (const platform of this.world.platforms) {
      activePlatformIds.add(platform.id);
      const sprite =
        this.platformSprites.get(platform.id) ??
        this.createPlatformSprite(platform);
      const x = platform.getRenderX(this.world.tick, this.renderAlpha);
      sprite.setPosition(
        Math.round(x + platform.width / 2),
        Math.round(-platform.position.y)
      );
      this.tintPlatform(platform, sprite);
    }
    for (const [id, sprite] of this.platformSprites) {
      if (!activePlatformIds.has(id)) {
        sprite.destroy();
        this.platformSprites.delete(id);
      }
    }

    const activePowerIds = new Set<number>();
    for (const powerup of this.world.powerups) {
      if (!powerup.active) continue;
      activePowerIds.add(powerup.id);
      const sprite =
        this.powerupSprites.get(powerup.id) ??
        this.createPowerupSprite(powerup);
      sprite.setPosition(
        Math.round(powerup.position.x),
        Math.round(-powerup.position.y)
      );
      sprite.setTexture(
        powerup.type === PowerupType.Spring
          ? TextureKeys.Spring
          : TextureKeys.Jetpack
      );
    }
    for (const [id, sprite] of this.powerupSprites) {
      if (!activePowerIds.has(id)) {
        sprite.destroy();
        this.powerupSprites.delete(id);
      }
    }
  }

  private tintPlatform(
    platform: Platform,
    sprite: Phaser.GameObjects.Image
  ): void {
    switch (platform.type) {
      case PlatformType.Static:
        sprite.clearTint();
        break;
      case PlatformType.Moving:
        sprite.setTint(0x90caf9);
        break;
      case PlatformType.Breakable:
        sprite.setTint(0xff7043);
        break;
      case PlatformType.OneShot:
        sprite.setTint(0xfff176);
        break;
    }
  }

  private createPlatformSprite(platform: Platform): Phaser.GameObjects.Image {
    const sprite = this.add
      .image(
        platform.position.x + platform.width / 2,
        -platform.position.y,
        TextureKeys.Platform
      )
      .setOrigin(0.5, 1)
      .setDepth(5);
    this.platformSprites.set(platform.id, sprite);
    return sprite;
  }

  private createPowerupSprite(powerup: Powerup): Phaser.GameObjects.Image {
    const sprite = this.add
      .image(powerup.position.x, -powerup.position.y, TextureKeys.Spring)
      .setOrigin(0.5, 1)
      .setDepth(6);
    this.powerupSprites.set(powerup.id, sprite);
    return sprite;
  }

  private updateBackground(): void {
    const cameraY = -this.cameras.main.scrollY;
    this.bgFar.tilePositionY = cameraY * 0.1;
    this.bgMid.tilePositionY = cameraY * 0.3;
    this.bgNear.tilePositionY = cameraY * 0.6;
  }

  private processEvents(): void {
    if (this.pendingEvents.length === 0) {
      return;
    }
    for (const type of this.pendingEvents) {
      switch (type) {
        case SimEventType.Bounce:
          this.sound.play(AudioKeys.Jump, { volume: CFG.audio.masterVolume });
          break;
        case SimEventType.Spring:
          this.sound.play(AudioKeys.Spring, { volume: CFG.audio.masterVolume });
          break;
        case SimEventType.PlatformBreak:
          this.sound.play(AudioKeys.Break, { volume: CFG.audio.masterVolume });
          break;
        case SimEventType.Jetpack:
          this.sound.play(AudioKeys.Spring, { volume: CFG.audio.masterVolume });
          break;
        default:
          break;
      }
    }
    this.pendingEvents.length = 0;
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  private pauseGame(): void {
    if (this.paused) return;
    this.paused = true;
    this.clock.pause();
    getUIManager().showPause(() => this.resumeGame());
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;
    this.clock.resume();
    getUIManager().hide();
  }

  private handleGameOver(): void {
    this.clock.stop();
    this.paused = true;
    saveHighScore(this.world.score);
    this.highScore = Math.max(this.highScore, this.world.score);
    getUIManager().hide();
    this.scene.start(SceneKeys.GameOver, {
      score: this.world.score,
      highScore: this.highScore,
    });
  }
}
