import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const FLOORS = [64, 108, 152, 196]; // y positions of 4 floors
const SHAFT_X = 160;

interface Guard {
  id: number;
  floor: number;
  x: number;
  dir: number;
  alive: boolean;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  fromPlayer: boolean;
}

interface SecretFile {
  id: number;
  floor: number;
  x: number;
  taken: boolean;
}

export class ElevatorActionGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private px = 160;
  private py = 64;
  private facing = 1;
  private elevY = 64;
  private inElev = true;

  private guards: Guard[] = [];
  private bullets: Bullet[] = [];
  private files: SecretFile[] = [];
  private nextId = 1;
  private prevA = false;
  private guardShootTimer = 1.4;
  private invuln = 0;

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
    this.setupBuilding();
  }

  private setupBuilding() {
    this.px = SHAFT_X;
    this.py = FLOORS[0];
    this.elevY = FLOORS[0];
    this.inElev = true;
    this.facing = 1;
    this.bullets = [];
    this.invuln = 0.6;
    this.prevA = false;
    this.guardShootTimer = 1.4;

    this.files = [
      { id: 1, floor: 0, x: 46, taken: false },
      { id: 2, floor: 1, x: 274, taken: false },
      { id: 3, floor: 2, x: 54, taken: false },
      { id: 4, floor: 3, x: 266, taken: false },
    ];

    this.guards = [
      { id: 1, floor: 0, x: 80, dir: 1, alive: true },
      { id: 2, floor: 1, x: 240, dir: -1, alive: true },
      { id: 3, floor: 2, x: 90, dir: 1, alive: true },
      { id: 4, floor: 3, x: 230, dir: -1, alive: true },
    ];
  }

  private nearestFloor(y: number): number {
    let best = 0;
    let bestD = 999;
    FLOORS.forEach((fy, i) => {
      const d = Math.abs(fy - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    if (this.invuln > 0) this.invuln -= dt;

    const nearShaft = Math.abs(this.px - SHAFT_X) < 16;
    const onElevLevel = Math.abs(this.py - this.elevY) < 10;
    this.inElev = nearShaft && onElevLevel;

    // Elevator movement when inside shaft
    if (this.inElev) {
      if (input.up) {
        this.elevY = Math.max(FLOORS[0], this.elevY - 90 * dt);
        this.py = this.elevY;
      } else if (input.down) {
        this.elevY = Math.min(FLOORS[3], this.elevY + 90 * dt);
        this.py = this.elevY;
      } else {
        // Snap gently to closest floor
        const targetF = FLOORS[this.nearestFloor(this.elevY)];
        if (Math.abs(targetF - this.elevY) < 8) {
          this.elevY = targetF;
          this.py = targetF;
        }
      }
    }

    // Horizontal movement only when aligned with a floor
    const fIdx = this.nearestFloor(this.py);
    const alignedFloor = Math.abs(this.py - FLOORS[fIdx]) < 6;
    if (alignedFloor) {
      this.py = FLOORS[fIdx];
      if (input.left) {
        this.px = Math.max(22, this.px - 115 * dt);
        this.facing = -1;
      } else if (input.right) {
        this.px = Math.min(298, this.px + 115 * dt);
        this.facing = 1;
      }
    }

    // Shoot
    const shoot = input.a && !this.prevA;
    this.prevA = input.a;
    if (shoot) {
      this.bullets.push({
        id: this.nextId++,
        x: this.px + this.facing * 10,
        y: this.py - 10,
        vx: this.facing * 230,
        fromPlayer: true,
      });
      sound = 'shoot';
    }

    // Collect secret files
    for (const f of this.files) {
      if (!f.taken && Math.abs(this.py - FLOORS[f.floor]) < 8 && Math.abs(this.px - f.x) < 14) {
        f.taken = true;
        this.score += 100 * this.level;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'powerup';
      }
    }

    // Check exit door at bottom-left (floor 3, x=28) once all files taken
    const allTaken = this.files.every((f) => f.taken);
    if (allTaken && Math.abs(this.py - FLOORS[3]) < 8 && this.px < 38) {
      this.score += 250 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.setupBuilding();
      return 'levelclear';
    }

    // Guards patrol & shoot
    const gSpd = 38 + this.level * 7;
    this.guardShootTimer -= dt;
    for (const g of this.guards) {
      if (!g.alive) continue;
      g.x += g.dir * gSpd * dt;
      // Keep guards on their side of the shaft
      if (g.x < 26) {
        g.x = 26;
        g.dir = 1;
      } else if (g.x > 294) {
        g.x = 294;
        g.dir = -1;
      } else if (Math.abs(g.x - SHAFT_X) < 18) {
        g.dir *= -1;
        g.x += g.dir * 4;
      }

      if (
        this.guardShootTimer <= 0 &&
        Math.abs(this.py - FLOORS[g.floor]) < 8 &&
        Math.abs(this.px - g.x) < 130
      ) {
        const dir = this.px < g.x ? -1 : 1;
        this.bullets.push({
          id: this.nextId++,
          x: g.x + dir * 8,
          y: FLOORS[g.floor] - 10,
          vx: dir * (135 + this.level * 12),
          fromPlayer: false,
        });
        this.guardShootTimer = Math.max(0.7, 1.6 - this.level * 0.12);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      if (b.x < 8 || b.x > 312) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        for (const g of this.guards) {
          if (g.alive && Math.abs(b.y - (FLOORS[g.floor] - 10)) < 12 && Math.abs(b.x - g.x) < 10) {
            g.alive = false;
            this.bullets.splice(i, 1);
            this.score += 75;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'hit';
            break;
          }
        }
      } else if (this.invuln <= 0) {
        if (Math.abs(b.y - (this.py - 10)) < 12 && Math.abs(b.x - this.px) < 9) {
          this.bullets.splice(i, 1);
          this.lives--;
          this.invuln = 1.2;
          sound = 'die';
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
      message: this.gameOver ? 'AGENT DOWN' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const filesLeft = this.files.filter((f) => !f.taken).length;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>ELEVATOR LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            {filesLeft > 0 ? `FILES:${filesLeft}` : 'GO EXIT!'}
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Elevator Shaft */}
        <View style={[styles.shaft, { left: SHAFT_X - 16, borderColor: fg }]} />
        <View style={[styles.elevCar, { left: SHAFT_X - 14, top: this.elevY - 22, borderColor: fg }]} />

        {/* Floors */}
        {FLOORS.map((fy, i) => (
          <View key={i} style={[styles.floorLine, { top: fy, backgroundColor: fg }]} />
        ))}

        {/* Exit Door (Floor 3 left) */}
        <View
          style={[
            styles.exitDoor,
            {
              left: 16,
              top: FLOORS[3] - 24,
              borderColor: fg,
              backgroundColor: filesLeft === 0 ? fg : 'transparent',
            },
          ]}
        >
          <Text style={[styles.exitTxt, { color: filesLeft === 0 ? bg : fg }]}>EX</Text>
        </View>

        {/* Secret Files */}
        {this.files.map((f) =>
          !f.taken ? (
            <View
              key={f.id}
              style={[
                styles.fileBox,
                { left: f.x - 7, top: FLOORS[f.floor] - 16, borderColor: fg },
              ]}
            >
              <Text style={[styles.fileTxt, { color: fg }]}>F</Text>
            </View>
          ) : null
        )}

        {/* Guards */}
        {this.guards.map((g) =>
          g.alive ? (
            <View
              key={g.id}
              style={[
                styles.guard,
                { left: g.x - 6, top: FLOORS[g.floor] - 18, borderColor: fg },
              ]}
            >
              <View style={[styles.gHead, { backgroundColor: fg }]} />
              <View style={[styles.gBody, { backgroundColor: fg }]} />
            </View>
          ) : null
        )}

        {/* Bullets */}
        {this.bullets.map((b) => (
          <View
            key={b.id}
            style={[styles.bullet, { left: b.x - 3, top: b.y - 1, backgroundColor: fg }]}
          />
        ))}

        {/* Player Spy */}
        <View
          style={[
            styles.player,
            {
              left: this.px - 6,
              top: this.py - 19,
              opacity: this.invuln > 0 ? 0.5 : 1,
            },
          ]}
        >
          <View style={[styles.pHat, { backgroundColor: fg }]} />
          <View style={[styles.pBody, { backgroundColor: fg }]} />
        </View>

        <Text style={[styles.hint, { color: fg }]}>
          GRAB ALL [F] FILES THEN REACH [EX] DOOR
        </Text>
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
  shaft: {
    position: 'absolute',
    top: 32,
    height: 176,
    width: 32,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
  },
  elevCar: {
    position: 'absolute',
    width: 28,
    height: 22,
    borderWidth: 2,
  },
  floorLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
  },
  exitDoor: {
    position: 'absolute',
    width: 20,
    height: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  fileBox: {
    position: 'absolute',
    width: 14,
    height: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  guard: {
    position: 'absolute',
    width: 12,
    height: 18,
    alignItems: 'center',
  },
  gHead: {
    width: 6,
    height: 6,
    marginBottom: 1,
  },
  gBody: {
    width: 9,
    height: 10,
  },
  player: {
    position: 'absolute',
    width: 12,
    height: 19,
    alignItems: 'center',
  },
  pHat: {
    width: 10,
    height: 5,
    marginBottom: 1,
  },
  pBody: {
    width: 8,
    height: 12,
    borderRadius: 2,
  },
  bullet: {
    position: 'absolute',
    width: 6,
    height: 2.5,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
