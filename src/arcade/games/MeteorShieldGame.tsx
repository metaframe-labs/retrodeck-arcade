import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const CX = 160;
const CY = 128;
const CORE_R = 18;
const SHIELD_R = 36;
const SHIELD_HALF_ARC = 0.62; // radians (~35 deg each side = 70 deg shield)

interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
}

export class MeteorShieldGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private shieldAngle = -Math.PI / 2;
  private meteors: Meteor[] = [];
  private nextId = 1;
  private spawnTimer = 0.8;
  private pulseCharge = 0; // 0..100
  private pulseVisual = 0;
  private prevA = false;

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
    this.shieldAngle = -Math.PI / 2;
    this.meteors = [];
    this.spawnTimer = 0.7;
    this.pulseCharge = 0;
    this.pulseVisual = 0;
    this.prevA = false;
  }

  private normAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  private spawnMeteor() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 165;
    const speed = 46 + this.level * 7 + Math.random() * 18;
    this.meteors.push({
      id: this.nextId++,
      x: CX + Math.cos(angle) * dist,
      y: CY + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      r: 6 + (Math.random() < 0.3 ? 3 : 0),
      angle,
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;

    const rotSpeed = 4.2;
    if (input.left) this.shieldAngle = this.normAngle(this.shieldAngle - rotSpeed * dt);
    if (input.right) this.shieldAngle = this.normAngle(this.shieldAngle + rotSpeed * dt);
    if (input.up) {
      // quick nudge toward top
      const diff = this.normAngle(-Math.PI / 2 - this.shieldAngle);
      this.shieldAngle = this.normAngle(this.shieldAngle + Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed * dt));
    } else if (input.down) {
      const diff = this.normAngle(Math.PI / 2 - this.shieldAngle);
      this.shieldAngle = this.normAngle(this.shieldAngle + Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed * dt));
    }

    if (this.pulseVisual > 0) this.pulseVisual -= dt * 3;

    const firePulse = input.a && !this.prevA;
    this.prevA = input.a;
    if (firePulse && this.pulseCharge >= 100) {
      this.pulseCharge = 0;
      this.pulseVisual = 1;
      const cleared = this.meteors.length;
      this.meteors = [];
      this.score += cleared * 25;
      if (this.score > this.highScore) this.highScore = this.score;
      sound = 'bomb';
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.meteors.length < 12) {
      this.spawnMeteor();
      this.spawnTimer = Math.max(0.35, 1.15 - this.level * 0.09);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      const dist = Math.hypot(m.x - CX, m.y - CY);
      if (dist <= SHIELD_R + m.r && dist >= CORE_R + 4) {
        const mAng = Math.atan2(m.y - CY, m.x - CX);
        const diff = Math.abs(this.normAngle(mAng - this.shieldAngle));
        if (diff <= SHIELD_HALF_ARC) {
          this.meteors.splice(i, 1);
          this.score += 20;
          this.pulseCharge = Math.min(100, this.pulseCharge + 15);
          if (this.score > this.highScore) this.highScore = this.score;
          this.level = 1 + Math.floor(this.score / 200);
          sound = 'score';
          continue;
        }
      }

      if (dist <= CORE_R + m.r * 0.5) {
        this.meteors.splice(i, 1);
        this.lives--;
        sound = 'explode';
        if (this.lives <= 0) {
          this.gameOver = true;
          return 'gameover';
        }
      }
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
      message: this.gameOver ? 'CORE BREACHED' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    // 7 nodes forming the curved shield arc
    const shieldNodes = [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54];

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>METEOR SHIELD</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            EMP:{this.pulseCharge >= 100 ? 'RDY!' : `${this.pulseCharge}%`}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Orbit guide ring */}
        <View
          style={[
            styles.orbitRing,
            {
              left: CX - SHIELD_R,
              top: CY - SHIELD_R,
              width: SHIELD_R * 2,
              height: SHIELD_R * 2,
              borderRadius: SHIELD_R,
              borderColor: fg,
            },
          ]}
        />

        {/* EMP shockwave */}
        {this.pulseVisual > 0 && (
          <View
            style={[
              styles.pulseRing,
              {
                left: CX - (1 - this.pulseVisual) * 140 - 20,
                top: CY - (1 - this.pulseVisual) * 140 - 20,
                width: ((1 - this.pulseVisual) * 140 + 20) * 2,
                height: ((1 - this.pulseVisual) * 140 + 20) * 2,
                borderRadius: 200,
                borderColor: fg,
              },
            ]}
          />
        )}

        {/* Planet Core */}
        <View
          style={[
            styles.core,
            {
              left: CX - CORE_R,
              top: CY - CORE_R,
              width: CORE_R * 2,
              height: CORE_R * 2,
              borderRadius: CORE_R,
              borderColor: fg,
              backgroundColor: fg,
            },
          ]}
        >
          <Text style={[styles.coreTxt, { color: bg }]}>{this.lives}</Text>
        </View>

        {/* Shield Arc */}
        {shieldNodes.map((offset, idx) => {
          const ang = this.shieldAngle + offset;
          const sx = CX + Math.cos(ang) * SHIELD_R;
          const sy = CY + Math.sin(ang) * SHIELD_R;
          return (
            <View
              key={idx}
              style={[
                styles.shieldNode,
                {
                  left: sx - 4,
                  top: sy - 4,
                  backgroundColor: fg,
                },
              ]}
            />
          );
        })}

        {/* Meteors */}
        {this.meteors.map((m) => (
          <View
            key={m.id}
            style={[
              styles.meteor,
              {
                left: m.x - m.r,
                top: m.y - m.r,
                width: m.r * 2,
                height: m.r * 2,
                borderRadius: m.r,
                borderColor: fg,
                backgroundColor: fg,
              },
            ]}
          />
        ))}
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
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  core: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreTxt: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  shieldNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  meteor: {
    position: 'absolute',
    borderWidth: 1,
  },
});
