import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Peg {
  x: number;
  y: number;
}

const BUCKETS = [20, 50, 100, 250, 100, 50, 20];
const BOARD_LEFT = 24;
const BOARD_RIGHT = 296;
const BUCKET_Y = 208;

export class PlinkoDropGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private ballsLeft = 8;
  private roundScore = 0;
  private targetScore = 400;
  private gameOver = false;

  private aimX = 160;
  private dropping = false;
  private bx = 160;
  private by = 40;
  private bvx = 0;
  private bvy = 0;
  private prevA = false;

  private pegs: Peg[] = [];
  private lastAward = '';
  private awardTimer = 0;

  public init() {
    this.buildPegs();
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  private buildPegs() {
    this.pegs = [];
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = 62 + r * 24;
      const cols = r % 2 === 0 ? 7 : 6;
      const spacing = 38;
      const startX = 160 - ((cols - 1) * spacing) / 2;
      for (let c = 0; c < cols; c++) {
        this.pegs.push({ x: startX + c * spacing, y });
      }
    }
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.startRound();
  }

  private startRound() {
    this.ballsLeft = 8;
    this.roundScore = 0;
    this.targetScore = 350 + (this.level - 1) * 150;
    this.aimX = 160;
    this.dropping = false;
    this.prevA = false;
    this.lastAward = `GOAL: ${this.targetScore}`;
    this.awardTimer = 1.5;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    if (this.awardTimer > 0) this.awardTimer -= dt;

    const dropPress = input.a && !this.prevA;
    this.prevA = input.a;

    if (!this.dropping) {
      if (input.left) this.aimX = Math.max(BOARD_LEFT + 14, this.aimX - 150 * dt);
      if (input.right) this.aimX = Math.min(BOARD_RIGHT - 14, this.aimX + 150 * dt);

      if (dropPress && this.ballsLeft > 0) {
        this.ballsLeft--;
        this.dropping = true;
        this.bx = this.aimX;
        this.by = 40;
        this.bvx = (Math.random() - 0.5) * 18;
        this.bvy = 10;
        sound = 'shoot';
      }
    } else {
      this.bvy += 420 * dt;
      this.bx += this.bvx * dt;
      this.by += this.bvy * dt;

      // Side walls
      if (this.bx < BOARD_LEFT + 6) {
        this.bx = BOARD_LEFT + 6;
        this.bvx = Math.abs(this.bvx) * 0.75;
      } else if (this.bx > BOARD_RIGHT - 6) {
        this.bx = BOARD_RIGHT - 6;
        this.bvx = -Math.abs(this.bvx) * 0.75;
      }

      // Peg collisions
      for (const p of this.pegs) {
        const dx = this.bx - p.x;
        const dy = this.by - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10 && dist > 0.01) {
          const nx = dx / dist;
          const ny = dy / dist;
          this.bx = p.x + nx * 10.2;
          this.by = p.y + ny * 10.2;
          const dot = this.bvx * nx + this.bvy * ny;
          this.bvx = (this.bvx - 1.65 * dot * nx) + (Math.random() - 0.5) * 35;
          this.bvy = Math.min(220, Math.abs(this.bvy - 1.65 * dot * ny) * 0.6 + 20);
          sound = 'hit';
          break;
        }
      }

      // Bucket landing
      if (this.by >= BUCKET_Y) {
        this.dropping = false;
        const bucketW = (BOARD_RIGHT - BOARD_LEFT) / BUCKETS.length;
        const idx = Math.max(
          0,
          Math.min(BUCKETS.length - 1, Math.floor((this.bx - BOARD_LEFT) / bucketW))
        );
        const pts = BUCKETS[idx] * this.level;
        this.roundScore += pts;
        this.score += pts;
        if (this.score > this.highScore) this.highScore = this.score;
        this.lastAward = `+${pts}!`;
        this.awardTimer = 1.1;
        sound = idx === 3 ? 'powerup' : 'score';

        if (this.roundScore >= this.targetScore) {
          this.score += this.ballsLeft * 50;
          if (this.score > this.highScore) this.highScore = this.score;
          this.level++;
          this.startRound();
          return 'levelclear';
        } else if (this.ballsLeft <= 0) {
          this.gameOver = true;
          return 'gameover';
        }
      }
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.ballsLeft,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT OF BALLS' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const bucketW = (BOARD_RIGHT - BOARD_LEFT) / BUCKETS.length;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>
            LV{this.level} {this.roundScore}/{this.targetScore}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>BALLS:{this.ballsLeft}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Board walls */}
        <View style={[styles.wall, { left: BOARD_LEFT - 2, backgroundColor: fg }]} />
        <View style={[styles.wall, { left: BOARD_RIGHT, backgroundColor: fg }]} />

        {/* Dropper */}
        {!this.dropping && (
          <View style={[styles.dropper, { left: this.aimX - 6, top: 30, backgroundColor: fg }]} />
        )}

        {/* Pegs */}
        {this.pegs.map((p, i) => (
          <View
            key={i}
            style={[styles.peg, { left: p.x - 3, top: p.y - 3, backgroundColor: fg }]}
          />
        ))}

        {/* Ball */}
        {this.dropping && (
          <View
            style={[
              styles.ball,
              { left: this.bx - 5, top: this.by - 5, borderColor: fg, backgroundColor: fg },
            ]}
          />
        )}

        {/* Buckets */}
        <View
          style={[
            styles.bucketsRow,
            { left: BOARD_LEFT, top: BUCKET_Y, width: BOARD_RIGHT - BOARD_LEFT },
          ]}
        >
          {BUCKETS.map((val, i) => (
            <View
              key={i}
              style={[
                styles.bucket,
                {
                  width: bucketW,
                  borderColor: fg,
                  backgroundColor: i === 3 ? fg : 'transparent',
                },
              ]}
            >
              <Text style={[styles.bucketTxt, { color: i === 3 ? bg : fg }]}>
                {val * this.level}
              </Text>
            </View>
          ))}
        </View>

        {this.awardTimer > 0 && (
          <Text style={[styles.award, { color: fg }]}>{this.lastAward}</Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderBottomWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hdrText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  wall: {
    position: 'absolute',
    top: 44,
    bottom: 10,
    width: 2,
  },
  dropper: {
    position: 'absolute',
    width: 12,
    height: 10,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  peg: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ball: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  bucketsRow: {
    position: 'absolute',
    height: 22,
    flexDirection: 'row',
  },
  bucket: {
    height: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  award: {
    position: 'absolute',
    top: 30,
    right: 12,
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
