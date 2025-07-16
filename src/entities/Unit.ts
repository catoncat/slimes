import { Element } from '../core/GameConfig';

export interface UnitStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moveRange: number;
  attackRange: number;
  element: Element;
}

export interface ClaimRate {
  base: number; // 基础占据率 (0-100)
  modified: number; // 实际占据率 (考虑状态效果)
}

export interface StatusEffect {
  duration: number; // in turns
}

export class Unit {
  public stats: UnitStats;
  public x: number;
  public y: number;
  public isSelected: boolean = false;
  public isPlayer: boolean;
  public hasActed: boolean = false;
  public hasMovedThisTurn: boolean = false;

  public claimRate: ClaimRate;
  public statusEffects: Map<string, StatusEffect> = new Map();

  private baseStats: UnitStats;
  public name: string; // e.g., "Little Slime", "Swordsman"

  constructor(
    public id: string,
    public type: 'slime' | 'enemy',
    stats: Partial<UnitStats> & { name?: string },
    x: number,
    y: number,
    isPlayer: boolean = false,
    claimRate: number = 100
  ) {
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    this.name = stats.name || (type === 'slime' ? 'Slime' : 'Enemy');
    
    const defaultStats = {
      hp: stats.hp || 10,
      maxHp: stats.maxHp || 10,
      attack: stats.attack || 5,
      defense: stats.defense || 2,
      moveRange: stats.moveRange || 2,
      attackRange: stats.attackRange || 1,
      element: stats.element || 'water'
    };

    this.stats = { ...defaultStats };
    this.baseStats = { ...defaultStats };

    this.claimRate = {
      base: claimRate,
      modified: claimRate
    };
  }

  canMoveTo(x: number, y: number): boolean {
    if (this.hasStatusEffect('sticky')) {
      return false;
    }
    const distance = Math.abs(x - this.x) + Math.abs(y - this.y);
    const moveRange = this.hasStatusEffect('slow') ? 1 : this.stats.moveRange;
    return distance <= moveRange;
  }

  canUseAbility(target: Unit): boolean {
    // For now, all abilities are single-target and have a range of 1
    const distance = Math.abs(target.x - this.x) + Math.abs(target.y - this.y);
    return distance <= 1 && this.isPlayer !== target.isPlayer;
  }

  useAbility(target: Unit): boolean {
    let success = false;
    switch (this.name) {
      case 'Little Slime':
        if (this.canUseAbility(target)) {
          console.log(`${this.name} uses Slow on ${target.id}`);
          target.addStatusEffect('slow', 3);
          success = true;
        }
        break;
      case 'Sticky Slime':
        if (this.canUseAbility(target)) {
          console.log(`${this.name} uses Sticky on ${target.id}`);
          target.addStatusEffect('sticky', 3);
          success = true;
        }
        break;
      case 'Melty Slime':
        if (this.canUseAbility(target)) {
          console.log(`${this.name} uses Melt on ${target.id}`);
          target.addStatusEffect('melt', 3);
          success = true;
        }
        break;
    }
    return success;
  }

  canAttack(target: Unit): boolean {
    const distance = Math.abs(target.x - this.x) + Math.abs(target.y - this.y);
    return distance <= this.stats.attackRange && this.isPlayer !== target.isPlayer;
  }

  canClaim(target: Unit): boolean {
    const distance = Math.abs(target.x - this.x) + Math.abs(target.y - this.y);
    return distance <= 1 && 
           this.type === 'slime' && 
           this.isPlayer && 
           !target.isPlayer && 
           target.type === 'enemy';
  }

  getClaimSuccessRate(target: Unit): number {
    if (!this.canClaim(target)) return 0;
    
    let rate = target.claimRate.base;
    
    if (target.hasStatusEffect('melt')) {
      return 100;
    }
    if (target.hasStatusEffect('sticky')) {
      return target.claimRate.base === 0 ? 1 : 100;
    }
    if (target.hasStatusEffect('slow')) {
      rate *= 5;
    }
    
    target.claimRate.modified = Math.min(100, Math.max(0, rate));
    return target.claimRate.modified;
  }

  attemptClaim(target: Unit): boolean {
    const successRate = this.getClaimSuccessRate(target);
    return Math.random() * 100 < successRate;
  }

  addStatusEffect(effect: string, duration: number): void {
    this.statusEffects.set(effect, { duration });
    this.applyStatusEffectBonuses();
  }

  removeStatusEffect(effect: string): void {
    this.statusEffects.delete(effect);
    this.applyStatusEffectBonuses();
  }

  hasStatusEffect(effect: string): boolean {
    return this.statusEffects.has(effect);
  }

  updateStatusEffects(): void {
    for (const [effect, status] of this.statusEffects.entries()) {
      status.duration--;
      if (status.duration <= 0) {
        this.removeStatusEffect(effect);
      }
    }
  }

  applyStatusEffectBonuses(): void {
    // Reset stats to base before applying effects
    this.stats.defense = this.baseStats.defense;

    if (this.hasStatusEffect('melt')) {
      this.stats.defense = 0; // "Melt" sharply reduces defense
    }
  }

  takeDamage(damage: number): number {
    const roundedDamage = Math.round(damage);
    const actualDamage = Math.max(1, roundedDamage - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - actualDamage);
    return actualDamage;
  }

  isDead(): boolean {
    return this.stats.hp <= 0;
  }

  getColor(): number {
    const colors = {
      fire: 0xe74c3c,
      water: 0x3498db,
      grass: 0x2ecc71,
      sun: 0xf1c40f
    };
    return colors[this.stats.element as keyof typeof colors] || 0xffffff;
  }
}