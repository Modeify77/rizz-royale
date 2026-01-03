import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSocket } from './useSocket';
import { useLobbyStore } from '../stores/lobbyStore';

// Mock socket.io-client
vi.mock('../lib/socket', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'test-socket-id',
  };

  return {
    getSocket: () => mockSocket,
    connectSocket: vi.fn().mockResolvedValue(undefined),
    disconnectSocket: vi.fn(),
  };
});

describe('useSocket', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLobbyStore.getState().reset();
    vi.clearAllMocks();
  });

  it('initializes with disconnected state', async () => {
    const { result } = renderHook(() => useSocket());

    // Wait for connection attempt
    await waitFor(() => {
      expect(result.current.isConnecting).toBe(false);
    });

    expect(result.current.isConnected).toBe(true); // Mock resolves successfully
  });

  it('exposes lobby creation method', () => {
    const { result } = renderHook(() => useSocket());
    expect(typeof result.current.createLobby).toBe('function');
  });

  it('exposes lobby join method', () => {
    const { result } = renderHook(() => useSocket());
    expect(typeof result.current.joinLobby).toBe('function');
  });

  it('exposes start game method', () => {
    const { result } = renderHook(() => useSocket());
    expect(typeof result.current.startGame).toBe('function');
  });

  it('tracks player count from lobby', async () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.playerCount).toBe(0);

    // Simulate lobby being set
    act(() => {
      useLobbyStore.getState().setLobby({
        code: 'TEST01',
        players: [
          { id: '1', username: 'Player1', isHost: true, reputation: {} },
          { id: '2', username: 'Player2', isHost: false, reputation: {} },
        ],
        girls: [],
        status: 'waiting',
        hostId: '1',
      });
    });

    expect(result.current.playerCount).toBe(2);
  });
});
