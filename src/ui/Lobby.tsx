import React, { useCallback, useEffect, useMemo, useState } from 'react';
import playerSvgUrl from '../assets/images/player.svg';
import {
  CHARACTER_OPTIONS,
  CharacterId,
  getCharacterOption,
  tintToHex,
} from '../config/characters';
import { useNetStore } from '../state/store';

interface LobbyProps {
  onToggleReady?: (ready: boolean) => void;
  onStart?: () => void;
  onLeave?: () => void;
}

interface PlayerSummary {
  id: string;
  name: string;
  role: 'master' | 'member';
  ready: boolean;
  isSelf: boolean;
  characterId: CharacterId;
}

const containerStyle: React.CSSProperties = {
  background: 'rgba(12, 17, 32, 0.85)',
  padding: '32px',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  minWidth: '760px',
  maxWidth: '960px',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
};

const stageStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '16px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minWidth: '340px',
};

const sidebarStyle: React.CSSProperties = {
  width: '280px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const stageGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '16px',
};

const statusBadgeBase: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const readyBadgeStyle = (ready: boolean): React.CSSProperties => ({
  ...statusBadgeBase,
  color: ready ? '#0b1f13' : '#ffb4a2',
  background: ready ? 'rgba(105, 240, 174, 0.85)' : 'rgba(255, 138, 128, 0.35)',
});

const roleBadgeStyle = (role: 'master' | 'member'): React.CSSProperties => ({
  ...statusBadgeBase,
  color: role === 'master' ? '#0d1b2a' : '#f5f5f5',
  background:
    role === 'master' ? 'rgba(130, 177, 255, 0.9)' : 'rgba(207, 216, 220, 0.3)',
});

