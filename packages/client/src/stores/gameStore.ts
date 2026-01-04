import { create } from 'zustand';
import type { ChatMessage, PlayerPosition, GirlPosition } from '@rizz/shared';
import { MESSAGE_COOLDOWN_MS } from '@rizz/shared';

interface WinnerInfo {
  winnerId: string;
  winnerName: string;
  girlName: string;
  girlAvatarUrl: string;
}

const DEFAULT_REPUTATION = 5;
const MIN_REPUTATION = -50;
const MAX_REPUTATION = 100;

interface GameState {
  // Selected girl for chat
  selectedGirlId: string | null;

  // Chat messages per girl
  messages: Record<string, ChatMessage[]>;

  // Typing indicator per girl
  typingGirls: Set<string>;

  // Reputation per girl (private to this player)
  reputations: Record<string, number>;

  // Cooldown state
  cooldownEndTime: number | null;
  cooldownRemaining: number;

  // Winner info (game over)
  winner: WinnerInfo | null;

  // Multiplayer state
  localPlayerId: string | null;
  remotePlayers: Map<string, PlayerPosition>;
  girlPositions: Map<string, GirlPosition>;
  nearbyGirlIds: Set<string>;

  // Actions
  selectGirl: (girlId: string | null) => void;
  addMessage: (girlId: string, message: ChatMessage) => void;
  setGirlTyping: (girlId: string, isTyping: boolean) => void;
  setWinner: (winner: WinnerInfo) => void;
  startCooldown: () => void;
  updateCooldown: () => void;
  clearCooldown: () => void;
  // Reputation actions
  getReputation: (girlId: string) => number;
  updateReputation: (girlId: string, change: number) => void;
  // Multiplayer actions
  setLocalPlayerId: (id: string) => void;
  updateRemotePlayers: (players: PlayerPosition[]) => void;
  removeRemotePlayer: (playerId: string) => void;
  updateGirlPositions: (girls: GirlPosition[]) => void;
  setNearbyGirls: (girlIds: string[]) => void;
  reset: () => void;
}

const initialState = {
  selectedGirlId: null,
  messages: {},
  typingGirls: new Set<string>(),
  reputations: {} as Record<string, number>,
  cooldownEndTime: null,
  cooldownRemaining: 0,
  winner: null as WinnerInfo | null,
  localPlayerId: null as string | null,
  remotePlayers: new Map<string, PlayerPosition>(),
  girlPositions: new Map<string, GirlPosition>(),
  nearbyGirlIds: new Set<string>(),
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  selectGirl: (girlId) => set({ selectedGirlId: girlId }),

  addMessage: (girlId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [girlId]: [...(state.messages[girlId] || []), message],
      },
    })),

  setGirlTyping: (girlId, isTyping) =>
    set((state) => {
      const newTypingGirls = new Set(state.typingGirls);
      if (isTyping) {
        newTypingGirls.add(girlId);
      } else {
        newTypingGirls.delete(girlId);
      }
      return { typingGirls: newTypingGirls };
    }),

  setWinner: (winner) => set({ winner }),

  startCooldown: () => {
    const endTime = Date.now() + MESSAGE_COOLDOWN_MS;
    set({ cooldownEndTime: endTime, cooldownRemaining: MESSAGE_COOLDOWN_MS });
  },

  updateCooldown: () => {
    const { cooldownEndTime } = get();
    if (!cooldownEndTime) return;

    const remaining = Math.max(0, cooldownEndTime - Date.now());
    if (remaining === 0) {
      set({ cooldownEndTime: null, cooldownRemaining: 0 });
    } else {
      set({ cooldownRemaining: remaining });
    }
  },

  clearCooldown: () => set({ cooldownEndTime: null, cooldownRemaining: 0 }),

  getReputation: (girlId) => {
    const { reputations } = get();
    return reputations[girlId] ?? DEFAULT_REPUTATION;
  },

  updateReputation: (girlId, change) => {
    set((state) => {
      const currentRep = state.reputations[girlId] ?? DEFAULT_REPUTATION;
      const newRep = Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, currentRep + change));
      return {
        reputations: {
          ...state.reputations,
          [girlId]: newRep,
        },
      };
    });
  },

  setLocalPlayerId: (id) => set({ localPlayerId: id }),

  updateRemotePlayers: (players) => {
    const { localPlayerId } = get();
    const newMap = new Map<string, PlayerPosition>();

    players.forEach((player) => {
      // Don't include local player in remote players
      if (player.id !== localPlayerId) {
        newMap.set(player.id, player);
      }
    });

    set({ remotePlayers: newMap });
  },

  removeRemotePlayer: (playerId) => {
    const { remotePlayers } = get();
    const newMap = new Map(remotePlayers);
    newMap.delete(playerId);
    set({ remotePlayers: newMap });
  },

  updateGirlPositions: (girls) => {
    const newMap = new Map<string, GirlPosition>();
    girls.forEach((girl) => {
      newMap.set(girl.id, girl);
    });
    set({ girlPositions: newMap });
  },

  setNearbyGirls: (girlIds) => {
    set({ nearbyGirlIds: new Set(girlIds) });
  },

  reset: () => set({
    ...initialState,
    typingGirls: new Set<string>(),
    reputations: {},
    remotePlayers: new Map<string, PlayerPosition>(),
    girlPositions: new Map<string, GirlPosition>(),
    nearbyGirlIds: new Set<string>(),
  }),
}));
