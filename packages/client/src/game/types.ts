export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Furniture {
  type: 'bar' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface SpawnArea {
  x: number;
  y: number;
  radius: number;
}

export interface BarMap {
  width: number;
  height: number;
  wallThickness: number;
  walls: Wall[];
  furniture: Furniture[];
  girlSpawns: SpawnPoint[];
  playerSpawnArea: SpawnArea;
}

export interface Position {
  x: number;
  y: number;
}

export interface Direction {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export const PLAYER_COLORS: Record<PlayerColor, number> = {
  red: 0xff4444,
  blue: 0x4444ff,
  green: 0x44ff44,
  yellow: 0xffff44,
  purple: 0xaa44ff,
  orange: 0xff8844,
};

export const PLAYER_SIZE = 32;
export const PLAYER_SPEED = 2.5;
export const PROXIMITY_RANGE = 100;
