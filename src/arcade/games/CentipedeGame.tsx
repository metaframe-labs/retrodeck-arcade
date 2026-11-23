import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 20;
const ROWS = 15;
const CELL = 16;

interface Segment {
  id: number;
  x: number; // grid float
  y: number;
  dir: number; // 1 or -1
  isHead: boolean;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

export class CentipedeGame implements ArcadeGameInstance {
  private playerX = ARENA_W / 2 - 7;
  private playerY = ARENA_H - 22;
  private mushrooms = new Map<string, number>(); // "c,r" -> hp (1..3)
  private segments: Segment[] = [];
  private bullets: Bullet[] = [];

  private shootCd = 0;
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
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
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.playerX = ARENA_W / 2 - 7;
    this.playerY = ARENA_H - 22;
    this.bullets = [];

    // Seed mushrooms
    this.mushrooms.clear();
    for (let i = 0; i < 24; i++) {
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      const r = 1 + Math.floor(Math.random() * (ROWS - 4));
      this.mushrooms.set(`${c},${r}`, 3);
    }

    this.spawnCentipede();
  }

  private spawnCentipede(): void {
    this.segments = [];
    const len = Math.min(12, 7 + this.wave);
    for (let i = 0; i < len; i++) {
      this.segments.push({
        id: this.nextId++,
        x: 10 - i * 0.95,
        y: 0,
        dir: 1,
        isHead: i === 0,
      });
    }
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

    // Player movement (confined to lower 30% zone like arcade Centipede)
    const pSpd = 155;
    if (input.left) this.playerX = Math.max(4, this.playerX - pSpd * dt);
    if (input.right) this.playerX = Math.min(ARENA_W - 18, this.playerX + pSpd * dt);
    if (input.up) this.playerY = Math.max(ARENA_H - 68, this.playerY - pSpd * dt);
    if (input.down) this.playerY = Math.min(ARENA_H - 16, this.playerY + pSpd * dt);

    // Rapid fire laser
    this.shootCd = Math.max(0, this.shootCd - dt);
    if ((input.a || input.b) && this.shootCd <= 0 && this.bullets.length < 3) {
      this.bullets.push({
        id: this.nextId++,
        x: this.playerX + 6,
        y: this.playerY - 4,
      });
      this.shootCd = 0.2;
      sound = 'shoot';
    }

    // Move Centipede segments
    const cSpd = 4.5 + this.wave * 0.6;
    for (const s of this.segments) {
      const nextX = s.x + s.dir * cSpd * dt;
      const checkCol = Math.floor(nextX + (s.dir > 0 ? 0.8 : 0.1));
      const row = Math.round(s.y);

      const hitEdge = nextX < 0 || nextX > COLS - 1;
      const hitShroom = this.mushrooms.has(`${checkCol},${row}`);

      if (hitEdge || hitShroom) {
        s.dir = -s.dir;
        s.y = Math.min(ROWS - 1, s.y + 1);
        if (s.y >= ROWS - 1 && hitEdge) {
          s.y = ROWS - 3; // Patrol bottom zone
        }
      } else {
        s.x = nextX;
      }

      // Check collision with player
      const sx = s.x * CELL + CELL / 2;
      const sy = s.y * CELL + CELL / 2;
      if (Math.hypot(sx - (this.playerX + 7), sy - (this.playerY + 7)) < 12) {
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        } else {
          this.playerX = ARENA_W / 2 - 7;
          this.playerY = ARENA_H - 22;
          this.spawnCentipede();
          this.lastA = input.a;
          return 'die';
        }
      }
    }

    // Update Bullets
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      b.y -= 310 * dt;
      if (b.y < -8) {
        this.bullets.splice(bi, 1);
        continue;
      }

      // Bullet vs Mushroom
      const mc = Math.floor(b.x / CELL);
      const mr = Math.floor(b.y / CELL);
      const mKey = `${mc},${mr}`;
      if (this.mushrooms.has(mKey)) {
        const hp = (this.mushrooms.get(mKey) || 1) - 1;
        if (hp <= 0) {
          this.mushrooms.delete(mKey);
          this.score += 5;
        } else {
          this.mushrooms.set(mKey, hp);
        }
        this.bullets.splice(bi, 1);
        sound = 'hit';
        continue;
      }

      // Bullet vs Centipede Segment
      for (let si = this.segments.length - 1; si >= 0; si--) {
        const s = this.segments[si];
        const sx = s.x * CELL + CELL / 2;
        const sy = s.y * CELL + CELL / 2;
        if (Math.hypot(b.x - sx, b.y - sy) < 10) {
          // Turn killed segment into a mushroom & split centipede!
          this.mushrooms.set(`${Math.round(s.x)},${Math.round(s.y)}`, 3);
          this.segments.splice(si, 1);
          if (si < this.segments.length) {
            this.segments[si].isHead = true;
          }
          this.bullets.splice(bi, 1);
          this.score += s.isHead ? 100 : 25;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
          break;
        }
      }
    }

    // Wave Clear
    if (this.segments.length === 0) {
      this.wave++;
      this.score += 300;
      if (this.score > this.highScore) this.highScore = this.score;
      this.spawnCentipede();
      sound = 'levelclear';
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OVERRUN!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'D-PAD: MOVE • [A]: RAPID FIRE',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Mushrooms */}
        {Array.from(this.mushrooms.entries()).map(([key, hp]) => {
          const [c, r] = key.split(',').map(Number);
          return (
            <View
              key={`m-${key}`}
              style={{
                position: 'absolute',
                left: c * CELL + 2,
                top: r * CELL + 2,
                width: CELL - 4,
                height: CELL - 4,
                alignItems: 'center',
                opacity: hp === 3 ? 1 : hp === 2 ? 0.65 : 0.35,
              }}
            >
              <View style={{ width: 12, height: 7, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: pixelColor }} />
              <View style={{ width: 5, height: 5, backgroundColor: pixelColor }} />
            </View>
          );
        })}

        {/* Centipede Segments */}
        {this.segments.map((s) => (
          <View
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x * CELL + 1,
              top: s.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              borderRadius: (CELL - 2) / 2,
              backgroundColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {s.isHead && (
              <View style={{ flexDirection: 'row', gap: 3 }}>
                <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
                <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: bg }} />
              </View>
            )}
          </View>
        ))}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: 2, height: 8, backgroundColor: pixelColor }} />
        ))}

        {/* Player Bug Blaster */}
        {!this.gameOver && (
          <View style={{ position: 'absolute', left: this.playerX, top: this.playerY, width: 14, height: 14, alignItems: 'center' }}>
            <View style={{ width: 4, height: 5, backgroundColor: pixelColor }} />
            <View style={{ width: 14, height: 8, borderRadius: 3, backgroundColor: pixelColor }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>CENTIPEDE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MUSHROOM GARDEN SHOOTER</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO BLAST</Text>
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
