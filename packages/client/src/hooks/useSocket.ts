import { useEffect, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { useLobbyStore } from '../stores/lobbyStore';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';

export function useSocket() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    lobby,
    currentPlayer,
    lobbyCode,
    error,
    setConnected,
    setConnecting,
    setConnectionError,
    setLobby,
    setCurrentPlayer,
    setLobbyCode,
    addPlayer,
    removePlayer,
    setGirls,
    setGameActive,
    setError,
    reset,
  } = useLobbyStore();

  // Connect and set up listeners on mount
  useEffect(() => {
    const socket = getSocket();

    // Connection handlers
    socket.on('connect', () => {
      setConnected(true);
      setConnecting(false);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setConnecting(false);
      setConnectionError(err.message);
      useToastStore.getState().addToast('Connection lost. Reconnecting...', 'error');
    });

    // Lobby event handlers
    socket.on('lobby-created', ({ lobbyCode, player }) => {
      setLobbyCode(lobbyCode);
      setCurrentPlayer(player);
      setLobby({
        code: lobbyCode,
        players: [player],
        girls: [],
        status: 'waiting',
        hostId: player.id,
      });
    });

    socket.on('lobby-joined', ({ lobby }) => {
      setLobby(lobby);
      setLobbyCode(lobby.code);
      // Find current player in the lobby
      const me = lobby.players.find((p) => p.id === socket.id);
      if (me) {
        setCurrentPlayer(me);
      }
    });

    socket.on('player-joined', ({ player }) => {
      addPlayer(player);
      useToastStore.getState().addToast(`${player.username} joined the lobby`, 'info');
    });

    socket.on('player-left', ({ playerId }) => {
      const leavingPlayer = useLobbyStore.getState().lobby?.players.find(p => p.id === playerId);
      if (leavingPlayer) {
        useToastStore.getState().addToast(`${leavingPlayer.username} left the game`, 'info');
      }
      removePlayer(playerId);
    });

    socket.on('player-updated', ({ player }) => {
      useLobbyStore.getState().updatePlayer(player);
    });

    socket.on('game-started', ({ girls }) => {
      setGirls(girls);
      setGameActive(true);
    });

    socket.on('game-won', ({ winnerId, winnerName, girlName, girlAvatarUrl }) => {
      useGameStore.getState().setWinner({ winnerId, winnerName, girlName, girlAvatarUrl });
      useToastStore.getState().addToast(`${winnerName} won with ${girlName}!`, 'info');
    });

    socket.on('error', ({ message }) => {
      setError(message);
      useToastStore.getState().addToast(message, 'error');
    });

    // Auto-connect
    setConnecting(true);
    connectSocket()
      .then(() => {
        setConnected(true);
        setConnecting(false);
      })
      .catch((err) => {
        setConnectionError(err.message);
        setConnecting(false);
      });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('lobby-created');
      socket.off('lobby-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
      socket.off('game-won');
      socket.off('player-updated');
      socket.off('error');
    };
  }, [
    setConnected,
    setConnecting,
    setConnectionError,
    setLobby,
    setCurrentPlayer,
    setLobbyCode,
    addPlayer,
    removePlayer,
    setGirls,
    setGameActive,
    setError,
  ]);

  // Actions
  const createLobby = useCallback((username: string) => {
    const socket = getSocket();
    socket.emit('create-lobby', { username });
  }, []);

  const joinLobby = useCallback((code: string, username: string) => {
    const socket = getSocket();
    socket.emit('join-lobby', { lobbyCode: code.toUpperCase(), username });
  }, []);

  const startGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('start-game');
  }, []);

  const leaveLobby = useCallback(() => {
    disconnectSocket();
    reset();
    // Reconnect for fresh state
    setConnecting(true);
    connectSocket()
      .then(() => {
        setConnected(true);
        setConnecting(false);
      })
      .catch((err) => {
        setConnectionError(err.message);
        setConnecting(false);
      });
  }, [reset, setConnecting, setConnected, setConnectionError]);

  const { girls, isGameActive } = useLobbyStore();

  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    lobby,
    currentPlayer,
    lobbyCode,
    error,
    girls,
    isGameActive,

    // Computed
    isHost: currentPlayer?.isHost ?? false,
    playerCount: lobby?.players.length ?? 0,

    // Actions
    createLobby,
    joinLobby,
    startGame,
    leaveLobby,
  };
}
