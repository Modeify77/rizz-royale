import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { useLobbyStore } from '../stores/lobbyStore';
import { GameWorld } from '../game';
import type { PlayerColor } from '../game';

const VICTORY_COUNTDOWN = 10; // seconds

export function Game() {
  const navigate = useNavigate();
  const { isGameActive, lobbyCode, currentPlayer } = useSocket();
  const winner = useGameStore((state) => state.winner);
  const [countdown, setCountdown] = useState(VICTORY_COUNTDOWN);

  const handlePlayAgain = () => {
    // Reset game state and go back to home
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
    navigate('/');
  };

  // Countdown timer when someone wins
  useEffect(() => {
    if (!winner) {
      setCountdown(VICTORY_COUNTDOWN);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-return to home when countdown ends
          handlePlayAgain();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [winner]);

  // Redirect if not in an active game
  useEffect(() => {
    if (!isGameActive || !lobbyCode) {
      navigate('/');
    }
  }, [isGameActive, lobbyCode, navigate]);

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  // Get player color (default to purple if not set)
  const playerColor: PlayerColor = (currentPlayer.color as PlayerColor) || 'purple';

  return (
    <>
      <GameWorld
        playerName={currentPlayer.username}
        playerColor={playerColor}
        multiplayer={true}
        onReady={() => console.log('Game world ready!')}
      />

      {/* Victory Modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-dark-card p-8 rounded-xl text-center max-w-md border border-neon-pink/30 shadow-2xl shadow-neon-pink/20">
            {/* Confetti effect */}
            <div className="text-4xl mb-4 animate-bounce">🎉</div>

            <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent mb-2">
              {winner.winnerName} wins!
            </h2>

            <p className="text-gray-300 text-lg mb-6">
              They swept <span className="text-neon-pink font-medium">{winner.girlName}</span> off her feet
            </p>

            {/* Countdown */}
            <div className="mb-6">
              <div className="text-gray-500 text-sm mb-2">Returning to lobby in</div>
              <div className="text-4xl font-bold text-white">{countdown}</div>
            </div>

            <button
              onClick={handlePlayAgain}
              className="px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 rounded-lg text-white transition-colors"
            >
              Return Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
