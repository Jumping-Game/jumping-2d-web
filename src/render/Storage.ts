const HIGHSCORE_KEY = 'skyhopper_highscore';

export function loadHighScore(): number {
  const raw = localStorage.getItem(HIGHSCORE_KEY);
  return raw ? Number(raw) : 0;
}

export function saveHighScore(score: number): void {
  const current = loadHighScore();
  if (score > current) {
    localStorage.setItem(HIGHSCORE_KEY, String(score));
  }
}
