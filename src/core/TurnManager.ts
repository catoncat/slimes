import { Unit } from '../entities/Unit';

export enum TurnPhase {
  PLAYER_TURN = 'player_turn',
  ENEMY_TURN = 'enemy_turn',
  ANIMATION = 'animation',
  GAME_OVER = 'game_over'
}

interface TurnAction {
  type: 'move' | 'attack' | 'wait';
  unitId: string;
  targetX?: number;
  targetY?: number;
  targetUnitId?: string;
}

export class TurnManager {
  private currentPhase: TurnPhase = TurnPhase.PLAYER_TURN;
  private turnCount: number = 1;

  constructor(
    private playerUnits: Unit[],
    private enemyUnits: Unit[]
  ) {
    this.startNewRound();
  }

  startNewRound(): void {
    this.currentPhase = TurnPhase.PLAYER_TURN;
    
    // Reset all units' action state
    this.playerUnits.forEach(u => {
      u.hasActed = false;
      u.hasMovedThisTurn = false;
    });
    this.enemyUnits.forEach(u => {
      u.hasActed = false;
      u.hasMovedThisTurn = false;
    });
    
    console.log(`--- Round ${this.turnCount} ---`);
  }

  endPlayerTurn(): void {
    this.currentPhase = TurnPhase.ENEMY_TURN;
    console.log("Enemy turn starts.");
    // In the future, enemy AI logic will go here.
    // For now, it ends immediately.
    this.endEnemyTurn();
  }

  endEnemyTurn(): void {
    // Update status effects for all living units at the end of the round
    this.playerUnits.forEach(u => !u.isDead() && u.updateStatusEffects());
    this.enemyUnits.forEach(u => !u.isDead() && u.updateStatusEffects());

    this.currentPhase = TurnPhase.PLAYER_TURN;
    console.log("Player turn starts.");
    this.turnCount++;
    this.startNewRound();
  }

  getCurrentPhase(): TurnPhase {
    return this.currentPhase;
  }

  checkGameOver(): { isOver: boolean; winner: 'player' | 'enemy' | null } {
    const alivePlayerUnits = this.playerUnits.filter(u => !u.isDead());
    const aliveEnemyUnits = this.enemyUnits.filter(u => !u.isDead());
    
    if (alivePlayerUnits.length === 0) {
      this.currentPhase = TurnPhase.GAME_OVER;
      return { isOver: true, winner: 'enemy' };
    }
    
    if (aliveEnemyUnits.length === 0) {
      this.currentPhase = TurnPhase.GAME_OVER;
      return { isOver: true, winner: 'player' };
    }
    
    return { isOver: false, winner: null };
  }

  getTurnOrder(): Unit[] {
    const playerUnits = this.playerUnits.filter(u => !u.isDead());
    const enemyUnits = this.enemyUnits.filter(u => !u.isDead());
    
    if (this.isPlayerTurn()) {
      return playerUnits;
    } else {
      return enemyUnits;
    }
  }

  getRemainingUnits(): { player: Unit[]; enemy: Unit[] } {
    return {
      player: this.playerUnits.filter(u => !u.isDead()),
      enemy: this.enemyUnits.filter(u => !u.isDead())
    };
  }
}