import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

export class HoopsShotGame implements ArcadeGameInstance {
  private hoopX = 246;
  private hoopY = 82;
  private hoopDir = 1;

  private ballX = 54;
  private ballY = 192;
  private ballVx = 0;
  private ballVy = 0;

  private power = 0.5;
  private powerDir = 1;
  private state: 'aim' | 'flying' = 'aim';
  private scoredThisShot = false;

  private timeLeft = 45;
  private streak = 0;
  private baskets = 0;
  private banner = '';
  private bannerTimer = 0;

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
    this.hoopX = 246;
    this.hoopY = 86;
    this.hoopDir = 1;
    this.timeLeft = 45;
    this.streak = 0;
    this.baskets = 0;
    this.score = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.resetBall();
  }

  private resetBall(): void {
    this.ballX = 52;
    this.ballY = 192;
    this.ballVx = 0;
    this.ballVy = 0;
    this.state = 'aim';
    this.scoredThisShot = false;
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

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner = '';
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.lastA = input.a;
      return 'gameover';
    }

    // Move hoop vertically after 2 baskets for fun challenge
    if (this.baskets >= 2) {
      const hSpd = Math.min(65, 22 + this.baskets * 4);
      this.hoopY += this.hoopDir * hSpd * dt;
      if (this.hoopY < 54) { this.hoopY = 54; this.hoopDir = 1; }
      if (this.hoopY > 118) { this.hoopY = 118; this.hoopDir = -1; }
    }

    if (this.state === 'aim') {
      // Oscillate power meter
      this.power += this.powerDir * 1.15 * dt;
      if (this.power >= 1) { this.power = 1; this.powerDir = -1; }
      if (this.power <= 0.15) { this.power = 0.15; this.powerDir = 1; }

      if (input.a && !this.lastA) {
        // Launch parabolic basketball arc
        const speed = 225 + this.power * 185;
        const angle = -1.04; // ~60 degrees upward
        this.ballVx = Math.cos(angle) * speed;
        this.ballVy = Math.sin(angle) * speed;
        this.state = 'flying';
        sound = 'shoot';
      }
    } else {
      // Gravity & motion
      this.ballVy += 420 * dt;
      const prevY = this.ballY;
      this.ballX += this.ballVx * dt;
      this.ballY += this.ballVy * dt;

      // Backboard bounce
      if (this.ballX >= this.hoopX + 18 && this.ballX <= this.hoopX + 26 && this.ballY >= this.hoopY - 26 && this.ballY <= this.hoopY + 6) {
        this.ballVx = -Math.abs(this.ballVx) * 0.65;
        sound = 'hit';
      }

      // Check swish through rim (descending through hoopX-14 .. hoopX+14)
      if (
        !this.scoredThisShot &&
        this.ballVy > 0 &&
        prevY <= this.hoopY &&
        this.ballY >= this.hoopY &&
        Math.abs(this.ballX - this.hoopX) <= 18
      ) {
        this.scoredThisShot = true;
        this.baskets++;
        this.streak++;
        const pts = 2 + (this.streak >= 3 ? 1 : 0);
        this.score += pts * 50;
        if (this.score > this.highScore) this.highScore = this.score;
        this.banner = this.streak >= 3 ? `SWISH x${this.streak}!` : 'BUCKET! +100';
        this.bannerTimer = 0.9;
        sound = 'score';
      }

      // Offscreen or hit floor
      if (this.ballY > ARENA_H + 16 || this.ballX > ARENA_W + 20 || this.ballX < -20) {
        if (!this.scoredThisShot) {
          this.streak = 0;
        }
        this.resetBall();
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.baskets + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BUZZER BEATER!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO SHOOT AGAIN'
        : `TIME: ${Math.ceil(this.timeLeft)}s • BASKETS: ${this.baskets} • [A]: SHOOT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Timer HUD */}
        <View style={styles.hudRow}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>CLOCK: {Math.ceil(this.timeLeft)}s</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>STREAK: {this.streak}</Text>
        </View>

        {/* Court Floor */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 16, height: 2, backgroundColor: pixelColor }} />

        {/* Power Meter Bar (Left side) */}
        <View style={[styles.powerWrap, { borderColor: pixelColor }]}>
          <View
            style={{
              position: 'absolute',
              left: 1,
              right: 1,
              bottom: 1,
              height: `${Math.round(this.power * 100)}%`,
              backgroundColor: pixelColor,
            }}
          />
        </View>
        <Text style={{ position: 'absolute', left: 10, bottom: 20, fontSize: 7, fontWeight: '900', color: pixelColor }}>PWR</Text>

        {/* Backboard, Pole & Rim */}
        <View style={{ position: 'absolute', left: this.hoopX + 20, top: this.hoopY - 26, width: 4, height: 32, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: this.hoopX + 22, top: this.hoopY + 6, width: 3, bottom: 16, backgroundColor: pixelColor, opacity: 0.45 }} />
        {/* Rim */}
        <View style={{ position: 'absolute', left: this.hoopX - 16, top: this.hoopY, width: 36, height: 3, backgroundColor: pixelColor }} />
        {/* Net */}
        <View style={{ position: 'absolute', left: this.hoopX - 13, top: this.hoopY + 3, width: 30, height: 18, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: pixelColor }} />

        {/* Basketball */}
        <View
          style={{
            position: 'absolute',
            left: this.ballX - 9,
            top: this.ballY - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: pixelColor,
            borderWidth: 1,
            borderColor: pixelColor,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Horizontal Seam */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 1.5,
              backgroundColor: bg,
            }}
          />
          {/* Vertical Seam */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 1.5,
              backgroundColor: bg,
            }}
          />
          {/* Left Curved Rib Seam */}
          <View
            style={{
              position: 'absolute',
              left: -4,
              top: 1,
              bottom: 1,
              width: 13,
              borderRadius: 6.5,
              borderWidth: 1.2,
              borderColor: bg,
              backgroundColor: 'transparent',
            }}
          />
          {/* Right Curved Rib Seam */}
          <View
            style={{
              position: 'absolute',
              right: -4,
              top: 1,
              bottom: 1,
              width: 13,
              borderRadius: 6.5,
              borderWidth: 1.2,
              borderColor: bg,
              backgroundColor: 'transparent',
            }}
          />
        </View>

        {/* Banner */}
        {this.banner !== '' && (
          <View style={{ position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: pixelColor, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: bg }}>{this.banner}</Text>
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>HOOPS SHOT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TIME THE POWER BAR TO SCORE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudRow: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  powerWrap: {
    position: 'absolute',
    left: 14,
    bottom: 32,
    width: 10,
    height: 110,
    borderWidth: 1.5,
    borderRadius: 2,
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
