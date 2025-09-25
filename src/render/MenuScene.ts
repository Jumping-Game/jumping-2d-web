import { Scene } from 'phaser';
import { TextureKeys } from './Assets';
import { SceneKeys } from './SceneKeys';
import { getUIManager } from '../ui';
import { loadHighScore } from './Storage';
import { NET_CFG } from '../net/config';
import { createRoom, joinRoom } from '../net/matchmaking';
import type { MatchSessionConfig } from '../net/types';

export class MenuScene extends Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    this.add.image(0, 0, TextureKeys.BgFar).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgMid).setOrigin(0);
    this.add.image(0, 0, TextureKeys.BgNear).setOrigin(0);

    const ui = getUIManager();
    const highScore = loadHighScore();

    const startGame = (seed: string, netSession?: MatchSessionConfig) => {
      ui.hide();
      this.scene.start(SceneKeys.Game, { seed, netSession });
    };

    const handleSoloStart = (playerName: string) => {
      NET_CFG.playerName = playerName;
      startGame(Date.now().toString());
    };

    const handleCreateRoom = async (playerName: string) => {
      NET_CFG.playerName = playerName;
      const response = await createRoom({ name: playerName });
      const seed = response.seed ?? Date.now().toString();
      const session: MatchSessionConfig = {
        wsUrl: response.wsUrl,
        wsToken: response.wsToken,
        roomId: response.roomId,
        playerName,
        apiBaseUrl: NET_CFG.apiBaseUrl,
      };
      startGame(seed, session);
    };

    const handleJoinRoom = async (playerName: string, roomId: string) => {
      NET_CFG.playerName = playerName;
      const response = await joinRoom(roomId, { name: playerName });
      const seed = response.seed ?? Date.now().toString();
      const session: MatchSessionConfig = {
        wsUrl: response.wsUrl,
        wsToken: response.wsToken,
        roomId: response.roomId,
        playerName,
        apiBaseUrl: NET_CFG.apiBaseUrl,
      };
      startGame(seed, session);
    };

    ui.showMenu({
      onSoloStart: handleSoloStart,
      onCreateRoom: NET_CFG.apiBaseUrl ? handleCreateRoom : undefined,
      onJoinRoom: NET_CFG.apiBaseUrl ? handleJoinRoom : undefined,
      highScore,
      defaultName: NET_CFG.playerName,
      matchmakingAvailable: Boolean(NET_CFG.apiBaseUrl),
    });
  }
}
