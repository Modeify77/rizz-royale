import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@rizz/shared';
import { registerLobbyHandlers } from '../src/handlers/lobbyHandlers.js';
import * as LobbyManager from '../src/managers/LobbyManager.js';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

describe('Socket Server', () => {
  let io: GameServer;
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  function connectTestSocket(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const socket = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
      });
      socket.on('connect', () => resolve(socket));
    });
  }

  function emitAndWait<T>(
    socket: ClientSocket,
    event: string,
    data: unknown,
    responseEvent?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

      // Listen for error event
      socket.once('error', (err: { message: string }) => {
        clearTimeout(timeout);
        resolve({ error: err.message } as T);
      });

      // Listen for the expected response event
      if (responseEvent) {
        socket.once(responseEvent, (response: T) => {
          clearTimeout(timeout);
          resolve(response);
        });
      }

      socket.emit(event, data);

      // If no response event specified, resolve after a short delay
      if (!responseEvent) {
        setTimeout(() => {
          clearTimeout(timeout);
          resolve({} as T);
        }, 100);
      }
    });
  }

  beforeAll(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      io = new Server(httpServer, {
        cors: { origin: '*' },
      });

      io.on('connection', (socket) => {
        registerLobbyHandlers(io, socket);
      });

      httpServer.listen(() => {
        const address = httpServer.address();
        port = typeof address === 'object' && address ? address.port : 3001;
        resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      io.close();
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    LobbyManager.clearAllLobbies();
  });

  it('accepts connections', async () => {
    const socket = await connectTestSocket();
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it('creates lobby and returns code', async () => {
    const socket = await connectTestSocket();

    const response = await emitAndWait<{ lobbyCode: string }>(
      socket,
      'create-lobby',
      { username: 'Player1' },
      'lobby-created'
    );

    expect(response.lobbyCode).toMatch(/^[A-Z0-9]{6}$/);
    socket.disconnect();
  });

  it('allows joining existing lobby', async () => {
    const host = await connectTestSocket();

    const createResponse = await emitAndWait<{ lobbyCode: string }>(
      host,
      'create-lobby',
      { username: 'Host' },
      'lobby-created'
    );

    const player = await connectTestSocket();

    const joinResponse = await emitAndWait<{ lobby: { players: unknown[] } }>(
      player,
      'join-lobby',
      { lobbyCode: createResponse.lobbyCode, username: 'Player2' },
      'lobby-joined'
    );

    expect(joinResponse.lobby.players).toHaveLength(2);

    host.disconnect();
    player.disconnect();
  });

  it('rejects invalid lobby code', async () => {
    const socket = await connectTestSocket();

    const response = await emitAndWait<{ error: string }>(
      socket,
      'join-lobby',
      { lobbyCode: 'XXXXXX', username: 'Player' },
      'error'
    );

    expect(response.error).toBe('Lobby not found');
    socket.disconnect();
  });

  it('enforces 6 player maximum', async () => {
    const sockets: ClientSocket[] = [];

    // Create lobby with host
    const host = await connectTestSocket();
    sockets.push(host);

    const createResponse = await emitAndWait<{ lobbyCode: string }>(
      host,
      'create-lobby',
      { username: 'Host' },
      'lobby-created'
    );

    // Join 5 more players (total 6)
    for (let i = 2; i <= 6; i++) {
      const player = await connectTestSocket();
      sockets.push(player);

      await emitAndWait(
        player,
        'join-lobby',
        { lobbyCode: createResponse.lobbyCode, username: `Player${i}` },
        'lobby-joined'
      );
    }

    // 7th player should be rejected
    const extraPlayer = await connectTestSocket();
    sockets.push(extraPlayer);

    const response = await emitAndWait<{ error: string }>(
      extraPlayer,
      'join-lobby',
      { lobbyCode: createResponse.lobbyCode, username: 'Player7' },
      'error'
    );

    expect(response.error).toBe('Lobby is full');

    // Cleanup
    sockets.forEach((s) => s.disconnect());
  });

  it('notifies other players when someone joins', async () => {
    const host = await connectTestSocket();

    const createResponse = await emitAndWait<{ lobbyCode: string }>(
      host,
      'create-lobby',
      { username: 'Host' },
      'lobby-created'
    );

    // Set up listener for player-joined on host
    const playerJoinedPromise = new Promise<{ player: { username: string } }>((resolve) => {
      host.once('player-joined', resolve);
    });

    const player = await connectTestSocket();

    await emitAndWait(
      player,
      'join-lobby',
      { lobbyCode: createResponse.lobbyCode, username: 'Player2' },
      'lobby-joined'
    );

    const notification = await playerJoinedPromise;
    expect(notification.player.username).toBe('Player2');

    host.disconnect();
    player.disconnect();
  });

  it('handles player disconnect', async () => {
    const host = await connectTestSocket();

    const createResponse = await emitAndWait<{ lobbyCode: string }>(
      host,
      'create-lobby',
      { username: 'Host' },
      'lobby-created'
    );

    const player = await connectTestSocket();

    await emitAndWait(
      player,
      'join-lobby',
      { lobbyCode: createResponse.lobbyCode, username: 'Player2' },
      'lobby-joined'
    );

    // Set up listener for player-left on host
    const playerLeftPromise = new Promise<{ playerId: string }>((resolve) => {
      host.once('player-left', resolve);
    });

    // Disconnect the player
    player.disconnect();

    const notification = await playerLeftPromise;
    expect(notification.playerId).toBeDefined();

    host.disconnect();
  });

  it('rejects duplicate username in same lobby', async () => {
    const host = await connectTestSocket();

    const createResponse = await emitAndWait<{ lobbyCode: string }>(
      host,
      'create-lobby',
      { username: 'Player1' },
      'lobby-created'
    );

    const player = await connectTestSocket();

    const response = await emitAndWait<{ error: string }>(
      player,
      'join-lobby',
      { lobbyCode: createResponse.lobbyCode, username: 'Player1' },
      'error'
    );

    expect(response.error).toBe('Username already taken in this lobby');

    host.disconnect();
    player.disconnect();
  });
});
