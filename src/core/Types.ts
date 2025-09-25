export type Tick = number;
export type Seed = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerInput {
  tick: Tick;
  axisX: number; // [-1,1]
  jump: boolean;
}

export interface PlatformMovement {
  amplitude: number;
  periodTicks: number;
  phase: number;
}

export interface PlatformSnapshot {
  id: number;
  type: number;
  x: number;
  y: number;
  broken: boolean;
}

export interface PowerupSnapshot {
  id: number;
  type: number;
  x: number;
  y: number;
  active: boolean;
}

export interface WorldSnapshot {
  tick: Tick;
  score: number;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: number;
  };
  platforms: PlatformSnapshot[];
  powerups: PowerupSnapshot[];
}
