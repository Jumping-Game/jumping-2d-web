import Phaser from 'phaser';
import { CFG } from '../config/GameConfig';
import { NET_CFG } from '../net/config';
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
import { NetClient } from '../net/NetClient';
import type { CharacterId } from '../config/characters';
import { getCharacterOption } from '../config/characters';
import {
  NetEvent,
  NetRoomState,
  S2CError,
  S2CFinish,
  S2CPlayerPresence,
  S2CSnapshot,
  S2CStart,
  S2CStartCountdown,
  S2CWelcome,
} from '../net/Protocol';
import type { MatchSessionConfig } from '../net/types';
import { leaveRoom } from '../net/matchmaking';
import { useNetStore } from '../state/store';

declare global {
  interface Window {
    __skyhopper?: { score: number; tick: number };
  }
}

interface GameSceneData {
  seed: string;
  netSession?: MatchSessionConfig;
}

interface RemotePlayerState {
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  lastSeen: number;
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
  private playerLabel!: Phaser.GameObjects.Text;
  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private pendingEvents: SimEventType[] = [];
  private netClient!: NetClient;
  private readonly remotePlayers = new Map<string, RemotePlayerState>();
  private playerNames = new Map<string, string>();
  private localPlayerId?: string;
  private netLatencyMs = Number.NaN;
  private netSession?: MatchSessionConfig;
  private netRoomState: NetRoomState = 'running';
  private unsubscribeRoomState?: () => void;
  private unsubscribeCharacters?: () => void;
  private unsubscribePlayers?: () => void;
  private lobbyVisible = false;
  private leavingRoom = false;
  private characterSelections: Record<string, CharacterId> = {};
  private readonly handleReadyToggle = (ready: boolean): void => {
    if (!this.netClient?.enabled) {
      return;
    }
    const state = useNetStore.getState();
    if (state.roomState !== 'lobby') {
      return;
    }
    this.netClient.setReady(ready);
  };

  private readonly handleStartMatch = (): void => {
    if (!this.netClient?.enabled) {
      return;
    }
    const state = useNetStore.getState();
    if (state.countdown || state.roomState !== 'lobby') {
      return;
    }
    this.netClient.requestStart(3);
  };

  private readonly handleLeaveLobby = (): void => {
    if (this.leavingRoom) {
      return;
    }
    this.leavingRoom = true;
    getUIManager().hide();
    this.scene.stop(SceneKeys.Game);
    this.scene.start(SceneKeys.Menu);
  };

  private readonly handleCharacterSelect = (characterId: CharacterId): void => {
    if (!this.netClient?.enabled) {
      return;
    }
    const state = useNetStore.getState();
    const playerId = state.playerId;
    if (!playerId) {
      return;
    }
    const changed = state.setCharacterSelection(playerId, characterId);
    if (!changed) {
      return;
    }
    this.netClient.selectCharacter(characterId);
  };

  constructor() {
    super(SceneKeys.Game);
  }

