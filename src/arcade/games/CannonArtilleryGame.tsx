import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const GROUND_Y = 212;

export class CannonArtilleryGame implements ArcadeGameInstance {
  private readonly cannonX = 34;
  private readonly cannonY = GROUND_Y - 8;
  private angleDeg = 45; // 15..80
  private power = 65; // 25..100
  private wind = 0; // -25..+25

  private hillX = 160;
  private hillH = 70;
  private targetX = 264;

  private shellX = 0;
  private shellY = 0;
  private shellVx = 0;
  private shellVy = 0;
  private firing = false;

  private shotsLeft = 5;
  private hits = 0;
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
    this.score = 0;
    this.hits = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.newStage();
  }

  private newStage(): void {
    this.angleDeg = 45;
    this.power = 65;
    this.wind = Math.round((Math.random() - 0.5) * 40);
    this.hillX = 135 + Math.random() * 55;
    this.hillH = 48 + Math.random() * 54;
    this.targetX = 228 + Math.random() * 68;
    this.firing = false;
    this.shotsLeft = 5;
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

    if (!this.firing) {
      if (input.up) this.angleDeg = Math.min(80, this.angleDeg + 45 * dt);
      if (input.down) this.angleDeg = Math.max(15, this.angleDeg - 45 * dt);
      if (input.right) this.power = Math.min(100, this.power + 45 * dt);
      if (input.left) this.power = Math.max(25, this.power - 45 * dt);

      if (input.a && !this.lastA) {
        const rad = (this.angleDeg * Math.PI) / 180;
        const speed = this.power * 3.1;
        this.shellX = this.cannonX + Math.cos(rad) * 14;
        this.shellY = this.cannonY - Math.sin(rad) * 14;
        this.shellVx = Math.cos(rad) * speed;
        this.shellVy = -Math.sin(rad) * speed;
        this.firing = true;
        this.shotsLeft--;
        sound = 'shoot';
      }
    } else {
      // Ballistic trajectory with gravity & wind
      this.shellVx += this.wind * 0.9 * dt;
      this.shellVy += 220 * dt;
      this.shellX += this.shellVx * dt;
      this.shellY += this.shellVy * dt;

      // Hit Enemy Fort!
      if (Math.abs(this.shellX - this.targetX) < 16 && this.shellY >= GROUND_Y - 18) {
        this.hits++;
        this.score += 200 + this.shotsLeft * 60;
        if (this.score > this.highScore) this.highScore = this.score;
        this.newStage();
        sound = 'levelclear';
      } else if (
        // Hit Mountain Hill
        Math.abs(this.shellX - this.hillX) < 22 &&
        this.shellY >= GROUND_Y - this.hillH
      ) {
        this.firing = false;
        sound = 'die';
        if (this.shotsLeft <= 0) {
          this.gameOver = true;
          sound = 'gameover';
        }
      } else if (this.shellY >= GROUND_Y || this.shellX > ARENA_W + 10 || this.shellX < -10) {
        this.firing = false;
        sound = 'hit';
        if (this.shotsLeft <= 0) {
          this.gameOver = true;
          sound = 'gameover';
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
      lives: this.shotsLeft,
      level: this.hits + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF SHELLS!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RELOAD'
        : `ANG:${Math.round(this.angleDeg)}° PWR:${Math.round(this.power)}% WIND:${this.wind > 0 ? `+${this.wind}▶` : `${this.wind}◀`}`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Telemetry HUD */}
        <View style={styles.hudRow}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>ANG {Math.round(this.angleDeg)}°</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>PWR {Math.round(this.power)}%</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>
            WIND {this.wind >= 0 ? `▶${this.wind}` : `◀${Math.abs(this.wind)}`}
          </Text>
        </View>

        {/* Ground */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND_Y, bottom: 0, backgroundColor: pixelColor, opacity: 0.3 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND_Y, height: 2, backgroundColor: pixelColor }} />

        {/* Mountain Obstacle */}
        <View
          style={{
            position: 'absolute',
            left: this.hillX - 24,
            top: GROUND_Y - this.hillH,
            width: 48,
            height: this.hillH,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: pixelColor,
          }}
        />

        {/* Player Cannon */}
        <View style={{ position: 'absolute', left: this.cannonX - 8, top: this.cannonY - 4, width: 16, height: 12, alignItems: 'center' }}>
          {/* Barrel */}
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: -2,
              width: 14,
              height: 4,
              backgroundColor: pixelColor,
              transform: [{ rotate: `${-this.angleDeg}deg` }],
            }}
          />
          {/* Base Wheel */}
          <View style={{ position: 'absolute', bottom: 0, width: 14, height: 8, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: pixelColor }} />
        </View>

        {/* Enemy Castle Fort */}
        <View style={{ position: 'absolute', left: this.targetX - 12, top: GROUND_Y - 18, width: 24, height: 18, backgroundColor: pixelColor, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 8, height: 8, backgroundColor: bg }} />
        </View>

        {/* Flying Cannonball */}
        {this.firing && (
          <View style={{ position: 'absolute', left: this.shellX - 3, top: this.shellY - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ARTILLERY DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>ADJUST ANGLE & POWER VS WIND</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FIRE</Text>
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
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
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
