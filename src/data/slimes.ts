import { UnitStats } from "../entities/Unit";
import { Element } from "../core/GameConfig";

export interface UnitData {
  name: string;
  stats: Omit<UnitStats, 'hp' | 'maxHp'> & { hp: number };
  type: 'slime' | 'enemy';
  claimRate?: number;
}

export const slimeData: { [key: string]: UnitData } = {
  'little': {
    name: 'Little Slime',
    type: 'slime',
    stats: {
      hp: 10,
      attack: 5,
      defense: 2,
      moveRange: 4,
      attackRange: 1,
      element: 'water' as Element,
    }
  },
  'sticky': {
    name: 'Sticky Slime',
    type: 'slime',
    stats: {
      hp: 12,
      attack: 4,
      defense: 3,
      moveRange: 3,
      attackRange: 1,
      element: 'grass' as Element,
    }
  },
  'melty': {
    name: 'Melty Slime',
    type: 'slime',
    stats: {
      hp: 8,
      attack: 6,
      defense: 1,
      moveRange: 3,
      attackRange: 1,
      element: 'fire' as Element,
    }
  }
};