const buttonStyle: React.CSSProperties = {
  fontSize: '18px',
  padding: '12px 20px',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

const characterOptionButton = (
  active: boolean,
  disabled: boolean,
  accent: string,
  accentSecondary?: string
): React.CSSProperties => ({
  position: 'relative',
  width: '80px',
  height: '80px',
  borderRadius: '18px',
  background:
    accentSecondary && accentSecondary !== accent
      ? `linear-gradient(135deg, ${accent}, ${accentSecondary})`
      : accent,
  border: active
    ? '2px solid rgba(255, 255, 255, 0.8)'
    : '2px solid rgba(255, 255, 255, 0.15)',
  opacity: disabled && !active ? 0.4 : 1,
  cursor: disabled && !active ? 'not-allowed' : 'pointer',
  boxShadow: active ? '0 0 0 4px rgba(255, 255, 255, 0.18)' : 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 120ms ease',
});

const PlayerCard: React.FC<{ player: PlayerSummary }> = ({ player }) => {
  const option = getCharacterOption(player.characterId);
  const gradient = option.accentSecondary
    ? `linear-gradient(135deg, ${option.accent}, ${option.accentSecondary})`
    : option.accent;

  return (
    <div
      style={{
        background: 'rgba(8, 12, 24, 0.6)',
        borderRadius: '18px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        boxShadow: player.isSelf
          ? '0 0 0 2px rgba(130, 177, 255, 0.45)'
          : '0 0 0 1px rgba(255, 255, 255, 0.05)',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600 }}>
        {player.name}
        {player.isSelf ? ' (You)' : ''}
      </div>
      <div
        style={{
          width: '96px',
          height: '96px',
          background: gradient,
          WebkitMaskImage: `url(${playerSvgUrl})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${playerSvgUrl})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          filter: player.ready ? 'none' : 'grayscale(60%)',
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <span style={readyBadgeStyle(player.ready)}>{
          player.ready ? 'Ready' : 'Not Ready'
        }</span>
        <span style={roleBadgeStyle(player.role)}>{player.role}</span>
      </div>
    </div>
  );
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
        characterSelections: s.characterSelections,
      }),
      []
    )
  );

  const selectCharacter = useNetStore((s) => s.setCharacterSelection);

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

  const players = useMemo<PlayerSummary[]>(() => {
    const assignments = state.characterSelections;
    return state.players.map((player) => ({
      ...player,
      isSelf: player.id === state.playerId,
      characterId: assignments[player.id] ?? CHARACTER_OPTIONS[0]!.id,
    }));
  }, [state.characterSelections, state.players, state.playerId]);

  const me = useMemo(
    () => players.find((player) => player.id === state.playerId),
    [players, state.playerId]
  );

  const membersReady = useMemo(
    () =>
      players
        .filter((player) => player.role !== 'master')
        .every((player) => player.ready),
    [players]
  );

  const readyDisabled =
    state.roomState !== 'lobby' || Boolean(state.countdown) || !onToggleReady;
  const startDisabled =
    state.role !== 'master' ||
    !onStart ||
    state.roomState !== 'lobby' ||
    Boolean(state.countdown) ||
    !membersReady;

  const roomCaption = useMemo(() => {
    const playerCount = players.length;
    const capacity = state.lobbyMaxPlayers ?? '—';
    return `${playerCount}/${capacity}`;
  }, [players.length, state.lobbyMaxPlayers]);

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
  const myCharacterId = me?.characterId;
  const charactersInUse = useMemo(() => {
    const used = new Set<CharacterId>();
    players.forEach((player) => {
      used.add(player.characterId);
    });
    return used;
  }, [players]);

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

  const handleCharacterSelect = useCallback(
    (characterId: CharacterId) => {
      if (!state.playerId || !selectCharacter) {
        return;
      }
      if (characterId === myCharacterId) {
        return;
      }
      selectCharacter(state.playerId, characterId);
    },
    [myCharacterId, selectCharacter, state.playerId]
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={containerStyle} data-testid="lobby-root">
        <div style={headerStyle}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: '28px' }}>Waiting Room</h2>
            <div style={{ opacity: 0.75, fontSize: '14px' }}>
              Room ID: <span style={{ fontFamily: 'monospace' }}>{state.roomId ?? '—'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '14px', opacity: 0.75 }}>Role</div>
            <div style={{ fontWeight: 600 }}>{state.role.toUpperCase()}</div>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>Slots {roomCaption}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={stageStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>Players</div>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>{statusText}</div>
            </div>
            <div style={stageGridStyle}>
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
            {players.length === 0 && (
              <div style={{ fontSize: '14px', opacity: 0.6 }}>Waiting for players…</div>
            )}
          </div>

          <aside style={sidebarStyle}>
            <div
              style={{
                background: 'rgba(8, 12, 24, 0.6)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ fontWeight: 600 }}>Choose Your Character</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                {CHARACTER_OPTIONS.map((option) => {
                  const active = option.id === myCharacterId;
                  const takenByOther = charactersInUse.has(option.id) && !active;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleCharacterSelect(option.id)}
                      disabled={takenByOther || !state.playerId}
                      style={characterOptionButton(
                        active,
                        takenByOther || !state.playerId,
                        option.accent,
                        option.accentSecondary
                      )}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          WebkitMaskImage: `url(${playerSvgUrl})`,
                          WebkitMaskSize: '60%',
                          WebkitMaskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskImage: `url(${playerSvgUrl})`,
                          maskSize: '60%',
                          maskPosition: 'center',
                          maskRepeat: 'no-repeat',
                          background: 'rgba(0, 0, 0, 0.25)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-18px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '12px',
                          fontWeight: 600,
                          opacity: takenByOther && !active ? 0.4 : 0.9,
                        }}
                      >
                        {option.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {myCharacterId && (
                <div
                  style={{
                    fontSize: '13px',
                    opacity: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span>Currently selected:</span>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: tintToHex(
                          getCharacterOption(myCharacterId).tint
                        ),
                      }}
                    />
                    <strong>{getCharacterOption(myCharacterId).name}</strong>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                background: 'rgba(8, 12, 24, 0.6)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '14px', opacity: 0.8 }}>{statusText}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {state.role === 'member' && onToggleReady && (
                  <button
                    type="button"
                    onClick={handleReadyClick}
                    disabled={readyDisabled}
                    style={{
                      ...buttonStyle,
                      background: me?.ready ? '#ffd740' : '#69f0ae',
                      color: '#0b132b',
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
                      background: '#82b1ff',
                      color: '#0b132b',
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
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                    }}
                  >
                    Leave Lobby
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {state.countdown && secondsLeft !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            fontSize: '96px',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
          data-testid="lobby-countdown"
        >
          <span>{secondsLeft}</span>
        </div>
      )}
    </div>
  );
};
