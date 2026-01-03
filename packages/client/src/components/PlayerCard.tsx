import type { Player } from '@rizz/shared';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
}

export function PlayerCard({ player, isCurrentPlayer }: PlayerCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isCurrentPlayer
          ? 'bg-neon-purple/20 border-neon-purple'
          : 'bg-dark-card border-dark-border'
        }`}
    >
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-white font-bold">
        {player.username.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{player.username}</span>
          {isCurrentPlayer && (
            <span className="text-xs text-neon-purple">(you)</span>
          )}
        </div>
        {player.isHost && (
          <span className="text-xs text-neon-pink">Host</span>
        )}
      </div>
    </div>
  );
}
