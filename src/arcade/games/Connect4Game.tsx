import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 7;
const ROWS = 6;
const CELL = 28;
const BOARD_W = COLS * CELL; // 196
const BOARD_H = ROWS * CELL; // 168
const BX = Math.floor((ARENA_W - BOARD_W) / 2); // 62
const BY = 54;

export class Connect4Game implements ArcadeGameInstance {
  // 0 = empty, 1 = player (solid), 2 = CPU (ring/cross)
  private board: number[][] = [];
  private cursorCol = 3;
  private turn: 'player' | 'cpu' = 'player';
  private cpuDelay = 0;

  private score = 0;
  private highScore = 0;
  private wins = 0;
  private resultText = '';
  private gameOver = false;
  private isMenu = true;

  private lastLeft = false;
  private lastRight = false;
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
    this.score = 0;
    this.wins = 0;
    this.isMenu = true;
    this.newMatch();
  }

  private newMatch(): void {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.cursorCol = 3;
    this.turn = 'player';
    this.cpuDelay = 0;
    this.resultText = '';
    this.gameOver = false;
  }

  private dropInCol(col: number, piece: number): number {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === 0) {
        this.board[r][col] = piece;
        return r;
      }
    }
    return -1;
  }

  private checkWin(piece: number): boolean {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] !== piece) continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let k = 1; k < 4; k++) {
            const nr = r + dr * k;
            const nc = c + dc * k;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.board[nr][nc] === piece) {
              count++;
            } else break;
          }
          if (count >= 4) return true;
        }
      }
    }
    return false;
  }

  private isBoardFull(): boolean {
    return this.board[0].every((v) => v !== 0);
  }

  private pickCpuCol(): number {
    const validCols = [];
    for (let c = 0; c < COLS; c++) {
      if (this.board[0][c] === 0) validCols.push(c);
    }
    if (validCols.length === 0) return -1;

    // 1. Check immediate CPU win
    for (const c of validCols) {
      const r = this.dropInCol(c, 2);
      const win = this.checkWin(2);
      this.board[r][c] = 0;
      if (win) return c;
    }
    // 2. Block immediate Player win
    for (const c of validCols) {
      const r = this.dropInCol(c, 1);
      const win = this.checkWin(1);
      this.board[r][c] = 0;
      if (win) return c;
    }
    // 3. Prefer center columns
    validCols.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3) + (Math.random() - 0.5) * 1.5);
    return validCols[0];
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
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
        this.newMatch();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.turn === 'player') {
      if (input.left && !this.lastLeft) {
        this.cursorCol = (this.cursorCol + COLS - 1) % COLS;
      } else if (input.right && !this.lastRight) {
        this.cursorCol = (this.cursorCol + 1) % COLS;
      }

      if (input.a && !this.lastA) {
        const row = this.dropInCol(this.cursorCol, 1);
        if (row !== -1) {
          sound = 'hit';
          if (this.checkWin(1)) {
            this.wins++;
            this.score += 500;
            if (this.score > this.highScore) this.highScore = this.score;
            this.resultText = 'YOU WIN!';
            this.gameOver = true;
            sound = 'levelclear';
          } else if (this.isBoardFull()) {
            this.resultText = 'DRAW GAME';
            this.gameOver = true;
          } else {
            this.turn = 'cpu';
            this.cpuDelay = 0.45;
          }
        }
      }
    } else {
      this.cpuDelay -= dt;
      if (this.cpuDelay <= 0) {
        const col = this.pickCpuCol();
        if (col !== -1) {
          this.dropInCol(col, 2);
          sound = 'hit';
          if (this.checkWin(2)) {
            this.resultText = 'CPU WINS!';
            this.gameOver = true;
            sound = 'gameover';
          } else if (this.isBoardFull()) {
            this.resultText = 'DRAW GAME';
            this.gameOver = true;
          } else {
            this.turn = 'player';
          }
        }
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.wins + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? this.resultText : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] FOR NEW MATCH'
        : this.turn === 'player'
        ? '◀ / ▶: COLUMN • [A]: DROP DISC'
        : 'CPU THINKING...',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Turn Header */}
        <Text style={[styles.turnTxt, { color: pixelColor }]}>
          {this.turn === 'player' ? 'YOUR TURN (●)' : 'CPU TURN (○)'}
        </Text>

        {/* Dropper Indicator */}
        {!this.gameOver && !this.isMenu && this.turn === 'player' && (
          <View
            style={{
              position: 'absolute',
              left: BX + this.cursorCol * CELL + 5,
              top: BY - 22,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: pixelColor,
            }}
          />
        )}

        {/* 7x6 Board */}
        <View
          style={{
            position: 'absolute',
            left: BX,
            top: BY,
            width: BOARD_W,
            height: BOARD_H,
            borderWidth: 2,
            borderColor: pixelColor,
            borderRadius: 4,
          }}
        >
          {this.board.map((row, r) =>
            row.map((val, c) => (
              <View
                key={`c4-${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * CELL + 4,
                  top: r * CELL + 4,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: val === 2 ? 3 : 1,
                  borderColor: pixelColor,
                  backgroundColor: val === 1 ? pixelColor : val === 2 ? bg : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {val === 2 && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
                )}
              </View>
            ))
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>CONNECT 4 DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>4 IN A ROW VS SMART CPU</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  turnTxt: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
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
