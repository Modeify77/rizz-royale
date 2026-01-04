import { useState, useCallback, useEffect, useMemo } from 'react';
import { Application } from 'pixi.js';
import { GameCanvas } from './GameCanvas';
import { useBarMap, getMapData } from './BarMap';
import { usePlayerSprite } from './PlayerSprite';
import { useRemotePlayers } from './RemotePlayers';
import { useGirlSprites } from './GirlSprites';
import { ChatInput, ChatLog, ChatHistoryPanel, useChatSocket } from './ChatPanel';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { useMultiplayerSync } from '../hooks/useMultiplayerSync';
import { useProximity } from '../hooks/useProximity';
import { useGameStore } from '../../stores/gameStore';
import type { PlayerColor, Position } from '../types';
import { WIN_REP } from '@rizz/shared';
import { getSocket } from '../../lib/socket';

interface GameWorldProps {
  playerName: string;
  playerColor: PlayerColor;
  onReady?: () => void;
  multiplayer?: boolean;
}

export function GameWorld({ playerName, playerColor, onReady, multiplayer = false }: GameWorldProps) {
  const [app, setApp] = useState<Application | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hoveredGirlId, setHoveredGirlId] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState<string | null>(null);

  // Set up chat socket listeners
  useChatSocket();

  // Initialize map data once
  const mapData = getMapData();

  // Calculate spawn position once
  const initialPosition = useMemo((): Position => {
    const { playerSpawnArea } = mapData;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * playerSpawnArea.radius;
    return {
      x: playerSpawnArea.x + Math.cos(angle) * radius,
      y: playerSpawnArea.y + Math.sin(angle) * radius,
    };
  }, [mapData]);

  // Handle app ready callback
  const handleAppReady = useCallback((application: Application) => {
    setApp(application);
  }, []);

  // Draw the map when app is ready
  useBarMap(app);

  // Handle E key to toggle chat
  const handleInteract = useCallback(() => {
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  }, [isChatOpen]);

  // Handle Escape to close chat
  const handleEscape = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Handle player movement (disabled when chat is open)
  const { position } = usePlayerMovement({
    app,
    initialPosition,
    mapData,
    enabled: !!app && !isChatOpen,
    onInteract: handleInteract,
    onEscape: handleEscape,
  });

  // Multiplayer sync - sends position and receives other players
  const { remotePlayers } = useMultiplayerSync({
    position,
    enabled: multiplayer && !!app,
  });

  // Get girls from store (works for both multiplayer and local testing)
  const girlPositions = useGameStore((state) => state.girlPositions);
  const girls = useMemo(() => Array.from(girlPositions.values()), [girlPositions]);

  // Get reputation
  const getReputation = useGameStore((state) => state.getReputation);

  // Proximity detection - which girls are nearby (keep running even when chat open)
  const proximityResult = useProximity({
    playerPosition: position,
    enabled: !!app,
  });
  const nearbyGirlIds = proximityResult.nearbyGirlIds;
  const closestGirl = proximityResult.closestGirl as { id: string; name: string; distance: number } | null;

  // Get reputation for closest girl
  const closestGirlRep = closestGirl ? getReputation(closestGirl.id) : 0;

  // Check if any nearby girl can be proposed to (rep >= 100)
  const reputations = useGameStore((state) => state.reputations);
  const proposableGirl = useMemo((): { id: string; name: string; x: number; y: number } | null => {
    for (const girlId of nearbyGirlIds) {
      const rep = reputations[girlId] ?? 5;
      if (rep >= WIN_REP) {
        const girl = girlPositions.get(girlId);
        if (girl) return girl;
      }
    }
    return null;
  }, [nearbyGirlIds, reputations, girlPositions]);

  // Handle Q key to propose
  useEffect(() => {
    if (!proposableGirl || isChatOpen || selectedGirlId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        const socket = getSocket();
        // Simple proposal - just send a default message
        socket.emit('propose', {
          girlId: proposableGirl.id,
          text: "I've had an amazing time talking to you. Want to get out of here?"
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proposableGirl, isChatOpen, selectedGirlId]);

  // Handle click on girl (only open history if nearby)
  const handleGirlClick = useCallback((girlId: string) => {
    if (nearbyGirlIds.has(girlId)) {
      setSelectedGirlId(girlId);
    }
  }, [nearbyGirlIds]);

  // Render girl sprites (before players so they appear behind)
  useGirlSprites(app, girls, nearbyGirlIds, setHoveredGirlId, handleGirlClick);

  // Get hovered girl info for chat log
  const hoveredGirl = hoveredGirlId ? girlPositions.get(hoveredGirlId) : null;
  const hoveredGirlRep = hoveredGirlId ? getReputation(hoveredGirlId) : 0;

  // Get selected girl info for history panel
  const selectedGirl = selectedGirlId ? girlPositions.get(selectedGirlId) : null;
  const selectedGirlRep = selectedGirlId ? getReputation(selectedGirlId) : 0;

  // Render local player sprite
  usePlayerSprite(app, position, playerColor, playerName, true);

  // Render remote player sprites
  useRemotePlayers(app, remotePlayers);

  // Notify when ready
  useEffect(() => {
    if (app) {
      onReady?.();
    }
  }, [app, onReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
          The Bar
        </h1>
        <p className="text-gray-400 text-center text-sm mt-1">
          Use WASD to move • Press E near a girl to chat
        </p>
      </div>

      <div className="relative border-2 border-dark-border rounded-lg overflow-hidden shadow-2xl shadow-neon-purple/20">
        <GameCanvas onAppReady={handleAppReady} />

        {/* Chat log on hover */}
        {hoveredGirl && !isChatOpen && (
          <ChatLog
            girlId={hoveredGirlId!}
            girlName={hoveredGirl.name}
            reputation={hoveredGirlRep}
          />
        )}

        {/* Proximity prompt (when not chatting) */}
        {!isChatOpen && !selectedGirlId && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-3 rounded-lg border border-neon-pink/50">
            <div className="flex items-center gap-3">
              {closestGirl ? (
                <div className="text-center">
                  <p className="text-neon-pink font-medium text-sm">{closestGirl.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-bold ${closestGirlRep >= 50 ? 'text-green-400' : closestGirlRep >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {closestGirlRep >= 0 ? '+' : ''}{closestGirlRep}
                    </span>
                    <span className="text-gray-500 text-xs">rep</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No girls nearby</p>
              )}
              <div className="border-l border-gray-600 pl-3 flex flex-col gap-1">
                <p className="text-white text-sm">
                  Press <span className="text-neon-pink font-bold">E</span> to chat
                </p>
                {proposableGirl && (
                  <p className="text-white text-sm animate-pulse">
                    Press <span className="text-green-400 font-bold">Q</span> to propose to {proposableGirl.name}!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat input (when chatting) */}
        {isChatOpen && (
          <ChatInput onClose={handleEscape} />
        )}

        {/* Chat history panel (when girl clicked) */}
        {selectedGirl && (
          <ChatHistoryPanel
            girlId={selectedGirlId!}
            girlName={selectedGirl.name}
            reputation={selectedGirlRep}
            onClose={() => setSelectedGirlId(null)}
          />
        )}
      </div>

      <div className="mt-4 text-gray-500 text-xs">
        Playing as <span className="text-white font-medium">{playerName}</span>
      </div>
    </div>
  );
}
