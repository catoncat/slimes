import * as Phaser from 'phaser';
import { MapSystem } from '../systems/MapSystem';
import { Unit } from '../entities/Unit';
import { GAME_CONFIG } from '../core/GameConfig';
import { TurnManager, TurnPhase } from '../core/TurnManager';
import { getElementalAdvantage } from '../utils/combat';
import { slimeData } from '../data/slimes';
import { enemyData } from '../data/enemies';

enum PlayerInputState {
  IDLE,
  UNIT_SELECTED,
  TARGETING_MOVE,
  TARGETING_ATTACK,
  TARGETING_CLAIM,
  TARGETING_ABILITY,
}

export class GameScene extends Phaser.Scene {
  private mapSystem!: MapSystem;
  private units: Unit[] = [];
  private playerUnits: Unit[] = [];
  private enemyUnits: Unit[] = [];
  private turnManager!: TurnManager;
  
  private selectedUnit: Unit | null = null;
  private unitObjects: Map<string, Phaser.GameObjects.Container> = new Map();
  
  private turnText!: Phaser.GameObjects.Text;
  private actionMenu!: Phaser.GameObjects.Container;

  private playerInputState: PlayerInputState = PlayerInputState.IDLE;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.mapSystem = new MapSystem(this);
    this.createInitialUnits();
    this.turnManager = new TurnManager(this.playerUnits, this.enemyUnits);
    this.setupInput();
    this.createUI();
    this.createActionMenu();
    this.updateTurnDisplay();
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (this.turnManager.getCurrentPhase() !== TurnPhase.PLAYER_TURN) return;

      // If the list of clicked game objects is not empty, it means we clicked a UI element.
      // In this case, we let the UI element's own handler deal with it and do nothing in the global handler.
      if (gameObjects.length > 0) {
        return;
      }

