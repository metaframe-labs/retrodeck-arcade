import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

export class ArcheryGame implements ArcadeGameInstance {
  private targetX = ARENA_W / 2;
  private targetY = 114;
  private aimX = ARENA_W / 2;
  private aimY = 114;
  private aimDirX = 1;
  private aimDirY = 1;
  private phase: 'aimX' | 'aimY' | 'result' = 'aimX';
  private phaseTimer = 0;

  private arrowsLeft = 10;
  private lastHitPts = 0;
  private banner = '';
  private hitMarks: { x: number; y: number }[] = [];

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
    this.arrowsLeft = 10;
    this.score = 0;
    this.hitMarks = [];
    this.gameOver = false;
    this.isMenu = true;
    this.setupShot();
  }

  private setupShot(): void {
    this.targetX = 110 + Math.random() * 100;
    this.targetY = 88 + Math.random() * 64;
    this.aimX = this.targetX - 60;
    this.aimY = this.targetY - 50;
    this.aimDirX = 1;
    this.aimDirY = 1;
    this.phase = 'aimX';
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

    const spd = 165 + (10 - this.arrowsLeft) * 14;

    if (this.phase === 'aimX') {
      this.aimX += this.aimDirX * spd * dt;
      if (this.aimX <= this.targetX - 66) { this.aimX = this.targetX - 66; this.aimDirX = 1; }
      if (this.aimX >= this.targetX + 66) { this.aimX = this.targetX + 66; this.aimDirX = -1; }
      if (input.a && !this.lastA) {
        this.phase = 'aimY';
        sound = 'hit';
      }
    } else if (this.phase === 'aimY') {
      this.aimY += this.aimDirY * spd * dt;
      if (this.aimY <= this.targetY - 66) { this.aimY = this.targetY - 66; this.aimDirY = 1; }
      if (this.aimY >= this.targetY + 66) { this.aimY = this.targetY + 66; this.aimDirY = -1; }
      if (input.a && !this.lastA) {
        const d = Math.hypot(this.aimX - this.targetX, this.aimY - this.targetY);
        this.hitMarks.push({ x: this.aimX, y: this.aimY });
        this.arrowsLeft--;

        if (d <= 10) {
          this.lastHitPts = 100;
          this.banner = 'BULLSEYE! +100';
          sound = 'levelclear';
        } else if (d <= 24) {
          this.lastHitPts = 60;
          this.banner = 'INNER RING! +60';
          sound = 'score';
        } else if (d <= 42) {
          this.lastHitPts = 30;
          this.banner = 'OUTER RING +30';
          sound = 'hit';
        } else {
          this.lastHitPts = 0;
          this.banner = 'MISSED TARGET!';
          sound = 'die';
        }
        this.score += this.lastHitPts;
        if (this.score > this.highScore) this.highScore = this.score;
        this.phase = 'result';
        this.phaseTimer = 1.0;
      }
    } else if (this.phase === 'result') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.arrowsLeft <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        this.hitMarks = [];
        this.setupShot();
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.arrowsLeft,
      level: 11 - this.arrowsLeft,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? `FINAL: ${this.score} PTS` : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO SHOOT AGAIN'
        : this.phase === 'aimX'
        ? `ARROWS: ${this.arrowsLeft} • [A]: LOCK HORIZONTAL`
        : `ARROWS: ${this.arrowsLeft} • [A]: LOCK VERTICAL & RELEASE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          ARROWS LEFT: {this.arrowsLeft}
        </Text>

        {/* Concentric Target Rings */}
        {[42, 26, 10].map((r, idx) => (
          <View
            key={`rg-${idx}`}
            style={{
              position: 'absolute',
              left: this.targetX - r,
              top: this.targetY - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: idx === 2 ? pixelColor : 'transparent',
            }}
          />
        ))}

        {/* Horizontal & Vertical Aim Guides */}
        {!this.isMenu && this.phase !== 'result' && (
          <>
            <View style={{ position: 'absolute', left: this.aimX - 0.5, top: 24, bottom: 20, width: 1.5, backgroundColor: pixelColor, opacity: 0.65 }} />
            {this.phase === 'aimY' && (
              <View style={{ position: 'absolute', left: 20, right: 20, top: this.aimY - 0.5, height: 1.5, backgroundColor: pixelColor, opacity: 0.65 }} />
            )}
          </>
        )}

        {/* Arrow Impact Dots */}
        {this.hitMarks.map((m, i) => (
          <View key={`hm-${i}`} style={{ position: 'absolute', left: m.x - 4, top: m.y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: pixelColor, borderWidth: 1.5, borderColor: bg }} />
        ))}

        {this.banner !== '' && (
          <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: pixelColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: bg }}>{this.banner}</Text>
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ARCHERY DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>LOCK X & Y FOR BULLSEYE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DRAW BOW</Text>
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
