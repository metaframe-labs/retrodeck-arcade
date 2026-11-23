import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const CELL = 46;
const BOARD_SIZE = CELL * 4; // 184
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = 38;

// Base valid 4x4 Sudoku solution (permuted randomly each puzzle!)
const BASE_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];

export class SudokuMiniGame implements ArcadeGameInstance {
  private grid: number[][] = [];
  private fixed: boolean[][] = [];
  private cursorX = 0;
  private cursorY = 0;

  private solvedCount = 0;
  private score = 0;
  private highScore = 0;
  private stageClear = false;
  private isMenu = true;

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
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.score = 0;
    this.solvedCount = 0;
    this.isMenu = true;
    this.generateBoard();
  }

  private generateBoard(): void {
    // Randomly permute digits 1..4 for infinite valid 4x4 Sudokus
    const perm = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    const sol = BASE_SOLUTION.map((row) => row.map((v) => perm[v - 1]));

    // Swap band rows / cols randomly
    if (Math.random() > 0.5) [sol[0], sol[1]] = [sol[1], sol[0]];
    if (Math.random() > 0.5) [sol[2], sol[3]] = [sol[3], sol[2]];

    this.grid = sol.map((r) => [...r]);
    this.fixed = Array.from({ length: 4 }, () => Array(4).fill(true));

    // Remove 7..9 cells to create puzzle
    const blanks = Math.min(10, 7 + Math.floor(this.solvedCount / 2));
    let removed = 0;
    while (removed < blanks) {
      const r = Math.floor(Math.random() * 4);
      const c = Math.floor(Math.random() * 4);
      if (this.grid[r][c] !== 0) {
        this.grid[r][c] = 0;
        this.fixed[r][c] = false;
        removed++;
      }
    }

    this.cursorX = 0;
    this.cursorY = 0;
    this.stageClear = false;
  }

  private isValidComplete(): boolean {
    const validSet = (arr: number[]) => {
      const s = new Set(arr);
      return s.size === 4 && !s.has(0);
    };
    for (let i = 0; i < 4; i++) {
      if (!validSet(this.grid[i])) return false;
      if (!validSet([this.grid[0][i], this.grid[1][i], this.grid[2][i], this.grid[3][i]])) return false;
    }
    for (let br = 0; br < 4; br += 2) {
      for (let bc = 0; bc < 4; bc += 2) {
        if (!validSet([
          this.grid[br][bc], this.grid[br][bc + 1],
          this.grid[br + 1][bc], this.grid[br + 1][bc + 1],
        ])) return false;
      }
    }
    return true;
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

    if (this.stageClear) {
      if (input.a && !this.lastA) {
        this.generateBoard();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (input.left && !this.lastLeft) this.cursorX = (this.cursorX + 3) % 4;
    if (input.right && !this.lastRight) this.cursorX = (this.cursorX + 1) % 4;
    if (input.up && !this.lastUp) this.cursorY = (this.cursorY + 3) % 4;
    if (input.down && !this.lastDown) this.cursorY = (this.cursorY + 1) % 4;

    if (input.a && !this.lastA && !this.fixed[this.cursorY][this.cursorX]) {
      this.grid[this.cursorY][this.cursorX] = (this.grid[this.cursorY][this.cursorX] + 1) % 5;
      sound = 'hit';

      if (this.isValidComplete()) {
        this.stageClear = true;
        this.solvedCount++;
        this.score += 300;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'levelclear';
      }
    }

    if (input.b && !this.lastB && !this.fixed[this.cursorY][this.cursorX]) {
      this.grid[this.cursorY][this.cursorX] = 0;
      sound = 'hit';
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
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.solvedCount + 1,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.stageClear ? 'SUDOKU SOLVED!' : undefined,
      subMessage: this.stageClear
        ? 'PRESS [A] FOR NEXT PUZZLE'
        : '[A]: CYCLE 1-4 • [B]: CLEAR • NO REPEATS IN ROW/COL/2X2',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          SUDOKU 4X4   •   SOLVED: {this.solvedCount}
        </Text>

        <View
          style={{
            position: 'absolute',
            left: BX,
            top: BY,
            width: BOARD_SIZE,
            height: BOARD_SIZE,
            borderWidth: 2.5,
            borderColor: pixelColor,
          }}
        >
          {this.grid.map((row, r) =>
            row.map((val, c) => {
              const sel = c === this.cursorX && r === this.cursorY && !this.stageClear;
              const isFixed = this.fixed[r][c];
              return (
                <View
                  key={`sd-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    borderWidth: sel ? 3 : 0.5,
                    borderColor: pixelColor,
                    backgroundColor: isFixed
                      ? isLight
                        ? 'rgba(23,38,22,0.16)'
                        : 'rgba(255,255,255,0.14)'
                      : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {val > 0 && (
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: isFixed ? '900' : '700',
                        color: pixelColor,
                      }}
                    >
                      {val}
                    </Text>
                  )}
                </View>
              );
            })
          )}
          {/* Thick 2x2 Quadrant Dividers */}
          <View style={{ position: 'absolute', left: CELL * 2 - 1, top: 0, bottom: 0, width: 2.5, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', top: CELL * 2 - 1, left: 0, right: 0, height: 2.5, backgroundColor: pixelColor }} />
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>SUDOKU MINI 4X4</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>FILL 1-4 IN EVERY ROW, COL & BOX</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SOLVE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudTxt: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
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
