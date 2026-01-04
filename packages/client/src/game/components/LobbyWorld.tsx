import { useState, useCallback, useEffect, useMemo } from 'react';
import { Application } from 'pixi.js';
import { GameCanvas } from './GameCanvas';
import { useLobbyMap, getLobbyMapData } from './LobbyMap';
import { usePlayerSprite } from './PlayerSprite';
import { useRemotePlayers } from './RemotePlayers';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { useLobbySync } from '../hooks/useLobbySync';
import { useLobbyStore } from '../../stores/lobbyStore';
import type { PlayerColor, Position } from '../types';
import { RuleBook } from './RuleBook';

interface LobbyWorldProps {
  onReady?: () => void;
}

// Rule book interaction zone
const RULEBOOK_ZONE = {
  x: 370,
  y: 270,
  radius: 60,
};

export function LobbyWorld({ onReady }: LobbyWorldProps) {
  const [app, setApp] = useState<Application | null>(null);
  const [showRuleBook, setShowRuleBook] = useState(false);

  const { currentPlayer } = useLobbyStore();
  const playerColor = (currentPlayer?.color as PlayerColor) || 'purple';
  const playerName = currentPlayer?.username || 'Player';

  // Initialize map data once
  const mapData = getLobbyMapData();

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

  // Handle app ready
  const handleAppReady = useCallback((application: Application) => {
    setApp(application);
  }, []);

  // Draw the lobby map
  useLobbyMap(app);

  // Handle E key to interact with rule book
  const handleInteract = useCallback(() => {
    // Check if player is near rule book (center table)
    // This will be checked in the movement hook
  }, []);

  // Handle player movement
  const { position } = usePlayerMovement({
    app,
    initialPosition,
    mapData,
    enabled: !!app && !showRuleBook,
    onInteract: handleInteract,
  });

  // Check proximity to rule book zone
  const isNearRuleBook = useMemo(() => {
    const dx = position.x - RULEBOOK_ZONE.x;
    const dy = position.y - RULEBOOK_ZONE.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < RULEBOOK_ZONE.radius;
  }, [position.x, position.y]);

  // Handle E key for rule book
  useEffect(() => {
    if (!app || showRuleBook) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'e' || e.key === 'E') && isNearRuleBook) {
        e.preventDefault();
        setShowRuleBook(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [app, isNearRuleBook, showRuleBook]);

  // Sync positions with other players
  const { remotePlayers } = useLobbySync({
    position,
    enabled: !!app,
  });

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
    <div className="relative">
      <div className="border-2 border-dark-border rounded-lg overflow-hidden shadow-2xl shadow-indigo-500/20">
        <GameCanvas onAppReady={handleAppReady} />

        {/* Rule book prompt */}
        {isNearRuleBook && !showRuleBook && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-3 rounded-lg border border-indigo-500/50">
            <p className="text-white text-sm">
              Press <span className="text-indigo-400 font-bold">E</span> to read the Rule Book
            </p>
          </div>
        )}
      </div>

      {/* Rule book modal */}
      {showRuleBook && (
        <RuleBook onClose={() => setShowRuleBook(false)} />
      )}
    </div>
  );
}
