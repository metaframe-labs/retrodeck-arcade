import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 11; // 10 * 11 = 110px width, 20 * 11 = 220px height inside 320x240 arena
const BOARD_LEFT = 42;
const BOARD_TOP = 10;

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const TETROMINOES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]],
  ],
  O: [
    [[1,1], [1,1]],
    [[1,1], [1,1]],
    [[1,1], [1,1]],
    [[1,1], [1,1]],
  ],
  T: [
    [[0,1,0], [1,1,1], [0,0,0]],
    [[0,1,0], [0,1,1], [0,1,0]],
    [[0,0,0], [1,1,1], [0,1,0]],
    [[0,1,0], [1,1,0], [0,1,0]],
  ],
  S: [
    [[0,1,1], [1,1,0], [0,0,0]],
    [[0,1,0], [0,1,1], [0,0,1]],
    [[0,0,0], [0,1,1], [1,1,0]],
    [[1,0,0], [1,1,0], [0,1,0]],
  ],
  Z: [
    [[1,1,0], [0,1,1], [0,0,0]],
    [[0,0,1], [0,1,1], [0,1,0]],
    [[0,0,0], [1,1,0], [0,1,1]],
    [[0,1,0], [1,1,0], [1,0,0]],
  ],
  J: [
    [[1,0,0], [1,1,1], [0,0,0]],
    [[0,1,1], [0,1,0], [0,1,0]],
    [[0,0,0], [1,1,1], [0,0,1]],
    [[0,1,0], [0,1,0], [1,1,0]],
  ],
  L: [
    [[0,0,1], [1,1,1], [0,0,0]],
    [[0,1,0], [0,1,0], [0,1,1]],
    [[0,0,0], [1,1,1], [1,0,0]],
    [[1,0,0], [0,1,0], [0,1,0]],
  ],
};

const TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export class TetrisGame implements ArcadeGameInstance {
  private board: number[][] = [];
  private currentType: TetrominoType = 'T';
  private currentRot = 0;
  private currentX = 3;
  private currentY = 0;

  private nextType: TetrominoType = 'I';

  private score = 0;
  private linesCleared = 0;
  private level = 1;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;

  private dropTimer = 0;
  private dropInterval = 0.6; // Changes with level

  // Key repeat / auto-repeat timers for smooth d-pad response
  private lastLeft = false;
  private lastRight = false;
  private lastDown = false;
  private lastUp = false;
  private lastA = false;
  private lastB = false;

  private dasTimer = 0;
  private dasDir = 0; // -1 for left, 1 for right

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
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.dropInterval = 0.6;
    this.dropTimer = 0;
    this.gameOver = false;
    this.isMenu = true;

    this.nextType = this.randomType();
    this.spawnPiece();
  }

  private randomType(): TetrominoType {
    const idx = Math.floor(Math.random() * TYPES.length);
    return TYPES[idx];
  }

  private spawnPiece(): void {
    this.currentType = this.nextType;
    this.nextType = this.randomType();
    this.currentRot = 0;
    const shape = TETROMINOES[this.currentType][0];
    this.currentX = Math.floor((COLS - shape[0].length) / 2);
    this.currentY = 0;

    if (this.checkCollision(this.currentX, this.currentY, this.currentRot)) {
      this.gameOver = true;
    }
  }

  private checkCollision(bx: number, by: number, rot: number): boolean {
    const shape = TETROMINOES[this.currentType][rot];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gx = bx + c;
          const gy = by + r;
          if (gx < 0 || gx >= COLS || gy >= ROWS) {
            return true;
          }
          if (gy >= 0 && this.board[gy][gx] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private lockPiece(): ArcadeSound | null {
    let triggeredSound: ArcadeSound = 'hit';
    const shape = TETROMINOES[this.currentType][this.currentRot];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gx = this.currentX + c;
          const gy = this.currentY + r;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            this.board[gy][gx] = 1;
          }
        }
      }
    }

    // Check line clears
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // Recheck same row index since upper rows moved down
      }
    }

    if (cleared > 0) {
      this.linesCleared += cleared;
      const linePoints = [0, 40, 100, 300, 1200];
      const pts = (linePoints[cleared] || 1200) * this.level;
      this.score += pts;
      if (this.score > this.highScore) {
        this.highScore = this.score;
      }
      triggeredSound = 'score';

      const newLevel = Math.floor(this.linesCleared / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(0.08, 0.6 - (this.level - 1) * 0.05);
        triggeredSound = 'powerup';
      }
    }

    this.spawnPiece();
    return triggeredSound;
  }

  private hardDrop(): ArcadeSound | null {
    let dropped = 0;
    while (!this.checkCollision(this.currentX, this.currentY + 1, this.currentRot)) {
      this.currentY++;
      dropped++;
    }
    this.score += dropped * 2;
    return this.lockPiece();
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let soundToPlay: ArcadeSound | null = null;

    // Menu state
    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        soundToPlay = 'powerup';
      }
      this.updateInputStates(input);
      return soundToPlay;
    }

    // Game over state
    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        soundToPlay = 'powerup';
      }
      this.updateInputStates(input);
      return soundToPlay;
    }

    // Rotation (Up or A button)
    const triggerRotate = (input.up && !this.lastUp) || (input.a && !this.lastA);
    if (triggerRotate) {
      const nextRot = (this.currentRot + 1) % TETROMINOES[this.currentType].length;
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (!this.checkCollision(this.currentX + k, this.currentY, nextRot)) {
          this.currentX += k;
          this.currentRot = nextRot;
          soundToPlay = 'hit';
          break;
        }
      }
    }

    // Hard drop with B button
    if (input.b && !this.lastB) {
      const dropSound = this.hardDrop();
      this.updateInputStates(input);
      return dropSound || soundToPlay;
    }

    // Horizontal movement with DAS (Delayed Auto Shift)
    const leftHeld = input.left;
    const rightHeld = input.right;

    if (input.left && !this.lastLeft) {
      if (!this.checkCollision(this.currentX - 1, this.currentY, this.currentRot)) {
        this.currentX--;
        soundToPlay = 'hit';
      }
      this.dasTimer = 0.22;
      this.dasDir = -1;
    } else if (input.right && !this.lastRight) {
      if (!this.checkCollision(this.currentX + 1, this.currentY, this.currentRot)) {
        this.currentX++;
        soundToPlay = 'hit';
      }
      this.dasTimer = 0.22;
      this.dasDir = 1;
    } else if (leftHeld || rightHeld) {
      this.dasTimer -= dt;
      if (this.dasTimer <= 0) {
        const dir = leftHeld ? -1 : 1;
        if (!this.checkCollision(this.currentX + dir, this.currentY, this.currentRot)) {
          this.currentX += dir;
          soundToPlay = 'hit';
        }
        this.dasTimer = 0.06;
      }
    }

    // Soft drop with Down
    const currentInterval = input.down ? Math.min(0.04, this.dropInterval / 5) : this.dropInterval;
    this.dropTimer += dt;

    if (this.dropTimer >= currentInterval) {
      this.dropTimer = 0;
      if (!this.checkCollision(this.currentX, this.currentY + 1, this.currentRot)) {
        this.currentY++;
        if (input.down) {
          this.score += 1;
        }
      } else {
        const lockSound = this.lockPiece();
        if (lockSound) {
          soundToPlay = lockSound;
        }
      }
    }

    this.updateInputStates(input);
    return soundToPlay;
  }

  private updateInputStates(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
    this.lastB = input.b;
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
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '▲/A: ROTATE • B: DROP',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const ghostColor = isLight ? 'rgba(23, 38, 22, 0.22)' : 'rgba(255, 255, 255, 0.15)';

    // Compute Ghost piece position (where it lands)
    let ghostY = this.currentY;
    if (!this.isMenu && !this.gameOver) {
      while (!this.checkCollision(this.currentX, ghostY + 1, this.currentRot)) {
        ghostY++;
      }
    }

    const currentShape = TETROMINOES[this.currentType][this.currentRot];
    const nextShape = TETROMINOES[this.nextType][0];

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Game Board Container */}
        <View
          style={[
            styles.boardContainer,
            {
              left: BOARD_LEFT,
              top: BOARD_TOP,
              width: COLS * BLOCK_SIZE + 4,
              height: ROWS * BLOCK_SIZE + 4,
              borderColor: pixelColor,
              backgroundColor: isLight ? 'rgba(23, 38, 22, 0.05)' : 'rgba(0, 0, 0, 0.4)',
            },
          ]}
        >
          {/* Locked cells */}
          {this.board.map((row, r) =>
            row.map((cell, c) => {
              if (cell === 0) return null;
              return (
                <View
                  key={`cell-${r}-${c}`}
                  style={[
                    styles.block,
                    {
                      left: c * BLOCK_SIZE + 1,
                      top: r * BLOCK_SIZE + 1,
                      width: BLOCK_SIZE - 1,
                      height: BLOCK_SIZE - 1,
                      backgroundColor: pixelColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.innerBrick,
                      {
                        borderColor: isLight ? palette.screenBg : '#000',
                      },
                    ]}
                  />
                </View>
              );
            })
          )}

          {/* Ghost piece */}
          {!this.isMenu &&
            !this.gameOver &&
            ghostY > this.currentY &&
            currentShape.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 0) return null;
                const gy = ghostY + r;
                const gx = this.currentX + c;
                if (gy < 0 || gy >= ROWS || gx < 0 || gx >= COLS) return null;
                return (
                  <View
                    key={`ghost-${r}-${c}`}
                    style={[
                      styles.ghostBlock,
                      {
                        left: gx * BLOCK_SIZE + 1,
                        top: gy * BLOCK_SIZE + 1,
                        width: BLOCK_SIZE - 1,
                        height: BLOCK_SIZE - 1,
                        borderColor: ghostColor,
                      },
                    ]}
                  />
                );
              })
            )}

          {/* Active falling piece */}
          {!this.isMenu &&
            !this.gameOver &&
            currentShape.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 0) return null;
                const gy = this.currentY + r;
                const gx = this.currentX + c;
                if (gy < 0 || gy >= ROWS || gx < 0 || gx >= COLS) return null;
                return (
                  <View
                    key={`active-${r}-${c}`}
                    style={[
                      styles.block,
                      {
                        left: gx * BLOCK_SIZE + 1,
                        top: gy * BLOCK_SIZE + 1,
                        width: BLOCK_SIZE - 1,
                        height: BLOCK_SIZE - 1,
                        backgroundColor: pixelColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.innerBrick,
                        {
                          borderColor: isLight ? palette.screenBg : '#000',
                        },
                      ]}
                    />
                  </View>
                );
              })
            )}
        </View>

        {/* Side HUD Panel */}
        <View style={[styles.sidePanel, { left: BOARD_LEFT + COLS * BLOCK_SIZE + 16 }]}>
          {/* NEXT Piece Box */}
          <View
            style={[
              styles.nextBox,
              {
                borderColor: pixelColor,
                backgroundColor: isLight ? 'rgba(23, 38, 22, 0.05)' : 'rgba(0,0,0,0.3)',
              },
            ]}
          >
            <Text style={[styles.hudLabel, { color: pixelColor }]}>NEXT</Text>
            <View style={styles.nextPreviewArea}>
              {nextShape.map((row, r) =>
                row.map((cell, c) => {
                  if (cell === 0) return null;
                  return (
                    <View
                      key={`next-${r}-${c}`}
                      style={[
                        styles.block,
                        {
                          left: c * 9 + 4,
                          top: r * 9 + 4,
                          width: 8,
                          height: 8,
                          backgroundColor: pixelColor,
                        },
                      ]}
                    />
                  );
                })
              )}
            </View>
          </View>

          {/* Stats Box */}
          <View style={styles.statsColumn}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: pixelColor }]}>LINES</Text>
              <Text style={[styles.statValue, { color: pixelColor }]}>{this.linesCleared}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: pixelColor }]}>LEVEL</Text>
              <Text style={[styles.statValue, { color: pixelColor }]}>{this.level}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: pixelColor }]}>SCORE</Text>
              <Text style={[styles.statValue, { color: pixelColor }]}>{this.score}</Text>
            </View>
          </View>
        </View>

        {/* Start / Menu Overlay */}
        {this.isMenu && (
          <View style={[styles.menuOverlay, { left: BOARD_LEFT, width: COLS * BLOCK_SIZE + 4 }]}>
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: isLight ? palette.screenBg : '#111',
                  borderColor: pixelColor,
                },
              ]}
            >
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BRICK DX</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A]</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  boardContainer: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  block: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 1,
  },
  innerBrick: {
    width: '60%',
    height: '60%',
    borderWidth: 1,
  },
  ghostBlock: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  sidePanel: {
    position: 'absolute',
    top: BOARD_TOP,
    width: 120,
    height: ROWS * BLOCK_SIZE + 4,
    justifyContent: 'space-between',
  },
  nextBox: {
    width: 80,
    height: 60,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 4,
    alignItems: 'center',
  },
  nextPreviewArea: {
    width: 44,
    height: 36,
    position: 'relative',
    marginTop: 2,
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  statsColumn: {
    width: 80,
    gap: 8,
  },
  statItem: {
    borderBottomWidth: 1,
    borderColor: 'rgba(23, 38, 22, 0.25)',
    paddingBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  menuOverlay: {
    position: 'absolute',
    top: BOARD_TOP,
    height: ROWS * BLOCK_SIZE + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  menuPrompt: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
});
