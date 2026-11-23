import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

export class LunarLanderGame implements ArcadeGameInstance {
  private x = 60;
  private y = 32;
  private vx = 20;
  private vy = 0;
  private fuel = 100;
  private isThrusting = false;

  // Terrain columns (16 cols of 20px each)
  private terrain: number[] = [];
  private padColStart = 10;
  private padCols = 3; // 60px wide flat landing pad

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private statusMsg = '';
  private landedPause = 0;
  private gameOver = false;
  private isMenu = true;
  private particles: Particle[] = [];
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
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.particles = [];
    this.setupMission();
  }

  private setupMission(): void {
    this.x = 35 + Math.random() * 60;
    this.y = 28;
    this.vx = 18 + this.level * 4;
    this.vy = 0;
    this.fuel = 100;
    this.statusMsg = '';
    this.landedPause = 0;

    // Generate jagged lunar terrain with 1 flat pad
    this.padCols = Math.max(2, 4 - Math.floor(this.level / 3));
    this.padColStart = 5 + Math.floor(Math.random() * (14 - this.padCols - 5));
    const padY = 185 + Math.floor(Math.random() * 35);

    this.terrain = [];
    for (let i = 0; i < 16; i++) {
      if (i >= this.padColStart && i < this.padColStart + this.padCols) {
        this.terrain.push(padY);
      } else {
        this.terrain.push(155 + Math.floor(Math.random() * 68));
      }
    }
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

    if (this.landedPause > 0) {
      this.landedPause -= dt;
      if (this.landedPause <= 0) {
        this.level++;
        this.setupMission();
      }
      this.lastA = input.a;
      return sound;
    }

    // Moon Gravity
    const gravity = 38 + this.level * 3;
    this.vy += gravity * dt;

    // Main Vertical Thruster (A or UP)
    this.isThrusting = (input.a || input.up) && this.fuel > 0;
    if (this.isThrusting) {
      this.vy -= 98 * dt;
      this.fuel = Math.max(0, this.fuel - 20 * dt);
      if (Math.random() < 0.6) {
        this.particles.push({
          id: this.nextId++,
          x: this.x + (Math.random() - 0.5) * 4,
          y: this.y + 9,
          vx: (Math.random() - 0.5) * 20,
          vy: 50 + Math.random() * 25,
          size: 2,
          color: '#FFF',
          life: 0.25,
          decay: 3.5,
        });
      }
    }

    // Side RCS Thrusters (Left / Right)
    if (input.left && this.fuel > 0) {
      this.vx -= 68 * dt;
      this.fuel = Math.max(0, this.fuel - 8 * dt);
    }
    if (input.right && this.fuel > 0) {
      this.vx += 68 * dt;
      this.fuel = Math.max(0, this.fuel - 8 * dt);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds
    if (this.x < 10) { this.x = 10; this.vx = Math.abs(this.vx) * 0.4; }
    if (this.x > ARENA_W - 10) { this.x = ARENA_W - 10; this.vx = -Math.abs(this.vx) * 0.4; }
    if (this.y < 10) { this.y = 10; this.vy = 0; }

    // Terrain Collision Check
    const col = Math.max(0, Math.min(15, Math.floor(this.x / 20)));
    const groundY = this.terrain[col];

    if (this.y + 8 >= groundY) {
      const onPad = col >= this.padColStart && col < this.padColStart + this.padCols;
      const softSpeed = Math.abs(this.vy) <= 36 && Math.abs(this.vx) <= 24;

      if (onPad && softSpeed) {
        // Safe Landing!
        this.y = groundY - 8;
        this.vx = 0;
        this.vy = 0;
        this.score += 300 + Math.floor(this.fuel) * 5;
        if (this.score > this.highScore) this.highScore = this.score;
        this.statusMsg = 'PERFECT LANDING!';
        this.landedPause = 1.5;
        sound = 'levelclear';
      } else {
        // Crash!
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          this.particles.push({
            id: this.nextId++,
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 45,
            vy: Math.sin(a) * 45,
            size: 2.5,
            color: '#FFF',
            life: 0.4,
            decay: 2.2,
          });
        }
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.setupMission();
          sound = 'die';
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'MODULE CRASHED' : this.statusMsg || undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `FUEL: ${Math.ceil(this.fuel)}% • V-SPD: ${Math.round(this.vy)} • LAND SLOWLY`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Telemetry HUD */}
        <View style={styles.hudRow}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>FUEL {Math.ceil(this.fuel)}%</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>
            V-SPD {Math.round(this.vy)} {Math.abs(this.vy) <= 36 ? 'OK' : 'FAST!'}
          </Text>
        </View>

        {/* Lunar Terrain Columns */}
        {this.terrain.map((gy, i) => {
          const isPad = i >= this.padColStart && i < this.padColStart + this.padCols;
          return (
            <View
              key={`ter-${i}`}
              style={{
                position: 'absolute',
                left: i * 20,
                top: gy,
                width: 21,
                bottom: 0,
                backgroundColor: isPad
                  ? isLight
                    ? 'rgba(23,38,22,0.35)'
                    : 'rgba(255,255,255,0.28)'
                  : pixelColor,
                borderTopWidth: isPad ? 3 : 0,
                borderTopColor: pixelColor,
              }}
            />
          );
        })}

        {/* Pad Label */}
        <Text
          style={{
            position: 'absolute',
            left: this.padColStart * 20,
            top: this.terrain[this.padColStart] + 5,
            width: this.padCols * 20,
            textAlign: 'center',
            fontSize: 7,
            fontWeight: '900',
            color: pixelColor,
          }}
        >
          PAD
        </Text>

        {/* Lunar Lander Module */}
        {!this.gameOver && (
          <View style={{ position: 'absolute', left: this.x - 8, top: this.y - 8, width: 16, height: 16, alignItems: 'center' }}>
            {/* Top Dome */}
            <View style={{ width: 10, height: 8, borderRadius: 4, backgroundColor: pixelColor, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 4, height: 3, backgroundColor: bg }} />
            </View>
            {/* Base */}
            <View style={{ width: 14, height: 3, backgroundColor: pixelColor, marginTop: 1 }} />
            {/* Legs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 16 }}>
              <View style={{ width: 2, height: 4, backgroundColor: pixelColor, transform: [{ rotate: '20deg' }] }} />
              <View style={{ width: 2, height: 4, backgroundColor: pixelColor, transform: [{ rotate: '-20deg' }] }} />
            </View>
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: pixelColor,
              opacity: p.life,
            }}
          />
        ))}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>LUNAR LANDER</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SOFT TOUCHDOWN ON PAD</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudRow: {
    position: 'absolute',
    top: 6,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
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
