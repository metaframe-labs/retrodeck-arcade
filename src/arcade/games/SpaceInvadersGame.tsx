import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Bullet {
  id: number;
  x: number;
  y: number;
  vy: number;
  isAlien: boolean;
}

interface Alien {
  id: number;
  row: number; // 0..3 (0: top squid, 1: crab, 2: crab, 3: octopus)
  col: number; // 0..9
  x: number;
  y: number;
  alive: boolean;
}

interface ShieldBlock {
  x: number;
  y: number;
  hp: number; // 3 -> 2 -> 1 -> 0
}

interface MysteryShip {
  x: number;
  y: number;
  vx: number;
  points: number;
  alive: boolean;
}

export class SpaceInvadersGame implements ArcadeGameInstance {
  private playerX = ARENA_W / 2 - 9;
  private readonly playerY = 208;
  private readonly playerW = 18;
  private readonly playerH = 10;
  private playerSpeed = 160;

  private aliens: Alien[] = [];
  private alienDir = 1; // 1 = right, -1 = left
  private alienMoveTimer = 0;
  private alienStepInterval = 0.55;
  private alienFrame = 0; // 0 or 1 for classic stepping animation

  private bullets: Bullet[] = [];
  private playerShootCooldown = 0;
  private alienShootTimer = 1.2;

  private shields: ShieldBlock[] = [];
  private mysteryShip: MysteryShip | null = null;
  private mysteryTimer = 18;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;

  private particles: Particle[] = [];
  private nextEntityId = 1;

  private lastA = false;
  private lastB = false;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.playerX = ARENA_W / 2 - 9;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.bullets = [];
    this.particles = [];
    this.mysteryShip = null;
    this.mysteryTimer = 18;

