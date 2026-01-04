import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@rizz/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
      upgrade: true, // Upgrade from polling to websocket when possible
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = getSocket();

    if (s.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);

    s.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    s.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    s.connect();
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}
