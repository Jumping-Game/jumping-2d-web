import { Scene } from 'phaser';
import { World } from '../sim/World';
import { Player } from '../sim/Player';
import { Platform } from '../sim/Platform';
import { Powerup, PowerupType } from '../sim/Powerup';
import { Assets } from './Assets';
import { Hud } from './Hud';
import { Clock } from '../core/Clock';
import { CFG } from '../config/GameConfig';
import { InputManager } from '../input/Input';

export class GameScene extends Scene {
  private world!: World;
  private assets!: Assets;
  private hud!: Hud;
  private clock!: Clock;
  private inputManager!: InputManager;

  private playerSprite!: Phaser.GameObjects.Sprite;
  private platformSprites: Map<Platform, Phaser.GameObjects.Sprite> = new Map();
  private powerupSprites: Map<Powerup, Phaser.GameObjects.Sprite> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.assets = new Assets(this);
    this.assets.preload();
  }

  create() {
    this.assets.create();
    this.world = new World('initial-seed');
    this.hud = new Hud(this);
    this.inputManager = new InputManager(this);

    // Create player sprite
    this.playerSprite = this.add.sprite(
      this.world.player.position.x,
      this.world.player.position.y,
      'player'
    );

    // Set up camera
    this.cameras.main.startFollow(this.playerSprite, true, 0.08, 0.08);
    this.cameras.main.setBounds(
      0,
      -Infinity,
      CFG.world.worldWidth,
      Infinity
    );

    // Start the game clock
    this.clock = new Clock(CFG.tps, (tick, dt) => {
      this.world.update(dt, this.inputManager.axisX);
    });
    this.clock.start();
  }

  update() {
    this.inputManager.update();

    // Sync sprites with world state
    this.syncSprites();

    // Update HUD
    this.hud.update(this.world.currentHeight, this.game.loop.actualFps);
  }

  private syncSprites() {
    // Player
    this.playerSprite.x = this.world.player.position.x;
    this.playerSprite.y = -this.world.player.position.y; // Invert Y for Phaser

    // Platforms
    const activePlatforms = new Set(this.world.platforms);
    // Update existing sprites and remove old ones
    this.platformSprites.forEach((sprite, platform) => {
      if (!activePlatforms.has(platform)) {
        sprite.destroy();
        this.platformSprites.delete(platform);
      } else {
        sprite.x = platform.position.x;
        sprite.y = -platform.position.y;
      }
    });
    // Create new sprites
    this.world.platforms.forEach((platform) => {
      if (!this.platformSprites.has(platform)) {
        const sprite = this.add.sprite(
          platform.position.x,
          -platform.position.y,
          'platform'
        );
        this.platformSprites.set(platform, sprite);
      }
    });

    // Powerups
    const activePowerups = new Set(this.world.powerups);
    this.powerupSprites.forEach((sprite, powerup) => {
      if (!activePowerups.has(powerup)) {
        sprite.destroy();
        this.powerupSprites.delete(powerup);
      } else {
        sprite.x = powerup.position.x;
        sprite.y = -powerup.position.y;
      }
    });
    this.world.powerups.forEach((powerup) => {
      if (!this.powerupSprites.has(powerup)) {
        const sprite = this.add.sprite(
          powerup.position.x,
          -powerup.position.y,
          powerup.type === PowerupType.Spring ? 'spring' : ''
        );
        this.powerupSprites.set(powerup, sprite);
      }
    });
  }
}