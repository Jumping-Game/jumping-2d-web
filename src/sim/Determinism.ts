import { World } from './World';

/**
 * A simple hashing function for determinism checking.
 * This is not a cryptographic hash function.
 * @param str The string to hash.
 * @returns A 32-bit hash.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Creates a snapshot of the world state and returns a hash of it.
 * @param world The world to hash.
 * @returns A hash of the world state.
 */
export function hashWorldSnapshot(world: World): number {
  const parts: (string | number)[] = [];

  // Player state
  parts.push(world.player.position.x.toFixed(3));
  parts.push(world.player.position.y.toFixed(3));
  parts.push(world.player.velocity.x.toFixed(3));
  parts.push(world.player.velocity.y.toFixed(3));
  parts.push(world.player.state);

  // Platforms state
  for (const platform of world.platforms) {
    parts.push(platform.position.x.toFixed(3));
    parts.push(platform.position.y.toFixed(3));
    parts.push(platform.type);
    parts.push(platform.isBroken);
  }

  // Powerups state
  for (const powerup of world.powerups) {
    parts.push(powerup.position.x.toFixed(3));
    parts.push(powerup.position.y.toFixed(3));
    parts.push(powerup.type);
  }

  // World properties
  parts.push(world.tick);
  parts.push(world.currentHeight);

  return simpleHash(parts.join('|'));
}