import React from 'react';

interface MainMenuProps {
  onStart: () => void;
  highScore: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, highScore }) => {
  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '32px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '280px',
      }}
    >
      <h1 style={{ margin: 0 }}>Sky Hopper</h1>
      <p style={{ margin: 0 }}>Reach as high as you can!</p>
      <div>High Score: {highScore}</div>
      <button
        type="button"
        onClick={onStart}
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
        Start Game
      </button>
    </div>
  );
};
