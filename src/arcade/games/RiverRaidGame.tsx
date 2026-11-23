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
}

interface RiverTarget {
  id: number;
  type: 'fuel' | 'ship' | 'heli' | 'bridge';
  x: number;
  y: number;
  w: number;
  h: number;
  vx?: number;
  alive: boolean;
}

export class RiverRaidGame implements ArcadeGameInstance {
  // Fighter Jet
  private jetX = ARENA_W / 2 - 8;
  private readonly jetY = 195;
  private readonly jetW = 16;
  private readonly jetH = 14;
  private jetSpeed = 160;

  // River Bank Terraces
  private scrollSpeed = 110;
  private distance = 0;
  private bankPoints: { y: number; leftW: number; rightW: number }[] = [];

  // Fuel System
  private fuel = 100;
  private maxFuel = 100;
  private fuelDrainRate = 5.5; // percent per second

  // Bullets & Targets
  private bullets: Bullet[] = [];
  private shootCooldown = 0;
  private targets: RiverTarget[] = [];
  private spawnTimer = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private bridgesDestroyed = 0;
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
    this.jetX = ARENA_W / 2 - 8;
    this.fuel = 100;
    this.scrollSpeed = 110;
    this.distance = 0;
    this.score = 0;
    this.lives = 3;
    this.bridgesDestroyed = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.bullets = [];
    this.targets = [];
    this.particles = [];
    this.spawnTimer = 0;

    // Generate starter river banks
    this.bankPoints = [];
    const step = 20;
    const numPoints = Math.ceil(ARENA_H / step) + 4;
    for (let i = 0; i < numPoints; i++) {
      this.bankPoints.push({
        y: i * step,
        leftW: 45,
        rightW: 45,
      });
    }
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

    // Throttle speed control: Up accelerates, Down decelerates
    if (input.up) {
      this.scrollSpeed = 155;
      this.fuelDrainRate = 7.5;
    } else if (input.down) {
      this.scrollSpeed = 75;
      this.fuelDrainRate = 4.0;
    } else {
      this.scrollSpeed = 110;
      this.fuelDrainRate = 5.5;
    }

    // Fuel Consumption
    this.fuel -= this.fuelDrainRate * dt;
    if (this.fuel <= 0) {
      this.fuel = 0;
      return this.handleCrash();
    }

    // Jet Steering
    if (input.left) {
      this.jetX -= this.jetSpeed * dt;
    }
    if (input.right) {
      this.jetX += this.jetSpeed * dt;
    }

    // Shooting (A or B button)
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const triggerShoot = (input.a && !this.lastA) || (input.b && !this.lastB);

    if (triggerShoot && this.shootCooldown <= 0) {
      this.bullets.push({
        id: this.nextEntityId++,
        x: this.jetX + this.jetW / 2 - 1,
        y: this.jetY - 4,
        vy: -260,
      });
      this.shootCooldown = 0.22;
      triggeredSound = 'shoot';
    }

    // River Scroll & Distance
    const dy = this.scrollSpeed * dt;
    this.distance += dy;
    this.score = Math.floor(this.distance / 8) + this.bridgesDestroyed * 500;
    if (this.score > this.highScore) this.highScore = this.score;

    // Move river banks down
    for (const pt of this.bankPoints) {
      pt.y += dy;
    }
    // Spawn new bank point at top
    if (this.bankPoints[0].y > 0) {
      const prev = this.bankPoints[0];
      const newLeft = Math.max(25, Math.min(85, prev.leftW + (Math.random() - 0.5) * 16));
      const newRight = Math.max(25, Math.min(85, prev.rightW + (Math.random() - 0.5) * 16));
      this.bankPoints.unshift({
        y: prev.y - 20,
        leftW: newLeft,
        rightW: newRight,
      });
    }
    // Remove offscreen bank points at bottom
    if (this.bankPoints[this.bankPoints.length - 1].y > ARENA_H + 40) {
      this.bankPoints.pop();
    }

