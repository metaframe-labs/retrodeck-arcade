import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const COLS = 16;
const ROWS = 12;
const TILE = 20;

// 0 = dug tunnel, 1 = dirt, 2 = diamond, 3 = boulder
export class MoleMinerGame implements ArcadeGameInstance {
  private grid: number[][] = [];
  private px = 1;
  private py = 1;
  private moveCd = 0;
  private rockTimer = 0;
  private gemsLeft = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
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
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.buildCavern();
  }

  private buildCavern(): void {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    this.px = 1;
    this.py = 1;
    this.grid[1][1] = 0;
    this.grid[1][2] = 0;

    // Place diamonds
    const gemTarget = 6 + Math.min(8, this.level * 2);
    this.gemsLeft = gemTarget;
    let placed = 0;
    while (placed < gemTarget) {
      const r = 1 + Math.floor(Math.random() * (ROWS - 2));
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      if (this.grid[r][c] === 1) {
        this.grid[r][c] = 2;
        placed++;
      }
    }

    // Place boulders
    const rockTarget = 6 + Math.min(10, this.level * 2);
    let rPlaced = 0;
    while (rPlaced < rockTarget) {
      const r = 1 + Math.floor(Math.random() * (ROWS - 3));
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      if (this.grid[r][c] === 1 && !(r <= 2 && c <= 2)) {
        this.grid[r][c] = 3;
        rPlaced++;
      }
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    // Miner digging movement
    this.moveCd = Math.max(0, this.moveCd - dt);
    if (this.moveCd <= 0) {
      let nx = this.px;
      let ny = this.py;
      if (input.left) nx--;
      else if (input.right) nx++;
      else if (input.up) ny--;
      else if (input.down) ny++;

      if ((nx !== this.px || ny !== this.py) && nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
        const cell = this.grid[ny][nx];
        if (cell !== 3) {
          this.px = nx;
          this.py = ny;
          this.moveCd = 0.12;
          if (cell === 2) {
            this.grid[ny][nx] = 0;
            this.gemsLeft--;
            this.score += 100;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'score';
            if (this.gemsLeft <= 0) {
              this.level++;
              this.score += 300;
              if (this.score > this.highScore) this.highScore = this.score;
              this.buildCavern();
              this.lastA = input.a;
              return 'levelclear';
            }
          } else if (cell === 1) {
            this.grid[ny][nx] = 0;
            this.score += 5;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'hit';
          }
        }
      }
    }

    // Falling boulders physics (Boulder Dash / Dig Dug style)
    this.rockTimer += dt;
    if (this.rockTimer >= 0.28) {
      this.rockTimer = 0;
      for (let r = ROWS - 2; r >= 0; r--) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] === 3 && this.grid[r + 1][c] === 0) {
            // Fall down 1 tile
            this.grid[r][c] = 0;
            this.grid[r + 1][c] = 3;
            if (this.px === c && this.py === r + 1) {
              this.lives--;
              if (this.lives <= 0) {
                this.gameOver = true;
                this.lastA = input.a;
                return 'gameover';
              } else {
                this.px = 1;
                this.py = 1;
                this.grid[1][1] = 0;
                sound = 'die';
              }
            }
          }
        }
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'CRUSHED BY BOULDER!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO DIG AGAIN'
        : `GEMS LEFT: ${this.gemsLeft} • DIG ◆ • WATCH FALLING ●`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {this.grid.map((row, r) =>
          row.map((cell, c) => {
            if (cell === 0) return null;
            if (cell === 1) {
              // Dirt
              return (
                <View
                  key={`d-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * TILE + 1,
                    top: r * TILE + 1,
                    width: TILE - 2,
                    height: TILE - 2,
                    backgroundColor: isLight ? 'rgba(23,38,22,0.22)' : 'rgba(255,255,255,0.18)',
                    borderRadius: 2,
                  }}
                />
              );
            }
            if (cell === 2) {
              // Diamond
              return (
                <View
                  key={`g-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * TILE,
                    top: r * TILE,
                    width: TILE,
                    height: TILE,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: pixelColor }}>◆</Text>
                </View>
              );
            }
            // Boulder
            return (
              <View
                key={`b-${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * TILE + 2,
                  top: r * TILE + 2,
                  width: TILE - 4,
                  height: TILE - 4,
                  borderRadius: (TILE - 4) / 2,
                  backgroundColor: pixelColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: bg }} />
              </View>
            );
          })
        )}

        {/* Miner Character */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.px * TILE + 3,
              top: this.py * TILE + 3,
              width: TILE - 6,
              height: TILE - 6,
              borderWidth: 2,
              borderColor: pixelColor,
              borderRadius: 4,
              backgroundColor: bg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MOLE MINER DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DIG GEMS • AVOID FALLING ROCKS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DIG</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
