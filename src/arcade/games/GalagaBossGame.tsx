import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromBoss: boolean;
}

export class GalagaBossGame implements ArcadeGameInstance {
  private px = ARENA_W / 2 - 9;
  private readonly py = 206;
  private shootCd = 0;

  private bossX = ARENA_W / 2 - 28;
  private bossY = 34;
  private bossDir = 1;
  private bossHp = 25;
  private bossMaxHp = 25;
  private bossShootTimer = 0.8;
  private bossPattern = 0;

  private bullets: Bullet[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private bossLevel = 1;
  private invulnTimer = 0;
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
    this.px = ARENA_W / 2 - 9;
    this.score = 0;
    this.lives = 3;
    this.bossLevel = 1;
    this.invulnTimer = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.bullets = [];
    this.particles = [];
    this.spawnBoss();
  }

  private spawnBoss(): void {
    this.bossX = ARENA_W / 2 - 28;
    this.bossY = 34;
    this.bossDir = 1;
    this.bossMaxHp = 20 + this.bossLevel * 12;
    this.bossHp = this.bossMaxHp;
    this.bossShootTimer = 0.9;
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

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Player movement
    if (input.left) this.px = Math.max(10, this.px - 170 * dt);
    if (input.right) this.px = Math.min(ARENA_W - 28, this.px + 170 * dt);

    // Twin laser rapid fire
    this.shootCd = Math.max(0, this.shootCd - dt);
    if ((input.a || input.b) && this.shootCd <= 0) {
      this.bullets.push({ id: this.nextId++, x: this.px + 3, y: this.py - 4, vx: 0, vy: -290, fromBoss: false });
      this.bullets.push({ id: this.nextId++, x: this.px + 14, y: this.py - 4, vx: 0, vy: -290, fromBoss: false });
      this.shootCd = 0.22;
      sound = 'shoot';
    }

    // Boss movement & bullet-hell patterns
    const bSpd = 68 + this.bossLevel * 14;
    this.bossX += this.bossDir * bSpd * dt;
    if (this.bossX < 18) { this.bossX = 18; this.bossDir = 1; }
    if (this.bossX > ARENA_W - 74) { this.bossX = ARENA_W - 74; this.bossDir = -1; }

    this.bossShootTimer -= dt;
    if (this.bossShootTimer <= 0) {
      this.bossShootTimer = Math.max(0.42, 1.05 - this.bossLevel * 0.08);
      this.bossPattern = (this.bossPattern + 1) % 3;
      const cx = this.bossX + 28;
      const cy = this.bossY + 24;

      if (this.bossPattern === 0) {
        // 3-way spread
        for (const vx of [-70, 0, 70]) {
          this.bullets.push({ id: this.nextId++, x: cx, y: cy, vx, vy: 130 + this.bossLevel * 10, fromBoss: true });
        }
      } else if (this.bossPattern === 1) {
        // Aimed shot
        const dx = this.px + 9 - cx;
        const dy = this.py - cy;
        const d = Math.hypot(dx, dy) || 1;
        const spd = 155 + this.bossLevel * 12;
        this.bullets.push({ id: this.nextId++, x: cx, y: cy, vx: (dx / d) * spd, vy: (dy / d) * spd, fromBoss: true });
      } else {
        // Twin wing cannons
        this.bullets.push({ id: this.nextId++, x: this.bossX + 6, y: cy, vx: 0, vy: 150, fromBoss: true });
        this.bullets.push({ id: this.nextId++, x: this.bossX + 50, y: cy, vx: 0, vy: 150, fromBoss: true });
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < -10 || b.y > ARENA_H + 10 || b.x < -10 || b.x > ARENA_W + 10) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (!b.fromBoss) {
        // Player laser vs Boss
        if (b.x >= this.bossX && b.x <= this.bossX + 56 && b.y >= this.bossY && b.y <= this.bossY + 26) {
          this.bullets.splice(i, 1);
          this.bossHp--;
          this.score += 20;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';

          if (this.bossHp <= 0) {
            this.explode(this.bossX + 28, this.bossY + 13);
            this.score += 500 * this.bossLevel;
            if (this.score > this.highScore) this.highScore = this.score;
            this.bossLevel++;
            this.bullets = [];
            this.spawnBoss();
            sound = 'levelclear';
            break;
          }
        }
      } else {
        // Boss plasma vs Player
        if (
          this.invulnTimer <= 0 &&
          b.x >= this.px + 2 &&
          b.x <= this.px + 16 &&
          b.y >= this.py &&
          b.y <= this.py + 14
        ) {
          this.bullets.splice(i, 1);
          this.explode(this.px + 9, this.py + 7);
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          } else {
            this.invulnTimer = 1.4;
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
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(a) * 55,
        vy: Math.sin(a) * 55,
        size: 3,
        color: '#FFF',
        life: 0.35,
        decay: 2.4,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.bossLevel,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'STARFIGHTER LOST' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `BOSS LV.${this.bossLevel} • ◀/▶: DODGE • [A]: TWIN LASER`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Boss Health Bar */}
        <View style={[styles.hpTrack, { borderColor: pixelColor }]}>
          <View style={{ width: `${Math.max(0, (this.bossHp / this.bossMaxHp) * 100)}%`, height: '100%', backgroundColor: pixelColor }} />
        </View>

        {/* Dreadnought Boss Ship */}
        <View style={{ position: 'absolute', left: this.bossX, top: this.bossY, width: 56, height: 26, alignItems: 'center' }}>
          <View style={{ width: 56, height: 10, borderRadius: 3, backgroundColor: pixelColor }} />
          <View style={{ width: 34, height: 10, backgroundColor: pixelColor, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ width: 5, height: 4, backgroundColor: bg }} />
            <View style={{ width: 5, height: 4, backgroundColor: bg }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 44 }}>
            <View style={{ width: 6, height: 6, backgroundColor: pixelColor }} />
            <View style={{ width: 6, height: 6, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x - (b.fromBoss ? 2.5 : 1),
              top: b.y - (b.fromBoss ? 2.5 : 4),
              width: b.fromBoss ? 5 : 2,
              height: b.fromBoss ? 5 : 8,
              borderRadius: b.fromBoss ? 2.5 : 1,
              backgroundColor: pixelColor,
            }}
          />
        ))}

        {/* Player Starfighter */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.px,
              top: this.py,
              width: 18,
              height: 14,
              alignItems: 'center',
              opacity: this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0 ? 0.3 : 1,
            }}
          >
            <View style={{ width: 4, height: 12, backgroundColor: pixelColor }} />
            <View style={{ position: 'absolute', top: 6, width: 18, height: 5, borderRadius: 1, backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => (
          <View key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: pixelColor, opacity: p.life }} />
        ))}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>GALAGA BOSS DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DEFEAT DREADNOUGHT BOSSES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hpTrack: {
    position: 'absolute',
    top: 10,
    left: 48,
    right: 48,
    height: 7,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 1,
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
