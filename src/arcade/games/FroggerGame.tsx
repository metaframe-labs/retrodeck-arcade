import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const GRID_COLS = 16;
const GRID_ROWS = 13;
const TILE_W = 20; // 16 * 20 = 320px
const TILE_H = 18; // 13 * 18 = 234px, +6px padding

// Rows:
// Row 0: Homes / Lilypads (5 homes)
// Row 1..5: River (Logs & Turtles)
// Row 6: Middle Safe Pavement
// Row 7..11: Road (Vehicles: Cars, Trucks, Racecars)
// Row 12: Bottom Start Sidewalk

interface MovingEntity {
  id: number;
  row: number;
  x: number;
  w: number;
  speed: number; // px per second (+ right, - left)
  type: 'car' | 'truck' | 'racecar' | 'log' | 'turtle';
}

export class FroggerGame implements ArcadeGameInstance {
  // Frog Position
  private frogCol = 7;
  private frogRow = 12; // Start row
  private frogFacing = 0; // 0: up, 1: right, 2: down, 3: left

  // Homes filled (5 homes in row 0 at cols 1, 4, 7, 10, 13)
  private readonly homeCols = [1, 4, 7, 10, 13];
  private filledHomes: boolean[] = [false, false, false, false, false];

  // Lanes configuration
  private entities: MovingEntity[] = [];

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;

  // Time limit bar
  private timeLeft = 30;
  private readonly maxTime = 30;

  private particles: Particle[] = [];
  private nextEntityId = 1;

  // Discrete D-Pad input debouncing
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
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.timeLeft = 30;
    this.filledHomes = [false, false, false, false, false];
    this.particles = [];