  init(data: GameSceneData): void {
    const seed = data?.seed ?? 'default-seed';
    this.world = new World(seed);
    this.pendingEvents = [];
    this.highScore = loadHighScore();
    this.paused = false;
    this.netSession = data?.netSession;
    this.netRoomState = 'running';
    this.lobbyVisible = false;
    this.leavingRoom = false;
    this.unsubscribeRoomState?.();
    this.unsubscribeRoomState = undefined;
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

    this.playerLabel = this.add
      .text(0, 0, 'You', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1.8)
      .setDepth(11)
      .setShadow(0, 2, 'rgba(0,0,0,0.6)', 2)
      .setAlpha(0.9);

    this.inputManager = new InputManager(this);
    this.hud = new Hud(this, {
      showFps: import.meta.env.DEV,
      showNetDebug: import.meta.env.DEV,
    });
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

    this.setupNetworking();

    this.clock = new Clock(
      CFG.tps,
      (tick) => this.fixedStep(tick),
      (alpha) => {
        this.renderAlpha = alpha;
      }
    );
    this.clock.start();

    if (this.netClient.enabled) {
      this.bindNetStore();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
  }

  update(): void {
    this.syncSprites();
    this.updateBackground();
    this.updateRemotePlayerVisibility();
    this.processEvents();
    this.hud.update(this.world.score, this.highScore, this.game.loop.actualFps);
    if (this.netClient.enabled) {
      const storeState = useNetStore.getState();
      this.hud.setNetDebug({
        tick: this.world.tick,
        role: storeState.role,
        roomState: storeState.roomState,
        rtt: this.netLatencyMs,
        ackTick: storeState.net.ackTick,
        lastInputSeq: storeState.net.lastInputSeq,
        droppedSnapshots: storeState.net.droppedSnapshots,
      });
    } else {
      this.hud.setNetDebug();
    }
    window.__skyhopper = {
      score: this.world.score,
      tick: this.world.tick,
    };

    if (this.world.player.state === PlayerState.Dead && !this.paused) {
      this.handleGameOver();
    }
  }

  private onShutdown(): void {
    this.unsubscribeRoomState?.();
    this.unsubscribeRoomState = undefined;
    this.unsubscribeCharacters?.();
    this.unsubscribeCharacters = undefined;
    this.unsubscribePlayers?.();
    this.unsubscribePlayers = undefined;
    if (this.lobbyVisible) {
      getUIManager().hide();
      this.lobbyVisible = false;
    }
    this.clock.stop();
    this.platformSprites.forEach((sprite) => sprite.destroy());
    this.powerupSprites.forEach((sprite) => sprite.destroy());
    this.platformSprites.clear();
    this.powerupSprites.clear();
    this.playerLabel?.destroy();
    this.remotePlayers.forEach((remote) => {
      remote.sprite.destroy();
      remote.label.destroy();
    });
    this.remotePlayers.clear();
    void this.sendLeaveRequest();
    this.netClient?.destroy();
  }

  private fixedStep(tick: number): void {
    if (this.netClient.enabled && this.netRoomState !== 'running') {
      return;
    }
    const input = this.inputManager.sample(tick);
    this.world.step(input);
    this.netClient?.bufferInput(tick, input.axisX, input.jump);

    for (const event of this.world.drainEvents()) {
      this.pendingEvents.push(event.type);
    }
  }

  private setupNetworking(): void {
    const session: MatchSessionConfig | undefined =
      this.netSession ??
      (NET_CFG.wsUrl
        ? {
            wsUrl: NET_CFG.wsUrl,
            wsToken: NET_CFG.wsToken,
            playerName: NET_CFG.playerName,
            apiBaseUrl: NET_CFG.apiBaseUrl,
          }
        : undefined);

    this.netSession = session;

    this.netClient = new NetClient({
      url: session?.wsUrl,
      token: session?.wsToken,
      playerName: session?.playerName ?? NET_CFG.playerName,
      clientVersion: NET_CFG.clientVersion,
      device: NET_CFG.device,
      capabilities: NET_CFG.capabilities,
      flushIntervalMs: NET_CFG.flushIntervalMs,
      pingIntervalMs: NET_CFG.pingIntervalMs,
      debug: NET_CFG.debug,
    });

    this.netClient.onSnapshot((snapshot) => this.handleNetSnapshot(snapshot));
    this.netClient.onPresence((presence) => this.handleNetPresence(presence));

    if (!this.netClient.enabled) {
      this.hud.setNetStatus('Offline');
      return;
    }

    this.hud.setNetStatus('Connecting…');

    this.netClient.onConnect(() => {
      this.hud.setNetStatus('Connected');
    });
    this.netClient.onWelcome((welcome) => this.handleNetWelcome(welcome));
    this.netClient.onLatency((latency) => this.handleNetLatency(latency));
    this.netClient.onError((error) => this.handleNetError(error));
    this.netClient.onDisconnect(() => this.handleNetDisconnect());
    this.netClient.onFinish((finish) => this.handleNetFinish(finish));
    this.netClient.onStart((start) => this.handleNetStart(start));
    this.netClient.onStartCountdown((payload) =>
      this.handleNetStartCountdown(payload)
    );

    this.netClient.prepareJoin(session?.playerName ?? NET_CFG.playerName);
  }

  private bindNetStore(): void {
    if (!this.netClient.enabled) {
      this.netRoomState = 'running';
      return;
    }
    const state = useNetStore.getState();
    this.characterSelections = state.characterSelections;
    this.playerNames = new Map(
      state.players.map((player) => [player.id, player.name])
    );
    this.applyCharacterStyles();
    this.refreshPlayerLabels();
    this.netRoomState = state.roomState;
    if (this.netRoomState !== 'running') {
      this.showLobbyUI();
      this.clock.pause();
    }
    this.unsubscribeRoomState = useNetStore.subscribe(
      (s) => s.roomState,
      (roomState, previousRoomState) =>
        this.onRoomStateChanged(roomState, previousRoomState)
    );
    this.unsubscribeCharacters = useNetStore.subscribe(
      (s) => s.characterSelections,
      (selections) => {
        this.characterSelections = selections;
        this.applyCharacterStyles();
      }
    );
    this.unsubscribePlayers = useNetStore.subscribe(
      (s) => s.players,
      (players) => {
        this.playerNames = new Map(
          players.map((player) => [player.id, player.name])
        );
        this.applyCharacterStyles();
        this.refreshPlayerLabels();
      }
    );
  }

  private onRoomStateChanged(
    roomState: NetRoomState,
    previousRoomState?: NetRoomState
  ): void {
    if (!this.netClient.enabled) {
      return;
    }
    if (roomState === previousRoomState) {
      return;
    }
    this.netRoomState = roomState;
    if (roomState === 'running') {
      this.hideLobbyUI();
      this.clock.resume();
    } else {
      this.showLobbyUI();
      this.clock.pause();
      this.remotePlayers.forEach((remote) => remote.sprite.setVisible(false));
      this.remotePlayers.forEach((remote) => remote.label.setVisible(false));
    }
  }

  private applyCharacterStyles(): void {
    const toHex = (value: number): string =>
      `#${value.toString(16).padStart(6, '0')}`;
    if (this.playerSprite && this.playerLabel) {
      const localOption = getCharacterOption(
        this.localPlayerId
          ? this.characterSelections[this.localPlayerId]
          : undefined
      );
      this.playerSprite.setTint(localOption.tint);
      this.playerLabel.setColor(toHex(localOption.tint));
    }
    for (const [id, remote] of this.remotePlayers) {
      if (!remote) {
        continue;
      }
      const option = getCharacterOption(this.characterSelections[id]);
      remote.sprite.setTint(option.tint);
      remote.label.setColor(toHex(option.tint));
    }
  }

  private refreshPlayerLabels(): void {
    if (this.playerLabel) {
      const name = this.localPlayerId
        ? (this.playerNames.get(this.localPlayerId) ?? 'You')
        : 'You';
      this.playerLabel.setText(name);
    }
    for (const [id, remote] of this.remotePlayers) {
      if (!remote) {
        continue;
      }
      const name = this.playerNames.get(id) ?? 'Player';
      remote.label.setText(name);
    }
  }

  private showLobbyUI(): void {
    if (!this.netClient.enabled || this.lobbyVisible || this.leavingRoom) {
      return;
    }
    const ui = getUIManager();
    ui.showLobby({
      onReadyToggle: this.handleReadyToggle,
      onStartMatch: this.handleStartMatch,
      onLeaveRoom: this.handleLeaveLobby,
      onSelectCharacter: this.handleCharacterSelect,
    });
    this.lobbyVisible = true;
  }

  private hideLobbyUI(): void {
    if (!this.lobbyVisible) {
      return;
    }
    getUIManager().hide();
    this.lobbyVisible = false;
  }

  private handleNetWelcome(welcome: S2CWelcome): void {
    this.localPlayerId = welcome.playerId;
    if (welcome.seed) {
      this.world.reset(welcome.seed);
    }
    if (this.netSession) {
      this.netSession = {
        ...this.netSession,
        roomId: welcome.roomId ?? this.netSession.roomId,
      };
    }
    this.handleNetLatency(this.netLatencyMs);
  }

  private handleNetStart(_start: S2CStart): void {
    if (!this.netClient.enabled) {
      return;
    }
    this.netRoomState = 'running';
    this.hideLobbyUI();
    this.clock.resume();
  }

  private handleNetStartCountdown(_countdown: S2CStartCountdown): void {
    if (!this.netClient.enabled) {
      return;
    }
    this.netRoomState = 'starting';
    this.showLobbyUI();
    this.clock.pause();
  }

  private handleNetSnapshot(snapshot: S2CSnapshot): void {
    if (this.netClient.enabled && this.netRoomState !== 'running') {
      return;
    }
    const now = this.time.now;
    for (const netPlayer of snapshot.players) {
      if (!netPlayer.id) continue;
      if (netPlayer.id === this.localPlayerId) {
        continue;
      }
      const state = this.getOrCreateRemotePlayer(netPlayer.id);
      if (typeof netPlayer.x === 'number') {
        state.x = netPlayer.x;
      }
      if (typeof netPlayer.y === 'number') {
        state.y = netPlayer.y;
      }
      if (typeof netPlayer.vx === 'number') {
        state.vx = netPlayer.vx;
      }
      if (typeof netPlayer.vy === 'number') {
        state.vy = netPlayer.vy;
      }
      if (typeof netPlayer.alive === 'boolean') {
        state.alive = netPlayer.alive;
      }
      state.lastSeen = now;
      state.sprite.setPosition(Math.round(state.x), Math.round(-state.y));
      state.sprite.setVisible(state.alive);
      state.sprite.setAlpha(state.alive ? 0.85 : 0.3);
    }

    this.applyNetEvents(snapshot.events);
  }

  private handleNetPresence(presence: S2CPlayerPresence): void {
    if (presence.id === this.localPlayerId) {
      return;
    }
    const state = this.remotePlayers.get(presence.id);
    if (!state) {
      if (presence.state === 'left') {
        return;
      }
      return;
    }
    switch (presence.state) {
      case 'active':
        state.alive = true;
        state.sprite.setAlpha(0.85);
        state.sprite.setVisible(true);
        state.label.setAlpha(0.85);
        state.label.setVisible(true);
        break;
      case 'disconnected':
        state.sprite.setAlpha(0.4);
        state.label.setAlpha(0.4);
        break;
      case 'left':
        state.sprite.destroy();
        state.label.destroy();
        this.remotePlayers.delete(presence.id);
        break;
    }
  }

  private handleNetLatency(latency: number): void {
    this.netLatencyMs = latency;
    if (!this.netClient.enabled) {
      return;
    }
    const rounded = Math.round(latency);
    const status = Number.isFinite(rounded)
      ? `RTT ${Math.max(rounded, 0)} ms`
      : 'Connected';
    this.hud.setNetStatus(status);
  }

  private handleNetError(error: S2CError | Error): void {
    if (!this.netClient.enabled) {
      return;
    }
    const message =
      'code' in error
        ? `${error.code}${error.message ? `: ${error.message}` : ''}`
        : error.message;
    this.hud.setNetStatus(`Error: ${message}`);
  }

  private handleNetDisconnect(): void {
    if (!this.netClient.enabled) {
      return;
    }
    this.netLatencyMs = Number.NaN;
    this.netRoomState = 'finished';
    this.showLobbyUI();
    this.clock.pause();
    this.hud.setNetStatus('Disconnected');
  }

  private handleNetFinish(finish: S2CFinish): void {
    if (!this.netClient.enabled) {
      return;
    }
    this.netLatencyMs = Number.NaN;
    this.netRoomState = 'finished';
    this.showLobbyUI();
    this.clock.pause();
    this.hud.setNetStatus(`Match ended: ${finish.reason}`);
  }

  private async sendLeaveRequest(): Promise<void> {
    if (!this.netSession?.apiBaseUrl || !this.netSession.roomId) {
      return;
    }
    try {
      await leaveRoom(this.netSession.roomId, {
        baseUrl: this.netSession.apiBaseUrl,
      });
    } catch (error) {
      if (NET_CFG.debug) {
        console.warn('[GameScene] Failed to notify server about leave', error);
      }
    }
  }

  private applyNetEvents(events?: NetEvent[]): void {
    if (!events?.length) {
      return;
    }
    for (const event of events) {
      if (event.kind === 'spring') {
        this.pendingEvents.push(SimEventType.Spring);
      } else if (event.kind === 'break') {
        this.pendingEvents.push(SimEventType.PlatformBreak);
      }
    }
  }

  private getOrCreateRemotePlayer(id: string): RemotePlayerState {
    let state = this.remotePlayers.get(id);
    if (!state) {
      const sprite = this.add
        .image(0, 0, TextureKeys.Player)
        .setOrigin(0.5, 1)
        .setDepth(9)
        .setAlpha(0.85);
      const label = this.add
        .text(0, 0, this.playerNames.get(id) ?? 'Player', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1.8)
        .setDepth(9)
        .setShadow(0, 2, 'rgba(0,0,0,0.6)', 2)
        .setAlpha(0.85);
      state = {
        sprite,
        label,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        alive: true,
        lastSeen: 0,
      };
      this.remotePlayers.set(id, state);
      this.applyCharacterStyles();
      this.refreshPlayerLabels();
    }
    return state;
  }

  private updateRemotePlayerVisibility(): void {
    if (this.remotePlayers.size === 0) {
      return;
    }
    const now = this.time.now;
    const staleMs = 5000;
    for (const [id, remote] of this.remotePlayers) {
      if (id === this.localPlayerId) {
        continue;
      }
      if (now - remote.lastSeen > staleMs) {
        remote.sprite.setVisible(false);
        remote.label.setVisible(false);
      }
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
