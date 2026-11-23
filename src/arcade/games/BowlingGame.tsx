import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const LANE_L = 82;
const LANE_W = 156;

interface Pin {
  id: number;
  x: number;
  y: number;
  standing: boolean;
}

export class BowlingGame implements ArcadeGameInstance {
  private ballX = ARENA_W / 2;
  private ballY = 204;
  private ballVx = 0;
  private ballVy = 0;

  private spin = 0; // -1..1
  private spinDir = 1;
  private phase: 'pos' | 'spin' | 'roll' | 'result' = 'pos';
  private phaseTimer = 0;
  private banner = '';

  private pins: Pin[] = [];
  private frame = 1;
  private throwNum = 1;
  private score = 0;
  private highScore = 0;
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
    this.frame = 1;
    this.throwNum = 1;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.setupPins();
    this.resetBall();
  }

  private setupPins(): void {
    this.pins = [];
    let id = 1;
    // Standard 10-pin triangle (4 rows: 1, 2, 3, 4)
    const rows = [
      { y: 74, xs: [160] },
      { y: 58, xs: [148, 172] },
      { y: 42, xs: [136, 160, 184] },
      { y: 26, xs: [124, 148, 172, 196] },
    ];
    for (const row of rows) {
      for (const x of row.xs) {
        this.pins.push({ id: id++, x, y: row.y, standing: true });
      }
    }
  }

  private resetBall(): void {
    this.ballX = ARENA_W / 2;
    this.ballY = 204;
    this.ballVx = 0;
    this.ballVy = 0;
    this.spin = 0;
    this.spinDir = 1;
    this.phase = 'pos';
    this.banner = '';
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

    if (this.phase === 'pos') {
      if (input.left) this.ballX = Math.max(LANE_L + 16, this.ballX - 130 * dt);
      if (input.right) this.ballX = Math.min(LANE_L + LANE_W - 16, this.ballX + 130 * dt);
      if (input.a && !this.lastA) {
        this.phase = 'spin';
        sound = 'hit';
      }
    } else if (this.phase === 'spin') {
      this.spin += this.spinDir * 2.4 * dt;
      if (this.spin >= 1) { this.spin = 1; this.spinDir = -1; }
      if (this.spin <= -1) { this.spin = -1; this.spinDir = 1; }
      if (input.a && !this.lastA) {
        this.ballVx = this.spin * 65;
        this.ballVy = -225;
        this.phase = 'roll';
        sound = 'shoot';
      }
    } else if (this.phase === 'roll') {
      this.ballX += this.ballVx * dt;
      this.ballY += this.ballVy * dt;

      // Gutter bounds
      if (this.ballX < LANE_L + 8) { this.ballX = LANE_L + 8; this.ballVx = 0; }
      if (this.ballX > LANE_L + LANE_W - 8) { this.ballX = LANE_L + LANE_W - 8; this.ballVx = 0; }

      // Pin collisions (with chain knock-down splash)
      for (const p of this.pins) {
        if (p.standing && Math.hypot(this.ballX - p.x, this.ballY - p.y) < 15) {
          p.standing = false;
          sound = 'hit';
          // Chain reaction to nearby pins
          for (const p2 of this.pins) {
            if (p2.standing && Math.hypot(p.x - p2.x, p.y - p2.y) < 22 && Math.random() < 0.72) {
              p2.standing = false;
            }
          }
        }
      }

      if (this.ballY <= 12) {
        const downNow = this.pins.filter((p) => !p.standing).length;
        this.phase = 'result';
        this.phaseTimer = 1.25;

        if (downNow === 10 && this.throwNum === 1) {
          this.score += 30;
          this.banner = 'STRIKE! +30';
          sound = 'levelclear';
          this.throwNum = 2; // end frame
        } else if (downNow === 10) {
          this.score += 20;
          this.banner = 'SPARE! +20';
          sound = 'score';
        } else if (this.throwNum === 2) {
          this.score += downNow;
          this.banner = `${downNow} PINS DOWN`;
          sound = 'hit';
        } else {
          this.banner = `${downNow} PINS — BALL 2`;
        }
        if (this.score > this.highScore) this.highScore = this.score;
      }
    } else if (this.phase === 'result') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.throwNum === 1 && this.pins.some((p) => p.standing)) {
          this.throwNum = 2;
          this.resetBall();
        } else {
          this.frame++;
          if (this.frame > 10) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          }
          this.throwNum = 1;
          this.setupPins();
          this.resetBall();
        }
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, 11 - this.frame),
      level: this.frame,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? `FINAL SCORE: ${this.score}` : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO BOWL AGAIN'
        : this.phase === 'pos'
        ? `FRAME ${this.frame}/10 • ◀/▶: AIM • [A]: LOCK`
        : `FRAME ${this.frame}/10 • [A]: LOCK ANGLE & ROLL`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Lane & Gutters */}
        <View style={{ position: 'absolute', left: LANE_L - 10, top: 8, bottom: 8, width: 10, backgroundColor: pixelColor, opacity: 0.2 }} />
        <View style={{ position: 'absolute', left: LANE_L + LANE_W, top: 8, bottom: 8, width: 10, backgroundColor: pixelColor, opacity: 0.2 }} />
        <View style={{ position: 'absolute', left: LANE_L, top: 8, bottom: 8, width: LANE_W, borderLeftWidth: 2, borderRightWidth: 2, borderColor: pixelColor }} />

        {/* Frame HUD */}
        <Text style={[styles.hudTxt, { color: pixelColor }]}>FRM {this.frame}/10</Text>

        {/* Pins */}
        {this.pins.map((p) =>
          p.standing ? (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x - 4,
                top: p.y - 6,
                width: 8,
                height: 12,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: pixelColor,
                backgroundColor: bg,
              }}
            />
          ) : null
        )}

        {/* Aim / Spin Gauge */}
        {this.phase === 'spin' && (
          <View style={{ position: 'absolute', left: this.ballX - 24, top: this.ballY - 24, width: 48, height: 8, borderWidth: 1.5, borderColor: pixelColor }}>
            <View style={{ position: 'absolute', left: 22 + this.spin * 20, top: 0, width: 4, height: 6, backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Bowling Ball */}
        <View
          style={{
            position: 'absolute',
            left: this.ballX - 9,
            top: this.ballY - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: pixelColor,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
            <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
          </View>
        </View>

        {this.banner !== '' && (
          <View style={{ position: 'absolute', top: 112, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: pixelColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: bg }}>{this.banner}</Text>
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BOWLING DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>10-FRAME RETRO ALLEY</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO BOWL</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudTxt: {
    position: 'absolute',
    left: 10,
    top: 14,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
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
