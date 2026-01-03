import type { Socket, Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@rizz/shared';
import { MIN_PLAYERS } from '@rizz/shared';
import * as LobbyManager from '../managers/LobbyManager.js';
import * as GameManager from '../managers/GameManager.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

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

      // Broadcast to all players in lobby
      io.to(lobby.code).emit('game-started', { girls: publicGirls });

      console.log(`Game started in lobby ${lobby.code} with ${lobby.players.length} players`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game. Try again.' });
    }
  });
}
