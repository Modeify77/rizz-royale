import { useEffect, useState } from 'react';

interface RuleBookProps {
  onClose: () => void;
}

type Tab = 'basics' | 'archetypes' | 'tips';

export function RuleBook({ onClose }: RuleBookProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basics');

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border-2 border-indigo-500 rounded-xl w-[700px] max-h-[500px] flex flex-col shadow-2xl shadow-indigo-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            How to Play Rizz Royale
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-border">
          {(['basics', 'archetypes', 'tips'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'basics' && 'Game Basics'}
              {tab === 'archetypes' && 'The 6 Archetypes'}
              {tab === 'tips' && 'Pro Tips'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basics' && <BasicsContent />}
          {activeTab === 'archetypes' && <ArchetypesContent />}
          {activeTab === 'tips' && <TipsContent />}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dark-border text-center">
          <p className="text-gray-500 text-xs">Press ESC to close</p>
        </div>
      </div>
    </div>
  );
}

function BasicsContent() {
  return (
    <div className="space-y-4 text-gray-300">
      <section>
        <h3 className="text-lg font-semibold text-white mb-2">The Goal</h3>
        <p>
          Be the first player to successfully ask a girl to leave the bar with you.
          You need to build up <span className="text-green-400 font-medium">100 reputation</span> with
          any girl, then propose to her.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Walk around the bar and approach any of the 6 girls</li>
          <li>Press <span className="text-indigo-400 font-bold">E</span> to open chat when near a girl</li>
          <li>Your messages earn you <span className="text-green-400">+rep</span> or <span className="text-red-400">-rep</span> based on how well they match her personality</li>
          <li>Everyone can see the chat, but reputation is private</li>
          <li>When you hit 100 rep, press <span className="text-green-400 font-bold">Q</span> to propose</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Key Rules</h3>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Starting reputation: <span className="text-yellow-400">+5</span> with all girls</li>
          <li>Rep range: <span className="text-red-400">-50</span> to <span className="text-green-400">+100</span></li>
          <li>Message cooldown: <span className="text-indigo-400">5 seconds</span></li>
          <li>Each message can earn you <span className="text-red-400">-5</span> to <span className="text-green-400">+5</span> rep</li>
          <li>If your proposal fumbles, you lose <span className="text-red-400">-10 rep</span></li>
        </ul>
      </section>
    </div>
  );
}

function ArchetypesContent() {
  const archetypes = [
    {
      name: 'The Confident Queen',
      color: 'text-red-400',
      likes: 'Bold statements, self-assured energy, being direct',
      dislikes: 'Hesitation, self-deprecation, asking permission',
      example: '"I don\'t usually talk to girls here, but you looked like you could keep up"',
    },
    {
      name: 'The Softie',
      color: 'text-pink-400',
      likes: 'Genuine emotion, vulnerability, asking about feelings',
      dislikes: 'Bravado, surface-level chat, deflecting with humor',
      example: '"Honestly? I\'m a little nervous. Bars aren\'t usually my scene"',
    },
    {
      name: 'The Joker',
      color: 'text-yellow-400',
      likes: 'Clever wordplay, absurdist humor, playful banter',
      dislikes: 'Being too earnest, boring conversation, trying too hard',
      example: '"Is your name WiFi? Because I\'m feeling a connection... to the bartender"',
    },
    {
      name: 'The Challenge',
      color: 'text-orange-400',
      likes: 'Light teasing, playful challenges, confidence',
      dislikes: 'Simping, excessive compliments, agreeing with everything',
      example: '"Bold drink choice. Let me guess, pineapple on pizza too?"',
    },
    {
      name: 'The Intellectual',
      color: 'text-blue-400',
      likes: 'Thoughtful questions, interesting observations, wit',
      dislikes: 'Small talk, appearance compliments, anti-intellectual vibes',
      example: '"Bars like this are basically modern-day Roman forums. What\'s your take?"',
    },
    {
      name: 'The Romantic',
      color: 'text-purple-400',
      likes: 'Genuine compliments, romantic gestures, chivalry',
      dislikes: 'Cynicism about love, being too casual, treating romance as a game',
      example: '"I saw you from across the room and just had to come say hello"',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm mb-4">
        Each girl has one of these hidden archetypes. Your job is to figure out which one!
      </p>
      <div className="grid grid-cols-2 gap-3">
        {archetypes.map((arch) => (
          <div
            key={arch.name}
            className="bg-dark-bg rounded-lg p-3 border border-dark-border"
          >
            <h4 className={`font-semibold ${arch.color} mb-1`}>{arch.name}</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-green-400">Likes:</span> <span className="text-gray-400">{arch.likes}</span></p>
              <p><span className="text-red-400">Dislikes:</span> <span className="text-gray-400">{arch.dislikes}</span></p>
              <p className="text-gray-500 italic text-[10px] mt-2">"{arch.example}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsContent() {
  return (
    <div className="space-y-4 text-gray-300">
      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Strategy Tips</h3>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <span className="text-yellow-400 font-medium">Observe first</span> - Watch how girls
            respond to other players' messages before committing to a strategy
          </li>
          <li>
            <span className="text-yellow-400 font-medium">Test the waters</span> - Send a few
            different styles of messages to figure out each girl's archetype
          </li>
          <li>
            <span className="text-yellow-400 font-medium">Don't spread thin</span> - Focus on
            1-2 girls rather than trying to charm all 6
          </li>
          <li>
            <span className="text-yellow-400 font-medium">Watch your rep</span> - If you're
            losing rep fast, you've got the wrong approach
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Archetype Tells</h3>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>If she responds coldly to compliments, she might be <span className="text-orange-400">The Challenge</span></li>
          <li>If she loves your jokes, she's probably <span className="text-yellow-400">The Joker</span></li>
          <li>If deep talk gets positive reactions, try <span className="text-blue-400">The Intellectual</span></li>
          <li>If vulnerability works, she's likely <span className="text-pink-400">The Softie</span></li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Proposal Tips</h3>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Don't fumble at 100! Your final message still matters</li>
          <li>Stay in character with what worked to get you there</li>
          <li>A failed proposal costs you 10 rep - make it count!</li>
        </ul>
      </section>
    </div>
  );
}
