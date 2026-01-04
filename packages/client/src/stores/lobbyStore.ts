import { create } from 'zustand';
import type { Player, Lobby, Girl, PlayerColor } from '@rizz/shared';

export interface LobbyChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  color: PlayerColor;
  timestamp: number;
}

interface LobbyState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Lobby state
  lobby: Lobby | null;
  currentPlayer: Player | null;
  lobbyCode: string | null;

  // Game state
  girls: Omit<Girl, 'archetype'>[];
  isGameActive: boolean;

  // Error state
  error: string | null;

  // Lobby chat state
  lobbyChatMessages: LobbyChatMessage[];

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setLobby: (lobby: Lobby | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setLobbyCode: (code: string | null) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (player: Player) => void;
  setGirls: (girls: Omit<Girl, 'archetype'>[]) => void;
  setGameActive: (active: boolean) => void;
  setError: (error: string | null) => void;
  addLobbyChatMessage: (message: LobbyChatMessage) => void;
  clearLobbyChat: () => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  lobby: null,
  currentPlayer: null,
  lobbyCode: null,
  girls: [],
  isGameActive: false,
  error: null,
  lobbyChatMessages: [] as LobbyChatMessage[],
};

export const useLobbyStore = create<LobbyState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error }),

  setLobby: (lobby) => set({ lobby }),

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  setLobbyCode: (code) => set({ lobbyCode: code }),

  addPlayer: (player) =>
    set((state) => {
      if (!state.lobby) return state;
      // Avoid duplicates
      if (state.lobby.players.some((p) => p.id === player.id)) {
        return state;
      }
      return {
        lobby: {
          ...state.lobby,
          players: [...state.lobby.players, player],
        },
      };
    }),

  removePlayer: (playerId) =>
    set((state) => {
      if (!state.lobby) return state;
      return {
        lobby: {
          ...state.lobby,
          players: state.lobby.players.filter((p) => p.id !== playerId),
        },
      };
    }),

  updatePlayer: (player) =>
    set((state) => {
      if (!state.lobby) return state;

      // Update in players list
      const updatedPlayers = state.lobby.players.map((p) =>
        p.id === player.id ? player : p
      );

      // Also update currentPlayer if it's the same player
      const updatedCurrentPlayer =
        state.currentPlayer?.id === player.id ? player : state.currentPlayer;

      return {
        lobby: {
          ...state.lobby,
          players: updatedPlayers,
        },
        currentPlayer: updatedCurrentPlayer,
      };
    }),

  setGirls: (girls) => set({ girls }),

  setGameActive: (active) => set({ isGameActive: active }),

  setError: (error) => set({ error }),

  addLobbyChatMessage: (message) =>
    set((state) => ({
      lobbyChatMessages: [...state.lobbyChatMessages, message].slice(-50), // Keep last 50 messages
    })),

  clearLobbyChat: () => set({ lobbyChatMessages: [] }),

  reset: () => set(initialState),
}));
