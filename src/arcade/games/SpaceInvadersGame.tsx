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

interface AlienSlot {
  id: number;
  row: number; // 0: squid, 1..2: crab, 3: octopus
  col: number; // 0..8
  alive: boolean;
}

interface Bunker {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number; // 12 -> 0
  maxHp: number;
}

interface MysteryShip {
  x: number;
  y: number;
  vx: number;
  points: number;
  alive: boolean;
}

export class SpaceInvadersGame implements ArcadeGameInstance {
  private playerX = ARENA_W / 2 - 10;
  private readonly playerY = 210;
  private readonly playerW = 20;
  private readonly playerH = 10;
  private playerSpeed = 160;

  // Fleet coordinate root: Moving this ONE root moves all 36 aliens with 0 layout recalculations
  private fleetX = 35;
  private fleetY = 32;
  private readonly colSpacing = 26;
  private readonly rowSpacing = 18;
  private readonly alienW = 16;
  private readonly alienH = 12;

  private aliens: AlienSlot[] = [];
  private alienDir = 1; // 1 = right, -1 = left
  private alienMoveTimer = 0;
  private baseStepInterval = 0.9;
  private alienFrame = 0;

  private bullets: Bullet[] = [];
  private playerShootCooldown = 0;
  private alienShootTimer = 2.0;

  private bunkers: Bunker[] = [];
  private mysteryShip: MysteryShip | null = null;
  private mysteryTimer = 20;

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
    this.playerX = ARENA_W / 2 - 10;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.bullets = [];
    this.particles = [];
    this.mysteryShip = null;
    this.mysteryTimer = 20;

