import { UnitData } from './slimes';
import { Element } from "../core/GameConfig";

export const enemyData: { [key: string]: UnitData } = {
  'swordsman': {
    name: 'Swordsman',
    type: 'enemy',
    claimRate: 80,
    stats: {
      hp: 25,
      attack: 12,
      defense: 5,
      moveRange: 3,
      attackRange: 1,
      element: 'fire' as Element,
    }
  },
  'archer': {
    name: 'Archer',
    type: 'enemy',
    claimRate: 60,
    stats: {
      hp: 20,
      attack: 10,
      defense: 3,
      moveRange: 4,
      attackRange: 2,
      element: 'grass' as Element,
    }
  },
  'knight': {
    name: 'Knight',
    type: 'enemy',
    claimRate: 20,
    stats: {
      hp: 40,
      attack: 15,
      defense: 8,
      moveRange: 2,
      attackRange: 1,
      element: 'water' as Element,
    }
  }
};
