import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ROWS = 5;
const COLS = 6;
const CELL = 34;
const GRID_X = 58;
const GRID_Y = 44;

type MirrorType = '/' | '\\';

interface PuzzleDef {
  emitterRow: number;
  target: { r: number; c: number };
  mirrors: { r: number; c: number; init: MirrorType }[];
  walls: { r: number; c: number }[];
}

// All 6 puzzles are mathematically verified solvable!
const PUZZLES: PuzzleDef[] = [
  {
    emitterRow: 1,
    target: { r: 3, c: 5 },
    mirrors: [
      { r: 1, c: 3, init: '/' },
      { r: 3, c: 3, init: '/' },
    ],
    walls: [{ r: 2, c: 1 }],
  },
  {
    emitterRow: 0,
    target: { r: 2, c: 5 },
    mirrors: [
      { r: 0, c: 4, init: '/' },
      { r: 4, c: 4, init: '\\' },
      { r: 4, c: 1, init: '/' },
      { r: 2, c: 1, init: '\\' },
    ],
    walls: [
      { r: 1, c: 2 },
      { r: 3, c: 2 },
    ],
  },
  {
    emitterRow: 4,
    target: { r: 3, c: 5 },
    mirrors: [
      { r: 4, c: 2, init: '\\' },
      { r: 1, c: 2, init: '\\' },
      { r: 1, c: 4, init: '/' },
      { r: 3, c: 4, init: '/' },
    ],
    walls: [{ r: 2, c: 3 }],
  },
  {
    emitterRow: 2,
    target: { r: 2, c: 3 },
    mirrors: [
      { r: 2, c: 1, init: '\\' },
      { r: 0, c: 1, init: '\\' },
      { r: 0, c: 5, init: '/' },
      { r: 4, c: 5, init: '\\' },
      { r: 4, c: 3, init: '/' },
    ],
    walls: [{ r: 2, c: 2 }],
  },
  {
    emitterRow: 0,
    target: { r: 4, c: 5 },
    mirrors: [
      { r: 0, c: 2, init: '/' },
      { r: 3, c: 2, init: '/' },
      { r: 3, c: 4, init: '\\' },
      { r: 1, c: 4, init: '\\' },
      { r: 1, c: 5, init: '/' },
    ],
    walls: [{ r: 2, c: 3 }],
  },
  {
    emitterRow: 3,
    target: { r: 1, c: 4 },
    mirrors: [
      { r: 3, c: 1, init: '\\' },
      { r: 0, c: 1, init: '\\' },
      { r: 0, c: 3, init: '/' },
      { r: 4, c: 3, init: '/' },
      { r: 4, c: 5, init: '\\' },
      { r: 1, c: 5, init: '/' },
    ],
    walls: [{ r: 2, c: 2 }],
  },
];

