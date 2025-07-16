import { Element, ELEMENTS } from '../core/GameConfig';

/**
 * Calculates the damage multiplier based on elemental advantages.
 * @param attackerElement The element of the attacker.
 * @param defenderElement The element of the defender.
 * @returns A damage multiplier (1.5 for advantage, 0.5 for disadvantage, 1.0 for neutral).
 */
export function getElementalAdvantage(attackerElement: Element, defenderElement: Element): number {
  if (attackerElement === defenderElement) {
    return 1.0;
  }

  // Sun element is strong against all others
  if (attackerElement === ELEMENTS.SUN) {
    return 1.5;
  }
  if (defenderElement === ELEMENTS.SUN) {
    return 0.5;
  }

  const weaknesses: { [key in Element]?: Element } = {
    [ELEMENTS.FIRE]: ELEMENTS.WATER,
    [ELEMENTS.WATER]: ELEMENTS.GRASS,
    [ELEMENTS.GRASS]: ELEMENTS.FIRE,
  };

  if (weaknesses[attackerElement] === defenderElement) {
    return 0.5; // Attacker is weak against defender
  }

  if (weaknesses[defenderElement] === attackerElement) {
    return 1.5; // Attacker is strong against defender
  }

  return 1.0; // Neutral
}
