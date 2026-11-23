import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const SIZE = 6;
const CELL = 31;
const BOARD_SIZE = SIZE * CELL; // 186
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = 38;

const GEMS = ['★', '♦', '●', '▲', '■'];

export class Match3Game implements ArcadeGameInstance {
  private grid: number[][] = [];
  private cursorR = 2;
  private cursorC = 2;
  private selected: { r: number; c: number } | null = null;

  private movesLeft = 20;
  private score = 0;
  private highScore = 0;
  private gameOver = false;
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
    this.movesLeft = 20;
    this.cursorR = 2;
    this.cursorC = 2;
    this.selected = null;
    this.gameOver = false;
    this.isMenu = true;
    this.fillInitialBoard();
  }

  private fillInitialBoard(): void {
    this.grid = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => Math.floor(Math.random() * GEMS.length))
    );
    // Clear any initial matches silently
    for (let k = 0; k < 10; k++) {
      if (this.resolveMatches(false) === 0) break;
    }
  }

  private resolveMatches(awardPoints: boolean): number {
    const matched = new Set<string>();

    // Horizontal 3+
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 2; c++) {
        const v = this.grid[r][c];
        if (v === this.grid[r][c + 1] && v === this.grid[r][c + 2]) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c + 1}`);
          matched.add(`${r},${c + 2}`);
        }
      }
    }

    // Vertical 3+
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 2; r++) {
        const v = this.grid[r][c];
        if (v === this.grid[r + 1][c] && v === this.grid[r + 2][c]) {
          matched.add(`${r},${c}`);
          matched.add(`${r + 1},${c}`);
          matched.add(`${r + 2},${c}`);
        }
      }
    }

    if (matched.size === 0) return 0;

    if (awardPoints) {
      this.score += matched.size * 30;
      if (this.score > this.highScore) this.highScore = this.score;
    }

    // Remove matched & gravity collapse
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      this.grid[r][c] = -1;
    }

    for (let c = 0; c < SIZE; c++) {
      const colVals = [];
      for (let r = SIZE - 1; r >= 0; r--) {
        if (this.grid[r][c] !== -1) colVals.push(this.grid[r][c]);
      }
      while (colVals.length < SIZE) colVals.push(Math.floor(Math.random() * GEMS.length));
      for (let r = SIZE - 1; r >= 0; r--) {
        this.grid[r][c] = colVals[SIZE - 1 - r];
      }
    }

    return matched.size;
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

    if (input.left && !this.lastLeft) this.cursorC = (this.cursorC + SIZE - 1) % SIZE;
    if (input.right && !this.lastRight) this.cursorC = (this.cursorC + 1) % SIZE;
    if (input.up && !this.lastUp) this.cursorR = (this.cursorR + SIZE - 1) % SIZE;
    if (input.down && !this.lastDown) this.cursorR = (this.cursorR + 1) % SIZE;

    if (input.b && !this.lastB) {
      this.selected = null;
    }

    if (input.a && !this.lastA) {
      if (!this.selected) {
        this.selected = { r: this.cursorR, c: this.cursorC };
        sound = 'hit';
      } else {
        const dist = Math.abs(this.selected.r - this.cursorR) + Math.abs(this.selected.c - this.cursorC);
        if (dist === 1) {
          // Swap
          const sr = this.selected.r;
          const sc = this.selected.c;
          const tmp = this.grid[sr][sc];
          this.grid[sr][sc] = this.grid[this.cursorR][this.cursorC];
          this.grid[this.cursorR][this.cursorC] = tmp;

          let totalCleared = 0;
          for (let chain = 0; chain < 8; chain++) {
            const c = this.resolveMatches(true);
            if (c === 0) break;
            totalCleared += c;
          }

          if (totalCleared > 0) {
            this.movesLeft--;
            if (totalCleared >= 4) this.movesLeft++; // bonus move!
            sound = totalCleared >= 4 ? 'levelclear' : 'score';
            if (this.movesLeft <= 0) {
              this.gameOver = true;
              sound = 'gameover';
            }
          } else {
            // Revert invalid swap
            this.grid[this.cursorR][this.cursorC] = this.grid[sr][sc];
            this.grid[sr][sc] = tmp;
            sound = 'die';
          }
          this.selected = null;
        } else {
          this.selected = { r: this.cursorR, c: this.cursorC };
          sound = 'hit';
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
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.movesLeft,
      level: Math.floor(this.score / 500) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF MOVES!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO PLAY AGAIN'
        : `MOVES: ${this.movesLeft} • [A]: SELECT & SWAP ADJACENT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>MOVES LEFT: {this.movesLeft}</Text>

        <View
          style={{
            position: 'absolute',
            left: BX,
            top: BY,
            width: BOARD_SIZE,
            height: BOARD_SIZE,
            borderWidth: 2,
            borderColor: pixelColor,
          }}
        >
          {this.grid.map((row, r) =>
            row.map((val, c) => {
              const isCur = r === this.cursorR && c === this.cursorC && !this.gameOver;
              const isSel = this.selected?.r === r && this.selected?.c === c;
              return (
                <View
                  key={`m3-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    borderWidth: isCur ? 2.5 : 0.5,
                    borderColor: pixelColor,
                    backgroundColor: isSel ? pixelColor : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isSel ? bg : pixelColor }}>
                    {GEMS[val]}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MATCH-3 DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SWAP SYMBOLS TO CLEAR 3+</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
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
