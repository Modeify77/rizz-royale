import type { Socket, Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, ChatMessage } from '@rizz/shared';
import { MESSAGE_COOLDOWN_MS, MIN_REP, MAX_REP, WIN_REP, REJECTION_PENALTY } from '@rizz/shared';
import * as LobbyManager from '../managers/LobbyManager.js';
import { generateGirlResponse, scoreMessage, evaluateProposal } from '../services/llm.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track last message time per player for cooldown
const playerCooldowns = new Map<string, number>();

// Track conversation history per girl per lobby
const conversationHistory = new Map<string, Array<{ role: 'player' | 'girl'; text: string }>>();

function getConversationKey(lobbyCode: string, girlId: string): string {
  return `${lobbyCode}:${girlId}`;
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function registerChatHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('send-message', async ({ girlId, text }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    const player = LobbyManager.getPlayer(socket.id);

    if (!lobby || !player) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    if (lobby.status !== 'playing') {
      socket.emit('error', { message: 'Game not in progress' });
      return;
    }

    // Check cooldown
    const lastMessageTime = playerCooldowns.get(socket.id) || 0;
    const now = Date.now();
    if (now - lastMessageTime < MESSAGE_COOLDOWN_MS) {
      const remaining = Math.ceil((MESSAGE_COOLDOWN_MS - (now - lastMessageTime)) / 1000);
      socket.emit('error', { message: `Wait ${remaining}s before sending another message` });
      return;
    }

    // Find the girl
    const girl = lobby.girls.find((g) => g.id === girlId);
    if (!girl) {
      socket.emit('error', { message: 'Invalid girl' });
      return;
    }

    // Update cooldown immediately
    playerCooldowns.set(socket.id, now);

    // Get current reputation
    const currentRep = player.reputation[girlId] || 0;

    // Get conversation history for this girl
    const historyKey = getConversationKey(lobby.code, girlId);
    const history = conversationHistory.get(historyKey) || [];

    // Create player message
    const playerMessage: ChatMessage = {
      id: generateMessageId(),
      girlId,
      senderId: socket.id,
      senderName: player.username,
      text,
      isPlayer: true,
      timestamp: now,
    };

    // Immediately broadcast player's message to all players
    io.to(lobby.code).emit('message-sent', { message: playerMessage });

    // Show typing indicator
    io.to(lobby.code).emit('girl-typing', { girlId });

    try {
      // Generate girl's response using LLM (runs in background while typing shows)
      const [responseText, score] = await Promise.all([
        generateGirlResponse({
          girlName: girl.name,
          archetype: girl.archetype,
          playerName: player.username,
          reputation: currentRep,
          message: text,
          conversationHistory: history,
        }),
        scoreMessage({
          archetype: girl.archetype,
          message: text,
          reputation: currentRep,
        }),
      ]);

      // Update conversation history
      history.push({ role: 'player', text });
      history.push({ role: 'girl', text: responseText });
      // Keep only last 10 messages
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }
      conversationHistory.set(historyKey, history);

      const girlResponse: ChatMessage = {
        id: generateMessageId(),
        girlId,
        senderId: girlId,
        senderName: girl.name,
        text: responseText,
        isPlayer: false,
        timestamp: Date.now(),
      };

      // Broadcast girl's response
      io.to(lobby.code).emit('girl-response', { message: girlResponse });

      // Calculate new reputation
      const newRep = Math.max(MIN_REP, Math.min(MAX_REP, currentRep + score));
      player.reputation[girlId] = newRep;

      // Send private rep update only to the player who sent the message
      socket.emit('rep-update', {
        girlId,
        newRep,
        change: score,
      });

      console.log(
        `${player.username} -> ${girl.name} [${girl.archetype}]: "${text}" | Score: ${score > 0 ? '+' : ''}${score} | Rep: ${newRep}`
      );

      // Check for win condition
      if (newRep >= WIN_REP) {
        console.log(`${player.username} can now propose to ${girl.name}!`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message. Try again.' });
    }
  });

  // Handle proposal
  socket.on('propose', async ({ girlId, text }) => {
    const lobby = LobbyManager.getLobbyByPlayerId(socket.id);
    const player = LobbyManager.getPlayer(socket.id);

    if (!lobby || !player) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    if (lobby.status !== 'playing') {
      socket.emit('error', { message: 'Game not in progress' });
      return;
    }

    const girl = lobby.girls.find((g) => g.id === girlId);
    if (!girl) {
      socket.emit('error', { message: 'Invalid girl' });
      return;
    }

    const currentRep = player.reputation[girlId] || 0;
    if (currentRep < WIN_REP) {
      socket.emit('error', { message: `Need ${WIN_REP} reputation to propose` });
      return;
    }

    // Get conversation history
    const historyKey = getConversationKey(lobby.code, girlId);
    const history = conversationHistory.get(historyKey) || [];

    // Create proposal message
    const proposalMessage: ChatMessage = {
      id: generateMessageId(),
      girlId,
      senderId: socket.id,
      senderName: player.username,
      text,
      isPlayer: true,
      timestamp: Date.now(),
    };

    // Broadcast proposal message immediately
    io.to(lobby.code).emit('proposal-sent', { message: proposalMessage });

    // Show typing indicator
    io.to(lobby.code).emit('girl-typing', { girlId });

    try {
      // Evaluate the proposal
      const result = await evaluateProposal({
        girlName: girl.name,
        archetype: girl.archetype,
        playerName: player.username,
        reputation: currentRep,
        proposalMessage: text,
        conversationHistory: history,
      });

      const responseMessage: ChatMessage = {
        id: generateMessageId(),
        girlId,
        senderId: girlId,
        senderName: girl.name,
        text: result.response,
        isPlayer: false,
        timestamp: Date.now(),
      };

      // Broadcast the result to all players
      io.to(lobby.code).emit('proposal-result', {
        girlId,
        accepted: result.accepted,
        response: responseMessage,
        proposerId: socket.id,
        proposerName: player.username,
      });

      if (result.accepted) {
        // Game won!
        lobby.status = 'finished';
        io.to(lobby.code).emit('game-won', {
          winnerId: socket.id,
          winnerName: player.username,
          girlName: girl.name,
          girlAvatarUrl: girl.avatarUrl,
        });
        console.log(`🎉 ${player.username} won the game with ${girl.name}!`);
      } else {
        // Rejected - apply penalty
        const newRep = Math.max(MIN_REP, currentRep - REJECTION_PENALTY);
        player.reputation[girlId] = newRep;
        socket.emit('rep-update', {
          girlId,
          newRep,
          change: -REJECTION_PENALTY,
        });
        console.log(`💔 ${player.username} was rejected by ${girl.name}. Rep: ${newRep}`);
      }
    } catch (error) {
      console.error('Error processing proposal:', error);
      socket.emit('error', { message: 'Failed to process proposal. Try again.' });
    }
  });
}

// Clean up cooldown on disconnect
export function cleanupPlayerCooldown(playerId: string): void {
  playerCooldowns.delete(playerId);
}

// Clean up conversation history when lobby is deleted
export function cleanupLobbyHistory(lobbyCode: string): void {
  for (const key of conversationHistory.keys()) {
    if (key.startsWith(`${lobbyCode}:`)) {
      conversationHistory.delete(key);
    }
  }
}
