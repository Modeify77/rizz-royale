import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ServerToClientEvents, ClientToServerEvents, Archetype } from '@rizz/shared';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { registerChatHandlers, cleanupPlayerCooldown } from './handlers/chatHandlers.js';
import { generateGirlResponse, scoreMessage } from './services/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);

// Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:5173',
  'https://rizz-royale.vercel.app',
  /\.vercel\.app$/,  // Allow all Vercel preview deployments
  process.env.CLIENT_URL,
].filter(Boolean);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check against allowed origins
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow anyway for now to debug
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: true, // Allow all origins for REST endpoints
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Test chat endpoint - allows testing LLM without a lobby
const testConversationHistory = new Map<string, Array<{ role: 'player' | 'girl'; text: string }>>();
const testReputations = new Map<string, number>();

app.post('/api/test-chat', async (req, res) => {
  try {
    const { girlId, girlName, archetype, playerName, text } = req.body as {
      girlId: string;
      girlName: string;
      archetype: Archetype;
      playerName: string;
      text: string;
    };

    if (!girlId || !girlName || !archetype || !playerName || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or initialize reputation
    const repKey = `${playerName}:${girlId}`;
    let reputation = testReputations.get(repKey) ?? 5;

    // Get conversation history
    const historyKey = `test:${girlId}`;
    const history = testConversationHistory.get(historyKey) || [];

    // Generate response and score in parallel
    const [responseText, score] = await Promise.all([
      generateGirlResponse({
        girlName,
        archetype,
        playerName,
        reputation,
        message: text,
        conversationHistory: history,
      }),
      scoreMessage({
        archetype,
        message: text,
        reputation,
      }),
    ]);

    // Update conversation history
    history.push({ role: 'player', text });
    history.push({ role: 'girl', text: responseText });
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    testConversationHistory.set(historyKey, history);

    // Update reputation
    const newRep = Math.max(-50, Math.min(100, reputation + score));
    testReputations.set(repKey, newRep);

    console.log(`[TEST] ${playerName} -> ${girlName} [${archetype}]: "${text}" | Score: ${score > 0 ? '+' : ''}${score} | Rep: ${newRep}`);

    res.json({
      response: responseText,
      score,
      newRep,
    });
  } catch (error) {
    console.error('Test chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register all handlers
  registerLobbyHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    cleanupPlayerCooldown(socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { io, app, httpServer };
