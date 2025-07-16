export const GAME_CONFIG = {
  GRID_SIZE: 32,
  MAP_WIDTH: 20,
  MAP_HEIGHT: 15,
  COLORS: {
    GRID: 0x34495e,
    GRID_BORDER: 0x2c3e50,
    SELECTED: 0x3498db,
    HOVER: 0x2980b9,
    MOVE_RANGE: 0x2ecc71,
    ATTACK_RANGE: 0xe74c3c,
    CLAIM_RANGE: 0xff00ff
  }
} as const;

export const ELEMENTS = {
  WATER: 'water',
  FIRE: 'fire',
  GRASS: 'grass',
  SUN: 'sun' // 特殊元素
} as const;

export type Element = typeof ELEMENTS[keyof typeof ELEMENTS];