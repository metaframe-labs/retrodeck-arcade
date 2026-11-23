import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 19; // Odd dimensions for recursive backtracker maze
const ROWS = 13;
const CELL = 15; // 285x195 centered
const OX = Math.floor((ARENA_W - COLS * CELL) / 2); // 17
const OY = 28;

export class MazeEscapeGame implements ArcadeGameInstance {
  // 1 = wall, 0 = path
  private maze: number[][] = [];
  private px = 1;
  private py = 1;
  private exitX = COLS - 2;
  private exitY = ROWS - 2;

  private moveCd = 0;
  private timeLeft = 35;
  private level = 1;
  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
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
    this.level = 1;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.generateMaze();
  }

  private generateMaze(): void {
    // Recursive Backtracker: Guarantees 100% solvable spanning-tree maze every time!
    this.maze = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    const stack: [number, number][] = [[1, 1]];
    this.maze[1][1] = 0;

    const dirs = [
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0],
    ];

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const shuffled = [...dirs].sort(() => Math.random() - 0.5);
      let carved = false;

      for (const [dx, dy] of shuffled) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && this.maze[ny][nx] === 1) {
          this.maze[cy + dy / 2][cx + dx / 2] = 0;
          this.maze[ny][nx] = 0;
          stack.push([nx, ny]);
          carved = true;
          break;
        }
      }
      if (!carved) stack.pop();
    }

    this.px = 1;
    this.py = 1;
    this.exitX = COLS - 2;
    this.exitY = ROWS - 2;
    this.maze[this.exitY][this.exitX] = 0;
    this.timeLeft = Math.max(16, 36 - (this.level - 1) * 2);
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

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.lastA = input.a;
      return 'gameover';
    }

    // Fast continuous grid step
    this.moveCd = Math.max(0, this.moveCd - dt);
    if (this.moveCd <= 0) {
      let nx = this.px;
      let ny = this.py;
      if (input.left) nx--;
      else if (input.right) nx++;
      else if (input.up) ny--;
      else if (input.down) ny++;

      if ((nx !== this.px || ny !== this.py) && this.maze[ny]?.[nx] === 0) {
        this.px = nx;
        this.py = ny;
        this.moveCd = 0.085;

        if (this.px === this.exitX && this.py === this.exitY) {
          this.score += 200 + Math.floor(this.timeLeft) * 15;
          if (this.score > this.highScore) this.highScore = this.score;
          this.level++;
          this.generateMaze();
          sound = 'levelclear';
        }
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'LOST IN MAZE!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `MAZE #${this.level} • TIME: ${Math.ceil(this.timeLeft)}s • REACH [E]`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Header */}
        <View style={styles.hudRow}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>MAZE #{this.level}</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>TIME: {Math.ceil(this.timeLeft)}s</Text>
        </View>

        {/* Maze Walls */}
        <View style={{ position: 'absolute', left: OX, top: OY, width: COLS * CELL, height: ROWS * CELL }}>
          {this.maze.map((row, r) =>
            row.map((val, c) =>
              val === 1 ? (
                <View
                  key={`mz-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    backgroundColor: pixelColor,
                  }}
                />
              ) : null
            )
          )}

          {/* Exit Gate */}
          <View
            style={{
              position: 'absolute',
              left: this.exitX * CELL + 1,
              top: this.exitY * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              borderWidth: 1.5,
              borderColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '900', color: pixelColor }}>E</Text>
          </View>

          {/* Player Dot */}
          <View
            style={{
              position: 'absolute',
              left: this.px * CELL + 2.5,
              top: this.py * CELL + 2.5,
              width: CELL - 5,
              height: CELL - 5,
              borderRadius: (CELL - 5) / 2,
              backgroundColor: pixelColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: bg }} />
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MAZE ESCAPE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>FIND EXIT [E] BEFORE TIME UP</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO ENTER</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudRow: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 9,
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
