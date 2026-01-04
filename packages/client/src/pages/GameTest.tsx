import { useEffect } from 'react';
import { GameWorld } from '../game';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../lib/socket';
import type { GirlPosition, Archetype, ChatMessage } from '@rizz/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Test girls with archetypes
interface TestGirl extends GirlPosition {
  archetype: Archetype;
}

const TEST_GIRLS: TestGirl[] = [
  { id: 'girl-1', name: 'Amber', x: 200, y: 150, archetype: 'CONFIDENT' },
  { id: 'girl-2', name: 'Luna', x: 400, y: 120, archetype: 'SOFTIE' },
  { id: 'girl-3', name: 'Ruby', x: 600, y: 150, archetype: 'JOKER' },
  { id: 'girl-4', name: 'Jade', x: 150, y: 350, archetype: 'CHALLENGE' },
  { id: 'girl-5', name: 'Violet', x: 400, y: 450, archetype: 'INTELLECTUAL' },
  { id: 'girl-6', name: 'Scarlet', x: 650, y: 350, archetype: 'ROMANTIC' },
];

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function GameTest() {
  const {
    updateGirlPositions,
    addMessage,
    setGirlTyping,
    updateReputation,
  } = useGameStore();

  // Set up socket handler to use real LLM via test endpoint
  useEffect(() => {
    const socket = getSocket();

    const handleSendMessage = async ({ girlId, text }: { girlId: string; text: string }) => {
      const girl = TEST_GIRLS.find(g => g.id === girlId);
      if (!girl) return;

      // Add player message immediately
      const playerMessage: ChatMessage = {
        id: generateMessageId(),
        girlId,
        senderId: 'test-player',
        senderName: 'TestPlayer',
        text,
        isPlayer: true,
        timestamp: Date.now(),
      };
      addMessage(girlId, playerMessage);

      // Show typing indicator
      setGirlTyping(girlId, true);

      try {
        // Call real LLM via test endpoint
        const response = await fetch(`${API_URL}/api/test-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            girlId,
            girlName: girl.name,
            archetype: girl.archetype,
            playerName: 'TestPlayer',
            text,
          }),
        });

        const data = await response.json();

        setGirlTyping(girlId, false);

        if (response.ok) {
          // Add girl's response
          const girlMessage: ChatMessage = {
            id: generateMessageId(),
            girlId,
            senderId: girlId,
            senderName: girl.name,
            text: data.response,
            isPlayer: false,
            timestamp: Date.now(),
          };
          addMessage(girlId, girlMessage);

          // Update reputation
          updateReputation(girlId, data.score);

          console.log(`${girl.name} [${girl.archetype}]: "${data.response}" | Score: ${data.score > 0 ? '+' : ''}${data.score} | Rep: ${data.newRep}`);
        } else {
          console.error('Test chat error:', data.error);
        }
      } catch (error) {
        console.error('Test chat fetch error:', error);
        setGirlTyping(girlId, false);
      }
    };

    // Intercept socket emit for send-message
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(event: string, ...args: unknown[]) {
      if (event === 'send-message') {
        handleSendMessage(args[0] as { girlId: string; text: string });
        return socket; // Don't actually send to server via socket
      }
      return originalEmit(event, ...args);
    } as typeof socket.emit;

    return () => {
      socket.emit = originalEmit; // Restore original
    };
  }, [addMessage, setGirlTyping, updateReputation]);

  // Simulate girl AI movement locally
  useEffect(() => {
    // Initialize girls
    updateGirlPositions(TEST_GIRLS.map(({ id, name, x, y }) => ({ id, name, x, y })));

    // Simple local AI simulation
    const girls = TEST_GIRLS.map(g => ({
      ...g,
      targetX: g.x,
      targetY: g.y,
      state: 'idle' as const,
    }));

    const interval = setInterval(() => {
      girls.forEach(girl => {
        if (girl.state === 'idle' && Math.random() < 0.02) {
          // Pick new target
          girl.targetX = 50 + Math.random() * 700;
          girl.targetY = 50 + Math.random() * 500;
          girl.state = 'walking';
        } else if (girl.state === 'walking') {
          const dx = girl.targetX - girl.x;
          const dy = girl.targetY - girl.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            girl.x = girl.targetX;
            girl.y = girl.targetY;
            girl.state = 'idle';
          } else {
            girl.x += (dx / dist) * 0.8;
            girl.y += (dy / dist) * 0.8;
          }
        }
      });

      updateGirlPositions(girls.map(({ id, name, x, y }) => ({ id, name, x, y })));
    }, 50);

    return () => clearInterval(interval);
  }, [updateGirlPositions]);

  return (
    <GameWorld
      playerName="TestPlayer"
      playerColor="purple"
      onReady={() => console.log('Game ready!')}
    />
  );
}
