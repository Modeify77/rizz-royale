import { create } from 'zustand';
import type { ChatMessage } from '@rizz/shared';
import { MESSAGE_COOLDOWN_MS } from '@rizz/shared';

interface WinnerInfo {
  winnerId: string;
  winnerName: string;
  girlName: string;
  girlAvatarUrl: string;
}

interface GameState {
  // Selected girl for chat
  selectedGirlId: string | null;

  // Chat messages per girl
  messages: Record<string, ChatMessage[]>;

  // Typing indicator per girl
  typingGirls: Set<string>;

  // Cooldown state
  cooldownEndTime: number | null;
  cooldownRemaining: number;

  // Winner info (game over)
  winner: WinnerInfo | null;

  // Actions
  selectGirl: (girlId: string | null) => void;
  addMessage: (girlId: string, message: ChatMessage) => void;
  setGirlTyping: (girlId: string, isTyping: boolean) => void;
  setWinner: (winner: WinnerInfo) => void;
  startCooldown: () => void;
  updateCooldown: () => void;
  clearCooldown: () => void;
  reset: () => void;
}

const initialState = {
  selectedGirlId: null,
  messages: {},
  typingGirls: new Set<string>(),
  cooldownEndTime: null,
  cooldownRemaining: 0,
  winner: null as WinnerInfo | null,
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

  reset: () => set(initialState),
}));