    this.initBunkers();
    this.spawnAlienFleet();
  }

  private initBunkers(): void {
    // 4 monolithic bunkers with health bars (far higher performance than 40 micro cells)
    const bunkerXs = [38, 108, 178, 248];
    this.bunkers = bunkerXs.map((bx) => ({
      x: bx,
      y: 176,
      w: 24,
      h: 12,
      hp: 10,
      maxHp: 10,
    }));
  }

  private spawnAlienFleet(): void {
    this.aliens = [];
    this.fleetX = 35;
    this.fleetY = 32 + Math.min(this.wave - 1, 4) * 6;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        this.aliens.push({
          id: this.nextEntityId++,
          row: r,
          col: c,
          alive: true,
        });
      }
    }

    this.alienDir = 1;
    this.alienMoveTimer = 0;
    this.baseStepInterval = Math.max(0.4, 0.9 - (this.wave - 1) * 0.08);
    this.alienFrame = 0;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

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

    // Player Shooting (Single laser)
    this.playerShootCooldown = Math.max(0, this.playerShootCooldown - dt);
    const hasPlayerBullet = this.bullets.some((b) => !b.isAlien);
    const triggerShoot = (input.a && !this.lastA) || (input.b && !this.lastB);

    if (triggerShoot && !hasPlayerBullet && this.playerShootCooldown <= 0) {
      this.bullets.push({
        id: this.nextEntityId++,
        x: this.playerX + this.playerW / 2 - 1,
        y: this.playerY - 4,
        vy: -260,
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
        y: 16,
        vx: dir * 65,
        points: [50, 100, 150, 300][Math.floor(Math.random() * 4)],
        alive: true,
      };
      this.mysteryTimer = 25 + Math.random() * 15;
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
      this.wave++;
      this.score += 500;
      if (this.score > this.highScore) this.highScore = this.score;
      this.bullets = [];
      this.spawnAlienFleet();
      this.lastA = input.a;
      this.lastB = input.b;
      return 'levelclear';
    }

    const aliveRatio = livingAliens.length / this.aliens.length;
    const currentStepInterval = Math.max(0.08, this.baseStepInterval * Math.pow(aliveRatio, 0.75));

    this.alienMoveTimer += dt;
    if (this.alienMoveTimer >= currentStepInterval) {
      this.alienMoveTimer = 0;
      this.alienFrame = 1 - this.alienFrame;

      // Find living fleet horizontal bounding box
      let minCol = 9;
      let maxCol = -1;
      let maxRow = -1;
      for (const a of livingAliens) {
        if (a.col < minCol) minCol = a.col;
        if (a.col > maxCol) maxCol = a.col;
        if (a.row > maxRow) maxRow = a.row;
      }

      const fleetLeft = this.fleetX + minCol * this.colSpacing;
      const fleetRight = this.fleetX + maxCol * this.colSpacing + this.alienW;
      const nextFleetX = this.fleetX + this.alienDir * 5;
      const nextFleetLeft = nextFleetX + minCol * this.colSpacing;
      const nextFleetRight = nextFleetX + maxCol * this.colSpacing + this.alienW;

      if (nextFleetLeft < 12 || nextFleetRight > ARENA_W - 12) {
        this.alienDir = -this.alienDir;
        this.fleetY += 7;
        const lowestAlienY = this.fleetY + maxRow * this.rowSpacing + this.alienH;
        if (lowestAlienY >= this.playerY) {
          this.gameOver = true;
          this.createExplosion(this.playerX + 9, this.playerY + 5);
          return 'gameover';
        }
      } else {
        this.fleetX = nextFleetX;
      }
    }

    // Alien Shooting
    this.alienShootTimer -= dt;
    if (this.alienShootTimer <= 0 && livingAliens.length > 0) {
      this.alienShootTimer = Math.max(0.6, 2.0 - (this.wave - 1) * 0.15);
      const colsMap = new Map<number, AlienSlot>();
      for (const a of livingAliens) {
        const existing = colsMap.get(a.col);
        if (!existing || a.row > existing.row) {
          colsMap.set(a.col, a);
        }
      }
      const shooters = Array.from(colsMap.values());
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      if (shooter) {
        const sx = this.fleetX + shooter.col * this.colSpacing + 8;
        const sy = this.fleetY + shooter.row * this.rowSpacing + 12;
        this.bullets.push({
          id: this.nextEntityId++,
          x: sx,
          y: sy,
          vy: 110 + this.wave * 10,
          isAlien: true,
        });
      }
    }

    // Bullets & Collision Handling
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.y += b.vy * dt;

      if (b.y < 0 || b.y > ARENA_H) {
        this.bullets.splice(bi, 1);
        continue;
      }

      // Check Bunker Collisions
      let bulletHit = false;
      for (let bkIdx = this.bunkers.length - 1; bkIdx >= 0; bkIdx--) {
        const bunker = this.bunkers[bkIdx];
        if (
          bunker.hp > 0 &&
          b.x >= bunker.x &&
          b.x <= bunker.x + bunker.w &&
          b.y >= bunker.y &&
          b.y <= bunker.y + bunker.h
        ) {
          bunker.hp--;
          this.bullets.splice(bi, 1);
          bulletHit = true;
          this.createSparks(b.x, b.y);
          break;
        }
      }
      if (bulletHit) continue;

      if (!b.isAlien) {
        // Player bullet vs UFO
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

        // Player bullet vs Alien
        for (const alien of livingAliens) {
          const ax = this.fleetX + alien.col * this.colSpacing;
          const ay = this.fleetY + alien.row * this.rowSpacing;
          if (b.x >= ax && b.x <= ax + this.alienW && b.y >= ay && b.y <= ay + this.alienH) {
            alien.alive = false;
            this.bullets.splice(bi, 1);
            const rowPoints = [40, 20, 20, 10];
            const pts = (rowPoints[alien.row] || 10) * this.wave;
            this.score += pts;
            if (this.score > this.highScore) this.highScore = this.score;
            this.createExplosion(ax + 8, ay + 6);
            triggeredSound = 'hit';
            bulletHit = true;
            break;
          }
        }
      } else {
        // Alien bullet vs Player
        if (
          b.x >= this.playerX &&
          b.x <= this.playerX + this.playerW &&
          b.y >= this.playerY &&
          b.y <= this.playerY + this.playerH
        ) {
          this.bullets.splice(bi, 1);
          this.createExplosion(this.playerX + 10, this.playerY + 5);
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
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      const speed = 25 + Math.random() * 25;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.25,
        decay: 3.0,
      });
    }
  }

  private createSparks(x: number, y: number): void {
    this.particles.push({
      id: this.nextEntityId++,
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -15,
      size: 1.5,
      color: '#FFF',
      life: 0.12,
      decay: 5,
    });
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
              },
            ]}
          >
            <View style={[styles.ufoDome, { backgroundColor: pixelColor }]} />
            <View style={[styles.ufoHull, { backgroundColor: pixelColor }]} />
          </View>
        )}

        {/* SINGLE PARENT FLEET CONTAINER: Only this container transforms, 0 individual alien layout churn */}
        <View
          style={[
            styles.fleetContainer,
            {
              transform: [
                { translateX: this.fleetX },
                { translateY: this.fleetY },
              ],
            },
          ]}
        >
          {this.aliens.map((alien) => {
            if (!alien.alive) return null;
            const x = alien.col * this.colSpacing;
            const y = alien.row * this.rowSpacing;

            if (alien.row === 0) {
              // Squid
              return (
                <View
                  key={alien.id}
                  style={[
                    styles.alienSquidWrap,
                    { left: x, top: y },
                    this.alienFrame === 1 && { transform: [{ scaleX: 0.85 }] },
                  ]}
                >
                  <View style={[styles.squidHead, { backgroundColor: pixelColor }]} />
                  <View style={styles.squidTentaclesRow}>
                    <View style={[styles.squidTentacle, { backgroundColor: pixelColor }]} />
                    <View style={[styles.squidTentacle, { backgroundColor: pixelColor }]} />
                    <View style={[styles.squidTentacle, { backgroundColor: pixelColor }]} />
                  </View>
                </View>
              );
            } else if (alien.row < 3) {
              // Crab
              return (
                <View
                  key={alien.id}
                  style={[styles.alienCrabWrap, { left: x, top: y }]}
                >
                  <View style={styles.crabClawsRow}>
                    <View
                      style={[
                        styles.crabClaw,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { height: 2 },
                      ]}
                    />
                    <View
                      style={[
                        styles.crabClaw,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { height: 2 },
                      ]}
                    />
                  </View>
                  <View style={[styles.crabBody, { backgroundColor: pixelColor }]}>
                    <View style={[styles.crabEye, { backgroundColor: palette.screenBg }]} />
                    <View style={[styles.crabEye, { backgroundColor: palette.screenBg }]} />
                  </View>
                  <View style={styles.crabLegsRow}>
                    <View
                      style={[
                        styles.crabLeg,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { transform: [{ rotate: '25deg' }] },
                      ]}
                    />
                    <View
                      style={[
                        styles.crabLeg,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { transform: [{ rotate: '-25deg' }] },
                      ]}
                    />
                  </View>
                </View>
              );
            } else {
              // Octopus
              return (
                <View
                  key={alien.id}
                  style={[styles.alienOctoWrap, { left: x, top: y }]}
                >
                  <View style={[styles.octoHead, { backgroundColor: pixelColor }]}>
                    <View style={[styles.octoEye, { backgroundColor: palette.screenBg }]} />
                    <View style={[styles.octoEye, { backgroundColor: palette.screenBg }]} />
                  </View>
                  <View style={styles.octoTentaclesRow}>
                    <View
                      style={[
                        styles.octoTentacle,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { transform: [{ scaleY: 1.4 }] },
                      ]}
                    />
                    <View
                      style={[
                        styles.octoTentacle,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 0 && { transform: [{ scaleY: 1.4 }] },
                      ]}
                    />
                    <View
                      style={[
                        styles.octoTentacle,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 1 && { transform: [{ scaleY: 1.4 }] },
                      ]}
                    />
                    <View
                      style={[
                        styles.octoTentacle,
                        { backgroundColor: pixelColor },
                        this.alienFrame === 0 && { transform: [{ scaleY: 1.4 }] },
                      ]}
                    />
                  </View>
                </View>
              );
            }
          })}
        </View>

        {/* 4 Shield Bunkers (Monolithic block with health border & cutout) */}
        {this.bunkers.map((bunker, idx) => {
          if (bunker.hp <= 0) return null;
          const hpRatio = bunker.hp / bunker.maxHp;
          return (
            <View
              key={`bunker-${idx}`}
              style={[
                styles.bunkerBox,
                {
                  left: bunker.x,
                  top: bunker.y,
                  width: bunker.w,
                  height: bunker.h,
                  backgroundColor: pixelColor,
                  opacity: hpRatio > 0.6 ? 1.0 : hpRatio > 0.3 ? 0.7 : 0.4,
                },
              ]}
            >
              {/* Notch cutout */}
              <View
                style={[
                  styles.bunkerNotch,
                  { backgroundColor: isLight ? palette.screenBg : '#000' },
                ]}
              />
            </View>
          );
        })}

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
                width: 2,
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
            <View style={[styles.cannonTip, { backgroundColor: pixelColor }]} />
            <View style={[styles.cannonBody, { backgroundColor: pixelColor }]} />
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
  fleetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 240,
    height: 90,
  },
  // SQUID ALIEN
  alienSquidWrap: {
    position: 'absolute',
    width: 14,
    height: 12,
    alignItems: 'center',
  },
  squidHead: {
    width: 12,
    height: 7,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  squidTentaclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 10,
    marginTop: 1,
  },
  squidTentacle: {
    width: 2,
    height: 4,
    borderRadius: 0.5,
  },

  // CRAB ALIEN
  alienCrabWrap: {
    position: 'absolute',
    width: 16,
    height: 12,
    alignItems: 'center',
  },
  crabClawsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 16,
  },
  crabClaw: {
    width: 3,
    height: 3,
    borderRadius: 0.5,
  },
  crabBody: {
    width: 14,
    height: 6,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  crabEye: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  crabLegsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 12,
    marginTop: 0.5,
  },
  crabLeg: {
    width: 2,
    height: 3,
    borderRadius: 0.5,
  },

  // OCTOPUS ALIEN
  alienOctoWrap: {
    position: 'absolute',
    width: 16,
    height: 13,
    alignItems: 'center',
  },
  octoHead: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 1,
  },
  octoEye: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  octoTentaclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 14,
    marginTop: 0.5,
  },
  octoTentacle: {
    width: 2,
    height: 4,
    borderRadius: 0.5,
  },

  // BUNKER
  bunkerBox: {
    position: 'absolute',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bunkerNotch: {
    width: 8,
    height: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // PLAYER CANNON
  playerCannon: {
    position: 'absolute',
    width: 20,
    height: 10,
    alignItems: 'center',
  },
  cannonTip: {
    width: 4,
    height: 3,
    borderRadius: 0.5,
  },
  cannonBody: {
    width: 12,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  cannonBase: {
    width: 20,
    height: 4,
    borderRadius: 1,
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
  },
});
