import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const GROUND_Y = 186;
const RUNNER_X = 64;

interface Hurdle {
  id: number;
  x: number;
  h: number;
  cleared: boolean;
  hit: boolean;
}

export class HurdlesSprintGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private speed = 95;
  private distance = 0;
  private goalDist = 400;

  private py = 0; // height above ground
  private vy = 0;
  private stride = 0;
  private stumbleTimer = 0;

  private prevRight = false;
  private prevJump = false;
  private hurdles: Hurdle[] = [];
  private nextId = 1;
  private nextHurdleDist = 80;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.startStage();
  }

  private startStage() {
    this.distance = 0;
    this.goalDist = 350 + (this.level - 1) * 100;
    this.speed = 95 + this.level * 10;
    this.py = 0;
    this.vy = 0;
    this.stumbleTimer = 0;
    this.hurdles = [];
    this.nextHurdleDist = 75;
    this.prevRight = false;
    this.prevJump = false;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;

    if (this.stumbleTimer > 0) this.stumbleTimer -= dt;

    // Sprint boost by tapping right or b, or holding right for steady pace
    const tapSprint = (input.right && !this.prevRight) || input.b;
    this.prevRight = input.right;

    const minSpeed = 85 + this.level * 10;
    const maxSpeed = 205 + this.level * 12;

    if (tapSprint && this.stumbleTimer <= 0) {
      this.speed = Math.min(maxSpeed, this.speed + 22);
    } else if (input.right && this.stumbleTimer <= 0) {
      this.speed = Math.min(maxSpeed * 0.85, this.speed + 45 * dt);
    } else {
      this.speed = Math.max(minSpeed, this.speed - 55 * dt);
    }

    // Jump
    const jumpPress = (input.a || input.up) && !this.prevJump;
    this.prevJump = input.a || input.up;

    if (jumpPress && this.py <= 0.1) {
      this.vy = 265;
      sound = 'shoot';
    }

    if (this.py > 0 || this.vy > 0) {
      this.py += this.vy * dt;
      this.vy -= 740 * dt;
      if (this.py <= 0) {
        this.py = 0;
        this.vy = 0;
      }
    }

    const dx = this.speed * dt;
    this.distance += dx * 0.28;
    this.stride += dx * 0.12;

    // Spawn hurdles
    if (this.distance >= this.nextHurdleDist && this.distance < this.goalDist - 40) {
      const h = 22 + (Math.random() < 0.35 ? 6 : 0);
      this.hurdles.push({
        id: this.nextId++,
        x: 330,
        h,
        cleared: false,
        hit: false,
      });
      this.nextHurdleDist = this.distance + Math.max(42, 72 - this.level * 4 + Math.random() * 25);
    }

    // Move hurdles & check collisions
    for (let i = this.hurdles.length - 1; i >= 0; i--) {
      const h = this.hurdles[i];
      h.x -= dx;

      if (!h.hit && !h.cleared && Math.abs(h.x - RUNNER_X) < 11) {
        if (this.py < h.h - 4) {
          h.hit = true;
          this.lives--;
          this.speed = minSpeed * 0.6;
          this.stumbleTimer = 0.5;
          sound = 'hit';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        }
      }

      if (!h.cleared && !h.hit && h.x < RUNNER_X - 12) {
        h.cleared = true;
        this.score += 40 + Math.floor(this.speed * 0.15);
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'score';
      }

      if (h.x < -30) this.hurdles.splice(i, 1);
    }

    // Finish line
    if (this.distance >= this.goalDist) {
      this.score += 200 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.startStage();
      return 'levelclear';
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'RACE OVER' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const legFlip = Math.floor(this.stride) % 2 === 0;
    const pct = Math.min(1, this.distance / this.goalDist);

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>HURDLES LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            {Math.floor(this.distance)}/{this.goalDist}M
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progBar, { borderColor: fg }]}>
          <View style={[styles.progFill, { width: `${pct * 100}%`, backgroundColor: fg }]} />
        </View>

        {/* Speed indicator */}
        <Text style={[styles.speedTxt, { color: fg }]}>
          SPD: {Math.floor(this.speed)}
        </Text>

        {/* Track Ground */}
        <View style={[styles.trackLine, { top: GROUND_Y, backgroundColor: fg }]} />
        <View style={[styles.trackSub, { top: GROUND_Y + 14, borderColor: fg }]} />

        {/* Hurdles */}
        {this.hurdles.map((h) => (
          <View
            key={h.id}
            style={[
              styles.hurdle,
              {
                left: h.x - 5,
                top: GROUND_Y - h.h,
                height: h.h,
                opacity: h.hit ? 0.35 : 1,
              },
            ]}
          >
            <View style={[styles.hurdleTop, { backgroundColor: fg }]} />
            <View style={[styles.hurdlePost, { height: h.h - 5, backgroundColor: fg }]} />
            <View style={[styles.hurdleBase, { backgroundColor: fg }]} />
          </View>
        ))}

        {/* Runner */}
        <View
          style={[
            styles.runner,
            {
              left: RUNNER_X - 8,
              top: GROUND_Y - 26 - this.py,
              opacity: this.stumbleTimer > 0 ? 0.5 : 1,
            },
          ]}
        >
          {/* Head */}
          <View style={[styles.head, { backgroundColor: fg }]} />
          {/* Torso */}
          <View style={[styles.torso, { backgroundColor: fg }]} />
          {/* Legs */}
          <View style={styles.legsRow}>
            <View
              style={[
                styles.leg,
                {
                  backgroundColor: fg,
                  height: this.py > 2 ? 7 : legFlip ? 10 : 6,
                },
              ]}
            />
            <View
              style={[
                styles.leg,
                {
                  backgroundColor: fg,
                  height: this.py > 2 ? 7 : legFlip ? 6 : 10,
                },
              ]}
            />
          </View>
        </View>

        <Text style={[styles.hint, { color: fg }]}>RIGHT: SPRINT   A/UP: JUMP</Text>
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
  progBar: {
    position: 'absolute',
    top: 32,
    left: 16,
    right: 16,
    height: 8,
    borderWidth: 1.5,
  },
  progFill: {
    height: '100%',
  },
  speedTxt: {
    position: 'absolute',
    top: 44,
    left: 16,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  trackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
  },
  trackSub: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  hurdle: {
    position: 'absolute',
    width: 10,
    alignItems: 'center',
  },
  hurdleTop: {
    width: 12,
    height: 5,
  },
  hurdlePost: {
    width: 3,
  },
  hurdleBase: {
    width: 10,
    height: 2,
  },
  runner: {
    position: 'absolute',
    width: 16,
    height: 26,
    alignItems: 'center',
  },
  head: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 1,
  },
  torso: {
    width: 8,
    height: 9,
  },
  legsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  leg: {
    width: 3,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
