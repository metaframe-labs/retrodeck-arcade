import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats, FloatText, Particle } from '../types';
import { RetroPalette } from '../../theme/palettes';

const GRID_COLS = 20;
const GRID_ROWS = 15;
const ARENA_W = 320;
const ARENA_H = 240;

interface Point {
  x: number;
  y: number;
}

interface BonusBug {
  x: number;
  y: number;
  timeLeft: number;
  maxTime: number;
  moveTimer: number;
}

export class SnakeGame implements ArcadeGameInstance {
  private snake: Point[] = [];
  private dir: Point = { x: 1, y: 0 };
  private nextDir: Point = { x: 1, y: 0 };
  private inputQueue: Point[] = [];

  private food: Point = { x: 14, y: 7 };
  private bug: BonusBug | null = null;
  private foodCount = 0;

  private score = 0;
  private highScore = 0;
  private level = 1;
  private gameOver = false;
  private isMenu = true;

  private tickTimer = 0;
  private baseTickRate = 0.22; // Authentic relaxed Nokia 3310 step rate

  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];
  private nextEntityId = 1;

  constructor(initialHighScore = 0) {
    this.highScore = initialHighScore;
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
    }
  }

  public init(): void {
    this.snake = [
      { x: 6, y: 7 },
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.inputQueue = [];
    this.score = 0;
    this.level = 1;
    this.foodCount = 0;
    this.bug = null;
    this.gameOver = false;
    this.isMenu = true;
    this.tickTimer = 0;
    this.particles = [];
    this.floatTexts = [];
    this.spawnFood();
  }

  public reset(): void {
    this.init();
  }

  private spawnFood(): void {
    let attempts = 0;
    while (attempts < 100) {
      const fx = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
      const fy = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
      const onSnake = this.snake.some((s) => s.x === fx && s.y === fy);
      const onBug = this.bug && this.bug.x === fx && this.bug.y === fy;

      if (!onSnake && !onBug) {
        this.food = { x: fx, y: fy };
        break;
      }
      attempts++;
    }
  }

  private spawnBonusBug(): void {
    let attempts = 0;
    while (attempts < 100) {
      const bx = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
      const by = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
      const onSnake = this.snake.some((s) => s.x === bx && s.y === by);
      const onFood = this.food.x === bx && this.food.y === by;

      if (!onSnake && !onFood) {
        this.bug = {
          x: bx,
          y: by,
          timeLeft: 14,
          maxTime: 14,
          moveTimer: 0.65,
        };
        this.addFloatText(
          (bx / GRID_COLS) * ARENA_W,
          (by / GRID_ROWS) * ARENA_H,
          'BUG DETECTED!',
          '#FFD700'
        );
        break;
      }
      attempts++;
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.isMenu) {
      if (input.a) {
        this.isMenu = false;
        return 'hit';
      }
      return null;
    }

    if (this.gameOver) {
      if (input.a || input.b) {
        this.init();
        return 'hit';
      }
      return null;
    }

    let soundToPlay: ArcadeSound | null = null;

    // Handle directional input with anti-reverse queue
    let requestedDir: Point | null = null;
    if (input.up) requestedDir = { x: 0, y: -1 };
    else if (input.down) requestedDir = { x: 0, y: 1 };
    else if (input.left) requestedDir = { x: -1, y: 0 };
    else if (input.right) requestedDir = { x: 1, y: 0 };

    if (requestedDir) {
      const lastPlanned =
        this.inputQueue.length > 0 ? this.inputQueue[this.inputQueue.length - 1] : this.nextDir;

      // Prevent reversing into own neck
      const isReverse =
        lastPlanned.x + requestedDir.x === 0 && lastPlanned.y + requestedDir.y === 0;
      const isSame =
        lastPlanned.x === requestedDir.x && lastPlanned.y === requestedDir.y;

      if (!isReverse && !isSame && this.inputQueue.length < 2) {
        this.inputQueue.push(requestedDir);
      }
    }

    // Update bug timer & movement
    if (this.bug) {
      this.bug.timeLeft -= dt;
      this.bug.moveTimer -= dt;

      if (this.bug.moveTimer <= 0) {
        this.bug.moveTimer = 0.65;
        // Crawl 1 step in random direction
        const dirs: Point[] = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = this.bug.x + randomDir.x;
        const ny = this.bug.y + randomDir.y;
        if (
          nx >= 1 &&
          nx < GRID_COLS - 1 &&
          ny >= 1 &&
          ny < GRID_ROWS - 1 &&
          !this.snake.some((s) => s.x === nx && s.y === ny)
        ) {
          this.bug.x = nx;
          this.bug.y = ny;
        }
      }

      if (this.bug.timeLeft <= 0) {
        this.bug = null;
      }
    }

    // Step clock calculation (accelerates smoothly as snake gets longer)
    const currentTickRate = Math.max(0.12, this.baseTickRate - this.snake.length * 0.002);
    this.tickTimer += dt;

    if (this.tickTimer >= currentTickRate) {
      this.tickTimer -= currentTickRate;

      // Apply next queued direction
      if (this.inputQueue.length > 0) {
        this.nextDir = this.inputQueue.shift()!;
      }
      this.dir = this.nextDir;

      // Calculate new head position
      const head = this.snake[0];
      const newHead: Point = {
        x: head.x + this.dir.x,
        y: head.y + this.dir.y,
      };

      // 1. Wall Collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_COLS ||
        newHead.y < 0 ||
        newHead.y >= GRID_ROWS
      ) {
        this.gameOver = true;
        this.spawnExplosion(
          (head.x / GRID_COLS) * ARENA_W,
          (head.y / GRID_ROWS) * ARENA_H,
          15,
          '#FF0055'
        );
        return 'die';
      }

      // 2. Self Collision
      const hitSelf = this.snake.slice(0, -1).some((s) => s.x === newHead.x && s.y === newHead.y);
      if (hitSelf) {
        this.gameOver = true;
        this.spawnExplosion(
          (head.x / GRID_COLS) * ARENA_W,
          (head.y / GRID_ROWS) * ARENA_H,
          15,
          '#FF0055'
        );
        return 'die';
      }

      // Advance snake
      this.snake.unshift(newHead);

      // 3. Food Eaten
      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        const pts = 100 * this.level;
        this.score += pts;
        if (this.score > this.highScore) this.highScore = this.score;
        this.foodCount++;

        this.spawnExplosion(
          (newHead.x / GRID_COLS) * ARENA_W + 8,
          (newHead.y / GRID_ROWS) * ARENA_H + 8,
          8,
          '#39FF14'
        );
        this.addFloatText(
          (newHead.x / GRID_COLS) * ARENA_W,
          (newHead.y / GRID_ROWS) * ARENA_H,
          `+${pts}`,
          '#39FF14'
        );

        this.spawnFood();
        soundToPlay = 'score';

        // Spawn bonus bug every 5 foods
        if (this.foodCount % 5 === 0 && !this.bug) {
          this.spawnBonusBug();
        }

        // Level up every 10 foods
        if (this.foodCount % 10 === 0) {
          this.level++;
        }
      } else if (this.bug && newHead.x === this.bug.x && newHead.y === this.bug.y) {
        // 4. Bonus Bug Eaten!
        const bonusPts = Math.floor(300 + (this.bug.timeLeft / this.bug.maxTime) * 700);
        this.score += bonusPts;
        if (this.score > this.highScore) this.highScore = this.score;

        this.spawnExplosion(
          (newHead.x / GRID_COLS) * ARENA_W + 8,
          (newHead.y / GRID_ROWS) * ARENA_H + 8,
          16,
          '#FFD700'
        );
        this.addFloatText(
          (newHead.x / GRID_COLS) * ARENA_W,
          (newHead.y / GRID_ROWS) * ARENA_H,
          `+${bonusPts} BUG!`,
          '#FFD700'
        );

        this.bug = null;
        soundToPlay = 'powerup';
      } else {
        // Pop tail if no food eaten
        this.snake.pop();
      }
    }

    // Update Particles & Float Texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const t = this.floatTexts[i];
      t.y -= 25 * dt;
      t.life -= 1.2 * dt;
      if (t.life <= 0) this.floatTexts.splice(i, 1);
    }

    return soundToPlay;
  }

  private spawnExplosion(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 110;
      this.particles.push({
        id: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2,
        color,
        life: 1.0,
        decay: 2.0 + Math.random() * 1.5,
      });
    }
  }

  private addFloatText(x: number, y: number, text: string, color: string): void {
    this.floatTexts.push({
      id: this.nextEntityId++,
      text,
      x: Math.max(16, Math.min(ARENA_W - 60, x - 15)),
      y,
      color,
      life: 1.0,
    });
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'GAME OVER' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : 'D-PAD TO STEER • EAT APPLES & BUGS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const cellW = (1 / GRID_COLS) * 100;
    const cellH = (1 / GRID_ROWS) * 100;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Arena Border Grid Line */}
        <View
          style={[
            styles.borderBox,
            { borderColor: `${palette.bezelAccent}33` },
          ]}
        />

        {/* Regular Food (Apple) */}
        <View
          style={[
            styles.foodItem,
            {
              left: `${(this.food.x / GRID_COLS) * 100}%`,
              top: `${(this.food.y / GRID_ROWS) * 100}%`,
              width: `${cellW}%`,
              height: `${cellH}%`,
            },
          ]}
        >
          <View
            style={[
              styles.foodDot,
              { backgroundColor: palette.pixelOn, shadowColor: palette.pixelOn },
            ]}
          />
        </View>

        {/* Nokia Bonus Bug with Countdown Gauge */}
        {this.bug && (
          <View
            style={[
              styles.bugContainer,
              {
                left: `${(this.bug.x / GRID_COLS) * 100}%`,
                top: `${(this.bug.y / GRID_ROWS) * 100}%`,
                width: `${cellW}%`,
                height: `${cellH}%`,
              },
            ]}
          >
            <View style={[styles.bugBody, { backgroundColor: '#FFD700' }]}>
              {/* Antennae */}
              <View style={[styles.bugAntenna, { left: 1 }]} />
              <View style={[styles.bugAntenna, { right: 1 }]} />
            </View>
            {/* Countdown bar */}
            <View style={styles.bugBarWrap}>
              <View
                style={[
                  styles.bugBarFill,
                  {
                    width: `${(this.bug.timeLeft / this.bug.maxTime) * 100}%`,
                    backgroundColor: '#FFD700',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Snake Body & Head */}
        {this.snake.map((segment, index) => {
          const isHead = index === 0;
          const isTail = index === this.snake.length - 1;

          return (
            <View
              key={index}
              style={[
                styles.snakeSegment,
                {
                  left: `${(segment.x / GRID_COLS) * 100}%`,
                  top: `${(segment.y / GRID_ROWS) * 100}%`,
                  width: `${cellW}%`,
                  height: `${cellH}%`,
                  backgroundColor: isHead ? '#FFFFFF' : palette.pixelOn,
                  borderRadius: isHead ? 4 : isTail ? 2 : 1,
                  opacity: isHead ? 1 : Math.max(0.65, 1 - index * 0.015),
                },
              ]}
            >
              {isHead && (
                <View style={styles.headEyeCluster}>
                  <View style={[styles.headEye, { backgroundColor: '#000000' }]} />
                  <View style={[styles.headEye, { backgroundColor: '#000000' }]} />
                </View>
              )}
            </View>
          );
        })}

        {/* Particles */}
        {this.particles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: `${(p.x / ARENA_W) * 100}%`,
                top: `${(p.y / ARENA_H) * 100}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
              },
            ]}
          />
        ))}

        {/* Floating Text Popups */}
        {this.floatTexts.map((t) => (
          <Text
            key={t.id}
            style={[
              styles.floatText,
              {
                left: `${(t.x / ARENA_W) * 100}%`,
                top: `${(t.y / ARENA_H) * 100}%`,
                color: t.color,
                opacity: t.life,
              },
            ]}
          >
            {t.text}
          </Text>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  borderBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  foodItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  bugContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bugBody: {
    width: 10,
    height: 9,
    borderRadius: 3,
    position: 'relative',
  },
  bugAntenna: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 2,
    backgroundColor: '#FFD700',
    borderRadius: 1,
  },
  bugBarWrap: {
    position: 'absolute',
    bottom: -3,
    width: 12,
    height: 2,
    backgroundColor: '#222222',
    borderRadius: 1,
    overflow: 'hidden',
  },
  bugBarFill: {
    height: '100%',
  },
  snakeSegment: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  headEyeCluster: {
    flexDirection: 'row',
    gap: 3,
  },
  headEye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1,
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
  },
  floatText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
