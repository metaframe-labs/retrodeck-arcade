import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, FloatText, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Brick {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  colorType: 'primary' | 'accent' | 'gold';
  powerUp?: 'W' | 'M' | 'L' | 'S' | '+';
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stuckToPaddle: boolean;
}

interface PowerUpItem {
  id: number;
  type: 'W' | 'M' | 'L' | 'S' | '+';
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
}

interface LaserBolt {
  id: number;
  x: number;
  y: number;
  vy: number;
}

export class BreakoutGame implements ArcadeGameInstance {
  private paddle = {
    x: ARENA_W / 2 - 26,
    y: ARENA_H - 18,
    w: 52,
    h: 8,
    vx: 0,
    speed: 185,
  };

  private balls: Ball[] = [];
  private bricks: Brick[] = [];
  private powerUps: PowerUpItem[] = [];
  private lasers: LaserBolt[] = [];
  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private gameWon = false;
  private isMenu = true;

  private wideTimer = 0;
  private laserTimer = 0;
  private lastShootTime = 0;
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
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.gameWon = false;
    this.isMenu = true;
    this.particles = [];
    this.floatTexts = [];
    this.lasers = [];
    this.powerUps = [];
    this.wideTimer = 0;
    this.laserTimer = 0;
    this.resetPaddle();
    this.buildLevel(this.level);
  }

  public reset(): void {
    this.init();
  }

  private resetPaddle(): void {
    this.paddle.w = 52;
    this.paddle.x = ARENA_W / 2 - this.paddle.w / 2;
    this.paddle.vx = 0;
    this.balls = [
      {
        x: this.paddle.x + this.paddle.w / 2,
        y: this.paddle.y - 7,
        vx: 60,
        vy: -95,
        radius: 4,
        stuckToPaddle: true,
      },
    ];
  }

  private buildLevel(lvl: number): void {
    this.bricks = [];
    const rows = Math.min(6, 3 + lvl);
    const cols = 8;
    const bW = 34;
    const bH = 10;
    const gap = 4;
    const startX = (ARENA_W - (cols * (bW + gap) - gap)) / 2;
    const startY = 32;

    const powerTypes: ('W' | 'M' | 'L' | 'S' | '+')[] = ['W', 'M', 'L', 'S', '+'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip some bricks in later levels for cool layouts
        if (lvl === 2 && (r + c) % 2 === 1 && r > 0) continue;
        if (lvl === 3 && (c === 0 || c === 7) && r > 2) continue;

        let hp = 1;
        let colorType: 'primary' | 'accent' | 'gold' = 'primary';
        if (r === 0) {
          hp = 3;
          colorType = 'gold';
        } else if (r === 1 || r === 2) {
          hp = 2;
          colorType = 'accent';
        }

        // 22% chance of power-up
        const hasPower = Math.random() < 0.24;
        const powerUp = hasPower
          ? powerTypes[Math.floor(Math.random() * powerTypes.length)]
          : undefined;

        this.bricks.push({
          id: this.nextEntityId++,
          x: startX + c * (bW + gap),
          y: startY + r * (bH + gap),
          w: bW,
          h: bH,
          hp,
          maxHp: hp,
          colorType,
          powerUp,
        });
      }
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver || this.gameWon) {
      if (input.a || input.b) {
        this.init();
        return 'hit';
      }
      return null;
    }

    let soundToPlay: ArcadeSound | null = null;

    // 1. Paddle Movement
    let targetVx = 0;
    if (input.left) targetVx -= this.paddle.speed;
    if (input.right) targetVx += this.paddle.speed;

    // Smooth paddle velocity interpolation
    this.paddle.vx += (targetVx - this.paddle.vx) * Math.min(1, dt * 18);
    this.paddle.x += this.paddle.vx * dt;

    // Clamp paddle to screen edges
    if (this.paddle.x < 4) {
      this.paddle.x = 4;
      this.paddle.vx = 0;
    } else if (this.paddle.x + this.paddle.w > ARENA_W - 4) {
      this.paddle.x = ARENA_W - 4 - this.paddle.w;
      this.paddle.vx = 0;
    }

    // Power-up timers
    if (this.wideTimer > 0) {
      this.wideTimer -= dt;
      if (this.wideTimer <= 0) {
        this.paddle.w = 52;
      }
    }
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
    }

    // Launch stuck ball on press A or Up
    if ((input.a || input.up) && this.balls.some((b) => b.stuckToPaddle)) {
      for (const b of this.balls) {
        if (b.stuckToPaddle) {
          b.stuckToPaddle = false;
          b.vx = this.paddle.vx * 0.3 + (Math.random() > 0.5 ? 55 : -55);
          b.vy = -105;
          soundToPlay = 'hit';
        }
      }
    }

    // Laser Cannon Shooting
    if (this.laserTimer > 0 && input.a && Date.now() - this.lastShootTime > 280) {
      this.lastShootTime = Date.now();
      this.lasers.push({
        id: this.nextEntityId++,
        x: this.paddle.x + 6,
        y: this.paddle.y - 4,
        vy: -220,
      });
      this.lasers.push({
        id: this.nextEntityId++,
        x: this.paddle.x + this.paddle.w - 8,
        y: this.paddle.y - 4,
        vy: -220,
      });
      soundToPlay = 'shoot';
    }

    // 2. Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;

      // Hit brick
      let hit = false;
      for (let bi = this.bricks.length - 1; bi >= 0; bi--) {
        const b = this.bricks[bi];
        if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
          hit = true;
          this.damageBrick(bi);
          soundToPlay = 'explode';
          break;
        }
      }

      if (hit || l.y < 0) {
        this.lasers.splice(i, 1);
      }
    }

    // 3. Update Balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];

      if (b.stuckToPaddle) {
        b.x = this.paddle.x + this.paddle.w / 2;
        b.y = this.paddle.y - b.radius - 1;
        continue;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wall Bounce (Left / Right)
      if (b.x - b.radius <= 3) {
        b.x = 3 + b.radius;
        b.vx = Math.abs(b.vx);
        soundToPlay = 'hit';
      } else if (b.x + b.radius >= ARENA_W - 3) {
        b.x = ARENA_W - 3 - b.radius;
        b.vx = -Math.abs(b.vx);
        soundToPlay = 'hit';
      }

      // Wall Bounce (Ceiling)
      if (b.y - b.radius <= 3) {
        b.y = 3 + b.radius;
        b.vy = Math.abs(b.vy);
        soundToPlay = 'hit';
      }

      // Paddle Collision (Falso / Angle Physics!)
      if (
        b.y + b.radius >= this.paddle.y &&
        b.y - b.radius <= this.paddle.y + this.paddle.h &&
        b.x >= this.paddle.x - 2 &&
        b.x <= this.paddle.x + this.paddle.w + 2 &&
        b.vy > 0
      ) {
        // Calculate offset from paddle center: -1.0 (far left) .. +1.0 (far right)
        const paddleCenter = this.paddle.x + this.paddle.w / 2;
        const offset = (b.x - paddleCenter) / (this.paddle.w / 2);
        const clampedOffset = Math.max(-1, Math.min(1, offset));

        // Speed is capped comfortably
        const rawSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const currentSpeed = Math.max(110, Math.min(175, rawSpeed * 1.01));
        const maxAngle = (60 * Math.PI) / 180;
        const angle = clampedOffset * maxAngle;

        // Apply paddle velocity influence for authentic spin/falso
        b.vx = currentSpeed * Math.sin(angle) + this.paddle.vx * 0.2;
        b.vy = -Math.abs(currentSpeed * Math.cos(angle));

        // Spawn hit sparks
        this.spawnSparks(b.x, this.paddle.y, 4, '#FFFFFF');
        soundToPlay = 'hit';
      }

      // Brick Collision
      for (let bi = this.bricks.length - 1; bi >= 0; bi--) {
        const br = this.bricks[bi];
        if (
          b.x + b.radius >= br.x &&
          b.x - b.radius <= br.x + br.w &&
          b.y + b.radius >= br.y &&
          b.y - b.radius <= br.y + br.h
        ) {
          // Determine collision side
          const overlapLeft = b.x + b.radius - br.x;
          const overlapRight = br.x + br.w - (b.x - b.radius);
          const overlapTop = b.y + b.radius - br.y;
          const overlapBottom = br.y + br.h - (b.y - b.radius);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            b.vx = -b.vx;
          } else {
            b.vy = -b.vy;
          }

          this.damageBrick(bi);
          soundToPlay = 'explode';
          break;
        }
      }

      // Ball fell below screen
      if (b.y - b.radius > ARENA_H) {
        this.balls.splice(i, 1);
      }
    }

    // Check lost ball
    if (this.balls.length === 0) {
      this.lives--;
      soundToPlay = 'die';
      if (this.lives <= 0) {
        this.gameOver = true;
        soundToPlay = 'gameover';
      } else {
        this.resetPaddle();
      }
    }

    // 4. Update Falling Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += p.vy * dt;

      // Caught by paddle
      if (
        p.y + p.h >= this.paddle.y &&
        p.y <= this.paddle.y + this.paddle.h &&
        p.x + p.w >= this.paddle.x &&
        p.x <= this.paddle.x + this.paddle.w
      ) {
        this.applyPowerUp(p.type);
        this.powerUps.splice(i, 1);
        soundToPlay = 'powerup';
        continue;
      }

      // Missed
      if (p.y > ARENA_H) {
        this.powerUps.splice(i, 1);
      }
    }

    // 5. Update Particles & Float Texts
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

    // 6. Level Win Check
    if (this.bricks.length === 0) {
      this.level++;
      soundToPlay = 'levelclear';
      if (this.level > 3) {
        this.gameWon = true;
      } else {
        this.addFloatText(ARENA_W / 2, ARENA_H / 2, `STAGE ${this.level}!`, '#FFD700');
        this.buildLevel(this.level);
        this.resetPaddle();
      }
    }

    return soundToPlay;
  }

  private damageBrick(index: number): void {
    const br = this.bricks[index];
    br.hp--;

    // Spawn sparks
    this.spawnSparks(br.x + br.w / 2, br.y + br.h / 2, 8, br.colorType === 'gold' ? '#FFD700' : '#00F0FF');

    if (br.hp <= 0) {
      const pts = br.colorType === 'gold' ? 300 : br.colorType === 'accent' ? 180 : 100;
      this.score += pts;
      if (this.score > this.highScore) this.highScore = this.score;

      this.addFloatText(br.x + br.w / 2, br.y, `+${pts}`, '#FFFFFF');

      // Drop power-up if assigned
      if (br.powerUp) {
        this.powerUps.push({
          id: this.nextEntityId++,
          type: br.powerUp,
          x: br.x + br.w / 2 - 9,
          y: br.y,
          w: 18,
          h: 12,
          vy: 55,
        });
      }

      this.bricks.splice(index, 1);
    }
  }

  private applyPowerUp(type: 'W' | 'M' | 'L' | 'S' | '+'): void {
    switch (type) {
      case 'W': // Wide Paddle
        this.paddle.w = 78;
        this.wideTimer = 12;
        this.addFloatText(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12, 'WIDE PADDLE!', '#39FF14');
        break;

      case 'M': // Multi-Ball
        if (this.balls.length > 0) {
          const src = this.balls[0];
          this.balls.push(
            { x: src.x, y: src.y, vx: -85, vy: -100, radius: 4, stuckToPaddle: false },
            { x: src.x, y: src.y, vx: 85, vy: -100, radius: 4, stuckToPaddle: false }
          );
        }
        this.addFloatText(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12, 'MULTI-BALL!', '#00F0FF');
        break;

      case 'L': // Laser Cannon
        this.laserTimer = 10;
        this.addFloatText(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12, 'LASER MOUNTED [A]!', '#FF0055');
        break;

      case 'S': // Slow Ball
        for (const b of this.balls) {
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed > 170) {
            b.vx = (b.vx / speed) * 160;
            b.vy = (b.vy / speed) * 160;
          }
        }
        this.addFloatText(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12, 'SLOW BALL', '#FFD700');
        break;

      case '+': // Extra Life
        this.lives++;
        this.addFloatText(this.paddle.x + this.paddle.w / 2, this.paddle.y - 12, '+1 LIFE!', '#00FF66');
        break;
    }
  }

  private spawnSparks(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color,
        life: 1.0,
        decay: 2.2 + Math.random() * 1.5,
      });
    }
  }

  private addFloatText(x: number, y: number, text: string, color: string): void {
    this.floatTexts.push({
      id: this.nextEntityId++,
      text,
      x: Math.max(16, Math.min(ARENA_W - 60, x - 20)),
      y,
      color,
      life: 1.0,
    });
  }

  public getStats(): ArcadeStats {
    let msg: string | undefined;
    let subMsg: string | undefined;

    if (this.gameOver) {
      msg = 'GAME OVER';
      subMsg = 'PRESS [A] TO RETRY';
    } else if (this.gameWon) {
      msg = 'CYBER VICTORY!';
      subMsg = 'ALL LEVELS CLEARED';
    } else if (this.balls.some((b) => b.stuckToPaddle)) {
      msg = undefined;
      subMsg = 'PRESS [A] OR [▲] TO LAUNCH BALL';
    }

    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver || this.gameWon,
      isMenu: this.isMenu,
      message: msg,
      subMessage: subMsg,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Bricks */}
        {this.bricks.map((b) => {
          let bg: string;
          let bBorder: string;
          let pwrTextColor: string;

          if (isLight) {
            bBorder = palette.pixelOn;
            if (b.colorType === 'gold') {
              bg = palette.pixelOn;
              pwrTextColor = palette.screenBg;
            } else if (b.colorType === 'accent') {
              bg = 'rgba(23, 38, 22, 0.65)';
              pwrTextColor = palette.screenBg;
            } else {
              bg = 'rgba(23, 38, 22, 0.25)';
              pwrTextColor = palette.pixelOn;
            }
          } else {
            bg =
              b.colorType === 'gold'
                ? '#FFD700'
                : b.colorType === 'accent'
                ? palette.pixelOn
                : palette.bezelAccent;
            bBorder = '#FFFFFF33';
            pwrTextColor = '#000000';
          }

          const opacity = isLight ? 1 : Math.max(0.45, b.hp / b.maxHp);

          return (
            <View
              key={b.id}
              style={[
                styles.brick,
                {
                  left: `${(b.x / ARENA_W) * 100}%`,
                  top: `${(b.y / ARENA_H) * 100}%`,
                  width: `${(b.w / ARENA_W) * 100}%`,
                  height: `${(b.h / ARENA_H) * 100}%`,
                  backgroundColor: bg,
                  opacity,
                  borderColor: bBorder,
                  borderWidth: isLight ? 1 : 0.5,
                },
              ]}
            >
              {b.powerUp && (
                <Text style={[styles.brickPwrText, { color: pwrTextColor }]}>
                  {b.powerUp}
                </Text>
              )}
            </View>
          );
        })}

        {/* Falling Power-Ups */}
        {this.powerUps.map((p) => (
          <View
            key={p.id}
            style={[
              styles.powerCapsule,
              {
                left: `${(p.x / ARENA_W) * 100}%`,
                top: `${(p.y / ARENA_H) * 100}%`,
                width: `${(p.w / ARENA_W) * 100}%`,
                height: `${(p.h / ARENA_H) * 100}%`,
                borderColor: isLight ? palette.pixelOn : palette.pixelOn,
                backgroundColor: isLight ? palette.screenBg : '#0F172A',
                borderWidth: isLight ? 1.5 : 1.2,
              },
            ]}
          >
            <Text
              style={[
                styles.powerText,
                { color: isLight ? palette.pixelOn : palette.pixelOn },
              ]}
            >
              {p.type}
            </Text>
          </View>
        ))}

        {/* Laser Bolts */}
        {this.lasers.map((l) => (
          <View
            key={l.id}
            style={[
              styles.laserBolt,
              {
                left: `${(l.x / ARENA_W) * 100}%`,
                top: `${(l.y / ARENA_H) * 100}%`,
                backgroundColor: isLight ? palette.pixelOn : '#FF0055',
              },
            ]}
          />
        ))}

        {/* Paddle */}
        <View
          style={[
            styles.paddle,
            {
              left: `${(this.paddle.x / ARENA_W) * 100}%`,
              top: `${(this.paddle.y / ARENA_H) * 100}%`,
              width: `${(this.paddle.w / ARENA_W) * 100}%`,
              height: `${(this.paddle.h / ARENA_H) * 100}%`,
              backgroundColor: palette.pixelOn,
              borderColor: isLight ? palette.pixelOn : palette.bezelAccent,
            },
          ]}
        >
          {this.laserTimer > 0 && (
            <>
              <View
                style={[
                  styles.gunMount,
                  { left: 2, backgroundColor: isLight ? palette.screenBg : '#FF0055' },
                ]}
              />
              <View
                style={[
                  styles.gunMount,
                  { right: 2, backgroundColor: isLight ? palette.screenBg : '#FF0055' },
                ]}
              />
            </>
          )}
        </View>

        {/* Balls */}
        {this.balls.map((b, idx) => (
          <View
            key={idx}
            style={[
              styles.ball,
              {
                left: `${((b.x - b.radius) / ARENA_W) * 100}%`,
                top: `${((b.y - b.radius) / ARENA_H) * 100}%`,
                width: `${((b.radius * 2) / ARENA_W) * 100}%`,
                height: `${((b.radius * 2) / ARENA_H) * 100}%`,
                backgroundColor: isLight ? palette.pixelOn : '#FFFFFF',
                borderRadius: isLight ? 1.5 : 10,
                shadowColor: isLight ? 'transparent' : palette.pixelOn,
                borderWidth: isLight ? 1 : 0,
                borderColor: isLight ? palette.pixelOn : undefined,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            {isLight && (
              <View
                style={{
                  width: 2,
                  height: 2,
                  backgroundColor: palette.screenBg,
                  borderRadius: 0.5,
                }}
              />
            )}
          </View>
        ))}

        {/* Particles */}
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
                backgroundColor: isLight ? palette.pixelOn : p.color,
                opacity: isLight ? p.life * 0.9 : p.life,
              },
            ]}
          />
        ))}

        {/* Floating Popups */}
        {this.floatTexts.map((t) => (
          <Text
            key={t.id}
            style={[
              styles.floatText,
              {
                left: `${(t.x / ARENA_W) * 100}%`,
                top: `${(t.y / ARENA_H) * 100}%`,
                color: isLight ? palette.pixelOn : t.color,
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
  brick: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brickPwrText: {
    color: '#000000',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  paddle: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 1.2,
  },
  gunMount: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 4,
    borderRadius: 1,
  },
  ball: {
    position: 'absolute',
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  powerCapsule: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  laserBolt: {
    position: 'absolute',
    width: 2.5,
    height: 8,
    borderRadius: 1,
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
