import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Obstacle {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Survivor {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export class HeliRescueGame implements ArcadeGameInstance {
  // Helicopter physics
  private heliX = 45;
  private heliY = ARENA_H / 2;
  private heliVy = 0;
  private readonly heliW = 24;
  private readonly heliH = 12;
  private readonly gravity = 380;
  private readonly liftForce = -520;
  private readonly maxVy = 260;

  // Cave terrain & obstacles
  private scrollSpeed = 120;
  private distance = 0;
  private obstacles: Obstacle[] = [];
  private obstacleTimer = 0;
  private cavePoints: { x: number; topH: number; botH: number }[] = [];

  // Bonus survivors to rescue
  private survivors: Survivor[] = [];
  private rescuedCount = 0;

  // Rotor animation
  private rotorFrame = 0;
  private rotorTimer = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;

  private particles: Particle[] = [];
  private nextEntityId = 1;

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
    this.heliX = 45;
    this.heliY = ARENA_H / 2;
    this.heliVy = 0;
    this.scrollSpeed = 120;
    this.distance = 0;
    this.rescuedCount = 0;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
    this.particles = [];
    this.obstacles = [];
    this.survivors = [];
    this.obstacleTimer = 0;

    // Generate initial gentle cave terrain
    this.cavePoints = [];
    const step = 20;
    const numPoints = Math.ceil(ARENA_W / step) + 4;
    for (let i = 0; i < numPoints; i++) {
      this.cavePoints.push({
        x: i * step,
        topH: 22,
        botH: 22,
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

    // Rotor spinning
    this.rotorTimer += dt;
    if (this.rotorTimer > 0.05) {
      this.rotorTimer = 0;
      this.rotorFrame = 1 - this.rotorFrame;
    }

    // Particles (smoke puffs from tail)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Lift vs Gravity: Holding A or UP lifts the copter
    const isLifting = input.a || input.up;
    if (isLifting) {
      this.heliVy += this.liftForce * dt;
      // Tail exhaust puff
      if (Math.random() < 0.3) {
        this.particles.push({
          id: this.nextEntityId++,
          x: this.heliX - 4,
          y: this.heliY + 5,
          vx: -50 - Math.random() * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 2,
          color: '#FFF',
          life: 0.3,
          decay: 3,
        });
      }
    } else {
      this.heliVy += this.gravity * dt;
    }

    // Velocity clamp & position update
    this.heliVy = Math.max(-this.maxVy, Math.min(this.maxVy, this.heliVy));
    this.heliY += this.heliVy * dt;

    // Scroll cave & obstacles
    const dx = this.scrollSpeed * dt;
    this.distance += dx;
    this.score = Math.floor(this.distance / 10) + this.rescuedCount * 100;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    // Scroll cave terrain
    for (const pt of this.cavePoints) {
      pt.x -= dx;
    }
    // Spawn new cave point at end
    const lastPt = this.cavePoints[this.cavePoints.length - 1];
    if (lastPt.x < ARENA_W + 30) {
      const progress = Math.min(1.0, this.distance / 3000);
      const maxVar = 18 + progress * 22;
      const prevTop = lastPt.topH;
      const prevBot = lastPt.botH;

      const newTop = Math.max(16, Math.min(65, prevTop + (Math.random() - 0.5) * 14));
      const newBot = Math.max(16, Math.min(65, prevBot + (Math.random() - 0.5) * 14));

      this.cavePoints.push({
        x: lastPt.x + 20,
        topH: newTop,
        botH: newBot,
      });
    }
    // Remove offscreen cave points
    if (this.cavePoints.length > 2 && this.cavePoints[0].x < -40) {
      this.cavePoints.shift();
    }

    // Spawn Pillar Obstacles
    this.obstacleTimer += dt;
    if (this.obstacleTimer >= 1.7) {
      this.obstacleTimer = 0;
      const obH = 36 + Math.random() * 28;
      const isTop = Math.random() > 0.5;
      this.obstacles.push({
        id: this.nextEntityId++,
        x: ARENA_W + 10,
        y: isTop ? 20 : ARENA_H - 20 - obH,
        w: 16,
        h: obH,
      });

      // Chance to spawn floating survivor
      if (Math.random() < 0.45) {
        this.survivors.push({
          id: this.nextEntityId++,
          x: ARENA_W + 50,
          y: ARENA_H / 2 + (Math.random() - 0.5) * 50,
          collected: false,
        });
      }
    }

    // Move & Cull Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.x -= dx;
      if (ob.x < -30) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Check collision with Helicopter
      if (
        this.heliX + this.heliW - 4 >= ob.x &&
        this.heliX + 4 <= ob.x + ob.w &&
        this.heliY + this.heliH - 2 >= ob.y &&
        this.heliY + 2 <= ob.y + ob.h
      ) {
        return this.handleCrash();
      }
    }

    // Move & Collect Survivors
    for (let i = this.survivors.length - 1; i >= 0; i--) {
      const s = this.survivors[i];
      s.x -= dx;
      if (s.x < -30) {
        this.survivors.splice(i, 1);
        continue;
      }

      // Collection check
      if (
        !s.collected &&
        Math.hypot(this.heliX + this.heliW / 2 - s.x, this.heliY + this.heliH / 2 - s.y) < 16
      ) {
        s.collected = true;
        this.rescuedCount++;
        this.score += 100;
        triggeredSound = 'score';
        this.survivors.splice(i, 1);
      }
    }

    // Check Ceiling & Floor collisions (interpolated from cave points)
    const currentCave = this.getCaveBoundsAt(this.heliX + this.heliW / 2);
    if (this.heliY <= currentCave.topH || this.heliY + this.heliH >= ARENA_H - currentCave.botH) {
      return this.handleCrash();
    }

    this.lastA = input.a;
    return triggeredSound;
  }

  private getCaveBoundsAt(x: number): { topH: number; botH: number } {
    for (let i = 0; i < this.cavePoints.length - 1; i++) {
      const p1 = this.cavePoints[i];
      const p2 = this.cavePoints[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return {
          topH: p1.topH + (p2.topH - p1.topH) * t,
          botH: p1.botH + (p2.botH - p1.botH) * t,
        };
      }
    }
    return { topH: 22, botH: 22 };
  }

  private handleCrash(): ArcadeSound {
    this.createExplosion(this.heliX + this.heliW / 2, this.heliY + this.heliH / 2);
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      return 'gameover';
    } else {
      // Reposition in center
      this.heliY = ARENA_H / 2;
      this.heliVy = 0;
      return 'die';
    }
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 35 + Math.random() * 30;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.35,
        decay: 2.5,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: Math.floor(this.distance / 500) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'CRASHED!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'HOLD [A] / [▲]: FLY UP • RELEASE: DIVE',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Cave Ceiling & Floor Sections */}
        {this.cavePoints.map((pt, i) => (
          <React.Fragment key={`cave-${i}`}>
            {/* Top ceiling stalactite block */}
            <View
              style={[
                styles.caveBlock,
                {
                  left: pt.x,
                  top: 0,
                  width: 22,
                  height: pt.topH,
                  backgroundColor: pixelColor,
                },
              ]}
            />
            {/* Bottom floor stalagmite block */}
            <View
              style={[
                styles.caveBlock,
                {
                  left: pt.x,
                  bottom: 0,
                  width: 22,
                  height: pt.botH,
                  backgroundColor: pixelColor,
                },
              ]}
            />
          </React.Fragment>
        ))}

        {/* Pillar Obstacles */}
        {this.obstacles.map((ob) => (
          <View
            key={ob.id}
            style={[
              styles.obstaclePillar,
              {
                left: ob.x,
                top: ob.y,
                width: ob.w,
                height: ob.h,
                backgroundColor: pixelColor,
                borderColor: isLight ? palette.screenBg : '#000',
              },
            ]}
          />
        ))}

        {/* Survivors */}
        {this.survivors.map((s) => (
          <View
            key={s.id}
            style={[
              styles.survivorWrap,
              {
                left: s.x - 4,
                top: s.y - 6,
              },
            ]}
          >
            {/* Tiny retro stick figure / parachute */}
            <View style={[styles.survivorHead, { backgroundColor: pixelColor }]} />
            <View style={[styles.survivorBody, { backgroundColor: pixelColor }]} />
          </View>
        ))}

        {/* Helicopter */}
        {!this.gameOver && (
          <View
            style={[
              styles.heliContainer,
              {
                left: this.heliX,
                top: this.heliY,
                transform: [
                  { rotate: `${Math.max(-25, Math.min(25, this.heliVy * 0.12))}deg` },
                ],
              },
            ]}
          >
            {/* Main Rotor */}
            <View
              style={[
                styles.mainRotor,
                {
                  backgroundColor: pixelColor,
                  transform: [{ scaleX: this.rotorFrame === 0 ? 1 : 0.4 }],
                },
              ]}
            />
            {/* Rotor Mast */}
            <View style={[styles.rotorMast, { backgroundColor: pixelColor }]} />
            {/* Cabin Body */}
            <View style={[styles.heliCabin, { backgroundColor: pixelColor }]}>
              {/* Window */}
              <View
                style={[
                  styles.heliWindow,
                  { backgroundColor: isLight ? palette.screenBg : '#000' },
                ]}
              />
            </View>
            {/* Tail Boom & Tail Rotor */}
            <View style={[styles.tailBoom, { backgroundColor: pixelColor }]} />
            <View style={[styles.tailRotor, { backgroundColor: pixelColor }]} />
            {/* Landing Skid */}
            <View style={[styles.landingSkid, { backgroundColor: pixelColor }]} />
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

        {/* Menu Overlay */}
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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>HELI RESCUE</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>NOKIA 3310 CAVERNS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FLY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  caveBlock: {
    position: 'absolute',
  },
  obstaclePillar: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
  },
  survivorWrap: {
    position: 'absolute',
    width: 8,
    height: 12,
    alignItems: 'center',
  },
  survivorHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  survivorBody: {
    width: 2,
    height: 6,
    marginTop: 1,
  },
  heliContainer: {
    position: 'absolute',
    width: 26,
    height: 14,
  },
  mainRotor: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 18,
    height: 1.5,
  },
  rotorMast: {
    position: 'absolute',
    top: 1.5,
    left: 12,
    width: 2,
    height: 2,
  },
  heliCabin: {
    position: 'absolute',
    top: 3.5,
    left: 6,
    width: 14,
    height: 7,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  heliWindow: {
    width: 4,
    height: 3,
    borderRadius: 1,
  },
  tailBoom: {
    position: 'absolute',
    top: 5.5,
    left: 0,
    width: 8,
    height: 2,
  },
  tailRotor: {
    position: 'absolute',
    top: 3.5,
    left: 0,
    width: 1.5,
    height: 6,
  },
  landingSkid: {
    position: 'absolute',
    top: 11.5,
    left: 7,
    width: 12,
    height: 1.5,
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
