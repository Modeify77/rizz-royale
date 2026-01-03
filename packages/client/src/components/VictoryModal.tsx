import { GirlAvatar } from './GirlAvatar';
import { Button } from './Button';

interface VictoryModalProps {
  winnerName: string;
  girlName: string;
  girlAvatarUrl: string;
  isCurrentPlayer: boolean;
  onPlayAgain: () => void;
}

export function VictoryModal({
  winnerName,
  girlName,
  girlAvatarUrl,
  isCurrentPlayer,
  onPlayAgain,
}: VictoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-bg border border-dark-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#ff6b9d', '#c084fc', '#60a5fa', '#facc15'][i % 4],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Trophy icon */}
        <div className="text-6xl mb-4">
          {isCurrentPlayer ? '🏆' : '😢'}
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-2">
          {isCurrentPlayer ? (
            <span className="bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
              You Won!
            </span>
          ) : (
            <span className="text-gray-400">Game Over</span>
          )}
        </h2>

        {/* Winner info */}
        <p className="text-gray-400 mb-6">
          {isCurrentPlayer
            ? `You swept ${girlName} off her feet!`
            : `${winnerName} won ${girlName}'s heart`}
        </p>

        {/* Girl avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <GirlAvatar avatarUrl={girlAvatarUrl} name={girlName} size="lg" variant="card" />
            {isCurrentPlayer && (
              <div className="absolute -bottom-2 -right-2 text-3xl">💕</div>
            )}
          </div>
        </div>

        {/* Girl name */}
        <p className="text-xl font-semibold text-white mb-8">{girlName}</p>

        {/* Play again button */}
        <Button
          onClick={onPlayAgain}
          className="w-full bg-gradient-to-r from-neon-pink to-neon-purple"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
}
