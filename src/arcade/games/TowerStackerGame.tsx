import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const BLOCK_H = 14;

interface StackBlock {
  x: number;
  w: number;
  level: number;
}

export class TowerStackerGame implements ArcadeGameInstance {
  private stack: StackBlock[] = [];
  private currentX = 90;
  private currentW = 110;
  private currentDir = 1;
  private moveSpeed = 120;

  private score = 0;
  private highScore = 0;
  private perfectStreak = 0;
  private gameOver = false;
  private isMenu = true;
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
    this.stack = [{ x: 105, w: 110, level: 0 }];
    this.currentW = 110;
    this.currentX = 20;
    this.currentDir = 1;
    this.moveSpeed = 120;
    this.score = 0;
    this.perfectStreak = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;
    const dropPressed = (input.a && !this.lastA) || (input.up && !this.lastUp);

    if (this.isMenu) {
      if (dropPressed) {
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

    // Oscillate active block horizontally
    this.currentX += this.currentDir * this.moveSpeed * dt;
    if (this.currentX <= 16) {
      this.currentX = 16;
      this.currentDir = 1;
    } else if (this.currentX + this.currentW >= ARENA_W - 16) {
      this.currentX = ARENA_W - 16 - this.currentW;
      this.currentDir = -1;
    }

    // Drop block!
    if (dropPressed) {
      const top = this.stack[this.stack.length - 1];
      const overlapL = Math.max(this.currentX, top.x);
      const overlapR = Math.min(this.currentX + this.currentW, top.x + top.w);
      const overlapW = overlapR - overlapL;

      if (overlapW <= 3) {
        // Missed completely!
        this.gameOver = true;
        this.lastA = input.a;
        this.lastUp = input.up;
        return 'gameover';
      }

      // Snap perfect if within 4px
      const isPerfect = Math.abs(this.currentX - top.x) <= 4;
      const placedX = isPerfect ? top.x : overlapL;
      const placedW = isPerfect ? top.w : overlapW;

      this.stack.push({ x: placedX, w: placedW, level: top.level + 1 });

      if (isPerfect) {
        this.perfectStreak++;
        this.score += 100 + this.perfectStreak * 25;
        sound = 'powerup';
      } else {
        this.perfectStreak = 0;
        this.score += 50;
        sound = 'hit';
      }
      if (this.score > this.highScore) this.highScore = this.score;

      // Next block setup
      this.currentW = placedW;
      this.currentDir = this.stack.length % 2 === 0 ? 1 : -1;
      this.currentX = this.currentDir > 0 ? 18 : ARENA_W - 18 - this.currentW;
      this.moveSpeed = Math.min(285, 120 + this.stack.length * 9);
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
      level: this.stack.length,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'TOWER COLLAPSED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `FLOOR: ${this.stack.length - 1} • STREAK: ${this.perfectStreak} • [A]: DROP`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    const topLevel = this.stack.length - 1;
    const cameraOffset = Math.max(0, (topLevel - 9) * BLOCK_H);
    const baseScreenY = ARENA_H - 18;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Floor Counter */}
        <Text style={[styles.floorTxt, { color: pixelColor }]}>
          FLOOR {topLevel} {this.perfectStreak >= 2 ? `• PERFECT x${this.perfectStreak}` : ''}
        </Text>

        {/* Stacked Blocks */}
        {this.stack.map((b) => {
          const sy = baseScreenY - b.level * BLOCK_H + cameraOffset;
          if (sy > ARENA_H + 20 || sy < -20) return null;
          return (
            <View
              key={`sb-${b.level}`}
              style={{
                position: 'absolute',
                left: b.x,
                top: sy,
                width: b.w,
                height: BLOCK_H - 1,
                backgroundColor: pixelColor,
                borderWidth: 1,
                borderColor: bg,
                borderRadius: 1,
              }}
            />
          );
        })}

        {/* Active Moving Block */}
        {!this.gameOver && !this.isMenu && (
          <View
            style={{
              position: 'absolute',
              left: this.currentX,
              top: baseScreenY - (topLevel + 1) * BLOCK_H + cameraOffset,
              width: this.currentW,
              height: BLOCK_H - 1,
              backgroundColor: pixelColor,
              borderWidth: 1.5,
              borderColor: bg,
              borderRadius: 1,
            }}
          />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TOWER STACKER</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DROP BLOCKS WITH PRECISION</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO STACK</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  floorTxt: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
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
