import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, Girl } from '@rizz/shared';
import { Button } from './Button';
import { GirlAvatar } from './GirlAvatar';

interface ChatPanelProps {
  girl: Omit<Girl, 'archetype'>;
  messages: ChatMessage[];
  reputation: number;
  isTyping: boolean;
  cooldownRemaining: number;
  canPropose: boolean;
  onSendMessage: (text: string) => void;
  onPropose: (text: string) => void;
  onClose: () => void;
}

export function ChatPanel({
  girl,
  messages,
  reputation,
  isTyping,
  cooldownRemaining,
  canPropose,
  onSendMessage,
  onPropose,
  onClose,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isProposing, setIsProposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnCooldown = cooldownRemaining > 0;
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isOnCooldown) return;

    if (isProposing) {
      onPropose(inputText.trim());
      setIsProposing(false);
    } else {
      onSendMessage(inputText.trim());
    }
    setInputText('');
  };

  // Get reputation color
  const getRepColor = () => {
    if (reputation >= 75) return 'text-green-400';
    if (reputation >= 50) return 'text-neon-blue';
    if (reputation >= 25) return 'text-yellow-400';
    if (reputation >= 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-bg border border-dark-border rounded-t-xl sm:rounded-xl w-full max-w-lg h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl animate-slide-up sm:animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <GirlAvatar avatarUrl={girl.avatarUrl} name={girl.name} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-white">{girl.name}</h2>
              <p className={`text-sm font-medium ${getRepColor()}`}>
                Rep: {reputation > 0 ? '+' : ''}{reputation}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Start the conversation...
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isPlayer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.isPlayer
                    ? 'bg-neon-purple/30 text-white rounded-br-sm'
                    : 'bg-dark-card text-white rounded-bl-sm'
                }`}
              >
                {msg.isPlayer && (
                  <p className="text-xs text-neon-pink mb-1">{msg.senderName}</p>
                )}
                <p>{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-dark-card text-white rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Propose banner */}
        {canPropose && !isProposing && (
          <div className="px-4 py-3 bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border-t border-neon-purple/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">She's really into you!</p>
                <p className="text-sm text-gray-400">You can ask her out now</p>
              </div>
              <Button
                onClick={() => setIsProposing(true)}
                className="bg-gradient-to-r from-neon-pink to-neon-purple"
              >
                Ask Out
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-dark-border">
          {isProposing && (
            <div className="mb-2 flex items-center justify-between">
              <p className="text-neon-pink text-sm font-medium">
                Make your move! Say something memorable...
              </p>
              <button
                type="button"
                onClick={() => setIsProposing(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isOnCooldown
                  ? `Wait ${cooldownSeconds}s...`
                  : isProposing
                  ? 'Your best line...'
                  : 'Type a message...'
              }
              disabled={isOnCooldown}
              data-testid="chat-input"
              className={`flex-1 px-4 py-3 bg-dark-card border rounded-lg
                text-white placeholder-gray-500
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isProposing ? 'border-neon-pink focus:border-neon-pink' : 'border-dark-border focus:border-neon-purple'}`}
              maxLength={200}
            />
            <Button
              type="submit"
              disabled={isOnCooldown || !inputText.trim()}
              data-testid="send-button"
              className={isProposing ? 'bg-gradient-to-r from-neon-pink to-neon-purple' : ''}
            >
              {isOnCooldown ? `${cooldownSeconds}s` : isProposing ? 'Propose' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
