import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

type WeaponType = 'PISTOL' | 'SHOTGUN' | 'SMG' | 'LASER';

interface Zombie {
  id: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: 'crawler' | 'walker' | 'brute';
  wobble: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isLaser?: boolean;
}

interface Drop {
  id: number;
  x: number;
  y: number;
  kind: 'SHOTGUN' | 'SMG' | 'NUKE' | 'MEDKIT';
  life: number;
}

export class ZombieSurvivalGame implements ArcadeGameInstance {
  private px = ARENA_W / 2;
  private py = ARENA_H / 2;
  private aimX = 1;
  private aimY = 0;

  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private drops: Drop[] = [];
  private particles: Particle[] = [];

  // Weapon & Combat
  private currentWeapon: WeaponType = 'PISTOL';
  private weaponTimer = 0; // seconds left for powerup weapon
  private shootCd = 0;
  private kills = 0;
  private invulnTimer = 0;
  private banner = '';
  private bannerTimer = 0;

  // Wave Choreography
  private wave = 1;
  private waveState: 'ANNOUNCING' | 'SPAWNING' | 'CLEARED' = 'ANNOUNCING';
  private waveTimer = 2.0;
  private waveTotalZombies = 12;
  private waveSpawned = 0;
  private spawnInterval = 0.6;
  private nextSpawnIn = 0.5;

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
    this.px = ARENA_W / 2;
    this.py = ARENA_H / 2;
    this.aimX = 1;
    this.aimY = 0;
    this.zombies = [];
    this.bullets = [];
    this.drops = [];
    this.particles = [];
    this.currentWeapon = 'PISTOL';
    this.weaponTimer = 0;
    this.shootCd = 0;
    this.kills = 0;
    this.invulnTimer = 0;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.banner = 'WAVE 1';
    this.bannerTimer = 2.0;
    this.startWave(1);
    this.gameOver = false;
    this.isMenu = true;
  }

  private startWave(w: number): void {
    this.wave = w;
    this.waveState = 'ANNOUNCING';
    this.waveTimer = 2.0;
    this.waveTotalZombies = 8 + w * 4;
    this.waveSpawned = 0;
    this.spawnInterval = Math.max(0.28, 0.75 - w * 0.05);
    this.nextSpawnIn = 0.5;
    this.banner = `WAVE ${w}`;
    this.bannerTimer = 2.0;
  }

  private spawnWaveZombie(): void {
    // Strategic flank spawns: clumps of zombies from chosen corners
    const corner = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const jitter = (Math.random() - 0.5) * 36;
    if (corner === 0) { x = 20 + jitter; y = -14; }
    else if (corner === 1) { x = ARENA_W - 20 + jitter; y = -14; }
    else if (corner === 2) { x = 20 + jitter; y = ARENA_H + 14; }
    else { x = ARENA_W - 20 + jitter; y = ARENA_H + 14; }

    const isBrute = this.wave >= 2 && Math.random() < 0.22;
    const isCrawler = !isBrute && Math.random() < 0.28;

    this.zombies.push({
      id: this.nextId++,
      x,
      y,
      speed: isCrawler ? 34 : isBrute ? 16 : 24 + Math.min(10, this.wave),
      hp: isBrute ? 3 : 1,
      maxHp: isBrute ? 3 : 1,
      type: isBrute ? 'brute' : isCrawler ? 'crawler' : 'walker',
      wobble: Math.random() * Math.PI * 2,
    });
    this.waveSpawned++;
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
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    // Weapon timer countdown
    if (this.weaponTimer > 0) {
      this.weaponTimer -= dt;
      if (this.weaponTimer <= 0) {
        this.currentWeapon = 'PISTOL';
      }
    }

    // Wave Management
    if (this.waveState === 'ANNOUNCING') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveState = 'SPAWNING';
      }
    } else if (this.waveState === 'SPAWNING') {
      this.nextSpawnIn -= dt;
      if (this.nextSpawnIn <= 0 && this.waveSpawned < this.waveTotalZombies) {
        this.spawnWaveZombie();
        this.nextSpawnIn = this.spawnInterval;
      }
      if (this.waveSpawned >= this.waveTotalZombies && this.zombies.length === 0) {
        this.waveState = 'CLEARED';
        this.waveTimer = 2.2;
        this.score += 500 * this.wave;
        if (this.score > this.highScore) this.highScore = this.score;
        this.banner = `WAVE ${this.wave} CLEARED!`;
        this.bannerTimer = 2.2;
        sound = 'levelclear';
      }
    } else if (this.waveState === 'CLEARED') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.startWave(this.wave + 1);
        sound = 'powerup';
      }
    }

    // Player Movement (Smooth, swift 145 px/s)
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.aimX = dx;
      this.aimY = dy;
      this.px = Math.max(14, Math.min(ARENA_W - 14, this.px + dx * 145 * dt));
      this.py = Math.max(14, Math.min(ARENA_H - 14, this.py + dy * 145 * dt));
    }

    // Auto-Aim assist with [B] or manual aim with [A]
    this.shootCd = Math.max(0, this.shootCd - dt);
    if ((input.a || input.b) && this.shootCd <= 0) {
      let bx = this.aimX;
      let by = this.aimY;
      if (input.b && this.zombies.length > 0) {
        let closest = this.zombies[0];
        let minD = Math.hypot(closest.x - this.px, closest.y - this.py);
        for (const z of this.zombies) {
          const d = Math.hypot(z.x - this.px, z.y - this.py);
          if (d < minD) { minD = d; closest = z; }
        }
        if (minD > 0) {
          bx = (closest.x - this.px) / minD;
          by = (closest.y - this.py) / minD;
          this.aimX = bx;
          this.aimY = by;
        }
      }

      this.fireWeapon(bx, by);
      sound = this.currentWeapon === 'SHOTGUN' ? 'hit' : 'shoot';
    }

    // Update Bullets
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -10 || b.x > ARENA_W + 10 || b.y < -10 || b.y > ARENA_H + 10) {
        this.bullets.splice(bi, 1);
        continue;
      }

      for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
        const z = this.zombies[zi];
        const hitDist = z.type === 'brute' ? 14 : 11;
        if (Math.hypot(b.x - z.x, b.y - z.y) < hitDist) {
          this.bullets.splice(bi, 1);
          z.hp -= b.damage;

          // KNOCKBACK: Push zombie backward when shot!
          const kLen = Math.hypot(b.vx, b.vy);
          if (kLen > 0) {
            z.x += (b.vx / kLen) * 9;
            z.y += (b.vy / kLen) * 9;
          }

          if (z.hp <= 0) {
            this.zombies.splice(zi, 1);
            this.kills++;
            this.score += z.type === 'brute' ? 150 : 50;
            if (this.score > this.highScore) this.highScore = this.score;
            this.splat(z.x, z.y);
            this.maybeDropLoot(z.x, z.y);
            sound = 'score';
          } else {
            sound = 'hit';
          }
          break;
        }
      }
    }

    // Update Zombies with Flocking + Natural Shambling Wobble
    for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
      const z = this.zombies[zi];
      z.wobble += dt * 3.5;
      let moveX = this.px - z.x;
      let moveY = this.py - z.y;
      const d = Math.hypot(moveX, moveY);

      // Flocking separation: prevent stacked clump blobs
      let sepX = 0;
      let sepY = 0;
      for (let oi = 0; oi < this.zombies.length; oi++) {
        if (oi === zi) continue;
        const other = this.zombies[oi];
        const odx = z.x - other.x;
        const ody = z.y - other.y;
        const oDist = Math.hypot(odx, ody);
        const minDist = 18;
        if (oDist > 0 && oDist < minDist) {
          const force = (minDist - oDist) / minDist;
          sepX += (odx / oDist) * force * 35;
          sepY += (ody / oDist) * force * 35;
        }
      }

      if (d > 1) {
        const perpX = -moveY / d * Math.sin(z.wobble) * 8;
        const perpY = moveX / d * Math.sin(z.wobble) * 8;
        const chaseX = (moveX / d) * z.speed;
        const chaseY = (moveY / d) * z.speed;
        z.x += (chaseX + sepX + perpX) * dt;
        z.y += (chaseY + sepY + perpY) * dt;
      }

      // Player Damage Check
      if (this.invulnTimer <= 0 && d < 12) {
        this.zombies.splice(zi, 1);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.invulnTimer = 1.6;
          this.splat(this.px, this.py);
          sound = 'die';
        }
      }
    }

    // Update Drops
    for (let di = this.drops.length - 1; di >= 0; di--) {
      const drop = this.drops[di];
      drop.life -= dt;
      if (drop.life <= 0) {
        this.drops.splice(di, 1);
        continue;
      }
      // Pickup check
      if (Math.hypot(this.px - drop.x, this.py - drop.y) < 18) {
        this.collectDrop(drop);
        this.drops.splice(di, 1);
        sound = 'powerup';
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

  private fireWeapon(bx: number, by: number): void {
    if (this.currentWeapon === 'SHOTGUN') {
      // 5-pellet shotgun spread!
      const angles = [-0.24, -0.12, 0, 0.12, 0.24];
      for (const ang of angles) {
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const rbx = bx * cos - by * sin;
        const rby = bx * sin + by * cos;
        this.bullets.push({
          id: this.nextId++,
          x: this.px + rbx * 10,
          y: this.py + rby * 10,
          vx: rbx * 310,
          vy: rby * 310,
          damage: 1,
        });
      }
      this.shootCd = 0.38;
    } else if (this.currentWeapon === 'SMG') {
      // Ultra fast machine gun stream!
      const jitterX = (Math.random() - 0.5) * 0.1;
      const jitterY = (Math.random() - 0.5) * 0.1;
      this.bullets.push({
        id: this.nextId++,
        x: this.px + bx * 10,
        y: this.py + by * 10,
        vx: (bx + jitterX) * 360,
        vy: (by + jitterY) * 360,
        damage: 1,
      });
      this.shootCd = 0.09;
    } else {
      // Standard pistol
      this.bullets.push({
        id: this.nextId++,
        x: this.px + bx * 10,
        y: this.py + by * 10,
        vx: bx * 320,
        vy: by * 320,
        damage: 1,
      });
      this.shootCd = 0.22;
    }
  }

  private maybeDropLoot(x: number, y: number): void {
    if (Math.random() < 0.28) {
      const r = Math.random();
      const kind: 'SHOTGUN' | 'SMG' | 'NUKE' | 'MEDKIT' =
        r < 0.35 ? 'SHOTGUN' : r < 0.7 ? 'SMG' : r < 0.85 ? 'NUKE' : 'MEDKIT';
      this.drops.push({
        id: this.nextId++,
        x,
        y,
        kind,
        life: 10.0,
      });
    }
  }

  private collectDrop(d: Drop): void {
    if (d.kind === 'SHOTGUN') {
      this.currentWeapon = 'SHOTGUN';
      this.weaponTimer = 12.0;
      this.banner = 'SPREAD SHOTGUN!';
      this.bannerTimer = 1.4;
    } else if (d.kind === 'SMG') {
      this.currentWeapon = 'SMG';
      this.weaponTimer = 10.0;
      this.banner = 'RAPID SMG!';
      this.bannerTimer = 1.4;
    } else if (d.kind === 'MEDKIT') {
      this.lives = Math.min(4, this.lives + 1);
      this.banner = '+1 HP RESTORED!';
      this.bannerTimer = 1.4;
    } else if (d.kind === 'NUKE') {
      // Destroy all on-screen zombies!
      for (const z of this.zombies) {
        this.splat(z.x, z.y);
      }
      this.kills += this.zombies.length;
      this.score += this.zombies.length * 50;
      this.zombies = [];
      this.banner = 'TACTICAL NUKE!';
      this.bannerTimer = 1.6;
    }
  }

  private splat(x: number, y: number): void {
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5,
        color: '#FFF',
        life: 0.35,
        decay: 2.2,
      });
    }
  }

  public getStats(): ArcadeStats {
    const weaponInfo =
      this.currentWeapon === 'PISTOL'
        ? 'PISTOL'
        : `${this.currentWeapon} (${Math.ceil(this.weaponTimer)}s)`;

    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'M.I.A. (OVERRUN)' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RE-DEPLOY'
        : `WAVE ${this.wave} • ${weaponInfo} • [B]: AUTO-AIM`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Arena Border with Corner Barricades */}
        <View style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: pixelColor, opacity: 0.5 }]} />

        {/* Tactical Drops */}
        {this.drops.map((d) => (
          <View
            key={d.id}
            style={{
              position: 'absolute',
              left: d.x - 9,
              top: d.y - 7,
              width: 18,
              height: 14,
              borderWidth: 1.5,
              borderColor: pixelColor,
              backgroundColor: bg,
              borderRadius: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: '900', color: pixelColor }}>
              {d.kind === 'SHOTGUN' ? 'SHT' : d.kind === 'SMG' ? 'SMG' : d.kind === 'NUKE' ? '💣' : '✚'}
            </Text>
          </View>
        ))}

        {/* Zombies */}
        {this.zombies.map((z) => {
          const isBoss = z.type === 'brute';
          const size = isBoss ? 17 : z.type === 'crawler' ? 10 : 13;
          const headSize = isBoss ? 8 : 6;
          const angle = Math.atan2(this.py - z.y, this.px - z.x) * (180 / Math.PI);

          return (
            <View
              key={z.id}
              style={{
                position: 'absolute',
                left: z.x - size / 2,
                top: z.y - size / 2,
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: `${angle}deg` }],
              }}
            >
              {/* Arms */}
              <View
                style={{
                  position: 'absolute',
                  right: -3,
                  top: 2,
                  width: isBoss ? 8 : 5,
                  height: 2,
                  backgroundColor: pixelColor,
                  borderRadius: 1,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -3,
                  bottom: 2,
                  width: isBoss ? 8 : 5,
                  height: 2,
                  backgroundColor: pixelColor,
                  borderRadius: 1,
                }}
              />
              {/* Torso */}
              <View
                style={{
                  width: size - 3,
                  height: size - 2,
                  borderRadius: isBoss ? 4 : 2,
                  backgroundColor: isBoss ? pixelColor : bg,
                  borderWidth: 1.5,
                  borderColor: pixelColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: headSize,
                    height: headSize,
                    borderRadius: headSize / 2,
                    backgroundColor: isBoss ? bg : pixelColor,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingRight: 1,
                  }}
                >
                  <View
                    style={{
                      width: 1.5,
                      height: 1.5,
                      borderRadius: 0.75,
                      backgroundColor: isBoss ? pixelColor : bg,
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x - 2,
              top: b.y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: pixelColor,
            }}
          />
        ))}

        {/* Survivor Commando */}
        {!this.gameOver && (() => {
          const aimAngle = Math.atan2(this.aimY, this.aimX) * (180 / Math.PI);
          const snappedAngle = Math.round(aimAngle / 45) * 45;

          return (
            <View
              style={{
                position: 'absolute',
                left: this.px - 9,
                top: this.py - 9,
                width: 18,
                height: 18,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: this.invulnTimer > 0 && Math.floor(this.invulnTimer * 14) % 2 === 0 ? 0.3 : 1,
                transform: [{ rotate: `${snappedAngle}deg` }],
              }}
            >
              {/* Dual Gun Arms */}
              <View
                style={{
                  position: 'absolute',
                  right: -6,
                  top: 4,
                  width: this.currentWeapon === 'SHOTGUN' ? 12 : 9,
                  height: this.currentWeapon === 'SHOTGUN' ? 3.5 : 2.5,
                  backgroundColor: pixelColor,
                  borderRadius: 1,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: 3,
                  width: 6,
                  height: 2,
                  backgroundColor: pixelColor,
                  borderRadius: 1,
                }}
              />

              {/* Body */}
              <View
                style={{
                  width: 12,
                  height: 13,
                  borderRadius: 4,
                  backgroundColor: pixelColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    borderWidth: 1,
                    borderColor: bg,
                    backgroundColor: pixelColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      width: 2,
                      height: 4,
                      backgroundColor: bg,
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })()}

        {/* Particles */}
        {this.particles.map((p) => (
          <View key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: pixelColor, opacity: p.life }} />
        ))}

        {/* Wave Banner Overlay */}
        {this.bannerTimer > 0 && (
          <View style={{ position: 'absolute', top: 32, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: pixelColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: bg, letterSpacing: 1.5 }}>
                {this.banner}
              </Text>
            </View>
          </View>
        )}

        {/* Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ZOMBIE ARENA DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CRIMSONLAND HORDE SURVIVAL</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SURVIVE</Text>
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
