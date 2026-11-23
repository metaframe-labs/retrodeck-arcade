import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Tree {
  id: number;
  x: number;
  y: number;
}

interface Gate {
  id: number;
  x: number; // left flag x
  w: number;
  y: number;
  passed: boolean;
}

export class SkiSlalomGame implements ArcadeGameInstance {
  private skierX = ARENA_W / 2;
  private readonly skierY = 56;
  private tilt = 0; // -1 left, 0 straight, 1 right

  private trees: Tree[] = [];
  private gates: Gate[] = [];
  private spawnTimer = 0.4;
  private gateTimer = 1.6;
  private speed = 125;
  private distance = 0;
  private gatesCleared = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private invulnTimer = 0;
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
    this.skierX = ARENA_W / 2;
    this.tilt = 0;
    this.trees = [];
    this.gates = [];
    this.spawnTimer = 0.4;
    this.gateTimer = 1.4;
    this.speed = 125;
    this.distance = 0;
    this.gatesCleared = 0;
    this.score = 0;
    this.lives = 3;
    this.invulnTimer = 0;
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

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Steer skier
    const steerSpd = 165;
    if (input.left) {
      this.skierX = Math.max(14, this.skierX - steerSpd * dt);
      this.tilt = -1;
    } else if (input.right) {
      this.skierX = Math.min(ARENA_W - 14, this.skierX + steerSpd * dt);
      this.tilt = 1;
    } else {
      this.tilt = 0;
    }

    // Down or A tucks for extra downhill speed
    const baseSpd = Math.min(245, 125 + this.distance / 45);
    this.speed = input.down || input.a ? baseSpd * 1.4 : baseSpd;
    const dy = this.speed * dt;
    this.distance += dy;
    this.score += Math.floor(dy / 12);
    if (this.score > this.highScore) this.highScore = this.score;

    // Spawn pine trees
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.22, 0.55 - this.distance / 9000);
      this.trees.push({
        id: this.nextId++,
        x: 16 + Math.random() * (ARENA_W - 32),
        y: ARENA_H + 18,
      });
    }

    // Spawn slalom flag gates
    this.gateTimer -= dt;
    if (this.gateTimer <= 0) {
      this.gateTimer = 2.1;
      const w = Math.max(46, 72 - Math.floor(this.gatesCleared / 4) * 3);
      this.gates.push({
        id: this.nextId++,
        x: 24 + Math.random() * (ARENA_W - 48 - w),
        w,
        y: ARENA_H + 20,
        passed: false,
      });
    }

    // Update trees
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const t = this.trees[i];
      t.y -= dy;
      if (t.y < -20) {
        this.trees.splice(i, 1);
        continue;
      }

      if (this.invulnTimer <= 0 && Math.hypot(t.x - this.skierX, t.y - this.skierY) < 13) {
        this.trees.splice(i, 1);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.invulnTimer = 1.4;
          sound = 'die';
        }
      }
    }

    // Update gates
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.y -= dy;
      if (!g.passed && g.y <= this.skierY) {
        g.passed = true;
        if (this.skierX >= g.x && this.skierX <= g.x + g.w) {
          this.gatesCleared++;
          this.score += 100;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
        }
      }
      if (g.y < -20) this.gates.splice(i, 1);
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: Math.floor(this.gatesCleared / 5) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'WIPEOUT!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO SKI AGAIN'
        : `GATES: ${this.gatesCleared} • PASS BETWEEN FLAGS ⚑`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Slalom Gates */}
        {this.gates.map((g) => (
          <React.Fragment key={`g-${g.id}`}>
            <Text style={{ position: 'absolute', left: g.x - 4, top: g.y - 10, fontSize: 12, fontWeight: '900', color: pixelColor }}>⚑</Text>
            <Text style={{ position: 'absolute', left: g.x + g.w - 4, top: g.y - 10, fontSize: 12, fontWeight: '900', color: pixelColor }}>⚑</Text>
          </React.Fragment>
        ))}

        {/* Pine Trees */}
        {this.trees.map((t) => (
          <View key={t.id} style={{ position: 'absolute', left: t.x - 8, top: t.y - 10, width: 16, height: 18, alignItems: 'center' }}>
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 7,
                borderRightWidth: 7,
                borderBottomWidth: 13,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: pixelColor,
              }}
            />
            <View style={{ width: 4, height: 5, backgroundColor: pixelColor }} />
          </View>
        ))}

        {/* Skier */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.skierX - 7,
              top: this.skierY - 8,
              width: 14,
              height: 18,
              alignItems: 'center',
              opacity: this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0 ? 0.3 : 1,
              transform: [{ rotate: `${this.tilt * -18}deg` }],
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
            <View style={{ width: 8, height: 7, borderRadius: 2, backgroundColor: pixelColor, marginTop: 1 }} />
            {/* Skis */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 1 }}>
              <View style={{ width: 2, height: 7, backgroundColor: pixelColor }} />
              <View style={{ width: 2, height: 7, backgroundColor: pixelColor }} />
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>SKI SLALOM DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DODGE TREES • HIT FLAG GATES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SKI</Text>
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
