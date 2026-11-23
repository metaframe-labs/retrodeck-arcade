import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const WATER_Y = 56;

interface Fish {
  id: number;
  x: number;
  y: number;
  vx: number;
  size: 'small' | 'big' | 'chest';
  points: number;
}

export class RetroFishingGame implements ArcadeGameInstance {
  private boatX = ARENA_W / 2;
  private hookY = WATER_Y + 8;
  private hookState: 'idle' | 'dropping' | 'reeling' = 'idle';
  private caughtFish: Fish | null = null;

  private fishes: Fish[] = [];
  private timeLeft = 60;
  private fishCaught = 0;

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
    this.boatX = ARENA_W / 2;
    this.hookY = WATER_Y + 8;
    this.hookState = 'idle';
    this.caughtFish = null;
    this.timeLeft = 60;
    this.fishCaught = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.fishes = [];
    for (let i = 0; i < 8; i++) this.spawnFish();
  }

  private spawnFish(): void {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const r = Math.random();
    const size: 'small' | 'big' | 'chest' = r < 0.14 ? 'chest' : r < 0.5 ? 'big' : 'small';
    const y = size === 'chest' ? 205 + Math.random() * 18 : WATER_Y + 26 + Math.random() * 135;
    const spd = size === 'chest' ? 18 : size === 'big' ? 35 + Math.random() * 25 : 55 + Math.random() * 35;

    this.fishes.push({
      id: this.nextId++,
      x: dir > 0 ? -20 : ARENA_W + 20,
      y,
      vx: dir * spd,
      size,
      points: size === 'chest' ? 250 : size === 'big' ? 100 : 40,
    });
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

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.lastA = input.a;
      return 'gameover';
    }

    // Move boat only when hook is idle
    if (this.hookState === 'idle') {
      if (input.left) this.boatX = Math.max(24, this.boatX - 135 * dt);
      if (input.right) this.boatX = Math.min(ARENA_W - 24, this.boatX + 135 * dt);

      if ((input.a && !this.lastA) || input.down) {
        this.hookState = 'dropping';
        sound = 'hit';
      }
    } else if (this.hookState === 'dropping') {
      this.hookY += 155 * dt;
      if (this.hookY >= ARENA_H - 12 || (input.a && !this.lastA) || input.up) {
        this.hookState = 'reeling';
      }
    } else if (this.hookState === 'reeling') {
      const reelSpd = this.caughtFish?.size === 'chest' ? 95 : this.caughtFish?.size === 'big' ? 130 : 175;
      this.hookY -= reelSpd * dt;
      if (this.hookY <= WATER_Y + 8) {
        this.hookY = WATER_Y + 8;
        this.hookState = 'idle';
        if (this.caughtFish) {
          this.score += this.caughtFish.points;
          this.fishCaught++;
          if (this.score > this.highScore) this.highScore = this.score;
          this.caughtFish = null;
          sound = 'score';
          this.spawnFish();
        }
      }
    }

    // Update swimming fish
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const f = this.fishes[i];
      f.x += f.vx * dt;
      if ((f.vx > 0 && f.x > ARENA_W + 30) || (f.vx < 0 && f.x < -30)) {
        this.fishes.splice(i, 1);
        this.spawnFish();
        continue;
      }

      // Hook catches fish while dropping or reeling (if empty)
      if (!this.caughtFish && this.hookState !== 'idle') {
        if (Math.hypot(this.boatX - f.x, this.hookY - f.y) < 14) {
          this.caughtFish = f;
          this.fishes.splice(i, 1);
          this.hookState = 'reeling';
          sound = 'powerup';
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
      level: this.fishCaught,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'FISHING DONE!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO CAST AGAIN'
        : `TIME: ${Math.ceil(this.timeLeft)}s • ◀/▶: BOAT • [A]: CAST LINE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Timer HUD */}
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          TIME: {Math.ceil(this.timeLeft)}s   •   CAUGHT: {this.fishCaught}
        </Text>

        {/* Water Surface */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: WATER_Y, height: 2, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: WATER_Y + 2, bottom: 0, backgroundColor: isLight ? 'rgba(23,38,22,0.08)' : 'rgba(255,255,255,0.06)' }} />

        {/* Fishing Boat */}
        <View style={{ position: 'absolute', left: this.boatX - 18, top: WATER_Y - 14, width: 36, height: 14, alignItems: 'center' }}>
          {/* Fisherman */}
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
          {/* Hull */}
          <View style={{ width: 34, height: 8, backgroundColor: pixelColor, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
        </View>

        {/* Fishing Line & Hook */}
        <View
          style={{
            position: 'absolute',
            left: this.boatX - 0.5,
            top: WATER_Y - 4,
            width: 1.5,
            height: Math.max(0, this.hookY - (WATER_Y - 4)),
            backgroundColor: pixelColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: this.boatX - 3,
            top: this.hookY - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            borderWidth: 2,
            borderColor: pixelColor,
          }}
        />

        {/* Caught Fish on Hook */}
        {this.caughtFish && (
          <View
            style={{
              position: 'absolute',
              left: this.boatX - 8,
              top: this.hookY,
              width: 16,
              height: 10,
              borderRadius: 4,
              backgroundColor: pixelColor,
            }}
          />
        )}

        {/* Swimming Fish & Chests */}
        {this.fishes.map((f) => {
          if (f.size === 'chest') {
            return (
              <View
                key={f.id}
                style={{
                  position: 'absolute',
                  left: f.x - 10,
                  top: f.y - 7,
                  width: 20,
                  height: 14,
                  borderWidth: 2,
                  borderColor: pixelColor,
                  backgroundColor: bg,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '900', color: pixelColor }}>$</Text>
              </View>
            );
          }
          const w = f.size === 'big' ? 22 : 14;
          const h = f.size === 'big' ? 11 : 7;
          return (
            <View
              key={f.id}
              style={{
                position: 'absolute',
                left: f.x - w / 2,
                top: f.y - h / 2,
                width: w,
                height: h,
                borderRadius: h / 2,
                backgroundColor: pixelColor,
                justifyContent: 'center',
                alignItems: f.vx > 0 ? 'flex-end' : 'flex-start',
                paddingHorizontal: 3,
              }}
            >
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
            </View>
          );
        })}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RETRO FISHING</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CATCH FISH & TREASURE CHESTS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO CAST</Text>
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
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
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
