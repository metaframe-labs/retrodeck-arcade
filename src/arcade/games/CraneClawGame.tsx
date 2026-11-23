import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Prize {
  id: number;
  x: number;
  y: number;
  r: number;
  val: number;
  label: string;
  caught: boolean;
}

export class CraneClawGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private tokens = 7;
  private roundScore = 0;
  private targetScore = 300;
  private gameOver = false;

  private craneX = 160;
  private clawY = 44;
  private state: 'aim' | 'down' | 'up' = 'aim';
  private grabbed: Prize | null = null;
  private prizes: Prize[] = [];
  private nextId = 1;
  private prevA = false;
  private status = 'AIM & PRESS A';

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.setupPit();
  }

  private setupPit() {
    this.tokens = 7;
    this.roundScore = 0;
    this.targetScore = 260 + (this.level - 1) * 120;
    this.craneX = 160;
    this.clawY = 44;
    this.state = 'aim';
    this.grabbed = null;
    this.prevA = false;
    this.status = `GOAL: ${this.targetScore}`;

    this.prizes = [];
    const specs = [
      { label: '$', val: 150, r: 10 },
      { label: '$', val: 150, r: 10 },
      { label: '*', val: 100, r: 12 },
      { label: '*', val: 100, r: 12 },
      { label: 'B', val: 60, r: 14 },
      { label: 'B', val: 60, r: 14 },
      { label: 'B', val: 60, r: 14 },
      { label: 'X', val: -40, r: 11 },
    ];

    specs.forEach((s) => {
      let x = 50;
      let y = 190;
      for (let t = 0; t < 80; t++) {
        x = 38 + Math.random() * 244;
        y = 148 + Math.random() * 68;
        if (this.prizes.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + s.r + 6)) break;
      }
      this.prizes.push({
        id: this.nextId++,
        x,
        y,
        r: s.r,
        val: s.val,
        label: s.label,
        caught: false,
      });
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    const drop = input.a && !this.prevA;
    this.prevA = input.a;

    if (this.state === 'aim') {
      const spd = 135;
      if (input.left) this.craneX = Math.max(30, this.craneX - spd * dt);
      if (input.right) this.craneX = Math.min(290, this.craneX + spd * dt);

      if (drop && this.tokens > 0) {
        this.tokens--;
        this.state = 'down';
        this.grabbed = null;
        sound = 'shoot';
      }
    } else if (this.state === 'down') {
      this.clawY += (135 + this.level * 10) * dt;
      for (const p of this.prizes) {
        if (!p.caught && Math.hypot(p.x - this.craneX, p.y - (this.clawY + 8)) <= p.r + 7) {
          p.caught = true;
          this.grabbed = p;
          this.state = 'up';
          sound = 'hit';
          break;
        }
      }
      if (this.clawY >= 216) {
        this.state = 'up';
        sound = 'hit';
      }
    } else if (this.state === 'up') {
      this.clawY -= 125 * dt;
      if (this.grabbed) {
        this.grabbed.x = this.craneX;
        this.grabbed.y = this.clawY + 10;
      }
      if (this.clawY <= 44) {
        this.clawY = 44;
        this.state = 'aim';
        if (this.grabbed) {
          const val = this.grabbed.val;
          this.prizes = this.prizes.filter((p) => p.id !== this.grabbed!.id);
          this.grabbed = null;
          this.roundScore = Math.max(0, this.roundScore + val);
          this.score = Math.max(0, this.score + val);
          if (this.score > this.highScore) this.highScore = this.score;
          this.status = val >= 0 ? `CAUGHT +${val}!` : `JUNK ${val}!`;
          sound = val >= 100 ? 'powerup' : val > 0 ? 'score' : 'die';
        } else {
          this.status = 'MISSED!';
        }

        if (this.roundScore >= this.targetScore) {
          this.score += this.tokens * 50;
          if (this.score > this.highScore) this.highScore = this.score;
          this.level++;
          this.setupPit();
          return 'levelclear';
        } else if (this.tokens <= 0) {
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
      lives: this.tokens,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT OF TOKENS' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>
            LV{this.level} {this.roundScore}/{this.targetScore}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>COINS:{this.tokens}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Top Rail */}
        <View style={[styles.rail, { backgroundColor: fg }]} />
        {/* Cable */}
        <View
          style={[
            styles.cable,
            { left: this.craneX - 1, top: 34, height: this.clawY - 34, backgroundColor: fg },
          ]}
        />
        {/* Claw */}
        <View style={[styles.claw, { left: this.craneX - 10, top: this.clawY, borderColor: fg }]} />

        {/* Prizes */}
        {this.prizes.map((p) => (
          <View
            key={p.id}
            style={[
              styles.prize,
              {
                left: p.x - p.r,
                top: p.y - p.r,
                width: p.r * 2,
                height: p.r * 2,
                borderRadius: p.r,
                borderColor: fg,
                backgroundColor: p.val < 0 ? fg : bg,
              },
            ]}
          >
            <Text style={[styles.prizeTxt, { color: p.val < 0 ? bg : fg }]}>
              {p.label}
            </Text>
          </View>
        ))}

        {/* Floor */}
        <View style={[styles.pitFloor, { backgroundColor: fg }]} />
        <Text style={[styles.statusTxt, { color: fg }]}>{this.status}</Text>
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
  rail: {
    position: 'absolute',
    top: 32,
    left: 16,
    right: 16,
    height: 3,
  },
  cable: {
    position: 'absolute',
    width: 2,
  },
  claw: {
    position: 'absolute',
    width: 20,
    height: 12,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  prize: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeTxt: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  pitFloor: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 3,
  },
  statusTxt: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
