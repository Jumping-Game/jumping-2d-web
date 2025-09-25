export const CFG = {
  tps: 60,
  camera: {
    followLerp: 0.15,
    verticalOffset: 240,
    cullMargin: 720,
    spawnAhead: 1800,
  },
  world: {
    worldWidth: 720,
    platformWidth: 120,
    platformHeight: 18,
    gravity: -2200,
    jumpVy: 1200,
    springVy: 1800,
    jetpackVy: 2200,
    maxVx: 900,
    accel: 2400,
    friction: 0.92,
  },
  difficulty: {
    gapMinStart: 120,
    gapMinEnd: 180,
    gapMaxStart: 240,
    gapMaxEnd: 320,
    springChanceStart: 0.1,
    springChanceEnd: 0.03,
    jetpackChance: 0.005,
  },
  player: {
    width: 64,
    height: 72,
    footOffset: 6,
    bounceDamp: 1.0,
  },
  powerups: {
    jetpackDurationTicks: 120,
  },
  rng: {
    snapshotInterval: 1000,
  },
  input: {
    keyboardDeadzone: 0.1,
    touchDebounceMs: 120,
  },
  audio: {
    masterVolume: 0.65,
  },
} as const;

export type GameConfig = typeof CFG;
