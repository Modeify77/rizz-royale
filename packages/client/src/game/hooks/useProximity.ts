import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { PROXIMITY_RANGE } from '../types';
import type { Position } from '../types';

interface UseProximityOptions {
  playerPosition: Position;
  enabled?: boolean;
}

export function useProximity({ playerPosition, enabled = true }: UseProximityOptions) {
  const girlPositions = useGameStore((state) => state.girlPositions);
  const setNearbyGirls = useGameStore((state) => state.setNearbyGirls);
  const nearbyGirlIds = useGameStore((state) => state.nearbyGirlIds);

  // Calculate which girls are nearby
  useEffect(() => {
    if (!enabled) return;

    const nearby: string[] = [];

    girlPositions.forEach((girl, girlId) => {
      const dx = girl.x - playerPosition.x;
      const dy = girl.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= PROXIMITY_RANGE) {
        nearby.push(girlId);
      }
    });

    setNearbyGirls(nearby);
  }, [playerPosition.x, playerPosition.y, girlPositions, setNearbyGirls, enabled]);

  // Get the closest girl if any are nearby
  const closestGirl = useMemo(() => {
    if (!enabled || nearbyGirlIds.size === 0) return null;

    let closest: { id: string; name: string; distance: number } | null = null;

    nearbyGirlIds.forEach((girlId) => {
      const girl = girlPositions.get(girlId);
      if (!girl) return;

      const dx = girl.x - playerPosition.x;
      const dy = girl.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!closest || distance < closest.distance) {
        closest = { id: girlId, name: girl.name, distance };
      }
    });

    return closest;
  }, [nearbyGirlIds, girlPositions, playerPosition.x, playerPosition.y, enabled]);

  return {
    nearbyGirlIds,
    closestGirl,
  };
}
