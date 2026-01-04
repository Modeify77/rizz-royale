import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../../lib/socket';
import { useGameStore } from '../../stores/gameStore';
import { useLobbyStore } from '../../stores/lobbyStore';
import type { ChatMessage } from '@rizz/shared';

interface ChatInputProps {
  onClose: () => void;
}

// Simple input bar that appears when pressing E
export function ChatInput({ onClose }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const nearbyGirlIds = useGameStore((state) => state.nearbyGirlIds);
  const cooldownRemaining = useGameStore((state) => state.cooldownRemaining);
  const startCooldown = useGameStore((state) => state.startCooldown);
  const updateCooldown = useGameStore((state) => state.updateCooldown);

  const nearbyCount = nearbyGirlIds.size;

  // Focus input on mount (with delay to prevent 'e' from being typed)
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      updateCooldown();
    }, 100);

    return () => clearInterval(interval);
  }, [cooldownRemaining, updateCooldown]);

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || cooldownRemaining > 0 || nearbyGirlIds.size === 0) return;

    const socket = getSocket();
    const text = inputValue.trim();

    // Send to all nearby girls
    nearbyGirlIds.forEach((girlId) => {
      socket.emit('send-message', { girlId, text });
    });

    setInputValue('');
    startCooldown();
    onClose(); // Close chat after sending
  }, [inputValue, nearbyGirlIds, cooldownRemaining, startCooldown, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-3 rounded-lg border border-neon-pink/50 w-[90%] max-w-[500px]">
      <div className="flex items-center gap-2 mb-2">
        {nearbyCount > 0 ? (
          <span className="text-neon-pink font-medium text-sm">
            {nearbyCount} girl{nearbyCount > 1 ? 's' : ''} nearby
          </span>
        ) : (
          <span className="text-gray-500 font-medium text-sm">No girls nearby</span>
        )}
        <span className="text-gray-500 text-xs">(ESC to close)</span>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={cooldownRemaining > 0 ? `Wait ${cooldownSeconds}s...` : nearbyCount > 0 ? 'Type your message...' : 'Get closer to a girl...'}
          disabled={cooldownRemaining > 0}
          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-neon-pink disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || cooldownRemaining > 0 || nearbyCount === 0}
          className="bg-neon-pink hover:bg-neon-pink/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
        >
          {cooldownRemaining > 0 ? cooldownSeconds : 'Send'}
        </button>
      </div>
    </div>
  );
}

interface ChatLogProps {
  girlId: string;
  girlName: string;
  reputation: number;
}

// Map player colors to Tailwind classes
const PLAYER_COLOR_CLASSES: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
};

