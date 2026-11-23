export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: 'flappy-cyber',
    name: 'FLAPPY CYBER',
    description: 'Nostalgic Flappy Bird: Tap [A] to flap and dodge neon laser pipes!',
    code: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ARENA_W = 320;
const ARENA_H = 240;

export default class FlappyGame {
  constructor() {
    this.init();
  }

  init() {
    this.birdY = 110;
    this.birdVy = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.pipes = [
      { x: 260, topH: 60, gap: 75, scored: false },
      { x: 420, topH: 80, gap: 75, scored: false },
    ];
  }

  reset() {
    this.init();
  }

  update(input, dt) {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        this.birdVy = -190;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a) {
        this.reset();
        return 'hit';
      }
      return null;
    }

    let sound = null;

    // Flap on [A] button
    if (input.a && !this.wasAPressed) {
      this.birdVy = -190;
      sound = 'hit';
    }
    this.wasAPressed = input.a;

    // Gravity
    this.birdVy += 480 * dt;
    this.birdY += this.birdVy * dt;

    // Pipes scroll left
    const pipeSpeed = 95;
    for (let p of this.pipes) {
      p.x -= pipeSpeed * dt;

      // Score passing pipe
      if (!p.scored && p.x + 30 < 50) {
        p.scored = true;
        this.score += 100;
        sound = 'score';
      }

      // Recycle pipe
      if (p.x < -35) {
        p.x = ARENA_W + 20;
        p.topH = 35 + Math.random() * 85;
        p.scored = false;
      }

      // Pipe collision check
      const inX = 50 + 7 >= p.x && 50 - 7 <= p.x + 30;
      if (inX) {
        if (this.birdY - 7 < p.topH || this.birdY + 7 > p.topH + p.gap) {
          this.gameOver = true;
          return 'die';
        }
      }
    }

    // Floor / Ceiling collision
    if (this.birdY > ARENA_H - 12 || this.birdY < 8) {
      this.gameOver = true;
      return 'die';
    }

    return sound;
  }

  getStats() {
    return {
      score: this.score,
      highScore: this.score,
      lives: this.gameOver ? 0 : 1,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : undefined,
    };
  }

  renderEntities(palette) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Pipes */}
        {this.pipes.map((p, idx) => (
          <React.Fragment key={idx}>
            {/* Top Pipe */}
            <View
              style={{
                position: 'absolute',
                left: (p.x / ARENA_W) * 100 + '%',
                top: 0,
                width: (30 / ARENA_W) * 100 + '%',
                height: (p.topH / ARENA_H) * 100 + '%',
                backgroundColor: palette.pixelOn,
                borderColor: palette.bezelAccent,
                borderWidth: 1.5,
              }}
            />
            {/* Bottom Pipe */}
            <View
              style={{
                position: 'absolute',
                left: (p.x / ARENA_W) * 100 + '%',
                top: ((p.topH + p.gap) / ARENA_H) * 100 + '%',
                width: (30 / ARENA_W) * 100 + '%',
                bottom: 0,
                backgroundColor: palette.pixelOn,
                borderColor: palette.bezelAccent,
                borderWidth: 1.5,
              }}
            />
          </React.Fragment>
        ))}

        {/* Flappy Bird */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: ((50 - 8) / ARENA_W) * 100 + '%',
              top: ((this.birdY - 8) / ARENA_H) * 100 + '%',
              width: (16 / ARENA_W) * 100 + '%',
              height: (16 / ARENA_H) * 100 + '%',
              borderRadius: 8,
              backgroundColor: palette.isLightLcd ? palette.pixelOn : '#FFD700',
              borderColor: palette.isLightLcd ? palette.pixelOn : '#FFFFFF',
              borderWidth: 1.5,
            }}
          />
        )}
      </View>
    );
  }
}
`,
  },
  {
    id: 'pong-retro',
    name: 'CYBER PONG',
    description: 'Classic Pong: Use ◀ / ▶ to move paddle & return the speeding ball!',
    code: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ARENA_W = 320;
const ARENA_H = 240;

export default class CyberPong {
  constructor() {
    this.init();
  }

  init() {
    this.paddleX = 130;
    this.paddleW = 55;
    this.ballX = 160;
    this.ballY = 70;
    this.ballVx = 120;
    this.ballVy = 130;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
  }

  reset() {
    this.init();
  }

  update(input, dt) {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a) {
        this.reset();
        return 'hit';
      }
      return null;
    }

    let sound = null;

    // Move Paddle
    const paddleSpeed = 240;
    if (input.left) this.paddleX -= paddleSpeed * dt;
    if (input.right) this.paddleX += paddleSpeed * dt;
    this.paddleX = Math.max(8, Math.min(ARENA_W - this.paddleW - 8, this.paddleX));

    // Ball motion
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    // Bounce Walls
    if (this.ballX - 6 <= 6) {
      this.ballX = 12;
      this.ballVx = Math.abs(this.ballVx);
      sound = 'hit';
    } else if (this.ballX + 6 >= ARENA_W - 6) {
      this.ballX = ARENA_W - 12;
      this.ballVx = -Math.abs(this.ballVx);
      sound = 'hit';
    }

    if (this.ballY - 6 <= 6) {
      this.ballY = 12;
      this.ballVy = Math.abs(this.ballVy);
      sound = 'hit';
    }

    // Paddle Hit
    const paddleY = ARENA_H - 26;
    if (
      this.ballVy > 0 &&
      this.ballY + 6 >= paddleY &&
      this.ballY - 6 <= paddleY + 8 &&
      this.ballX >= this.paddleX - 4 &&
      this.ballX <= this.paddleX + this.paddleW + 4
    ) {
      this.ballVy = -Math.abs(this.ballVy) * 1.05; // speed up slightly
      this.ballVx += (this.ballX - (this.paddleX + this.paddleW / 2)) * 3;
      this.score += 50;
      sound = 'score';
    }

    // Missed Paddle
    if (this.ballY > ARENA_H + 10) {
      this.lives--;
      sound = 'die';
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      // Respawn ball
      this.ballX = ARENA_W / 2;
      this.ballY = 70;
      this.ballVy = 130;
      this.ballVx = Math.random() > 0.5 ? 120 : -120;
    }

    return sound;
  }

  getStats() {
    return {
      score: this.score,
      highScore: this.score,
      lives: this.lives,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : undefined,
    };
  }

  renderEntities(palette) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Paddle */}
        <View
          style={{
            position: 'absolute',
            left: (this.paddleX / ARENA_W) * 100 + '%',
            top: ((ARENA_H - 26) / ARENA_H) * 100 + '%',
            width: (this.paddleW / ARENA_W) * 100 + '%',
            height: (8 / ARENA_H) * 100 + '%',
            backgroundColor: palette.pixelOn,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: palette.isLightLcd ? palette.pixelOn : '#FFFFFF',
          }}
        />

        {/* Ball */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: ((this.ballX - 6) / ARENA_W) * 100 + '%',
              top: ((this.ballY - 6) / ARENA_H) * 100 + '%',
              width: (12 / ARENA_W) * 100 + '%',
              height: (12 / ARENA_H) * 100 + '%',
              borderRadius: 6,
              backgroundColor: palette.isLightLcd ? palette.pixelOn : '#FF3B30',
              borderWidth: 1,
              borderColor: palette.isLightLcd ? palette.pixelOn : '#FFFFFF',
            }}
          />
        )}
      </View>
    );
  }
}
`,
  },
  {
    id: 'meteor-dodge',
    name: 'METEOR DODGE',
    description: 'Space Evasion: Steer ship with D-Pad & dodge falling meteors!',
    code: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ARENA_W = 320;
const ARENA_H = 240;

export default class MeteorDodge {
  constructor() {
    this.init();
  }

  init() {
    this.playerX = 150;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
    this.meteors = [];
    for (let i = 0; i < 5; i++) {
      this.meteors.push({
        x: Math.random() * (ARENA_W - 20) + 10,
        y: -Math.random() * 200,
        speed: 80 + Math.random() * 110,
        size: 10 + Math.random() * 8,
      });
    }
  }

  reset() {
    this.init();
  }

  update(input, dt) {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a) {
        this.reset();
        return 'hit';
      }
      return null;
    }

    let sound = null;

    // Move Ship
    const speed = 200;
    if (input.left) this.playerX -= speed * dt;
    if (input.right) this.playerX += speed * dt;
    this.playerX = Math.max(12, Math.min(ARENA_W - 28, this.playerX));

    // Score over time
    this.score += Math.round(dt * 30);

    // Update Meteors
    const playerY = ARENA_H - 30;
    for (let m of this.meteors) {
      m.y += m.speed * dt;

      // Recycle meteor
      if (m.y > ARENA_H + 10) {
        m.y = -20;
        m.x = Math.random() * (ARENA_W - 20) + 10;
        m.speed = 90 + Math.random() * 120;
      }

      // Collision check with player
      const dist = Math.hypot(this.playerX + 8 - m.x, playerY + 8 - m.y);
      if (dist < m.size + 6) {
        this.lives--;
        m.y = -30;
        sound = 'explode';
        if (this.lives <= 0) {
          this.gameOver = true;
          return 'gameover';
        }
      }
    }

    return sound;
  }

  getStats() {
    return {
      score: this.score,
      highScore: this.score,
      lives: this.lives,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : undefined,
    };
  }

  renderEntities(palette) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Meteors */}
        {this.meteors.map((m, idx) => (
          <View
            key={idx}
            style={{
              position: 'absolute',
              left: ((m.x - m.size / 2) / ARENA_W) * 100 + '%',
              top: ((m.y - m.size / 2) / ARENA_H) * 100 + '%',
              width: (m.size / ARENA_W) * 100 + '%',
              height: (m.size / ARENA_H) * 100 + '%',
              borderRadius: m.size / 2,
              backgroundColor: palette.isLightLcd ? palette.pixelOn : '#FF2A6D',
              borderWidth: 1,
              borderColor: palette.isLightLcd ? palette.pixelOn : '#FFAA00',
            }}
          />
        ))}

        {/* Player Ship */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: (this.playerX / ARENA_W) * 100 + '%',
              top: ((ARENA_H - 30) / ARENA_H) * 100 + '%',
              width: (18 / ARENA_W) * 100 + '%',
              height: (14 / ARENA_H) * 100 + '%',
              backgroundColor: palette.pixelOn,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderColor: palette.isLightLcd ? palette.pixelOn : '#FFFFFF',
              borderWidth: 1,
            }}
          />
        )}
      </View>
    );
  }
}
`,
  },
  {
    id: 'starter-blank',
    name: 'STARTER BLANK',
    description: 'Clean minimalist boilerplate to build any custom game from scratch.',
    code: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ARENA_W = 320;
const ARENA_H = 240;

export default class MyCustomGame {
  constructor() {
    this.init();
  }

  init() {
    this.x = 160;
    this.y = 120;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
  }

  reset() {
    this.init();
  }

  update(input, dt) {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a) {
        this.reset();
        return 'hit';
      }
      return null;
    }

    let sound = null;

    // Controls: D-Pad
    const speed = 150;
    if (input.left) this.x -= speed * dt;
    if (input.right) this.x += speed * dt;
    if (input.up) this.y -= speed * dt;
    if (input.down) this.y += speed * dt;

    // [A] Button action: score & sound
    if (input.a) {
      this.score += 10;
      sound = 'hit';
    }

    return sound;
  }

  getStats() {
    return {
      score: this.score,
      highScore: this.score,
      lives: this.lives,
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : undefined,
    };
  }

  renderEntities(palette) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Player Avatar */}
        <View
          style={{
            position: 'absolute',
            left: ((this.x - 10) / ARENA_W) * 100 + '%',
            top: ((this.y - 10) / ARENA_H) * 100 + '%',
            width: (20 / ARENA_W) * 100 + '%',
            height: (20 / ARENA_H) * 100 + '%',
            borderRadius: 10,
            backgroundColor: palette.pixelOn,
            borderColor: palette.isLightLcd ? palette.pixelOn : '#FFFFFF',
            borderWidth: 1.5,
          }}
        />
      </View>
    );
  }
}
`,
  },
];
