import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const SIZE = 8;
const CELL = 23;
const BOARD_SIZE = SIZE * CELL; // 184
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2); // 68
const BY = 38;

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export class ReversiGame implements ArcadeGameInstance {
  // 0 = empty, 1 = player (solid), 2 = CPU (hollow)
  private board: number[][] = [];
  private cursorX = 2;
  private cursorY = 3;
  private turn: 1 | 2 = 1;
  private cpuDelay = 0;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private resultText = '';
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
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.board[3][3] = 2;
    this.board[4][4] = 2;
    this.board[3][4] = 1;
    this.board[4][3] = 1;
    this.cursorX = 2;
    this.cursorY = 3;
    this.turn = 1;
    this.cpuDelay = 0;
    this.score = 2;
    this.gameOver = false;
    this.resultText = '';
    this.isMenu = true;
  }

  private getFlips(r: number, c: number, player: 1 | 2): [number, number][] {
    if (this.board[r][c] !== 0) return [];
    const opp = player === 1 ? 2 : 1;
    const allFlips: [number, number][] = [];

    for (const [dr, dc] of DIRS) {
      const line: [number, number][] = [];
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length > 0 && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === player) {
        allFlips.push(...line);
      }
    }
    return allFlips;
  }

  private getValidMoves(player: 1 | 2): { r: number; c: number; flips: [number, number][] }[] {
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const flips = this.getFlips(r, c, player);
        if (flips.length > 0) moves.push({ r, c, flips });
      }
    }
    return moves;
  }

  private countDiscs(): { p1: number; p2: number } {
    let p1 = 0;
    let p2 = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] === 1) p1++;
        else if (this.board[r][c] === 2) p2++;
      }
    }
    return { p1, p2 };
  }

  private advanceTurn(): void {
    const next: 1 | 2 = this.turn === 1 ? 2 : 1;
    const nextMoves = this.getValidMoves(next);
    if (nextMoves.length > 0) {
      this.turn = next;
      if (this.turn === 2) this.cpuDelay = 0.45;
      return;
    }
    // Pass turn back if current player still has moves
    if (this.getValidMoves(this.turn).length > 0) {
      if (this.turn === 2) this.cpuDelay = 0.45;
      return;
    }
    // Neither player can move -> Game Over
    const { p1, p2 } = this.countDiscs();
    this.gameOver = true;
    this.resultText = p1 > p2 ? `YOU WIN ${p1}-${p2}` : p2 > p1 ? `CPU WINS ${p2}-${p1}` : 'DRAW!';
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
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.turn === 1) {
      if (input.left && !this.lastLeft) this.cursorX = (this.cursorX + SIZE - 1) % SIZE;
      if (input.right && !this.lastRight) this.cursorX = (this.cursorX + 1) % SIZE;
      if (input.up && !this.lastUp) this.cursorY = (this.cursorY + SIZE - 1) % SIZE;
      if (input.down && !this.lastDown) this.cursorY = (this.cursorY + 1) % SIZE;

      if (input.a && !this.lastA) {
        const flips = this.getFlips(this.cursorY, this.cursorX, 1);
        if (flips.length > 0) {
          this.board[this.cursorY][this.cursorX] = 1;
          flips.forEach(([fr, fc]) => (this.board[fr][fc] = 1));
          const { p1 } = this.countDiscs();
          this.score = p1 * 20;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
          this.advanceTurn();
        }
      }
    } else {
      this.cpuDelay -= dt;
      if (this.cpuDelay <= 0) {
        const moves = this.getValidMoves(2);
        if (moves.length > 0) {
          // Prioritize corners, then max flips
          moves.sort((a, b) => {
            const aCorner = (a.r === 0 || a.r === 7) && (a.c === 0 || a.c === 7) ? 20 : 0;
            const bCorner = (b.r === 0 || b.r === 7) && (b.c === 0 || b.c === 7) ? 20 : 0;
            return b.flips.length + bCorner - (a.flips.length + aCorner);
          });
          const pick = moves[0];
          this.board[pick.r][pick.c] = 2;
          pick.flips.forEach(([fr, fc]) => (this.board[fr][fc] = 2));
          sound = 'hit';
        }
        this.advanceTurn();
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
    const { p1, p2 } = this.countDiscs();
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? this.resultText : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] FOR REMATCH'
        : `YOU(●): ${p1}  CPU(○): ${p2} • [A]: PLACE ON DOTS`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';
    const { p1, p2 } = this.countDiscs();
    const validSet = new Set(
      this.turn === 1 ? this.getValidMoves(1).map((m) => `${m.r},${m.c}`) : []
    );

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          YOU ● {p1}    VS    ○ {p2} CPU
        </Text>

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
          {this.board.map((row, r) =>
            row.map((val, c) => {
              const selected = c === this.cursorX && r === this.cursorY && this.turn === 1 && !this.gameOver;
              const isValid = validSet.has(`${r},${c}`);
              return (
                <View
                  key={`rv-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    borderWidth: selected ? 2.5 : 0.5,
                    borderColor: pixelColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {val === 1 && (
                    <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: pixelColor }} />
                  )}
                  {val === 2 && (
                    <View style={{ width: 15, height: 15, borderRadius: 7.5, borderWidth: 2, borderColor: pixelColor, backgroundColor: bg }} />
                  )}
                  {val === 0 && isValid && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: pixelColor, opacity: 0.45 }} />
                  )}
                </View>
              );
            })
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>REVERSI DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>OTHELLO 8X8 VS CPU</Text>
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
    fontSize: 10,
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
