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
  life: number;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 'large' | 'medium' | 'small';
  radius: number;
  rotation: number;
  rotSpeed: number;
}

export class AsteroidsGame implements ArcadeGameInstance {
  // Ship Physics
  private shipX = ARENA_W / 2;
  private shipY = ARENA_H / 2;
  private shipVx = 0;
  private shipVy = 0;
  private shipAngle = -Math.PI / 2; // radians, pointing UP
  private isThrusting = false;

  private bullets: Bullet[] = [];
  private shootCooldown = 0;

  private asteroids: Asteroid[] = [];
  private nextEntityId = 1;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;

  private particles: Particle[] = [];
  private lastA = false;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.shipX = ARENA_W / 2;
    this.shipY = ARENA_H / 2;
    this.shipVx = 0;
    this.shipVy = 0;
    this.shipAngle = -Math.PI / 2;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.bullets = [];
    this.particles = [];

    this.spawnWave();
  }

  private spawnWave(): void {
    this.asteroids = [];
    const count = 3 + Math.min(3, this.wave);

    for (let i = 0; i < count; i++) {
      // Spawn away from ship
      let ax = Math.random() * ARENA_W;
      let ay = Math.random() * ARENA_H;
      while (Math.hypot(ax - this.shipX, ay - this.shipY) < 70) {
        ax = Math.random() * ARENA_W;
        ay = Math.random() * ARENA_H;
      }

      const speed = 25 + Math.random() * 20 + this.wave * 3;
      const angle = Math.random() * Math.PI * 2;
      this.asteroids.push({
        id: this.nextEntityId++,
        x: ax,
        y: ay,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 'large',
        radius: 18,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 60,
      });
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    // Ship Rotation (Left / Right)
    const rotSpeed = 3.8;
    if (input.left) {
      this.shipAngle -= rotSpeed * dt;
    }
    if (input.right) {
      this.shipAngle += rotSpeed * dt;
    }

    // Ship Thrust (Up button)
    this.isThrusting = input.up;
    if (this.isThrusting) {
      const thrust = 160;
      this.shipVx += Math.cos(this.shipAngle) * thrust * dt;
      this.shipVy += Math.sin(this.shipAngle) * thrust * dt;

      // Exhaust particles
      if (Math.random() < 0.6) {
        const exAngle = this.shipAngle + Math.PI + (Math.random() - 0.5) * 0.4;
        this.particles.push({
          id: this.nextEntityId++,
          x: this.shipX - Math.cos(this.shipAngle) * 8,
          y: this.shipY - Math.sin(this.shipAngle) * 8,
          vx: Math.cos(exAngle) * 60,
          vy: Math.sin(exAngle) * 60,
          size: 2,
          color: '#FFF',
          life: 0.25,
          decay: 3.5,
        });
      }
    }

    // Inertia drag
    this.shipVx *= Math.pow(0.985, dt * 60);
    this.shipVy *= Math.pow(0.985, dt * 60);

    // Ship Move & Screen Wrap
    this.shipX = (this.shipX + this.shipVx * dt + ARENA_W) % ARENA_W;
    this.shipY = (this.shipY + this.shipVy * dt + ARENA_H) % ARENA_H;

    // Shooting (A or B button)
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const triggerShoot = (input.a && !this.lastA) || input.b;

    if (triggerShoot && this.shootCooldown <= 0 && this.bullets.length < 5) {
      const bulletSpeed = 240;
      this.bullets.push({
        id: this.nextEntityId++,
        x: this.shipX + Math.cos(this.shipAngle) * 10,
        y: this.shipY + Math.sin(this.shipAngle) * 10,
        vx: this.shipVx + Math.cos(this.shipAngle) * bulletSpeed,
        vy: this.shipVy + Math.sin(this.shipAngle) * bulletSpeed,
        life: 1.1,
      });
      this.shootCooldown = 0.2;
      triggeredSound = 'shoot';
    }

    // Update Bullets
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.x = (b.x + b.vx * dt + ARENA_W) % ARENA_W;
      b.y = (b.y + b.vy * dt + ARENA_H) % ARENA_H;
      b.life -= dt;
      if (b.life <= 0) {
        this.bullets.splice(bi, 1);
      }
    }

    // Update Asteroids & Wrap
    for (const a of this.asteroids) {
      a.x = (a.x + a.vx * dt + ARENA_W) % ARENA_W;
      a.y = (a.y + a.vy * dt + ARENA_H) % ARENA_H;
      a.rotation += a.rotSpeed * dt;
    }

    // Bullet vs Asteroid Collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      let bulletHit = false;

      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);

        if (dist <= a.radius) {
          // Asteroid Destroyed / Split
          this.bullets.splice(bi, 1);
          bulletHit = true;
          this.createExplosion(a.x, a.y, a.radius);
          triggeredSound = 'hit';

          if (a.size === 'large') {
            this.score += 20;
            this.splitAsteroid(a, 'medium', 12, 45);
          } else if (a.size === 'medium') {
            this.score += 50;
            this.splitAsteroid(a, 'small', 7, 70);
          } else {
            this.score += 100;
          }
          if (this.score > this.highScore) this.highScore = this.score;

          this.asteroids.splice(ai, 1);
          break;
        }
      }
      if (bulletHit) continue;
    }

    // Ship vs Asteroid Collision
    for (const a of this.asteroids) {
      if (Math.hypot(this.shipX - a.x, this.shipY - a.y) < a.radius + 6) {
        this.createExplosion(this.shipX, this.shipY, 20);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          // Respawn in center
          this.shipX = ARENA_W / 2;
          this.shipY = ARENA_H / 2;
          this.shipVx = 0;
          this.shipVy = 0;
          this.lastA = input.a;
          return 'die';
        }
      }
    }

    // Check Wave Cleared
    if (this.asteroids.length === 0) {
      this.wave++;
      this.score += 300;
      if (this.score > this.highScore) this.highScore = this.score;
      this.spawnWave();
      this.lastA = input.a;
      return 'levelclear';
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.lastA = input.a;
    return triggeredSound;
  }

  private splitAsteroid(
    parent: Asteroid,
    newSize: 'medium' | 'small',
    newRadius: number,
    baseSpeed: number
  ): void {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed + Math.random() * 25;
      this.asteroids.push({
        id: this.nextEntityId++,
        x: parent.x,
        y: parent.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: newSize,
        radius: newRadius,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 90,
      });
    }
  }

  private createExplosion(x: number, y: number, radius: number): void {
    const count = Math.min(10, Math.floor(radius / 2) + 3);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 30 + Math.random() * 40;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.35,
        decay: 2.2,
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
      message: this.gameOver ? 'SHIP DESTROYED' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : '◀ / ▶: ROTATE • [▲]: THRUST • [A]: FIRE',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Asteroids (Angular Vector Rock Outlines) */}
        {this.asteroids.map((a) => {
          const diam = a.radius * 2;
          return (
            <View
              key={a.id}
              style={[
                styles.asteroidRock,
                {
                  left: a.x - a.radius,
                  top: a.y - a.radius,
                  width: diam,
                  height: diam,
                  borderColor: pixelColor,
                  borderRadius: a.radius * 0.7,
                  borderWidth: 1.5,
                  transform: [{ rotate: `${a.rotation}deg` }],
                  backgroundColor: isLight ? 'rgba(23, 38, 22, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              {/* Inner crater accent */}
              {a.size !== 'small' && (
                <View
                  style={[
                    styles.craterDot,
                    {
                      borderColor: pixelColor,
                      width: a.size === 'large' ? 6 : 4,
                      height: a.size === 'large' ? 6 : 4,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={[
              styles.bullet,
              {
                left: b.x - 1.5,
                top: b.y - 1.5,
                backgroundColor: pixelColor,
              },
            ]}
          />
        ))}

        {/* Player Spaceship (Classic Vector Triangle) */}
        {!this.gameOver && (
          <View
            style={[
              styles.shipWrap,
              {
                left: this.shipX - 9,
                top: this.shipY - 9,
                transform: [{ rotate: `${(this.shipAngle * 180) / Math.PI + 90}deg` }],
              },
            ]}
          >
            {/* Triangular Ship Silhouette */}
            <View
              style={[
                styles.shipNose,
                { borderBottomColor: pixelColor },
              ]}
            />
            {/* Thrust flame */}
            {this.isThrusting && (
              <View
                style={[
                  styles.thrustFlame,
                  { borderTopColor: isLight ? palette.screenBg : '#FFF' },
                ]}
              />
            )}
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: pixelColor,
                opacity: p.life,
              },
            ]}
          />
        ))}

        {/* Start / Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? palette.screenBg : '#111',
                  borderColor: pixelColor,
                },
              ]}
            >
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ASTEROIDS DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>VECTOR SPACE SHOOTER</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  asteroidRock: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  craterDot: {
    borderWidth: 1,
    borderRadius: 3,
  },
  bullet: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  shipWrap: {
    position: 'absolute',
    width: 18,
    height: 18,
    alignItems: 'center',
  },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  thrustFlame: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
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
