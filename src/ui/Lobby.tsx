import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNetStore } from '../state/store';

interface LobbyProps {
  onToggleReady?: (ready: boolean) => void;
  onStart?: () => void;
  onLeave?: () => void;
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.7)',
  padding: '32px',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minWidth: '360px',
  maxWidth: '520px',
};

const buttonStyle: React.CSSProperties = {
  fontSize: '18px',
  padding: '12px 24px',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

const badgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const readyBadge = (ready: boolean): React.CSSProperties => ({
  ...badgeStyle,
  background: ready ? 'rgba(76, 175, 80, 0.25)' : 'rgba(244, 67, 54, 0.25)',
  color: ready ? '#8cf58f' : '#ff9d8d',
});

const roleBadge = (role: 'master' | 'member'): React.CSSProperties => ({
  ...badgeStyle,
  background: role === 'master' ? 'rgba(33, 150, 243, 0.25)' : 'rgba(158, 158, 158, 0.25)',
  color: role === 'master' ? '#90caf9' : '#e0e0e0',
});

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.65)',
  fontSize: '96px',
  fontWeight: 700,
  letterSpacing: '0.1em',
};

export const Lobby: React.FC<LobbyProps> = ({
  onToggleReady,
  onStart,
  onLeave,
}) => {
  const state = useNetStore(
    useCallback(
      (s) => ({
        playerId: s.playerId,
        roomId: s.roomId,
        role: s.role,
        roomState: s.roomState,
        players: s.players,
        countdown: s.countdown,
        lobbyMaxPlayers: s.lobbyMaxPlayers,
      }),
      []
    )
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state.countdown) {
      return undefined;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 150);
    return () => window.clearInterval(timer);
  }, [state.countdown?.startAtMs]);

  const secondsLeft = useMemo(() => {
    if (!state.countdown) {
      return null;
    }
    const delta = state.countdown.startAtMs - now;
    return Math.max(0, Math.ceil(delta / 1000));
  }, [now, state.countdown]);

  const me = useMemo(
    () => state.players.find((player) => player.id === state.playerId),
    [state.players, state.playerId]
  );

  const membersReady = useMemo(
    () =>
      state.players
        .filter((player) => player.role !== 'master')
        .every((player) => player.ready),
    [state.players]
  );

  const readyDisabled =
    state.roomState !== 'lobby' || Boolean(state.countdown) || !onToggleReady;
  const startDisabled =
    state.role !== 'master' ||
    !onStart ||
    state.roomState !== 'lobby' ||
    Boolean(state.countdown) ||
    !membersReady;

  const handleReadyClick = useCallback(() => {
    if (!me || readyDisabled) {
      return;
    }
    onToggleReady?.(!me.ready);
  }, [me, onToggleReady, readyDisabled]);

  const handleStartClick = useCallback(() => {
    if (startDisabled) {
      return;
    }
    onStart?.();
  }, [onStart, startDisabled]);

  const roomCaption = useMemo(() => {
    const playerCount = state.players.length;
    const capacity = state.lobbyMaxPlayers ?? '—';
    return `${playerCount}/${capacity}`;
  }, [state.players.length, state.lobbyMaxPlayers]);

  const statusText = useMemo(() => {
    if (state.countdown) {
      return 'Starting…';
    }
    if (state.roomState === 'starting') {
      return 'Preparing match';
    }
    if (state.roomState === 'running') {
      return 'Match in progress';
    }
    if (membersReady) {
      return 'All members ready';
    }
    return 'Waiting for players to ready up';
  }, [state.countdown, state.roomState, membersReady]);

  const readyButtonLabel = me?.ready ? 'Unready' : 'Ready Up';

  return (
    <div style={{ position: 'relative' }}>
      <div style={panelStyle} data-testid="lobby-root">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Room Lobby</h2>
            <div style={{ opacity: 0.75, fontSize: '14px' }}>
              Room ID: <span style={{ fontFamily: 'monospace' }}>{state.roomId ?? '—'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', opacity: 0.75 }}>Role</div>
            <div style={{ fontWeight: 600 }}>{state.role.toUpperCase()}</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Players</strong>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Slots {roomCaption}</span>
          </div>
          {state.players.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: player.id === state.playerId ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                padding: '10px 12px',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>
                  {player.name}
                  {player.id === state.playerId ? ' (You)' : ''}
                </span>
                <span style={roleBadge(player.role)}>{player.role}</span>
              </div>
              <span style={readyBadge(player.ready)}>{player.ready ? 'Ready' : 'Not Ready'}</span>
            </div>
          ))}
          {state.players.length === 0 && (
            <div style={{ fontSize: '14px', opacity: 0.6 }}>Waiting for players…</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>{statusText}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {state.role === 'member' && onToggleReady && (
              <button
                type="button"
                onClick={handleReadyClick}
                disabled={readyDisabled}
                style={{
                  ...buttonStyle,
                  background: me?.ready ? '#ffc107' : '#4caf50',
                  color: '#000',
                  opacity: readyDisabled ? 0.5 : 1,
                  cursor: readyDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {readyButtonLabel}
              </button>
            )}
            {state.role === 'master' && onStart && (
              <button
                type="button"
                onClick={handleStartClick}
                disabled={startDisabled}
                style={{
                  ...buttonStyle,
                  background: '#00bcd4',
                  color: '#000',
                  opacity: startDisabled ? 0.5 : 1,
                  cursor: startDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                Start Match
              </button>
            )}
            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              >
                Leave Lobby
              </button>
            )}
          </div>
        </div>
      </div>
      {state.countdown && secondsLeft !== null && (
        <div style={overlayStyle} data-testid="lobby-countdown">
          <span>{secondsLeft}</span>
        </div>
      )}
    </div>
  );
};
