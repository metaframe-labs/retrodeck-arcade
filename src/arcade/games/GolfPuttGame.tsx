import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Course {
  ball: { x: number; y: number };
  hole: { x: number; y: number };
  walls: Wall[];
  par: number;
}

const COURSES: Course[] = [
  {
    ball: { x: 48, y: 120 },
    hole: { x: 266, y: 120 },
    walls: [{ x: 150, y: 65, w: 14, h: 110 }],
    par: 2,
  },
  {
    ball: { x: 46, y: 192 },
    hole: { x: 268, y: 48 },
    walls: [
      { x: 115, y: 95, w: 16, h: 135 },
      { x: 200, y: 10, w: 16, h: 135 },
    ],
    par: 3,
  },
  {
    ball: { x: 48, y: 52 },
    hole: { x: 266, y: 186 },
    walls: [
      { x: 10, y: 112, w: 195, h: 14 },
      { x: 145, y: 165, w: 14, h: 65 },
    ],
    par: 3,
  },
  {
    ball: { x: 48, y: 120 },
    hole: { x: 270, y: 120 },
    walls: [
      { x: 110, y: 20, w: 14, h: 85 },
      { x: 110, y: 135, w: 14, h: 85 },
      { x: 205, y: 70, w: 14, h: 100 },
    ],
    par: 3,
  },
];

export class GolfPuttGame implements ArcadeGameInstance {
  private holeIdx = 0;
  private bx = 48;
  private by = 120;
  private bvx = 0;
  private bvy = 0;
  private aimAngle = 0;
  private power = 0.5;
  private powerDir = 1;
  private phase: 'aim' | 'power' | 'roll' | 'sunk' = 'aim';
  private sunkTimer = 0;

