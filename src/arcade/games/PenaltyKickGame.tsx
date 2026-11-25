import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const GOAL_LEFT = 54;
const GOAL_W = 212;
const GOAL_TOP = 38;
const GOAL_H = 74;

export class PenaltyKickGame implements ArcadeGameInstance {
  private aimX = ARENA_W / 2;
  private aimDir = 1;
  private aimSpeed = 195;

  private ballX = ARENA_W / 2;
  private ballY = 196;
  private ballScale = 1;
  private targetX = ARENA_W / 2;
  private targetY = 66;

  private keeperX = ARENA_W / 2;
  private keeperTargetX = ARENA_W / 2;

  private phase: 'aim' | 'flight' | 'result' = 'aim';
  private phaseTimer = 0;
  private banner = '';

  private goals = 0;
  private misses = 0;
  private streak = 0;
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
    this.goals = 0;
    this.misses = 0;
    this.streak = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.resetKick();
  }

  private resetKick(): void {
    this.aimX = ARENA_W / 2;
    this.aimDir = 1;
    this.aimSpeed = Math.min(340, 185 + this.goals * 16);
    this.ballX = ARENA_W / 2;
    this.ballY = 196;
    this.ballScale = 1;
    this.keeperX = ARENA_W / 2;
    this.keeperTargetX = ARENA_W / 2;
    this.phase = 'aim';
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

    if (this.phase === 'aim') {
      // Oscillating target cursor across goal mouth (or slight manual nudge)
      this.aimX += this.aimDir * this.aimSpeed * dt;
      if (this.aimX <= GOAL_LEFT + 14) {
        this.aimX = GOAL_LEFT + 14;
        this.aimDir = 1;
      } else if (this.aimX >= GOAL_LEFT + GOAL_W - 14) {
        this.aimX = GOAL_LEFT + GOAL_W - 14;
        this.aimDir = -1;
      }

      if (input.a && !this.lastA) {
        this.targetX = this.aimX;
        this.targetY = GOAL_TOP + 22 + Math.random() * 28;
        // Keeper dives to left, center, or right
        const diveSpots = [GOAL_LEFT + 34, ARENA_W / 2, GOAL_LEFT + GOAL_W - 34];
        this.keeperTargetX = diveSpots[Math.floor(Math.random() * diveSpots.length)];
        this.phase = 'flight';
        this.phaseTimer = 0;
        sound = 'shoot';
      }
    } else if (this.phase === 'flight') {
      this.phaseTimer += dt * 2.4;
      const t = Math.min(1, this.phaseTimer);
      this.ballX = ARENA_W / 2 + (this.targetX - ARENA_W / 2) * t;
      this.ballY = 196 + (this.targetY - 196) * t - Math.sin(t * Math.PI) * 28;
      this.ballScale = 1 - t * 0.35;
      this.keeperX += (this.keeperTargetX - this.keeperX) * Math.min(1, dt * 11);

      if (t >= 1) {
        this.phase = 'result';
        this.phaseTimer = 1.1;
        const saved = Math.abs(this.targetX - this.keeperTargetX) < 32;
        if (saved) {
          this.misses++;
          this.streak = 0;
          this.banner = 'SAVED BY KEEPER!';
          sound = 'die';
          if (this.misses >= 3) {
            this.gameOver = true;
            sound = 'gameover';
          }
        } else {
          this.goals++;
          this.streak++;
          this.score += 100 + this.streak * 25;
          if (this.score > this.highScore) this.highScore = this.score;
          this.banner = this.streak >= 3 ? `GOAL! STREAK x${this.streak}` : 'GOOOAL!';
          sound = 'score';
        }
      }
    } else if (this.phase === 'result') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0 && !this.gameOver) {
        this.resetKick();
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, 3 - this.misses),
      level: this.goals + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'SHOOTOUT OVER' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `GOALS: ${this.goals} • PRESS [A] AT RIGHT MOMENT TO SHOOT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Pitch Horizon & Penalty Box */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: GOAL_TOP + GOAL_H, height: 2, backgroundColor: pixelColor }} />
        <View style={{ position: 'absolute', left: 30, right: 30, top: GOAL_TOP + GOAL_H, height: 60, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: pixelColor, opacity: 0.45 }} />

        {/* Goal Frame */}
        <View
          style={{
            position: 'absolute',
            left: GOAL_LEFT,
            top: GOAL_TOP,
            width: GOAL_W,
            height: GOAL_H,
            borderTopWidth: 4,
            borderLeftWidth: 4,
            borderRightWidth: 4,
            borderColor: pixelColor,
          }}
        />

        {/* Goalkeeper */}
        <View
          style={{
            position: 'absolute',
            left: this.keeperX - 18,
            top: GOAL_TOP + GOAL_H - 36,
            width: 36,
            height: 36,
            alignItems: 'center',
          }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pixelColor }} />
          {/* Outstretched Gloves */}
          <View style={{ width: 34, height: 6, borderRadius: 2, backgroundColor: pixelColor, marginTop: 2 }} />
          {/* Torso */}
          <View style={{ width: 14, height: 12, backgroundColor: pixelColor }} />
          {/* Legs */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <View style={{ width: 4, height: 7, backgroundColor: pixelColor }} />
            <View style={{ width: 4, height: 7, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* Aim Crosshair */}
        {this.phase === 'aim' && !this.isMenu && (
          <View
            style={{
              position: 'absolute',
              left: this.aimX - 8,
              top: GOAL_TOP + 26,
              width: 16,
              height: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: pixelColor }} />
          </View>
        )}

        {/* Soccer Ball (Iconic Retro Telstar / Cross & Dots Pattern) */}
        <View
          style={{
            position: 'absolute',
            left: this.ballX - 10,
            top: this.ballY - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: pixelColor,
            backgroundColor: bg,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: this.ballScale }],
          }}
        >
          {/* Center pentagon patch */}
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              backgroundColor: pixelColor,
            }}
          />
          {/* Seam spoke lines radiating outward to edges */}
          <View style={{ position: 'absolute', top: 1, width: 2, height: 4, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', bottom: 1, width: 2, height: 4, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', left: 1, height: 2, width: 4, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', right: 1, height: 2, width: 4, backgroundColor: pixelColor }} />
          {/* 4 outer triangular edge patches */}
          <View style={{ position: 'absolute', top: 3, left: 3, width: 3, height: 3, borderRadius: 1, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, borderRadius: 1, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', bottom: 3, left: 3, width: 3, height: 3, borderRadius: 1, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', bottom: 3, right: 3, width: 3, height: 3, borderRadius: 1, backgroundColor: pixelColor }} />
        </View>

        {/* Result Banner */}
        {this.banner !== '' && (
          <View style={{ position: 'absolute', top: 132, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: pixelColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: bg, letterSpacing: 1 }}>{this.banner}</Text>
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PENALTY KICK DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>FOOL THE GOALKEEPER</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO KICKOFF</Text>
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
