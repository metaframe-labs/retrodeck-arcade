import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const ROAD_LEFT = 84;
const ROAD_W = 152; // 3 lanes x ~48px
const LANE_CENTERS = [110, 160, 210];

interface EnemyCar {
  id: number;
  lane: number; // 0, 1, 2
  y: number;
  passed: boolean;
}

export class BrickRacingGame implements ArcadeGameInstance {
  private playerLane = 1; // 0, 1, 2
  private playerX = LANE_CENTERS[1];
  private readonly playerY = 186;

  private enemies: EnemyCar[] = [];
  private roadOffset = 0;
  private speed = 150;
  private spawnTimer = 0;
  private carsPassed = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private invulnTimer = 0;

  private particles: Particle[] = [];
  private nextEntityId = 1;

  private lastLeft = false;
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
    this.playerLane = 1;
    this.playerX = LANE_CENTERS[1];
    this.enemies = [];
    this.roadOffset = 0;
    this.speed = 150;
    this.spawnTimer = 0.6;
    this.carsPassed = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.invulnTimer = 0;
    this.particles = [];
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

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Lane switching
    if (input.left && !this.lastLeft && this.playerLane > 0) {
      this.playerLane--;
      sound = 'hit';
    } else if (input.right && !this.lastRight && this.playerLane < 2) {
      this.playerLane++;
      sound = 'hit';
    }

    // Smooth lane lerp
    const targetX = LANE_CENTERS[this.playerLane];
    this.playerX += (targetX - this.playerX) * Math.min(1, dt * 20);

    // Boost speed when holding Up or A
    const baseSpeed = 140 + (this.level - 1) * 28;
    const isTurbo = input.up || input.a;
    this.speed = isTurbo ? baseSpeed * 1.55 : baseSpeed;

    // Scroll road dashes
    this.roadOffset = (this.roadOffset + this.speed * dt) % 28;
    this.score += Math.floor((this.speed * dt) / 14);
    if (this.score > this.highScore) this.highScore = this.score;

    // Spawn enemy cars (guaranteeing at least 1 open lane)
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const spawnInterval = Math.max(0.42, 0.95 - (this.level - 1) * 0.08);
      this.spawnTimer = isTurbo ? spawnInterval * 0.72 : spawnInterval;

      const lane1 = Math.floor(Math.random() * 3);
      this.enemies.push({
        id: this.nextEntityId++,
        lane: lane1,
        y: -38,
        passed: false,
      });

