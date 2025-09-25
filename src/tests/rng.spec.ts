import { describe, it, expect } from 'vitest';
import { SplitMix64, seedFromString } from '../core/RNG';

describe('RNG', () => {
  it('should be deterministic', () => {
    const seed = 'test-seed';
    const rng1 = new SplitMix64(seedFromString(seed));
    const rng2 = new SplitMix64(seedFromString(seed));

    const sequence1 = Array.from({ length: 10 }, () => rng1.random());
    const sequence2 = Array.from({ length: 10 }, () => rng2.random());

    expect(sequence1).toEqual(sequence2);
  });

  it('should generate numbers between 0 and 1', () => {
    const rng = new SplitMix64(seedFromString('another-seed'));
    for (let i = 0; i < 100; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});