  private strokes = 0;
  private totalStrokes = 0;
  private score = 0;
  private highScore = 0;
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
    this.holeIdx = 0;
    this.totalStrokes = 0;
    this.score = 0;
    this.isMenu = true;
    this.loadCourse(0);
  }

  private loadCourse(idx: number): void {
    const c = COURSES[idx % COURSES.length];
    this.bx = c.ball.x;
    this.by = c.ball.y;
    this.bvx = 0;
    this.bvy = 0;
    this.aimAngle = 0;
    this.power = 0.5;
    this.strokes = 0;
    this.phase = 'aim';
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

    const course = COURSES[this.holeIdx % COURSES.length];

    if (this.phase === 'sunk') {
      this.sunkTimer -= dt;
      if (this.sunkTimer <= 0) {
        this.holeIdx++;
        this.loadCourse(this.holeIdx);
      }
      this.lastA = input.a;
      return sound;
    }

    if (this.phase === 'aim') {
      if (input.left || input.up) this.aimAngle -= 2.4 * dt;
      if (input.right || input.down) this.aimAngle += 2.4 * dt;
      if (input.a && !this.lastA) {
        this.phase = 'power';
        this.power = 0.2;
        this.powerDir = 1;
        sound = 'hit';
      }
    } else if (this.phase === 'power') {
      this.power += this.powerDir * 1.45 * dt;
      if (this.power >= 1) { this.power = 1; this.powerDir = -1; }
      if (this.power <= 0.15) { this.power = 0.15; this.powerDir = 1; }

      if (input.a && !this.lastA) {
        const spd = 95 + this.power * 265;
        this.bvx = Math.cos(this.aimAngle) * spd;
        this.bvy = Math.sin(this.aimAngle) * spd;
        this.strokes++;
        this.totalStrokes++;
        this.phase = 'roll';
        sound = 'shoot';
      }
    } else if (this.phase === 'roll') {
      const prevX = this.bx;
      const prevY = this.by;
      this.bx += this.bvx * dt;
      this.by += this.bvy * dt;

      // Grass friction
      const drag = Math.pow(0.978, dt * 60);
      this.bvx *= drag;
      this.bvy *= drag;

      // Outer bounds bounce
      if (this.bx < 14) { this.bx = 14; this.bvx = Math.abs(this.bvx) * 0.8; sound = 'hit'; }
      if (this.bx > ARENA_W - 14) { this.bx = ARENA_W - 14; this.bvx = -Math.abs(this.bvx) * 0.8; sound = 'hit'; }
      if (this.by < 14) { this.by = 14; this.bvy = Math.abs(this.bvy) * 0.8; sound = 'hit'; }
      if (this.by > ARENA_H - 14) { this.by = ARENA_H - 14; this.bvy = -Math.abs(this.bvy) * 0.8; sound = 'hit'; }

      // Obstacle walls bounce
      for (const w of course.walls) {
        if (this.bx + 5 >= w.x && this.bx - 5 <= w.x + w.w && this.by + 5 >= w.y && this.by - 5 <= w.y + w.h) {
          if (prevX + 5 <= w.x || prevX - 5 >= w.x + w.w) {
            this.bvx = -this.bvx * 0.8;
            this.bx = prevX;
          } else {
            this.bvy = -this.bvy * 0.8;
            this.by = prevY;
          }
          sound = 'hit';
        }
      }

      // Check Hole Cup
      const spd = Math.hypot(this.bvx, this.bvy);
      if (Math.hypot(this.bx - course.hole.x, this.by - course.hole.y) < 11 && spd < 185) {
        this.bx = course.hole.x;
        this.by = course.hole.y;
        this.bvx = 0;
        this.bvy = 0;
        const pts = Math.max(100, 400 - (this.strokes - 1) * 75);
        this.score += pts;
        if (this.score > this.highScore) this.highScore = this.score;
        this.phase = 'sunk';
        this.sunkTimer = 1.2;
        sound = 'levelclear';
      } else if (spd < 8) {
        this.bvx = 0;
        this.bvy = 0;
        this.phase = 'aim';
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    const course = COURSES[this.holeIdx % COURSES.length];
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.holeIdx + 1,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.phase === 'sunk' ? (this.strokes === 1 ? 'HOLE IN ONE!' : 'SUNK IT!') : undefined,
      subMessage:
        this.phase === 'aim'
          ? `HOLE ${this.holeIdx + 1} (PAR ${course.par}) • STROKES: ${this.strokes} • ◀/▶: AIM • [A]: PWR`
          : `HOLE ${this.holeIdx + 1} • PRESS [A] TO PUTT!`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';
    const course = COURSES[this.holeIdx % COURSES.length];

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Course Border */}
        <View style={{ position: 'absolute', left: 8, right: 8, top: 8, bottom: 8, borderWidth: 2, borderColor: pixelColor }} />

        {/* Walls */}
        {course.walls.map((w, i) => (
          <View key={`gw-${i}`} style={{ position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h, backgroundColor: pixelColor }} />
        ))}

        {/* Hole Cup & Flag */}
        <View style={{ position: 'absolute', left: course.hole.x - 7, top: course.hole.y - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: pixelColor }} />
        <Text style={{ position: 'absolute', left: course.hole.x - 3, top: course.hole.y - 22, fontSize: 13, fontWeight: '900', color: pixelColor }}>⚑</Text>

        {/* Aim Dotted Line */}
        {(this.phase === 'aim' || this.phase === 'power') && !this.isMenu && (
          <>
            {[14, 26, 38].map((dist, idx) => (
              <View
                key={`ad-${idx}`}
                style={{
                  position: 'absolute',
                  left: this.bx + Math.cos(this.aimAngle) * dist - 1.5,
                  top: this.by + Math.sin(this.aimAngle) * dist - 1.5,
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: pixelColor,
                  opacity: 0.7,
                }}
              />
            ))}
          </>
        )}

        {/* Power Gauge */}
        {this.phase === 'power' && (
          <View style={{ position: 'absolute', left: 16, bottom: 16, width: 90, height: 10, borderWidth: 1.5, borderColor: pixelColor, padding: 1 }}>
            <View style={{ width: `${Math.round(this.power * 100)}%`, height: '100%', backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Golf Ball */}
        <View style={{ position: 'absolute', left: this.bx - 5, top: this.by - 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: pixelColor, backgroundColor: bg }} />

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>GOLF PUTT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MINI GOLF OBSTACLE TOUR</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO TEE OFF</Text>
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
