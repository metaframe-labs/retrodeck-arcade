import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Pipe {
  id: number;
  x: number;
  gapY: number; // center of gap
  gapH: number;
  scored: boolean;
}

export class FlappyPixelGame implements ArcadeGameInstance {
  private readonly birdX = 72;
  private birdY = ARENA_H / 2;
  private birdVy = 0;
  private readonly birdSize = 14;
  private readonly gravity = 760;
  private readonly flapVel = -245;

  private pipes: Pipe[] = [];
  private pipeTimer = 0;
  private pipeSpeed = 105;
  private nextId = 1;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
  private lastA = false;
  private lastUp = false;

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
    this.birdY = ARENA_H / 2;
    this.birdVy = 0;
    this.pipes = [];
    this.pipeTimer = 0.8;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;
    const flapPressed = (input.a && !this.lastA) || (input.up && !this.lastUp);

    if (this.isMenu) {
      if (flapPressed) {
        this.isMenu = false;
        this.birdVy = this.flapVel;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        this.birdVy = this.flapVel;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    if (flapPressed) {
      this.birdVy = this.flapVel;
      sound = 'hit';
    }

    this.birdVy = Math.min(340, this.birdVy + this.gravity * dt);
    this.birdY += this.birdVy * dt;

    // Ground / Ceiling hit
    if (this.birdY <= 4 || this.birdY + this.birdSize >= ARENA_H - 14) {
      this.gameOver = true;
      this.lastA = input.a;
      this.lastUp = input.up;
      return 'gameover';
    }

    // Spawn pipes
    this.pipeTimer -= dt;
    if (this.pipeTimer <= 0) {
      this.pipeTimer = 1.45;
      const gapH = Math.max(58, 76 - Math.floor(this.score / 8) * 2);
      const gapY = 55 + Math.random() * (ARENA_H - 125);
      this.pipes.push({
        id: this.nextId++,
        x: ARENA_W + 20,
        gapY,
        gapH,
        scored: false,
      });
    }

    const pipeW = 28;
    const speed = Math.min(165, this.pipeSpeed + this.score * 1.5);

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= speed * dt;

      if (!p.scored && p.x + pipeW < this.birdX) {
        p.scored = true;
        this.score++;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'score';
      }

      if (p.x + pipeW < -20) {
        this.pipes.splice(i, 1);
        continue;
      }

      // Collision check
      const bx1 = this.birdX + 2;
      const bx2 = this.birdX + this.birdSize - 2;
      const by1 = this.birdY + 2;
      const by2 = this.birdY + this.birdSize - 2;

      if (bx2 > p.x && bx1 < p.x + pipeW) {
        const topBottom = p.gapY - p.gapH / 2;
        const botTop = p.gapY + p.gapH / 2;
        if (by1 < topBottom || by2 > botTop) {
          this.gameOver = true;
          this.lastA = input.a;
          this.lastUp = input.up;
          return 'gameover';
        }
      }
    }

    this.lastA = input.a;
    this.lastUp = input.up;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: Math.floor(this.score / 10) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BONK!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '[A] OR [▲]: FLAP WINGS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ground */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, backgroundColor: pixelColor, opacity: 0.35 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, height: 2, backgroundColor: pixelColor }} />

        {/* Pipes */}
        {this.pipes.map((p) => {
          const topH = Math.max(0, p.gapY - p.gapH / 2);
          const botTop = p.gapY + p.gapH / 2;
          const botH = Math.max(0, ARENA_H - 14 - botTop);
          return (
            <React.Fragment key={p.id}>
              {/* Top Pipe */}
              <View style={{ position: 'absolute', left: p.x, top: 0, width: 28, height: topH, backgroundColor: pixelColor, borderWidth: 1, borderColor: bg }} />
              <View style={{ position: 'absolute', left: p.x - 3, top: Math.max(0, topH - 8), width: 34, height: 8, backgroundColor: pixelColor, borderWidth: 1, borderColor: bg }} />
              {/* Bottom Pipe */}
              <View style={{ position: 'absolute', left: p.x, top: botTop, width: 28, height: botH, backgroundColor: pixelColor, borderWidth: 1, borderColor: bg }} />
              <View style={{ position: 'absolute', left: p.x - 3, top: botTop, width: 34, height: 8, backgroundColor: pixelColor, borderWidth: 1, borderColor: bg }} />
            </React.Fragment>
          );
        })}

        {/* Bird */}
        <View
          style={{
            position: 'absolute',
            left: this.birdX,
            top: this.birdY,
            width: 16,
            height: 13,
            backgroundColor: pixelColor,
            borderRadius: 5,
            transform: [{ rotate: `${Math.max(-28, Math.min(45, this.birdVy * 0.14))}deg` }],
          }}
        >
          {/* Eye */}
          <View style={{ position: 'absolute', right: 3, top: 2, width: 3, height: 3, borderRadius: 1.5, backgroundColor: bg }} />
          {/* Wing */}
          <View style={{ position: 'absolute', left: 3, top: 6, width: 6, height: 3, borderRadius: 1, backgroundColor: bg }} />
          {/* Beak */}
          <View style={{ position: 'absolute', right: -3, top: 6, width: 4, height: 3, backgroundColor: pixelColor }} />
        </View>

        {/* Big Center Score */}
        {!this.isMenu && (
          <Text style={[styles.bigScore, { color: pixelColor }]}>{this.score}</Text>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>FLAPPY PIXEL</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TAP TO FLAP THROUGH PIPES</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FLY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  bigScore: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    opacity: 0.45,
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
