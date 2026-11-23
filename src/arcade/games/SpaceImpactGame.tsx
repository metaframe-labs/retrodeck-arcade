import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, FloatText, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

interface PlayerBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
}

interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Enemy {
  id: number;
  type: 'scout' | 'cruiser' | 'boss';
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shootTimer: number;
  animTimer: number;
}

export class SpaceImpactGame implements ArcadeGameInstance {
  private player = {
    x: 24,
    y: ARENA_H / 2 - 8,
    w: 20,
    h: 12,
    speed: 145,
    shield: 100,
    maxShield: 100,
  };

  private stars: Star[] = [];
  private playerBullets: PlayerBullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private bombs = 2;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;

  private spawnTimer = 0;
  private lastShootTime = 0;
  private flashScreenTimer = 0;
  private nextEntityId = 1;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public init(): void {
    this.player.x = 24;
    this.player.y = ARENA_H / 2 - 8;
    this.player.shield = 100;
    this.score = 0;
    this.lives = 3;
    this.bombs = 2;
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.floatTexts = [];
    this.spawnTimer = 0;
    this.flashScreenTimer = 0;

    // Initialize parallax starfield
    this.stars = [];
    for (let i = 0; i < 35; i++) {
      this.stars.push({
        x: Math.random() * ARENA_W,
        y: Math.random() * ARENA_H,
        speed: 30 + Math.random() * 120,
        size: Math.random() > 0.8 ? 2 : 1,
        opacity: 0.3 + Math.random() * 0.7,
      });
    }
  }

