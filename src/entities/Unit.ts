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

export class Unit {
  public stats: UnitStats;
  public x: number;
  public y: number;
  public isSelected: boolean = false;
  public isPlayer: boolean;
  public hasActed: boolean = false;
  public hasMovedThisTurn: boolean = false;

  public claimRate: ClaimRate;
  public statusEffects: Set<string> = new Set();

  constructor(
    public id: string,
    public type: 'slime' | 'enemy',
    stats: Partial<UnitStats>,
    x: number,
    y: number,
    isPlayer: boolean = false,
    claimRate: number = 100
  ) {
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    
    this.stats = {
      hp: stats.hp || 10,
      maxHp: stats.maxHp || 10,
      attack: stats.attack || 5,
      defense: stats.defense || 2,
      moveRange: stats.moveRange || 2,
      attackRange: stats.attackRange || 1,
      element: stats.element || 'water'
    };

    this.claimRate = {
      base: claimRate,
      modified: claimRate
    };
  }

  canMoveTo(x: number, y: number): boolean {
    const distance = Math.abs(x - this.x) + Math.abs(y - this.y);
    return distance <= this.stats.moveRange;
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
    
    let rate = target.claimRate.modified;
    
    // 考虑状态效果对占据率的影响
    if (target.statusEffects.has('melted')) {
      rate = 100; // 融化状态下100%可占据
    } else if (target.statusEffects.has('sticky')) {
      rate = Math.max(rate, 1); // 粘性状态下至少1%
    }
    
    return Math.min(100, Math.max(0, rate));
  }

  attemptClaim(target: Unit): boolean {
    const successRate = this.getClaimSuccessRate(target);
    return Math.random() * 100 < successRate;
  }

  addStatusEffect(effect: string): void {
    this.statusEffects.add(effect);
  }

  removeStatusEffect(effect: string): void {
    this.statusEffects.delete(effect);
  }

  hasStatusEffect(effect: string): boolean {
    return this.statusEffects.has(effect);
  }

  takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.stats.defense);
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
      earth: 0x95a5a6,
      wind: 0x2ecc71,
      light: 0xf1c40f,
      dark: 0x9b59b6
    };
    return colors[this.stats.element];
  }
}