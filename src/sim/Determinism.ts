import { World } from './World';

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export function hashWorld(world: World): string {
  let hash = FNV_OFFSET;
  const mix = (value: number): void => {
    const normalized = Math.floor(value * 1000);
    hash ^= BigInt(normalized);
    hash = (hash * FNV_PRIME) & ((1n << 64n) - 1n);
  };

  mix(world.tick);
  mix(world.score);
  mix(world.player.position.x);
  mix(world.player.position.y);
  mix(world.player.velocity.x);
  mix(world.player.velocity.y);
  mix(world.player.state);

  for (const platform of world.platforms) {
    mix(platform.id);
    mix(platform.position.x);
    mix(platform.position.y);
    mix(platform.type);
    mix(platform.broken ? 1 : 0);
  }

  for (const powerup of world.powerups) {
    mix(powerup.id);
    mix(powerup.position.x);
    mix(powerup.position.y);
    mix(powerup.type);
    mix(powerup.active ? 1 : 0);
  }

  return `0x${hash.toString(16).padStart(16, '0')}`;
}
