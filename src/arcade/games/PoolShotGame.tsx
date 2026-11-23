import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const TABLE_L = 18;
const TABLE_R = 302;
const TABLE_T = 22;
const TABLE_B = 218;
const BALL_R = 7;

const POCKETS = [
  { x: TABLE_L + 4, y: TABLE_T + 4 },
  { x: (TABLE_L + TABLE_R) / 2, y: TABLE_T + 2 },
  { x: TABLE_R - 4, y: TABLE_T + 4 },
  { x: TABLE_L + 4, y: TABLE_B - 4 },
  { x: (TABLE_L + TABLE_R) / 2, y: TABLE_B - 2 },
  { x: TABLE_R - 4, y: TABLE_B - 4 },
];

interface PoolBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCue: boolean;
  potted: boolean;
}

export class PoolShotGame implements ArcadeGameInstance {
  private balls: PoolBall[] = [];
  private aimAngle = 0;
  private power = 0.6;
  private powerDir = 1;
  private phase: 'aim' | 'power' | 'roll' = 'aim';

  private shotsLeft = 12;
  private score = 0;
  private highScore = 0;
  private level = 1;
  private gameOver = false;
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
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.rackBalls();
  }

  private rackBalls(): void {
    this.balls = [
      { id: 0, x: 86, y: 120, vx: 0, vy: 0, isCue: true, potted: false },
      // 6-ball triangle rack
      { id: 1, x: 205, y: 120, vx: 0, vy: 0, isCue: false, potted: false },
      { id: 2, x: 220, y: 111, vx: 0, vy: 0, isCue: false, potted: false },
      { id: 3, x: 220, y: 129, vx: 0, vy: 0, isCue: false, potted: false },
      { id: 4, x: 235, y: 102, vx: 0, vy: 0, isCue: false, potted: false },
      { id: 5, x: 235, y: 120, vx: 0, vy: 0, isCue: false, potted: false },
      { id: 6, x: 235, y: 138, vx: 0, vy: 0, isCue: false, potted: false },
    ];
    this.aimAngle = 0;
    this.power = 0.6;
    this.phase = 'aim';
    this.shotsLeft = 12;
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

    const cue = this.balls[0];

    if (this.phase === 'aim') {
      if (input.left || input.up) this.aimAngle -= 2.2 * dt;
      if (input.right || input.down) this.aimAngle += 2.2 * dt;
      if (input.a && !this.lastA) {
        this.phase = 'power';
        this.power = 0.25;
        this.powerDir = 1;
        sound = 'hit';
      }
    } else if (this.phase === 'power') {
      this.power += this.powerDir * 1.4 * dt;
      if (this.power >= 1) { this.power = 1; this.powerDir = -1; }
      if (this.power <= 0.2) { this.power = 0.2; this.powerDir = 1; }

      if (input.a && !this.lastA) {
        const spd = 120 + this.power * 290;
        cue.vx = Math.cos(this.aimAngle) * spd;
        cue.vy = Math.sin(this.aimAngle) * spd;
        this.shotsLeft--;
        this.phase = 'roll';
        sound = 'shoot';
      }
    } else if (this.phase === 'roll') {
      const drag = Math.pow(0.982, dt * 60);
      let anyMoving = false;

      // Move balls & cushion bounces
      for (const b of this.balls) {
        if (b.potted) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= drag;
        b.vy *= drag;

        if (Math.hypot(b.vx, b.vy) < 6) {
          b.vx = 0;
          b.vy = 0;
        } else {
          anyMoving = true;
        }

        // Check pocket drop
        for (const p of POCKETS) {
          if (Math.hypot(b.x - p.x, b.y - p.y) < 13) {
            if (b.isCue) {
              // Scratch -> respawn cue ball
              b.x = 86;
              b.y = 120;
              b.vx = 0;
              b.vy = 0;
              sound = 'die';
            } else {
              b.potted = true;
              b.vx = 0;
              b.vy = 0;
              this.score += 150;
              this.shotsLeft++; // bonus shot for potting!
              if (this.score > this.highScore) this.highScore = this.score;
              sound = 'score';
            }
            break;
          }
        }
        if (b.potted) continue;

        if (b.x - BALL_R < TABLE_L) { b.x = TABLE_L + BALL_R; b.vx = Math.abs(b.vx) * 0.85; sound = 'hit'; }
        if (b.x + BALL_R > TABLE_R) { b.x = TABLE_R - BALL_R; b.vx = -Math.abs(b.vx) * 0.85; sound = 'hit'; }
        if (b.y - BALL_R < TABLE_T) { b.y = TABLE_T + BALL_R; b.vy = Math.abs(b.vy) * 0.85; sound = 'hit'; }
        if (b.y + BALL_R > TABLE_B) { b.y = TABLE_B - BALL_R; b.vy = -Math.abs(b.vy) * 0.85; sound = 'hit'; }
      }

      // Elastic Ball-to-Ball Collisions
      for (let i = 0; i < this.balls.length; i++) {
        const a = this.balls[i];
        if (a.potted) continue;
        for (let j = i + 1; j < this.balls.length; j++) {
          const b = this.balls[j];
          if (b.potted) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minD = BALL_R * 2;
          if (dist > 0 && dist < minD) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minD - dist) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dot = dvx * nx + dvy * ny;
            if (dot > 0) {
              a.vx -= dot * nx * 0.92;
              a.vy -= dot * ny * 0.92;
              b.vx += dot * nx * 0.92;
              b.vy += dot * ny * 0.92;
              sound = 'hit';
            }
          }
        }
      }

      if (!anyMoving) {
        const remaining = this.balls.filter((b) => !b.isCue && !b.potted).length;
        if (remaining === 0) {
          this.level++;
          this.score += 500;
          if (this.score > this.highScore) this.highScore = this.score;
          this.rackBalls();
          sound = 'levelclear';
        } else if (this.shotsLeft <= 0) {
          this.gameOver = true;
          sound = 'gameover';
        } else {
          this.phase = 'aim';
        }
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    const left = this.balls.filter((b) => !b.isCue && !b.potted).length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.shotsLeft,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF SHOTS!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RE-RACK'
        : `BALLS: ${left} • SHOTS: ${this.shotsLeft} • ◀/▶: AIM • [A]: SHOOT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';
    const cue = this.balls[0];

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Table Frame */}
        <View style={{ position: 'absolute', left: TABLE_L, top: TABLE_T, width: TABLE_R - TABLE_L, height: TABLE_B - TABLE_T, borderWidth: 3, borderColor: pixelColor, borderRadius: 6 }} />

        {/* 6 Pockets */}
        {POCKETS.map((p, i) => (
          <View key={`pk-${i}`} style={{ position: 'absolute', left: p.x - 8, top: p.y - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: pixelColor }} />
        ))}

        {/* Aim Line */}
        {(this.phase === 'aim' || this.phase === 'power') && !this.isMenu && (
          <>
            {[16, 28, 40, 52].map((d, i) => (
              <View
                key={`al-${i}`}
                style={{
                  position: 'absolute',
                  left: cue.x + Math.cos(this.aimAngle) * d - 1.5,
                  top: cue.y + Math.sin(this.aimAngle) * d - 1.5,
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: pixelColor,
                  opacity: 0.65,
                }}
              />
            ))}
          </>
        )}

        {/* Power Bar */}
        {this.phase === 'power' && (
          <View style={{ position: 'absolute', left: 26, top: 6, width: 90, height: 9, borderWidth: 1.5, borderColor: pixelColor, padding: 1 }}>
            <View style={{ width: `${Math.round(this.power * 100)}%`, height: '100%', backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Balls */}
        {this.balls.map((b) =>
          !b.potted ? (
            <View
              key={b.id}
              style={{
                position: 'absolute',
                left: b.x - BALL_R,
                top: b.y - BALL_R,
                width: BALL_R * 2,
                height: BALL_R * 2,
                borderRadius: BALL_R,
                borderWidth: 2,
                borderColor: pixelColor,
                backgroundColor: b.isCue ? bg : pixelColor,
              }}
            />
          ) : null
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>POOL SHOT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>6-POCKET RETRO BILLIARDS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO BREAK</Text>
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
