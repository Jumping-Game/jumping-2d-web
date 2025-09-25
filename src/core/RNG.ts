const U64_MASK = (1n << 64n) - 1n;

export class SplitMix64 {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed & U64_MASK;
  }

  next(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & U64_MASK;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & U64_MASK;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & U64_MASK;
    z ^= z >> 31n;
    return z & U64_MASK;
  }
}

export class Xoroshiro128StarStar {
  private state0: bigint;
  private state1: bigint;

  constructor(seed: bigint) {
    const seeder = new SplitMix64(seed);
    this.state0 = seeder.next();
    this.state1 = seeder.next();
  }

  next(): bigint {
    const s0 = this.state0;
    let s1 = this.state1;
    const result = rotl(s0 * 5n, 7n) * 9n;

    s1 ^= s0;
    this.state0 = rotl(s0, 24n) ^ s1 ^ (s1 << 16n);
    this.state1 = rotl(s1, 37n);

    return result & U64_MASK;
  }

  nextFloat(): number {
    const value = this.next();
    return Number(value >> 11n) / 9007199254740992; // 2^53
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.nextFloat() * maxExclusive);
  }
}

export function seedFromString(seed: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < seed.length; i++) {
    h ^= BigInt(seed.charCodeAt(i));
    h = (h * 0x100000001b3n) & U64_MASK;
  }
  return h & U64_MASK;
}

function rotl(value: bigint, shift: bigint): bigint {
  return ((value << shift) & U64_MASK) | (value >> (64n - shift));
}
