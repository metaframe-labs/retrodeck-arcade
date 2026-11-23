import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const CX = 160;
const CY = 120;
const RING_R = 98;
const CAR_R = 11;

interface BumperCar {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
}

export class BumperCarsGame implements ArcadeGameInstance {
  private player: BumperCar = { id: 0, x: CX, y: CY, vx: 0, vy: 0, isPlayer: true };
  private enemies: BumperCar[] = [];

  private round = 1;
  private score = 0;
  private highScore = 0;
  private lives = 3;
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
    this.round = 1;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
    this.spawnArena();
  }

  private spawnArena(): void {
    this.player = { id: 0, x: CX, y: CY, vx: 0, vy: 0, isPlayer: true };
    this.enemies = [];
    const count = Math.min(6, 2 + this.round);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      this.enemies.push({
        id: this.nextId++,
        x: CX + Math.cos(a) * 62,
        y: CY + Math.sin(a) * 62,
        vx: 0,
        vy: 0,
        isPlayer: false,
      });
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

    // Player bumper thrust
    const accel = input.a ? 460 : 320;
    if (input.left) this.player.vx -= accel * dt;
    if (input.right) this.player.vx += accel * dt;
    if (input.up) this.player.vy -= accel * dt;
    if (input.down) this.player.vy += accel * dt;

    // Enemy AI pushes toward player
    const eAccel = 165 + this.round * 14;
    for (const e of this.enemies) {
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx += (dx / d) * eAccel * dt;
      e.vy += (dy / d) * eAccel * dt;
    }

    const all = [this.player, ...this.enemies];
    const drag = Math.pow(0.955, dt * 60);

    for (const c of all) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= drag;
      c.vy *= drag;
    }

    // Elastic bumper collisions
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minD = CAR_R * 2;
        if (dist > 0 && dist < minD) {
          const nx = dx / dist;
          const ny = dy / dist;
          const ov = (minD - dist) / 2 + 1;
          a.x -= nx * ov;
          a.y -= ny * ov;
          b.x += nx * ov;
          b.y += ny * ov;

          const kick = a.isPlayer && input.a ? 245 : 175;
          a.vx -= nx * (kick * 0.6);
          a.vy -= ny * (kick * 0.6);
          b.vx += nx * kick;
          b.vy += ny * kick;
          sound = 'hit';
        }
      }
    }

    // Check enemies knocked out of ring
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - CX, e.y - CY) > RING_R) {
        this.enemies.splice(i, 1);
        this.score += 150;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'score';
      }
    }

    // Check player knocked out of ring
    if (Math.hypot(this.player.x - CX, this.player.y - CY) > RING_R) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.lastA = input.a;
        return 'gameover';
      } else {
        this.player.x = CX;
        this.player.y = CY;
        this.player.vx = 0;
        this.player.vy = 0;
        sound = 'die';
      }
    }

    // Round Clear
    if (this.enemies.length === 0) {
      this.round++;
      this.score += 400;
      if (this.score > this.highScore) this.highScore = this.score;
      this.spawnArena();
      sound = 'levelclear';
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.round,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'RINGED OUT!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `FOES: ${this.enemies.length} • D-PAD: RAM • HOLD [A]: TURBO`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Circular Sumo Bumper Ring */}
        <View
          style={{
            position: 'absolute',
            left: CX - RING_R,
            top: CY - RING_R,
            width: RING_R * 2,
            height: RING_R * 2,
            borderRadius: RING_R,
            borderWidth: 3,
            borderColor: pixelColor,
          }}
        />

        {/* Enemy Bumper Cars */}
        {this.enemies.map((e) => (
          <View
            key={e.id}
            style={{
              position: 'absolute',
              left: e.x - CAR_R,
              top: e.y - CAR_R,
              width: CAR_R * 2,
              height: CAR_R * 2,
              borderRadius: CAR_R,
              borderWidth: 2.5,
              borderColor: pixelColor,
              backgroundColor: bg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pixelColor }} />
          </View>
        ))}

        {/* Player Bumper Car */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.player.x - CAR_R,
              top: this.player.y - CAR_R,
              width: CAR_R * 2,
              height: CAR_R * 2,
              borderRadius: CAR_R,
              backgroundColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: bg }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BUMPER CARS DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>KNOCK RIVALS OUT OF THE RING</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RAM</Text>
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
