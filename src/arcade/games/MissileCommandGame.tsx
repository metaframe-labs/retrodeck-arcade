import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const GROUND_Y = 216;

interface EnemyMissile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetCity: number;
}

interface Blast {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  expanding: boolean;
}

interface City {
  x: number;
  alive: boolean;
}

export class MissileCommandGame implements ArcadeGameInstance {
  private crossX = ARENA_W / 2;
  private crossY = 100;
  private cities: City[] = [];
  private missiles: EnemyMissile[] = [];
  private blasts: Blast[] = [];

  private spawnTimer = 1.0;
  private waveMissilesLeft = 10;
  private fireCd = 0;

  private score = 0;
  private highScore = 0;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
  private lastA = false;
  private lastB = false;

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
    this.crossX = ARENA_W / 2;
    this.crossY = 100;
    this.cities = [38, 86, 134, 186, 234, 282].map((x) => ({ x, alive: true }));
    this.missiles = [];
    this.blasts = [];
    this.score = 0;
    this.wave = 1;
    this.waveMissilesLeft = 10;
    this.spawnTimer = 0.8;
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

    // Move crosshair
    const spd = 175;
    if (input.left) this.crossX = Math.max(12, this.crossX - spd * dt);
    if (input.right) this.crossX = Math.min(ARENA_W - 12, this.crossX + spd * dt);
    if (input.up) this.crossY = Math.max(14, this.crossY - spd * dt);
    if (input.down) this.crossY = Math.min(GROUND_Y - 14, this.crossY + spd * dt);

    // Fire counter-missile blast at crosshair
    this.fireCd = Math.max(0, this.fireCd - dt);
    const trigger = (input.a && !this.lastA) || (input.b && !this.lastB);
    if (trigger && this.fireCd <= 0) {
      this.blasts.push({
        id: this.nextId++,
        x: this.crossX,
        y: this.crossY,
        radius: 3,
        maxRadius: 24,
        expanding: true,
      });
      this.fireCd = 0.25;
      sound = 'shoot';
    }

    // Spawn incoming missiles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.waveMissilesLeft > 0) {
      const aliveCities = this.cities
        .map((c, idx) => ({ c, idx }))
        .filter((item) => item.c.alive);
      if (aliveCities.length > 0) {
        const chosen = aliveCities[Math.floor(Math.random() * aliveCities.length)];
        const sx = 20 + Math.random() * (ARENA_W - 40);
        const dx = chosen.c.x - sx;
        const dy = GROUND_Y - 0;
        const dist = Math.hypot(dx, dy);
        const mSpd = 34 + this.wave * 7 + Math.random() * 14;

        this.missiles.push({
          id: this.nextId++,
          x: sx,
          y: 0,
          vx: (dx / dist) * mSpd,
          vy: (dy / dist) * mSpd,
          targetCity: chosen.idx,
        });
        this.waveMissilesLeft--;
        this.spawnTimer = Math.max(0.45, 1.3 - this.wave * 0.1);
      }
    }

    // Update blasts
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      if (b.expanding) {
        b.radius += 58 * dt;
        if (b.radius >= b.maxRadius) b.expanding = false;
      } else {
        b.radius -= 45 * dt;
        if (b.radius <= 0) {
          this.blasts.splice(i, 1);
          continue;
        }
      }

      // Destroy missiles inside blast radius
      for (let mi = this.missiles.length - 1; mi >= 0; mi--) {
        const m = this.missiles[mi];
        if (Math.hypot(m.x - b.x, m.y - b.y) <= b.radius + 3) {
          this.missiles.splice(mi, 1);
          this.score += 50;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';
        }
      }
    }

    // Update enemy missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      if (m.y >= GROUND_Y) {
        this.missiles.splice(i, 1);
        this.blasts.push({
          id: this.nextId++,
          x: m.x,
          y: GROUND_Y,
          radius: 4,
          maxRadius: 16,
          expanding: true,
        });
        // Check city hit
        for (const c of this.cities) {
          if (c.alive && Math.abs(c.x - m.x) < 16) {
            c.alive = false;
            sound = 'die';
          }
        }
      }
    }

    // Check game over (all cities destroyed)
    const aliveCount = this.cities.filter((c) => c.alive).length;
    if (aliveCount === 0) {
      this.gameOver = true;
      this.lastA = input.a;
      this.lastB = input.b;
      return 'gameover';
    }

    // Wave clear
    if (this.waveMissilesLeft === 0 && this.missiles.length === 0) {
      this.wave++;
      this.score += aliveCount * 100;
      if (this.score > this.highScore) this.highScore = this.score;
      this.waveMissilesLeft = 8 + this.wave * 3;
      this.spawnTimer = 1.2;
      sound = 'levelclear';
    }

    this.lastA = input.a;
    this.lastB = input.b;
    return sound;
  }

  public getStats(): ArcadeStats {
    const alive = this.cities.filter((c) => c.alive).length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: alive,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'ALL CITIES LOST' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'D-PAD: AIM • [A]: INTERCEPT MISSILE',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ground */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND_Y, bottom: 0, backgroundColor: pixelColor, opacity: 0.25 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND_Y, height: 2, backgroundColor: pixelColor }} />

        {/* Cities */}
        {this.cities.map((c, idx) =>
          c.alive ? (
            <View key={`city-${idx}`} style={{ position: 'absolute', left: c.x - 10, top: GROUND_Y - 10, width: 20, height: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ width: 5, height: 7, backgroundColor: pixelColor }} />
              <View style={{ width: 6, height: 10, backgroundColor: pixelColor }} />
              <View style={{ width: 5, height: 6, backgroundColor: pixelColor }} />
            </View>
          ) : null
        )}

        {/* Enemy Missiles */}
        {this.missiles.map((m) => (
          <View key={m.id} style={{ position: 'absolute', left: m.x - 2, top: m.y - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: pixelColor }}>
            <View style={{ position: 'absolute', left: 1, top: -6, width: 2, height: 6, backgroundColor: pixelColor, opacity: 0.4 }} />
          </View>
        ))}

        {/* Blasts */}
        {this.blasts.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x - b.radius,
              top: b.y - b.radius,
              width: b.radius * 2,
              height: b.radius * 2,
              borderRadius: b.radius,
              borderWidth: 2,
              borderColor: pixelColor,
              backgroundColor: isLight ? 'rgba(23,38,22,0.22)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}

        {/* Aim Crosshair */}
        {!this.gameOver && !this.isMenu && (
          <View style={{ position: 'absolute', left: this.crossX - 7, top: this.crossY - 7, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: 14, height: 1.5, backgroundColor: pixelColor }} />
            <View style={{ position: 'absolute', width: 1.5, height: 14, backgroundColor: pixelColor }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MISSILE COMMAND</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DEFEND THE 6 CITIES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DEFEND</Text>
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
