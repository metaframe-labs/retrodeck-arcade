import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Platform {
  id: number;
  x: number;
  y: number; // World y (goes upwards)
  w: number;
  h: number;
  type: 'normal' | 'moving' | 'spring';
  vx?: number;
}

export class TowerClimberGame implements ArcadeGameInstance {
  // Jumper physics
  private px = ARENA_W / 2 - 8;
  private py = 20; // world Y
  private pvx = 0;
  private pvy = 0;
  private readonly pw = 16;
  private readonly ph = 16;

  private readonly gravity = -780;
  private readonly jumpForce = 440;
  private readonly superJumpForce = 620;

  // Camera scroll (tracks maximum climber height)
  private cameraY = 0;
  private highestY = 0;

  // Platforms
  private platforms: Platform[] = [];
  private nextPlatY = 0;
  private nextEntityId = 1;

  private score = 0;
  private highScore = 0;
  private combo = 0;
  private gameOver = false;
  private isMenu = true;

  private particles: Particle[] = [];
  private facing = 1; // 1 = right, -1 = left

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
    this.px = ARENA_W / 2 - 8;
    this.py = 40;
    this.pvx = 0;
    this.pvy = this.jumpForce;
    this.cameraY = 0;
    this.highestY = 0;
    this.score = 0;
    this.combo = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.particles = [];
    this.facing = 1;

