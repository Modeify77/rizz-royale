import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useSocket } from '../hooks/useSocket';
import { getSocket } from '../lib/socket';
import { MIN_PLAYERS, PLAYER_COLORS, type PlayerColor } from '@rizz/shared';
import { LobbyWorld } from '../game/components/LobbyWorld';

// Visual display colors for each player color option
const COLOR_DISPLAY: Record<PlayerColor, { bg: string; border: string; label: string }> = {
  red: { bg: 'bg-red-500', border: 'border-red-400', label: 'Red' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-400', label: 'Blue' },
  green: { bg: 'bg-green-500', border: 'border-green-400', label: 'Green' },
  yellow: { bg: 'bg-yellow-500', border: 'border-yellow-400', label: 'Yellow' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-400', label: 'Purple' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-400', label: 'Orange' },
};

// Map player colors to tailwind text colors
const PLAYER_TEXT_COLORS: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
};

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

  // Get current player's color from server state
  const selectedColor = (currentPlayer?.color as PlayerColor) || 'purple';

  // Get colors already taken by other players
  const takenColors = new Set(
    lobby.players
      .filter((p) => p.id !== currentPlayer?.id && p.color)
      .map((p) => p.color as PlayerColor)
  );

  const handleColorSelect = (color: PlayerColor) => {
    if (takenColors.has(color)) return;
    const socket = getSocket();
    socket.emit('select-color', { color });
  };

  const handleLeave = () => {
    leaveLobby();
    navigate('/');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyCode || '');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="flex gap-4">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-4">
          {/* Lobby Code Card */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Lobby Code</p>
            <button
              onClick={handleCopyCode}
              className="w-full group"
              title="Click to copy"
            >
              <div
                data-testid="lobby-code"
                className="text-2xl font-mono font-bold tracking-widest text-white
                  bg-dark-bg border border-dashed border-indigo-500/50 rounded-lg
                  px-4 py-2 group-hover:border-indigo-400 transition-colors text-center"
              >
                {lobbyCode}
              </div>
              <p className="text-gray-600 text-xs mt-1 group-hover:text-gray-400">
                Click to copy
              </p>
            </button>
          </div>

          {/* Players List */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 flex-1">
            <p className="text-gray-400 text-xs mb-3 uppercase tracking-wider">
              Players ({playerCount}/6)
            </p>
            <div className="space-y-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    player.id === currentPlayer.id
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : 'bg-dark-bg'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      player.color ? COLOR_DISPLAY[player.color as PlayerColor]?.bg : 'bg-gray-500'
                    }`}
                  />
                  <span className={`text-sm flex-1 truncate ${
                    player.color ? PLAYER_TEXT_COLORS[player.color] : 'text-gray-300'
                  }`}>
                    {player.username}
                  </span>
                  {player.isHost && (
                    <span className="text-yellow-500 text-xs">HOST</span>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 6 - playerCount }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-dark-bg opacity-30"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-700 border border-dashed border-gray-600" />
                  <span className="text-sm text-gray-600">Empty</span>
                </div>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-3 uppercase tracking-wider">Your Color</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PLAYER_COLORS.map((color) => {
                const isTaken = takenColors.has(color);
                const isSelected = selectedColor === color;
                const display = COLOR_DISPLAY[color];

                return (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    disabled={isTaken}
                    className={`
                      w-8 h-8 rounded-full transition-all
                      ${display.bg}
                      ${isSelected ? 'ring-2 ring-white scale-110' : ''}
                      ${isTaken ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
                    `}
                    title={isTaken ? `${display.label} (taken)` : display.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            {isHost ? (
              <Button
                size="lg"
                onClick={startGame}
                disabled={!canStart}
                className="w-full"
              >
                {playerCount < MIN_PLAYERS
                  ? `Need ${MIN_PLAYERS - playerCount} more`
                  : 'Start Game'}
              </Button>
            ) : (
              <div className="bg-dark-card border border-dark-border rounded-lg p-3 text-center">
                <p className="text-gray-400 text-sm">Waiting for host...</p>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={handleLeave}
              className="w-full text-sm"
            >
              Leave Lobby
            </Button>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col items-center">
          <div className="mb-2">
            <p className="text-gray-400 text-center text-sm">
              Use <span className="text-indigo-400 font-bold">WASD</span> to move
              {' '}<span className="text-gray-600">|</span>{' '}
              Walk to the table to read the <span className="text-indigo-400 font-bold">Rule Book</span>
            </p>
          </div>
          <LobbyWorld />
        </div>
      </div>
    </div>
  );
}
