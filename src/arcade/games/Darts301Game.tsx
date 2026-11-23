import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const CX = 160;
const CY = 122;

export class Darts301Game implements ArcadeGameInstance {
  private remaining = 301;
  private dartsThrown = 0;
  private angle = 0;
  private radius = 38;
  private radDir = 1;
  private banner = 'AIM & THROW [A]!';
  private lastDart: { x: number; y: number } | null = null;

  private score = 0;
  private highScore = 0;
  private gameWon = false;
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
    this.remaining = 301;
    this.dartsThrown = 0;
    this.angle = 0;
    this.radius = 38;
    this.radDir = 1;
    this.lastDart = null;
    this.banner = 'REACH EXACTLY 0 FROM 301!';
    this.score = 0;
    this.gameWon = false;
    this.isMenu = true;
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

    if (this.gameWon) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    // Orbiting crosshair on dartboard
    this.angle += 2.6 * dt;
    this.radius += this.radDir * 68 * dt;
    if (this.radius >= 68) { this.radius = 68; this.radDir = -1; }
    if (this.radius <= 0) { this.radius = 0; this.radDir = 1; }

    if (input.a && !this.lastA) {
      const dx = Math.cos(this.angle) * this.radius;
      const dy = Math.sin(this.angle) * this.radius;
      this.lastDart = { x: CX + dx, y: CY + dy };
      this.dartsThrown++;

      let pts = 0;
      if (this.radius <= 10) pts = 50; // Bullseye
      else if (this.radius <= 24) pts = 25;
      else if (this.radius <= 44) pts = 20;
      else if (this.radius <= 60) pts = 15;
      else pts = 5;

      if (this.remaining - pts < 0) {
        this.banner = `BUST! (${pts} TOO HIGH)`;
        sound = 'die';
      } else {
        this.remaining -= pts;
        this.score += pts * 5;
        if (this.score > this.highScore) this.highScore = this.score;
        if (this.remaining === 0) {
          this.gameWon = true;
          const bonus = Math.max(200, 1000 - this.dartsThrown * 30);
          this.score += bonus;
          if (this.score > this.highScore) this.highScore = this.score;
          this.banner = `CHECKOUT IN ${this.dartsThrown} DARTS!`;
          sound = 'levelclear';
        } else {
          this.banner = `HIT ${pts} — ${this.remaining} LEFT`;
          sound = pts >= 25 ? 'score' : 'hit';
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
      lives: 1,
      level: this.dartsThrown,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.gameWon ? '301 CHECKOUT!' : undefined,
      subMessage: this.gameWon
        ? 'PRESS [A] TO PLAY AGAIN'
        : `LEFT: ${this.remaining} • DARTS: ${this.dartsThrown} • [A]: THROW`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    const aimX = CX + Math.cos(this.angle) * this.radius;
    const aimY = CY + Math.sin(this.angle) * this.radius;

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          REMAINING: {this.remaining}   •   DARTS: {this.dartsThrown}
        </Text>

        {/* Dartboard Rings */}
        {[64, 44, 24, 10].map((r, i) => (
          <View
            key={`dr-${i}`}
            style={{
              position: 'absolute',
              left: CX - r,
              top: CY - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: i === 3 ? pixelColor : 'transparent',
            }}
          />
        ))}

        {/* Orbiting Crosshair */}
        {!this.isMenu && !this.gameWon && (
          <View style={{ position: 'absolute', left: aimX - 6, top: aimY - 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: 12, height: 1.5, backgroundColor: pixelColor }} />
            <View style={{ position: 'absolute', width: 1.5, height: 12, backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Last Dart Pin */}
        {this.lastDart && (
          <View style={{ position: 'absolute', left: this.lastDart.x - 4, top: this.lastDart.y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: pixelColor, borderWidth: 1.5, borderColor: bg }} />
        )}

        <Text style={[styles.bannerTxt, { color: pixelColor }]}>{this.banner}</Text>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>DARTS 301 DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>COUNT DOWN 301 TO ZERO</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO THROW</Text>
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
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  bannerTxt: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
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
