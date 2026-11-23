import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const PADDLE_W = 7;
const PADDLE_H = 42;
const BALL_SIZE = 7;

export class PongGame implements ArcadeGameInstance {
  private playerY = ARENA_H / 2 - PADDLE_H / 2;
  private aiY = ARENA_H / 2 - PADDLE_H / 2;
  private readonly playerX = 16;
  private readonly aiX = ARENA_W - 16 - PADDLE_W;

  private ballX = ARENA_W / 2;
  private ballY = ARENA_H / 2;
  private ballVx = 160;
  private ballVy = 90;
  private rally = 0;

  private playerPts = 0;
  private aiPts = 0;
  private score = 0;
  private highScore = 0;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private winnerText = '';

  private serveTimer = 0;
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
    this.playerY = ARENA_H / 2 - PADDLE_H / 2;
    this.aiY = ARENA_H / 2 - PADDLE_H / 2;
    this.playerPts = 0;
    this.aiPts = 0;
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.winnerText = '';
    this.serveBall(1);
  }

  private serveBall(dir: number): void {
    this.ballX = ARENA_W / 2 - BALL_SIZE / 2;
    this.ballY = ARENA_H / 2 - BALL_SIZE / 2;
    const speed = 155 + (this.level - 1) * 18;
    const angle = (Math.random() - 0.5) * 0.9;
    this.ballVx = Math.cos(angle) * speed * dir;
    this.ballVy = Math.sin(angle) * speed;
    this.rally = 0;
    this.serveTimer = 0.6;
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

    // Player paddle
    const paddleSpeed = 210;
    if (input.up) this.playerY = Math.max(8, this.playerY - paddleSpeed * dt);
    if (input.down) this.playerY = Math.min(ARENA_H - 8 - PADDLE_H, this.playerY + paddleSpeed * dt);

    // AI paddle (scales with level, fair reaction speed)
    const aiSpeed = Math.min(220, 125 + (this.level - 1) * 20);
    const aiCenter = this.aiY + PADDLE_H / 2;
    const targetY = this.ballVx > 0 ? this.ballY + BALL_SIZE / 2 : ARENA_H / 2;
    if (Math.abs(targetY - aiCenter) > 5) {
      this.aiY += Math.sign(targetY - aiCenter) * aiSpeed * dt;
      this.aiY = Math.max(8, Math.min(ARENA_H - 8 - PADDLE_H, this.aiY));
    }

    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      this.lastA = input.a;
      return sound;
    }

    // Move Ball
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    // Top / Bottom wall bounce
    if (this.ballY <= 6) {
      this.ballY = 6;
      this.ballVy = Math.abs(this.ballVy);
      sound = 'hit';
    } else if (this.ballY + BALL_SIZE >= ARENA_H - 6) {
      this.ballY = ARENA_H - 6 - BALL_SIZE;
      this.ballVy = -Math.abs(this.ballVy);
      sound = 'hit';
    }

    // Player paddle hit
    if (
      this.ballVx < 0 &&
      this.ballX <= this.playerX + PADDLE_W &&
      this.ballX + BALL_SIZE >= this.playerX &&
      this.ballY + BALL_SIZE >= this.playerY &&
      this.ballY <= this.playerY + PADDLE_H
    ) {
      this.ballX = this.playerX + PADDLE_W;
      this.rally++;
      const rel = (this.ballY + BALL_SIZE / 2 - (this.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(340, Math.hypot(this.ballVx, this.ballVy) * 1.06);
      const bounceAngle = rel * 1.05;
      this.ballVx = Math.cos(bounceAngle) * speed;
      this.ballVy = Math.sin(bounceAngle) * speed;
      this.score += 15;
      if (this.score > this.highScore) this.highScore = this.score;
      sound = 'hit';
    }

    // AI paddle hit
    if (
      this.ballVx > 0 &&
      this.ballX + BALL_SIZE >= this.aiX &&
      this.ballX <= this.aiX + PADDLE_W &&
      this.ballY + BALL_SIZE >= this.aiY &&
      this.ballY <= this.aiY + PADDLE_H
    ) {
      this.ballX = this.aiX - BALL_SIZE;
      this.rally++;
      const rel = (this.ballY + BALL_SIZE / 2 - (this.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(340, Math.hypot(this.ballVx, this.ballVy) * 1.05);
      const bounceAngle = rel * 1.05;
      this.ballVx = -Math.cos(bounceAngle) * speed;
      this.ballVy = Math.sin(bounceAngle) * speed;
      sound = 'hit';
    }

    // Scoring
    if (this.ballX < -10) {
      this.aiPts++;
      if (this.aiPts >= 7) {
        this.gameOver = true;
        this.winnerText = 'CPU WINS!';
        sound = 'gameover';
      } else {
        this.serveBall(1);
        sound = 'die';
      }
    } else if (this.ballX > ARENA_W + 10) {
      this.playerPts++;
      this.score += 150;
      if (this.score > this.highScore) this.highScore = this.score;
      if (this.playerPts >= 7) {
        this.level++;
        this.playerPts = 0;
        this.aiPts = 0;
        this.score += 500;
        if (this.score > this.highScore) this.highScore = this.score;
        this.serveBall(-1);
        sound = 'levelclear';
      } else {
        this.serveBall(-1);
        sound = 'score';
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, 7 - this.aiPts),
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? this.winnerText : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO REMATCH' : '▲ / ▼: PADDLE • FIRST TO 7 WINS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    const netDots = [];
    for (let y = 10; y < ARENA_H - 10; y += 14) netDots.push(y);

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top & Bottom Court Borders */}
        <View style={[styles.courtLine, { top: 4, backgroundColor: pixelColor }]} />
        <View style={[styles.courtLine, { bottom: 4, backgroundColor: pixelColor }]} />

        {/* Center Net */}
        {netDots.map((ny, i) => (
          <View
            key={`net-${i}`}
            style={{
              position: 'absolute',
              left: ARENA_W / 2 - 1,
              top: ny,
              width: 2,
              height: 7,
              backgroundColor: pixelColor,
              opacity: 0.45,
            }}
          />
        ))}

        {/* Big Scoreboard */}
        <Text style={[styles.scoreLeft, { color: pixelColor }]}>{this.playerPts}</Text>
        <Text style={[styles.scoreRight, { color: pixelColor }]}>{this.aiPts}</Text>

        {/* Paddles */}
        <View
          style={{
            position: 'absolute',
            left: this.playerX,
            top: this.playerY,
            width: PADDLE_W,
            height: PADDLE_H,
            backgroundColor: pixelColor,
            borderRadius: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: this.aiX,
            top: this.aiY,
            width: PADDLE_W,
            height: PADDLE_H,
            backgroundColor: pixelColor,
            borderRadius: 2,
          }}
        />

        {/* Ball */}
        <View
          style={{
            position: 'absolute',
            left: this.ballX,
            top: this.ballY,
            width: BALL_SIZE,
            height: BALL_SIZE,
            backgroundColor: pixelColor,
            borderRadius: 1,
          }}
        />

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PONG DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CLASSIC TABLE TENNIS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SERVE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  courtLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
  },
  scoreLeft: {
    position: 'absolute',
    top: 16,
    left: ARENA_W / 2 - 48,
    width: 36,
    textAlign: 'right',
    fontSize: 26,
    fontWeight: '900',
    opacity: 0.35,
    fontVariant: ['tabular-nums'],
  },
  scoreRight: {
    position: 'absolute',
    top: 16,
    left: ARENA_W / 2 + 12,
    width: 36,
    textAlign: 'left',
    fontSize: 26,
    fontWeight: '900',
    opacity: 0.35,
    fontVariant: ['tabular-nums'],
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
