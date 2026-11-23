import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
  Particle,
} from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const CEILING_SPIKE_H = 12;
const BALL_RADIUS = 6;
const PLATFORM_GAP = 54; // Generous vertical breathing room between platforms

interface Platform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  isSpikes: boolean;
  hasHeart: boolean;
  heartCollected: boolean;
  scored: boolean;
}

export class RapidRollGame implements ArcadeGameInstance {
  // Ball Physics
  private ball = {
    x: ARENA_W / 2,
    y: 80,
    vx: 0,
    vy: 0,
    r: BALL_RADIUS,
    invincibleTimer: 0,
  };

  private platforms: Platform[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;

  private nextEntityId = 1;
  private nextPlatformId = 1;
  private platformSpeed = 50;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public init(): void {
    this.ball = {
      x: ARENA_W / 2,
      y: 75,
      vx: 0,
      vy: 0,
      r: BALL_RADIUS,
      invincibleTimer: 0,
    };

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.platformSpeed = 50;
    this.gameOver = false;
    this.isMenu = true;
    this.platforms = [];
    this.particles = [];
    this.nextEntityId = 1;
    this.nextPlatformId = 1;

    // Initial starter layout: clean and spacious
    this.spawnInitialPlatforms();
  }

  public reset(): void {
    this.init();
  }

  private spawnInitialPlatforms(): void {
    // 1. Safe platform directly under player
    this.platforms.push({
      id: this.nextPlatformId++,
      x: ARENA_W / 2 - 35,
      y: 95,
      w: 70,
      h: 7,
      isSpikes: false,
      hasHeart: false,
      heartCollected: false,
      scored: true,
    });

    // 2. Cascade down with generous gaps
    let currentY = 95 + PLATFORM_GAP;
    while (currentY < ARENA_H + 40) {
      const w = 60 + Math.random() * 25;
      const x = Math.max(16, Math.min(ARENA_W - w - 16, Math.random() * (ARENA_W - w)));
      this.platforms.push({
        id: this.nextPlatformId++,
        x,
        y: currentY,
        w,
        h: 7,
        isSpikes: false,
        hasHeart: currentY > 180 && Math.random() < 0.25,
        heartCollected: false,
        scored: false,
      });
      currentY += PLATFORM_GAP;
    }
  }

  private spawnPlatformBelow(lastY: number): void {
    const w = 55 + Math.random() * 25;
    const x = Math.max(16, Math.min(ARENA_W - w - 16, Math.random() * (ARENA_W - w)));

    // Occasional spiked platform (starts after score > 150, max 25% chance)
    const isSpikes = this.score > 150 && Math.random() < 0.22;

    // Heart is rare (only on normal platforms, max ~8% chance, and only if lives < 4)
    const hasHeart = !isSpikes && this.lives < 4 && Math.random() < 0.08;

    this.platforms.push({
      id: this.nextPlatformId++,
      x,
      y: lastY + PLATFORM_GAP,
      w,
      h: 7,
      isSpikes,
      hasHeart,
      heartCollected: false,
      scored: false,
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a) {
        this.reset();
        return 'hit';
      }
      return null;
    }

    let soundToPlay: ArcadeSound | null = null;

    // Survival score & gradual speed increase
    this.score += Math.round(dt * 15);
    if (this.score > this.highScore) this.highScore = this.score;

    this.level = Math.min(8, Math.floor(this.score / 600) + 1);
    this.platformSpeed = 50 + (this.level - 1) * 6; // gentle speed curve

    if (this.ball.invincibleTimer > 0) {
      this.ball.invincibleTimer -= dt;
    }

    // 1. Horizontal Ball Controls
    const accel = 500;
    const maxVx = 150;
    const friction = 0.86;

    if (input.left) {
      this.ball.vx -= accel * dt;
    } else if (input.right) {
      this.ball.vx += accel * dt;
    } else {
      this.ball.vx *= Math.pow(friction, dt * 60);
    }
    this.ball.vx = Math.max(-maxVx, Math.min(maxVx, this.ball.vx));
    this.ball.x += this.ball.vx * dt;

    // Screen walls
    if (this.ball.x - this.ball.r < 4) {
      this.ball.x = 4 + this.ball.r;
      this.ball.vx = 0;
    } else if (this.ball.x + this.ball.r > ARENA_W - 4) {
      this.ball.x = ARENA_W - 4 - this.ball.r;
      this.ball.vx = 0;
    }

    // 2. Gravity & Vertical Movement
    const gravity = 420;
    this.ball.vy = Math.min(240, this.ball.vy + gravity * dt);
    const prevY = this.ball.y;
    this.ball.y += this.ball.vy * dt;

    // 3. Move Platforms Upward & Handle Collisions
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      p.y -= this.platformSpeed * dt;

      // Check Ball Landing from above
      const ballBottom = this.ball.y + this.ball.r;
      const prevBallBottom = prevY + this.ball.r;
      const withinX =
        this.ball.x + this.ball.r * 0.7 >= p.x &&
        this.ball.x - this.ball.r * 0.7 <= p.x + p.w;

      if (
        withinX &&
        prevBallBottom <= p.y + 5 &&
        ballBottom >= p.y &&
        ballBottom <= p.y + p.h + 8 &&
        this.ball.vy >= -this.platformSpeed
      ) {
        if (p.isSpikes) {
          // Landed on spikes!
          if (this.ball.invincibleTimer <= 0) {
            return this.handleHurt();
          }
        } else {
          // Safe landing on platform
          this.ball.y = p.y - this.ball.r;
          this.ball.vy = -this.platformSpeed; // ride platform up

          if (!p.scored) {
            p.scored = true;
            this.score += 20;
            if (this.score > this.highScore) this.highScore = this.score;
            if (!soundToPlay) soundToPlay = 'hit';
          }
        }
      }

      // Collect Heart
      if (p.hasHeart && !p.heartCollected) {
        const hx = p.x + p.w / 2;
        const hy = p.y - 10;
        const dist = Math.hypot(this.ball.x - hx, this.ball.y - hy);
        if (dist < this.ball.r + 8) {
          p.heartCollected = true;
          this.lives = Math.min(5, this.lives + 1);
          this.score += 100;
          if (this.score > this.highScore) this.highScore = this.score;
          soundToPlay = 'powerup';
          this.spawnSparkles(hx, hy, '#FF2A6D', 8);
        }
      }

      // Recycle platform when off top of screen
      if (p.y < -15) {
        this.platforms.splice(i, 1);
      }
    }

    // Spawn new platform below if needed
    let lowestY = -999;
    for (const p of this.platforms) {
      if (p.y > lowestY) lowestY = p.y;
    }
    if (lowestY < ARENA_H + 20) {
      this.spawnPlatformBelow(lowestY);
    }

    // 4. Ceiling Spikes Hazard ($y \le CEILING\_SPIKE\_H$)
    if (this.ball.y - this.ball.r <= CEILING_SPIKE_H + 1) {
      if (this.ball.invincibleTimer <= 0) {
        return this.handleHurt();
      } else {
        this.ball.y = CEILING_SPIKE_H + 2 + this.ball.r;
        this.ball.vy = 50;
      }
    }

    // 5. Void Hazard (Fell off bottom of screen)
    if (this.ball.y - this.ball.r > ARENA_H + 10) {
      return this.handleHurt();
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= pt.decay * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    return soundToPlay;
  }

  private handleHurt(): ArcadeSound {
    this.spawnExplosion(this.ball.x, this.ball.y, 14, '#FF2A6D');
    this.lives--;

    if (this.lives <= 0) {
      this.gameOver = true;
      return 'gameover';
    }

    // Find nearest safe platform in mid-screen to respawn cleanly
    const safePlatforms = this.platforms.filter(
      (p) => !p.isSpikes && p.y > 60 && p.y < ARENA_H - 40
    );

    if (safePlatforms.length > 0) {
      safePlatforms.sort((a, b) => Math.abs(a.y - 120) - Math.abs(b.y - 120));
      const target = safePlatforms[0];
      this.ball.x = target.x + target.w / 2;
      this.ball.y = target.y - this.ball.r;
      this.ball.vx = 0;
      this.ball.vy = 0;
    } else {
      this.ball.x = ARENA_W / 2;
      this.ball.y = 80;
      this.ball.vx = 0;
      this.ball.vy = 0;
    }

    this.ball.invincibleTimer = 1.4;
    return 'die';
  }

  private spawnExplosion(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color,
        life: 1.0,
        decay: 2.2,
      });
    }
  }

  private spawnSparkles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color,
        life: 1.0,
        decay: 2.5,
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
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶ TO STEER • DODGE CEILING SPIKES',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const spikeCount = 20;
    const spikeW = ARENA_W / spikeCount;
    const isBlinking =
      this.ball.invincibleTimer > 0 && Math.floor(this.ball.invincibleTimer * 12) % 2 === 0;
    const isLight = !!palette.isLightLcd;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Clean Nokia Ceiling Spikes */}
        <View style={styles.ceilingBar}>
          {Array.from({ length: spikeCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.ceilingSpike,
                {
                  left: i * spikeW,
                  width: spikeW,
                  borderTopColor: palette.pixelOn,
                },
              ]}
            />
          ))}
        </View>

        {/* Minimalist Platforms */}
        {this.platforms.map((p) => {
          return (
            <View
              key={p.id}
              style={[
                styles.platform,
                {
                  left: `${(p.x / ARENA_W) * 100}%`,
                  top: `${(p.y / ARENA_H) * 100}%`,
                  width: `${(p.w / ARENA_W) * 100}%`,
                  height: `${(p.h / ARENA_H) * 100}%`,
                  backgroundColor: p.isSpikes
                    ? isLight
                      ? palette.pixelOn
                      : '#A82835'
                    : palette.pixelOn,
                  borderColor: isLight
                    ? palette.pixelOn
                    : p.isSpikes
                    ? '#FF2A6D'
                    : palette.pixelOn,
                },
              ]}
            >
              {/* Spikes on spiked platform */}
              {p.isSpikes && (
                <View style={styles.platformSpikeRow}>
                  {Array.from({ length: Math.floor(p.w / 8) }).map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.smallSpike,
                        isLight && { borderBottomColor: palette.screenBg },
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Rare Heart Item */}
              {p.hasHeart && !p.heartCollected && (
                <View style={styles.heartItem}>
                  <Text
                    style={[
                      styles.heartText,
                      isLight && { color: palette.screenBg },
                    ]}
                  >
                    ♥
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Clean Ball */}
        {!this.gameOver && !isBlinking && (
          <View
            style={[
              styles.ball,
              {
                left: `${((this.ball.x - this.ball.r) / ARENA_W) * 100}%`,
                top: `${((this.ball.y - this.ball.r) / ARENA_H) * 100}%`,
                width: `${((this.ball.r * 2) / ARENA_W) * 100}%`,
                height: `${((this.ball.r * 2) / ARENA_H) * 100}%`,
                backgroundColor: isLight ? palette.pixelOn : '#FF3B30',
                shadowColor: isLight ? 'transparent' : '#FF3B30',
                borderWidth: isLight ? 1.5 : 0,
                borderColor: isLight ? palette.pixelOn : undefined,
              },
            ]}
          >
            <View
              style={[
                styles.ballHighlight,
                {
                  backgroundColor: isLight
                    ? palette.screenBg
                    : 'rgba(255, 255, 255, 0.7)',
                },
              ]}
            />
          </View>
        )}

        {/* Particles */}
        {this.particles.map((pt) => (
          <View
            key={pt.id}
            style={[
              styles.particle,
              {
                left: `${(pt.x / ARENA_W) * 100}%`,
                top: `${(pt.y / ARENA_H) * 100}%`,
                width: pt.size,
                height: pt.size,
                backgroundColor: pt.color,
                opacity: pt.life,
              },
            ]}
          />
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  ceilingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CEILING_SPIKE_H,
    flexDirection: 'row',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  ceilingSpike: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: ARENA_W / 40,
    borderRightWidth: ARENA_W / 40,
    borderTopWidth: CEILING_SPIKE_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  platform: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformSpikeRow: {
    position: 'absolute',
    top: -5,
    left: 0,
    right: 0,
    height: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  smallSpike: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF2A6D',
  },
  heartItem: {
    position: 'absolute',
    top: -14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF2A6D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  ball: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 4,
  },
  ballHighlight: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
});
