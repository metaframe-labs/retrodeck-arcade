import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 15;
const ROWS = 11;
const TILE = 20; // 300x220 centered
const OX = 10;
const OY = 10;

interface Bomb {
  id: number;
  c: number;
  r: number;
  timer: number;
}

interface Flame {
  c: number;
  r: number;
  timer: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export class BombermanGame implements ArcadeGameInstance {
  private solids = new Set<string>();
  private crates = new Set<string>();
  private bombs: Bomb[] = [];
  private flames: Flame[] = [];
  private enemies: Enemy[] = [];

  private px = 1;
  private py = 1;
  private moveCooldown = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
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
    this.buildStage();
  }

  private buildStage(): void {
    this.solids.clear();
    this.crates.clear();
    this.bombs = [];
    this.flames = [];
    this.enemies = [];
    this.px = 1;
    this.py = 1;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Outer wall & checkerboard pillars
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0)) {
          this.solids.add(`${c},${r}`);
        } else {
          // Keep top-left safe for player
          if ((c <= 2 && r <= 2)) continue;
          if (Math.random() < 0.36) {
            this.crates.add(`${c},${r}`);
          }
        }
      }
    }

    // Spawn enemies on open tiles far from player
    const enemyCount = 3 + Math.min(4, this.level);
    let spawned = 0;
    let tries = 0;
    while (spawned < enemyCount && tries < 200) {
      tries++;
      const c = 3 + Math.floor(Math.random() * (COLS - 4));
      const r = 3 + Math.floor(Math.random() * (ROWS - 4));
      const k = `${c},${r}`;
      if (!this.solids.has(k) && !this.crates.has(k)) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
        this.enemies.push({ id: this.nextId++, x: c, y: r, dx, dy });
        spawned++;
      }
    }
  }

  private isWalkable(c: number, r: number): boolean {
    const k = `${c},${r}`;
    if (this.solids.has(k) || this.crates.has(k)) return false;
    if (this.bombs.some((b) => b.c === c && b.r === r)) return false;
    return true;
  }

  private detonateBomb(b: Bomb): void {
    const range = 2;
    const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const [dx, dy] of dirs) {
      const steps = dx === 0 && dy === 0 ? 0 : range;
      for (let s = dx === 0 && dy === 0 ? 0 : 1; s <= steps; s++) {
        const nc = b.c + dx * s;
        const nr = b.r + dy * s;
        const k = `${nc},${nr}`;
        if (this.solids.has(k)) break;

        this.flames.push({ c: nc, r: nr, timer: 0.4 });
        if (this.crates.has(k)) {
          this.crates.delete(k);
          this.score += 20;
          if (this.score > this.highScore) this.highScore = this.score;
          break;
        }
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

    // Player grid movement with responsive repeat
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);
    if (this.moveCooldown <= 0) {
      let nx = this.px;
      let ny = this.py;
      if (input.left) nx--;
      else if (input.right) nx++;
      else if (input.up) ny--;
      else if (input.down) ny++;

      if ((nx !== this.px || ny !== this.py) && this.isWalkable(nx, ny)) {
        this.px = nx;
        this.py = ny;
        this.moveCooldown = 0.13;
      }
    }

    // Place Bomb with [A] or [B]
    if ((input.a && !this.lastA) || input.b) {
      const hasHere = this.bombs.some((b) => b.c === this.px && b.r === this.py);
      if (!hasHere && this.bombs.length < 3) {
        this.bombs.push({ id: this.nextId++, c: this.px, r: this.py, timer: 2.0 });
        sound = 'hit';
      }
    }

    // Update Bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.timer -= dt;
      if (b.timer <= 0) {
        this.bombs.splice(i, 1);
        this.detonateBomb(b);
        sound = 'explode';
      }
    }

    // Update Flames & Check hits
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.timer -= dt;
      if (f.timer <= 0) {
        this.flames.splice(i, 1);
        continue;
      }

      // Hit Player
      if (f.c === this.px && f.r === this.py) {
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.px = 1;
          this.py = 1;
          this.flames = [];
          this.lastA = input.a;
          return 'die';
        }
      }

      // Hit Enemies
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (Math.round(e.x) === f.c && Math.round(e.y) === f.r) {
          this.enemies.splice(ei, 1);
          this.score += 150;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
        }
      }
    }

    // Move Enemies
    const eSpd = 2.0 + this.level * 0.25;
    for (const e of this.enemies) {
      const nx = e.x + e.dx * eSpd * dt;
      const ny = e.y + e.dy * eSpd * dt;
      const checkC = Math.round(nx + e.dx * 0.35);
      const checkR = Math.round(ny + e.dy * 0.35);

      if (this.isWalkable(checkC, checkR)) {
        e.x = nx;
        e.y = ny;
      } else {
        e.x = Math.round(e.x);
        e.y = Math.round(e.y);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
          this.isWalkable(e.x + dx, e.y + dy)
        );
        if (dirs.length > 0) {
          const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
          e.dx = dx;
          e.dy = dy;
        }
      }

      // Enemy touches player
      if (Math.hypot(e.x - this.px, e.y - this.py) < 0.65) {
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.px = 1;
          this.py = 1;
          this.lastA = input.a;
          return 'die';
        }
      }
    }

    // Stage clear
    if (this.enemies.length === 0) {
      this.level++;
      this.score += 500;
      if (this.score > this.highScore) this.highScore = this.score;
      this.buildStage();
      this.lastA = input.a;
      return 'levelclear';
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
      message: this.gameOver ? 'BLASTED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `FOES: ${this.enemies.length} • D-PAD: MOVE • [A]: DROP BOMB`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Solid Pillars */}
        {Array.from(this.solids).map((k) => {
          const [c, r] = k.split(',').map(Number);
          return (
            <View
              key={`s-${k}`}
              style={{
                position: 'absolute',
                left: OX + c * TILE,
                top: OY + r * TILE,
                width: TILE - 1,
                height: TILE - 1,
                backgroundColor: pixelColor,
              }}
            />
          );
        })}

        {/* Destructible Crates */}
        {Array.from(this.crates).map((k) => {
          const [c, r] = k.split(',').map(Number);
          return (
            <View
              key={`cr-${k}`}
              style={{
                position: 'absolute',
                left: OX + c * TILE + 1,
                top: OY + r * TILE + 1,
                width: TILE - 3,
                height: TILE - 3,
                borderWidth: 1.5,
                borderColor: pixelColor,
                backgroundColor: isLight ? 'rgba(23,38,22,0.18)' : 'rgba(255,255,255,0.18)',
              }}
            />
          );
        })}

        {/* Bombs */}
        {this.bombs.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: OX + b.c * TILE + 3,
              top: OY + b.r * TILE + 3,
              width: TILE - 6,
              height: TILE - 6,
              borderRadius: (TILE - 6) / 2,
              backgroundColor: pixelColor,
              transform: [{ scale: Math.floor(b.timer * 8) % 2 === 0 ? 1.05 : 0.85 }],
            }}
          />
        ))}

        {/* Explosion Flames */}
        {this.flames.map((f, i) => (
          <View
            key={`fl-${i}`}
            style={{
              position: 'absolute',
              left: OX + f.c * TILE + 1,
              top: OY + f.r * TILE + 1,
              width: TILE - 2,
              height: TILE - 2,
              backgroundColor: pixelColor,
              opacity: 0.75,
              borderRadius: 3,
            }}
          />
        ))}

        {/* Enemies */}
        {this.enemies.map((e) => (
          <View
            key={e.id}
            style={{
              position: 'absolute',
              left: OX + e.x * TILE + 3,
              top: OY + e.y * TILE + 3,
              width: TILE - 6,
              height: TILE - 6,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: bg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 4, height: 4, backgroundColor: pixelColor }} />
          </View>
        ))}

        {/* Player */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: OX + this.px * TILE + 3,
              top: OY + this.py * TILE + 2,
              width: TILE - 6,
              height: TILE - 4,
              alignItems: 'center',
            }}
          >
            <View style={{ width: 10, height: 8, borderRadius: 4, backgroundColor: pixelColor }} />
            <View style={{ width: 12, height: 7, borderRadius: 2, backgroundColor: pixelColor, marginTop: 1 }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BOMBERMAN DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>BLAST CRATES & FOES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
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
