import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const CX = 160;
const CY = 132;
const DIAL_R = 64;

export class LockpickVaultGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private angle = 0;
  private dir = 1;
  private speed = 2.4;
  private targetAngle = 1.4;
  private tolerance = 0.28;

  private pinsNeeded = 4;
  private pinsCracked = 0;
  private prevA = false;
  private feedback = 'PRESS A ON TARGET';
  private fbTimer = 0;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.setupVault();
  }

  private setupVault() {
    this.pinsNeeded = 3 + this.level;
    this.pinsCracked = 0;
    this.angle = -Math.PI / 2;
    this.dir = 1;
    this.speed = 2.2 + (this.level - 1) * 0.35;
    this.tolerance = Math.max(0.18, 0.3 - (this.level - 1) * 0.02);
    this.pickNewTarget();
    this.feedback = `VAULT ${this.level}: ${this.pinsNeeded} PINS`;
    this.fbTimer = 1.2;
    this.prevA = false;
  }

  private pickNewTarget() {
    // Place target at least 90 degrees away from current pointer
    this.targetAngle = this.normAngle(this.angle + this.dir * (1.6 + Math.random() * 2.8));
  }

  private normAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (this.fbTimer > 0) this.fbTimer -= dt;
    this.angle = this.normAngle(this.angle + this.dir * this.speed * dt);

    const press = input.a && !this.prevA;
    this.prevA = input.a;

    if (!press) return null;

    const diff = Math.abs(this.normAngle(this.angle - this.targetAngle));
    if (diff <= this.tolerance) {
      this.pinsCracked++;
      const perfect = diff < this.tolerance * 0.45;
      const pts = (perfect ? 100 : 60) * this.level;
      this.score += pts;
      if (this.score > this.highScore) this.highScore = this.score;

      if (this.pinsCracked >= this.pinsNeeded) {
        this.score += 200 * this.level;
        if (this.score > this.highScore) this.highScore = this.score;
        this.level++;
        this.setupVault();
        return 'levelclear';
      }

      this.dir *= -1;
      this.speed += 0.22;
      this.pickNewTarget();
      this.feedback = perfect ? `PERFECT! +${pts}` : `CLICK! +${pts}`;
      this.fbTimer = 0.8;
      return perfect ? 'powerup' : 'score';
    } else {
      this.lives--;
      this.feedback = 'PIN SNAPPED!';
      this.fbTimer = 0.8;
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      return 'hit';
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'LOCK JAMMED' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    const tx = CX + Math.cos(this.targetAngle) * DIAL_R;
    const ty = CY + Math.sin(this.targetAngle) * DIAL_R;
    const px = CX + Math.cos(this.angle) * (DIAL_R - 2);
    const py = CY + Math.sin(this.angle) * (DIAL_R - 2);
    const midX = CX + Math.cos(this.angle) * (DIAL_R * 0.5);
    const midY = CY + Math.sin(this.angle) * (DIAL_R * 0.5);

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>VAULT LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            PINS:{this.pinsCracked}/{this.pinsNeeded}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            PICKS:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Outer Dial Ring */}
        <View
          style={[
            styles.dialOuter,
            {
              left: CX - DIAL_R,
              top: CY - DIAL_R,
              width: DIAL_R * 2,
              height: DIAL_R * 2,
              borderRadius: DIAL_R,
              borderColor: fg,
            },
          ]}
        />

        {/* Target Notch */}
        <View
          style={[
            styles.targetNotch,
            {
              left: tx - 9,
              top: ty - 9,
              borderColor: fg,
              backgroundColor: bg,
            },
          ]}
        >
          <View style={[styles.targetDot, { backgroundColor: fg }]} />
        </View>

        {/* Pointer dots (center -> mid -> tip) */}
        <View style={[styles.centerHub, { left: CX - 18, top: CY - 18, borderColor: fg, backgroundColor: fg }]}>
          <Text style={[styles.hubTxt, { color: bg }]}>
            {this.pinsNeeded - this.pinsCracked}
          </Text>
        </View>
        <View style={[styles.ptrMid, { left: midX - 4, top: midY - 4, backgroundColor: fg }]} />
        <View style={[styles.ptrTip, { left: px - 6, top: py - 6, backgroundColor: fg }]} />

        {/* Feedback */}
        <Text style={[styles.fb, { color: fg }]}>{this.feedback}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderBottomWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hdrText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dialOuter: {
    position: 'absolute',
    borderWidth: 3,
  },
  targetNotch: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerHub: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTxt: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  ptrMid: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ptrTip: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fb: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
