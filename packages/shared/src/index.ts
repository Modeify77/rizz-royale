// Shared types for Rizz Royale

export type Archetype =
  | 'CONFIDENT'
  | 'SOFTIE'
  | 'JOKER'
  | 'CHALLENGE'
  | 'INTELLECTUAL'
  | 'ROMANTIC';

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  reputation: Record<string, number>; // girlId -> rep score
}

export interface Girl {
  id: string;
  name: string;
  archetype: Archetype; // Hidden from players
  avatarUrl: string;
}

export interface Lobby {
  code: string;
  players: Player[];
  girls: Girl[];
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
}

export interface ChatMessage {
  id: string;
  girlId: string;
  senderId: string;
  senderName: string;
  text: string;
  isPlayer: boolean;
  timestamp: number;
}

// Socket Events
export interface ServerToClientEvents {
  'lobby-created': (data: { lobbyCode: string; player: Player }) => void;
  'lobby-joined': (data: { lobby: Lobby }) => void;
  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string }) => void;
  'game-started': (data: { girls: Omit<Girl, 'archetype'>[] }) => void;
  'girl-avatars-ready': (data: { avatars: Record<string, string> }) => void;
  'message-sent': (data: { message: ChatMessage }) => void;
  'girl-typing': (data: { girlId: string }) => void;
  'girl-response': (data: { message: ChatMessage }) => void;
  'rep-update': (data: { girlId: string; newRep: number; change: number }) => void;
  'proposal-sent': (data: { message: ChatMessage }) => void;
  'proposal-result': (data: {
    girlId: string;
    accepted: boolean;
    response: ChatMessage;
    proposerId: string;
    proposerName: string;
  }) => void;
  'game-won': (data: { winnerId: string; winnerName: string; girlName: string; girlAvatarUrl: string }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'create-lobby': (data: { username: string }) => void;
  'join-lobby': (data: { lobbyCode: string; username: string }) => void;
  'start-game': () => void;
  'send-message': (data: { girlId: string; text: string }) => void;
  'propose': (data: { girlId: string; text: string }) => void;
}

// Constants
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const NUM_GIRLS = 6;
export const INITIAL_REP = 5;
export const MIN_REP = -50;
export const MAX_REP = 100;
export const WIN_REP = 100;
export const MESSAGE_COOLDOWN_MS = 5000;
export const REJECTION_PENALTY = 10;
