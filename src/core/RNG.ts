// 64-bit unsigned integer represented as two 32-bit integers
type u64 = [number, number];

/**
 * A SplitMix64 random number generator.
 * This is a fast, high-quality generator, but it is not cryptographically secure.
 * @see https://xorshift.di.unimi.it/splitmix64.c
 */
export class SplitMix64 {
  private state: u64;

  constructor(seed: u64) {
    this.state = [...seed];
  }

  /**
   * Returns the next 64-bit random number as a u64.
   * @returns The next random number.
   */
  next(): u64 {
    this.state = this.add64(this.state, [0, 0x9e3779b9]);
    let z: u64 = [...this.state];
    z = this.xorShiftRight(z, 30);
    z = this.mul64(z, [0xbf58476d, 0x1ce4e5b9]);
    z = this.xorShiftRight(z, 27);
    z = this.mul64(z, [0x94d049bb, 0x133111eb]);
    z = this.xorShiftRight(z, 31);
    return z;
  }

  /**
   * Returns a random float between 0 (inclusive) and 1 (exclusive).
   * This is the equivalent of Math.random().
   * @returns A random float.
   */
  random(): number {
    const [hi, lo] = this.next();
    // Use the 53 most significant bits to generate a float
    return (hi * 0x100000 + (lo >>> 12)) * (1 / 0x40000000000000);
  }

  private add64([hiA, loA]: u64, [hiB, loB]: u64): u64 {
    const newLo = (loA + loB) | 0;
    const newHi = (hiA + hiB + (newLo < loA ? 1 : 0)) | 0;
    return [newHi, newLo];
  }

  private mul64([hiA, loA]: u64, [hiB, loB]: u64): u64 {
    const a = hiA >>> 16, b = hiA & 0xffff;
    const c = loA >>> 16, d = loA & 0xffff;
    const e = hiB >>> 16, f = hiB & 0xffff;
    const g = loB >>> 16, h = loB & 0xffff;

    let lo = d * h;
    let mid1 = c * h;
    let mid2 = d * g;
    let hi = b * h;
    let mid3 = a * h;
    let mid4 = d * f;
    let mid5 = c * g;
    let mid6 = b * g;
    let mid7 = a * g;
    let mid8 = d * e;

    let cross = (lo >>> 16) + (mid1 & 0xffff) + (mid2 & 0xffff);
    let upper = (cross >>> 16) + (hi & 0xffff) + (mid3 & 0xffff) + (mid4 & 0xffff) + (mid5 & 0xffff);
    let hi32 = (upper >>> 16) + (mid6 & 0xffff) + (mid7 & 0xffff) + (mid8 & 0xffff);

    lo = (lo & 0xffff) | (cross << 16);
    hi = (upper & 0xffff) | (hi32 << 16);

    return [hi, lo];
  }

  private xorShiftRight([hi, lo]: u64, shift: number): u64 {
    if (shift === 0) return [hi, lo];
    if (shift >= 32) {
      return [0, hi >>> (shift - 32)];
    }
    const newHi = hi >>> shift;
    const newLo = (lo >>> shift) | (hi << (32 - shift));
    return [newHi, newLo];
  }
}

/**
 * Creates a 64-bit seed from a string.
 * This is a simple hash function that is not cryptographically secure.
 * @param str The string to seed from.
 * @returns A 64-bit seed.
 */
export function seedFromString(str: string): u64 {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1, h2];
}