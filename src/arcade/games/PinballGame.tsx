import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const TABLE_L = 58;
const TABLE_R = 262;

interface Bumper {
  x: number;
  y: number;
  r: number;
  pts: number;
  flash: number;
}

export class PinballGame implements ArcadeGameInstance {
  private bx = 160;
  private by = 120;
  private bvx = 90;
  private bvy = -120;
  private readonly br = 6;

  private leftUp = false;
  private rightUp = false;
  private bumpers: Bumper[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
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
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
    this.bumpers = [
      { x: 120, y: 66, r: 15, pts: 100, flash: 0 },
      { x: 200, y: 66, r: 15, pts: 100, flash: 0 },
      { x: 160, y: 112, r: 17, pts: 150, flash: 0 },
      { x: 104, y: 136, r: 11, pts: 75, flash: 0 },
      { x: 216, y: 136, r: 11, pts: 75, flash: 0 },
    ];
    this.launchBall();
  }

  private launchBall(): void {
    this.bx = TABLE_R - 18;
    this.by = 175;
    this.bvx = -55 - Math.random() * 55;
    this.bvy = -245 - Math.random() * 40;
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

    const prevLeft = this.leftUp;
    const prevRight = this.rightUp;
    this.leftUp = input.left || input.b;
    this.rightUp = input.right || input.a;

    // Gravity
    this.bvy += 310 * dt;
    this.bx += this.bvx * dt;
    this.by += this.bvy * dt;

    // Speed clamp
    const spd = Math.hypot(this.bvx, this.bvy);
    if (spd > 360) {
      this.bvx = (this.bvx / spd) * 360;
      this.bvy = (this.bvy / spd) * 360;
    }

    // Walls
    if (this.bx - this.br < TABLE_L) {
      this.bx = TABLE_L + this.br;
      this.bvx = Math.abs(this.bvx) * 0.88;
      sound = 'hit';
    } else if (this.bx + this.br > TABLE_R) {
      this.bx = TABLE_R - this.br;
      this.bvx = -Math.abs(this.bvx) * 0.88;
      sound = 'hit';
    }
    if (this.by - this.br < 10) {
      this.by = 10 + this.br;
      this.bvy = Math.abs(this.bvy) * 0.9;
      sound = 'hit';
    }

    // Bumpers
    for (const b of this.bumpers) {
      if (b.flash > 0) b.flash -= dt;
      const dx = this.bx - b.x;
      const dy = this.by - b.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < b.r + this.br) {
        const nx = dx / d;
        const ny = dy / d;
        this.bx = b.x + nx * (b.r + this.br + 1);
        this.by = b.y + ny * (b.r + this.br + 1);
        const kick = 235;
        this.bvx = nx * kick;
        this.bvy = ny * kick;
        b.flash = 0.16;
        this.score += b.pts;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'score';
      }
    }

    // Left Flipper (TABLE_L+12 .. 152, y ~ 202)
    if (this.by >= 186 && this.by <= 212 && this.bx >= TABLE_L + 4 && this.bx <= 156 && this.bvy > 0) {
      this.by = 186;
      const boosted = this.leftUp && !prevLeft ? 1.45 : this.leftUp ? 1.18 : 0.8;
      this.bvy = -215 * boosted;
      this.bvx += 75;
      sound = this.leftUp ? 'powerup' : 'hit';
    }

    // Right Flipper (168 .. TABLE_R-12, y ~ 202)
    if (this.by >= 186 && this.by <= 212 && this.bx >= 164 && this.bx <= TABLE_R - 4 && this.bvy > 0) {
      this.by = 186;
      const boosted = this.rightUp && !prevRight ? 1.45 : this.rightUp ? 1.18 : 0.8;
      this.bvy = -215 * boosted;
      this.bvx -= 75;
      sound = this.rightUp ? 'powerup' : 'hit';
    }

    // Drain between flippers
    if (this.by > ARENA_H + 10) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.lastA = input.a;
        return 'gameover';
      }
      this.launchBall();
      sound = 'die';
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: Math.floor(this.score / 1000) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BALL DRAINED!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / [B]: LEFT FLIPPER • ▶ / [A]: RIGHT FLIPPER',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Table Frame */}
        <View style={{ position: 'absolute', left: TABLE_L, top: 8, width: TABLE_R - TABLE_L, bottom: 8, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: pixelColor, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />

        {/* Bumpers */}
        {this.bumpers.map((b, i) => (
          <View
            key={`bp-${i}`}
            style={{
              position: 'absolute',
              left: b.x - b.r,
              top: b.y - b.r,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: b.r,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: b.flash > 0 ? pixelColor : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: '900', color: b.flash > 0 ? bg : pixelColor }}>{b.pts}</Text>
          </View>
        ))}

        {/* Left Flipper */}
        <View
          style={{
            position: 'absolute',
            left: TABLE_L + 8,
            top: 200,
            width: 82,
            height: 8,
            borderRadius: 4,
            backgroundColor: pixelColor,
            transform: [{ rotate: this.leftUp ? '-22deg' : '16deg' }],
          }}
        />

        {/* Right Flipper */}
        <View
          style={{
            position: 'absolute',
            left: 170,
            top: 200,
            width: 82,
            height: 8,
            borderRadius: 4,
            backgroundColor: pixelColor,
            transform: [{ rotate: this.rightUp ? '22deg' : '-16deg' }],
          }}
        />

        {/* Pinball */}
        <View style={{ position: 'absolute', left: this.bx - this.br, top: this.by - this.br, width: this.br * 2, height: this.br * 2, borderRadius: this.br, backgroundColor: pixelColor }} />

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PINBALL DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>RETRO FLIPPERS & BUMPERS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
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
