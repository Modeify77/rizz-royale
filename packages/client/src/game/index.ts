// Components
export { GameCanvas, GAME_WIDTH, GAME_HEIGHT } from './components/GameCanvas';
export { GameWorld } from './components/GameWorld';
export { useBarMap, getMapData } from './components/BarMap';
export { usePlayerSprite } from './components/PlayerSprite';
export { useRemotePlayers } from './components/RemotePlayers';
export { useGirlSprites } from './components/GirlSprites';
export { ChatInput, ChatLog, useChatSocket } from './components/ChatPanel';

// Hooks
export { useKeyboard } from './hooks/useKeyboard';
export { usePlayerMovement } from './hooks/usePlayerMovement';
export { useMultiplayerSync } from './hooks/useMultiplayerSync';
export { useProximity } from './hooks/useProximity';

// Utils
export {
  checkCollision,
  checkWallCollision,
  applyMovementWithCollision,
  clampToMap,
  getPlayerBounds,
} from './utils/collision';

// Types
export type {
  Wall,
  Furniture,
  SpawnPoint,
  SpawnArea,
  BarMap,
  Position,
  Direction,
  PlayerColor,
} from './types';

export { PLAYER_COLORS, PLAYER_SIZE, PLAYER_SPEED, PROXIMITY_RANGE } from './types';
