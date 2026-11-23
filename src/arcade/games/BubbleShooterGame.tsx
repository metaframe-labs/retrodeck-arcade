import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const COLS = 10;
const ROWS = 9;
const CELL = 20;
const BOARD_X = 60;
const BOARD_Y = 30;
const TYPES = ['O', 'X', '#', '+'];

export class BubbleShooterGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private grid: number[][] = []; // -1 empty, 0..3 orb type
  private aimAngle = -Math.PI / 2;
  private curType = 0;
  private nextType = 1;

  private flying = false;
  private bx = 160;
  private by = 216;
  private bvx = 0;
  private bvy = 0;
  private prevA = false;
  private shotsUntilDrop = 6;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.setupBoard();
  }

  private setupBoard() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < COLS; c++) {
        this.grid[r][c] = Math.floor(Math.random() * TYPES.length);
      }
    }
    this.aimAngle = -Math.PI / 2;
    this.curType = Math.floor(Math.random() * TYPES.length);
    this.nextType = Math.floor(Math.random() * TYPES.length);
    this.flying = false;
    this.prevA = false;
    this.shotsUntilDrop = Math.max(4, 7 - Math.floor(this.level / 2));
  }

  private snapAndMatch(): ArcadeSound {
    const c = Math.max(0, Math.min(COLS - 1, Math.floor((this.bx - BOARD_X) / CELL)));
    let r = Math.max(0, Math.min(ROWS - 1, Math.floor((this.by - BOARD_Y) / CELL)));

    // If occupied, find nearest empty neighbor
    if (this.grid[r][c] !== -1) {
      let placed = false;
      for (let dr = 0; dr <= 2 && !placed; dr++) {
        for (const dc of [0, -1, 1]) {
          const rr = Math.min(ROWS - 1, r + dr);
          const cc = Math.max(0, Math.min(COLS - 1, c + dc));
          if (this.grid[rr][cc] === -1) {
            r = rr;
            this.grid[rr][cc] = this.curType;
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        this.gameOver = true;
        return 'gameover';
      }
    } else {
      this.grid[r][c] = this.curType;
    }

    // Flood fill connected same-type orbs
    const target = this.curType;
    const visited = new Set<string>();
    const cluster: [number, number][] = [];
    const q: [number, number][] = [[r, c]];
    visited.add(`${r},${c}`);

    while (q.length > 0) {
      const [cr, cc] = q.shift()!;
      cluster.push([cr, cc]);
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = cr + dr;
        const nc = cc + dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 &&
          nr < ROWS &&
          nc >= 0 &&
          nc < COLS &&
          !visited.has(key) &&
          this.grid[nr][nc] === target
        ) {
          visited.add(key);
          q.push([nr, nc]);
        }
      }
    }

    let sound: ArcadeSound = 'hit';
    if (cluster.length >= 3) {
      for (const [cr, cc] of cluster) this.grid[cr][cc] = -1;
      this.score += cluster.length * 30 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      sound = cluster.length >= 5 ? 'powerup' : 'score';
    }

    // Check board cleared
    const anyLeft = this.grid.some((row) => row.some((v) => v !== -1));
    if (!anyLeft) {
      this.score += 300 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.setupBoard();
      return 'levelclear';
    }

    // Ceiling drop countdown
    this.shotsUntilDrop--;
    if (this.shotsUntilDrop <= 0) {
      this.shotsUntilDrop = Math.max(4, 7 - Math.floor(this.level / 2));
      // Shift rows down
      for (let rr = ROWS - 1; rr > 0; rr--) {
        this.grid[rr] = [...this.grid[rr - 1]];
      }
      this.grid[0] = Array.from({ length: COLS }, () => Math.floor(Math.random() * TYPES.length));
    }

    // Check bottom overflow
    if (this.grid[ROWS - 1].some((v) => v !== -1)) {
      this.gameOver = true;
      this.lives = 0;
      return 'gameover';
    }

    this.curType = this.nextType;
    this.nextType = Math.floor(Math.random() * TYPES.length);
    return sound;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (input.left) this.aimAngle = Math.max(-Math.PI + 0.25, this.aimAngle - 2.1 * dt);
    if (input.right) this.aimAngle = Math.min(-0.25, this.aimAngle + 2.1 * dt);

    const fire = input.a && !this.prevA;
    this.prevA = input.a;

    if (!this.flying) {
      if (fire) {
        this.flying = true;
        this.bx = 160;
        this.by = 216;
        const spd = 290;
        this.bvx = Math.cos(this.aimAngle) * spd;
        this.bvy = Math.sin(this.aimAngle) * spd;
        return 'shoot';
      }
      return null;
    }

    this.bx += this.bvx * dt;
    this.by += this.bvy * dt;

    // Wall bounce
    if (this.bx < BOARD_X + 8) {
      this.bx = BOARD_X + 8;
      this.bvx = Math.abs(this.bvx);
    } else if (this.bx > BOARD_X + COLS * CELL - 8) {
      this.bx = BOARD_X + COLS * CELL - 8;
      this.bvx = -Math.abs(this.bvx);
    }

    // Top ceiling or bubble hit
    let collided = this.by <= BOARD_Y + 9;
    if (!collided) {
      for (let r = 0; r < ROWS && !collided; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] === -1) continue;
          const cx = BOARD_X + c * CELL + CELL / 2;
          const cy = BOARD_Y + r * CELL + CELL / 2;
          if (Math.hypot(this.bx - cx, this.by - cy) < CELL - 3) {
            collided = true;
            break;
          }
        }
      }
    }

    if (collided) {
      this.flying = false;
      return this.snapAndMatch();
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
      message: this.gameOver ? 'LINE BREACHED' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>BUBBLES LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>DROP:{this.shotsUntilDrop}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Board Frame */}
        <View
          style={[
            styles.board,
            {
              left: BOARD_X,
              top: BOARD_Y,
              width: COLS * CELL,
              height: ROWS * CELL,
              borderColor: fg,
            },
          ]}
        >
          {this.grid.map((row, r) =>
            row.map((val, c) =>
              val !== -1 ? (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.orb,
                    {
                      left: c * CELL + 1,
                      top: r * CELL + 1,
                      borderColor: fg,
                      backgroundColor: val === 2 ? fg : bg,
                    },
                  ]}
                >
                  <Text style={[styles.orbTxt, { color: val === 2 ? bg : fg }]}>
                    {TYPES[val]}
                  </Text>
                </View>
              ) : null
            )
          )}
        </View>

        {/* Aim guide dots */}
        {[24, 42, 60].map((d, i) => (
          <View
            key={i}
            style={[
              styles.aimDot,
              {
                left: 160 + Math.cos(this.aimAngle) * d - 2,
                top: 216 + Math.sin(this.aimAngle) * d - 2,
                backgroundColor: fg,
              },
            ]}
          />
        ))}

        {/* Flying or Loaded Orb */}
        <View
          style={[
            styles.orb,
            {
              left: (this.flying ? this.bx : 160) - 9,
              top: (this.flying ? this.by : 216) - 9,
              borderColor: fg,
              backgroundColor: this.curType === 2 ? fg : bg,
            },
          ]}
        >
          <Text style={[styles.orbTxt, { color: this.curType === 2 ? bg : fg }]}>
            {TYPES[this.curType]}
          </Text>
        </View>

        {/* Next orb preview */}
        <Text style={[styles.nextLbl, { color: fg }]}>NEXT:{TYPES[this.nextType]}</Text>
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
  board: {
    position: 'absolute',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 1.5,
  },
  orb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  aimDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nextLbl: {
    position: 'absolute',
    bottom: 6,
    left: 12,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
