import { describe, it, expect } from 'vitest';
import { World } from '../sim/World';
import { hashWorldSnapshot } from '../sim/Determinism';

describe('World Hash', () => {
  it('should be deterministic for the same inputs', () => {
    const world1 = new World('test-seed');
    const world2 = new World('test-seed');

    for (let i = 0; i < 1000; i++) {
      world1.update(1 / 60, 0);
      world2.update(1 / 60, 0);
    }

    const hash1 = hashWorldSnapshot(world1);
    const hash2 = hashWorldSnapshot(world2);

    expect(hash1).toEqual(hash2);
  });

  it('should be different for different inputs', () => {
    const world1 = new World('test-seed');
    const world2 = new World('test-seed');

    for (let i = 0; i < 1000; i++) {
      world1.update(1 / 60, 0);
      world2.update(1 / 60, 0.1); // Different input
    }

    const hash1 = hashWorldSnapshot(world1);
    const hash2 = hashWorldSnapshot(world2);

    expect(hash1).not.toEqual(hash2);
  });
});