interface BeamSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class LaserMirrorGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private lives = 3;
  private gameOver = false;

  private mirrors: Map<string, MirrorType> = new Map();
  private walls: Set<string> = new Set();
  private emitterRow = 1;
  private target = { r: 3, c: 5 };

  private curR = 1;
  private curC = 3;
  private moveCooldown = 0;
  private prevA = false;
  private timer = 60;
  private clearDelay = 0;

  private beamSegs: BeamSeg[] = [];
  private hitTarget = false;

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
    const def = PUZZLES[(this.level - 1) % PUZZLES.length];
    this.emitterRow = def.emitterRow;
    this.target = { ...def.target };
    this.mirrors = new Map();
    def.mirrors.forEach((m) => this.mirrors.set(`${m.r},${m.c}`, m.init));
    this.walls = new Set(def.walls.map((w) => `${w.r},${w.c}`));

    this.curR = def.mirrors[0].r;
    this.curC = def.mirrors[0].c;
    this.timer = Math.max(30, 65 - (this.level - 1) * 5);
    this.clearDelay = 0;
    this.prevA = false;
    this.traceBeam();
  }

  private cellCenter(r: number, c: number) {
    return {
      x: GRID_X + c * CELL + CELL / 2,
      y: GRID_Y + r * CELL + CELL / 2,
    };
  }

  private traceBeam() {
    this.beamSegs = [];
    this.hitTarget = false;

    let r = this.emitterRow;
    let c = 0;
    let dr = 0;
    let dc = 1;

    let prevX = GRID_X - 10;
    let prevY = GRID_Y + this.emitterRow * CELL + CELL / 2;

    for (let step = 0; step < 40; step++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
        const edgeX = Math.max(GRID_X, Math.min(GRID_X + COLS * CELL, prevX + dc * (CELL / 2)));
        const edgeY = Math.max(GRID_Y, Math.min(GRID_Y + ROWS * CELL, prevY + dr * (CELL / 2)));
        this.beamSegs.push({ x1: prevX, y1: prevY, x2: edgeX, y2: edgeY });
        break;
      }

      const key = `${r},${c}`;
      if (this.walls.has(key)) break;

      const ctr = this.cellCenter(r, c);
      this.beamSegs.push({ x1: prevX, y1: prevY, x2: ctr.x, y2: ctr.y });
      prevX = ctr.x;
      prevY = ctr.y;

      if (r === this.target.r && c === this.target.c) {
        this.hitTarget = true;
        break;
      }

      const m = this.mirrors.get(key);
      if (m === '/') {
        const ndr = -dc;
        const ndc = -dr;
        dr = ndr;
        dc = ndc;
      } else if (m === '\\') {
        const ndr = dc;
        const ndc = dr;
        dr = ndr;
        dc = ndc;
      }

      r += dr;
      c += dc;
    }
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

    const rotate = input.a && !this.prevA;
    this.prevA = input.a;

    if (rotate) {
      const key = `${this.curR},${this.curC}`;
      const cur = this.mirrors.get(key);
      if (cur) {
        this.mirrors.set(key, cur === '/' ? '\\' : '/');
        this.traceBeam();
        if (this.hitTarget) {
          this.score += 150 + Math.floor(this.timer * 10);
          if (this.score > this.highScore) this.highScore = this.score;
          this.clearDelay = 1.0;
          return 'levelclear';
        }
        return 'hit';
      }
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
      message: this.gameOver ? 'TIME UP!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>LASER LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            T:{Math.ceil(this.timer)}S
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Emitter arrow */}
        <Text
          style={[
            styles.emitter,
            {
              left: GRID_X - 24,
              top: GRID_Y + this.emitterRow * CELL + 8,
              color: fg,
            },
          ]}
        >
          {'>>'}
        </Text>

        {/* Grid Cells */}
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
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((__, c) => {
              const key = `${r},${c}`;
              const m = this.mirrors.get(key);
              const isWall = this.walls.has(key);
              const isTarget = r === this.target.r && c === this.target.c;
              const isCur = r === this.curR && c === this.curC;

              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    {
                      left: c * CELL,
                      top: r * CELL,
                      width: CELL,
                      height: CELL,
                      borderColor: fg,
                      borderWidth: isCur ? 2.5 : 0.5,
                      backgroundColor: isWall ? fg : 'transparent',
                    },
                  ]}
                >
                  {m && (
                    <Text style={[styles.mirrorTxt, { color: fg }]}>{m}</Text>
                  )}
                  {isTarget && (
                    <View
                      style={[
                        styles.targetRing,
                        {
                          borderColor: fg,
                          backgroundColor: this.hitTarget ? fg : 'transparent',
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Laser Beam Segments */}
        {this.beamSegs.map((s, idx) => {
          const isHoriz = Math.abs(s.y2 - s.y1) < 1;
          const left = Math.min(s.x1, s.x2) - (isHoriz ? 0 : 1.5);
          const top = Math.min(s.y1, s.y2) - (isHoriz ? 1.5 : 0);
          const width = isHoriz ? Math.abs(s.x2 - s.x1) : 3;
          const height = isHoriz ? 3 : Math.abs(s.y2 - s.y1);
          return (
            <View
              key={idx}
              style={{
                position: 'absolute',
                left,
                top,
                width: Math.max(2, width),
                height: Math.max(2, height),
                backgroundColor: fg,
              }}
            />
          );
        })}

        <Text style={[styles.hint, { color: fg }]}>
          D-PAD: SELECT   A: ROTATE MIRROR
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
  emitter: {
    position: 'absolute',
    fontSize: 14,
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
  mirrorTxt: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  targetRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
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
