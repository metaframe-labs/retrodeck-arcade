import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface TunnelSlice {
  y: number;
  centerX: number;
  gapW: number;
}

export class TunnelRushGame implements ArcadeGameInstance {
  private shipX = ARENA_W / 2;
  private readonly shipY = 190;
  private slices: TunnelSlice[] = [];
  private targetCenter = ARENA_W / 2;
  private speed = 135;
  private distance = 0;

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
    this.shipX = ARENA_W / 2;
    this.targetCenter = ARENA_W / 2;
    this.speed = 135;
    this.distance = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;

    this.slices = [];
    for (let y = -16; y <= ARENA_H + 16; y += 16) {
      this.slices.push({ y, centerX: ARENA_W / 2, gapW: 130 });
    }
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

    const steer = 185;
    if (input.left) this.shipX -= steer * dt;
    if (input.right) this.shipX += steer * dt;

    this.speed = Math.min(280, 135 + this.distance / 30);
    const dy = this.speed * dt;
    this.distance += dy;
    this.score = Math.floor(this.distance / 8);
    if (this.score > this.highScore) this.highScore = this.score;

    // Scroll tunnel down
    for (const s of this.slices) s.y += dy;

    while (this.slices[0].y > 0) {
      const top = this.slices[0];
      if (Math.abs(top.centerX - this.targetCenter) < 12) {
        this.targetCenter = 75 + Math.random() * (ARENA_W - 150);
      }
      const nextCenter = top.centerX + Math.sign(this.targetCenter - top.centerX) * (9 + Math.random() * 6);
      const nextGap = Math.max(58, 130 - this.distance / 55);
      this.slices.unshift({
        y: top.y - 16,
        centerX: Math.max(nextGap / 2 + 10, Math.min(ARENA_W - nextGap / 2 - 10, nextCenter)),
        gapW: nextGap,
      });
    }

    while (this.slices.length > 22 && this.slices[this.slices.length - 1].y > ARENA_H + 32) {
      this.slices.pop();
    }

    // Check wall collision at shipY
    for (const s of this.slices) {
      if (this.shipY >= s.y && this.shipY <= s.y + 18) {
        const leftWall = s.centerX - s.gapW / 2;
        const rightWall = s.centerX + s.gapW / 2;
        if (this.shipX - 6 <= leftWall || this.shipX + 6 >= rightWall) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        break;
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
      level: Math.floor(this.distance / 600) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'WALL IMPACT!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: STAY INSIDE THE TUNNEL',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Tunnel Slices */}
        {this.slices.map((s, i) => {
          const leftW = Math.max(0, s.centerX - s.gapW / 2);
          const rightX = s.centerX + s.gapW / 2;
          const rightW = Math.max(0, ARENA_W - rightX);
          return (
            <React.Fragment key={`ts-${i}`}>
              <View style={{ position: 'absolute', left: 0, top: s.y, width: leftW, height: 17, backgroundColor: pixelColor }} />
              <View style={{ position: 'absolute', left: rightX, top: s.y, width: rightW, height: 17, backgroundColor: pixelColor }} />
            </React.Fragment>
          );
        })}

        {/* Speed Craft */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.shipX - 6,
              top: this.shipY - 8,
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderBottomWidth: 14,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: pixelColor,
            }}
          />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TUNNEL RUSH DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SURVIVE THE NARROWING CANYON</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FLY</Text>
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
