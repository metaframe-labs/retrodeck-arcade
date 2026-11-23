import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const SEA_Y = 52;

interface DepthCharge {
  id: number;
  x: number;
  y: number;
}

interface Submarine {
  id: number;
  x: number;
  y: number;
  vx: number;
  w: number;
  points: number;
  fireTimer: number;
}

interface Mine {
  id: number;
  x: number;
  y: number;
}

export class SubmarineHuntGame implements ArcadeGameInstance {
  private shipX = ARENA_W / 2 - 18;
  private readonly shipW = 36;
  private charges: DepthCharge[] = [];
  private subs: Submarine[] = [];
  private mines: Mine[] = [];
  private particles: Particle[] = [];

  private dropCd = 0;
  private spawnTimer = 1.0;
  private subsSunk = 0;

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
    this.shipX = ARENA_W / 2 - 18;
    this.charges = [];
    this.subs = [];
    this.mines = [];
    this.particles = [];
    this.dropCd = 0;
    this.spawnTimer = 0.6;
    this.subsSunk = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    for (let i = 0; i < 3; i++) this.spawnSub();
  }

  private spawnSub(): void {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const depth = 86 + Math.random() * 126;
    const spd = (38 + Math.random() * 35 + this.level * 5) * dir;
    const deepBonus = depth > 165 ? 150 : 80;
    this.subs.push({
      id: this.nextId++,
      x: dir > 0 ? -30 : ARENA_W + 30,
      y: depth,
      vx: spd,
      w: 28,
      points: deepBonus,
      fireTimer: 2.2 + Math.random() * 2.5,
    });
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

    // Move Destroyer
    if (input.left) this.shipX = Math.max(8, this.shipX - 150 * dt);
    if (input.right) this.shipX = Math.min(ARENA_W - 8 - this.shipW, this.shipX + 150 * dt);

    // Drop Depth Charge with [A] or [▼]
    this.dropCd = Math.max(0, this.dropCd - dt);
    if (((input.a && !this.lastA) || input.down) && this.dropCd <= 0 && this.charges.length < 4) {
      this.charges.push({
        id: this.nextId++,
        x: this.shipX + this.shipW / 2,
        y: SEA_Y + 6,
      });
      this.dropCd = 0.35;
      sound = 'shoot';
    }

    // Spawn subs
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.subs.length < 4 + Math.min(3, this.level)) {
      this.spawnSub();
      this.spawnTimer = Math.max(1.2, 2.5 - this.level * 0.15);
    }

    // Update Subs & Launch Floating Mines
    for (let i = this.subs.length - 1; i >= 0; i--) {
      const s = this.subs[i];
      s.x += s.vx * dt;
      s.fireTimer -= dt;
      if (s.fireTimer <= 0 && s.x > 20 && s.x < ARENA_W - 20) {
        this.mines.push({ id: this.nextId++, x: s.x + s.w / 2, y: s.y - 4 });
        s.fireTimer = Math.max(2.0, 4.2 - this.level * 0.2);
      }
      if ((s.vx > 0 && s.x > ARENA_W + 40) || (s.vx < 0 && s.x < -40)) {
        this.subs.splice(i, 1);
      }
    }

    // Update Depth Charges
    for (let ci = this.charges.length - 1; ci >= 0; ci--) {
      const c = this.charges[ci];
      c.y += 115 * dt;
      if (c.y > ARENA_H + 10) {
        this.charges.splice(ci, 1);
        continue;
      }

      for (let si = this.subs.length - 1; si >= 0; si--) {
        const s = this.subs[si];
        if (c.x >= s.x - 4 && c.x <= s.x + s.w + 4 && Math.abs(c.y - s.y) < 11) {
          this.subs.splice(si, 1);
          this.charges.splice(ci, 1);
          this.explode(s.x + s.w / 2, s.y);
          this.subsSunk++;
          this.level = Math.floor(this.subsSunk / 6) + 1;
          this.score += s.points;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
          break;
        }
      }
    }

    // Update Rising Mines
    for (let mi = this.mines.length - 1; mi >= 0; mi--) {
      const m = this.mines[mi];
      m.y -= 62 * dt;
      if (m.y <= SEA_Y + 2) {
        this.mines.splice(mi, 1);
        if (m.x >= this.shipX && m.x <= this.shipX + this.shipW) {
          this.explode(m.x, SEA_Y);
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          } else {
            sound = 'die';
          }
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.lastA = input.a;
    return sound;
  }

  private explode(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(a) * 35,
        vy: Math.sin(a) * 35,
        size: 2.5,
        color: '#FFF',
        life: 0.3,
        decay: 2.8,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'SHIP SUNK!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `SUBS SUNK: ${this.subsSunk} • [A]: DROP DEPTH CHARGE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ocean Surface & Depth Shade */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: SEA_Y, height: 2, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: SEA_Y + 2, bottom: 0, backgroundColor: isLight ? 'rgba(23,38,22,0.08)' : 'rgba(255,255,255,0.06)' }} />

        {/* Destroyer Ship */}
        {!this.gameOver && (
          <View style={{ position: 'absolute', left: this.shipX, top: SEA_Y - 14, width: this.shipW, height: 14, alignItems: 'center' }}>
            <View style={{ width: 10, height: 5, backgroundColor: pixelColor }} />
            <View style={{ width: this.shipW, height: 8, backgroundColor: pixelColor, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
          </View>
        )}

        {/* Depth Charges */}
        {this.charges.map((c) => (
          <View key={c.id} style={{ position: 'absolute', left: c.x - 2.5, top: c.y - 3, width: 5, height: 7, borderRadius: 2, backgroundColor: pixelColor }} />
        ))}

        {/* Rising Mines */}
        {this.mines.map((m) => (
          <View key={m.id} style={{ position: 'absolute', left: m.x - 3, top: m.y - 3, width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: pixelColor, backgroundColor: bg }} />
        ))}

        {/* Enemy Submarines */}
        {this.subs.map((s) => (
          <View key={s.id} style={{ position: 'absolute', left: s.x, top: s.y - 6, width: s.w, height: 12, alignItems: 'center' }}>
            {/* Periscope Tower */}
            <View style={{ width: 8, height: 4, backgroundColor: pixelColor }} />
            {/* Sub Hull */}
            <View style={{ width: s.w, height: 8, borderRadius: 4, backgroundColor: pixelColor, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 4 }}>
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
            </View>
          </View>
        ))}

        {/* Particles */}
        {this.particles.map((p) => (
          <View key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: pixelColor, opacity: p.life }} />
        ))}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>SUBMARINE HUNT</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DROP DEPTH CHARGES • DODGE MINES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
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
