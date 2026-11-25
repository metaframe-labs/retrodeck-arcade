import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const GOAL_TOP = 82;
const GOAL_BOT = 158;
const MALLET_R = 13;
const PUCK_R = 7;

export class AirHockeyGame implements ArcadeGameInstance {
  private px = 48;
  private py = ARENA_H / 2;
  private pvx = 0;
  private pvy = 0;

  private cx = ARENA_W - 48;
  private cy = ARENA_H / 2;

  private puckX = ARENA_W / 2;
  private puckY = ARENA_H / 2;
  private puckVx = 0;
  private puckVy = 0;

  private pGoals = 0;
  private cGoals = 0;
  private score = 0;
  private highScore = 0;
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
    this.pGoals = 0;
    this.cGoals = 0;
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.resetFaceoff(1);
  }

  private resetFaceoff(dir: number): void {
    this.px = 46;
    this.py = ARENA_H / 2;
    this.cx = ARENA_W - 46;
    this.cy = ARENA_H / 2;
    this.puckX = ARENA_W / 2;
    this.puckY = ARENA_H / 2;
    this.puckVx = dir * 95;
    this.puckVy = (Math.random() - 0.5) * 70;
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

    // Player 2D Mallet Movement (confined to left half)
    const pSpd = 185;
    this.pvx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.pvy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.px = Math.max(MALLET_R + 6, Math.min(ARENA_W / 2 - MALLET_R - 2, this.px + this.pvx * pSpd * dt));
    this.py = Math.max(MALLET_R + 6, Math.min(ARENA_H - MALLET_R - 6, this.py + this.pvy * pSpd * dt));

    // CPU Mallet AI (right half)
    const cSpd = Math.min(240, 130 + this.level * 20);
    let targetX = ARENA_W - 42;
    let targetY = ARENA_H / 2;

    const puckInCpuHalf = this.puckX > ARENA_W / 2;
    const puckSpeed = Math.hypot(this.puckVx, this.puckVy);
    const isPuckInCorner =
      this.puckX > ARENA_W - 45 && (this.puckY < 45 || this.puckY > ARENA_H - 45);

    if (puckInCpuHalf) {
      if (isPuckInCorner && puckSpeed < 70) {
        // Corner Unstuck Strategy: Approach puck from outside-in to sweep it towards center/player
        const cornerTop = this.puckY < ARENA_H / 2;
        targetX = Math.min(ARENA_W - MALLET_R - 8, this.puckX + 16);
        targetY = cornerTop ? Math.max(MALLET_R + 8, this.puckY - 14) : Math.min(ARENA_H - MALLET_R - 8, this.puckY + 14);
      } else {
        // Normal aggressive attack: get behind puck to shoot toward player goal
        targetX = Math.min(ARENA_W - MALLET_R - 6, Math.max(ARENA_W / 2 + MALLET_R + 4, this.puckX + 18));
        targetY = this.puckY;
      }
    } else {
      // Defensive stance when puck is on player's side
      targetX = ARENA_W - 38;
      targetY = Math.max(GOAL_TOP, Math.min(GOAL_BOT, this.puckY));
    }

    const cdx = targetX - this.cx;
    const cdy = targetY - this.cy;
    const cDist = Math.hypot(cdx, cdy);
    let cpuVx = 0;
    let cpuVy = 0;
    if (cDist > 2) {
      cpuVx = (cdx / cDist);
      cpuVy = (cdy / cDist);
      this.cx += cpuVx * cSpd * dt;
      this.cy += cpuVy * cSpd * dt;
    }
    // Confine CPU mallet to right half & within rink borders
    this.cx = Math.max(ARENA_W / 2 + MALLET_R + 2, Math.min(ARENA_W - MALLET_R - 6, this.cx));
    this.cy = Math.max(MALLET_R + 6, Math.min(ARENA_H - MALLET_R - 6, this.cy));

    // Anti-Corner Deadlock: If puck is motionless in any corner for >1.2s, nudge it towards field center
    if (puckSpeed < 15) {
      if (this.puckX > ARENA_W - 35 && this.puckY < 35) {
        this.puckVx = -90;
        this.puckVy = 90;
        sound = 'hit';
      } else if (this.puckX > ARENA_W - 35 && this.puckY > ARENA_H - 35) {
        this.puckVx = -90;
        this.puckVy = -90;
        sound = 'hit';
      } else if (this.puckX < 35 && this.puckY < 35) {
        this.puckVx = 90;
        this.puckVy = 90;
        sound = 'hit';
      } else if (this.puckX < 35 && this.puckY > ARENA_H - 35) {
        this.puckVx = 90;
        this.puckVy = -90;
        sound = 'hit';
      }
    }

    // Puck physics & light friction
    this.puckX += this.puckVx * dt;
    this.puckY += this.puckVy * dt;
    this.puckVx *= Math.pow(0.996, dt * 60);
    this.puckVy *= Math.pow(0.996, dt * 60);

    // Wall bounces (except goal mouth)
    if (this.puckY - PUCK_R <= 6) {
      this.puckY = 6 + PUCK_R;
      this.puckVy = Math.abs(this.puckVy);
      sound = 'hit';
    } else if (this.puckY + PUCK_R >= ARENA_H - 6) {
      this.puckY = ARENA_H - 6 - PUCK_R;
      this.puckVy = -Math.abs(this.puckVy);
      sound = 'hit';
    }

    // Goals (puck must fully cross the goal line: puckX <= 0 or puckX >= ARENA_W)
    const inGoalY = this.puckY >= GOAL_TOP && this.puckY <= GOAL_BOT;
    if (this.puckX <= -PUCK_R / 2) {
      if (inGoalY) {
        this.cGoals++;
        if (this.cGoals >= 5) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        this.resetFaceoff(1);
        sound = 'die';
      }
    } else if (this.puckX - PUCK_R <= 6) {
      if (!inGoalY) {
        this.puckX = 6 + PUCK_R;
        this.puckVx = Math.abs(this.puckVx);
        sound = 'hit';
      }
    }

    if (this.puckX >= ARENA_W + PUCK_R / 2) {
      if (inGoalY) {
        this.pGoals++;
        this.score += 200;
        if (this.score > this.highScore) this.highScore = this.score;
        if (this.pGoals >= 5) {
          this.level++;
          this.pGoals = 0;
          this.cGoals = 0;
          this.score += 500;
          if (this.score > this.highScore) this.highScore = this.score;
          this.resetFaceoff(-1);
          sound = 'levelclear';
        } else {
          this.resetFaceoff(-1);
          sound = 'score';
        }
      }
    } else if (this.puckX + PUCK_R >= ARENA_W - 6) {
      if (!inGoalY) {
        this.puckX = ARENA_W - 6 - PUCK_R;
        this.puckVx = -Math.abs(this.puckVx);
        sound = 'hit';
      }
    }

    // Real Air Hockey Corner Chamfers (Triangle wedges in 4 corners so 90 deg corners do NOT exist physically)
    const C_OFFSET = 26; // Corner bevel size
    // Top-Left bevel: (x + y <= 6 + 6 + C_OFFSET)
    if ((this.puckX - 6) + (this.puckY - 6) < C_OFFSET) {
      const normalDist = ((this.puckX - 6) + (this.puckY - 6)) / Math.SQRT2;
      const targetDist = C_OFFSET / Math.SQRT2;
      const push = targetDist - normalDist + 2;
      this.puckX += push / Math.SQRT2;
      this.puckY += push / Math.SQRT2;
      const spd = Math.max(160, Math.hypot(this.puckVx, this.puckVy));
      this.puckVx = Math.abs(spd * 0.707);
      this.puckVy = Math.abs(spd * 0.707);
      sound = 'hit';
    }
    // Bottom-Left bevel: (x + (ARENA_H - 6 - y) <= C_OFFSET)
    if ((this.puckX - 6) + (ARENA_H - 6 - this.puckY) < C_OFFSET) {
      this.puckX = 6 + C_OFFSET * 0.75;
      this.puckY = ARENA_H - 6 - C_OFFSET * 0.75;
      const spd = Math.max(160, Math.hypot(this.puckVx, this.puckVy));
      this.puckVx = Math.abs(spd * 0.707);
      this.puckVy = -Math.abs(spd * 0.707);
      sound = 'hit';
    }
    // Top-Right bevel: ((ARENA_W - 6 - x) + (y - 6) <= C_OFFSET)
    if ((ARENA_W - 6 - this.puckX) + (this.puckY - 6) < C_OFFSET) {
      this.puckX = ARENA_W - 6 - C_OFFSET * 0.75;
      this.puckY = 6 + C_OFFSET * 0.75;
      const spd = Math.max(160, Math.hypot(this.puckVx, this.puckVy));
      this.puckVx = -Math.abs(spd * 0.707);
      this.puckVy = Math.abs(spd * 0.707);
      sound = 'hit';
    }
    // Bottom-Right bevel: ((ARENA_W - 6 - x) + (ARENA_H - 6 - y) <= C_OFFSET)
    if ((ARENA_W - 6 - this.puckX) + (ARENA_H - 6 - this.puckY) < C_OFFSET) {
      this.puckX = ARENA_W - 6 - C_OFFSET * 0.75;
      this.puckY = ARENA_H - 6 - C_OFFSET * 0.75;
      const spd = Math.max(160, Math.hypot(this.puckVx, this.puckVy));
      this.puckVx = -Math.abs(spd * 0.707);
      this.puckVy = -Math.abs(spd * 0.707);
      sound = 'hit';
    }

    // Mallet collisions (Puck is pushed AND position is immediately moved out of mallet)
    const collideMallet = (mx: number, my: number, boostX: number, boostY: number) => {
      let dx = this.puckX - mx;
      let dy = this.puckY - my;
      let d = Math.hypot(dx, dy);
      const minD = MALLET_R + PUCK_R;
      if (d < minD) {
        if (d < 1) {
          dx = mx < ARENA_W / 2 ? 1 : -1;
          dy = my < ARENA_H / 2 ? 1 : -1;
          d = 1.414;
        }
        const nx = dx / d;
        const ny = dy / d;
        this.puckX = mx + nx * (minD + 3);
        this.puckY = my + ny * (minD + 3);
        const speed = Math.min(360, Math.max(220, Math.hypot(this.puckVx, this.puckVy) * 1.15));
        this.puckVx = nx * speed + boostX * 70;
        this.puckVy = ny * speed + boostY * 70;
        sound = 'hit';
      }
    };

    collideMallet(this.px, this.py, this.pvx, this.pvy);
    collideMallet(this.cx, this.cy, 0, 0);

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, 5 - this.cGoals),
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'CPU WINS 5 GOALS!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] FOR REMATCH' : 'D-PAD: 2D MALLET • FIRST TO 5 GOALS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Rink Frame */}
        <View style={{ position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderWidth: 2, borderColor: pixelColor }} />
        {/* Center Line & Circle */}
        <View style={{ position: 'absolute', left: ARENA_W / 2 - 0.5, top: 6, bottom: 6, width: 1, backgroundColor: pixelColor, opacity: 0.4 }} />
        <View style={{ position: 'absolute', left: ARENA_W / 2 - 22, top: ARENA_H / 2 - 22, width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: pixelColor, opacity: 0.4 }} />
        {/* Goal Cutouts */}
        <View style={{ position: 'absolute', left: 4, top: GOAL_TOP, width: 6, height: GOAL_BOT - GOAL_TOP, backgroundColor: bg }} />
        <View style={{ position: 'absolute', right: 4, top: GOAL_TOP, width: 6, height: GOAL_BOT - GOAL_TOP, backgroundColor: bg }} />

        {/* Scoreboard */}
        <Text style={[styles.scoreTxt, { left: ARENA_W / 2 - 44, color: pixelColor }]}>{this.pGoals}</Text>
        <Text style={[styles.scoreTxt, { left: ARENA_W / 2 + 12, color: pixelColor }]}>{this.cGoals}</Text>

        {/* Player Mallet */}
        <View style={{ position: 'absolute', left: this.px - MALLET_R, top: this.py - MALLET_R, width: MALLET_R * 2, height: MALLET_R * 2, borderRadius: MALLET_R, backgroundColor: pixelColor, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bg }} />
        </View>

        {/* CPU Mallet */}
        <View style={{ position: 'absolute', left: this.cx - MALLET_R, top: this.cy - MALLET_R, width: MALLET_R * 2, height: MALLET_R * 2, borderRadius: MALLET_R, borderWidth: 3, borderColor: pixelColor, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pixelColor }} />
        </View>

        {/* Puck */}
        <View style={{ position: 'absolute', left: this.puckX - PUCK_R, top: this.puckY - PUCK_R, width: PUCK_R * 2, height: PUCK_R * 2, borderRadius: PUCK_R, backgroundColor: pixelColor }} />

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>AIR HOCKEY DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>FAST 2D TABLE HOCKEY</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scoreTxt: {
    position: 'absolute',
    top: 14,
    width: 32,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    opacity: 0.35,
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
