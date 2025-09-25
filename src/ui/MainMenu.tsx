import React, { useEffect, useMemo, useState } from 'react';

interface MainMenuProps {
  highScore: number;
  defaultName: string;
  matchmakingAvailable: boolean;
  onSoloStart: (playerName: string) => void;
  onCreateRoom?: (playerName: string) => Promise<void>;
  onJoinRoom?: (playerName: string, roomId: string) => Promise<void>;
}

const buttonStyle: React.CSSProperties = {
  fontSize: '18px',
  padding: '12px 24px',
  borderRadius: '999px',
  border: 'none',
  background: '#4caf50',
  color: '#000',
  cursor: 'pointer',
};

export const MainMenu: React.FC<MainMenuProps> = ({
  highScore,
  defaultName,
  matchmakingAvailable,
  onSoloStart,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [playerName, setPlayerName] = useState(defaultName);
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setPlayerName(defaultName);
  }, [defaultName]);

  const normalizedPlayerName = useMemo(() => {
    const trimmed = playerName.trim();
    return trimmed.length > 0 ? trimmed : defaultName;
  }, [playerName, defaultName]);

  const handleSolo = (): void => {
    if (busy) return;
    setStatus('');
    onSoloStart(normalizedPlayerName);
  };

  const handleCreateRoom = async (): Promise<void> => {
    if (!matchmakingAvailable || !onCreateRoom) {
      setStatus('Matchmaking unavailable');
      return;
    }
    setBusy(true);
    setStatus('Creating room…');
    try {
      await onCreateRoom(normalizedPlayerName);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRoom = async (): Promise<void> => {
    if (!matchmakingAvailable || !onJoinRoom) {
      setStatus('Matchmaking unavailable');
      return;
    }
    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      setStatus('Enter a room ID to join');
      return;
    }
    setBusy(true);
    setStatus(`Joining ${trimmedRoomId}…`);
    try {
      await onJoinRoom(normalizedPlayerName, trimmedRoomId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '32px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '320px',
        maxWidth: '420px',
      }}
    >
      <h1 style={{ margin: 0 }}>Sky Hopper</h1>
      <p style={{ margin: 0 }}>Reach as high as you can!</p>
      <div>High Score: {highScore}</div>

      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left',
        }}
      >
        <span>Player Name</span>
        <input
          type="text"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          maxLength={16}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(0,0,0,0.2)',
            color: '#fff',
          }}
          disabled={busy}
        />
      </label>

      <button
        type="button"
        onClick={handleSolo}
        style={buttonStyle}
        disabled={busy}
      >
        {matchmakingAvailable ? 'Solo Run (offline)' : 'Start Game'}
      </button>

      {matchmakingAvailable ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px' }}>Multiplayer</h2>
          <button
            type="button"
            onClick={handleCreateRoom}
            style={buttonStyle}
            disabled={busy}
          >
            Create Match
          </button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <span>Join Room</span>
            <input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
              }}
              disabled={busy}
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              style={{ ...buttonStyle, background: '#03a9f4' }}
              disabled={busy}
            >
              Join Match
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
          Multiplayer matchmaking is not configured.
        </p>
      )}

      {status && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
};