    this.initShields();
    this.spawnAlienFleet();
  }

  private initShields(): void {
    this.shields = [];
    // 4 bunkers across width
    const bunkerXs = [45, 115, 185, 255];
    const bunkerY = 178;

    bunkerXs.forEach((bx) => {
      // 4 columns x 3 rows per bunker, middle bottom notched out
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (r === 2 && (c === 1 || c === 2)) continue; // arch notch
          this.shields.push({
            x: bx + c * 6,
            y: bunkerY + r * 5,
            hp: 3,
          });
        }
      }
    });
  }

  private spawnAlienFleet(): void {
    this.aliens = [];
    const rows = 4;
    const cols = 9;
    const startX = 35;
    const startY = 32 + Math.min(this.wave - 1, 4) * 8; // Higher waves start closer

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.aliens.push({
          id: this.nextEntityId++,
          row: r,
          col: c,
          x: startX + c * 26,
          y: startY + r * 20,
          alive: true,
        });
      }
    }

    this.alienDir = 1;
    this.alienMoveTimer = 0;
    this.alienStepInterval = Math.max(0.1, 0.55 - (this.wave - 1) * 0.05);
    this.alienFrame = 0;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    // Menu state
    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    // Game over state
    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Player Movement
    if (input.left) {
      this.playerX = Math.max(12, this.playerX - this.playerSpeed * dt);
    }
    if (input.right) {
      this.playerX = Math.min(ARENA_W - 12 - this.playerW, this.playerX + this.playerSpeed * dt);
    }

    // Player Shooting (A or B button)
    this.playerShootCooldown = Math.max(0, this.playerShootCooldown - dt);
    const hasPlayerBullet = this.bullets.some((b) => !b.isAlien);
    const triggerShoot = (input.a && !this.lastA) || (input.b && !this.lastB);

    if (triggerShoot && !hasPlayerBullet && this.playerShootCooldown <= 0) {
      this.bullets.push({
        id: this.nextEntityId++,
        x: this.playerX + this.playerW / 2 - 1,
        y: this.playerY - 4,
        vy: -280,
        isAlien: false,
      });
      this.playerShootCooldown = 0.35;
      triggeredSound = 'shoot';
    }

    // Mystery UFO logic
    this.mysteryTimer -= dt;
    if (this.mysteryTimer <= 0 && !this.mysteryShip) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      this.mysteryShip = {
        x: dir > 0 ? -24 : ARENA_W + 5,
        y: 18,
        vx: dir * 75,
        points: [50, 100, 150, 300][Math.floor(Math.random() * 4)],
        alive: true,
      };
      this.mysteryTimer = 22 + Math.random() * 12;
    }

    if (this.mysteryShip && this.mysteryShip.alive) {
      this.mysteryShip.x += this.mysteryShip.vx * dt;
      if (
        (this.mysteryShip.vx > 0 && this.mysteryShip.x > ARENA_W + 30) ||
        (this.mysteryShip.vx < 0 && this.mysteryShip.x < -30)
      ) {
        this.mysteryShip = null;
      }
    }

    // Aliens Marching Logic
    const livingAliens = this.aliens.filter((a) => a.alive);
    if (livingAliens.length === 0) {
      // Wave Clear!
      this.wave++;
      this.score += 500;
      if (this.score > this.highScore) this.highScore = this.score;
      this.bullets = [];
      this.spawnAlienFleet();
      this.lastA = input.a;
      this.lastB = input.b;
      return 'levelclear';
    }

    // March speed accelerates as aliens die
    const speedRatio = livingAliens.length / this.aliens.length;
    const currentStepInterval = Math.max(0.04, this.alienStepInterval * speedRatio);

    this.alienMoveTimer += dt;
    if (this.alienMoveTimer >= currentStepInterval) {
      this.alienMoveTimer = 0;
      this.alienFrame = 1 - this.alienFrame;

      // Check boundary hit
      let hitWall = false;
      for (const alien of livingAliens) {
        const nextX = alien.x + this.alienDir * 6;
        if (nextX < 12 || nextX + 18 > ARENA_W - 12) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        this.alienDir = -this.alienDir;
        for (const alien of livingAliens) {
          alien.y += 8;
          // Check if invaders reached player baseline or shields
          if (alien.y + 12 >= this.playerY) {
            this.gameOver = true;
            this.createExplosion(this.playerX + 9, this.playerY + 5);
            return 'gameover';
          }
        }
      } else {
        for (const alien of livingAliens) {
          alien.x += this.alienDir * 6;
        }
      }
    }

    // Alien Shooting
    this.alienShootTimer -= dt;
    if (this.alienShootTimer <= 0 && livingAliens.length > 0) {
      this.alienShootTimer = Math.max(0.4, 1.2 - (this.wave - 1) * 0.1);
      // Pick random bottom-most living alien
      const colsMap = new Map<number, Alien>();
      for (const a of livingAliens) {
        const existing = colsMap.get(a.col);
        if (!existing || a.row > existing.row) {
          colsMap.set(a.col, a);
        }
      }
      const shooters = Array.from(colsMap.values());
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      if (shooter) {
        this.bullets.push({
          id: this.nextEntityId++,
          x: shooter.x + 8,
          y: shooter.y + 12,
          vy: 140 + this.wave * 10,
          isAlien: true,
        });
      }
    }

    // Update Bullets & Collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.y += b.vy * dt;

      // Offscreen
      if (b.y < 0 || b.y > ARENA_H) {
        this.bullets.splice(bi, 1);
        continue;
      }

      // Check Shield collisions
      let bulletHit = false;
      for (let si = this.shields.length - 1; si >= 0; si--) {
        const s = this.shields[si];
        if (b.x >= s.x && b.x <= s.x + 6 && b.y >= s.y && b.y <= s.y + 5) {
          s.hp--;
          if (s.hp <= 0) {
            this.shields.splice(si, 1);
          }
          this.bullets.splice(bi, 1);
          bulletHit = true;
          this.createSparks(b.x, b.y);
          break;
        }
      }
      if (bulletHit) continue;

      if (!b.isAlien) {
        // Player bullet hitting UFO
        if (this.mysteryShip && this.mysteryShip.alive) {
          const ufo = this.mysteryShip;
          if (b.x >= ufo.x && b.x <= ufo.x + 22 && b.y >= ufo.y && b.y <= ufo.y + 10) {
            this.score += ufo.points;
            if (this.score > this.highScore) this.highScore = this.score;
            this.createExplosion(ufo.x + 11, ufo.y + 5);
            ufo.alive = false;
            this.mysteryShip = null;
            this.bullets.splice(bi, 1);
            triggeredSound = 'powerup';
            continue;
          }
        }

        // Player bullet hitting alien
        for (const alien of livingAliens) {
          if (b.x >= alien.x && b.x <= alien.x + 16 && b.y >= alien.y && b.y <= alien.y + 12) {
            alien.alive = false;
            this.bullets.splice(bi, 1);
            const rowPoints = [40, 20, 20, 10];
            const pts = (rowPoints[alien.row] || 10) * this.wave;
            this.score += pts;
            if (this.score > this.highScore) this.highScore = this.score;
            this.createExplosion(alien.x + 8, alien.y + 6);
            triggeredSound = 'hit';
            bulletHit = true;
            break;
          }
        }
      } else {
        // Alien bullet hitting player
        if (
          b.x >= this.playerX &&
          b.x <= this.playerX + this.playerW &&
          b.y >= this.playerY &&
          b.y <= this.playerY + this.playerH
        ) {
          this.bullets.splice(bi, 1);
          this.createExplosion(this.playerX + 9, this.playerY + 5);
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            triggeredSound = 'gameover';
          } else {
            triggeredSound = 'die';
          }
        }
      }
    }

    this.lastA = input.a;
    this.lastB = input.b;
    return triggeredSound;
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 30 + Math.random() * 40;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.35,
        decay: 1.8,
      });
    }
  }

  private createSparks(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        size: 1.5,
        color: '#FFF',
        life: 0.2,
        decay: 3,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: MOVE • [A]: FIRE',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Mystery UFO */}
        {this.mysteryShip && this.mysteryShip.alive && (
          <View
            style={[
              styles.ufoShip,
              {
                left: this.mysteryShip.x,
                top: this.mysteryShip.y,
                borderColor: pixelColor,
              },
            ]}
          >
            <View style={[styles.ufoDome, { backgroundColor: pixelColor }]} />
            <View style={[styles.ufoHull, { backgroundColor: pixelColor }]} />
          </View>
        )}

        {/* Aliens */}
        {this.aliens.map((alien) => {
          if (!alien.alive) return null;
          return (
            <View
              key={alien.id}
              style={[
                styles.alienBox,
                {
                  left: alien.x,
                  top: alien.y,
                },
              ]}
            >
              {/* Retro Pixel Alien Shapes (Squid, Crab, Octopus) */}
              <View
                style={[
                  alien.row === 0
                    ? styles.alienSquid
                    : alien.row < 3
                    ? styles.alienCrab
                    : styles.alienOcto,
                  { backgroundColor: pixelColor },
                  this.alienFrame === 1 && styles.alienStepFrame,
                ]}
              />
            </View>
          );
        })}

        {/* Bunkers / Shields */}
        {this.shields.map((s, idx) => (
          <View
            key={`shield-${idx}`}
            style={[
              styles.shieldCell,
              {
                left: s.x,
                top: s.y,
                backgroundColor: pixelColor,
                opacity: s.hp === 3 ? 1.0 : s.hp === 2 ? 0.65 : 0.35,
              },
            ]}
          />
        ))}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={[
              styles.bullet,
              {
                left: b.x,
                top: b.y,
                backgroundColor: pixelColor,
                height: b.isAlien ? 6 : 8,
                width: b.isAlien ? 2 : 2,
              },
            ]}
          />
        ))}

        {/* Player Cannon */}
        {!this.gameOver && (
          <View
            style={[
              styles.playerCannon,
              {
                left: this.playerX,
                top: this.playerY,
              },
            ]}
          >
            {/* Turret tip */}
            <View style={[styles.cannonTip, { backgroundColor: pixelColor }]} />
            {/* Cannon Base */}
            <View style={[styles.cannonBase, { backgroundColor: pixelColor }]} />
          </View>
        )}

        {/* Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: pixelColor,
                opacity: p.life,
              },
            ]}
          />
        ))}

        {/* Start / Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? palette.screenBg : '#111',
                  borderColor: pixelColor,
                },
              ]}
            >
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ALIEN ASSAULT</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SPACE INVADERS DX</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO LAUNCH</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  playerCannon: {
    position: 'absolute',
    width: 18,
    height: 10,
    alignItems: 'center',
  },
  cannonTip: {
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  cannonBase: {
    width: 18,
    height: 6,
    borderRadius: 2,
  },
  alienBox: {
    position: 'absolute',
    width: 16,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alienSquid: {
    width: 12,
    height: 10,
    borderRadius: 3,
  },
  alienCrab: {
    width: 15,
    height: 9,
    borderRadius: 2,
  },
  alienOcto: {
    width: 14,
    height: 10,
    borderRadius: 4,
  },
  alienStepFrame: {
    transform: [{ scaleX: 0.9 }],
  },
  shieldCell: {
    position: 'absolute',
    width: 5,
    height: 4,
    borderRadius: 0.5,
  },
  bullet: {
    position: 'absolute',
    borderRadius: 1,
  },
  ufoShip: {
    position: 'absolute',
    width: 22,
    height: 9,
    alignItems: 'center',
  },
  ufoDome: {
    width: 8,
    height: 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  ufoHull: {
    width: 22,
    height: 6,
    borderRadius: 3,
  },
  particle: {
    position: 'absolute',
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
