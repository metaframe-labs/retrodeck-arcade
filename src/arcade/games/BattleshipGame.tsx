import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const GRID = 8;
const CELL = 22;
const GRID_X = 16;
const GRID_Y = 36;

interface Ship {
  id: number;
  name: string;
  size: number;
  cells: { r: number; c: number }[];
  hits: number;
  sunk: boolean;
}

// 0 = unknown, 1 = miss, 2 = hit
type CellState = 0 | 1 | 2;

export class BattleshipGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private lives = 3; // not used directly, shotsLeft is primary
  private shotsLeft = 36;
  private gameOver = false;

  private grid: CellState[][] = [];
  private shipMap: number[][] = []; // -1 or ship index
  private ships: Ship[] = [];

  private curR = 3;
  private curC = 3;
  private moveCooldown = 0;
  private prevA = false;

  private statusMsg = 'FIND 4 SHIPS';
  private flashTimer = 0;
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
    this.curR = 3;
    this.curC = 3;
    this.prevA = false;
    this.clearDelay = 0;
    this.setupBoard();
  }

  private setupBoard() {
    this.grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    this.shipMap = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
    this.ships = [];
    this.shotsLeft = Math.max(24, 38 - (this.level - 1) * 2);
    this.statusMsg = `SECTOR ${this.level}`;
    this.flashTimer = 0;

    const specs = [
      { name: 'CARRIER', size: 4 },
      { name: 'CRUISER', size: 3 },
      { name: 'DESTROY', size: 2 },
      { name: 'SUB', size: 2 },
    ];

    specs.forEach((spec, idx) => {
      let placed = false;
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? GRID : GRID - spec.size + 1));
        const c = Math.floor(Math.random() * (horiz ? GRID - spec.size + 1 : GRID));
        let ok = true;
        for (let i = 0; i < spec.size; i++) {
          const rr = horiz ? r : r + i;
          const cc = horiz ? c + i : c;
          if (this.shipMap[rr][cc] !== -1) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const cells: { r: number; c: number }[] = [];
          for (let i = 0; i < spec.size; i++) {
            const rr = horiz ? r : r + i;
            const cc = horiz ? c + i : c;
            this.shipMap[rr][cc] = idx;
            cells.push({ r: rr, c: cc });
          }
          this.ships.push({
            id: idx,
            name: spec.name,
            size: spec.size,
            cells,
            hits: 0,
            sunk: false,
          });
          placed = true;
        }
      }
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.clearDelay > 0) {
      this.clearDelay -= dt;
      if (this.clearDelay <= 0) {
        this.level++;
        this.setupBoard();
      }
      return null;
    }

    let sound: ArcadeSound | null = null;

    if (this.moveCooldown > 0) {
      this.moveCooldown -= dt;
    } else {
      let moved = false;
      if (input.up) {
        this.curR = (this.curR + GRID - 1) % GRID;
        moved = true;
      } else if (input.down) {
        this.curR = (this.curR + 1) % GRID;
        moved = true;
      } else if (input.left) {
        this.curC = (this.curC + GRID - 1) % GRID;
        moved = true;
      } else if (input.right) {
        this.curC = (this.curC + 1) % GRID;
        moved = true;
      }
      if (moved) {
        this.moveCooldown = 0.14;
      }
    }

    const firePressed = input.a && !this.prevA;
    this.prevA = input.a;

    if (firePressed) {
      if (this.grid[this.curR][this.curC] === 0) {
        this.shotsLeft--;
        const sIdx = this.shipMap[this.curR][this.curC];
        if (sIdx >= 0) {
          this.grid[this.curR][this.curC] = 2;
          const ship = this.ships[sIdx];
          ship.hits++;
          this.score += 50;
          this.flashTimer = 0.2;
          if (ship.hits >= ship.size) {
            ship.sunk = true;
            this.score += ship.size * 50;
            this.statusMsg = `SUNK ${ship.name}!`;
            sound = 'explode';
          } else {
            this.statusMsg = 'DIRECT HIT!';
            sound = 'hit';
          }

          if (this.ships.every((s) => s.sunk)) {
            this.score += this.shotsLeft * 20;
            this.statusMsg = 'FLEET CLEARED!';
            this.clearDelay = 1.4;
            sound = 'levelclear';
          }
        } else {
          this.grid[this.curR][this.curC] = 1;
          this.statusMsg = 'SPLASH... MISS';
          sound = 'shoot';
        }

        if (this.score > this.highScore) this.highScore = this.score;

        if (this.clearDelay <= 0 && this.shotsLeft <= 0 && !this.ships.every((s) => s.sunk)) {
          this.gameOver = true;
          this.lives = 0;
          this.statusMsg = 'OUT OF AMMO!';
          sound = 'gameover';
        }
      }
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.shotsLeft,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT OF AMMO' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Top bar */}
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>BATTLESHIP</Text>
          <Text style={[styles.hdrText, { color: fg }]}>AMMO:{this.shotsLeft}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* 8x8 Grid */}
        <View
          style={[
            styles.gridBox,
            {
              left: GRID_X,
              top: GRID_Y,
              width: GRID * CELL + 2,
              height: GRID * CELL + 2,
              borderColor: fg,
            },
          ]}
        >
          {this.grid.map((row, r) =>
            row.map((cell, c) => {
              const isCursor = r === this.curR && c === this.curC && !this.gameOver;
              const sIdx = this.shipMap[r][c];
              const revealMissed = this.gameOver && sIdx >= 0 && cell === 0;
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
                      backgroundColor: isCursor ? fg : cell === 2 ? fg : 'transparent',
                    },
                  ]}
                >
                  {cell === 1 && (
                    <View
                      style={[
                        styles.missDot,
                        { backgroundColor: isCursor ? bg : fg },
                      ]}
                    />
                  )}
                  {cell === 2 && (
                    <Text style={[styles.hitMark, { color: bg }]}>
                      {this.ships[sIdx]?.sunk ? '#' : 'X'}
                    </Text>
                  )}
                  {revealMissed && (
                    <View style={[styles.revealBox, { borderColor: fg }]} />
                  )}
                  {isCursor && cell === 0 && (
                    <View style={[styles.cursorInner, { borderColor: bg }]} />
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Right Side Fleet Panel */}
        <View style={styles.sidePanel}>
          <Text style={[styles.sideTitle, { color: fg }]}>FLEET</Text>
          {this.ships.map((s) => (
            <View key={s.id} style={styles.shipRow}>
              <Text
                style={[
                  styles.shipName,
                  { color: fg, opacity: s.sunk ? 0.45 : 1 },
                ]}
              >
                {s.name}
              </Text>
              <View style={styles.pips}>
                {Array.from({ length: s.size }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.pip,
                      {
                        borderColor: fg,
                        backgroundColor: i < s.hits ? fg : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={[styles.statusBox, { borderColor: fg }]}>
            <Text style={[styles.statusTxt, { color: fg }]}>{this.statusMsg}</Text>
          </View>
        </View>
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
    height: 26,
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
  gridBox: {
    position: 'absolute',
    borderWidth: 1,
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  hitMark: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  revealBox: {
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  cursorInner: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
  },
  sidePanel: {
    position: 'absolute',
    left: 204,
    top: 36,
    width: 106,
    height: 186,
  },
  sideTitle: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  shipRow: {
    marginBottom: 8,
  },
  shipName: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  pips: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 12,
    height: 7,
    borderWidth: 1.5,
  },
  statusBox: {
    marginTop: 8,
    borderWidth: 1.5,
    padding: 4,
    alignItems: 'center',
  },
  statusTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
