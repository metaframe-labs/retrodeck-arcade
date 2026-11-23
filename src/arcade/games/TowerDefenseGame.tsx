import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const COLS = 16;
const ROWS = 12;
const TILE = 20;

// S-curve enemy road waypoints (grid coords)
const PATH: [number, number][] = [
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],
  [12, 3], [12, 4], [12, 5],
  [11, 5], [10, 5], [9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [4, 5], [3, 5],
  [3, 6], [3, 7], [3, 8], [3, 9],
  [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
];
const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));

interface Tower {
  c: number;
  r: number;
  cd: number;
}

interface Creep {
  id: number;
  pathIdx: number; // float along PATH
  hp: number;
  maxHp: number;
  speed: number;
}

interface Shot {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

export class TowerDefenseGame implements ArcadeGameInstance {
  private cursorC = 7;
  private cursorR = 4;
  private towers: Tower[] = [];
  private creeps: Creep[] = [];
  private shots: Shot[] = [];

  private gold = 120;
  private wave = 1;
  private spawnLeft = 6;
  private spawnTimer = 1.0;

  private score = 0;
  private highScore = 0;
  private lives = 5;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;

  private lastLeft = false;
  private lastRight = false;
  private lastUp = false;
  private lastDown = false;
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
    this.cursorC = 7;
    this.cursorR = 4;
    this.towers = [];
    this.creeps = [];
    this.shots = [];
    this.gold = 120;
    this.wave = 1;
    this.spawnLeft = 6;
    this.spawnTimer = 1.0;
    this.score = 0;
    this.lives = 5;
    this.gameOver = false;
    this.isMenu = true;
  }

  private getCreepPos(pathIdx: number): { x: number; y: number } {
    const i = Math.min(PATH.length - 1, Math.floor(pathIdx));
    const next = Math.min(PATH.length - 1, i + 1);
    const t = pathIdx - i;
    const x = (PATH[i][0] + (PATH[next][0] - PATH[i][0]) * t) * TILE + TILE / 2;
    const y = (PATH[i][1] + (PATH[next][1] - PATH[i][1]) * t) * TILE + TILE / 2;
    return { x, y };
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    // Move build cursor
    if (input.left && !this.lastLeft) this.cursorC = Math.max(0, this.cursorC - 1);
    if (input.right && !this.lastRight) this.cursorC = Math.min(COLS - 1, this.cursorC + 1);
    if (input.up && !this.lastUp) this.cursorR = Math.max(1, this.cursorR - 1);
    if (input.down && !this.lastDown) this.cursorR = Math.min(ROWS - 1, this.cursorR + 1);

    // Build Tower with [A] (Costs 50 gold)
    if (input.a && !this.lastA) {
      const key = `${this.cursorC},${this.cursorR}`;
      const exists = this.towers.some((t) => t.c === this.cursorC && t.r === this.cursorR);
      if (!PATH_SET.has(key) && !exists && this.gold >= 50) {
        this.gold -= 50;
        this.towers.push({ c: this.cursorC, r: this.cursorR, cd: 0 });
        sound = 'powerup';
      }
    }

    // Spawn creeps
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawnLeft > 0) {
      const hp = 2 + Math.floor(this.wave * 1.4);
      this.creeps.push({
        id: this.nextId++,
        pathIdx: 0,
        hp,
        maxHp: hp,
        speed: 1.7 + this.wave * 0.16,
      });
      this.spawnLeft--;
      this.spawnTimer = Math.max(0.55, 1.3 - this.wave * 0.08);
    }

    // Move creeps
    for (let i = this.creeps.length - 1; i >= 0; i--) {
      const cr = this.creeps[i];
      cr.pathIdx += cr.speed * dt;
      if (cr.pathIdx >= PATH.length - 1) {
        this.creeps.splice(i, 1);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
        sound = 'die';
      }
    }

    // Towers auto-fire at closest creep within range
    for (const t of this.towers) {
      t.cd = Math.max(0, t.cd - dt);
      if (t.cd > 0) continue;

      const tx = t.c * TILE + TILE / 2;
      const ty = t.r * TILE + TILE / 2;
      let target: Creep | null = null;
      let bestProgress = -1;

      for (const cr of this.creeps) {
        const pos = this.getCreepPos(cr.pathIdx);
        if (Math.hypot(pos.x - tx, pos.y - ty) <= 68 && cr.pathIdx > bestProgress) {
          bestProgress = cr.pathIdx;
          target = cr;
        }
      }

      if (target) {
        const pos = this.getCreepPos(target.pathIdx);
        this.shots.push({ id: this.nextId++, x1: tx, y1: ty, x2: pos.x, y2: pos.y, life: 0.12 });
        target.hp--;
        t.cd = 0.55;
        sound = 'hit';

        if (target.hp <= 0) {
          const idx = this.creeps.indexOf(target);
          if (idx !== -1) this.creeps.splice(idx, 1);
          this.gold += 20;
          this.score += 50;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
        }
      }
    }

    // Wave clear
    if (this.spawnLeft === 0 && this.creeps.length === 0) {
      this.wave++;
      this.gold += 50;
      this.score += 200;
      if (this.score > this.highScore) this.highScore = this.score;
      this.spawnLeft = 5 + this.wave * 2;
      this.spawnTimer = 1.5;
      sound = 'levelclear';
    }

    // Fade laser shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      this.shots[i].life -= dt;
      if (this.shots[i].life <= 0) this.shots.splice(i, 1);
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BASE BREACHED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `GOLD: $${this.gold} • [A]: BUILD TOWER ($50)`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top Gold HUD */}
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          GOLD: ${this.gold}   •   WAVE {this.wave}   •   TOWER=$50
        </Text>

        {/* Enemy Road Path */}
        {PATH.map(([c, r], idx) => (
          <View
            key={`p-${idx}`}
            style={{
              position: 'absolute',
              left: c * TILE,
              top: r * TILE,
              width: TILE,
              height: TILE,
              backgroundColor: isLight ? 'rgba(23,38,22,0.16)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}

        {/* Built Towers */}
        {this.towers.map((t, i) => (
          <View
            key={`tw-${i}`}
            style={{
              position: 'absolute',
              left: t.c * TILE + 2,
              top: t.r * TILE + 2,
              width: TILE - 4,
              height: TILE - 4,
              backgroundColor: pixelColor,
              borderRadius: 3,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bg }} />
          </View>
        ))}

        {/* Creeps */}
        {this.creeps.map((cr) => {
          const pos = this.getCreepPos(cr.pathIdx);
          return (
            <View
              key={cr.id}
              style={{
                position: 'absolute',
                left: pos.x - 5,
                top: pos.y - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: pixelColor,
              }}
            />
          );
        })}

        {/* Laser Pulse Dots */}
        {this.shots.map((s) => (
          <View
            key={s.id}
            style={{
              position: 'absolute',
              left: (s.x1 + s.x2) / 2 - 3,
              top: (s.y1 + s.y2) / 2 - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              borderWidth: 1.5,
              borderColor: pixelColor,
            }}
          />
        ))}

        {/* Build Cursor */}
        {!this.gameOver && !this.isMenu && (
          <View
            style={{
              position: 'absolute',
              left: this.cursorC * TILE,
              top: this.cursorR * TILE,
              width: TILE,
              height: TILE,
              borderWidth: 2,
              borderColor: pixelColor,
            }}
          />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>TOWER DEFENSE</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>PLACE TOWERS ALONG THE PATH</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DEFEND</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudTxt: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
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
