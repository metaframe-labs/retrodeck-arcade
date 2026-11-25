import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 19;
const ROWS = 21;
const TILE_SIZE = 11; // 19 * 11 = 209px width, 21 * 11 = 231px height
const ORIGIN_X = Math.floor((ARENA_W - COLS * TILE_SIZE) / 2); // 55
const ORIGIN_Y = Math.floor((ARENA_H - ROWS * TILE_SIZE) / 2); // 4

// Standard 19x21 symmetrical authentic Pac maze
// '#' = Wall, '.' = Small Dot, 'O' = Power Pellet, ' ' = Empty/Tunnel, 'H' = Ghost House, 'G' = Ghost Spawn
const MAZE_TEMPLATE: string[] = [
  '###################',
  '#O.......#.......O#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#       #.#   ',
  '####.# ##-## #.####',
  '    .  #HHH#  .    ',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#O.#.....@.....#.O#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

interface Point {
  x: number;
  y: number;
}

interface Ghost {
  id: number;
  name: 'Blinky' | 'Pinky' | 'Inky' | 'Clyde';
  x: number; // grid x (float for smooth movement)
  y: number; // grid y (float)
  dir: Point;
  nextDir: Point;
  speed: number;
  isFrightened: boolean;
  isEaten: boolean;
  spawnX: number;
  spawnY: number;
}

export class PacBoyGame implements ArcadeGameInstance {
  // Pac-Man Player
  private pacX = 9;
  private pacY = 15;
  private pacDir: Point = { x: 0, y: 0 };
  private pacNextDir: Point = { x: 0, y: 0 };
  private pacSpeed = 3.2; // grid tiles per second (one notch slower, authentic arcade)
  private mouthAngle = 0; // for chewing animation
  private deathTimer = 0; // pause delay when caught by ghost

  // Maze State
  private walls = new Set<string>();
  private dots = new Set<string>();
  private powerPellets = new Set<string>();
  private totalDots = 0;

  // Ghosts
  private ghosts: Ghost[] = [];
  private frightenTimer = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private wave = 1;
  private gameOver = false;
  private isMenu = true;
  private levelClear = false;

  private particles: Particle[] = [];
  private nextEntityId = 1;

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
    this.wave = 1;
    this.gameOver = false;
    this.isMenu = true;
    this.levelClear = false;
    this.frightenTimer = 0;
    this.deathTimer = 0;
    this.particles = [];

    this.loadMaze();
    this.resetPositions();
  }

  private loadMaze(): void {
    this.walls.clear();
    this.dots.clear();
    this.powerPellets.clear();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAZE_TEMPLATE[r][c];
        const key = `${c},${r}`;
        if (ch === '#' || ch === '-') {
          this.walls.add(key);
        } else if (ch === '.') {
          this.dots.add(key);
        } else if (ch === 'O') {
          this.powerPellets.add(key);
        }
      }
    }
    this.totalDots = this.dots.size + this.powerPellets.size;
  }

  private resetPositions(): void {
    this.pacX = 9;
    this.pacY = 15;
    this.pacDir = { x: -1, y: 0 };
    this.pacNextDir = { x: -1, y: 0 };

    this.ghosts = [
      {
        id: this.nextEntityId++,
        name: 'Blinky',
        x: 9,
        y: 7,
        dir: { x: -1, y: 0 },
        nextDir: { x: -1, y: 0 },
        speed: 2.8,
        isFrightened: false,
        isEaten: false,
        spawnX: 9,
        spawnY: 7,
      },
      {
        id: this.nextEntityId++,
        name: 'Pinky',
        x: 9,
        y: 7,
        dir: { x: 1, y: 0 },
        nextDir: { x: 1, y: 0 },
        speed: 2.6,
        isFrightened: false,
        isEaten: false,
        spawnX: 9,
        spawnY: 7,
      },
      {
        id: this.nextEntityId++,
        name: 'Inky',
        x: 8,
        y: 7,
        dir: { x: -1, y: 0 },
        nextDir: { x: -1, y: 0 },
        speed: 2.4,
        isFrightened: false,
        isEaten: false,
        spawnX: 8,
        spawnY: 7,
      },
      {
        id: this.nextEntityId++,
        name: 'Clyde',
        x: 10,
        y: 7,
        dir: { x: 1, y: 0 },
        nextDir: { x: 1, y: 0 },
        speed: 2.2,
        isFrightened: false,
        isEaten: false,
        spawnX: 10,
        spawnY: 7,
      },
    ];
  }

  private isWall(gx: number, gy: number): boolean {
    // Screen wrap tunnel rows
    if (gy === 9 && (gx < 0 || gx >= COLS)) {
      return false;
    }
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) {
      return true;
    }
    return this.walls.has(`${gx},${gy}`);
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let triggeredSound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    if (this.levelClear) {
      if (input.a && !this.lastA) {
        this.wave++;
        this.levelClear = false;
        this.loadMaze();
        this.resetPositions();
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        triggeredSound = 'powerup';
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    // Death Pause Handling (1.5s freeze when caught)
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      // Animate explosion particles during pause
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      if (this.deathTimer <= 0) {
        this.resetPositions();
      }
      this.lastA = input.a;
      return triggeredSound;
    }

    // Frighten Timer countdown
    if (this.frightenTimer > 0) {
      this.frightenTimer -= dt;
      if (this.frightenTimer <= 0) {
        this.ghosts.forEach((g) => {
          g.isFrightened = false;
        });
      }
    }

    // Input direction buffer
    if (input.left) this.pacNextDir = { x: -1, y: 0 };
    else if (input.right) this.pacNextDir = { x: 1, y: 0 };
    else if (input.up) this.pacNextDir = { x: 0, y: -1 };
    else if (input.down) this.pacNextDir = { x: 0, y: 1 };

    // Move Pac-Man
    this.movePacman(dt);

    // Mouth Chomp Animation
    if (this.pacDir.x !== 0 || this.pacDir.y !== 0) {
      this.mouthAngle = Math.abs(Math.sin(Date.now() * 0.012)); // 0.0 to 1.0 (smooth chomp)
    } else {
      this.mouthAngle = 0.5;
    }

    // Check Dot Eating
    const centerGx = Math.round(this.pacX);
    const centerGy = Math.round(this.pacY);
    const cellKey = `${centerGx},${centerGy}`;

    if (this.dots.has(cellKey)) {
      this.dots.delete(cellKey);
      this.score += 10;
      if (this.score > this.highScore) this.highScore = this.score;
      triggeredSound = 'hit';
    } else if (this.powerPellets.has(cellKey)) {
      this.powerPellets.delete(cellKey);
      this.score += 50;
      if (this.score > this.highScore) this.highScore = this.score;
      this.frightenTimer = 7.0; // 7 seconds of ghost hunting
      this.ghosts.forEach((g) => {
        if (!g.isEaten) g.isFrightened = true;
      });
      triggeredSound = 'powerup';
    }

    // Check Win (All dots eaten)
    if (this.dots.size === 0 && this.powerPellets.size === 0) {
      this.levelClear = true;
      this.score += 500;
      if (this.score > this.highScore) this.highScore = this.score;
      this.lastA = input.a;
      return 'levelclear';
    }

    // Move Ghosts
    this.moveGhosts(dt);

    // Check Collisions with Ghosts
    for (const ghost of this.ghosts) {
      const dist = Math.hypot(this.pacX - ghost.x, this.pacY - ghost.y);
      if (dist < 0.75) {
        if (ghost.isFrightened && !ghost.isEaten) {
          // Eat Ghost!
          ghost.isEaten = true;
          ghost.isFrightened = false;
          this.score += 200;
          if (this.score > this.highScore) this.highScore = this.score;
          triggeredSound = 'score';
          this.createSparks(ORIGIN_X + ghost.x * TILE_SIZE, ORIGIN_Y + ghost.y * TILE_SIZE);
        } else if (!ghost.isEaten) {
          // Pac-Man caught: freeze for 1.5 seconds
          this.createExplosion(ORIGIN_X + this.pacX * TILE_SIZE, ORIGIN_Y + this.pacY * TILE_SIZE);
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          } else {
            this.deathTimer = 1.5; // Pause for 1.5 seconds before respawn
            this.lastA = input.a;
            return 'die';
          }
        }
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

    this.lastA = input.a;
    return triggeredSound;
  }

  private movePacman(dt: number): void {
    const nextX = this.pacX + this.pacNextDir.x * this.pacSpeed * dt;
    const nextY = this.pacY + this.pacNextDir.y * this.pacSpeed * dt;

    // Check if can turn in next direction
    const checkGx = Math.round(this.pacX + this.pacNextDir.x * 0.6);
    const checkGy = Math.round(this.pacY + this.pacNextDir.y * 0.6);

    const isAligned =
      (this.pacNextDir.x !== 0 && Math.abs(this.pacY - Math.round(this.pacY)) < 0.25) ||
      (this.pacNextDir.y !== 0 && Math.abs(this.pacX - Math.round(this.pacX)) < 0.25);

    if (isAligned && !this.isWall(checkGx, checkGy)) {
      this.pacDir = this.pacNextDir;
      if (this.pacDir.x !== 0) this.pacY = Math.round(this.pacY);
      if (this.pacDir.y !== 0) this.pacX = Math.round(this.pacX);
    }

    // Move in current direction
    if (this.pacDir.x !== 0 || this.pacDir.y !== 0) {
      const stepGx = Math.round(this.pacX + this.pacDir.x * 0.55);
      const stepGy = Math.round(this.pacY + this.pacDir.y * 0.55);

      if (!this.isWall(stepGx, stepGy)) {
        this.pacX += this.pacDir.x * this.pacSpeed * dt;
        this.pacY += this.pacDir.y * this.pacSpeed * dt;
      }
    }

    // Screen wrap tunnel
    if (this.pacX < -1) this.pacX = COLS;
    else if (this.pacX > COLS) this.pacX = -1;
  }

  private moveGhosts(dt: number): void {
    const DIRS = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const g of this.ghosts) {
      // If eaten, move directly towards spawn
      if (g.isEaten) {
        const dx = g.spawnX - g.x;
        const dy = g.spawnY - g.y;
        if (Math.hypot(dx, dy) < 0.5) {
          g.isEaten = false;
          g.isFrightened = false;
        } else {
          g.x += Math.sign(dx) * 7.0 * dt;
          g.y += Math.sign(dy) * 7.0 * dt;
          continue;
        }
      }

      const effectiveSpeed = g.isFrightened ? g.speed * 0.6 : g.speed;
      g.x += g.dir.x * effectiveSpeed * dt;
      g.y += g.dir.y * effectiveSpeed * dt;

      // Tunnel wrap
      if (g.x < -1) g.x = COLS;
      else if (g.x > COLS) g.x = -1;

      // Check if entering a new tile cell
      const currentGx = Math.round(g.x);
      const currentGy = Math.round(g.y);
      const distFromCenter = Math.hypot(g.x - currentGx, g.y - currentGy);

      if (distFromCenter < effectiveSpeed * dt * 0.9) {
        g.x = currentGx;
        g.y = currentGy;

        // Valid directions excluding 180 reverse unless trapped
        let validDirs = DIRS.filter((d) => {
          if (d.x === -g.dir.x && d.y === -g.dir.y) return false;
          return !this.isWall(currentGx + d.x, currentGy + d.y);
        });

        // If trapped in a dead end, allow reverse turn
        if (validDirs.length === 0) {
          validDirs = DIRS.filter((d) => !this.isWall(currentGx + d.x, currentGy + d.y));
        }

        if (validDirs.length > 0) {
          if (g.isFrightened) {
            // Random direction in frightened mode
            g.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
          } else {
            // Target pursuit: Blinky targets Pac directly, others with slight variations
            let targetX = this.pacX;
            let targetY = this.pacY;

            if (g.name === 'Pinky') {
              targetX += this.pacDir.x * 3;
              targetY += this.pacDir.y * 3;
            } else if (g.name === 'Clyde') {
              const dist = Math.hypot(g.x - this.pacX, g.y - this.pacY);
              if (dist < 5) {
                targetX = 1;
                targetY = ROWS - 2;
              }
            }

            // Pick direction closest to target
            validDirs.sort((a, b) => {
              const distA = Math.hypot(currentGx + a.x - targetX, currentGy + a.y - targetY);
              const distB = Math.hypot(currentGx + b.x - targetX, currentGy + b.y - targetY);
              return distA - distB;
            });
            g.dir = validDirs[0];
          }
        }
      }
    }
  }

  private createSparks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
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

  public getStats(): ArcadeStats {
    const dotsLeft = this.dots.size + this.powerPellets.size;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wave,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.levelClear ? 'MAZE CLEARED!' : this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : this.levelClear
        ? 'PRESS [A] FOR NEXT MAZE'
        : `DOTS: ${dotsLeft} • D-PAD: MOVE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    // Eye white must contrast with ghost body (pixelColor in normal, screenBg or dimmed in frightened)
    // and eye pupil must contrast with the sclera
    const eyeScleraColor = palette.screenBg;
    const eyePupilColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Maze Container */}
        <View
          style={[
            styles.mazeContainer,
            {
              left: ORIGIN_X,
              top: ORIGIN_Y,
              width: COLS * TILE_SIZE,
              height: ROWS * TILE_SIZE,
            },
          ]}
        >
          {/* Walls */}
          {Array.from(this.walls).map((key) => {
            const [c, r] = key.split(',').map(Number);
            return (
              <View
                key={`w-${key}`}
                style={[
                  styles.wallTile,
                  {
                    left: c * TILE_SIZE,
                    top: r * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    backgroundColor: pixelColor,
                    borderColor: isLight ? palette.screenBg : '#000',
                  },
                ]}
              />
            );
          })}

          {/* Dots */}
          {Array.from(this.dots).map((key) => {
            const [c, r] = key.split(',').map(Number);
            return (
              <View
                key={`d-${key}`}
                style={[
                  styles.smallDot,
                  {
                    left: c * TILE_SIZE + 4.5,
                    top: r * TILE_SIZE + 4.5,
                    backgroundColor: pixelColor,
                  },
                ]}
              />
            );
          })}

          {/* Power Pellets (Blinking Big Dots) */}
          {Array.from(this.powerPellets).map((key) => {
            const [c, r] = key.split(',').map(Number);
            return (
              <View
                key={`p-${key}`}
                style={[
                  styles.powerPellet,
                  {
                    left: c * TILE_SIZE + 3,
                    top: r * TILE_SIZE + 3,
                    backgroundColor: pixelColor,
                  },
                ]}
              />
            );
          })}

          {/* Pac-Man Character */}
          {!this.gameOver && this.deathTimer <= 0 && (() => {
            const rotDeg =
              this.pacDir.x === 1
                ? '0deg'
                : this.pacDir.x === -1
                ? '180deg'
                : this.pacDir.y === 1
                ? '90deg'
                : this.pacDir.y === -1
                ? '270deg'
                : '180deg';

            // Mouth angle: 10deg (nearly closed) to 48deg (wide open)
            const openDeg = 10 + this.mouthAngle * 38;

            return (
              <View
                style={[
                  styles.pacmanWrap,
                  {
                    left: this.pacX * TILE_SIZE + 1,
                    top: this.pacY * TILE_SIZE + 1,
                    width: TILE_SIZE - 2,
                    height: TILE_SIZE - 2,
                    transform: [{ rotate: rotDeg }],
                  },
                ]}
              >
                {/* Top Half of Pac-Man */}
                <View
                  style={[
                    styles.pacHalf,
                    {
                      backgroundColor: pixelColor,
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                      transform: [
                        { translateY: 2.25 },
                        { rotate: `-${openDeg / 2}deg` },
                        { translateY: -2.25 },
                      ],
                    },
                  ]}
                />
                {/* Bottom Half of Pac-Man */}
                <View
                  style={[
                    styles.pacHalf,
                    {
                      backgroundColor: pixelColor,
                      borderBottomLeftRadius: 5,
                      borderBottomRightRadius: 5,
                      transform: [
                        { translateY: -2.25 },
                        { rotate: `${openDeg / 2}deg` },
                        { translateY: 2.25 },
                      ],
                    },
                  ]}
                />
              </View>
            );
          })()}

          {/* Ghosts */}
          {this.ghosts.map((g) => {
            const isFright = g.isFrightened && !g.isEaten;
            return (
              <View
                key={g.id}
                style={[
                  styles.ghostWrap,
                  {
                    left: g.x * TILE_SIZE + 1,
                    top: g.y * TILE_SIZE + 1,
                    width: TILE_SIZE - 2,
                    height: TILE_SIZE - 2,
                  },
                ]}
              >
                {/* Ghost dome & body */}
                <View
                  style={[
                    styles.ghostBody,
                    {
                      backgroundColor: g.isEaten
                        ? 'transparent'
                        : isFright
                        ? isLight
                          ? 'rgba(23, 38, 22, 0.45)'
                          : 'rgba(255, 255, 255, 0.45)'
                        : pixelColor,
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                    },
                  ]}
                >
                  {/* Eyes */}
                  <View style={styles.ghostEyesRow}>
                    <View
                      style={[
                        styles.ghostEye,
                        {
                          backgroundColor: eyeScleraColor,
                          borderWidth: 0.5,
                          borderColor: eyePupilColor,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.ghostPupil,
                          {
                            backgroundColor: eyePupilColor,
                            transform: [
                              {
                                translateX: g.dir.x * 0.5,
                              },
                              {
                                translateY: g.dir.y * 0.5,
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        styles.ghostEye,
                        {
                          backgroundColor: eyeScleraColor,
                          borderWidth: 0.5,
                          borderColor: eyePupilColor,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.ghostPupil,
                          {
                            backgroundColor: eyePupilColor,
                            transform: [
                              {
                                translateX: g.dir.x * 0.5,
                              },
                              {
                                translateY: g.dir.y * 0.5,
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Skirt ripples */}
                {!g.isEaten && (
                  <View style={styles.ghostSkirtRow}>
                    <View style={[styles.skirtRipp, { backgroundColor: pixelColor }]} />
                    <View style={[styles.skirtRipp, { backgroundColor: pixelColor }]} />
                    <View style={[styles.skirtRipp, { backgroundColor: pixelColor }]} />
                  </View>
                )}
              </View>
            );
          })}
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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PAC-BOY DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MAZE & GHOST CHASE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO CHOMP</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  mazeContainer: {
    position: 'absolute',
  },
  wallTile: {
    position: 'absolute',
    borderWidth: 0.5,
    borderRadius: 1,
  },
  smallDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
  },
  powerPellet: {
    position: 'absolute',
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  pacmanWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pacHalf: {
    width: 9,
    height: 4.5,
  },
  ghostWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  ghostBody: {
    width: 9,
    height: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostEyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 7,
    marginTop: 1,
  },
  ghostEye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostPupil: {
    width: 1.2,
    height: 1.2,
    borderRadius: 0.6,
  },
  ghostSkirtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 9,
    height: 2,
  },
  skirtRipp: {
    width: 2,
    height: 2,
    borderRadius: 0.5,
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
