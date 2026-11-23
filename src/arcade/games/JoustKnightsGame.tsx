import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface EnemyKnight {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  egg: boolean;
}

const PLATFORMS = [
  { x: 20, y: 214, w: 280 },
  { x: 24, y: 146, w: 92 },
  { x: 204, y: 146, w: 92 },
  { x: 110, y: 92, w: 100 },
];

export class JoustKnightsGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private px = 160;
  private py = 180;
  private vx = 0;
  private vy = 0;
  private prevFlap = false;
  private invuln = 0;

  private enemies: EnemyKnight[] = [];
  private nextId = 1;

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
    this.spawnWave();
  }

  private spawnWave() {
    this.px = 160;
    this.py = 196;
    this.vx = 0;
    this.vy = 0;
    this.invuln = 1.0;
    this.prevFlap = false;
    this.enemies = [];

    const count = Math.min(6, 2 + this.level);
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.enemies.push({
        id: this.nextId++,
        x: 40 + (i * 55) % 240,
        y: 52 + (i % 2) * 44,
        vx: dir * (58 + this.level * 8),
        vy: 0,
        egg: false,
      });
    }
  }

  private collidePlatforms(ent: { x: number; y: number; vy: number }) {
    for (const p of PLATFORMS) {
      if (ent.x >= p.x - 6 && ent.x <= p.x + p.w + 6) {
        if (ent.vy >= 0 && ent.y + 9 >= p.y && ent.y + 9 <= p.y + 12) {
          ent.y = p.y - 9;
          ent.vy = 0;
        }
      }
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    if (this.invuln > 0) this.invuln -= dt;

    if (input.left) this.vx = Math.max(-145, this.vx - 340 * dt);
    else if (input.right) this.vx = Math.min(145, this.vx + 340 * dt);
    else this.vx *= 0.94;

    const flap = (input.a || input.up) && !this.prevFlap;
    this.prevFlap = input.a || input.up;
    if (flap) {
      this.vy = -175;
      sound = 'shoot';
    }

    this.vy = Math.min(200, this.vy + 390 * dt);
    this.px += this.vx * dt;
    this.py += this.vy * dt;

    // Wrap horizontally
    if (this.px < 0) this.px = 320;
    if (this.px > 320) this.px = 0;
    if (this.py < 34) {
      this.py = 34;
      this.vy = 20;
    }
    if (this.py > 214) {
      this.py = 205;
      this.vy = 0;
    }

    const pRef = { x: this.px, y: this.py, vy: this.vy };
    this.collidePlatforms(pRef);
    this.py = pRef.y;
    this.vy = pRef.vy;

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.egg) {
        e.vy = Math.min(180, e.vy + 320 * dt);
        e.y += e.vy * dt;
        this.collidePlatforms(e);
        if (Math.hypot(e.x - this.px, e.y - this.py) < 16) {
          this.enemies.splice(i, 1);
          this.score += 100;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'powerup';
        }
        continue;
      }

      e.x += e.vx * dt;
      if (e.x < 0) e.x = 320;
      if (e.x > 320) e.x = 0;

      // Gentle AI flap
      if (e.y > 165 || (Math.random() < 0.035 && e.y > 60)) {
        e.vy = -135;
      }
      e.vy = Math.min(160, e.vy + 310 * dt);
      e.y += e.vy * dt;
      if (e.y < 36) {
        e.y = 36;
        e.vy = 15;
      }
      this.collidePlatforms(e);

      // Joust collision
      if (Math.hypot(e.x - this.px, e.y - this.py) < 18) {
        if (this.py < e.y - 3) {
          // Player is higher -> win joust!
          e.egg = true;
          e.vx = 0;
          e.vy = -60;
          this.vy = -120;
          this.score += 150;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
        } else if (this.invuln <= 0) {
          this.lives--;
          this.invuln = 1.4;
          this.px = 160;
          this.py = 196;
          this.vx = 0;
          this.vy = 0;
          sound = 'die';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        }
      }
    }

    if (this.enemies.length === 0) {
      this.level++;
      this.score += 250;
      if (this.score > this.highScore) this.highScore = this.score;
      this.spawnWave();
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
      message: this.gameOver ? 'UNHORSED!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>JOUST LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>FOES:{this.enemies.length}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Platforms */}
        {PLATFORMS.map((p, i) => (
          <View
            key={i}
            style={[styles.plat, { left: p.x, top: p.y, width: p.w, backgroundColor: fg }]}
          />
        ))}

        {/* Enemies / Eggs */}
        {this.enemies.map((e) =>
          e.egg ? (
            <View
              key={e.id}
              style={[styles.egg, { left: e.x - 5, top: e.y - 6, borderColor: fg }]}
            />
          ) : (
            <View
              key={e.id}
              style={[
                styles.enemy,
                { left: e.x - 9, top: e.y - 9, borderColor: fg, backgroundColor: bg },
              ]}
            >
              <Text style={[styles.kTxt, { color: fg }]}>K</Text>
            </View>
          )
        )}

        {/* Player Knight */}
        <View
          style={[
            styles.player,
            {
              left: this.px - 9,
              top: this.py - 9,
              backgroundColor: fg,
              opacity: this.invuln > 0 ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.kTxt, { color: bg }]}>P</Text>
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
  plat: {
    position: 'absolute',
    height: 6,
  },
  enemy: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  egg: {
    position: 'absolute',
    width: 10,
    height: 12,
    borderRadius: 5,
    borderWidth: 2,
  },
  player: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
