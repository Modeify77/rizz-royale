import { useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import { useLobbyStore } from '../stores/lobbyStore';

export function useGame() {
  const {
    selectedGirlId,
    messages,
    typingGirls,
    cooldownRemaining,
    winner,
    selectGirl,
    addMessage,
    setGirlTyping,
    setWinner,
    startCooldown,
    updateCooldown,
  } = useGameStore();

  const { girls, currentPlayer } = useLobbyStore();

  // Set up socket event listeners for chat
  useEffect(() => {
    const socket = getSocket();

    // Player message appears immediately
    socket.on('message-sent', ({ message }) => {
      addMessage(message.girlId, message);
    });

    // Girl starts typing
    socket.on('girl-typing', ({ girlId }) => {
      setGirlTyping(girlId, true);
    });

    // Girl's response arrives
    socket.on('girl-response', ({ message }) => {
      setGirlTyping(message.girlId, false);
      addMessage(message.girlId, message);
    });

    // Proposal sent
    socket.on('proposal-sent', ({ message }) => {
      addMessage(message.girlId, message);
    });

    // Proposal result
    socket.on('proposal-result', ({ girlId, response }) => {
      setGirlTyping(girlId, false);
      addMessage(girlId, response);
    });

    socket.on('rep-update', ({ girlId, newRep }) => {
      // Update player reputation in lobby store
      useLobbyStore.getState().setCurrentPlayer({
        ...useLobbyStore.getState().currentPlayer!,
        reputation: {
          ...useLobbyStore.getState().currentPlayer!.reputation,
          [girlId]: newRep,
        },
      });
    });

    // Game won
    socket.on('game-won', ({ winnerId, winnerName, girlName, girlAvatarUrl }) => {
      setWinner({ winnerId, winnerName, girlName, girlAvatarUrl });
    });

    return () => {
      socket.off('message-sent');
      socket.off('girl-typing');
      socket.off('girl-response');
      socket.off('proposal-sent');
      socket.off('proposal-result');
      socket.off('rep-update');
      socket.off('game-won');
    };
  }, [addMessage, setGirlTyping, setWinner]);

  // Cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      updateCooldown();
    }, 100);

    return () => clearInterval(interval);
  }, [updateCooldown]);

  // Send message action
  const sendMessage = useCallback(
    (girlId: string, text: string) => {
      const socket = getSocket();
      socket.emit('send-message', { girlId, text });
      startCooldown();
    },
    [startCooldown]
  );

  // Propose action
  const propose = useCallback(
    (girlId: string, text: string) => {
      const socket = getSocket();
      socket.emit('propose', { girlId, text });
    },
    []
  );

  // Get messages for selected girl
  const selectedGirlMessages = selectedGirlId ? messages[selectedGirlId] || [] : [];

  // Get selected girl data
  const selectedGirl = girls.find((g) => g.id === selectedGirlId);

  // Get reputation for selected girl
  const selectedGirlRep = selectedGirlId
    ? currentPlayer?.reputation[selectedGirlId] ?? 5
    : 5;

  // Check if selected girl is typing
  const isSelectedGirlTyping = selectedGirlId ? typingGirls.has(selectedGirlId) : false;

  // Check if can propose (rep >= 100)
  const canPropose = selectedGirlRep >= 100;

  return {
    // State
    selectedGirlId,
    selectedGirl,
    selectedGirlMessages,
    selectedGirlRep,
    isSelectedGirlTyping,
    canPropose,
    cooldownRemaining,
    winner,
    girls,
    currentPlayer,

    // Actions
    selectGirl,
    sendMessage,
    propose,
  };
}
