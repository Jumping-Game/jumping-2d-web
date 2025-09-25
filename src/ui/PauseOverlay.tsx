import React from 'react';

interface PauseOverlayProps {
  onResume: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume }) => {
  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '32px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '260px',
      }}
    >
      <h2 style={{ margin: 0 }}>Paused</h2>
      <button
        type="button"
        onClick={onResume}
        style={{
          fontSize: '20px',
          padding: '12px 24px',
          borderRadius: '999px',
          border: 'none',
          background: '#ffca28',
          color: '#000',
          cursor: 'pointer',
        }}
      >
        Resume
      </button>
    </div>
  );
};
