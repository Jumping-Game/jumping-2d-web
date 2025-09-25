import { CFG } from '../config/GameConfig';
import { Player } from './Player';
import { Platform, PlatformType } from './Platform';

function overlapsX(player: Player, platform: Platform): boolean {
  const half = player.getHalfWidth();
  const width = CFG.world.worldWidth;
  const playerLeft = player.position.x - half;
  const playerRight = player.position.x + half;
  const platformLeft = platform.position.x;
  const platformRight = platform.position.x + platform.width;

  if (playerLeft < 0) {
    return (
      intervalsOverlap(
        playerLeft + width,
        playerRight + width,
        platformLeft,
        platformRight
      ) ||
      intervalsOverlap(playerLeft, playerRight, platformLeft, platformRight)
    );
  }

  if (playerRight > width) {
    return (
      intervalsOverlap(
        playerLeft - width,
        playerRight - width,
        platformLeft,
        platformRight
      ) ||
      intervalsOverlap(playerLeft, playerRight, platformLeft, platformRight)
    );
  }

  return intervalsOverlap(playerLeft, playerRight, platformLeft, platformRight);
}

function intervalsOverlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number
): boolean {
  return Math.max(a1, b1) <= Math.min(a2, b2);
}

export function testLanding(player: Player, platform: Platform): boolean {
  if (player.velocity.y > 0 || platform.isPassable()) {
    return false;
  }

  const top = platform.position.y + platform.height;
  const feet = player.getFeetY();
  const prevFeet = player.getPreviousFeetY();
  const wasAbove = prevFeet - CFG.player.footOffset >= top;
  const isBelow = feet <= top;
  if (!wasAbove || !isBelow) {
    return false;
  }

  if (!overlapsX(player, platform)) {
    return false;
  }

  return true;
}

export function resolveLanding(player: Player, platform: Platform): boolean {
  if (!testLanding(player, platform)) {
    return false;
  }

  const top = platform.position.y + platform.height;
  player.position.y = top;
  player.applyBounce();

  if (
    platform.type === PlatformType.Breakable ||
    platform.type === PlatformType.OneShot
  ) {
    platform.broken = true;
  }

  return true;
}
