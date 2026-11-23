import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
  FloatText,
  Particle,
} from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const BALL_R = 7;

interface BouncePlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  isSpring?: boolean;
}

interface GoldenHoop {
  id: number;
  x: number;
  y: number;
  r: number;
  collected: boolean;
}

interface SpikeObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  isMoving?: boolean;
  baseY?: number;
  moveRange?: number;
  moveSpeed?: number;
}

interface ExitDoor {
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
}

export class BounceGame implements ArcadeGameInstance {
  private ball = {
    x: 30,
    y: 190,
    vx: 0,
    vy: 0,
    r: BALL_R,
    onGround: false,
    invincibleTimer: 0,
    squashTimer: 0,
  };

  private platforms: BouncePlatform[] = [];
  private hoops: GoldenHoop[] = [];
  private spikes: SpikeObstacle[] = [];
  private exitDoor: ExitDoor = { x: 280, y: 175, w: 22, h: 35, open: false };

  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private nextEntityId = 1;

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
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.particles = [];
    this.floatTexts = [];
    this.loadLevel(this.level);
  }

  public reset(): void {
    this.init();
  }

  private loadLevel(lvl: number): void {
    this.platforms = [];
    this.hoops = [];
    this.spikes = [];

    // Reset ball position
    this.ball.x = 28;
    this.ball.y = 185;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.onGround = false;
    this.ball.invincibleTimer = 0.5;

    // Standard floor & boundary
    this.platforms.push({ x: 0, y: 215, w: ARENA_W, h: 25 }); // Ground floor

    if (lvl === 1) {
      // Stage 1: The Classic Nokia Courtyard
      this.platforms.push(
        { x: 70, y: 175, w: 55, h: 10 },
        { x: 155, y: 135, w: 60, h: 10 },
        { x: 235, y: 95, w: 50, h: 10 },
        { x: 130, y: 205, w: 30, h: 10, isSpring: true } // Trampoline pad
      );

      this.spikes.push(
        { x: 190, y: 205, w: 35, h: 10 } // Floor spike bed
      );

      this.hoops.push(
        { id: 1, x: 95, y: 145, r: 12, collected: false },
        { id: 2, x: 185, y: 105, r: 12, collected: false },
        { id: 3, x: 260, y: 65, r: 12, collected: false },
        { id: 4, x: 145, y: 165, r: 12, collected: false }
      );

      this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
    } else if (lvl === 2) {
      // Stage 2: Floating Towers & Fair Timing Traps
      this.platforms.push(
        { x: 45, y: 165, w: 50, h: 10 },
        { x: 110, y: 130, w: 50, h: 10 },
        { x: 155, y: 175, w: 42, h: 10 }, // Safe middle island
        { x: 185, y: 95, w: 55, h: 10 }, // Upper peak platform
        { x: 255, y: 140, w: 45, h: 10 },
        { x: 75, y: 205, w: 26, h: 10, isSpring: true },
        { x: 225, y: 205, w: 26, h: 10, isSpring: true }
      );

      this.spikes.push(
        { x: 115, y: 205, w: 32, h: 10 }, // Floor pit 1
        { x: 202, y: 205, w: 20, h: 10 }, // Floor pit 2
        // Aerial timing trap in the gap between Tower 2 and Upper Peak (doesn't clip platforms)
        { x: 168, y: 55, w: 16, h: 10, isMoving: true, baseY: 55, moveRange: 20, moveSpeed: 1.4 }
      );

      this.hoops.push(
        { id: 1, x: 70, y: 130, r: 12, collected: false },
        { id: 2, x: 135, y: 95, r: 12, collected: false },
        { id: 3, x: 212, y: 60, r: 12, collected: false },
        { id: 4, x: 275, y: 105, r: 12, collected: false },
        { id: 5, x: 176, y: 145, r: 12, collected: false }
      );

      this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
    } else if (lvl === 3) {
      // Stage 3: Cavern Spires & Pit Springs
      this.platforms.push(
        { x: 40, y: 170, w: 45, h: 10 },
        { x: 105, y: 130, w: 45, h: 10 },
        { x: 170, y: 90, w: 50, h: 10 },
        { x: 240, y: 135, w: 48, h: 10 },
        { x: 75, y: 205, w: 26, h: 10, isSpring: true },
        { x: 215, y: 205, w: 26, h: 10, isSpring: true }
      );

      this.spikes.push(
        { x: 105, y: 205, w: 40, h: 10 },
        { x: 175, y: 205, w: 35, h: 10 },
        // Aerial ceiling stalactite hazard
        { x: 138, y: 50, w: 18, h: 10, isMoving: true, baseY: 50, moveRange: 16, moveSpeed: 1.5 }
      );

      this.hoops.push(
        { id: 1, x: 62, y: 135, r: 12, collected: false },
        { id: 2, x: 127, y: 95, r: 12, collected: false },
        { id: 3, x: 195, y: 55, r: 12, collected: false },
        { id: 4, x: 264, y: 100, r: 12, collected: false },
        { id: 5, x: 140, y: 165, r: 12, collected: false }
      );

      this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
    } else if (lvl === 4) {
      // Stage 4: Trampoline Skyway & High Clouds
      this.platforms.push(
        { x: 50, y: 205, w: 30, h: 10, isSpring: true },
        { x: 75, y: 125, w: 50, h: 10 },
        { x: 140, y: 110, w: 35, h: 10, isSpring: true },
        { x: 190, y: 65, w: 55, h: 10 },
        { x: 255, y: 115, w: 45, h: 10 },
        { x: 190, y: 165, w: 45, h: 10 },
        { x: 245, y: 205, w: 28, h: 10, isSpring: true }
      );

      this.spikes.push(
        { x: 85, y: 205, w: 50, h: 10 },
        { x: 175, y: 205, w: 65, h: 10 },
        // Aerial Drone Hazard
        { x: 115, y: 55, w: 16, h: 10, isMoving: true, baseY: 55, moveRange: 20, moveSpeed: 1.8 }
      );

      this.hoops.push(
        { id: 1, x: 65, y: 160, r: 12, collected: false },
        { id: 2, x: 100, y: 90, r: 12, collected: false },
        { id: 3, x: 157, y: 45, r: 12, collected: false },
        { id: 4, x: 217, y: 35, r: 12, collected: false },
        { id: 5, x: 278, y: 80, r: 12, collected: false },
        { id: 6, x: 212, y: 135, r: 12, collected: false }
      );

      this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
    } else if (lvl === 5) {
      // Stage 5: The Gauntlet - Multi-Tier Terraces
      this.platforms.push(
        { x: 40, y: 175, w: 45, h: 10 },
        { x: 50, y: 95, w: 45, h: 10 },
        { x: 125, y: 70, w: 50, h: 10 },
        { x: 135, y: 140, w: 50, h: 10 },
        { x: 210, y: 105, w: 50, h: 10 },
        { x: 260, y: 155, w: 45, h: 10 },
        { x: 80, y: 205, w: 26, h: 10, isSpring: true },
        { x: 195, y: 205, w: 26, h: 10, isSpring: true }
      );

      this.spikes.push(
        { x: 110, y: 205, w: 45, h: 10 },
        { x: 225, y: 205, w: 35, h: 10 },
        // Floating timing traps
        { x: 98, y: 120, w: 16, h: 10, isMoving: true, baseY: 120, moveRange: 18, moveSpeed: 1.6 },
        { x: 185, y: 65, w: 16, h: 10, isMoving: true, baseY: 65, moveRange: 22, moveSpeed: 2.0 }
      );

      this.hoops.push(
        { id: 1, x: 62, y: 145, r: 12, collected: false },
        { id: 2, x: 72, y: 65, r: 12, collected: false },
        { id: 3, x: 150, y: 40, r: 12, collected: false },
        { id: 4, x: 160, y: 110, r: 12, collected: false },
        { id: 5, x: 235, y: 75, r: 12, collected: false },
        { id: 6, x: 282, y: 125, r: 12, collected: false }
      );

      this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
    } else if (lvl === 6) {
      // Stage 6: Peak Citadel - Summit Chamber
      this.platforms.push(
        { x: 35, y: 165, w: 42, h: 10 },
        { x: 85, y: 125, w: 45, h: 10 },
        { x: 140, y: 150, w: 50, h: 10 },
        { x: 140, y: 60, w: 50, h: 10 },
        { x: 215, y: 115, w: 45, h: 10 },
        { x: 265, y: 155, w: 48, h: 10 },
        { x: 60, y: 205, w: 24, h: 10, isSpring: true },
        { x: 170, y: 205, w: 26, h: 10, isSpring: true }
      );

      this.spikes.push(
        { x: 88, y: 205, w: 40, h: 10 },
        { x: 200, y: 205, w: 60, h: 10 },
        // Floating summit guardians
        { x: 115, y: 70, w: 16, h: 10, isMoving: true, baseY: 70, moveRange: 22, moveSpeed: 1.7 },
        { x: 240, y: 65, w: 16, h: 10, isMoving: true, baseY: 65, moveRange: 22, moveSpeed: 1.9 }
      );

      this.hoops.push(
        { id: 1, x: 55, y: 135, r: 12, collected: false },
        { id: 2, x: 107, y: 95, r: 12, collected: false },
        { id: 3, x: 165, y: 30, r: 12, collected: false },
        { id: 4, x: 165, y: 120, r: 12, collected: false },
        { id: 5, x: 237, y: 85, r: 12, collected: false },
        { id: 6, x: 270, y: 90, r: 12, collected: false }
      );

      // Elevated exit door atop the right plateau
      this.exitDoor = { x: 285, y: 120, w: 22, h: 35, open: false };
    } else {
      // Stage 7+: Endless Deterministic Procedural Spire Generation
      this.generateProceduralLevel(lvl);
    }
  }

  /**
   * Generates a completely unique, balanced, and beatable level for Stage 7 and beyond.
   * Uses a deterministic pseudo-random generator seeded by level index so layouts
   * are 100% reproducible and never repetitive.
   */
  private generateProceduralLevel(lvl: number): void {
    let seed = ((lvl * 1597 + 51711) >>> 0) % 2147483647;
    const nextRand = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const nextRange = (min: number, max: number): number => {
      return min + nextRand() * (max - min);
    };

    // Four core architectural archetypes
    const archetype = (lvl - 7) % 4;
    const baseHeights: number[][] = [
      [170, 135, 100, 70, 140], // Ascending Mountain & descent
      [160, 95, 145, 80, 150],  // Zig-Zag Terraces
      [120, 165, 90, 160, 125], // Dual Spires
      [150, 115, 65, 110, 155], // Floating Islands & Skyway
    ];
    const heights = baseHeights[archetype];

    // Stepping platforms spanning the arena width
    const slotXs = [40, 95, 150, 205, 255];
    for (let i = 0; i < heights.length; i++) {
      const x = slotXs[i] + Math.floor(nextRange(-6, 6));
      const y = heights[i] + Math.floor(nextRange(-8, 8));
      const w = Math.floor(nextRange(42, 52));
      this.platforms.push({ x, y, w, h: 10 });
    }

    // Two strategic trampoline spring pads on the ground floor
    const springX1 = Math.floor(nextRange(65, 90));
    const springX2 = Math.floor(nextRange(160, 185));
    this.platforms.push(
      { x: springX1, y: 205, w: 26, h: 10, isSpring: true },
      { x: springX2, y: 205, w: 26, h: 10, isSpring: true }
    );

    // Floor hazard spike pits placed safely between springs and paths
    const pit1X = Math.floor(nextRange(105, 130));
    const pit2X = Math.floor(nextRange(205, 225));
    this.spikes.push(
      { x: pit1X, y: 205, w: Math.floor(nextRange(28, 38)), h: 10 },
      { x: pit2X, y: 205, w: Math.floor(nextRange(25, 34)), h: 10 }
    );

    // Aerial moving timing hazards (safely above platform surfaces)
    const aerialY1 = 52;
    this.spikes.push({
      x: Math.floor(nextRange(115, 145)),
      y: aerialY1,
      w: 16,
      h: 10,
      isMoving: true,
      baseY: aerialY1,
      moveRange: 16,
      moveSpeed: Number((1.2 + nextRand() * 0.8).toFixed(2)),
    });

    if (lvl % 2 === 0) {
      const aerialY2 = 56;
      this.spikes.push({
        x: Math.floor(nextRange(195, 225)),
        y: aerialY2,
        w: 16,
        h: 10,
        isMoving: true,
        baseY: aerialY2,
        moveRange: 16,
        moveSpeed: Number((1.3 + nextRand() * 0.7).toFixed(2)),
      });
    }

    // 6 Golden Hoops
    let hoopId = 1;
    // 5 hoops positioned above each elevated platform
    for (let i = 0; i < heights.length; i++) {
      const p = this.platforms[i + 1]; // +1 because platform[0] is the ground floor
      if (p) {
        this.hoops.push({
          id: hoopId++,
          x: p.x + Math.floor(p.w / 2),
          y: Math.max(30, p.y - 25),
          r: 12,
          collected: false,
        });
      }
    }

    // 6th hoop suspended high in aerial spring booster arc
    this.hoops.push({
      id: hoopId++,
      x: springX1 + 13,
      y: 55,
      r: 12,
      collected: false,
    });

    // Exit door at ground level on the far right
    this.exitDoor = { x: 285, y: 180, w: 22, h: 35, open: false };
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

    if (this.ball.invincibleTimer > 0) {
      this.ball.invincibleTimer -= dt;
    }

    // 1. Horizontal Movement & Roll
    const accel = 480;
    const maxVx = 150;
    const friction = 0.88;

    if (input.left) {
      this.ball.vx -= accel * dt;
    } else if (input.right) {
      this.ball.vx += accel * dt;
    } else {
      this.ball.vx *= Math.pow(friction, dt * 60);
    }
    this.ball.vx = Math.max(-maxVx, Math.min(maxVx, this.ball.vx));
    this.ball.x += this.ball.vx * dt;

    // Walls
    if (this.ball.x - this.ball.r < 4) {
      this.ball.x = 4 + this.ball.r;
      this.ball.vx = -this.ball.vx * 0.4;
    } else if (this.ball.x + this.ball.r > ARENA_W - 4) {
      this.ball.x = ARENA_W - 4 - this.ball.r;
      this.ball.vx = -this.ball.vx * 0.4;
    }

    // 2. Vertical Movement & Gravity
    const gravity = 520;
    this.ball.vy += gravity * dt;
    const prevY = this.ball.y;
    this.ball.y += this.ball.vy * dt;

    // 3. Platform & Spring Collisions
    let onGroundNow = false;

    for (const p of this.platforms) {
      const withinX =
        this.ball.x + this.ball.r * 0.7 >= p.x &&
        this.ball.x - this.ball.r * 0.7 <= p.x + p.w;

      // Landing from above
      if (
        withinX &&
        prevY + this.ball.r <= p.y + 6 &&
        this.ball.y + this.ball.r >= p.y &&
        this.ball.y + this.ball.r <= p.y + p.h + 8 &&
        this.ball.vy >= 0
      ) {
        this.ball.y = p.y - this.ball.r;
        onGroundNow = true;

        if (p.isSpring) {
          // Trampoline Spring launch!
          this.ball.vy = -340;
          soundToPlay = 'powerup';
          this.spawnSparkles(this.ball.x, this.ball.y, '#00FFAA', 10);
          this.addFloatText(this.ball.x - 15, this.ball.y - 12, 'BOOSTER!', '#00FFAA');
        } else {
          // Standard bouncy collision
          if (Math.abs(this.ball.vy) > 60) {
            this.ball.vy = -this.ball.vy * 0.45; // Soft bounce
            if (!soundToPlay) soundToPlay = 'hit';
          } else {
            this.ball.vy = 0;
          }
        }
      }
    }

    this.ball.onGround = onGroundNow;

    // 4. Jump / Super Bounce on [A] button
    if (input.a && this.ball.onGround) {
      this.ball.vy = -245; // High Jump
      soundToPlay = 'hit';
      this.ball.onGround = false;
      this.spawnDust(this.ball.x, this.ball.y + this.ball.r, 5);
    }

    // 5. Update Moving Spikes
    for (const sp of this.spikes) {
      if (sp.isMoving && sp.baseY !== undefined && sp.moveRange !== undefined && sp.moveSpeed !== undefined) {
        sp.y = sp.baseY + Math.sin(Date.now() * 0.003 * sp.moveSpeed) * sp.moveRange;
      }

      // Check Spike Collision with Ball
      if (
        this.ball.x + this.ball.r * 0.7 >= sp.x &&
        this.ball.x - this.ball.r * 0.7 <= sp.x + sp.w &&
        this.ball.y + this.ball.r * 0.7 >= sp.y &&
        this.ball.y - this.ball.r * 0.7 <= sp.y + sp.h
      ) {
        if (this.ball.invincibleTimer <= 0) {
          return this.handleBallDie('POP!');
        }
      }
    }

    // 6. Check Golden Hoop Collection
    let allHoopsCollected = true;
    for (const hoop of this.hoops) {
      if (!hoop.collected) {
        allHoopsCollected = false;
        const dist = Math.hypot(this.ball.x - hoop.x, this.ball.y - hoop.y);
        if (dist < this.ball.r + hoop.r * 0.8) {
          hoop.collected = true;
          this.score += 200;
          if (this.score > this.highScore) this.highScore = this.score;
          soundToPlay = 'score';
          this.addFloatText(hoop.x - 10, hoop.y - 12, '+200', '#FFD700');
          this.spawnSparkles(hoop.x, hoop.y, '#FFD700', 14);
        }
      }
    }

    // Open Exit Door when all hoops are gathered
    if (allHoopsCollected && !this.exitDoor.open) {
      this.exitDoor.open = true;
      soundToPlay = 'powerup';
      this.addFloatText(this.exitDoor.x - 20, this.exitDoor.y - 15, 'EXIT OPEN!', '#00FFAA');
      this.spawnSparkles(this.exitDoor.x + 10, this.exitDoor.y + 15, '#00FFAA', 16);
    }

    // 7. Check Exit Door Entrance
    if (this.exitDoor.open) {
      const withinDoor =
        this.ball.x >= this.exitDoor.x &&
        this.ball.x <= this.exitDoor.x + this.exitDoor.w &&
        this.ball.y >= this.exitDoor.y &&
        this.ball.y <= this.exitDoor.y + this.exitDoor.h;

      if (withinDoor) {
        // Level Cleared!
        this.score += 1000;
        if (this.score > this.highScore) this.highScore = this.score;
        this.level++;
        soundToPlay = 'levelclear';
        this.addFloatText(ARENA_W / 2 - 35, 100, `STAGE ${this.level - 1} CLEAR!`, '#00FFAA');
        this.loadLevel(this.level);
        return soundToPlay;
      }
    }

    // 8. Pit fall check ($y > ARENA\_H$)
    if (this.ball.y > ARENA_H + 20) {
      return this.handleBallDie('FELL OFF!');
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= pt.decay * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Update Floating Text
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y -= 25 * dt;
      ft.life -= dt * 1.5;
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }

    return soundToPlay;
  }

  private handleBallDie(msg: string): ArcadeSound {
    this.spawnExplosion(this.ball.x, this.ball.y, 16, '#FF0055');
    this.lives--;
    this.addFloatText(this.ball.x - 15, this.ball.y - 15, msg, '#FF2A6D');

    if (this.lives <= 0) {
      this.gameOver = true;
      return 'gameover';
    }

    // Respawn ball at start of level
    this.ball.x = 28;
    this.ball.y = 185;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.invincibleTimer = 1.5;
    return 'die';
  }

  private spawnExplosion(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        color,
        life: 1.0,
        decay: 2.0,
      });
    }
  }

  private spawnSparkles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 55;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color,
        life: 1.0,
        decay: 2.2,
      });
    }
  }

  private spawnDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: this.nextEntityId++,
        x: x + (Math.random() - 0.5) * 16,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -10 - Math.random() * 20,
        size: 2,
        color: '#FFFFFF',
        life: 1.0,
        decay: 3.5,
      });
    }
  }

  private addFloatText(x: number, y: number, text: string, color: string): void {
    this.floatTexts.push({
      id: this.nextEntityId++,
      text,
      x: Math.max(10, Math.min(ARENA_W - 70, x)),
      y: Math.max(20, y),
      color,
      life: 1.0,
    });
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
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: ROLL • [A]: HIGH JUMP',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isBlinking =
      this.ball.invincibleTimer > 0 && Math.floor(this.ball.invincibleTimer * 12) % 2 === 0;
    const isLight = !!palette.isLightLcd;
    const collectedCount = this.hoops.filter((h) => h.collected).length;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* In-Game HUD Badge: Golden Hoops Counter */}
        <View
          style={[
            styles.hudBadge,
            isLight && {
              backgroundColor: 'rgba(23, 38, 22, 0.15)',
              borderColor: palette.pixelOn,
            },
          ]}
        >
          <View
            style={[
              styles.hudRingIcon,
              isLight && { borderColor: palette.pixelOn },
            ]}
          />
          <Text
            style={[
              styles.hudText,
              isLight && { color: palette.pixelOn },
            ]}
          >
            {collectedCount}/{this.hoops.length}
          </Text>
          {this.exitDoor.open && (
            <View
              style={[
                styles.exitOpenBadge,
                isLight && { backgroundColor: palette.pixelOn },
              ]}
            >
              <Text
                style={[
                  styles.exitOpenText,
                  isLight && { color: palette.screenBg },
                ]}
              >
                EXIT OPEN
              </Text>
            </View>
          )}
        </View>

        {/* Platforms & Ground */}
        {this.platforms.map((p, idx) => (
          <View
            key={idx}
            style={[
              styles.platform,
              {
                left: `${(p.x / ARENA_W) * 100}%`,
                top: `${(p.y / ARENA_H) * 100}%`,
                width: `${(p.w / ARENA_W) * 100}%`,
                height: `${(p.h / ARENA_H) * 100}%`,
                backgroundColor: p.isSpring
                  ? isLight
                    ? palette.pixelOn
                    : '#00FFAA'
                  : palette.pixelOn,
                borderColor: isLight
                  ? palette.pixelOn
                  : p.isSpring
                  ? '#FFFFFF'
                  : palette.bezelAccent,
              },
            ]}
          >
            {p.isSpring && (
              <Text
                style={[
                  styles.springText,
                  { color: isLight ? palette.screenBg : '#000000' },
                ]}
              >
                ▲ SPRING ▲
              </Text>
            )}
          </View>
        ))}

        {/* Hazard Spikes */}
        {this.spikes.map((sp, idx) => (
          <View
            key={idx}
            style={[
              styles.spikeBox,
              {
                left: `${(sp.x / ARENA_W) * 100}%`,
                top: `${(sp.y / ARENA_H) * 100}%`,
                width: `${(sp.w / ARENA_W) * 100}%`,
                height: `${(sp.h / ARENA_H) * 100}%`,
              },
            ]}
          >
            {Array.from({ length: Math.max(1, Math.floor(sp.w / 8)) }).map((_, sIdx) => (
              <View
                key={sIdx}
                style={[
                  styles.sharpSpike,
                  isLight && { borderBottomColor: palette.pixelOn },
                ]}
              />
            ))}
          </View>
        ))}

        {/* Golden Hoops (Rings) */}
        {this.hoops.map((h) => {
          if (h.collected) return null;
          return (
            <View
              key={h.id}
              style={[
                styles.hoop,
                {
                  left: `${((h.x - h.r) / ARENA_W) * 100}%`,
                  top: `${((h.y - h.r) / ARENA_H) * 100}%`,
                  width: `${((h.r * 2) / ARENA_W) * 100}%`,
                  height: `${((h.r * 2) / ARENA_H) * 100}%`,
                  borderColor: isLight ? palette.pixelOn : '#FFD700',
                  shadowColor: isLight ? 'transparent' : '#FFD700',
                },
              ]}
            >
              <View
                style={[
                  styles.hoopInner,
                  isLight && { borderColor: palette.pixelOn },
                ]}
              />
            </View>
          );
        })}

        {/* Exit Door */}
        <View
          style={[
            styles.exitDoor,
            {
              left: `${(this.exitDoor.x / ARENA_W) * 100}%`,
              top: `${(this.exitDoor.y / ARENA_H) * 100}%`,
              width: `${(this.exitDoor.w / ARENA_W) * 100}%`,
              height: `${(this.exitDoor.h / ARENA_H) * 100}%`,
              borderColor: isLight
                ? palette.pixelOn
                : this.exitDoor.open
                ? '#00FFAA'
                : '#73141E',
              backgroundColor: isLight
                ? this.exitDoor.open
                  ? 'rgba(23, 38, 22, 0.25)'
                  : 'rgba(23, 38, 22, 0.1)'
                : this.exitDoor.open
                ? 'rgba(0, 255, 170, 0.2)'
                : 'rgba(115, 20, 30, 0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.doorSign,
              {
                color: isLight
                  ? palette.pixelOn
                  : this.exitDoor.open
                  ? '#00FFAA'
                  : '#FF2A6D',
              },
            ]}
          >
            {this.exitDoor.open ? 'EXIT' : 'LOCK'}
          </Text>
        </View>

        {/* Bouncing Ball */}
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

        {/* Floating Text */}
        {this.floatTexts.map((ft) => (
          <Text
            key={ft.id}
            style={[
              styles.floatText,
              {
                left: `${(ft.x / ARENA_W) * 100}%`,
                top: `${(ft.y / ARENA_H) * 100}%`,
                color: ft.color,
                opacity: Math.max(0, ft.life),
              },
            ]}
          >
            {ft.text}
          </Text>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    zIndex: 20,
  },
  hudRingIcon: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#FFD700',
  },
  hudText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
    color: '#FFD700',
  },
  exitOpenBadge: {
    marginLeft: 4,
    backgroundColor: '#00FFAA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  exitOpenText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#000000',
  },
  platform: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  springText: {
    fontSize: 6,
    fontWeight: '900',
    color: '#000000',
  },
  spikeBox: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  sharpSpike: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF2A6D',
  },
  hoop: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 4,
  },
  hoopInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
  },
  exitDoor: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorSign: {
    fontSize: 7,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  ball: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 6,
  },
  ballHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
  floatText: {
    position: 'absolute',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
