import type { Socket, Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Lobby } from '@rizz/shared';
import * as LobbyManager from '../managers/LobbyManager.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

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

    // Send lobby state to the joining player
    socket.emit('lobby-joined', { lobby: getPublicLobby(lobby) });

    // Notify other players in the lobby
    socket.to(lobby.code).emit('player-joined', { player: newPlayer });

    console.log(`${username} joined lobby ${lobby.code}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const result = LobbyManager.leaveLobby(socket.id);

    if (result.lobby && !result.lobbyDeleted) {
      // Notify remaining players
      io.to(result.lobby.code).emit('player-left', { playerId: socket.id });

      // If there's a new host, we could emit an event for that too
      if (result.newHostId) {
        console.log(`New host assigned in lobby ${result.lobby.code}: ${result.newHostId}`);
      }
    }

    if (result.lobbyDeleted) {
      console.log(`Lobby ${result.lobby?.code} deleted (empty)`);
    }
  });
}
