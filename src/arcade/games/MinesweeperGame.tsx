import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 16;
const ROWS = 10;
const TILE_SIZE = 16; // 16 * 16 = 256px wide, 10 * 16 = 160px high
const ORIGIN_X = Math.floor((ARENA_W - COLS * TILE_SIZE) / 2); // 32
const ORIGIN_Y = Math.floor((ARENA_H - ROWS * TILE_SIZE) / 2) + 4; // 44

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isOpen: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export class MinesweeperGame implements ArcadeGameInstance {
  private grid: Cell[][] = [];
  private cursorX = 7;
  private cursorY = 4;

  private totalMines = 20;
  private flagsPlaced = 0;
  private openedCells = 0;
  private firstClick = true;

  private score = 0;
  private highScore = 0;
  private timer = 0;
  private gameOver = false;
  private gameWon = false;
  private isMenu = true;

  // Discrete D-Pad input debouncing
  private lastLeft = false;
  private lastRight = false;
  private lastUp = false;
  private lastDown = false;
  private lastA = false;
  private lastB = false;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.cursorX = 7;
    this.cursorY = 4;
    this.score = 0;
    this.timer = 0;
    this.flagsPlaced = 0;
    this.openedCells = 0;
    this.firstClick = true;
    this.gameOver = false;
    this.gameWon = false;
    this.isMenu = true;

    this.createEmptyGrid();
  }

  private createEmptyGrid(): void {
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          r,
          c,
          isMine: false,
          isOpen: false,
          isFlagged: false,
          adjacentMines: 0,
        });
      }
      this.grid.push(row);
    }
  }

  private plantMines(safeC: number, safeR: number): void {
    let planted = 0;
    while (planted < this.totalMines) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);

      // Safe zone around first click
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) {
        continue;
      }

      if (!this.grid[r][c].isMine) {
        this.grid[r][c].isMine = true;
        planted++;
      }
    }

    // Compute adjacent counts
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.grid[nr][nc].isMine) {
              count++;
            }
          }
        }
        this.grid[r][c].adjacentMines = count;
      }
    }
  }

  private openCell(c: number, r: number): ArcadeSound | null {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    const cell = this.grid[r][c];

    if (cell.isOpen || cell.isFlagged) return null;

    if (this.firstClick) {
      this.firstClick = false;
      this.plantMines(c, r);
    }

    cell.isOpen = true;
    this.openedCells++;

    // Hit a mine!
    if (cell.isMine) {
      this.gameOver = true;
      // Reveal all mines
      this.grid.forEach((row) =>
        row.forEach((cellItem) => {
          if (cellItem.isMine) cellItem.isOpen = true;
        })
      );
      return 'gameover';
    }

    this.score += 10;
    if (this.score > this.highScore) this.highScore = this.score;

    // Zero-cell flood fill
    if (cell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            this.openCell(c + dc, r + dr);
          }
        }
      }
    }

    // Check Win
    if (this.openedCells === ROWS * COLS - this.totalMines) {
      this.gameWon = true;
      this.score += 1000 + Math.max(0, 300 - Math.floor(this.timer)) * 5;
      if (this.score > this.highScore) this.highScore = this.score;
      return 'levelclear';
    }

    return 'hit';
  }

  private toggleFlag(c: number, r: number): ArcadeSound | null {
    const cell = this.grid[r][c];
    if (cell.isOpen) return null;

    cell.isFlagged = !cell.isFlagged;
    this.flagsPlaced += cell.isFlagged ? 1 : -1;
    return 'score';
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.updateInputStates(input);
      return triggeredSound;
    }

    if (this.gameOver || this.gameWon) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.updateInputStates(input);
      return triggeredSound;
    }

    // Timer
    if (!this.firstClick) {
      this.timer += dt;
    }

    // Cursor Navigation
    if (input.left && !this.lastLeft) {
      this.cursorX = Math.max(0, this.cursorX - 1);
    } else if (input.right && !this.lastRight) {
      this.cursorX = Math.min(COLS - 1, this.cursorX + 1);
    } else if (input.up && !this.lastUp) {
      this.cursorY = Math.max(0, this.cursorY - 1);
    } else if (input.down && !this.lastDown) {
      this.cursorY = Math.min(ROWS - 1, this.cursorY + 1);
    }

    // Open Cell with [A]
    if (input.a && !this.lastA) {
      const sound = this.openCell(this.cursorX, this.cursorY);
      if (sound) triggeredSound = sound;
    }

    // Toggle Flag with [B]
    if (input.b && !this.lastB) {
      const sound = this.toggleFlag(this.cursorX, this.cursorY);
      if (sound) triggeredSound = sound;
    }

    this.updateInputStates(input);
    return triggeredSound;
  }

  private updateInputStates(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    const remainingMines = this.totalMines - this.flagsPlaced;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BOOM! GAME OVER' : this.gameWon ? 'FIELD CLEARED!' : undefined,
      subMessage: this.gameOver || this.gameWon
        ? 'PRESS [A] TO RETRY'
        : `[A]: DIG • [B]: FLAG • MINES: ${remainingMines}`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Minefield Grid Container */}
        <View
          style={[
            styles.gridContainer,
            {
              left: ORIGIN_X,
              top: ORIGIN_Y,
              width: COLS * TILE_SIZE,
              height: ROWS * TILE_SIZE,
              borderColor: pixelColor,
            },
          ]}
        >
          {this.grid.map((row) =>
            row.map((cell) => {
              const isSelected = cell.c === this.cursorX && cell.r === this.cursorY;

              return (
                <View
                  key={`cell-${cell.r}-${cell.c}`}
                  style={[
                    styles.tile,
                    {
                      left: cell.c * TILE_SIZE,
                      top: cell.r * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      backgroundColor: cell.isOpen
                        ? isLight
                          ? 'rgba(23, 38, 22, 0.04)'
                          : 'rgba(0, 0, 0, 0.4)'
                        : isLight
                        ? 'rgba(23, 38, 22, 0.22)'
                        : 'rgba(255, 255, 255, 0.2)',
                      borderColor: pixelColor,
                    },
                    isSelected && styles.selectedTile,
                  ]}
                >
                  {/* Flag Icon */}
                  {!cell.isOpen && cell.isFlagged && (
                    <Text style={[styles.flagText, { color: pixelColor }]}>⚑</Text>
                  )}

                  {/* Opened Cell Content */}
                  {cell.isOpen && cell.isMine && (
                    <Text style={[styles.mineIcon, { color: pixelColor }]}>✹</Text>
                  )}

                  {cell.isOpen && !cell.isMine && cell.adjacentMines > 0 && (
                    <Text style={[styles.numberText, { color: pixelColor }]}>
                      {cell.adjacentMines}
                    </Text>
                  )}
                </View>
              );
            })
          )}

          {/* Animated Cursor Reticle */}
          <View
            style={[
              styles.cursorReticle,
              {
                left: this.cursorX * TILE_SIZE - 1,
                top: this.cursorY * TILE_SIZE - 1,
                width: TILE_SIZE + 2,
                height: TILE_SIZE + 2,
                borderColor: pixelColor,
              },
            ]}
          />
        </View>

        {/* Minesweeper Header HUD */}
        <View style={styles.headerHud}>
          <Text style={[styles.hudLabel, { color: pixelColor }]}>
            MINES: {this.totalMines - this.flagsPlaced}
          </Text>
          <Text style={[styles.hudLabel, { color: pixelColor }]}>
            TIME: {Math.floor(this.timer)}s
          </Text>
        </View>

        {/* Start / Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? palette.screenBg : '#111',
                  borderColor: pixelColor,
                },
              ]}
            >
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MINESWEEPER DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CLASSIC MINEFIELD</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SWEEP</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  gridContainer: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  tile: {
    position: 'absolute',
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTile: {
    borderWidth: 1,
  },
  cursorReticle: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 1,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  mineIcon: {
    fontSize: 11,
    fontWeight: '900',
  },
  numberText: {
    fontSize: 9,
    fontWeight: '900',
  },
  headerHud: {
    position: 'absolute',
    top: 10,
    left: ORIGIN_X,
    width: COLS * TILE_SIZE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 2,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  menuSub: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    opacity: 0.8,
  },
  menuPrompt: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
  },
});
