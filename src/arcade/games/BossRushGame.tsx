import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
}

const BOSS_NAMES = [
  'IRON CORE',
  'TWIN TURRET',
  'LASER EYE',
  'SWARM HIVE',
  'OMEGA 100',
];

export class BossRushGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 4;
  private level = 1;
  private gameOver = false;

  private px = 160;
  private py = 204;
  private invuln = 0;
  private dashCd = 0;
  private shootCd = 0;
  private prevB = false;

  private bx = 160;
  private by = 66;
  private bDir = 1;
  private bHp = 20;
  private bMaxHp = 20;
  private bFireTimer = 0.9;
  private bPhase = 0;

  private shots: Shot[] = [];
  private nextId = 1;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.lives = 4;
    this.level = 1;
    this.gameOver = false;
    this.spawnBoss();
  }

  private spawnBoss() {
    this.px = 160;
    this.py = 204;
    this.invuln = 0.8;
    this.bx = 160;
    this.by = 66;
    this.bDir = 1;
    this.bMaxHp = 18 + (this.level - 1) * 8;
    this.bHp = this.bMaxHp;
    this.bFireTimer = 0.8;
    this.bPhase = 0;
    this.shots = [];
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.shootCd > 0) this.shootCd -= dt;

    // Player move
    const spd = 155;
    if (input.left) this.px = Math.max(18, this.px - spd * dt);
    if (input.right) this.px = Math.min(302, this.px + spd * dt);
    if (input.up) this.py = Math.max(118, this.py - spd * dt);
    if (input.down) this.py = Math.min(224, this.py + spd * dt);

    // Shield Dash with B
    const dash = input.b && !this.prevB;
    this.prevB = input.b;
    if (dash && this.dashCd <= 0) {
      this.invuln = 0.45;
      this.dashCd = 1.6;
      sound = 'powerup';
    }

    // Rapid fire with A
    if (input.a && this.shootCd <= 0) {
      this.shots.push({
        id: this.nextId++,
        x: this.px,
        y: this.py - 12,
        vx: 0,
        vy: -280,
        fromPlayer: true,
      });
      this.shootCd = 0.14;
      sound = 'shoot';
    }

    // Boss movement
    const bSpd = 65 + this.level * 12;
    this.bx += this.bDir * bSpd * dt;
    if (this.bx > 266) {
      this.bx = 266;
      this.bDir = -1;
    } else if (this.bx < 54) {
      this.bx = 54;
      this.bDir = 1;
    }

    // Boss attack patterns
    this.bFireTimer -= dt;
    if (this.bFireTimer <= 0) {
      this.bPhase++;
      const kind = (this.level - 1) % 5;
      if (kind === 0 || kind === 2) {
        // 3-way aimed spread
        const baseAng = Math.atan2(this.py - this.by, this.px - this.bx);
        for (const off of [-0.32, 0, 0.32]) {
          this.shots.push({
            id: this.nextId++,
            x: this.bx,
            y: this.by + 16,
            vx: Math.cos(baseAng + off) * (115 + this.level * 8),
            vy: Math.sin(baseAng + off) * (115 + this.level * 8),
            fromPlayer: false,
          });
        }
      } else if (kind === 1) {
        // Twin vertical cannons
        for (const ox of [-20, 20]) {
          this.shots.push({
            id: this.nextId++,
            x: this.bx + ox,
            y: this.by + 16,
            vx: 0,
            vy: 150 + this.level * 10,
            fromPlayer: false,
          });
        }
      } else {
        // 5-way fan burst
        for (let i = -2; i <= 2; i++) {
          const ang = Math.PI / 2 + i * 0.28 + Math.sin(this.bPhase) * 0.12;
          this.shots.push({
            id: this.nextId++,
            x: this.bx,
            y: this.by + 16,
            vx: Math.cos(ang) * (110 + this.level * 8),
            vy: Math.sin(ang) * (110 + this.level * 8),
            fromPlayer: false,
          });
        }
      }
      this.bFireTimer = Math.max(0.48, 1.05 - this.level * 0.08);
    }

    // Update shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < 0 || s.x > 320 || s.y < 24 || s.y > 240) {
        this.shots.splice(i, 1);
        continue;
      }

      if (s.fromPlayer) {
        if (Math.abs(s.x - this.bx) < 26 && Math.abs(s.y - this.by) < 18) {
          this.shots.splice(i, 1);
          this.bHp--;
          this.score += 15;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';

          if (this.bHp <= 0) {
            this.score += 400 * this.level;
            if (this.score > this.highScore) this.highScore = this.score;
            this.level++;
            this.lives = Math.min(5, this.lives + 1);
            this.spawnBoss();
            return 'levelclear';
          }
        }
      } else if (this.invuln <= 0) {
        if (Math.hypot(s.x - this.px, s.y - this.py) < 11) {
          this.shots.splice(i, 1);
          this.lives--;
          this.invuln = 1.2;
          sound = 'explode';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        }
      }
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
      message: this.gameOver ? 'SHIP DESTROYED' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const bossName = BOSS_NAMES[(this.level - 1) % BOSS_NAMES.length];
    const hpPct = Math.max(0, (this.bHp / this.bMaxHp) * 100);

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>{bossName}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>HP:{this.lives}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Boss HP Bar */}
        <View style={[styles.hpBar, { borderColor: fg }]}>
          <View style={[styles.hpFill, { width: `${hpPct}%`, backgroundColor: fg }]} />
        </View>

        {/* Boss Sprite */}
        <View
          style={[
            styles.boss,
            { left: this.bx - 24, top: this.by - 15, borderColor: fg, backgroundColor: fg },
          ]}
        >
          <View style={[styles.bossEye, { backgroundColor: bg }]} />
          <View style={[styles.bossEye, { backgroundColor: bg }]} />
        </View>

        {/* Bullets */}
        {this.shots.map((s) => (
          <View
            key={s.id}
            style={[
              s.fromPlayer ? styles.pShot : styles.eShot,
              {
                left: s.x - (s.fromPlayer ? 2 : 3.5),
                top: s.y - (s.fromPlayer ? 5 : 3.5),
                backgroundColor: fg,
              },
            ]}
          />
        ))}

        {/* Player Ship */}
        <View
          style={[
            styles.ship,
            {
              left: this.px - 9,
              top: this.py - 8,
              borderColor: fg,
              backgroundColor: this.invuln > 0 ? bg : fg,
            },
          ]}
        >
          <Text style={[styles.shipTxt, { color: this.invuln > 0 ? fg : bg }]}>^</Text>
        </View>
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
  hpBar: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    height: 8,
    borderWidth: 1.5,
  },
  hpFill: {
    height: '100%',
  },
  boss: {
    position: 'absolute',
    width: 48,
    height: 30,
    borderWidth: 2,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  bossEye: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  pShot: {
    position: 'absolute',
    width: 4,
    height: 10,
  },
  eShot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  ship: {
    position: 'absolute',
    width: 18,
    height: 16,
    borderWidth: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipTxt: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
