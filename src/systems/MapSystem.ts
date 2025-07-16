import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../core/GameConfig';

export interface Tile {
  x: number;
  y: number;
  occupied: boolean;
  terrain: 'grass' | 'water' | 'mountain' | 'forest';
  highlight: Phaser.GameObjects.Graphics | null;
}

export class MapSystem {
  private tiles: Tile[][] = [];
  private graphics: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.initializeMap();
    this.drawGrid();
  }

  private initializeMap(): void {
    for (let y = 0; y < GAME_CONFIG.MAP_HEIGHT; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x++) {
        this.tiles[y][x] = {
          x,
          y,
          occupied: false,
          terrain: 'grass',
          highlight: null
        };
      }
    }
  }

  private drawGrid(): void {
    this.graphics.clear();
    
    for (let y = 0; y < GAME_CONFIG.MAP_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x++) {
        const pixelX = x * GAME_CONFIG.GRID_SIZE;
        const pixelY = y * GAME_CONFIG.GRID_SIZE;
        
        this.graphics.lineStyle(1, GAME_CONFIG.COLORS.GRID_BORDER, 0.5);
        this.graphics.strokeRect(pixelX, pixelY, GAME_CONFIG.GRID_SIZE, GAME_CONFIG.GRID_SIZE);
        
        const tile = this.tiles[y][x];
        this.drawTerrain(pixelX, pixelY, tile.terrain);
      }
    }
  }

  private drawTerrain(x: number, y: number, terrain: string): void {
    const colors = {
      grass: 0x27ae60,
      water: 0x2980b9,
      mountain: 0x7f8c8d,
      forest: 0x229954
    };

    this.graphics.fillStyle(colors[terrain as keyof typeof colors], 0.3);
    this.graphics.fillRect(x + 1, y + 1, GAME_CONFIG.GRID_SIZE - 2, GAME_CONFIG.GRID_SIZE - 2);
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= GAME_CONFIG.MAP_WIDTH || y < 0 || y >= GAME_CONFIG.MAP_HEIGHT) {
      return null;
    }
    return this.tiles[y][x];
  }

  setTileOccupied(x: number, y: number, occupied: boolean): void {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.occupied = occupied;
    }
  }

  isTileOccupied(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.occupied : true;
  }

  highlightTile(x: number, y: number, color: number, alpha: number = 0.5): void {
    const tile = this.getTile(x, y);
    if (!tile) return;

    this.clearHighlight(x, y);

    const pixelX = x * GAME_CONFIG.GRID_SIZE;
    const pixelY = y * GAME_CONFIG.GRID_SIZE;

    tile.highlight = this.scene.add.graphics();
    tile.highlight.fillStyle(color, alpha);
    tile.highlight.fillRect(pixelX + 2, pixelY + 2, GAME_CONFIG.GRID_SIZE - 4, GAME_CONFIG.GRID_SIZE - 4);
  }

  clearHighlight(x: number, y: number): void {
    const tile = this.getTile(x, y);
    if (tile?.highlight) {
      tile.highlight.destroy();
      tile.highlight = null;
    }
  }

  clearAllHighlights(): void {
    for (let y = 0; y < GAME_CONFIG.MAP_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_WIDTH; x++) {
        this.clearHighlight(x, y);
      }
    }
  }

  getGridPosition(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: Math.floor(screenX / GAME_CONFIG.GRID_SIZE),
      y: Math.floor(screenY / GAME_CONFIG.GRID_SIZE)
    };
  }

  getScreenPosition(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
      y: gridY * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2
    };
  }
}