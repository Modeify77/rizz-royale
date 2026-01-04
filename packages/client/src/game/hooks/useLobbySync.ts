import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '../../lib/socket';
import { useLobbyStore } from '../../stores/lobbyStore';
import type { Position, PlayerColor } from '../types';
import type { PlayerPosition } from '@rizz/shared';

const POSITION_SEND_RATE = 50; // ms between position sends

interface UseLobbyyncOptions {
  position: Position;
  enabled?: boolean;
}

interface RemotePlayer {
  id: string;
  x: number;
  y: number;
  color: PlayerColor;
  username: string;
}

export function useLobbySync({ position, enabled = true }: UseLobbyyncOptions) {
  const lastSentPosition = useRef<Position | null>(null);
  const sendIntervalRef = useRef<number | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const { currentPlayer } = useLobbyStore();

  // Send position updates to server
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const sendPosition = () => {
      if (
        lastSentPosition.current &&
        lastSentPosition.current.x === position.x &&
        lastSentPosition.current.y === position.y
      ) {
        return;
      }

      socket.emit('lobby-move', { x: position.x, y: position.y });
      lastSentPosition.current = { ...position };
    };

    sendPosition();
    sendIntervalRef.current = window.setInterval(sendPosition, POSITION_SEND_RATE);

    return () => {
      if (sendIntervalRef.current) {
        window.clearInterval(sendIntervalRef.current);
      }
    };
  }, [position.x, position.y, enabled]);

  // Listen for lobby position updates
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleLobbyPlayersUpdate = ({ players }: { players: PlayerPosition[] }) => {
      const newMap = new Map<string, RemotePlayer>();

      for (const player of players) {
        // Skip current player
        if (player.id === currentPlayer?.id) continue;

        newMap.set(player.id, {
          id: player.id,
          x: player.x,
          y: player.y,
          color: player.color as PlayerColor,
          username: player.username,
        });
      }

      setRemotePlayers(newMap);
    };

    const handlePlayerLeft = ({ playerId }: { playerId: string }) => {
      setRemotePlayers(prev => {
        const newMap = new Map(prev);
        newMap.delete(playerId);
        return newMap;
      });
    };

    socket.on('lobby-players-update', handleLobbyPlayersUpdate);
    socket.on('player-left', handlePlayerLeft);

    return () => {
      socket.off('lobby-players-update', handleLobbyPlayersUpdate);
      socket.off('player-left', handlePlayerLeft);
    };
  }, [enabled, currentPlayer?.id]);

  return {
    remotePlayers: Array.from(remotePlayers.values()),
  };
}
