import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ROWS = 5;
const COLS = 6;
const CELL = 34;
const GRID_X = 58;
const GRID_Y = 44;

// Bitmask for pipe openings: N=1, E=2, S=4, W=8
const N = 1;
const E = 2;
const S = 4;
const W = 8;

function rotateMask(mask: number): number {
  let out = 0;
  if (mask & N) out |= E;
  if (mask & E) out |= S;
  if (mask & S) out |= W;
  if (mask & W) out |= N;
  return out;
}

// Handcrafted solved paths from (inRow, 0) entering from W to (outRow, 5) exiting E
const PATHS: { inRow: number; outRow: number; cells: [number, number][] }[] = [
  {
    inRow: 1,
    outRow: 3,
    cells: [
      [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4], [3, 5],
    ],
  },
  {
    inRow: 0,
    outRow: 4,
    cells: [
      [0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [4, 4], [4, 5],
    ],
  },
  {
    inRow: 4,
    outRow: 1,
    cells: [
      [4, 0], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [1, 4], [1, 5],
    ],
  },
  {
    inRow: 2,
    outRow: 2,
    cells: [
      [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4], [2, 4], [2, 5],
    ],
  },
];

export class PipeConnectGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private lives = 3;
  private gameOver = false;

  private grid: number[][] = [];
  private filled: boolean[][] = [];
  private inRow = 1;
  private outRow = 3;

  private curR = 1;
  private curC = 1;
  private moveCooldown = 0;
  private prevA = false;
  private timer = 60;
  private clearDelay = 0;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.gameOver = false;
    this.loadLevel();
  }

  private loadLevel() {
    const def = PATHS[(this.level - 1) % PATHS.length];
    this.inRow = def.inRow;
    this.outRow = def.outRow;
    this.timer = Math.max(30, 65 - (this.level - 1) * 5);
    this.clearDelay = 0;
    this.prevA = false;

    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    // Compute exact solved pipe masks along the path
    const pts = def.cells;
    for (let i = 0; i < pts.length; i++) {
      const [r, c] = pts[i];
      let mask = 0;
      if (i === 0) mask |= W;
      else {
        const [pr, pc] = pts[i - 1];
        if (pr < r) mask |= N;
        if (pr > r) mask |= S;
        if (pc < c) mask |= W;
        if (pc > c) mask |= E;
      }
      if (i === pts.length - 1) mask |= E;
      else {
        const [nr, nc] = pts[i + 1];
        if (nr < r) mask |= N;
        if (nr > r) mask |= S;
        if (nc < c) mask |= W;
        if (nc > c) mask |= E;
      }
      // Scramble each path pipe by 1-3 rotations
      const spins = 1 + Math.floor(Math.random() * 3);
      for (let s = 0; s < spins; s++) mask = rotateMask(mask);
      this.grid[r][c] = mask;
    }

    // Fill remaining empty cells with decorative decoy pipes
    const decoys = [N | S, E | W, N | E, E | S, S | W, W | N];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] === 0) {
          this.grid[r][c] = decoys[(r * 7 + c * 3 + this.level) % decoys.length];
        }
      }
    }

    this.curR = this.inRow;
    this.curC = 0;
    this.traceWater();
  }

  private traceWater(): boolean {
    this.filled = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    if (!(this.grid[this.inRow][0] & W)) return false;

    const q: [number, number][] = [[this.inRow, 0]];
    this.filled[this.inRow][0] = true;

    while (q.length > 0) {
      const [r, c] = q.shift()!;
      const m = this.grid[r][c];
      const dirs: [number, number, number, number][] = [
        [-1, 0, N, S],
        [0, 1, E, W],
        [1, 0, S, N],
        [0, -1, W, E],
      ];
      for (const [dr, dc, outBit, inBit] of dirs) {
        if (!(m & outBit)) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !this.filled[nr][nc]) {
          if (this.grid[nr][nc] & inBit) {
            this.filled[nr][nc] = true;
            q.push([nr, nc]);
          }
        }
      }
    }

    return this.filled[this.outRow][COLS - 1] && Boolean(this.grid[this.outRow][COLS - 1] & E);
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (this.clearDelay > 0) {
      this.clearDelay -= dt;
      if (this.clearDelay <= 0) {
        this.level++;
        this.loadLevel();
      }
      return null;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.gameOver = true;
      this.lives = 0;
      return 'gameover';
    }

    if (this.moveCooldown > 0) {
      this.moveCooldown -= dt;
    } else {
      let moved = false;
      if (input.up) {
        this.curR = (this.curR + ROWS - 1) % ROWS;
        moved = true;
      } else if (input.down) {
        this.curR = (this.curR + 1) % ROWS;
        moved = true;
      } else if (input.left) {
        this.curC = (this.curC + COLS - 1) % COLS;
        moved = true;
      } else if (input.right) {
        this.curC = (this.curC + 1) % COLS;
        moved = true;
      }
      if (moved) this.moveCooldown = 0.14;
    }

    const rot = input.a && !this.prevA;
    this.prevA = input.a;
    if (rot) {
      this.grid[this.curR][this.curC] = rotateMask(this.grid[this.curR][this.curC]);
      const solved = this.traceWater();
      if (solved) {
        this.score += 150 + Math.floor(this.timer * 10);
        if (this.score > this.highScore) this.highScore = this.score;
        this.clearDelay = 0.9;
        return 'levelclear';
      }
      return 'hit';
    }

    return null;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'PIPE BURST!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>PIPES LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>T:{Math.ceil(this.timer)}S</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* IN / OUT labels */}
        <Text style={[styles.ioTxt, { left: 26, top: GRID_Y + this.inRow * CELL + 10, color: fg }]}>
          IN&gt;
        </Text>
        <Text
          style={[
            styles.ioTxt,
            { left: GRID_X + COLS * CELL + 6, top: GRID_Y + this.outRow * CELL + 10, color: fg },
          ]}
        >
          &gt;OUT
        </Text>

        {/* Grid */}
        <View
          style={[
            styles.grid,
            {
              left: GRID_X,
              top: GRID_Y,
              width: COLS * CELL + 2,
              height: ROWS * CELL + 2,
              borderColor: fg,
            },
          ]}
        >
          {this.grid.map((row, r) =>
            row.map((m, c) => {
              const isCur = r === this.curR && c === this.curC;
              const isFilled = this.filled[r][c];
              const thickness = isFilled ? 8 : 4;
              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      left: c * CELL,
                      top: r * CELL,
                      width: CELL,
                      height: CELL,
                      borderColor: fg,
                      borderWidth: isCur ? 2.5 : 0.5,
                    },
                  ]}
                >
                  {/* Center joint */}
                  <View
                    style={{
                      position: 'absolute',
                      width: thickness,
                      height: thickness,
                      backgroundColor: fg,
                    }}
                  />
                  {Boolean(m & N) && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        width: thickness,
                        height: CELL / 2,
                        backgroundColor: fg,
                      }}
                    />
                  )}
                  {Boolean(m & S) && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        width: thickness,
                        height: CELL / 2,
                        backgroundColor: fg,
                      }}
                    />
                  )}
                  {Boolean(m & W) && (
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        height: thickness,
                        width: CELL / 2,
                        backgroundColor: fg,
                      }}
                    />
                  )}
                  {Boolean(m & E) && (
                    <View
                      style={{
                        position: 'absolute',
                        right: 0,
                        height: thickness,
                        width: CELL / 2,
                        backgroundColor: fg,
                      }}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>

        <Text style={[styles.hint, { color: fg }]}>
          D-PAD: MOVE   [A]: ROTATE PIPE
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderBottomWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  hdrText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  ioTxt: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  grid: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  cell: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
