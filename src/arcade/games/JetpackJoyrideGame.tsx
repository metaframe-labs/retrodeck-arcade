import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Zapper {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
}

export class JetpackJoyrideGame implements ArcadeGameInstance {
  private readonly px = 54;
  private py = 190;
  private vy = 0;
  private thrusting = false;

  private zappers: Zapper[] = [];
  private coins: Coin[] = [];
  private zapTimer = 1.0;
  private coinTimer = 1.4;
  private distance = 0;
  private coinsCollected = 0;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
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
    this.py = 190;
    this.vy = 0;
    this.thrusting = false;
    this.zappers = [];
    this.coins = [];
    this.zapTimer = 0.9;
    this.coinTimer = 1.2;
    this.distance = 0;
    this.coinsCollected = 0;
    this.score = 0;
    this.gameOver = false;
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

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    // Jetpack thrust vs gravity
    this.thrusting = input.a || input.up;
    this.vy += (this.thrusting ? -640 : 540) * dt;
    this.vy = Math.max(-230, Math.min(250, this.vy));
    this.py += this.vy * dt;

    if (this.py < 18) { this.py = 18; this.vy = 0; }
    if (this.py > 202) { this.py = 202; this.vy = 0; }

    const spd = Math.min(260, 140 + this.distance / 40);
    const dx = spd * dt;
    this.distance += dx;
    this.score = Math.floor(this.distance / 10) + this.coinsCollected * 25;
    if (this.score > this.highScore) this.highScore = this.score;

    // Spawn Laser Zappers
    this.zapTimer -= dt;
    if (this.zapTimer <= 0) {
      this.zapTimer = Math.max(0.85, 1.65 - this.distance / 6000);
      const horiz = Math.random() > 0.5;
      const w = horiz ? 54 : 10;
      const h = horiz ? 10 : 54;
      this.zappers.push({
        id: this.nextId++,
        x: ARENA_W + 20,
        y: 26 + Math.random() * (ARENA_H - 64 - h),
        w,
        h,
      });
    }

    // Spawn Coin Arcs
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.coinTimer = 2.0;
      const baseY = 48 + Math.random() * 120;
      for (let i = 0; i < 4; i++) {
        this.coins.push({ id: this.nextId++, x: ARENA_W + 20 + i * 18, y: baseY });
      }
    }

    // Update Zappers
    for (let i = this.zappers.length - 1; i >= 0; i--) {
      const z = this.zappers[i];
      z.x -= dx;
      if (z.x + z.w < -20) {
        this.zappers.splice(i, 1);
        continue;
      }
      if (this.px + 12 > z.x && this.px + 2 < z.x + z.w && this.py + 16 > z.y && this.py + 2 < z.y + z.h) {
        this.gameOver = true;
        this.lastA = input.a;
        return 'gameover';
      }
    }

    // Update Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.x -= dx;
      if (c.x < -16) {
        this.coins.splice(i, 1);
        continue;
      }
      if (Math.hypot(this.px + 7 - c.x, this.py + 9 - c.y) < 14) {
        this.coins.splice(i, 1);
        this.coinsCollected++;
        sound = 'score';
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
      level: Math.floor(this.distance / 500) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'ZAPPED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO FLY AGAIN'
        : `COINS: ${this.coinsCollected} • HOLD [A]/[▲]: JETPACK BOOST`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ceiling & Floor */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 14, backgroundColor: pixelColor, opacity: 0.25 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, backgroundColor: pixelColor, opacity: 0.25 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 2, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, height: 2, backgroundColor: pixelColor }} />

        {/* Coins */}
        {this.coins.map((c) => (
          <View key={c.id} style={{ position: 'absolute', left: c.x - 4, top: c.y - 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: pixelColor }} />
        ))}

        {/* Laser Zappers */}
        {this.zappers.map((z) => (
          <View
            key={z.id}
            style={{
              position: 'absolute',
              left: z.x,
              top: z.y,
              width: z.w,
              height: z.h,
              backgroundColor: pixelColor,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: bg,
            }}
          />
        ))}

        {/* Jetpack Runner */}
        <View style={{ position: 'absolute', left: this.px, top: this.py, width: 14, height: 18 }}>
          {/* Jetpack */}
          <View style={{ position: 'absolute', left: 0, top: 5, width: 5, height: 9, backgroundColor: pixelColor }} />
          {/* Flame */}
          {this.thrusting && (
            <View style={{ position: 'absolute', left: 0, top: 14, width: 5, height: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: pixelColor, opacity: 0.65 }} />
          )}
          {/* Head & Body */}
          <View style={{ position: 'absolute', left: 5, top: 0, width: 8, height: 7, borderRadius: 3.5, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', left: 5, top: 7, width: 8, height: 10, borderRadius: 2, backgroundColor: pixelColor }} />
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>JETPACK DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DODGE LASERS • COLLECT COINS</Text>
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
