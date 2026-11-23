import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const SIZE = 8;
const CELL = 23;
const BOARD_SIZE = SIZE * CELL; // 184
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = 38;

// 0 = empty, 1 = player man, 2 = player king, -1 = cpu man, -2 = cpu king
interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  capR?: number;
  capC?: number;
}

export class CheckersGame implements ArcadeGameInstance {
  private board: number[][] = [];
  private cursorR = 5;
  private cursorC = 0;
  private selected: { r: number; c: number } | null = null;
  private turn: 'player' | 'cpu' = 'player';
  private cpuTimer = 0;

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
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) this.board[r][c] = -1;
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((r + c) % 2 === 1) this.board[r][c] = 1;
      }
    }
    this.cursorR = 5;
    this.cursorC = 0;
    this.selected = null;
    this.turn = 'player';
    this.cpuTimer = 0;
    this.score = 0;
    this.gameOver = false;
    this.resultText = '';
    this.isMenu = true;
  }

  private getMovesForPiece(r: number, c: number): Move[] {
    const val = this.board[r][c];
    if (val === 0) return [];
    const isPlayer = val > 0;
    const isKing = Math.abs(val) === 2;
    const rowDirs = isKing ? [-1, 1] : isPlayer ? [-1] : [1];
    const moves: Move[] = [];

    for (const dr of rowDirs) {
      for (const dc of [-1, 1]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          if (this.board[nr][nc] === 0) {
            moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
          } else if ((isPlayer && this.board[nr][nc] < 0) || (!isPlayer && this.board[nr][nc] > 0)) {
            const jr = nr + dr;
            const jc = nc + dc;
            if (jr >= 0 && jr < SIZE && jc >= 0 && jc < SIZE && this.board[jr][jc] === 0) {
              moves.push({ fromR: r, fromC: c, toR: jr, toC: jc, capR: nr, capC: nc });
            }
          }
        }
      }
    }
    return moves;
  }

  private getAllMoves(forPlayer: boolean): Move[] {
    const all: Move[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if ((forPlayer && this.board[r][c] > 0) || (!forPlayer && this.board[r][c] < 0)) {
          all.push(...this.getMovesForPiece(r, c));
        }
      }
    }
    // Prefer captures if available
    const caps = all.filter((m) => m.capR !== undefined);
    return caps.length > 0 ? caps : all;
  }

  private applyMove(m: Move): void {
    const piece = this.board[m.fromR][m.fromC];
    this.board[m.fromR][m.fromC] = 0;
    this.board[m.toR][m.toC] = piece;
    if (m.capR !== undefined && m.capC !== undefined) {
      this.board[m.capR][m.capC] = 0;
    }
    // Crown King
    if (piece === 1 && m.toR === 0) this.board[m.toR][m.toC] = 2;
    if (piece === -1 && m.toR === SIZE - 1) this.board[m.toR][m.toC] = -2;
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

    if (this.turn === 'player') {
      if (input.left && !this.lastLeft) this.cursorC = (this.cursorC + SIZE - 1) % SIZE;
      if (input.right && !this.lastRight) this.cursorC = (this.cursorC + 1) % SIZE;
      if (input.up && !this.lastUp) this.cursorR = (this.cursorR + SIZE - 1) % SIZE;
      if (input.down && !this.lastDown) this.cursorR = (this.cursorR + 1) % SIZE;

      if (input.b && !this.lastB) {
        this.selected = null;
      }

      if (input.a && !this.lastA) {
        const val = this.board[this.cursorR][this.cursorC];
        if (val > 0) {
          this.selected = { r: this.cursorR, c: this.cursorC };
          sound = 'hit';
        } else if (this.selected) {
          const valid = this.getMovesForPiece(this.selected.r, this.selected.c);
          const match = valid.find((m) => m.toR === this.cursorR && m.toC === this.cursorC);
          if (match) {
            this.applyMove(match);
            this.selected = null;
            if (match.capR !== undefined) {
              this.score += 100;
              if (this.score > this.highScore) this.highScore = this.score;
              sound = 'score';
            } else {
              sound = 'hit';
            }

            if (this.getAllMoves(false).length === 0) {
              this.gameOver = true;
              this.score += 500;
              if (this.score > this.highScore) this.highScore = this.score;
              this.resultText = 'YOU WIN!';
              sound = 'levelclear';
            } else {
              this.turn = 'cpu';
              this.cpuTimer = 0.5;
            }
          }
        }
      }
    } else {
      this.cpuTimer -= dt;
      if (this.cpuTimer <= 0) {
        const cpuMoves = this.getAllMoves(false);
        if (cpuMoves.length === 0) {
          this.gameOver = true;
          this.resultText = 'YOU WIN!';
          sound = 'levelclear';
        } else {
          const pick = cpuMoves[Math.floor(Math.random() * cpuMoves.length)];
          this.applyMove(pick);
          sound = 'hit';
          if (this.getAllMoves(true).length === 0) {
            this.gameOver = true;
            this.resultText = 'CPU WINS!';
            sound = 'gameover';
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
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    const pCount = this.board.flat().filter((v) => v > 0).length;
    const cCount = this.board.flat().filter((v) => v < 0).length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: pCount,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? this.resultText : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] FOR REMATCH'
        : `YOU(●): ${pCount}  CPU(○): ${cCount} • [A]: SELECT/MOVE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    const validTargets = new Set(
      this.selected
        ? this.getMovesForPiece(this.selected.r, this.selected.c).map((m) => `${m.toR},${m.toC}`)
        : []
    );

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          {this.turn === 'player' ? 'YOUR TURN (●)' : 'CPU TURN (○)'}
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
              const dark = (r + c) % 2 === 1;
              const isCursor = r === this.cursorR && c === this.cursorC && this.turn === 'player';
              const isSel = this.selected?.r === r && this.selected?.c === c;
              const isTarget = validTargets.has(`${r},${c}`);

              return (
                <View
                  key={`ck-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    backgroundColor: dark
                      ? isLight
                        ? 'rgba(23,38,22,0.16)'
                        : 'rgba(255,255,255,0.14)'
                      : 'transparent',
                    borderWidth: isCursor ? 2.5 : isSel ? 2 : 0,
                    borderColor: pixelColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {val > 0 && (
                    <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: pixelColor, justifyContent: 'center', alignItems: 'center' }}>
                      {val === 2 && <Text style={{ fontSize: 8, fontWeight: '900', color: bg }}>K</Text>}
                    </View>
                  )}
                  {val < 0 && (
                    <View style={{ width: 15, height: 15, borderRadius: 7.5, borderWidth: 2, borderColor: pixelColor, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
                      {val === -2 && <Text style={{ fontSize: 8, fontWeight: '900', color: pixelColor }}>K</Text>}
                    </View>
                  )}
                  {val === 0 && isTarget && (
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: pixelColor }} />
                  )}
                </View>
              );
            })
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>CHECKERS DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CLASSIC 8X8 DAMA VS CPU</Text>
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
