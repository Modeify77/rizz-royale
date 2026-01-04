import { useState, useCallback, useRef, useEffect } from 'react';
import { Application } from 'pixi.js';
import type { Position, Direction, Wall, BarMap } from '../types';
import { PLAYER_SPEED } from '../types';
import { applyMovementWithCollision, clampToMap } from '../utils/collision';
import { useKeyboard } from './useKeyboard';

interface UsePlayerMovementOptions {
  app: Application | null;
  initialPosition: Position;
  mapData: BarMap;
  enabled?: boolean;
  onInteract?: () => void;
  onEscape?: () => void;
}

export function usePlayerMovement({
  app,
  initialPosition,
  mapData,
  enabled = true,
  onInteract,
  onEscape,
}: UsePlayerMovementOptions) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const positionRef = useRef<Position>(initialPosition);
  const { getMovementDirection, isKeyPressed } = useKeyboard({ enabled, onInteract, onEscape });

  // Keep ref in sync with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const calculateMovement = useCallback((direction: Direction): Position => {
    let dx = 0;
    let dy = 0;

    if (direction.up) dy -= 1;
    if (direction.down) dy += 1;
    if (direction.left) dx -= 1;
    if (direction.right) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      dx /= magnitude;
      dy /= magnitude;
    }

    // Apply speed
    dx *= PLAYER_SPEED;
    dy *= PLAYER_SPEED;

    const currentPos = positionRef.current;
    const newPosition = {
      x: currentPos.x + dx,
      y: currentPos.y + dy,
    };

    // Apply collision detection
    const validPosition = applyMovementWithCollision(
      currentPos,
      newPosition,
      mapData.walls
    );

    // Clamp to map bounds
    return clampToMap(
      validPosition,
      mapData.width,
      mapData.height,
      mapData.wallThickness
    );
  }, [mapData]);

  // Game loop for movement
  useEffect(() => {
    if (!app || !enabled) return;

    const ticker = app.ticker;

    const update = () => {
      const direction = getMovementDirection();
      const isMoving = direction.up || direction.down || direction.left || direction.right;

      if (isMoving) {
        const newPosition = calculateMovement(direction);
        if (
          newPosition.x !== positionRef.current.x ||
          newPosition.y !== positionRef.current.y
        ) {
          setPosition(newPosition);
        }
      }
    };

    ticker.add(update);

    return () => {
      ticker.remove(update);
    };
  }, [app, enabled, getMovementDirection, calculateMovement]);

  const resetPosition = useCallback((newPosition: Position) => {
    positionRef.current = newPosition;
    setPosition(newPosition);
  }, []);

  return {
    position,
    resetPosition,
    isKeyPressed,
  };
}
