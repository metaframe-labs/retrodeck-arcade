import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const GRID_SIZE = 4;
const CELL_SIZE = 46;
const CELL_GAP = 5;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP; // 209px
const BOARD_LEFT = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BOARD_TOP = Math.floor((ARENA_H - BOARD_SIZE) / 2);

export class Game2048 implements ArcadeGameInstance {
  private grid: number[][] = [];
  private score = 0;
  private highScore = 0;
  private maxTile = 2;
  private gameOver = false;
  private isMenu = true;

  private lastLeft = false;
  private lastRight = false;
  private lastUp = false;
  private lastDown = false;
  private lastA = false;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    this.score = 0;
    this.maxTile = 2;
    this.gameOver = false;
    this.isMenu = true;
    this.spawnTile();
    this.spawnTile();
  }

  private spawnTile(): void {
    const empty: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  private slideLine(line: number[]): { result: number[]; points: number; changed: boolean } {
    const nonZero = line.filter((v) => v !== 0);
    const merged: number[] = [];
    let points = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const val = nonZero[i] * 2;
        merged.push(val);
        points += val;
        if (val > this.maxTile) this.maxTile = val;
        i++;
      } else {
        merged.push(nonZero[i]);
      }
    }

    while (merged.length < GRID_SIZE) merged.push(0);
    const changed = merged.some((v, idx) => v !== line[idx]);
    return { result: merged, points, changed };
  }

  private move(dir: 'left' | 'right' | 'up' | 'down'): { moved: boolean; gained: number } {
    let moved = false;
    let gained = 0;

    for (let i = 0; i < GRID_SIZE; i++) {
      let line: number[] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        if (dir === 'left') line.push(this.grid[i][j]);
        else if (dir === 'right') line.push(this.grid[i][GRID_SIZE - 1 - j]);
        else if (dir === 'up') line.push(this.grid[j][i]);
        else line.push(this.grid[GRID_SIZE - 1 - j][i]);
      }

      const { result, points, changed } = this.slideLine(line);
      if (changed) moved = true;
      gained += points;

      for (let j = 0; j < GRID_SIZE; j++) {
        if (dir === 'left') this.grid[i][j] = result[j];
        else if (dir === 'right') this.grid[i][GRID_SIZE - 1 - j] = result[j];
        else if (dir === 'up') this.grid[j][i] = result[j];
        else this.grid[GRID_SIZE - 1 - j][i] = result[j];
      }
    }

    return { moved, gained };
  }

  private canMove(): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const v = this.grid[r][c];
        if (v === 0) return true;
        if (r + 1 < GRID_SIZE && this.grid[r + 1][c] === v) return true;
        if (c + 1 < GRID_SIZE && this.grid[r][c + 1] === v) return true;
      }
    }
    return false;
  }

  public update(input: ArcadeInput, _dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    let dir: 'left' | 'right' | 'up' | 'down' | null = null;
    if (input.left && !this.lastLeft) dir = 'left';
    else if (input.right && !this.lastRight) dir = 'right';
    else if (input.up && !this.lastUp) dir = 'up';
    else if (input.down && !this.lastDown) dir = 'down';

    if (dir) {
      const { moved, gained } = this.move(dir);
      if (moved) {
        this.score += gained;
        if (this.score > this.highScore) this.highScore = this.score;
        this.spawnTile();
        sound = gained > 0 ? 'score' : 'hit';

        if (!this.canMove()) {
          this.gameOver = true;
          sound = 'gameover';
        }
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: Math.max(1, Math.floor(Math.log2(this.maxTile))),
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'NO MOVES LEFT' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : `MAX TILE: ${this.maxTile} • D-PAD: SLIDE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const screenBg = isLight ? palette.screenBg : '#0A0F14';

    return (
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.board,
            {
              left: BOARD_LEFT,
              top: BOARD_TOP,
              width: BOARD_SIZE,
              height: BOARD_SIZE,
              borderColor: pixelColor,
              backgroundColor: isLight ? 'rgba(23, 38, 22, 0.08)' : 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          {this.grid.map((row, r) =>
            row.map((val, c) => {
              const x = CELL_GAP + c * (CELL_SIZE + CELL_GAP);
              const y = CELL_GAP + r * (CELL_SIZE + CELL_GAP);
              const isHigh = val >= 16;
              const fontSize = val >= 1024 ? 12 : val >= 128 ? 14 : 17;

              return (
                <View
                  key={`c-${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      left: x,
                      top: y,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderColor: pixelColor,
                      borderWidth: val === 0 ? 1 : 1.5,
                      backgroundColor:
                        val === 0
                          ? 'transparent'
                          : isHigh
                          ? pixelColor
                          : isLight
                          ? 'rgba(23, 38, 22, 0.22)'
                          : 'rgba(255,255,255,0.2)',
                    },
                  ]}
                >
                  {val > 0 && (
                    <Text
                      style={[
                        styles.cellText,
                        {
                          fontSize,
                          color: isHigh ? screenBg : pixelColor,
                        },
                      ]}
                    >
                      {val}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RETRO 2048</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MERGE TILES TO 2048</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  board: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  cell: {
    position: 'absolute',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontWeight: '900',
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
