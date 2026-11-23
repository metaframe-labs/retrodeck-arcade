import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const TOP_Y = 26;
const BOT_Y = 214;

interface Spike {
  id: number;
  x: number;
  onTop: boolean;
  w: number;
  h: number;
}

export class GravityFlipGame implements ArcadeGameInstance {
  private readonly px = 64;
  private py = BOT_Y - 16;
  private vy = 0;
  private gravDir = 1; // 1 = floor, -1 = ceiling
  private grounded = true;

  private spikes: Spike[] = [];
  private spawnTimer = 0.8;
  private distance = 0;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
  private lastA = false;
  private lastUp = false;

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
    this.py = BOT_Y - 16;
    this.vy = 0;
    this.gravDir = 1;
    this.grounded = true;
    this.spikes = [];
    this.spawnTimer = 0.7;
    this.distance = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;
    const flip = (input.a && !this.lastA) || (input.up && !this.lastUp);

    if (this.isMenu) {
      if (flip) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    // Flip gravity only when grounded on floor or ceiling
    if (flip && this.grounded) {
      this.gravDir = -this.gravDir;
      this.grounded = false;
      this.vy = this.gravDir * 240;
      sound = 'hit';
    }

    this.vy += this.gravDir * 1150 * dt;
    this.py += this.vy * dt;

    if (this.py >= BOT_Y - 16) {
      this.py = BOT_Y - 16;
      this.vy = 0;
      this.grounded = true;
    } else if (this.py <= TOP_Y) {
      this.py = TOP_Y;
      this.vy = 0;
      this.grounded = true;
    }

    const spd = Math.min(285, 155 + this.distance / 32);
    const dx = spd * dt;
    this.distance += dx;
    this.score = Math.floor(this.distance / 10);
    if (this.score > this.highScore) this.highScore = this.score;

    // Spawn floor/ceiling spikes
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.45, 0.95 - this.distance / 7500);
      this.spikes.push({
        id: this.nextId++,
        x: ARENA_W + 20,
        onTop: Math.random() > 0.5,
        w: 16 + Math.floor(Math.random() * 14),
        h: 22 + Math.floor(Math.random() * 20),
      });
    }

    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.x -= dx;
      if (s.x + s.w < -20) {
        this.spikes.splice(i, 1);
        continue;
      }

      const sy = s.onTop ? TOP_Y : BOT_Y - s.h;
      if (this.px + 13 > s.x + 2 && this.px + 2 < s.x + s.w - 2 && this.py + 14 > sy + 2 && this.py + 2 < sy + s.h - 2) {
        this.gameOver = true;
        this.lastA = input.a;
        this.lastUp = input.up;
        return 'gameover';
      }
    }

    this.lastA = input.a;
    this.lastUp = input.up;
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
      message: this.gameOver ? 'SPIKED!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'PRESS [A] OR [▲]: FLIP GRAVITY',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top & Bottom Tracks */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: TOP_Y, backgroundColor: pixelColor, opacity: 0.2 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: TOP_Y, height: 2, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: BOT_Y, bottom: 0, backgroundColor: pixelColor, opacity: 0.2 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: BOT_Y, height: 2, backgroundColor: pixelColor }} />

        {/* Spikes */}
        {this.spikes.map((s) => (
          <View
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.onTop ? TOP_Y : BOT_Y - s.h,
              width: s.w,
              height: s.h,
              backgroundColor: pixelColor,
              borderRadius: 2,
            }}
          />
        ))}

        {/* Gravity Runner */}
        <View
          style={{
            position: 'absolute',
            left: this.px,
            top: this.py,
            width: 16,
            height: 16,
            backgroundColor: pixelColor,
            borderRadius: 3,
            transform: [{ scaleY: this.gravDir }],
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: 3,
          }}
        >
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: bg }} />
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>GRAVITY FLIP</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>INVERT GRAVITY TO DODGE SPIKES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RUN</Text>
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
