import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const COLS = 40;
const ROWS = 30;
const CELL = 8; // 320x240 exact

interface Point {
  x: number;
  y: number;
}

export class TronCyclesGame implements ArcadeGameInstance {
  private occupied = new Set<string>();
  private pTrail: Point[] = [];
  private cTrail: Point[] = [];

  private px = 8;
  private py = 15;
  private pDir: Point = { x: 1, y: 0 };

  private cx = 31;
  private cy = 15;
  private cDir: Point = { x: -1, y: 0 };

  private stepTimer = 0;
  private roundMsg = '';
  private roundPause = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
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
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.startRound();
  }

  private startRound(): void {
    this.occupied.clear();
    this.px = 8;
    this.py = 15;
    this.pDir = { x: 1, y: 0 };
    this.pTrail = [{ x: this.px, y: this.py }];

    this.cx = 31;
    this.cy = 15;
    this.cDir = { x: -1, y: 0 };
    this.cTrail = [{ x: this.cx, y: this.cy }];

    this.occupied.add(`${this.px},${this.py}`);
    this.occupied.add(`${this.cx},${this.cy}`);
    this.stepTimer = 0;
    this.roundMsg = '';
    this.roundPause = 0;
  }

  private isBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    return this.occupied.has(`${x},${y}`);
  }

  private chooseCpuDir(): Point {
    const dirs: Point[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ].filter((d) => !(d.x === -this.cDir.x && d.y === -this.cDir.y));

    // Evaluate open runway length for each valid direction
    let bestDir = this.cDir;
    let bestScore = -1;

    for (const d of dirs) {
      let openSteps = 0;
      let tx = this.cx;
      let ty = this.cy;
      while (openSteps < 14) {
        tx += d.x;
        ty += d.y;
        if (this.isBlocked(tx, ty)) break;
        openSteps++;
      }
      // Slight bias to keep current direction if safe
      const keepBonus = d.x === this.cDir.x && d.y === this.cDir.y ? 1.5 : 0;
      const sc = openSteps + keepBonus + Math.random() * 0.6;
      if (openSteps > 0 && sc > bestScore) {
        bestScore = sc;
        bestDir = d;
      }
    }
    return bestDir;
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

    if (this.roundPause > 0) {
      this.roundPause -= dt;
      if (this.roundPause <= 0) {
        this.startRound();
      }
      this.lastA = input.a;
      return sound;
    }

    // Buffer player turn (prevent 180 reversal)
    if (input.up && this.pDir.y !== 1) this.pDir = { x: 0, y: -1 };
    else if (input.down && this.pDir.y !== -1) this.pDir = { x: 0, y: 1 };
    else if (input.left && this.pDir.x !== 1) this.pDir = { x: -1, y: 0 };
    else if (input.right && this.pDir.x !== -1) this.pDir = { x: 1, y: 0 };

    const stepRate = Math.max(0.055, 0.1 - (this.level - 1) * 0.008);
    this.stepTimer += dt;
    if (this.stepTimer < stepRate) {
      this.lastA = input.a;
      return sound;
    }
    this.stepTimer = 0;

    // Step Player & CPU
    this.cDir = this.chooseCpuDir();

    const npx = this.px + this.pDir.x;
    const npy = this.py + this.pDir.y;
    const ncx = this.cx + this.cDir.x;
    const ncy = this.cy + this.cDir.y;

    const pCrash = this.isBlocked(npx, npy) || (npx === ncx && npy === ncy);
    const cCrash = this.isBlocked(ncx, ncy) || (npx === ncx && npy === ncy);

    if (pCrash && cCrash) {
      this.roundMsg = 'HEAD-ON DRAW!';
      this.roundPause = 1.2;
      sound = 'die';
    } else if (pCrash) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.roundMsg = 'DEREZZED!';
        this.lastA = input.a;
        return 'gameover';
      } else {
        this.roundMsg = 'YOU CRASHED!';
        this.roundPause = 1.2;
        sound = 'die';
      }
    } else if (cCrash) {
      this.level++;
      this.score += 300;
      if (this.score > this.highScore) this.highScore = this.score;
      this.roundMsg = 'CPU DEREZZED!';
      this.roundPause = 1.2;
      sound = 'levelclear';
    } else {
      this.px = npx;
      this.py = npy;
      this.cx = ncx;
      this.cy = ncy;
      this.occupied.add(`${this.px},${this.py}`);
      this.occupied.add(`${this.cx},${this.cy}`);
      this.pTrail.push({ x: this.px, y: this.py });
      this.cTrail.push({ x: this.cx, y: this.cy });
      this.score += 2;
      if (this.score > this.highScore) this.highScore = this.score;
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'DEREZZED!' : this.roundMsg || undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'D-PAD: STEER LIGHT CYCLE • CUT OFF CPU',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Arena Border */}
        <View style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: pixelColor }]} />

        {/* Player Trail (Solid) */}
        {this.pTrail.map((pt, i) => (
          <View
            key={`p-${i}`}
            style={{
              position: 'absolute',
              left: pt.x * CELL + 1,
              top: pt.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              backgroundColor: pixelColor,
            }}
          />
        ))}

        {/* CPU Trail (Hollow / Dotted) */}
        {this.cTrail.map((pt, i) => (
          <View
            key={`c-${i}`}
            style={{
              position: 'absolute',
              left: pt.x * CELL + 1,
              top: pt.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              borderWidth: 1.5,
              borderColor: pixelColor,
            }}
          />
        ))}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TRON CYCLES DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>LIGHT WALL ARENA DUEL</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RACE</Text>
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
