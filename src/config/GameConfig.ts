export const CFG = {
  tps: 60,
  world: {
    worldWidth: 720,
    platformWidth: 120,
    platformHeight: 18,
    gravity: -2200,
    jumpVy: 1200,
    springVy: 1800,
    maxVx: 900,
    accel: 2400,
  },
  difficulty: {
    gapMinStart: 120,
    gapMinEnd: 180,
    gapMaxStart: 240,
    gapMaxEnd: 320,
    springChanceStart: 0.1,
    springChanceEnd: 0.03,
  },
} as const;