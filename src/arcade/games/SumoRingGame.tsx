import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const CX = 160;
const CY = 132;
const RING_R = 84;
const WRESTLER_R = 15;

export class SumoRingGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private px = CX - 34;
  private py = CY;
  private pvx = 0;
  private pvy = 0;
  private dashCd = 0;
  private prevA = false;

  private ex = CX + 34;
  private ey = CY;
  private evx = 0;
  private evy = 0;
  private aiDashTimer = 1.4;

  private roundDelay = 0;
  private banner = 'HAKKEYOI! PUSH CPU OUT!';

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
    this.setupBout();
  }

  private setupBout() {
    this.px = CX - 34;
    this.py = CY;
    this.pvx = 0;
    this.pvy = 0;
    this.ex = CX + 34;
    this.ey = CY;
    this.evx = 0;
    this.evy = 0;
    this.dashCd = 0;
    this.aiDashTimer = 1.3;
    this.prevA = false;
    this.roundDelay = 0;
    this.banner = `BOUT #${this.level} — SHOVE!`;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (this.roundDelay > 0) {
      this.roundDelay -= dt;
      if (this.roundDelay <= 0) this.setupBout();
      return null;
    }

    let sound: ArcadeSound | null = null;
    if (this.dashCd > 0) this.dashCd -= dt;

    let ax = 0;
    let ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    const alen = Math.hypot(ax, ay);
    if (alen > 0) {
      ax /= alen;
      ay /= alen;
    }

    this.pvx += ax * 360 * dt;
    this.pvy += ay * 360 * dt;

    const dash = input.a && !this.prevA;
    this.prevA = input.a;
    if (dash && this.dashCd <= 0) {
      const dx = alen > 0 ? ax : (this.ex - this.px) / Math.max(1, Math.hypot(this.ex - this.px, this.ey - this.py));
      const dy = alen > 0 ? ay : (this.ey - this.py) / Math.max(1, Math.hypot(this.ex - this.px, this.ey - this.py));
      this.pvx += dx * 210;
      this.pvy += dy * 210;
      this.dashCd = 0.65;
      sound = 'shoot';
    }

    // AI steering toward player while avoiding ring edge
    const toPx = this.px - this.ex;
    const toPy = this.py - this.ey;
    const distToP = Math.max(1, Math.hypot(toPx, toPy));
    const aiForce = 240 + this.level * 22;
    this.evx += (toPx / distToP) * aiForce * dt;
    this.evy += (toPy / distToP) * aiForce * dt;

    this.aiDashTimer -= dt;
    if (this.aiDashTimer <= 0 && distToP < 70) {
      this.evx += (toPx / distToP) * (145 + this.level * 12);
      this.evy += (toPy / distToP) * (145 + this.level * 12);
      this.aiDashTimer = Math.max(0.85, 1.8 - this.level * 0.12);
    }

    // Friction
    this.pvx *= Math.pow(0.08, dt);
    this.pvy *= Math.pow(0.08, dt);
    this.evx *= Math.pow(0.08, dt);
    this.evy *= Math.pow(0.08, dt);

    this.px += this.pvx * dt;
    this.py += this.pvy * dt;
    this.ex += this.evx * dt;
    this.ey += this.evy * dt;

    // Sumo body collision
    const dx = this.ex - this.px;
    const dy = this.ey - this.py;
    const dist = Math.hypot(dx, dy);
    const minDist = WRESTLER_R * 2;
    if (dist < minDist && dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) * 0.52;
      this.px -= nx * overlap;
      this.py -= ny * overlap;
      this.ex += nx * overlap;
      this.ey += ny * overlap;

      const relVx = this.pvx - this.evx;
      const relVy = this.pvy - this.evy;
      const impact = relVx * nx + relVy * ny;
      if (impact > 0) {
        this.evx += nx * impact * 1.15;
        this.evy += ny * impact * 1.15;
        this.pvx -= nx * impact * 0.65;
        this.pvy -= ny * impact * 0.65;
        sound = 'hit';
      }
    }

    // Ring-out checks
    const eOut = Math.hypot(this.ex - CX, this.ey - CY) > RING_R + 4;
    const pOut = Math.hypot(this.px - CX, this.py - CY) > RING_R + 4;

    if (eOut) {
      this.score += 200 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.banner = 'RING OUT! YOU WIN!';
      this.roundDelay = 1.1;
      return 'levelclear';
    } else if (pOut) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      this.banner = 'PUSHED OUT! REMATCH!';
      this.roundDelay = 1.1;
      return 'die';
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'DEFEATED!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>SUMO LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>HP:{this.lives}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Dohyo Ring */}
        <View
          style={[
            styles.ring,
            {
              left: CX - RING_R,
              top: CY - RING_R,
              width: RING_R * 2,
              height: RING_R * 2,
              borderRadius: RING_R,
              borderColor: fg,
            },
          ]}
        />

        {/* Player Rikishi */}
        <View
          style={[
            styles.wrestler,
            {
              left: this.px - WRESTLER_R,
              top: this.py - WRESTLER_R,
              width: WRESTLER_R * 2,
              height: WRESTLER_R * 2,
              borderRadius: WRESTLER_R,
              borderColor: fg,
              backgroundColor: fg,
            },
          ]}
        >
          <Text style={[styles.wTxt, { color: bg }]}>YOU</Text>
        </View>

        {/* Enemy Rikishi */}
        <View
          style={[
            styles.wrestler,
            {
              left: this.ex - WRESTLER_R,
              top: this.ey - WRESTLER_R,
              width: WRESTLER_R * 2,
              height: WRESTLER_R * 2,
              borderRadius: WRESTLER_R,
              borderColor: fg,
              backgroundColor: bg,
            },
          ]}
        >
          <Text style={[styles.wTxt, { color: fg }]}>CPU</Text>
        </View>

        <Text style={[styles.banner, { color: fg }]}>{this.banner}</Text>
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
    paddingHorizontal: 10,
  },
  hdrText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3.5,
  },
  wrestler: {
    position: 'absolute',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  banner: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