      // Chance for a 2nd car in another lane on higher levels
      if (Math.random() < 0.25 + this.level * 0.06) {
        const otherLanes = [0, 1, 2].filter((l) => l !== lane1);
        const lane2 = otherLanes[Math.floor(Math.random() * otherLanes.length)];
        this.enemies.push({
          id: this.nextEntityId++,
          lane: lane2,
          y: -38,
          passed: false,
        });
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.y += this.speed * dt;

      if (!e.passed && e.y > this.playerY + 24) {
        e.passed = true;
        this.carsPassed++;
        this.score += 25;
        if (this.score > this.highScore) this.highScore = this.score;
        const newLevel = Math.floor(this.carsPassed / 15) + 1;
        if (newLevel > this.level) {
          this.level = newLevel;
          sound = 'levelclear';
        }
      }

      if (e.y > ARENA_H + 40) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Collision check
      const ex = LANE_CENTERS[e.lane];
      if (
        this.invulnTimer <= 0 &&
        Math.abs(this.playerX - ex) < 22 &&
        Math.abs(this.playerY - e.y) < 30
      ) {
        this.createExplosion(this.playerX, this.playerY);
        this.enemies.splice(i, 1);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        } else {
          this.invulnTimer = 1.6;
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

    this.updateInput(input);
    return sound;
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const spd = 40 + Math.random() * 45;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3,
        color: '#FFF',
        life: 0.4,
        decay: 2.2,
      });
    }
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'WRECKED!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: STEER • HOLD [A]/[▲]: TURBO',
    };
  }

  private renderBrickCar(x: number, y: number, color: string, bg: string, isPlayer: boolean, key: string) {
    // Classic 9999-in-1 F1 Brick Car silhouette
    return (
      <View
        key={key}
        style={[
          styles.carWrap,
          {
            left: x - 13,
            top: y - 17,
            opacity: isPlayer && this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0 ? 0.3 : 1,
          },
        ]}
      >
        {/* Nose */}
        <View style={[styles.carBrick, { left: 9, top: 0, backgroundColor: color }]} />
        {/* Front wheels + chassis */}
        <View style={[styles.carBrick, { left: 0, top: 8, backgroundColor: color }]} />
        <View style={[styles.carBrick, { left: 9, top: 8, backgroundColor: color }]} />
        <View style={[styles.carBrick, { left: 18, top: 8, backgroundColor: color }]} />
        {/* Cockpit */}
        <View style={[styles.carBrick, { left: 9, top: 16, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ width: 3, height: 3, backgroundColor: bg }} />
        </View>
        {/* Rear wheels + spoiler */}
        <View style={[styles.carBrick, { left: 0, top: 24, backgroundColor: color }]} />
        <View style={[styles.carBrick, { left: 9, top: 24, backgroundColor: color }]} />
        <View style={[styles.carBrick, { left: 18, top: 24, backgroundColor: color }]} />
      </View>
    );
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bgColor = isLight ? palette.screenBg : '#000';

    const dashes = [];
    for (let y = -28; y < ARENA_H + 28; y += 28) {
      dashes.push(y + this.roadOffset);
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Left & Right Brick Road Borders */}
        {dashes.map((dy, i) => (
          <React.Fragment key={`border-${i}`}>
            <View style={[styles.borderDash, { left: ROAD_LEFT - 8, top: dy, backgroundColor: pixelColor }]} />
            <View style={[styles.borderDash, { left: ROAD_LEFT + ROAD_W + 2, top: dy, backgroundColor: pixelColor }]} />
            {/* Lane Dividers */}
            <View style={[styles.laneDash, { left: ROAD_LEFT + 50, top: dy, backgroundColor: pixelColor }]} />
            <View style={[styles.laneDash, { left: ROAD_LEFT + 100, top: dy, backgroundColor: pixelColor }]} />
          </React.Fragment>
        ))}

        {/* Side HUD */}
        <View style={styles.leftHud}>
          <Text style={[styles.hudLabel, { color: pixelColor }]}>SPEED</Text>
          <Text style={[styles.hudVal, { color: pixelColor }]}>{Math.floor(this.speed)}</Text>
          <Text style={[styles.hudLabel, { color: pixelColor, marginTop: 10 }]}>GEAR</Text>
          <Text style={[styles.hudVal, { color: pixelColor }]}>{this.level}</Text>
        </View>

        {/* Enemy Cars */}
        {this.enemies.map((e) =>
          this.renderBrickCar(LANE_CENTERS[e.lane], e.y, pixelColor, bgColor, false, `ec-${e.id}`)
        )}

        {/* Player Car */}
        {!this.gameOver &&
          this.renderBrickCar(this.playerX, this.playerY, pixelColor, bgColor, true, 'player-car')}

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

        {/* Start Menu */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BRICK F1 RACING</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>9999-IN-1 TURBO ROAD</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RACE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  borderDash: {
    position: 'absolute',
    width: 6,
    height: 16,
    borderRadius: 1,
  },
  laneDash: {
    position: 'absolute',
    width: 2,
    height: 10,
    opacity: 0.3,
  },
  leftHud: {
    position: 'absolute',
    left: 10,
    top: 20,
    width: 60,
  },
  hudLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hudVal: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  carWrap: {
    position: 'absolute',
    width: 26,
    height: 32,
  },
  carBrick: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 1,
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