// Chat log popup that appears on hover
export function ChatLog({ girlId, girlName, reputation }: ChatLogProps) {
  const messages = useGameStore((state) => state.messages[girlId] || []);
  const isTyping = useGameStore((state) => state.typingGirls.has(girlId));
  const remotePlayers = useGameStore((state) => state.remotePlayers);
  const currentPlayer = useLobbyStore((state) => state.currentPlayer);
  const lobbyPlayers = useLobbyStore((state) => state.lobby?.players);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get player color from their character color
  const getPlayerColor = (senderId: string): string => {
    // Check if it's the current player
    if (currentPlayer && senderId === currentPlayer.id && currentPlayer.color) {
      return PLAYER_COLOR_CLASSES[currentPlayer.color] || 'text-purple-400';
    }
    // Check remote players
    const remotePlayer = remotePlayers.get(senderId);
    if (remotePlayer?.color) {
      return PLAYER_COLOR_CLASSES[remotePlayer.color] || 'text-gray-300';
    }
    // Check lobby players (for other players' colors)
    const lobbyPlayer = lobbyPlayers?.find(p => p.id === senderId);
    if (lobbyPlayer?.color) {
      return PLAYER_COLOR_CLASSES[lobbyPlayer.color] || 'text-gray-300';
    }
    // Default to purple
    return 'text-purple-400';
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border rounded-lg w-[380px] max-h-[320px] flex flex-col shadow-xl pointer-events-auto">
      {/* Header */}
      <div className="p-3 border-b border-dark-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center">
              <span className="text-neon-pink text-sm">♥</span>
            </div>
            <span className="text-neon-pink font-medium">{girlName}</span>
          </div>
          <div className="flex items-center gap-1 bg-dark-bg px-2 py-1 rounded-full">
            <span className={`text-xs font-bold ${reputation >= 50 ? 'text-green-400' : reputation >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
              {reputation >= 0 ? '+' : ''}{reputation}
            </span>
            <span className="text-gray-500 text-xs">rep</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '240px' }}>
        {messages.length === 0 && !isTyping && (
          <p className="text-gray-500 text-center text-sm py-4">No messages yet</p>
        )}

        {messages.slice(-15).map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isPlayer ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-1.5 ${
                msg.isPlayer
                  ? 'bg-dark-bg border border-dark-border'
                  : 'bg-neon-pink/10 border border-neon-pink/30'
              }`}
            >
              <div className={`text-xs font-medium mb-0.5 ${
                msg.isPlayer ? getPlayerColor(msg.senderId) : 'text-neon-pink'
              }`}>
                {msg.isPlayer ? msg.senderName : girlName}
              </div>
              <div className={`text-sm ${msg.isPlayer ? 'text-gray-300' : 'text-neon-pink/90'}`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-neon-pink/10 border border-neon-pink/30 rounded-lg px-3 py-1.5">
              <div className="text-xs font-medium text-neon-pink mb-0.5">{girlName}</div>
              <div className="text-sm text-neon-pink/90 animate-pulse">typing...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatHistoryPanelProps {
  girlId: string;
  girlName: string;
  reputation: number;
  onClose: () => void;
}

// Full chat history panel that opens on click
export function ChatHistoryPanel({ girlId, girlName, reputation, onClose }: ChatHistoryPanelProps) {
  const messages = useGameStore((state) => state.messages[girlId] || []);
  const isTyping = useGameStore((state) => state.typingGirls.has(girlId));
  const remotePlayers = useGameStore((state) => state.remotePlayers);
  const currentPlayer = useLobbyStore((state) => state.currentPlayer);
  const lobbyPlayers = useLobbyStore((state) => state.lobby?.players);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get player color from their character color
  const getPlayerColor = (senderId: string): string => {
    if (currentPlayer && senderId === currentPlayer.id && currentPlayer.color) {
      return PLAYER_COLOR_CLASSES[currentPlayer.color] || 'text-purple-400';
    }
    const remotePlayer = remotePlayers.get(senderId);
    if (remotePlayer?.color) {
      return PLAYER_COLOR_CLASSES[remotePlayer.color] || 'text-gray-300';
    }
    const lobbyPlayer = lobbyPlayers?.find(p => p.id === senderId);
    if (lobbyPlayer?.color) {
      return PLAYER_COLOR_CLASSES[lobbyPlayer.color] || 'text-gray-300';
    }
    return 'text-purple-400';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-lg w-[400px] max-h-[500px] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
              <span className="text-neon-pink text-lg">♥</span>
            </div>
            <div>
              <h3 className="text-white font-medium">{girlName}</h3>
              <div className="flex items-center gap-1">
                <span className={`text-sm font-bold ${reputation >= 50 ? 'text-green-400' : reputation >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {reputation >= 0 ? '+' : ''}{reputation}
                </span>
                <span className="text-gray-500 text-xs">reputation</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px]">
          {messages.length === 0 && !isTyping && (
            <p className="text-gray-500 text-center text-sm py-4">No conversation yet. Press E to chat!</p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isPlayer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.isPlayer
                    ? 'bg-dark-bg border border-dark-border'
                    : 'bg-neon-pink/20 text-neon-pink'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  msg.isPlayer ? getPlayerColor(msg.senderId) : 'text-neon-pink'
                }`}>
                  {msg.isPlayer ? msg.senderName : girlName}
                </div>
                <div className={`text-sm ${msg.isPlayer ? 'text-gray-300' : ''}`}>{msg.text}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-neon-pink/20 text-neon-pink rounded-lg px-3 py-2">
                <div className="text-xs opacity-70 mb-1">{girlName}</div>
                <div className="text-sm animate-pulse">typing...</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-dark-border text-center">
          <p className="text-gray-500 text-xs">Press E to send a message • ESC to close</p>
        </div>
      </div>
    </div>
  );
}

// Hook to set up socket listeners for chat (call once in parent)
export function useChatSocket() {
  const addMessage = useGameStore((state) => state.addMessage);
  const setGirlTyping = useGameStore((state) => state.setGirlTyping);
  const updateReputation = useGameStore((state) => state.updateReputation);

  useEffect(() => {
    const socket = getSocket();

    const handleMessageSent = ({ message }: { message: ChatMessage }) => {
      addMessage(message.girlId, message);
    };

    const handleGirlTyping = ({ girlId }: { girlId: string }) => {
      setGirlTyping(girlId, true);
    };

    const handleGirlResponse = ({ message }: { message: ChatMessage }) => {
      setGirlTyping(message.girlId, false);
      addMessage(message.girlId, message);
    };

    const handleRepUpdate = ({ girlId, change }: { girlId: string; newRep: number; change: number }) => {
      updateReputation(girlId, change);
    };

    const handleProposalSent = ({ message }: { message: ChatMessage }) => {
      addMessage(message.girlId, message);
    };

    const handleProposalResult = ({ girlId, response }: { girlId: string; accepted: boolean; response: ChatMessage }) => {
      setGirlTyping(girlId, false);
      addMessage(girlId, response);
    };

    socket.on('message-sent', handleMessageSent);
    socket.on('girl-typing', handleGirlTyping);
    socket.on('girl-response', handleGirlResponse);
    socket.on('rep-update', handleRepUpdate);
    socket.on('proposal-sent', handleProposalSent);
    socket.on('proposal-result', handleProposalResult);

    return () => {
      socket.off('message-sent', handleMessageSent);
      socket.off('girl-typing', handleGirlTyping);
      socket.off('girl-response', handleGirlResponse);
      socket.off('rep-update', handleRepUpdate);
      socket.off('proposal-sent', handleProposalSent);
      socket.off('proposal-result', handleProposalResult);
    };
  }, [addMessage, setGirlTyping, updateReputation]);
}
