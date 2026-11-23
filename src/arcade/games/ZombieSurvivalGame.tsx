import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Zombie {
  id: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class ZombieSurvivalGame implements ArcadeGameInstance {
  private px = ARENA_W / 2;
  private py = ARENA_H / 2;
  private aimX = 1;
  private aimY = 0;

  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];

  private shootCd = 0;
  private spawnTimer = 0.8;
  private kills = 0;
  private invulnTimer = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private wave = 1;
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
    this.px = ARENA_W / 2;
    this.py = ARENA_H / 2;
    this.aimX = 1;
    this.aimY = 0;
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.shootCd = 0;
    this.spawnTimer = 0.7;
    this.kills = 0;
    this.invulnTimer = 0;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
  }

  private spawnZombie(): void {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = Math.random() * ARENA_W; y = -12; }
    else if (edge === 1) { x = ARENA_W + 12; y = Math.random() * ARENA_H; }
    else if (edge === 2) { x = Math.random() * ARENA_W; y = ARENA_H + 12; }
    else { x = -12; y = Math.random() * ARENA_H; }

    const isBrute = this.wave >= 2 && Math.random() < 0.2;
    this.zombies.push({
      id: this.nextId++,
      x,
      y,
      speed: (isBrute ? 26 : 36) + this.wave * 4 + Math.random() * 10,
      hp: isBrute ? 2 : 1,
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

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // 8-direction movement & aim tracking
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.aimX = dx;
      this.aimY = dy;
      this.px = Math.max(12, Math.min(ARENA_W - 12, this.px + dx * 115 * dt));
      this.py = Math.max(12, Math.min(ARENA_H - 12, this.py + dy * 115 * dt));
    }

    // Shoot towards last move direction (or nearest zombie if pressing B)
    this.shootCd = Math.max(0, this.shootCd - dt);
    if ((input.a || input.b) && this.shootCd <= 0) {
      let bx = this.aimX;
      let by = this.aimY;
      // Auto-assist toward closest zombie if B is held
      if (input.b && this.zombies.length > 0) {
        let closest = this.zombies[0];
        let minD = Math.hypot(closest.x - this.px, closest.y - this.py);
        for (const z of this.zombies) {
          const d = Math.hypot(z.x - this.px, z.y - this.py);
          if (d < minD) { minD = d; closest = z; }
        }
        if (minD > 0) {
          bx = (closest.x - this.px) / minD;
          by = (closest.y - this.py) / minD;
        }
      }

      this.bullets.push({
        id: this.nextId++,
        x: this.px + bx * 8,
        y: this.py + by * 8,
        vx: bx * 270,
        vy: by * 270,
      });
      this.shootCd = 0.22;
      sound = 'shoot';
    }

    // Spawn zombies
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.zombies.length < 14) {
      this.spawnZombie();
      this.spawnTimer = Math.max(0.45, 1.35 - this.wave * 0.1);
    }

    // Update bullets
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -10 || b.x > ARENA_W + 10 || b.y < -10 || b.y > ARENA_H + 10) {
        this.bullets.splice(bi, 1);
        continue;
      }

      for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
        const z = this.zombies[zi];
        if (Math.hypot(b.x - z.x, b.y - z.y) < 11) {
          this.bullets.splice(bi, 1);
          z.hp--;
          if (z.hp <= 0) {
            this.zombies.splice(zi, 1);
            this.kills++;
            this.wave = Math.floor(this.kills / 10) + 1;
            this.score += 50;
            if (this.score > this.highScore) this.highScore = this.score;
            this.splat(z.x, z.y);
            sound = 'score';
          } else {
            sound = 'hit';
          }
          break;
        }
      }
    }

    // Update zombies chasing player
    for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
      const z = this.zombies[zi];
      const d = Math.hypot(this.px - z.x, this.py - z.y);
      if (d > 1) {
        z.x += ((this.px - z.x) / d) * z.speed * dt;
        z.y += ((this.py - z.y) / d) * z.speed * dt;
      }

      if (this.invulnTimer <= 0 && d < 12) {
        this.zombies.splice(zi, 1);
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

  private splat(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(a) * 35,
        vy: Math.sin(a) * 35,
        size: 2,
        color: '#FFF',
        life: 0.28,
        decay: 3,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'EATEN ALIVE!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO SURVIVE AGAIN'
        : `KILLS: ${this.kills} • [A]: SHOOT • [B]: AUTO-AIM`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Arena Border */}
        <View style={[StyleSheet.absoluteFill, { borderWidth: 1.5, borderColor: pixelColor, opacity: 0.4 }]} />

        {/* Zombies */}
        {this.zombies.map((z) => (
          <View
            key={z.id}
            style={{
              position: 'absolute',
              left: z.x - 6,
              top: z.y - 6,
              width: z.hp > 1 ? 15 : 12,
              height: z.hp > 1 ? 15 : 12,
              borderRadius: 3,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: z.hp > 1 ? pixelColor : bg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: '900', color: z.hp > 1 ? bg : pixelColor }}>Z</Text>
          </View>
        ))}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View key={b.id} style={{ position: 'absolute', left: b.x - 1.5, top: b.y - 1.5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: pixelColor }} />
        ))}

        {/* Survivor Player */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.px - 7,
              top: this.py - 7,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: pixelColor,
              opacity: this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0 ? 0.3 : 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Gun barrel indicator */}
            <View
              style={{
                position: 'absolute',
                left: 5 + this.aimX * 6,
                top: 5 + this.aimY * 6,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: pixelColor,
              }}
            />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: bg }} />
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => (
          <View key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: pixelColor, opacity: p.life }} />
        ))}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ZOMBIE ARENA DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TOP-DOWN HORDE SURVIVAL</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FIGHT</Text>
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