      const { x, y } = this.mapSystem.getGridPosition(pointer.x, pointer.y);
      this.handleTileClick(x, y);
    });
  }

  private createInitialUnits(): void {
    this.createUnitFromData('little', 2, 5, true);
    this.createUnitFromData('sticky', 3, 6, true);

    this.createUnitFromData('swordsman', 15, 8, false);
    this.createUnitFromData('archer', 16, 7, false);
  }

  private createUnitFromData(dataKey: string, x: number, y: number, isPlayer: boolean): void {
    const unitDataStore = isPlayer ? slimeData : enemyData;
    const data = unitDataStore[dataKey];
    if (!data) {
      console.error(`No data found for key: ${dataKey}`);
      return;
    }

    const unitId = `${data.name.toLowerCase().replace(' ', '')}${this.units.length + 1}`;
    
    const stats = {
      ...data.stats,
      name: data.name,
      maxHp: data.stats.hp,
    };

    const unit = new Unit(
      unitId,
      data.type,
      stats,
      x,
      y,
      isPlayer,
      data.claimRate
    );

    this.addUnit(unit);
  }

  private addUnit(unit: Unit): void {
    this.units.push(unit);
    if (unit.isPlayer) {
      this.playerUnits.push(unit);
    } else {
      this.enemyUnits.push(unit);
    }
    this.mapSystem.setTileOccupied(unit.x, unit.y, true);
    this.createUnitObjects(unit);
  }

  private createUnitObjects(unit: Unit): void {
    const { x, y } = this.mapSystem.getScreenPosition(unit.x, unit.y);
    
    const sprite = this.add.graphics();
    const healthText = this.add.text(0, GAME_CONFIG.GRID_SIZE / 2, unit.stats.hp.toString(), {
      fontSize: '12px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 2, y: 1 }
    }).setOrigin(0.5, 0);

    const container = this.add.container(x, y, [sprite, healthText]);
    this.unitObjects.set(unit.id, container);
    
    this.updateUnitSprite(unit);
  }

  private handleTileClick(x: number, y: number): void {
    const unitOnTile = this.getUnitAt(x, y);

    switch (this.playerInputState) {
      case PlayerInputState.IDLE:
        if (unitOnTile && unitOnTile.isPlayer && !unitOnTile.hasActed) {
          this.selectUnit(unitOnTile);
        }
        break;

      case PlayerInputState.UNIT_SELECTED:
        // If we clicked the selected unit again, do nothing. Let the menu handle it.
        if (unitOnTile === this.selectedUnit) {
          return;
        }
        // If we clicked another one of our units, select that one instead.
        if (unitOnTile && unitOnTile.isPlayer && !unitOnTile.hasActed) {
          this.selectUnit(unitOnTile);
          return;
        }
        // Otherwise, deselect the unit. This handles clicking on empty space or enemies.
        this.deselectUnit();
        break;

      case PlayerInputState.TARGETING_MOVE:
        if (this.selectedUnit && this.selectedUnit.canMoveTo(x, y) && !unitOnTile) {
          this.moveUnit(this.selectedUnit, x, y);
          this.postMoveUpdate();
        } else {
          this.returnToUnitSelectedState();
        }
        break;

      case PlayerInputState.TARGETING_ATTACK:
        if (this.selectedUnit && unitOnTile && this.selectedUnit.canAttack(unitOnTile)) {
          this.attackUnit(this.selectedUnit, unitOnTile);
          this.completePlayerAction(this.selectedUnit);
        } else {
          this.returnToUnitSelectedState();
        }
        break;
        
      case PlayerInputState.TARGETING_CLAIM:
        if (this.selectedUnit && unitOnTile && this.selectedUnit.canClaim(unitOnTile)) {
          this.claimUnit(this.selectedUnit, unitOnTile);
        } else {
          this.returnToUnitSelectedState();
        }
        break;

      case PlayerInputState.TARGETING_ABILITY:
        if (this.selectedUnit && unitOnTile && this.selectedUnit.canUseAbility(unitOnTile)) {
          if (this.selectedUnit.useAbility(unitOnTile)) {
            this.completePlayerAction(this.selectedUnit);
          } else {
            this.returnToUnitSelectedState();
          }
        } else {
          this.returnToUnitSelectedState();
        }
        break;
    }
  }

  private selectUnit(unit: Unit): void {
    this.deselectUnit();
    this.selectedUnit = unit;
    this.returnToUnitSelectedState();
  }
  
  private returnToUnitSelectedState(): void {
    if (!this.selectedUnit) return;
    this.playerInputState = PlayerInputState.UNIT_SELECTED;
    this.mapSystem.clearAllHighlights();
    this.mapSystem.highlightTile(this.selectedUnit.x, this.selectedUnit.y, GAME_CONFIG.COLORS.SELECTED);
    this.showActionMenu(this.selectedUnit);
  }

  private postMoveUpdate(): void {
    if (!this.selectedUnit) return;
    this.selectedUnit.hasMovedThisTurn = true;
    this.returnToUnitSelectedState();
  }

  private deselectUnit(): void {
    this.selectedUnit = null;
    this.playerInputState = PlayerInputState.IDLE;
    this.mapSystem.clearAllHighlights();
    this.hideActionMenu();
  }

  private showMovementRange(unit: Unit): void {
    this.mapSystem.clearAllHighlights();
    this.mapSystem.highlightTile(unit.x, unit.y, GAME_CONFIG.COLORS.SELECTED);
    
    for (let y = 0; y < GAME_CONFIG.MAP_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x++) {
        if (unit.canMoveTo(x, y) && !this.mapSystem.isTileOccupied(x, y)) {
          this.mapSystem.highlightTile(x, y, GAME_CONFIG.COLORS.MOVE_RANGE);
        }
      }
    }
  }

  private showAttackRange(unit: Unit): void {
    this.mapSystem.clearAllHighlights();
    this.mapSystem.highlightTile(unit.x, unit.y, GAME_CONFIG.COLORS.SELECTED);

    this.enemyUnits.forEach(enemy => {
      if (!enemy.isDead() && unit.canAttack(enemy)) {
        this.mapSystem.highlightTile(enemy.x, enemy.y, GAME_CONFIG.COLORS.ATTACK_RANGE);
      }
    });
  }
  
  private showClaimRange(unit: Unit): void {
    this.mapSystem.clearAllHighlights();
    this.mapSystem.highlightTile(unit.x, unit.y, GAME_CONFIG.COLORS.SELECTED);

    this.enemyUnits.forEach(enemy => {
      if (!enemy.isDead() && unit.canClaim(enemy)) {
        this.mapSystem.highlightTile(enemy.x, enemy.y, GAME_CONFIG.COLORS.CLAIM_RANGE);
      }
    });
  }

  private showAbilityRange(unit: Unit): void {
    this.mapSystem.clearAllHighlights();
    this.mapSystem.highlightTile(unit.x, unit.y, GAME_CONFIG.COLORS.SELECTED);

    this.enemyUnits.forEach(enemy => {
      if (!enemy.isDead() && unit.canUseAbility(enemy)) {
        this.mapSystem.highlightTile(enemy.x, enemy.y, GAME_CONFIG.COLORS.CLAIM_RANGE); // Use claim color for now
      }
    });
  }

  private moveUnit(unit: Unit, x: number, y: number): void {
    this.mapSystem.setTileOccupied(unit.x, unit.y, false);
    unit.x = x;
    unit.y = y;
    this.mapSystem.setTileOccupied(x, y, true);
    this.updateUnitPosition(unit);
  }

  private attackUnit(attacker: Unit, target: Unit): void {
    const baseDamage = attacker.stats.attack;

    // 1. Elemental advantage
    const elementalMultiplier = getElementalAdvantage(attacker.stats.element, target.stats.element);

    // 2. Elevation advantage
    const attackerTile = this.mapSystem.getTile(attacker.x, attacker.y);
    const targetTile = this.mapSystem.getTile(target.x, target.y);
    let elevationMultiplier = 1.0;
    if (attackerTile && targetTile) {
      const elevationDiff = attackerTile.elevation - targetTile.elevation;
      if (elevationDiff > 0) {
        elevationMultiplier = 1.1; // Higher ground bonus
      } else if (elevationDiff < 0) {
        elevationMultiplier = 0.9; // Lower ground penalty
      }
    }

    // Calculate final damage
    const totalDamage = baseDamage * elementalMultiplier * elevationMultiplier;
    const damageDealt = target.takeDamage(totalDamage);

    console.log(`${attacker.id} attacks ${target.id}. Base: ${baseDamage}, Elemental: x${elementalMultiplier}, Elevation: x${elevationMultiplier}. Final Damage: ${damageDealt}`);
    
    if (target.isDead()) {
      console.log(`${target.id} has been defeated!`);
      this.removeUnit(target);
    } else {
      this.updateUnitSprite(target);
    }
  }

  private claimUnit(slime: Unit, target: Unit): void {
    const success = slime.attemptClaim(target);
    console.log(`${slime.id} attempts to claim ${target.id} - ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (success) {
      // Check for elemental affinity bonus
      if (slime.stats.element === target.stats.element) {
        console.log(`Elemental affinity bonus! ${target.id} gets +25% ATK and DEF.`);
        target.stats.attack = Math.round(target.stats.attack * 1.25);
        target.stats.defense = Math.round(target.stats.defense * 1.25);
      }

      this.removeUnit(slime);
      target.isPlayer = true;
      this.enemyUnits = this.enemyUnits.filter(u => u.id !== target.id);
      this.playerUnits.push(target);
      this.updateUnitSprite(target);
    }
    
    this.completePlayerAction(slime);
  }

  private removeUnit(unit: Unit): void {
    this.mapSystem.setTileOccupied(unit.x, unit.y, false);
    
    this.unitObjects.get(unit.id)?.destroy();
    this.unitObjects.delete(unit.id);
    
    this.units = this.units.filter(u => u.id !== unit.id);
    if (unit.isPlayer) {
      this.playerUnits = this.playerUnits.filter(u => u.id !== unit.id);
    } else {
      this.enemyUnits = this.enemyUnits.filter(u => u.id !== unit.id);
    }
  }

  private updateUnitPosition(unit: Unit): void {
    const { x, y } = this.mapSystem.getScreenPosition(unit.x, unit.y);
    this.unitObjects.get(unit.id)?.setPosition(x, y);
  }

  private updateUnitSprite(unit: Unit): void {
    const container = this.unitObjects.get(unit.id);
    if (!container) return;

    const sprite = container.getAt(0) as Phaser.GameObjects.Graphics;
    const healthText = container.getAt(1) as Phaser.GameObjects.Text;

    sprite.clear();
    const color = unit.isPlayer ? unit.getColor() : 0x8e44ad;
    const alpha = unit.hasActed ? 0.5 : 1.0;
    sprite.fillStyle(color, alpha);
    sprite.fillCircle(0, 0, GAME_CONFIG.GRID_SIZE / 3);
    sprite.lineStyle(2, 0xffffff, alpha);
    sprite.strokeCircle(0, 0, GAME_CONFIG.GRID_SIZE / 3);

    healthText.setText(unit.stats.hp.toString());
    
    this.updateUnitPosition(unit);
  }

  private createUI(): void {
    this.turnText = this.add.text(10, 10, '', { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 10, y: 5 } });
  }

  private createActionMenu(): void {
    const menuStyle = { fontSize: '14px', color: '#000000', backgroundColor: '#ecf0f1', padding: { x: 8, y: 4 }, width: 60, align: 'center' };
    
    const moveButton = this.add.text(0, 0, 'Move', menuStyle).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.selectedUnit) {
        this.playerInputState = PlayerInputState.TARGETING_MOVE;
        this.showMovementRange(this.selectedUnit);
        this.hideActionMenu();
      }
    });

    const attackButton = this.add.text(0, 30, 'Attack', menuStyle).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.selectedUnit) {
        this.playerInputState = PlayerInputState.TARGETING_ATTACK;
        this.showAttackRange(this.selectedUnit);
        this.hideActionMenu();
      }
    });

    const claimButton = this.add.text(0, 60, 'Claim', menuStyle).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.selectedUnit && this.selectedUnit.type === 'slime') {
        this.playerInputState = PlayerInputState.TARGETING_CLAIM;
        this.showClaimRange(this.selectedUnit);
        this.hideActionMenu();
      }
    });

    const abilityButton = this.add.text(0, 90, 'Ability', menuStyle).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.selectedUnit && this.selectedUnit.type === 'slime') {
        this.playerInputState = PlayerInputState.TARGETING_ABILITY;
        this.showAbilityRange(this.selectedUnit);
        this.hideActionMenu();
      }
    });

    const waitButton = this.add.text(0, 120, 'Wait', menuStyle).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.selectedUnit) {
        this.completePlayerAction(this.selectedUnit);
      }
    });

    this.actionMenu = this.add.container(0, 0, [moveButton, attackButton, claimButton, abilityButton, waitButton]);
    this.actionMenu.setDepth(10);
    this.actionMenu.setVisible(false);
  }

  private showActionMenu(unit: Unit): void {
    const { x, y } = this.mapSystem.getScreenPosition(unit.x, unit.y);
    this.actionMenu.setPosition(x + 20, y - 20);
    
    const moveButton = this.actionMenu.getAt(0) as Phaser.GameObjects.Text;
    moveButton.setInteractive(!unit.hasMovedThisTurn);
    moveButton.setAlpha(unit.hasMovedThisTurn ? 0.5 : 1.0);

    const claimButton = this.actionMenu.getAt(2) as Phaser.GameObjects.Text;
    claimButton.setVisible(unit.type === 'slime');

    const abilityButton = this.actionMenu.getAt(3) as Phaser.GameObjects.Text;
    abilityButton.setVisible(unit.type === 'slime');
    
    this.actionMenu.setVisible(true);
  }

  private hideActionMenu(): void {
    this.actionMenu.setVisible(false);
  }

  private completePlayerAction(unit: Unit): void {
    unit.hasActed = true;
    this.updateUnitSprite(unit);
    this.deselectUnit();
    this.checkPlayerTurnEnd();
  }

  private checkPlayerTurnEnd(): void {
    const allPlayerUnitsActed = this.playerUnits.every(p => p.hasActed || p.isDead());
    if (allPlayerUnitsActed) {
      this.time.delayedCall(500, () => this.endPlayerTurn());
    }
  }

  private endPlayerTurn(): void {
    if (this.turnManager.getCurrentPhase() !== TurnPhase.PLAYER_TURN) return;
    this.deselectUnit();
    this.turnManager.endPlayerTurn();
    this.updateTurnDisplay();
    this.time.delayedCall(500, () => this.processEnemyTurn());
  }

  private processEnemyTurn(): void {
    const enemiesCanAct = this.enemyUnits.filter(e => !e.isDead() && !e.hasActed);
    let i = 0;

    const processNextEnemy = () => {
      if (i >= enemiesCanAct.length) {
        this.time.delayedCall(500, () => this.endEnemyTurn());
        return;
      }

      const enemy = enemiesCanAct[i];
      let target = this.findBestTargetFor(enemy);

      if (!target) {
        this.moveEnemyTowardsPlayer(enemy);
        target = this.findBestTargetFor(enemy);
      }
      
      if (target) {
        this.attackUnit(enemy, target);
      }
      
      enemy.hasActed = true;
      i++;
      this.time.delayedCall(400, processNextEnemy);
    };
    
    processNextEnemy();
  }
  
  private moveEnemyTowardsPlayer(enemy: Unit): void {
    const closestPlayer = this.findClosestPlayerFor(enemy);
    if (!closestPlayer) return;

    let bestMove: {x: number, y: number} | null = null;
    let minDistance = Math.abs(enemy.x - closestPlayer.x) + Math.abs(enemy.y - closestPlayer.y);

    for (let y = 0; y < GAME_CONFIG.MAP_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x++) {
        if (enemy.canMoveTo(x, y) && !this.mapSystem.isTileOccupied(x, y)) {
          const distance = Math.abs(x - closestPlayer.x) + Math.abs(y - closestPlayer.y);
          if (distance < minDistance) {
            minDistance = distance;
            bestMove = { x, y };
          }
        }
      }
    }

    if (bestMove) {
      this.moveUnit(enemy, bestMove.x, bestMove.y);
    }
  }

  private findClosestPlayerFor(enemy: Unit): Unit | null {
    const alivePlayers = this.playerUnits.filter(p => !p.isDead());
    if (alivePlayers.length === 0) return null;

    return alivePlayers.reduce((closest, player) => {
      const closestDist = Math.abs(closest.x - enemy.x) + Math.abs(closest.y - enemy.y);
      const playerDist = Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y);
      return playerDist < closestDist ? player : closest;
    });
  }

  private findBestTargetFor(enemy: Unit): Unit | null {
    const possibleTargets = this.playerUnits.filter(p => !p.isDead() && enemy.canAttack(p));
    if (possibleTargets.length === 0) return null;

    // Grade each target based on different criteria
    const gradedTargets = possibleTargets.map(target => {
      let score = 100;

      // Priority 1: Elevation. Lower elevation is much better.
      const enemyTile = this.mapSystem.getTile(enemy.x, enemy.y);
      const targetTile = this.mapSystem.getTile(target.x, target.y);
      if (enemyTile && targetTile) {
        const elevationDiff = enemyTile.elevation - targetTile.elevation;
        score += elevationDiff * 20; // Give a heavy bonus for height advantage
      }

      // Priority 2: Lowest HP.
      score -= target.stats.hp;

      return { unit: target, score };
    });

    // Sort by score descending
    gradedTargets.sort((a, b) => b.score - a.score);

    return gradedTargets[0].unit;
  }

  private endEnemyTurn(): void {
    this.turnManager.endEnemyTurn();
    this.updateTurnDisplay();
    
    this.units.forEach(u => {
      if (!u.isDead()) {
        u.hasActed = false;
        u.hasMovedThisTurn = false;
        this.updateUnitSprite(u);
      }
    });
    
    const gameOver = this.turnManager.checkGameOver();
    if (gameOver.isOver) {
      this.showGameOver(gameOver.winner);
    }
  }

  private updateTurnDisplay(): void {
    const phase = this.turnManager.getCurrentPhase();
    this.turnText.setText(phase === TurnPhase.PLAYER_TURN ? 'Player Turn' : 'Enemy Turn');
  }

  private showGameOver(winner: 'player' | 'enemy' | null): void {
    const winText = winner === 'player' ? 'You Win!' : 'Game Over';
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, winText, {
      fontSize: '48px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.7)'
    }).setOrigin(0.5).setDepth(20);
    this.input.enabled = false;
  }

  private getUnitAt(x: number, y: number): Unit | null {
    return this.units.find(unit => !unit.isDead() && unit.x === x && unit.y === y) || null;
  }
}