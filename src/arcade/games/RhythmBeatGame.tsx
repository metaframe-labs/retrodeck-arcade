import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_H = 240;
const HIT_LINE_Y = 194;
const LANE_XS = [64, 128, 192, 256];
const LANE_ARROWS = ['◀', '▲', '▼', '▶'];

interface Note {
  id: number;
  lane: 0 | 1 | 2 | 3; // 0:L, 1:U, 2:D, 3:R
  y: number;
}

export class RhythmBeatGame implements ArcadeGameInstance {
  private notes: Note[] = [];
  private spawnTimer = 0.6;
  private speed = 115;
  private combo = 0;
  private maxCombo = 0;
  private feedback = '';
  private feedbackTimer = 0;

  private score = 0;
  private highScore = 0;
  private lives = 5;
  private elapsed = 0;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;

  private lastLeft = false;
  private lastUp = false;
  private lastDown = false;
  private lastRight = false;
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
    this.notes = [];
    this.spawnTimer = 0.5;
    this.speed = 115;
    this.combo = 0;
    this.maxCombo = 0;
    this.feedback = '';
    this.feedbackTimer = 0;
    this.score = 0;
    this.lives = 5;
    this.elapsed = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  private tryHitLane(lane: 0 | 1 | 2 | 3): ArcadeSound {
    let bestIdx = -1;
    let bestDist = 999;

    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.lane === lane) {
        const d = Math.abs(n.y - HIT_LINE_Y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }

    if (bestIdx !== -1 && bestDist <= 28) {
      this.notes.splice(bestIdx, 1);
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const isPerfect = bestDist <= 12;
      this.score += (isPerfect ? 100 : 50) + this.combo * 10;
      if (this.score > this.highScore) this.highScore = this.score;
      this.feedback = isPerfect ? `PERFECT! x${this.combo}` : `GOOD! x${this.combo}`;
      this.feedbackTimer = 0.45;
      return isPerfect ? 'score' : 'hit';
    } else {
      this.combo = 0;
      this.feedback = 'MISS!';
      this.feedbackTimer = 0.35;
      return 'die';
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    this.elapsed += dt;
    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0) this.feedback = '';
    }

    // Check D-Pad hits
    if (input.left && !this.lastLeft) sound = this.tryHitLane(0);
    if (input.up && !this.lastUp) sound = this.tryHitLane(1);
    if (input.down && !this.lastDown) sound = this.tryHitLane(2);
    if (input.right && !this.lastRight) sound = this.tryHitLane(3);

    // Spawn rhythm notes
    this.speed = Math.min(220, 115 + this.elapsed * 1.8);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.32, 0.72 - this.elapsed * 0.006);
      this.notes.push({
        id: this.nextId++,
        lane: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
        y: -14,
      });
    }

    // Move notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.y += this.speed * dt;
      if (n.y > ARENA_H + 10) {
        this.notes.splice(i, 1);
        this.combo = 0;
        this.lives--;
        this.feedback = 'MISSED NOTE!';
        this.feedbackTimer = 0.4;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
        sound = 'die';
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: Math.floor(this.elapsed / 15) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OFF THE BEAT!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `COMBO x${this.combo} • MAX x${this.maxCombo} • TAP ARROWS ON LINE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* 4 Lane Guides */}
        {LANE_XS.map((lx, i) => (
          <React.Fragment key={`lane-${i}`}>
            <View style={{ position: 'absolute', left: lx, top: 0, bottom: 0, width: 1, backgroundColor: pixelColor, opacity: 0.2 }} />
            {/* Target Receptor Box */}
            <View
              style={{
                position: 'absolute',
                left: lx - 16,
                top: HIT_LINE_Y - 16,
                width: 32,
                height: 32,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: pixelColor,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '900', color: pixelColor, opacity: 0.45 }}>
                {LANE_ARROWS[i]}
              </Text>
            </View>
          </React.Fragment>
        ))}

        {/* Hit Line */}
        <View style={{ position: 'absolute', left: 32, right: 32, top: HIT_LINE_Y, height: 1.5, backgroundColor: pixelColor, opacity: 0.35 }} />

        {/* Falling Notes */}
        {this.notes.map((n) => (
          <View
            key={n.id}
            style={{
              position: 'absolute',
              left: LANE_XS[n.lane] - 14,
              top: n.y - 14,
              width: 28,
              height: 28,
              borderRadius: 5,
              backgroundColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: bg }}>
              {LANE_ARROWS[n.lane]}
            </Text>
          </View>
        ))}

        {/* Feedback */}
        {this.feedback !== '' && (
          <Text style={[styles.feedbackTxt, { color: pixelColor }]}>{this.feedback}</Text>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RHYTHM BEAT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>HIT D-PAD ARROWS ON THE BEAT</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO JAM</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  feedbackTxt: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
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
