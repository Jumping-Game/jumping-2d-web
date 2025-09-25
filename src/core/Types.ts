/** A 2D vector. */
export interface Vec2 {
  x: number;
  y: number;
}

/** A rectangle defined by its top-left corner and dimensions. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Represents a discrete time step in the game simulation. */
export type Tick = number;

/** A seed for the random number generator, represented as a string. */
export type Seed = string;