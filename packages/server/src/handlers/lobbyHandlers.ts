import type { Socket, Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Lobby, PlayerPosition, PlayerColor } from '@rizz/shared';
import { POSITION_UPDATE_RATE, PLAYER_COLORS } from '@rizz/shared';
import * as LobbyManager from '../managers/LobbyManager.js';
import { cleanupPlayerPosition } from './gameHandlers.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track lobby player positions (before game starts)
const lobbyPositions: Map<string, Map<string, PlayerPosition>> = new Map();
// Track lobby broadcast intervals
const lobbyBroadcastIntervals: Map<string, NodeJS.Timeout> = new Map();

// Lobby spawn config
const LOBBY_SPAWN = { x: 400, y: 400, radius: 80 };

function getOrCreateLobbyPositions(lobbyCode: string): Map<string, PlayerPosition> {
  if (!lobbyPositions.has(lobbyCode)) {
    lobbyPositions.set(lobbyCode, new Map());
  }
  return lobbyPositions.get(lobbyCode)!;
}

function getAvailableLobbyColor(lobbyCode: string): PlayerColor {
  const positions = lobbyPositions.get(lobbyCode);
  const usedColors = new Set(
    positions ? Array.from(positions.values()).map(p => p.color) : []
  );
  return PLAYER_COLORS.find(c => !usedColors.has(c)) || 'purple';
}

function startLobbyBroadcast(io: GameServer, lobbyCode: string): void {
  if (lobbyBroadcastIntervals.has(lobbyCode)) return;

  const interval = setInterval(() => {
    const positions = lobbyPositions.get(lobbyCode);

    if (!positions || positions.size === 0) {
      stopLobbyBroadcast(lobbyCode);
      return;
    }

    const playersArray = Array.from(positions.values());
    io.to(lobbyCode).emit('lobby-players-update', { players: playersArray });
  }, POSITION_UPDATE_RATE);

  lobbyBroadcastIntervals.set(lobbyCode, interval);
}

function stopLobbyBroadcast(lobbyCode: string): void {
  const interval = lobbyBroadcastIntervals.get(lobbyCode);
  if (interval) {
    clearInterval(interval);
    lobbyBroadcastIntervals.delete(lobbyCode);
  }
}

export function cleanupLobbyPosition(playerId: string, lobbyCode: string): void {
  const positions = lobbyPositions.get(lobbyCode);
  if (positions) {
    positions.delete(playerId);
    if (positions.size === 0) {
      lobbyPositions.delete(lobbyCode);
      stopLobbyBroadcast(lobbyCode);
    }
  }
}

export function clearLobbyPositions(lobbyCode: string): void {
  lobbyPositions.delete(lobbyCode);
  stopLobbyBroadcast(lobbyCode);
}

// Helper to get public lobby data (hides archetypes)
function getPublicLobby(lobby: Lobby): Lobby {
  return {
    ...lobby,
    girls: lobby.girls.map(({ id, name, avatarUrl }) => ({
      id,
      name,
      archetype: 'CONFIDENT', // Archetype hidden
      avatarUrl,
    })),
  };
}

export function registerLobbyHandlers(io: GameServer, socket: GameSocket): void {
  // Create lobby
  socket.on('create-lobby', ({ username }) => {
    // Check if player is already in a lobby
    const existingLobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (existingLobby) {
      socket.emit('error', { message: 'Already in a lobby' });
      return;
    }

    const lobby = LobbyManager.createLobby(socket.id, username);
    const player = lobby.players[0];

    // Join the socket room
    socket.join(lobby.code);

    // Initialize player position in lobby
    const positions = getOrCreateLobbyPositions(lobby.code);
    const color = getAvailableLobbyColor(lobby.code);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * LOBBY_SPAWN.radius;
    positions.set(socket.id, {
      id: socket.id,
      x: LOBBY_SPAWN.x + Math.cos(angle) * radius,
      y: LOBBY_SPAWN.y + Math.sin(angle) * radius,
      color,
      username,
    });

    // Update player color in lobby data
    player.color = color;

    // Start broadcasting positions
    startLobbyBroadcast(io, lobby.code);

    socket.emit('lobby-created', {
      lobbyCode: lobby.code,
      player,
    });

    console.log(`Lobby ${lobby.code} created by ${username}`);
  });

  // Join lobby
  socket.on('join-lobby', ({ lobbyCode, username }) => {
    // Check if player is already in a lobby
    const existingLobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (existingLobby) {
      socket.emit('error', { message: 'Already in a lobby' });
      return;
    }

    const result = LobbyManager.joinLobby(lobbyCode, socket.id, username);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    const { lobby } = result;
    const newPlayer = lobby.players.find((p) => p.id === socket.id)!;

    // Join the socket room
    socket.join(lobby.code);

    // Initialize player position in lobby
    const positions = getOrCreateLobbyPositions(lobby.code);
    const color = getAvailableLobbyColor(lobby.code);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * LOBBY_SPAWN.radius;
    positions.set(socket.id, {
      id: socket.id,
      x: LOBBY_SPAWN.x + Math.cos(angle) * radius,
      y: LOBBY_SPAWN.y + Math.sin(angle) * radius,
      color,
      username,
    });

    // Update player color in lobby data
    newPlayer.color = color;

    // Start broadcasting if not already
    startLobbyBroadcast(io, lobby.code);

    // Send lobby state to the joining player
    socket.emit('lobby-joined', { lobby: getPublicLobby(lobby) });

    // Notify other players in the lobby
    socket.to(lobby.code).emit('player-joined', { player: newPlayer });

    console.log(`${username} joined lobby ${lobby.code}`);
  });

  // Handle lobby movement (before game starts)
  socket.on('lobby-move', ({ x, y }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.status !== 'waiting') return;

    const positions = lobbyPositions.get(lobby.code);
    if (!positions) return;

    const playerPos = positions.get(socket.id);
    if (playerPos) {
      playerPos.x = x;
      playerPos.y = y;
    }
  });

  // Handle lobby chat
  socket.on('lobby-chat-send', ({ text }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.status !== 'waiting') return;

    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;

    // Broadcast to all players in the lobby
    io.to(lobby.code).emit('lobby-chat', {
      playerId: socket.id,
      playerName: player.username,
      text: text.slice(0, 100), // Limit message length
      color: player.color || 'purple',
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    const wasHost = lobby?.hostId === socket.id;
    const lobbyCode = lobby?.code;

    const result = LobbyManager.leaveLobby(socket.id);

    if (result.lobby) {
      // Clean up lobby position
      cleanupLobbyPosition(socket.id, result.lobby.code);
      // Clean up game position
      cleanupPlayerPosition(socket.id, result.lobby.code);

      if (!result.lobbyDeleted) {
        // If host left, close the lobby for everyone
        if (wasHost && lobbyCode) {
          io.to(lobbyCode).emit('lobby-closed', { reason: 'Host left the lobby' });
          // Clean up all positions for this lobby
          clearLobbyPositions(lobbyCode);
          // Delete the lobby
          LobbyManager.deleteLobby(lobbyCode);
          console.log(`Lobby ${lobbyCode} closed because host left`);
        } else {
          // Regular player left
          io.to(result.lobby.code).emit('player-left', { playerId: socket.id });
        }
      }
    }

    if (result.lobbyDeleted) {
      console.log(`Lobby ${result.lobby?.code} deleted (empty)`);
    }
  });
}
