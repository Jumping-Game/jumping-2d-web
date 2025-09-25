import { Player } from './Player';
import { Platform } from './Platform';
import { CFG } from '../config/GameConfig';

export function checkCollision(player: Player, platform: Platform): boolean {
  // Simple AABB check
  return (
    player.position.x < platform.position.x + platform.width &&
    player.position.x + 48 > platform.position.x && // Player width approx 48
    player.position.y < platform.position.y + platform.height &&
    player.position.y + 64 > platform.position.y // Player height approx 64
  );
}

export function resolveCollision(player: Player, platform: Platform): boolean {
  // One-way collision: only land on top of platforms
  if (player.velocity.y > 0) {
    return false;
  }

  const playerFeet = player.position.y;
  const platformTop = platform.position.y + platform.height;

  // Check if player's feet are just above the platform and were below it last frame
  const previousPlayerFeet = playerFeet - player.velocity.y * (1 / CFG.tps);
  if (playerFeet <= platformTop && previousPlayerFeet > platformTop) {
    if (checkCollision(player, platform)) {
      player.position.y = platformTop;
      player.jump();
      return true;
    }
  }

  return false;
}