  public reset(): void {
    this.init();
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.isMenu) {
      for (const star of this.stars) {
        star.x -= star.speed * 0.4 * dt;
        if (star.x < 0) {
          star.x = ARENA_W;
          star.y = Math.random() * ARENA_H;
        }
      }
      if (input.a || input.b) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a || input.b) {
        this.init();
        return 'hit';
      }
      return null;
    }

    let soundToPlay: ArcadeSound | null = null;

    if (this.flashScreenTimer > 0) {
      this.flashScreenTimer -= dt;
    }

    // 1. Starfield Parallax Scroll
    for (const star of this.stars) {
      star.x -= star.speed * dt;
      if (star.x < 0) {
        star.x = ARENA_W;
        star.y = Math.random() * ARENA_H;
      }
    }

    // 2. Player Movement
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Clamp player within arena (bound to left 55% of screen)
    this.player.x = Math.max(6, Math.min(ARENA_W * 0.55 - this.player.w, this.player.x));
    this.player.y = Math.max(8, Math.min(ARENA_H - 14 - this.player.h, this.player.y));

    // 3. Player Shooting (Button A)
    const now = Date.now();
    if (input.a && now - this.lastShootTime > 160) {
      this.lastShootTime = now;
      this.playerBullets.push({
        id: this.nextEntityId++,
        x: this.player.x + this.player.w,
        y: this.player.y + 2,
        vx: 380,
      });
      this.playerBullets.push({
        id: this.nextEntityId++,
        x: this.player.x + this.player.w,
        y: this.player.y + this.player.h - 4,
        vx: 380,
      });
      soundToPlay = 'shoot';
    }

    // 4. Secondary Weapon: EMP Mega-Bomb (Button B)
    if (input.b && this.bombs > 0 && this.flashScreenTimer <= 0) {
      this.bombs--;
      this.flashScreenTimer = 0.25;
      soundToPlay = 'bomb';

      // Clear all enemy bullets
      this.enemyBullets = [];

      // Damage all enemies on screen
      for (const e of this.enemies) {
        e.hp -= 4;
        this.spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, 8, '#00F0FF');
      }

      this.addFloatText(ARENA_W / 2, ARENA_H / 2, 'EMP MEGABOMB!', '#00F0FF');
    }

    // 5. Update Player Bullets
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.x += b.vx * dt;

      // Hit test against enemies
      let hit = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          hit = true;
          e.hp -= 1;
          this.spawnExplosion(b.x, b.y, 4, '#FFFFFF');

          if (e.hp <= 0) {
            const pts = e.type === 'boss' ? 2500 : e.type === 'cruiser' ? 350 : 150;
            this.score += pts;
            if (this.score > this.highScore) this.highScore = this.score;

            this.spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? 30 : 14, '#FF0055');
            this.addFloatText(e.x, e.y, `+${pts}`, '#FFD700');
            this.enemies.splice(ei, 1);
            soundToPlay = 'explode';
          } else {
            soundToPlay = 'hit';
          }
          break;
        }
      }

      if (hit || b.x > ARENA_W) {
        this.playerBullets.splice(i, 1);
      }
    }

    // 6. Spawn Enemy Waves
    this.spawnTimer += dt;
    const spawnInterval = Math.max(1.3, 2.8 - this.wave * 0.25);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const isCruiser = Math.random() > 0.65;
      const spawnY = 20 + Math.random() * (ARENA_H - 60);

      if (isCruiser) {
        this.enemies.push({
          id: this.nextEntityId++,
          type: 'cruiser',
          x: ARENA_W + 10,
          y: spawnY,
          w: 24,
          h: 18,
          vx: -45 - this.wave * 5,
          vy: (Math.random() - 0.5) * 30,
          hp: 4,
          maxHp: 4,
          shootTimer: 2.0 + Math.random() * 1.0,
          animTimer: 0,
        });
      } else {
        this.enemies.push({
          id: this.nextEntityId++,
          type: 'scout',
          x: ARENA_W + 10,
          y: spawnY,
          w: 16,
          h: 12,
          vx: -80 - this.wave * 8,
          vy: 0,
          hp: 1,
          maxHp: 1,
          shootTimer: 0,
          animTimer: 0,
        });
      }
    }

    // Boss check (at 3000 pts per wave)
    if (this.score > this.wave * 3000 && !this.enemies.some((e) => e.type === 'boss')) {
      this.enemies.push({
        id: this.nextEntityId++,
        type: 'boss',
        x: ARENA_W + 20,
        y: ARENA_H / 2 - 24,
        w: 42,
        h: 48,
        vx: -25,
        vy: 40,
        hp: 30 + this.wave * 10,
        maxHp: 30 + this.wave * 10,
        shootTimer: 1.2,
        animTimer: 0,
      });
      this.addFloatText(ARENA_W / 2, ARENA_H / 2, 'BOSS INCOMING!', '#FF0055');
    }

    // 7. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.animTimer += dt;

      // Boss movement AI
      if (e.type === 'boss') {
        if (e.x > ARENA_W - 60) {
          e.x += e.vx * dt;
        }
        e.y += e.vy * dt;
        if (e.y < 20 || e.y + e.h > ARENA_H - 20) {
          e.vy = -e.vy;
        }

        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 1.3;
          // Fire spread shots
          this.enemyBullets.push(
            { id: this.nextEntityId++, x: e.x, y: e.y + 10, vx: -105, vy: -30 },
            { id: this.nextEntityId++, x: e.x, y: e.y + e.h / 2, vx: -125, vy: 0 },
            { id: this.nextEntityId++, x: e.x, y: e.y + e.h - 10, vx: -105, vy: 30 }
          );
        }
      } else {
        // Scout & Cruiser
        e.x += e.vx * dt;
        if (e.type === 'scout') {
          e.y += Math.sin(e.animTimer * 4) * 45 * dt;
        } else {
          e.y += e.vy * dt;
          if (e.y < 20 || e.y + e.h > ARENA_H - 20) e.vy = -e.vy;

          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = 2.4;
            this.enemyBullets.push({
              id: this.nextEntityId++,
              x: e.x,
              y: e.y + e.h / 2,
              vx: -110,
              vy: 0,
            });
          }
        }
      }

      // Check collision with player
      if (
        this.player.x + this.player.w >= e.x &&
        this.player.x <= e.x + e.w &&
        this.player.y + this.player.h >= e.y &&
        this.player.y <= e.y + e.h
      ) {
        this.damagePlayer(40);
        soundToPlay = 'die';
      }

      // Despawn off-screen
      if (e.x + e.w < -20) {
        this.enemies.splice(i, 1);
      }
    }

    // 8. Update Enemy Bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Hit player
      if (
        b.x >= this.player.x &&
        b.x <= this.player.x + this.player.w &&
        b.y >= this.player.y &&
        b.y <= this.player.y + this.player.h
      ) {
        this.damagePlayer(25);
        this.enemyBullets.splice(i, 1);
        soundToPlay = 'die';
        continue;
      }

      if (b.x < 0 || b.y < 0 || b.y > ARENA_H) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // 9. Update Particles & Float Texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const t = this.floatTexts[i];
      t.y -= 25 * dt;
      t.life -= 1.2 * dt;
      if (t.life <= 0) this.floatTexts.splice(i, 1);
    }

    return soundToPlay;
  }

  private damagePlayer(amount: number): void {
    this.player.shield -= amount;
    this.spawnExplosion(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      8,
      '#FF0055'
    );

    if (this.player.shield <= 0) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
      } else {
        this.player.shield = 100;
        this.player.x = 24;
        this.player.y = ARENA_H / 2 - 8;
        this.addFloatText(this.player.x, this.player.y, 'RESPAWNED!', '#00F0FF');
      }
    }
  }

  private spawnExplosion(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2,
        color,
        life: 1.0,
        decay: 2.0 + Math.random() * 1.5,
      });
    }
  }

  private addFloatText(x: number, y: number, text: string, color: string): void {
    this.floatTexts.push({
      id: this.nextEntityId++,
      text,
      x: Math.max(16, Math.min(ARENA_W - 70, x)),
      y,
      color,
      life: 1.0,
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
      message: this.gameOver ? 'M.I.A. (GAME OVER)' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : this.isMenu
        ? 'D-PAD: PILOT • [A]: FIRE • [B]: EMP BOMB'
        : `BOMBS: ${this.bombs} [B]`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const starColor = isLight ? palette.pixelOn : '#FFFFFF';
    const bulletColor = isLight ? palette.pixelOn : '#00F0FF';
    const enemyBulletColor = isLight ? palette.pixelOn : '#FF0055';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* EMP Screen Flash Effect */}
        {this.flashScreenTimer > 0 && (
          <View
            style={[
              styles.screenFlash,
              {
                backgroundColor: isLight ? palette.pixelOn : '#00F0FF',
                opacity: this.flashScreenTimer * 2,
              },
            ]}
          />
        )}

        {/* Parallax Starfield */}
        {this.stars.map((s, idx) => (
          <View
            key={idx}
            style={[
              styles.star,
              {
                left: `${(s.x / ARENA_W) * 100}%`,
                top: `${(s.y / ARENA_H) * 100}%`,
                width: s.size,
                height: s.size,
                backgroundColor: starColor,
                opacity: isLight ? s.opacity * 0.45 : s.opacity,
              },
            ]}
          />
        ))}

        {/* Player Spaceship */}
        <View
          style={[
            styles.playerShip,
            {
              left: `${(this.player.x / ARENA_W) * 100}%`,
              top: `${(this.player.y / ARENA_H) * 100}%`,
              width: `${(this.player.w / ARENA_W) * 100}%`,
              height: `${(this.player.h / ARENA_H) * 100}%`,
              borderColor: palette.bezelAccent,
              backgroundColor: isLight ? palette.pixelOn : '#0A1320',
            },
          ]}
        >
          {/* Cockpit */}
          <View
            style={[
              styles.playerCockpit,
              { backgroundColor: isLight ? palette.screenBg : '#00F0FF' },
            ]}
          />
          {/* Thruster Jet Flame */}
          <View
            style={[
              styles.thrusterFlame,
              { backgroundColor: isLight ? palette.pixelOn : '#FF9F0A' },
            ]}
          />
        </View>

        {/* Player Shield Bar (Floating under ship) */}
        <View
          style={[
            styles.shieldBarWrap,
            {
              left: `${(this.player.x / ARENA_W) * 100}%`,
              top: `${((this.player.y + this.player.h + 2) / ARENA_H) * 100}%`,
            },
          ]}
        >
          <View
            style={[
              styles.shieldBarFill,
              {
                width: `${(this.player.shield / this.player.maxShield) * 100}%`,
                backgroundColor: palette.bezelAccent,
              },
            ]}
          />
        </View>

        {/* Player Bullets */}
        {this.playerBullets.map((b) => (
          <View
            key={b.id}
            style={[
              styles.playerBullet,
              {
                left: `${(b.x / ARENA_W) * 100}%`,
                top: `${(b.y / ARENA_H) * 100}%`,
                backgroundColor: bulletColor,
              },
            ]}
          />
        ))}

        {/* Enemies */}
        {this.enemies.map((e) => {
          const isBoss = e.type === 'boss';
          const isCruiser = e.type === 'cruiser';

          return (
            <View
              key={e.id}
              style={[
                styles.enemyShip,
                {
                  left: `${(e.x / ARENA_W) * 100}%`,
                  top: `${(e.y / ARENA_H) * 100}%`,
                  width: `${(e.w / ARENA_W) * 100}%`,
                  height: `${(e.h / ARENA_H) * 100}%`,
                  backgroundColor: isLight
                    ? palette.pixelOn
                    : isBoss
                    ? '#FF0055'
                    : isCruiser
                    ? '#FF9F0A'
                    : palette.bezelAccent,
                  borderRadius: isBoss ? 6 : 2,
                },
              ]}
            >
              {isBoss && (
                <View style={styles.bossCore}>
                  <View style={styles.bossEye} />
                </View>
              )}
            </View>
          );
        })}

        {/* Enemy Bullets */}
        {this.enemyBullets.map((b) => (
          <View
            key={b.id}
            style={[
              styles.enemyBullet,
              {
                left: `${(b.x / ARENA_W) * 100}%`,
                top: `${(b.y / ARENA_H) * 100}%`,
                backgroundColor: enemyBulletColor,
              },
            ]}
          />
        ))}

        {/* Explosions & Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: `${(p.x / ARENA_W) * 100}%`,
                top: `${(p.y / ARENA_H) * 100}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
              },
            ]}
          />
        ))}

        {/* Float Texts */}
        {this.floatTexts.map((t) => (
          <Text
            key={t.id}
            style={[
              styles.floatText,
              {
                left: `${(t.x / ARENA_W) * 100}%`,
                top: `${(t.y / ARENA_H) * 100}%`,
                color: t.color,
                opacity: t.life,
              },
            ]}
          >
            {t.text}
          </Text>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screenFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    borderRadius: 1,
  },
  playerShip: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
  },
  playerCockpit: {
    position: 'absolute',
    right: 4,
    width: 5,
    height: 4,
    borderRadius: 1,
  },
  thrusterFlame: {
    position: 'absolute',
    left: -4,
    width: 4,
    height: 5,
    borderRadius: 2,
  },
  shieldBarWrap: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#1E293B',
    borderRadius: 1,
    overflow: 'hidden',
  },
  shieldBarFill: {
    height: '100%',
  },
  playerBullet: {
    position: 'absolute',
    width: 7,
    height: 2.5,
    borderRadius: 1,
  },
  enemyShip: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FFFFFF44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossCore: {
    width: 14,
    height: 14,
    backgroundColor: '#000000',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossEye: {
    width: 6,
    height: 6,
    backgroundColor: '#00F0FF',
    borderRadius: 3,
  },
  enemyBullet: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
  floatText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
