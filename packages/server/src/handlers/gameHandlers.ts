import type { Socket, Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, PlayerPosition, PlayerColor, GirlPosition } from '@rizz/shared';
import { MIN_PLAYERS, POSITION_UPDATE_RATE, PLAYER_COLORS } from '@rizz/shared';
import * as LobbyManager from '../managers/LobbyManager.js';
import * as GameManager from '../managers/GameManager.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track player positions per lobby
const playerPositions: Map<string, Map<string, PlayerPosition>> = new Map();
// Track girl positions per lobby
const girlPositions: Map<string, Map<string, GirlPosition & { targetX: number; targetY: number; state: 'idle' | 'walking' }>> = new Map();
// Track position broadcast intervals per lobby
const broadcastIntervals: Map<string, NodeJS.Timeout> = new Map();
// Track girl AI update intervals per lobby
const girlAIIntervals: Map<string, NodeJS.Timeout> = new Map();

// Girl spawn positions from map data
const GIRL_SPAWNS = [
  { x: 200, y: 100 },
  { x: 400, y: 100 },
  { x: 600, y: 100 },
  { x: 150, y: 300 },
  { x: 400, y: 450 },
  { x: 650, y: 300 },
];

// Map bounds for girl roaming
const MAP_BOUNDS = { minX: 40, maxX: 760, minY: 40, maxY: 560 };
const GIRL_SPEED = 0.8;
const GIRL_AI_UPDATE_RATE = 50; // ms

function getOrCreateLobbyPositions(lobbyCode: string): Map<string, PlayerPosition> {
  if (!playerPositions.has(lobbyCode)) {
    playerPositions.set(lobbyCode, new Map());
  }
  return playerPositions.get(lobbyCode)!;
}

function initializeGirls(lobbyCode: string, girls: { id: string; name: string }[]): void {
  const positions = new Map<string, GirlPosition & { targetX: number; targetY: number; state: 'idle' | 'walking' }>();

  girls.forEach((girl, index) => {
    const spawn = GIRL_SPAWNS[index] || GIRL_SPAWNS[0];
    positions.set(girl.id, {
      id: girl.id,
      name: girl.name,
      x: spawn.x,
      y: spawn.y,
      targetX: spawn.x,
      targetY: spawn.y,
      state: 'idle',
    });
  });

  girlPositions.set(lobbyCode, positions);
}

function pickNewTarget(girl: GirlPosition & { targetX: number; targetY: number; state: 'idle' | 'walking' }): void {
  // Random position within map bounds
  girl.targetX = MAP_BOUNDS.minX + Math.random() * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
  girl.targetY = MAP_BOUNDS.minY + Math.random() * (MAP_BOUNDS.maxY - MAP_BOUNDS.minY);
  girl.state = 'walking';
}

function updateGirlAI(lobbyCode: string): void {
  const girls = girlPositions.get(lobbyCode);
  if (!girls) return;

  for (const girl of girls.values()) {
    if (girl.state === 'idle') {
      // Randomly decide to start walking
      if (Math.random() < 0.01) { // 1% chance per tick to start moving
        pickNewTarget(girl);
      }
    } else if (girl.state === 'walking') {
      const dx = girl.targetX - girl.x;
      const dy = girl.targetY - girl.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        // Reached target, go idle
        girl.x = girl.targetX;
        girl.y = girl.targetY;
        girl.state = 'idle';
      } else {
        // Move toward target
        const moveX = (dx / distance) * GIRL_SPEED;
        const moveY = (dy / distance) * GIRL_SPEED;
        girl.x += moveX;
        girl.y += moveY;
      }
    }
  }
}

function startGirlAI(lobbyCode: string): void {
  if (girlAIIntervals.has(lobbyCode)) return;

  const interval = setInterval(() => {
    updateGirlAI(lobbyCode);
  }, GIRL_AI_UPDATE_RATE);

  girlAIIntervals.set(lobbyCode, interval);
}

function stopGirlAI(lobbyCode: string): void {
  const interval = girlAIIntervals.get(lobbyCode);
  if (interval) {
    clearInterval(interval);
    girlAIIntervals.delete(lobbyCode);
  }
  girlPositions.delete(lobbyCode);
}

