import { describe, it, expect } from 'vitest';
import { Xoroshiro128StarStar, seedFromString } from '../core/RNG';

describe('RNG', () => {
  it('generates deterministic sequences', () => {
    const seed = seedFromString('rng-seed');
    const rngA = new Xoroshiro128StarStar(seed);
    const rngB = new Xoroshiro128StarStar(seed);

    const seqA = Array.from({ length: 6 }, () => rngA.next().toString(16));
    const seqB = Array.from({ length: 6 }, () => rngB.next().toString(16));

    expect(seqA).toEqual(seqB);
  });

  it('emits floats in the [0, 1) range', () => {
    const rng = new Xoroshiro128StarStar(seedFromString('float-seed'));
    for (let i = 0; i < 128; i += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
