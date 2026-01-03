import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../hooks/useGame';
import { ChatPanel } from '../components/ChatPanel';
import { GirlAvatar } from '../components/GirlAvatar';
import { VictoryModal } from '../components/VictoryModal';
import { useGameStore } from '../stores/gameStore';
import { useLobbyStore } from '../stores/lobbyStore';

export function Game() {
  const navigate = useNavigate();
  const { isGameActive, lobbyCode } = useSocket();
  const {
    girls,
    currentPlayer,
    selectedGirl,
    selectedGirlMessages,
    selectedGirlRep,
    isSelectedGirlTyping,
    canPropose,
    cooldownRemaining,
    winner,
    selectGirl,
    sendMessage,
    propose,
  } = useGame();

  const handlePlayAgain = () => {
    // Reset game state and go back to home
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
    navigate('/');
  };

  // Redirect if not in an active game
  useEffect(() => {
    if (!isGameActive || !lobbyCode) {
      navigate('/');
    }
  }, [isGameActive, lobbyCode, navigate]);

  if (!girls.length || !currentPlayer) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  // Get reputation color
  const getRepColor = (rep: number) => {
    if (rep >= 75) return 'text-green-400';
    if (rep >= 50) return 'text-neon-blue';
    if (rep >= 25) return 'text-yellow-400';
    if (rep >= 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-dark-bg p-4 relative overflow-hidden">
      {/* Fancy bar background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse 60% 40% at 80% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(30, 10, 40, 0.9) 0%, transparent 60%),
            linear-gradient(180deg, rgba(15, 5, 25, 0.3) 0%, rgba(20, 10, 30, 0.8) 100%)
          `,
        }}
      />
      {/* Neon light effects */}
      <div className="absolute top-0 left-1/4 w-32 h-1 bg-neon-pink blur-xl opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-32 h-1 bg-neon-purple blur-xl opacity-60 pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-2 bg-neon-blue blur-2xl opacity-40 pointer-events-none" />
      {/* Bottom bar counter glow */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-900/20 to-transparent pointer-events-none" />
      {/* Header */}
      <div className="text-center mb-8 pt-8 relative z-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
          The Bar
        </h1>
        <p className="text-gray-400 mt-2">Choose someone to talk to</p>
      </div>

      {/* Girls Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto relative z-10 px-2">
        {girls.map((girl, index) => {
          const rep = currentPlayer.reputation[girl.id] ?? 5;
          return (
            <button
              key={girl.id}
              data-testid="girl-card"
              onClick={() => selectGirl(girl.id)}
              className="bg-dark-card border border-dark-border rounded-xl p-3 sm:p-6
                hover:border-neon-purple hover:shadow-lg hover:shadow-neon-purple/20
                transition-all duration-200 group active:scale-95 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
            >
              {/* Avatar */}
              <div className="mx-auto mb-4 group-hover:scale-105 transition-transform">
                <GirlAvatar avatarUrl={girl.avatarUrl} name={girl.name} size="md" variant="card" />
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-white text-center">
                {girl.name}
              </h3>

              {/* Rep indicator */}
              <div
                data-testid="rep-indicator"
                className={`mt-2 text-center text-sm font-medium ${getRepColor(rep)}`}
              >
                {rep > 0 ? '+' : ''}{rep}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat Panel */}
      {selectedGirl && (
        <ChatPanel
          girl={selectedGirl}
          messages={selectedGirlMessages}
          reputation={selectedGirlRep}
          isTyping={isSelectedGirlTyping}
          cooldownRemaining={cooldownRemaining}
          canPropose={canPropose}
          onSendMessage={(text) => sendMessage(selectedGirl.id, text)}
          onPropose={(text) => propose(selectedGirl.id, text)}
          onClose={() => selectGirl(null)}
        />
      )}

      {/* Victory Modal */}
      {winner && (
        <VictoryModal
          winnerName={winner.winnerName}
          girlName={winner.girlName}
          girlAvatarUrl={winner.girlAvatarUrl}
          isCurrentPlayer={winner.winnerId === currentPlayer?.id}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