function startPositionBroadcast(io: GameServer, lobbyCode: string): void {
  // Don't start if already running
  if (broadcastIntervals.has(lobbyCode)) return;

  const interval = setInterval(() => {
    const positions = playerPositions.get(lobbyCode);
    const girls = girlPositions.get(lobbyCode);

    if ((!positions || positions.size === 0) && (!girls || girls.size === 0)) {
      stopPositionBroadcast(lobbyCode);
      return;
    }

    if (positions && positions.size > 0) {
      const playersArray = Array.from(positions.values());
      io.to(lobbyCode).emit('players-update', { players: playersArray });
    }

    if (girls && girls.size > 0) {
      const girlsArray = Array.from(girls.values()).map(({ id, name, x, y }) => ({ id, name, x, y }));
      io.to(lobbyCode).emit('girls-update', { girls: girlsArray });
    }
  }, POSITION_UPDATE_RATE);

  broadcastIntervals.set(lobbyCode, interval);
}

function stopPositionBroadcast(lobbyCode: string): void {
  const interval = broadcastIntervals.get(lobbyCode);
  if (interval) {
    clearInterval(interval);
    broadcastIntervals.delete(lobbyCode);
  }
  stopGirlAI(lobbyCode);
}

export function cleanupPlayerPosition(playerId: string, lobbyCode: string): void {
  const positions = playerPositions.get(lobbyCode);
  if (positions) {
    positions.delete(playerId);
    // Clean up lobby if empty
    if (positions.size === 0) {
      playerPositions.delete(lobbyCode);
      stopPositionBroadcast(lobbyCode);
    }
  }
}

function getAvailableColor(lobbyCode: string): PlayerColor {
  const positions = playerPositions.get(lobbyCode);
  const usedColors = new Set(
    positions ? Array.from(positions.values()).map(p => p.color) : []
  );
  return PLAYER_COLORS.find(c => !usedColors.has(c)) || 'purple';
}

export function registerGameHandlers(io: GameServer, socket: GameSocket): void {
  // Start game
  socket.on('start-game', async () => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);

    if (!lobby) {
      socket.emit('error', { message: 'Not in a lobby' });
      return;
    }

    if (lobby.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (lobby.players.length < MIN_PLAYERS) {
      socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players to start` });
      return;
    }

    if (lobby.status !== 'waiting') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }

    try {
      // Start the game (fetches waifu images)
      const girls = await GameManager.startGame(lobby);
      const publicGirls = GameManager.getPublicGirls(girls);

      // Initialize player positions in spawn area
      const positions = getOrCreateLobbyPositions(lobby.code);
      const spawnX = 400;
      const spawnY = 500;
      const spawnRadius = 50;

      lobby.players.forEach((player, index) => {
        const angle = (index / lobby.players.length) * Math.PI * 2;
        const radius = Math.random() * spawnRadius;
        positions.set(player.id, {
          id: player.id,
          x: spawnX + Math.cos(angle) * radius,
          y: spawnY + Math.sin(angle) * radius,
          color: player.color || getAvailableColor(lobby.code),
          username: player.username,
        });
      });

      // Initialize girl positions
      initializeGirls(lobby.code, publicGirls);

      // Start girl AI and position broadcasting
      startGirlAI(lobby.code);
      startPositionBroadcast(io, lobby.code);

      // Broadcast to all players in lobby
      io.to(lobby.code).emit('game-started', { girls: publicGirls });

      console.log(`Game started in lobby ${lobby.code} with ${lobby.players.length} players and ${publicGirls.length} girls`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game. Try again.' });
    }
  });

  // Handle player movement
  socket.on('player-move', ({ x, y }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.status !== 'playing') return;

    const positions = playerPositions.get(lobby.code);
    if (!positions) return;

    const playerPos = positions.get(socket.id);
    if (playerPos) {
      playerPos.x = x;
      playerPos.y = y;
    }
  });

  // Handle color selection
  socket.on('select-color', ({ color }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if color is already taken by another player
    const colorTaken = lobby.players.some(p => p.id !== socket.id && p.color === color);
    if (colorTaken) {
      socket.emit('error', { message: 'Color already taken' });
      return;
    }

    // Update player color
    player.color = color;

    // Also update position if game is running
    const positions = playerPositions.get(lobby.code);
    if (positions) {
      const playerPos = positions.get(socket.id);
      if (playerPos) {
        playerPos.color = color;
      }
    }

    // Broadcast the player update to all players in the lobby
    io.to(lobby.code).emit('player-updated', { player });
  });
}