    this.resetFrog();
    this.spawnLanes();
  }

  private resetFrog(): void {
    this.frogCol = 7;
    this.frogRow = 12;
    this.frogFacing = 0;
    this.timeLeft = this.maxTime;
  }

  private spawnLanes(): void {
    this.entities = [];
    const speedScale = 1 + (this.level - 1) * 0.15;

    // Road Vehicles (Rows 7..11)
    // Row 11: Slow Cars (Left)
    this.spawnRowEntities(11, 3, 24, -42 * speedScale, 'car', 95);
    // Row 10: Fast Racecars (Right)
    this.spawnRowEntities(10, 2, 22, 75 * speedScale, 'racecar', 150);
    // Row 9: Heavy Trucks (Left)
    this.spawnRowEntities(9, 2, 44, -38 * speedScale, 'truck', 160);
    // Row 8: City Cars (Right)
    this.spawnRowEntities(8, 3, 22, 52 * speedScale, 'car', 105);
    // Row 7: Fast Sedans (Left)
    this.spawnRowEntities(7, 3, 24, -65 * speedScale, 'racecar', 115);

    // River Floaters (Rows 1..5)
    // Row 5: Small Logs (Right)
    this.spawnRowEntities(5, 3, 50, 40 * speedScale, 'log', 110);
    // Row 4: Turtles (Left)
    this.spawnRowEntities(4, 3, 40, -50 * speedScale, 'turtle', 110);
    // Row 3: Long Logs (Right)
    this.spawnRowEntities(3, 2, 85, 60 * speedScale, 'log', 170);
    // Row 2: Turtles (Left)
    this.spawnRowEntities(2, 3, 36, -45 * speedScale, 'turtle', 115);
    // Row 1: Medium Logs (Right)
    this.spawnRowEntities(1, 3, 60, 48 * speedScale, 'log', 120);
  }

  private spawnRowEntities(
    row: number,
    count: number,
    w: number,
    speed: number,
    type: 'car' | 'truck' | 'racecar' | 'log' | 'turtle',
    spacing: number
  ): void {
    for (let i = 0; i < count; i++) {
      this.entities.push({
        id: this.nextEntityId++,
        row,
        x: i * spacing + (speed > 0 ? 0 : 40),
        w,
        speed,
        type,
      });
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.updateInputStates(input);
      return triggeredSound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.updateInputStates(input);
      return triggeredSound;
    }

    // Time countdown
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      return this.handleDeath();
    }

    // Move Lanes Entities
    for (const e of this.entities) {
      e.x += e.speed * dt;
      if (e.speed > 0 && e.x > ARENA_W + 30) {
        e.x = -e.w - 20;
      } else if (e.speed < 0 && e.x < -e.w - 30) {
        e.x = ARENA_W + 20;
      }
    }

    // Discrete Frog Movement
    if (input.up && !this.lastUp) {
      if (this.frogRow > 0) {
        this.frogRow--;
        this.frogFacing = 0;
        this.score += 10;
        if (this.score > this.highScore) this.highScore = this.score;
        triggeredSound = 'hit';
      }
    } else if (input.down && !this.lastDown) {
      if (this.frogRow < 12) {
        this.frogRow++;
        this.frogFacing = 2;
        triggeredSound = 'hit';
      }
    } else if (input.left && !this.lastLeft) {
      if (this.frogCol > 0) {
        this.frogCol--;
        this.frogFacing = 3;
        triggeredSound = 'hit';
      }
    } else if (input.right && !this.lastRight) {
      if (this.frogCol < GRID_COLS - 1) {
        this.frogCol++;
        this.frogFacing = 1;
        triggeredSound = 'hit';
      }
    }

    const frogPxX = this.frogCol * TILE_W + 2;
    const frogPxW = TILE_W - 4;

    // Check Road Collisions (Rows 7..11)
    if (this.frogRow >= 7 && this.frogRow <= 11) {
      for (const e of this.entities) {
        if (e.row === this.frogRow) {
          if (frogPxX + frogPxW - 4 >= e.x && frogPxX + 4 <= e.x + e.w) {
            // Hit by car!
            return this.handleDeath();
          }
        }
      }
    }

    // Check River Logic (Rows 1..5)
    if (this.frogRow >= 1 && this.frogRow <= 5) {
      let onLogOrTurtle = false;
      let carrierSpeed = 0;

      for (const e of this.entities) {
        if (e.row === this.frogRow) {
          if (frogPxX + frogPxW / 2 >= e.x && frogPxX + frogPxW / 2 <= e.x + e.w) {
            onLogOrTurtle = true;
            carrierSpeed = e.speed;
            break;
          }
        }
      }

      if (onLogOrTurtle) {
        // Carry frog with log
        const deltaCol = (carrierSpeed * dt) / TILE_W;
        this.frogCol += deltaCol;

        // Drowned by drifting off screen
        if (this.frogCol < -0.5 || this.frogCol > GRID_COLS - 0.5) {
          return this.handleDeath();
        }
      } else {
        // Drowned in river water!
        return this.handleDeath();
      }
    }

    // Check Home Ingestion (Row 0)
    if (this.frogRow === 0) {
      const snappedCol = Math.round(this.frogCol);
      const homeIdx = this.homeCols.indexOf(snappedCol);

      if (homeIdx !== -1 && !this.filledHomes[homeIdx]) {
        // Home reached!
        this.filledHomes[homeIdx] = true;
        this.score += 200 + Math.floor(this.timeLeft) * 10;
        if (this.score > this.highScore) this.highScore = this.score;
        this.createSparks(snappedCol * TILE_W + 10, 10);
        triggeredSound = 'score';

        // Check if all 5 homes filled
        if (this.filledHomes.every(Boolean)) {
          this.level++;
          this.score += 1000;
          if (this.score > this.highScore) this.highScore = this.score;
          this.filledHomes = [false, false, false, false, false];
          this.spawnLanes();
          this.resetFrog();
          return 'levelclear';
        } else {
          this.resetFrog();
        }
      } else {
        // Crashed into bush or already filled home
        return this.handleDeath();
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.updateInputStates(input);
    return triggeredSound;
  }

  private handleDeath(): ArcadeSound {
    this.createExplosion(this.frogCol * TILE_W + 10, this.frogRow * TILE_H + 9);
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      return 'gameover';
    } else {
      this.resetFrog();
      return 'die';
    }
  }

  private createSparks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        size: 2,
        color: '#FFF',
        life: 0.25,
        decay: 3,
      });
    }
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 35 + Math.random() * 30;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#FFF',
        life: 0.35,
        decay: 2.2,
      });
    }
  }

  private updateInputStates(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    const homesLeft = this.filledHomes.filter((h) => !h).length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'SPLAT!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `HOMES LEFT: ${homesLeft} • TIME: ${Math.ceil(this.timeLeft)}s`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* River Background (Rows 1..5) */}
        <View
          style={[
            styles.riverZone,
            {
              top: 1 * TILE_H,
              height: 5 * TILE_H,
              backgroundColor: isLight ? 'rgba(23, 38, 22, 0.12)' : 'rgba(0, 0, 0, 0.35)',
              borderColor: pixelColor,
            },
          ]}
        />

        {/* Middle Safe Sidewalk (Row 6) */}
        <View
          style={[
            styles.safeSidewalk,
            {
              top: 6 * TILE_H,
              height: TILE_H,
              backgroundColor: isLight ? 'rgba(23, 38, 22, 0.25)' : 'rgba(255, 255, 255, 0.1)',
            },
          ]}
        />

        {/* Road Background (Rows 7..11) */}
        <View
          style={[
            styles.roadZone,
            {
              top: 7 * TILE_H,
              height: 5 * TILE_H,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: pixelColor,
            },
          ]}
        />

        {/* Home Base Bays (Row 0) */}
        {this.homeCols.map((col, idx) => {
          const filled = this.filledHomes[idx];
          return (
            <View
              key={`home-${idx}`}
              style={[
                styles.homeBay,
                {
                  left: col * TILE_W + 1,
                  top: 2,
                  width: TILE_W - 2,
                  height: TILE_H - 4,
                  borderColor: pixelColor,
                  backgroundColor: filled ? pixelColor : 'transparent',
                },
              ]}
            >
              {filled && (
                <View
                  style={[
                    styles.homeFrogIcon,
                    { backgroundColor: isLight ? palette.screenBg : '#000' },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* Moving Entities (Vehicles & Logs) */}
        {this.entities.map((e) => {
          const topY = e.row * TILE_H + 1;
          const isLog = e.type === 'log';
          const isTurtle = e.type === 'turtle';

          return (
            <View
              key={e.id}
              style={[
                styles.entityBox,
                {
                  left: e.x,
                  top: topY,
                  width: e.w,
                  height: TILE_H - 2,
                  backgroundColor: isLog
                    ? isLight
                      ? 'rgba(23, 38, 22, 0.35)'
                      : 'rgba(255, 255, 255, 0.3)'
                    : pixelColor,
                  borderColor: isLight ? palette.screenBg : '#000',
                  borderRadius: isLog ? 4 : isTurtle ? 6 : 2,
                },
              ]}
            >
              {/* Vehicle Windshield */}
              {!isLog && !isTurtle && (
                <View
                  style={[
                    styles.windshield,
                    { backgroundColor: isLight ? palette.screenBg : '#000' },
                  ]}
                />
              )}
              {/* Turtle shell pattern */}
              {isTurtle && (
                <View
                  style={[
                    styles.turtleShell,
                    { borderColor: isLight ? palette.screenBg : '#000' },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* Frog Player */}
        {!this.gameOver && (
          <View
            style={[
              styles.frogCharacter,
              {
                left: this.frogCol * TILE_W + 2,
                top: this.frogRow * TILE_H + 2,
                width: TILE_W - 4,
                height: TILE_H - 4,
                transform: [
                  {
                    rotate:
                      this.frogFacing === 0
                        ? '0deg'
                        : this.frogFacing === 1
                        ? '90deg'
                        : this.frogFacing === 2
                        ? '180deg'
                        : '270deg',
                  },
                ],
              },
            ]}
          >
            {/* Frog Eyes */}
            <View style={styles.frogEyesRow}>
              <View style={[styles.frogEye, { backgroundColor: pixelColor }]} />
              <View style={[styles.frogEye, { backgroundColor: pixelColor }]} />
            </View>
            {/* Frog Body */}
            <View style={[styles.frogBody, { backgroundColor: pixelColor }]} />
            {/* Frog Legs */}
            <View style={styles.frogLegsRow}>
              <View style={[styles.frogFoot, { backgroundColor: pixelColor }]} />
              <View style={[styles.frogFoot, { backgroundColor: pixelColor }]} />
            </View>
          </View>
        )}

        {/* Time Remaining Bar */}
        <View style={styles.timeBarWrap}>
          <View
            style={[
              styles.timeBarFill,
              {
                width: `${Math.max(0, (this.timeLeft / this.maxTime) * 100)}%`,
                backgroundColor: pixelColor,
              },
            ]}
          />
        </View>

        {/* Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: pixelColor,
                opacity: p.life,
              },
            ]}
          />
        ))}

        {/* Start / Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? palette.screenBg : '#111',
                  borderColor: pixelColor,
                },
              ]}
            >
              <Text style={[styles.menuTitle, { color: pixelColor }]}>FROGGER DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>RETRO ROAD & RIVER</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO HOP</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  riverZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  safeSidewalk: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  roadZone: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  homeBay: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeFrogIcon: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  entityBox: {
    position: 'absolute',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  windshield: {
    width: 4,
    height: 6,
    borderRadius: 1,
  },
  turtleShell: {
    width: '60%',
    height: '60%',
    borderWidth: 1,
    borderRadius: 2,
  },
  frogCharacter: {
    position: 'absolute',
    alignItems: 'center',
  },
  frogEyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 10,
  },
  frogEye: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  frogBody: {
    width: 10,
    height: 7,
    borderRadius: 3,
    marginTop: -1,
  },
  frogLegsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 12,
    marginTop: 0.5,
  },
  frogFoot: {
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  timeBarWrap: {
    position: 'absolute',
    bottom: 2,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: 'rgba(23, 38, 22, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  timeBarFill: {
    height: '100%',
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
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
