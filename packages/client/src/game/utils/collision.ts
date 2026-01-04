import type { Position, Wall } from '../types';
import { PLAYER_SIZE } from '../types';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getPlayerBounds(position: Position): Bounds {
  return {
    x: position.x - PLAYER_SIZE / 2,
    y: position.y - PLAYER_SIZE / 2,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  };
}

export function checkCollision(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function checkWallCollision(position: Position, walls: Wall[]): boolean {
  const playerBounds = getPlayerBounds(position);

  for (const wall of walls) {
    if (checkCollision(playerBounds, wall)) {
      return true;
    }
  }

  return false;
}

export function applyMovementWithCollision(
  currentPosition: Position,
  newPosition: Position,
  walls: Wall[]
): Position {
  // Try the full movement first
  if (!checkWallCollision(newPosition, walls)) {
    return newPosition;
  }

  // Try moving only on X axis
  const xOnlyPosition = { x: newPosition.x, y: currentPosition.y };
  const canMoveX = !checkWallCollision(xOnlyPosition, walls);

  // Try moving only on Y axis
  const yOnlyPosition = { x: currentPosition.x, y: newPosition.y };
  const canMoveY = !checkWallCollision(yOnlyPosition, walls);

  // Apply valid movements (allows sliding along walls)
  return {
    x: canMoveX ? newPosition.x : currentPosition.x,
    y: canMoveY ? newPosition.y : currentPosition.y,
  };
}

export function clampToMap(
  position: Position,
  mapWidth: number,
  mapHeight: number,
  wallThickness: number
): Position {
  const halfSize = PLAYER_SIZE / 2;
  const minX = wallThickness + halfSize;
  const maxX = mapWidth - wallThickness - halfSize;
  const minY = wallThickness + halfSize;
  const maxY = mapHeight - wallThickness - halfSize;

  return {
    x: Math.max(minX, Math.min(maxX, position.x)),
    y: Math.max(minY, Math.min(maxY, position.y)),
  };
}
