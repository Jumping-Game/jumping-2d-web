/**
 * Clamps a value between a minimum and maximum value.
 * @param value The value to clamp.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linearly interpolates between two values.
 * @param a The start value.
 * @param b The end value.
 * @param t The interpolation factor.
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Returns the sign of a number.
 * @param value The number to get the sign of.
 * @returns -1 if the number is negative, 1 if the number is positive, and 0 if the number is zero.
 */
export function sign(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/**
 * Checks if two numbers are approximately equal.
 * @param a The first number.
 * @param b The second number.
 * @param epsilon The tolerance.
 * @returns True if the numbers are approximately equal, false otherwise.
 */
export function approxEq(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}