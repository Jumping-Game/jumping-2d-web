import { createRoot, Root } from 'react-dom/client';
import { StrictMode } from 'react';
import { MainMenu } from './MainMenu';
import { PauseOverlay } from './PauseOverlay';

type Screen = 'none' | 'menu' | 'pause' | 'gameover';

interface MenuOptions {
  onSoloStart: (playerName: string) => void;
  onCreateRoom?: (playerName: string) => Promise<void>;
  onJoinRoom?: (playerName: string, roomId: string) => Promise<void>;
  highScore: number;
  defaultName: string;
  matchmakingAvailable: boolean;
}

interface Options extends MenuOptions {
  onResume: () => void;
  onRestart: () => void;
  lastScore: number;
}

export class UIManager {
  private readonly root: Root;
  private screen: Screen = 'menu';
  private opts: Options;

  constructor(container: HTMLElement) {
    this.root = createRoot(container);
    this.opts = {
      onSoloStart: () => {},
      onCreateRoom: undefined,
      onJoinRoom: undefined,
      onResume: () => {},
      onRestart: () => {},
      highScore: 0,
      lastScore: 0,
      defaultName: 'Player',
      matchmakingAvailable: false,
    };
    this.render();
  }

  showMenu(options: MenuOptions) {
    this.screen = 'menu';
    this.opts = { ...this.opts, ...options };
    this.render();
  }

  showPause(onResume: () => void) {
    this.screen = 'pause';
    this.opts = { ...this.opts, onResume };
    this.render();
  }

  showGameOver(onRestart: () => void, score: number, highScore: number) {
    this.screen = 'gameover';
    this.opts = { ...this.opts, onRestart, lastScore: score, highScore };
    this.render();
  }

  hide() {
    this.screen = 'none';
    this.render();
  }

  private render() {
    const {
      onSoloStart,
      onCreateRoom,
      onJoinRoom,
      onResume,
      onRestart,
      highScore,
      lastScore,
      defaultName,
      matchmakingAvailable,
    } = this.opts;
    const screen = this.screen;
    this.root.render(
      <StrictMode>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: screen === 'none' ? 'none' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          {screen === 'menu' && (
            <MainMenu
              highScore={highScore}
              defaultName={defaultName}
              matchmakingAvailable={matchmakingAvailable}
              onSoloStart={onSoloStart}
              onCreateRoom={onCreateRoom}
              onJoinRoom={onJoinRoom}
            />
          )}
          {screen === 'pause' && <PauseOverlay onResume={onResume} />}
          {screen === 'gameover' && (
            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                padding: '32px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                minWidth: '280px',
              }}
            >
              <h2 style={{ margin: 0 }}>Game Over</h2>
              <div>Score: {lastScore}</div>
              <div>High Score: {highScore}</div>
              <button
                type="button"
                onClick={onRestart}
                style={{
                  fontSize: '20px',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#4caf50',
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </StrictMode>
    );
  }
}