    // Spawn Targets (Boats, Helis, Fuel, Bridges)
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1.5) {
      this.spawnTimer = 0;
      const r = Math.random();

      // Bridge every ~1000px
      const isBridge = this.distance % 900 < 80;

      if (isBridge) {
        this.targets.push({
          id: this.nextEntityId++,
          type: 'bridge',
          x: 0,
          y: -16,
          w: ARENA_W,
          h: 12,
          alive: true,
        });
      } else if (r < 0.35) {
        // FUEL DEPO
        this.targets.push({
          id: this.nextEntityId++,
          type: 'fuel',
          x: 70 + Math.random() * (ARENA_W - 140),
          y: -20,
          w: 16,
          h: 22,
          alive: true,
        });
      } else if (r < 0.7) {
        // PATROL BOAT
        const vx = Math.random() > 0.5 ? 25 : -25;
        this.targets.push({
          id: this.nextEntityId++,
          type: 'ship',
          x: 70 + Math.random() * (ARENA_W - 140),
          y: -16,
          w: 22,
          h: 10,
          vx,
          alive: true,
        });
      } else {
        // HELICOPTER
        this.targets.push({
          id: this.nextEntityId++,
          type: 'heli',
          x: 70 + Math.random() * (ARENA_W - 140),
          y: -16,
          w: 18,
          h: 12,
          alive: true,
        });
      }
    }

    // Move & Update Targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.y += dy;
      if (t.vx) {
        t.x += t.vx * dt;
        if (t.x < 50 || t.x + t.w > ARENA_W - 50) t.vx = -t.vx;
      }

      if (t.y > ARENA_H + 30) {
        this.targets.splice(i, 1);
        continue;
      }

      // Check collision with Jet
      if (
        t.alive &&
        this.jetX + this.jetW - 3 >= t.x &&
        this.jetX + 3 <= t.x + t.w &&
        this.jetY + this.jetH - 3 >= t.y &&
        this.jetY + 3 <= t.y + t.h
      ) {
        if (t.type === 'fuel') {
          // Refuel!
          this.fuel = Math.min(this.maxFuel, this.fuel + 45 * dt * 3);
          triggeredSound = 'powerup';
        } else {
          // Crashed into boat/bridge
          return this.handleCrash();
        }
      }
    }

    // Update Bullets & Collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.y += b.vy * dt;

      if (b.y < -10) {
        this.bullets.splice(bi, 1);
        continue;
      }

      let hit = false;
      for (const t of this.targets) {
        if (t.alive && b.x >= t.x && b.x <= t.x + t.w && b.y >= t.y && b.y <= t.y + t.h) {
          t.alive = false;
          this.bullets.splice(bi, 1);
          hit = true;
          this.createExplosion(t.x + t.w / 2, t.y + t.h / 2);

          if (t.type === 'bridge') {
            this.bridgesDestroyed++;
            this.score += 500;
            triggeredSound = 'levelclear';
          } else if (t.type === 'fuel') {
            this.score += 80;
            triggeredSound = 'hit';
          } else {
            this.score += 150;
            triggeredSound = 'hit';
          }
          if (this.score > this.highScore) this.highScore = this.score;
          break;
        }
      }
    }

    // Check River Bank Collisions (Grass edges)
    const currentBanks = this.getRiverBanksAt(this.jetY + this.jetH / 2);
    if (this.jetX <= currentBanks.leftW || this.jetX + this.jetW >= ARENA_W - currentBanks.rightW) {
      return this.handleCrash();
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

    this.lastA = input.a;
    this.lastB = input.b;
    return triggeredSound;
  }

  private getRiverBanksAt(y: number): { leftW: number; rightW: number } {
    for (let i = 0; i < this.bankPoints.length - 1; i++) {
      const p1 = this.bankPoints[i];
      const p2 = this.bankPoints[i + 1];
      if (y >= p1.y && y <= p2.y) {
        const t = (y - p1.y) / (p2.y - p1.y);
        return {
          leftW: p1.leftW + (p2.leftW - p1.leftW) * t,
          rightW: p1.rightW + (p2.rightW - p1.rightW) * t,
        };
      }
    }
    return { leftW: 45, rightW: 45 };
  }

  private handleCrash(): ArcadeSound {
    this.createExplosion(this.jetX + this.jetW / 2, this.jetY + this.jetH / 2);
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      return 'gameover';
    } else {
      this.jetX = ARENA_W / 2 - 8;
      this.fuel = 100;
      return 'die';
    }
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 35 + Math.random() * 30;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.35,
        decay: 2.2,
      });
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.bridgesDestroyed + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'JET CRASHED' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `FUEL: ${Math.ceil(this.fuel)}% • [▲/▼]: THROTTLE • [A]: FIRE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Left & Right River Banks (Grass) */}
        {this.bankPoints.map((pt, i) => (
          <React.Fragment key={`bank-${i}`}>
            <View
              style={[
                styles.bankTerrace,
                {
                  left: 0,
                  top: pt.y,
                  width: pt.leftW,
                  height: 22,
                  backgroundColor: pixelColor,
                },
              ]}
            />
            <View
              style={[
                styles.bankTerrace,
                {
                  right: 0,
                  top: pt.y,
                  width: pt.rightW,
                  height: 22,
                  backgroundColor: pixelColor,
                },
              ]}
            />
          </React.Fragment>
        ))}

        {/* River Targets (Boats, Helis, Fuel, Bridges) */}
        {this.targets.map((t) => {
          if (!t.alive) return null;

          if (t.type === 'bridge') {
            return (
              <View
                key={t.id}
                style={[
                  styles.bridgeBar,
                  {
                    top: t.y,
                    height: t.h,
                    backgroundColor: pixelColor,
                    borderColor: isLight ? palette.screenBg : '#000',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bridgeText,
                    { color: isLight ? palette.screenBg : '#000' },
                  ]}
                >
                  ═══ BRIDGE ═══
                </Text>
              </View>
            );
          } else if (t.type === 'fuel') {
            return (
              <View
                key={t.id}
                style={[
                  styles.fuelDepot,
                  {
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    borderColor: pixelColor,
                    backgroundColor: isLight ? 'rgba(23, 38, 22, 0.15)' : 'rgba(255,255,255,0.15)',
                  },
                ]}
              >
                <Text style={[styles.fuelLabel, { color: pixelColor }]}>F</Text>
                <Text style={[styles.fuelLabel, { color: pixelColor }]}>U</Text>
                <Text style={[styles.fuelLabel, { color: pixelColor }]}>E</Text>
                <Text style={[styles.fuelLabel, { color: pixelColor }]}>L</Text>
              </View>
            );
          } else if (t.type === 'ship') {
            return (
              <View
                key={t.id}
                style={[
                  styles.boatShip,
                  {
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    backgroundColor: pixelColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.boatCabin,
                    { backgroundColor: isLight ? palette.screenBg : '#000' },
                  ]}
                />
              </View>
            );
          } else {
            return (
              <View
                key={t.id}
                style={[
                  styles.heliTarget,
                  {
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    backgroundColor: pixelColor,
                  },
                ]}
              />
            );
          }
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
              },
            ]}
          />
        ))}

        {/* Fighter Jet */}
        {!this.gameOver && (
          <View
            style={[
              styles.fighterJet,
              {
                left: this.jetX,
                top: this.jetY,
                width: this.jetW,
                height: this.jetH,
              },
            ]}
          >
            {/* Jet Fuselage */}
            <View style={[styles.jetFuselage, { backgroundColor: pixelColor }]} />
            {/* Delta Wings */}
            <View style={[styles.jetWings, { backgroundColor: pixelColor }]} />
            {/* Cockpit Glass */}
            <View
              style={[
                styles.jetCockpit,
                { backgroundColor: isLight ? palette.screenBg : '#000' },
              ]}
            />
          </View>
        )}

        {/* Fuel Gauge Bar */}
        <View style={styles.fuelGaugeWrap}>
          <Text style={[styles.fuelGaugeTitle, { color: pixelColor }]}>FUEL</Text>
          <View style={[styles.fuelGaugeTrack, { borderColor: pixelColor }]}>
            <View
              style={[
                styles.fuelGaugeFill,
                {
                  width: `${Math.max(0, this.fuel)}%`,
                  backgroundColor: pixelColor,
                },
              ]}
            />
          </View>
        </View>

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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RIVER RAID DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>VERTICAL CANYON STRIKE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SCRAMBLE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  bankTerrace: {
    position: 'absolute',
  },
  bridgeBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bridgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  fuelDepot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelLabel: {
    fontSize: 5,
    fontWeight: '900',
    lineHeight: 5,
  },
  boatShip: {
    position: 'absolute',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boatCabin: {
    width: 6,
    height: 4,
    borderRadius: 1,
  },
  heliTarget: {
    position: 'absolute',
    borderRadius: 3,
  },
  bullet: {
    position: 'absolute',
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  fighterJet: {
    position: 'absolute',
    alignItems: 'center',
  },
  jetFuselage: {
    width: 4,
    height: 14,
    borderRadius: 1.5,
  },
  jetWings: {
    position: 'absolute',
    top: 5,
    width: 16,
    height: 4,
    borderRadius: 1,
  },
  jetCockpit: {
    position: 'absolute',
    top: 3,
    width: 2,
    height: 4,
    borderRadius: 1,
  },
  fuelGaugeWrap: {
    position: 'absolute',
    bottom: 4,
    left: 60,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fuelGaugeTitle: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fuelGaugeTrack: {
    flex: 1,
    height: 6,
    borderWidth: 1,
    borderRadius: 1,
    padding: 0.5,
  },
  fuelGaugeFill: {
    height: '100%',
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
