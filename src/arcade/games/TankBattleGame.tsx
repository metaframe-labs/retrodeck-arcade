import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 16;
const ROWS = 12;
const TILE = 20;

type Dir = 0 | 1 | 2 | 3; // 0: up, 1: right, 2: down, 3: left

interface Tank {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  isPlayer: boolean;
  shootCd: number;
  aiTimer: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
}

export class TankBattleGame implements ArcadeGameInstance {
  private bricks = new Set<string>(); // "c,r" destructible walls
  private steels = new Set<string>(); // indestructible walls
  private player: Tank = { id: 1, x: 140, y: 200, dir: 0, isPlayer: true, shootCd: 0, aiTimer: 0 };
  private enemies: Tank[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];

  private enemiesRemaining = 6;
  private spawnTimer = 1.0;
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 10;
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
    this.loadStage();
  }

  private loadStage(): void {
    this.bricks.clear();
    this.steels.clear();
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.enemiesRemaining = 5 + this.level * 2;
    this.spawnTimer = 0.5;

    this.player = { id: 1, x: 7 * TILE + 2, y: 10 * TILE + 2, dir: 0, isPlayer: true, shootCd: 0, aiTimer: 0 };

    // Symmetrical Battle City brick pillars
    const brickCoords: [number, number][] = [
      [2, 2], [2, 3], [2, 4], [2, 7], [2, 8],
      [4, 2], [4, 3], [4, 7], [4, 8],
      [6, 4], [6, 5], [7, 5], [8, 5], [9, 4], [9, 5],
      [11, 2], [11, 3], [11, 7], [11, 8],
      [13, 2], [13, 3], [13, 4], [13, 7], [13, 8],
      [6, 9], [7, 9], [8, 9], [9, 9],
    ];
    brickCoords.forEach(([c, r]) => this.bricks.add(`${c},${r}`));

    // Steel blocks
    this.steels.add('7,3');
    this.steels.add('8,3');
    this.steels.add('1,6');
    this.steels.add('14,6');
  }

  private isBlocked(x: number, y: number, size = 15): boolean {
    if (x < 0 || y < 0 || x + size > ARENA_W || y + size > ARENA_H) return true;
    const corners: [number, number][] = [
      [x, y],
      [x + size, y],
      [x, y + size],
      [x + size, y + size],
    ];
    for (const [cx, cy] of corners) {
      const key = `${Math.floor(cx / TILE)},${Math.floor(cy / TILE)}`;
      if (this.bricks.has(key) || this.steels.has(key)) return true;
    }
    return false;
  }

  private fireBullet(t: Tank): void {
    const speed = t.isPlayer ? 230 : 160;
    const vx = t.dir === 1 ? speed : t.dir === 3 ? -speed : 0;
    const vy = t.dir === 2 ? speed : t.dir === 0 ? -speed : 0;
    this.bullets.push({
      id: this.nextId++,
      x: t.x + 7,
      y: t.y + 7,
      vx,
      vy,
      fromPlayer: t.isPlayer,
    });
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

    // Player movement
    const pSpd = 85;
    let dx = 0;
    let dy = 0;
    if (input.up) { this.player.dir = 0; dy = -pSpd * dt; }
    else if (input.right) { this.player.dir = 1; dx = pSpd * dt; }
    else if (input.down) { this.player.dir = 2; dy = pSpd * dt; }
    else if (input.left) { this.player.dir = 3; dx = -pSpd * dt; }

    if (dx !== 0 && !this.isBlocked(this.player.x + dx, this.player.y)) {
      this.player.x += dx;
    }
    if (dy !== 0 && !this.isBlocked(this.player.x, this.player.y + dy)) {
      this.player.y += dy;
    }

    // Player shoot
    this.player.shootCd = Math.max(0, this.player.shootCd - dt);
    if ((input.a || input.b) && this.player.shootCd <= 0) {
      this.fireBullet(this.player);
      this.player.shootCd = 0.36;
      sound = 'shoot';
    }

    // Spawn enemy tanks from top corners/center
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 4 && this.enemiesRemaining > 0) {
      const spawns = [2, 7 * TILE + 2, 14 * TILE + 2];
      const sx = spawns[Math.floor(Math.random() * spawns.length)];
      this.enemies.push({
        id: this.nextId++,
        x: sx,
        y: 2,
        dir: 2,
        isPlayer: false,
        shootCd: 1.0 + Math.random(),
        aiTimer: 0.8 + Math.random() * 1.2,
      });
      this.enemiesRemaining--;
      this.spawnTimer = 2.4;
    }

    // Update enemy AI
    const eSpd = 52 + this.level * 5;
    for (const e of this.enemies) {
      e.aiTimer -= dt;
      e.shootCd -= dt;

      const ex = e.dir === 1 ? eSpd * dt : e.dir === 3 ? -eSpd * dt : 0;
      const ey = e.dir === 2 ? eSpd * dt : e.dir === 0 ? -eSpd * dt : 0;

      if (!this.isBlocked(e.x + ex, e.y + ey)) {
        e.x += ex;
        e.y += ey;
      } else {
        e.dir = Math.floor(Math.random() * 4) as Dir;
      }

      if (e.aiTimer <= 0) {
        e.dir = Math.floor(Math.random() * 4) as Dir;
        e.aiTimer = 1.0 + Math.random() * 1.5;
      }

      if (e.shootCd <= 0) {
        this.fireBullet(e);
        e.shootCd = Math.max(0.9, 2.0 - this.level * 0.12) + Math.random();
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < 0 || b.x > ARENA_W || b.y < 0 || b.y > ARENA_H) {
        this.bullets.splice(i, 1);
        continue;
      }

      const tileKey = `${Math.floor(b.x / TILE)},${Math.floor(b.y / TILE)}`;
      if (this.bricks.has(tileKey)) {
        this.bricks.delete(tileKey);
        this.bullets.splice(i, 1);
        this.explode(b.x, b.y, 4);
        sound = 'hit';
        continue;
      }
      if (this.steels.has(tileKey)) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        let hitEnemy = false;
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
          const e = this.enemies[ei];
          if (b.x >= e.x && b.x <= e.x + 16 && b.y >= e.y && b.y <= e.y + 16) {
            this.enemies.splice(ei, 1);
            this.bullets.splice(i, 1);
            this.explode(e.x + 8, e.y + 8, 7);
            this.score += 100;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'score';
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      } else {
        // Enemy bullet vs Player
        if (
          b.x >= this.player.x &&
          b.x <= this.player.x + 16 &&
          b.y >= this.player.y &&
          b.y <= this.player.y + 16
        ) {
          this.bullets.splice(i, 1);
          this.explode(this.player.x + 8, this.player.y + 8, 8);
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          } else {
            this.player.x = 7 * TILE + 2;
            this.player.y = 10 * TILE + 2;
            sound = 'die';
          }
        }
      }
    }

    // Stage clear
    if (this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.level++;
      this.score += 500;
      if (this.score > this.highScore) this.highScore = this.score;
      this.loadStage();
      this.lastA = input.a;
      return 'levelclear';
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

  private explode(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(a) * 45,
        vy: Math.sin(a) * 45,
        size: 2.5,
        color: '#FFF',
        life: 0.3,
        decay: 2.8,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'TANK DESTROYED' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `ENEMIES: ${this.enemiesRemaining + this.enemies.length} • D-PAD: DRIVE • [A]: FIRE`,
    };
  }

  private renderTank(t: Tank, color: string, bg: string) {
    const rot = t.dir * 90;
    return (
      <View
        key={t.id}
        style={{
          position: 'absolute',
          left: t.x,
          top: t.y,
          width: 16,
          height: 16,
          alignItems: 'center',
          transform: [{ rotate: `${rot}deg` }],
        }}
      >
        {/* Cannon Barrel */}
        <View style={{ width: 3, height: 7, backgroundColor: color }} />
        {/* Hull + Treads */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            width: 15,
            height: 12,
            backgroundColor: color,
            borderRadius: 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: t.isPlayer ? 3 : 0,
              borderWidth: 1,
              borderColor: bg,
              backgroundColor: t.isPlayer ? color : bg,
            }}
          />
        </View>
      </View>
    );
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Destructible Bricks */}
        {Array.from(this.bricks).map((key) => {
          const [c, r] = key.split(',').map(Number);
          return (
            <View
              key={`b-${key}`}
              style={{
                position: 'absolute',
                left: c * TILE + 1,
                top: r * TILE + 1,
                width: TILE - 2,
                height: TILE - 2,
                backgroundColor: isLight ? 'rgba(23,38,22,0.55)' : 'rgba(255,255,255,0.4)',
                borderWidth: 1,
                borderColor: pixelColor,
              }}
            />
          );
        })}

        {/* Indestructible Steel */}
        {Array.from(this.steels).map((key) => {
          const [c, r] = key.split(',').map(Number);
          return (
            <View
              key={`s-${key}`}
              style={{
                position: 'absolute',
                left: c * TILE + 1,
                top: r * TILE + 1,
                width: TILE - 2,
                height: TILE - 2,
                backgroundColor: pixelColor,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ width: 8, height: 8, borderWidth: 1, borderColor: bg }} />
            </View>
          );
        })}

        {/* Tanks */}
        {!this.gameOver && this.renderTank(this.player, pixelColor, bg)}
        {this.enemies.map((e) => this.renderTank(e, pixelColor, bg))}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x - 1.5,
              top: b.y - 1.5,
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: pixelColor,
            }}
          />
        ))}

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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TANK 1990 DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>BATTLE CITY ARENA</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DEPLOY</Text>
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
