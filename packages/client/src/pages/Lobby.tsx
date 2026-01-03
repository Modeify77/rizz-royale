import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';
import { useSocket } from '../hooks/useSocket';
import { MIN_PLAYERS } from '@rizz/shared';

export function Lobby() {
  const navigate = useNavigate();
  const {
    lobby,
    currentPlayer,
    lobbyCode,
    isHost,
    playerCount,
    startGame,
    leaveLobby,
    error,
    isGameActive,
  } = useSocket();

  // Redirect to home if no lobby
  useEffect(() => {
    if (!lobbyCode) {
      navigate('/');
    }
  }, [lobbyCode, navigate]);

  // Navigate to game when it starts
  useEffect(() => {
    if (isGameActive) {
      navigate('/game');
    }
  }, [isGameActive, navigate]);

  if (!lobby || !currentPlayer) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const canStart = isHost && playerCount >= MIN_PLAYERS;

  const handleLeave = () => {
    leaveLobby();
    navigate('/');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyCode || '');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center p-4 pt-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Waiting Room</h1>
        <p className="text-gray-400">Share the code with your friends</p>
      </div>

      {/* Lobby Code */}
      <button
        onClick={handleCopyCode}
        className="mb-8 group"
        title="Click to copy"
      >
        <div
          data-testid="lobby-code"
          className="text-5xl font-mono font-bold tracking-widest text-white
            bg-dark-card border-2 border-dashed border-neon-purple rounded-xl
            px-8 py-4 group-hover:border-neon-pink transition-colors"
        >
          {lobbyCode}
        </div>
        <p className="text-gray-500 text-sm mt-2 group-hover:text-gray-400">
          Click to copy
        </p>
      </button>

      {/* Players List */}
      <div className="w-full max-w-md mb-8">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Players ({playerCount}/6)
        </h2>
        <div className="space-y-3">
          {lobby.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayer.id}
            />
          ))}
        </div>

        {/* Empty slots */}
        {Array.from({ length: 6 - playerCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="mt-3 p-3 rounded-lg border border-dashed border-dark-border text-gray-600 text-center"
          >
            Waiting for player...
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        {isHost ? (
          <>
            <Button
              size="lg"
              onClick={startGame}
              disabled={!canStart}
              className="w-full"
            >
              {playerCount < MIN_PLAYERS
                ? `Need ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount > 1 ? 's' : ''}`
                : 'Start Game'}
            </Button>
            <p className="text-gray-500 text-sm text-center">
              {playerCount < MIN_PLAYERS
                ? 'Waiting for more players to join...'
                : 'Ready to start!'}
            </p>
          </>
        ) : (
          <p className="text-gray-400 text-center py-4">
            Waiting for host to start the game...
          </p>
        )}

        <Button
          variant="ghost"
          onClick={handleLeave}
          className="w-full"
        >
          Leave Lobby
        </Button>
      </div>
    </div>
  );
}
