import type { Lobby, Player } from '@rizz/shared';
import { MAX_PLAYERS, INITIAL_REP, NUM_GIRLS } from '@rizz/shared';

// In-memory lobby storage
const lobbies = new Map<string, Lobby>();
const playerToLobby = new Map<string, string>(); // playerId -> lobbyCode

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness
  if (lobbies.has(code)) {
    return generateLobbyCode();
  }
  return code;
}

export function createLobby(playerId: string, username: string): Lobby {
  const code = generateLobbyCode();

  const host: Player = {
    id: playerId,
    username,
    isHost: true,
    reputation: {},
  };

  const lobby: Lobby = {
    code,
    players: [host],
    girls: [],
    status: 'waiting',
    hostId: playerId,
  };

  lobbies.set(code, lobby);
  playerToLobby.set(playerId, code);

  return lobby;
}

export function joinLobby(
  lobbyCode: string,
  playerId: string,
  username: string
): { success: true; lobby: Lobby } | { success: false; error: string } {
  const lobby = lobbies.get(lobbyCode.toUpperCase());

  if (!lobby) {
    return { success: false, error: 'Lobby not found' };
  }

  if (lobby.status !== 'waiting') {
    return { success: false, error: 'Game already in progress' };
  }

  if (lobby.players.length >= MAX_PLAYERS) {
    return { success: false, error: 'Lobby is full' };
  }

  // Check if username is taken in this lobby
  if (lobby.players.some((p) => p.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Username already taken in this lobby' };
  }

  const player: Player = {
    id: playerId,
    username,
    isHost: false,
    reputation: {},
  };

  lobby.players.push(player);
  playerToLobby.set(playerId, lobbyCode);

  return { success: true, lobby };
}

export function leaveLobby(playerId: string): {
  lobby: Lobby | null;
  wasHost: boolean;
  newHostId: string | null;
  lobbyDeleted: boolean;
} {
  const lobbyCode = playerToLobby.get(playerId);
  if (!lobbyCode) {
    return { lobby: null, wasHost: false, newHostId: null, lobbyDeleted: false };
  }

  const lobby = lobbies.get(lobbyCode);
  if (!lobby) {
    playerToLobby.delete(playerId);
    return { lobby: null, wasHost: false, newHostId: null, lobbyDeleted: false };
  }

  const wasHost = lobby.hostId === playerId;
  lobby.players = lobby.players.filter((p) => p.id !== playerId);
  playerToLobby.delete(playerId);

  // If no players left, delete the lobby
  if (lobby.players.length === 0) {
    lobbies.delete(lobbyCode);
    return { lobby, wasHost, newHostId: null, lobbyDeleted: true };
  }

  // If host left, assign new host
  let newHostId: string | null = null;
  if (wasHost && lobby.players.length > 0) {
    newHostId = lobby.players[0].id;
    lobby.players[0].isHost = true;
    lobby.hostId = newHostId;
  }

  return { lobby, wasHost, newHostId, lobbyDeleted: false };
}

export function getLobby(code: string): Lobby | undefined {
  return lobbies.get(code.toUpperCase());
}

export function getLobbyByPlayerId(playerId: string): Lobby | undefined {
  const code = playerToLobby.get(playerId);
  if (!code) return undefined;
  return lobbies.get(code);
}

export function getPlayer(playerId: string): Player | undefined {
  const lobby = getLobbyByPlayerId(playerId);
  if (!lobby) return undefined;
  return lobby.players.find((p) => p.id === playerId);
}

export function isHost(playerId: string): boolean {
  const lobby = getLobbyByPlayerId(playerId);
  if (!lobby) return false;
  return lobby.hostId === playerId;
}

export function deleteLobby(code: string): void {
  const lobby = lobbies.get(code);
  if (lobby) {
    for (const player of lobby.players) {
      playerToLobby.delete(player.id);
    }
    lobbies.delete(code);
  }
}

// For testing
export function clearAllLobbies(): void {
  lobbies.clear();
  playerToLobby.clear();
}

export function getLobbyCount(): number {
  return lobbies.size;
}
