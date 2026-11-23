import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const CELL = 56;
const BOARD_SIZE = CELL * 3; // 168
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = 46;

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export class TicTacToeGame implements ArcadeGameInstance {
  private board: ('' | 'X' | 'O')[] = Array(9).fill('');
  private cursorX = 1;
  private cursorY = 1;
  private turn: 'X' | 'O' = 'X';
  private cpuTimer = 0;

  private wins = 0;
  private losses = 0;
  private draws = 0;
  private score = 0;
  private highScore = 0;
  private resultText = '';
  private roundOver = false;
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
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
    this.score = 0;
    this.isMenu = true;
    this.newRound();
  }

  private newRound(): void {
    this.board = Array(9).fill('');
    this.cursorX = 1;
    this.cursorY = 1;
    this.turn = 'X';
    this.cpuTimer = 0;
    this.resultText = '';
    this.roundOver = false;
  }

  private checkWinner(mark: 'X' | 'O'): boolean {
    return WIN_LINES.some(([a, b, c]) => this.board[a] === mark && this.board[b] === mark && this.board[c] === mark);
  }

  private pickCpuMove(): number {
    const empty = this.board.map((v, i) => (v === '' ? i : -1)).filter((i) => i !== -1);
    if (empty.length === 0) return -1;

    // 1. Win if possible
    for (const i of empty) {
      this.board[i] = 'O';
      const w = this.checkWinner('O');
      this.board[i] = '';
      if (w) return i;
    }
    // 2. Block player win
    for (const i of empty) {
      this.board[i] = 'X';
      const w = this.checkWinner('X');
      this.board[i] = '';
      if (w) return i;
    }
    // 3. Center or corner (with slight randomness so player can beat it cleverly)
    if (this.board[4] === '' && Math.random() < 0.75) return 4;
    return empty[Math.floor(Math.random() * empty.length)];
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

    if (this.roundOver) {
      if (input.a && !this.lastA) {
        this.newRound();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.turn === 'X') {
      if (input.left && !this.lastLeft) this.cursorX = (this.cursorX + 2) % 3;
      if (input.right && !this.lastRight) this.cursorX = (this.cursorX + 1) % 3;
      if (input.up && !this.lastUp) this.cursorY = (this.cursorY + 2) % 3;
      if (input.down && !this.lastDown) this.cursorY = (this.cursorY + 1) % 3;

      if (input.a && !this.lastA) {
        const idx = this.cursorY * 3 + this.cursorX;
        if (this.board[idx] === '') {
          this.board[idx] = 'X';
          sound = 'hit';
          if (this.checkWinner('X')) {
            this.wins++;
            this.score += 200;
            if (this.score > this.highScore) this.highScore = this.score;
            this.resultText = 'YOU WIN!';
            this.roundOver = true;
            sound = 'levelclear';
          } else if (this.board.every((v) => v !== '')) {
            this.draws++;
            this.score += 50;
            if (this.score > this.highScore) this.highScore = this.score;
            this.resultText = 'DRAW!';
            this.roundOver = true;
          } else {
            this.turn = 'O';
            this.cpuTimer = 0.4;
          }
        }
      }
    } else {
      this.cpuTimer -= dt;
      if (this.cpuTimer <= 0) {
        const move = this.pickCpuMove();
        if (move !== -1) {
          this.board[move] = 'O';
          sound = 'hit';
          if (this.checkWinner('O')) {
            this.losses++;
            this.resultText = 'CPU WINS!';
            this.roundOver = true;
            sound = 'die';
          } else if (this.board.every((v) => v !== '')) {
            this.draws++;
            this.resultText = 'DRAW!';
            this.roundOver = true;
          } else {
            this.turn = 'X';
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
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.wins + 1,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.roundOver ? this.resultText : undefined,
      subMessage: this.roundOver
        ? 'PRESS [A] FOR NEXT ROUND'
        : `W:${this.wins}  D:${this.draws}  L:${this.losses} • [A]: PLACE X`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          WINS: {this.wins}   •   DRAWS: {this.draws}   •   CPU: {this.losses}
        </Text>

        <View style={{ position: 'absolute', left: BX, top: BY, width: BOARD_SIZE, height: BOARD_SIZE }}>
          {this.board.map((val, idx) => {
            const c = idx % 3;
            const r = Math.floor(idx / 3);
            const selected = c === this.cursorX && r === this.cursorY && !this.roundOver;
            return (
              <View
                key={`xox-${idx}`}
                style={{
                  position: 'absolute',
                  left: c * CELL,
                  top: r * CELL,
                  width: CELL,
                  height: CELL,
                  borderWidth: selected ? 3 : 1.5,
                  borderColor: pixelColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 30, fontWeight: '900', color: pixelColor }}>{val}</Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TIC-TAC-TOE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CLASSIC XOX VS CPU</Text>
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
    top: 12,
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
