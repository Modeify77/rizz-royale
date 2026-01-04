import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../../lib/socket';
import { useGameStore } from '../../stores/gameStore';
import { useLobbyStore } from '../../stores/lobbyStore';
import type { Position } from '../types';

const POSITION_SEND_RATE = 50; // ms between position sends

interface UseMultiplayerSyncOptions {
  position: Position;
  enabled?: boolean;
}

export function useMultiplayerSync({ position, enabled = true }: UseMultiplayerSyncOptions) {
  const lastSentPosition = useRef<Position | null>(null);
  const sendIntervalRef = useRef<number | null>(null);

  const { updateRemotePlayers, removeRemotePlayer, setLocalPlayerId } = useGameStore();
  const { currentPlayer } = useLobbyStore();

  // Set local player ID when available
  useEffect(() => {
    if (currentPlayer?.id) {
      setLocalPlayerId(currentPlayer.id);
    }
  }, [currentPlayer?.id, setLocalPlayerId]);

  // Send position updates to server
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const sendPosition = () => {
      // Only send if position changed
      if (
        lastSentPosition.current &&
        lastSentPosition.current.x === position.x &&
        lastSentPosition.current.y === position.y
      ) {
        return;
      }

      socket.emit('player-move', { x: position.x, y: position.y });
      lastSentPosition.current = { ...position };
    };

    // Send immediately on first update
    sendPosition();

    // Set up interval for regular updates
    sendIntervalRef.current = window.setInterval(sendPosition, POSITION_SEND_RATE);

    return () => {
      if (sendIntervalRef.current) {
        window.clearInterval(sendIntervalRef.current);
      }
    };
  }, [position.x, position.y, enabled]);

  // Listen for position updates from server
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    const { updateGirlPositions } = useGameStore.getState();

    const handlePlayersUpdate = ({ players }: { players: any[] }) => {
      updateRemotePlayers(players);
    };

    const handleGirlsUpdate = ({ girls }: { girls: any[] }) => {
      updateGirlPositions(girls);
    };

    const handlePlayerLeft = ({ playerId }: { playerId: string }) => {
      removeRemotePlayer(playerId);
    };

    socket.on('players-update', handlePlayersUpdate);
    socket.on('girls-update', handleGirlsUpdate);
    socket.on('player-left', handlePlayerLeft);

    return () => {
      socket.off('players-update', handlePlayersUpdate);
      socket.off('girls-update', handleGirlsUpdate);
      socket.off('player-left', handlePlayerLeft);
    };
  }, [enabled, updateRemotePlayers, removeRemotePlayer]);

  // Get remote players from store
  const remotePlayers = useGameStore((state) => state.remotePlayers);

  return {
    remotePlayers: Array.from(remotePlayers.values()),
  };
}
