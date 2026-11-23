import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Balloon {
  id: number;
  x: number;
  y: number;
  baseX: number;
  r: number;
  vy: number;
  phase: number;
  kind: 'normal' | 'star' | 'skull';
}

interface PopFx {
  id: number;
  x: number;
  y: number;
  life: number;
  label: string;
}

export class BalloonPopGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private cx = 160;
  private cy = 120;
  private prevA = false;
  private combo = 0;

  private balloons: Balloon[] = [];
  private fx: PopFx[] = [];
  private nextId = 1;
  private spawnTimer = 0.6;
  private time = 0;

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
    this.cx = 160;
    this.cy = 120;
    this.prevA = false;
    this.combo = 0;
    this.balloons = [];
    this.fx = [];
    this.spawnTimer = 0.4;
    this.time = 0;
  }

  private spawnBalloon() {
    const roll = Math.random();
    const kind: Balloon['kind'] = roll < 0.2 ? 'skull' : roll < 0.4 ? 'star' : 'normal';
    const r = kind === 'star' ? 11 : 14;
    const baseX = 28 + Math.random() * 264;
    const baseSpeed = 34 + this.level * 6 + Math.random() * 20;
    this.balloons.push({
      id: this.nextId++,
      x: baseX,
      y: 252,
      baseX,
      r,
      vy: kind === 'star' ? baseSpeed * 1.25 : baseSpeed,
      phase: Math.random() * Math.PI * 2,
      kind,
    });
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    this.time += dt;
    let sound: ArcadeSound | null = null;

    const aimSpeed = 185;
    if (input.left) this.cx = Math.max(12, this.cx - aimSpeed * dt);
    if (input.right) this.cx = Math.min(308, this.cx + aimSpeed * dt);
    if (input.up) this.cy = Math.max(30, this.cy - aimSpeed * dt);
    if (input.down) this.cy = Math.min(228, this.cy + aimSpeed * dt);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.balloons.length < 10) {
      this.spawnBalloon();
      this.spawnTimer = Math.max(0.35, 1.05 - this.level * 0.08);
    }

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y -= b.vy * dt;
      b.x = Math.max(18, Math.min(302, b.baseX + Math.sin(this.time * 2.5 + b.phase) * 18));
      if (b.y < 14) {
        if (b.kind === 'star') {
          this.lives--;
          this.combo = 0;
          sound = 'die';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        }
        this.balloons.splice(i, 1);
      }
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].life -= dt * 2.5;
      if (this.fx[i].life <= 0) this.fx.splice(i, 1);
    }

    const fire = input.a && !this.prevA;
    this.prevA = input.a;

    if (fire) {
      let hitIdx = -1;
      let bestDist = 999;
      for (let i = 0; i < this.balloons.length; i++) {
        const b = this.balloons[i];
        const d = Math.hypot(b.x - this.cx, b.y - this.cy);
        if (d <= b.r + 7 && d < bestDist) {
          bestDist = d;
          hitIdx = i;
        }
      }

      if (hitIdx >= 0) {
        const b = this.balloons[hitIdx];
        this.balloons.splice(hitIdx, 1);
        if (b.kind === 'skull') {
          this.lives--;
          this.combo = 0;
          this.fx.push({ id: this.nextId++, x: b.x, y: b.y, life: 1, label: 'BOOM!' });
          sound = 'explode';
          if (this.lives <= 0) {
            this.gameOver = true;
            return 'gameover';
          }
        } else {
          this.combo++;
          const pts = (b.kind === 'star' ? 50 : 20) + Math.min(30, this.combo * 5);
          this.score += pts;
          if (this.score > this.highScore) this.highScore = this.score;
          this.level = 1 + Math.floor(this.score / 300);
          this.fx.push({ id: this.nextId++, x: b.x, y: b.y, life: 1, label: `+${pts}` });
          sound = b.kind === 'star' ? 'powerup' : 'score';
        }
      } else {
        this.combo = 0;
        sound = 'shoot';
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
      message: this.gameOver ? 'POPPED OUT' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>BALLOON POP</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            LV:{this.level} HP:{this.lives}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {this.balloons.map((b) => (
          <View
            key={b.id}
            style={[
              styles.balloonWrap,
              {
                left: b.x - b.r,
                top: b.y - b.r,
                width: b.r * 2,
                height: b.r * 2 + 12,
              },
            ]}
          >
            <View
              style={[
                styles.balloonBody,
                {
                  width: b.r * 2,
                  height: b.r * 2,
                  borderRadius: b.r,
                  borderColor: fg,
                  backgroundColor: b.kind === 'skull' ? fg : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.balloonIcon,
                  { color: b.kind === 'skull' ? bg : fg },
                ]}
              >
                {b.kind === 'skull' ? 'X' : b.kind === 'star' ? '*' : ''}
              </Text>
            </View>
            <View style={[styles.string, { backgroundColor: fg }]} />
          </View>
        ))}

        {this.fx.map((f) => (
          <Text
            key={f.id}
            style={[
              styles.fxTxt,
              { left: f.x - 16, top: f.y - 8, color: fg, opacity: Math.max(0, f.life) },
            ]}
          >
            {f.label}
          </Text>
        ))}

        {/* Crosshair */}
        <View style={[styles.crosshair, { left: this.cx - 11, top: this.cy - 11, borderColor: fg }]}>
          <View style={[styles.chH, { backgroundColor: fg }]} />
          <View style={[styles.chV, { backgroundColor: fg }]} />
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
    paddingHorizontal: 10,
  },
  hdrText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  balloonWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  balloonBody: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balloonIcon: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  string: {
    width: 1.5,
    height: 11,
  },
  fxTxt: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  crosshair: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chH: {
    position: 'absolute',
    width: 26,
    height: 2,
  },
  chV: {
    position: 'absolute',
    width: 2,
    height: 26,
  },
});