    // Spawn starter platforms
    this.platforms = [
      { id: this.nextEntityId++, x: 40, y: 15, w: 240, h: 8, type: 'normal' },
    ];
    this.nextPlatY = 55;
    for (let i = 0; i < 9; i++) {
      this.spawnNextPlatform();
    }
  }

  private spawnNextPlatform(): void {
    const isMoving = Math.random() < 0.25;
    const isSpring = !isMoving && Math.random() < 0.18;
    const w = Math.max(34, 55 - Math.min(20, Math.floor(this.highestY / 400)));

    this.platforms.push({
      id: this.nextEntityId++,
      x: 18 + Math.random() * (ARENA_W - 36 - w),
      y: this.nextPlatY,
      w,
      h: 7,
      type: isSpring ? 'spring' : isMoving ? 'moving' : 'normal',
      vx: isMoving ? (Math.random() > 0.5 ? 45 : -45) : undefined,
    });

    this.nextPlatY += 34 + Math.random() * 12;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let soundToPlay: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        soundToPlay = 'powerup';
      }
      this.lastA = input.a;
      return soundToPlay;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        soundToPlay = 'powerup';
      }
      this.lastA = input.a;
      return soundToPlay;
    }

    // Horizontal steering & inertia
    const accel = 700;
    const friction = 0.88;
    if (input.left) {
      this.pvx -= accel * dt;
      this.facing = -1;
    } else if (input.right) {
      this.pvx += accel * dt;
      this.facing = 1;
    } else {
      this.pvx *= Math.pow(friction, dt * 60);
    }

    // Speed clamp
    this.pvx = Math.max(-210, Math.min(210, this.pvx));
    this.px += this.pvx * dt;

    // Screen wrap (classic Icy Tower / Doodle Jump feature)
    if (this.px < -this.pw) {
      this.px = ARENA_W;
    } else if (this.px > ARENA_W) {
      this.px = -this.pw;
    }

    // Vertical gravity
    this.pvy += this.gravity * dt;
    const prevY = this.py;
    this.py += this.pvy * dt;

    // Highest height tracking & camera scroll
    if (this.py > this.highestY) {
      this.highestY = this.py;
      this.score = Math.floor(this.highestY / 5);
      if (this.score > this.highScore) {
        this.highScore = this.score;
      }
    }

    // Smooth Camera Follow
    const targetCamY = Math.max(0, this.highestY - 110);
    if (targetCamY > this.cameraY) {
      this.cameraY += (targetCamY - this.cameraY) * Math.min(1.0, dt * 8);
    }

    // Move Moving Platforms
    for (const plat of this.platforms) {
      if (plat.type === 'moving' && plat.vx) {
        plat.x += plat.vx * dt;
        if (plat.x < 15) {
          plat.x = 15;
          plat.vx = Math.abs(plat.vx);
        } else if (plat.x + plat.w > ARENA_W - 15) {
          plat.x = ARENA_W - 15 - plat.w;
          plat.vx = -Math.abs(plat.vx);
        }
      }
    }

    // Platform landing collision (Only when falling down)
    if (this.pvy < 0) {
      for (const plat of this.platforms) {
        if (
          this.px + this.pw - 3 >= plat.x &&
          this.px + 3 <= plat.x + plat.w &&
          prevY >= plat.y + plat.h &&
          this.py <= plat.y + plat.h
        ) {
          // Landed!
          this.py = plat.y + plat.h;
          if (plat.type === 'spring') {
            this.pvy = this.superJumpForce;
            soundToPlay = 'powerup';
            this.createSparks(this.px + this.pw / 2, this.py);
          } else {
            this.pvy = this.jumpForce;
            soundToPlay = 'hit';
          }
          break;
        }
      }
    }

    // Spawn more platforms as camera rises
    while (this.nextPlatY < this.cameraY + ARENA_H + 80) {
      this.spawnNextPlatform();
    }

    // Cull platforms below camera
    this.platforms = this.platforms.filter((p) => p.y >= this.cameraY - 40);

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

    // Fall death: Fell below visible camera viewport
    if (this.py < this.cameraY - 20) {
      this.gameOver = true;
      this.createExplosion(this.px + this.pw / 2, this.py);
      soundToPlay = 'gameover';
    }

    this.lastA = input.a;
    return soundToPlay;
  }

  private createSparks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: 20 + Math.random() * 40,
        size: 2,
        color: '#FFF',
        life: 0.25,
        decay: 3,
      });
    }
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 40 + Math.random() * 40;
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
      lives: 1,
      level: Math.floor(this.highestY / 500) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'FELL DOWN!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: STEER • SCREEN EDGES WRAP',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    // Convert world Y to screen Y (screen Y = 0 at top, 240 at bottom)
    const toScreenY = (worldY: number) => ARENA_H - (worldY - this.cameraY);

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Tower Side Brick Wall Borders */}
        <View style={[styles.towerWall, { left: 0, width: 12, backgroundColor: pixelColor }]} />
        <View style={[styles.towerWall, { right: 0, width: 12, backgroundColor: pixelColor }]} />

        {/* Platforms */}
        {this.platforms.map((plat) => {
          const sy = toScreenY(plat.y + plat.h);
          if (sy < -20 || sy > ARENA_H + 20) return null;

          return (
            <View
              key={plat.id}
              style={[
                styles.platformBlock,
                {
                  left: plat.x,
                  top: sy,
                  width: plat.w,
                  height: plat.h,
                  backgroundColor: pixelColor,
                  borderColor: isLight ? palette.screenBg : '#000',
                },
              ]}
            >
              {plat.type === 'spring' && (
                <View
                  style={[
                    styles.springCoil,
                    { backgroundColor: isLight ? palette.screenBg : '#FFF' },
                  ]}
                />
              )}
              {plat.type === 'moving' && (
                <View
                  style={[
                    styles.movingArrow,
                    { borderColor: isLight ? palette.screenBg : '#FFF' },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* Climber Character (Retro Jumper) */}
        {!this.gameOver && (
          <View
            style={[
              styles.climberChar,
              {
                left: this.px,
                top: toScreenY(this.py + this.ph),
                transform: [{ scaleX: this.facing }],
              },
            ]}
          >
            {/* Beanie Hat */}
            <View style={[styles.climberBeanie, { backgroundColor: pixelColor }]} />
            {/* Head */}
            <View
              style={[
                styles.climberFace,
                {
                  borderColor: pixelColor,
                  backgroundColor: isLight ? palette.screenBg : '#FFF',
                },
              ]}
            >
              <View style={[styles.climberEye, { backgroundColor: pixelColor }]} />
            </View>
            {/* Body */}
            <View style={[styles.climberBody, { backgroundColor: pixelColor }]} />
            {/* Shoes */}
            <View style={styles.climberFeetRow}>
              <View style={[styles.climberFoot, { backgroundColor: pixelColor }]} />
              <View style={[styles.climberFoot, { backgroundColor: pixelColor }]} />
            </View>
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => {
          const sy = toScreenY(p.y);
          return (
            <View
              key={p.id}
              style={[
                styles.particle,
                {
                  left: p.x,
                  top: sy,
                  width: p.size,
                  height: p.size,
                  backgroundColor: pixelColor,
                  opacity: p.life,
                },
              ]}
            />
          );
        })}

        {/* Altitude Height HUD */}
        <View style={styles.altitudeHud}>
          <Text style={[styles.altitudeText, { color: pixelColor }]}>
            ALT: {Math.floor(this.highestY)}m
          </Text>
        </View>

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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TOWER CLIMBER</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>ICY TOWER DX</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO JUMP</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  towerWall: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
  platformBlock: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  springCoil: {
    width: 6,
    height: 3,
    borderRadius: 1,
  },
  movingArrow: {
    width: 8,
    height: 2,
    borderWidth: 0.5,
  },
  climberChar: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
  },
  climberBeanie: {
    width: 8,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  climberFace: {
    width: 10,
    height: 6,
    borderWidth: 1,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 1.5,
  },
  climberEye: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  climberBody: {
    width: 12,
    height: 4,
    borderRadius: 1,
    marginTop: 0.5,
  },
  climberFeetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 10,
    marginTop: 0.5,
  },
  climberFoot: {
    width: 3.5,
    height: 2.5,
    borderRadius: 1,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
  altitudeHud: {
    position: 'absolute',
    top: 6,
    right: 18,
  },
  altitudeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
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
