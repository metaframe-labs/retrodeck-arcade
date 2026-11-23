import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface LaserBeam {
  id: number;
  orient: 'h' | 'v';
  pos: number;
  min: number;
  max: number;
  vel: number;
  period: number;
  phase: number;
  active: boolean;
}

interface Gem {
  id: number;
  x: number;
  y: number;
  taken: boolean;
}

export class LaserDodgeGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private px = 28;
  private py = 132;
  private invuln = 0;
  private time = 0;

  private lasers: LaserBeam[] = [];
  private gems: Gem[] = [];

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
    this.setupRoom();
  }

  private setupRoom() {
    this.px = 28;
    this.py = 132;
    this.invuln = 0.8;
    this.time = 0;

    const spd = 34 + this.level * 10;
    this.lasers = [
      { id: 1, orient: 'v', pos: 95, min: 70, max: 145, vel: spd, period: 2.6, phase: 0, active: true },
      { id: 2, orient: 'v', pos: 215, min: 165, max: 255, vel: -spd * 1.1, period: 2.3, phase: 1.1, active: true },
      { id: 3, orient: 'h', pos: 80, min: 48, max: 130, vel: spd * 0.85, period: 2.8, phase: 0.5, active: true },
      { id: 4, orient: 'h', pos: 185, min: 135, max: 214, vel: -spd * 0.9, period: 2.5, phase: 1.6, active: true },
    ];

    this.gems = [];
    const spots = [
      [110, 66],
      [210, 66],
      [160, 132],
      [110, 196],
      [220, 196],
    ];
    spots.forEach(([x, y], i) => {
      this.gems.push({ id: i + 1, x, y, taken: false });
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    this.time += dt;
    let sound: ArcadeSound | null = null;
    if (this.invuln > 0) this.invuln -= dt;

    const spd = input.a ? 165 : 115;
    if (input.left) this.px = Math.max(16, this.px - spd * dt);
    if (input.right) this.px = Math.min(304, this.px + spd * dt);
    if (input.up) this.py = Math.max(36, this.py - spd * dt);
    if (input.down) this.py = Math.min(224, this.py + spd * dt);

    // Update lasers
    for (const l of this.lasers) {
      l.pos += l.vel * dt;
      if (l.pos <= l.min) {
        l.pos = l.min;
        l.vel = Math.abs(l.vel);
      } else if (l.pos >= l.max) {
        l.pos = l.max;
        l.vel = -Math.abs(l.vel);
      }
      // On 65% of period, off 35% of period
      const cyc = ((this.time + l.phase) % l.period) / l.period;
      l.active = cyc < 0.65;

      if (l.active && this.invuln <= 0) {
        const hit =
          l.orient === 'v' ? Math.abs(this.px - l.pos) < 8 : Math.abs(this.py - l.pos) < 8;
        if (hit) {
          this.lives--;
          this.invuln = 1.2;
          this.px = 28;
          this.py = 132;
          sound = 'die';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        }
      }
    }

    // Collect gems
    for (const g of this.gems) {
      if (!g.taken && Math.hypot(g.x - this.px, g.y - this.py) < 14) {
        g.taken = true;
        this.score += 60 * this.level;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'score';
      }
    }

    // Exit door on right center (x >= 286, y around 132)
    if (this.gems.every((g) => g.taken) && this.px >= 286 && Math.abs(this.py - 132) < 22) {
      this.score += 200 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.setupRoom();
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
      message: this.gameOver ? 'ALARM TRIGGERED' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const rem = this.gems.filter((g) => !g.taken).length;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>HEIST LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            {rem > 0 ? `LOOT:${rem}` : 'EXIT OPEN!'}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Exit Door */}
        <View
          style={[
            styles.exitBox,
            {
              right: 8,
              top: 112,
              borderColor: fg,
              backgroundColor: rem === 0 ? fg : 'transparent',
            },
          ]}
        >
          <Text style={[styles.exitTxt, { color: rem === 0 ? bg : fg }]}>EX</Text>
        </View>

        {/* Lasers */}
        {this.lasers.map((l) =>
          l.orient === 'v' ? (
            <View
              key={l.id}
              style={{
                position: 'absolute',
                left: l.pos - 1.5,
                top: 28,
                bottom: 6,
                width: l.active ? 3 : 1,
                backgroundColor: fg,
                opacity: l.active ? 1 : 0.25,
              }}
            />
          ) : (
            <View
              key={l.id}
              style={{
                position: 'absolute',
                top: l.pos - 1.5,
                left: 8,
                right: 8,
                height: l.active ? 3 : 1,
                backgroundColor: fg,
                opacity: l.active ? 1 : 0.25,
              }}
            />
          )
        )}

        {/* Gems */}
        {this.gems.map((g) =>
          !g.taken ? (
            <View
              key={g.id}
              style={[styles.gem, { left: g.x - 6, top: g.y - 6, borderColor: fg }]}
            />
          ) : null
        )}

        {/* Spy */}
        <View
          style={[
            styles.player,
            {
              left: this.px - 7,
              top: this.py - 7,
              backgroundColor: fg,
              opacity: this.invuln > 0 ? 0.5 : 1,
            },
          ]}
        />
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
  exitBox: {
    position: 'absolute',
    width: 22,
    height: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  gem: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  player: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
