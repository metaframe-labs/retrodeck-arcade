import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

// Authentic curated Sokoban puzzles
// '#' = Wall, '.' = Target, '$' = Box, '*' = Box on Target, '@' = Player, '+' = Player on Target, ' ' = Floor
const SOKOBAN_LEVELS: string[][] = [
  // Level 1: Classic Beginner
  [
    '  ##### ',
    '###   # ',
    '# $ # ##',
    '# #  . #',
    '#    . #',
    '## #   #',
    ' #@  ###',
    ' #####  ',
  ],
  // Level 2: Warehouse Double
  [
    '######  ',
    '# .. #  ',
    '# $$ ###',
    '# @    #',
    '#      #',
    '########',
  ],
  // Level 3: Cross Warehouse
  [
    '  ####  ',
    '###  ###',
    '#  $   #',
    '# $#$  #',
    '# .@.  #',
    '#  . ###',
    '######  ',
  ],
  // Level 4: The Quad Lock
  [
    '####### ',
    '#     # ',
    '# $.$ # ',
    '# .@. # ',
    '# $.$ # ',
    '#     # ',
    '####### ',
  ],
  // Level 5: Challenge Chamber
  [
    ' ###### ',
    ' #    # ',
    '##$$$ ##',
    '# ...  #',
    '#  @   #',
    '########',
  ],
];

interface Point {
  x: number;
  y: number;
}

export class SokobanGame implements ArcadeGameInstance {
  private levelIdx = 0;
  private grid: string[][] = [];
  private player: Point = { x: 0, y: 0 };
  private boxes: Point[] = [];
  private targets: Point[] = [];
  private walls: Point[] = [];

  private moves = 0;
  private pushes = 0;
  private score = 0;
  private highScore = 0;
  private levelClear = false;
  private gameOver = false;
  private isMenu = true;

  // Render metrics
  private tileSize = 20;
  private originX = 0;
  private originY = 0;

  // Input debouncing
  private lastLeft = false;
  private lastRight = false;
  private lastUp = false;
  private lastDown = false;
  private lastA = false;
  private lastB = false;

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
    this.levelIdx = 0;
    this.score = 0;
    this.moves = 0;
    this.pushes = 0;
    this.levelClear = false;
    this.gameOver = false;
    this.isMenu = true;
    this.loadLevel(this.levelIdx);
  }

  private loadLevel(idx: number): void {
    const raw = SOKOBAN_LEVELS[idx % SOKOBAN_LEVELS.length];
    const rows = raw.length;
    let maxCols = 0;
    raw.forEach((r) => {
      if (r.length > maxCols) maxCols = r.length;
    });

    this.walls = [];
    this.boxes = [];
    this.targets = [];

    // Scale tile size to center comfortably in 320x240
    this.tileSize = Math.min(24, Math.floor(Math.min(200 / rows, 200 / maxCols)));
    this.originX = Math.floor((ARENA_W - maxCols * this.tileSize) / 2);
    this.originY = Math.floor((ARENA_H - rows * this.tileSize) / 2) - 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < raw[r].length; c++) {
        const char = raw[r][c];
        if (char === '#') {
          this.walls.push({ x: c, y: r });
        } else if (char === '.') {
          this.targets.push({ x: c, y: r });
        } else if (char === '$') {
          this.boxes.push({ x: c, y: r });
        } else if (char === '*') {
          this.boxes.push({ x: c, y: r });
          this.targets.push({ x: c, y: r });
        } else if (char === '@') {
          this.player = { x: c, y: r };
        } else if (char === '+') {
          this.player = { x: c, y: r };
          this.targets.push({ x: c, y: r });
        }
      }
    }

    this.levelClear = false;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let soundToPlay: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        soundToPlay = 'powerup';
      }
      this.updateInputStates(input);
      return soundToPlay;
    }

    // Level Clear -> Next Level
    if (this.levelClear) {
      if (input.a && !this.lastA) {
        this.levelIdx++;
        this.score += 250;
        if (this.score > this.highScore) this.highScore = this.score;
        this.loadLevel(this.levelIdx);
        soundToPlay = 'powerup';
      }
      this.updateInputStates(input);
      return soundToPlay;
    }

    // Reset level with B button
    if (input.b && !this.lastB) {
      this.loadLevel(this.levelIdx);
      this.updateInputStates(input);
      return 'die';
    }

    // Discrete D-Pad movement
    let dx = 0;
    let dy = 0;
    if (input.left && !this.lastLeft) dx = -1;
    else if (input.right && !this.lastRight) dx = 1;
    else if (input.up && !this.lastUp) dy = -1;
    else if (input.down && !this.lastDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      const targetX = this.player.x + dx;
      const targetY = this.player.y + dy;

      // Check wall
      if (this.isWall(targetX, targetY)) {
        this.updateInputStates(input);
        return soundToPlay;
      }

      // Check box
      const boxIdx = this.boxes.findIndex((b) => b.x === targetX && b.y === targetY);
      if (boxIdx !== -1) {
        const boxTargetX = targetX + dx;
        const boxTargetY = targetY + dy;

        // Can push box if empty
        if (!this.isWall(boxTargetX, boxTargetY) && !this.isBox(boxTargetX, boxTargetY)) {
          this.boxes[boxIdx] = { x: boxTargetX, y: boxTargetY };
          this.player = { x: targetX, y: targetY };
          this.moves++;
          this.pushes++;
          soundToPlay = 'hit';

          // Check level complete
          if (this.checkWin()) {
            this.levelClear = true;
            soundToPlay = 'levelclear';
          }
        }
      } else {
        // Simple move
        this.player = { x: targetX, y: targetY };
        this.moves++;
        soundToPlay = 'hit';
      }
    }

    this.updateInputStates(input);
    return soundToPlay;
  }

  private isWall(x: number, y: number): boolean {
    return this.walls.some((w) => w.x === x && w.y === y);
  }

  private isBox(x: number, y: number): boolean {
    return this.boxes.some((b) => b.x === x && b.y === y);
  }

  private isTarget(x: number, y: number): boolean {
    return this.targets.some((t) => t.x === x && t.y === y);
  }

  private checkWin(): boolean {
    return this.targets.every((t) => this.boxes.some((b) => b.x === t.x && b.y === t.y));
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
    const solvedTargets = this.targets.filter((t) =>
      this.boxes.some((b) => b.x === t.x && b.y === t.y)
    ).length;

    return {
      score: this.score + solvedTargets * 25,
      highScore: this.highScore,
      lives: 1,
      level: this.levelIdx + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.levelClear ? 'ROOM CLEAR!' : undefined,
      subMessage: this.levelClear
        ? 'PRESS [A] FOR NEXT ROOM'
        : 'D-PAD: PUSH BOXES • [B]: RESTART ROOM',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Sokoban Board */}
        <View
          style={[
            styles.boardArea,
            {
              left: this.originX,
              top: this.originY,
            },
          ]}
        >
          {/* Walls */}
          {this.walls.map((w, idx) => (
            <View
              key={`w-${idx}`}
              style={[
                styles.wallTile,
                {
                  left: w.x * this.tileSize,
                  top: w.y * this.tileSize,
                  width: this.tileSize,
                  height: this.tileSize,
                  backgroundColor: pixelColor,
                  borderColor: isLight ? palette.screenBg : '#000',
                },
              ]}
            >
              <View
                style={[
                  styles.wallBrickPattern,
                  { borderColor: isLight ? palette.screenBg : '#000' },
                ]}
              />
            </View>
          ))}

          {/* Targets */}
          {this.targets.map((t, idx) => (
            <View
              key={`t-${idx}`}
              style={[
                styles.targetTile,
                {
                  left: t.x * this.tileSize + this.tileSize / 2 - 3,
                  top: t.y * this.tileSize + this.tileSize / 2 - 3,
                  backgroundColor: pixelColor,
                },
              ]}
            />
          ))}

          {/* Boxes */}
          {this.boxes.map((b, idx) => {
            const onTarget = this.isTarget(b.x, b.y);
            return (
              <View
                key={`b-${idx}`}
                style={[
                  styles.boxTile,
                  {
                    left: b.x * this.tileSize + 1,
                    top: b.y * this.tileSize + 1,
                    width: this.tileSize - 2,
                    height: this.tileSize - 2,
                    borderColor: pixelColor,
                    backgroundColor: onTarget
                      ? pixelColor
                      : isLight
                      ? 'rgba(23, 38, 22, 0.12)'
                      : 'rgba(255, 255, 255, 0.15)',
                  },
                ]}
              >
                {/* Classic Crate X cross pattern */}
                <Text
                  style={[
                    styles.crateCross,
                    { color: onTarget ? (isLight ? palette.screenBg : '#000') : pixelColor },
                  ]}
                >
                  ✕
                </Text>
              </View>
            );
          })}

          {/* Player Worker */}
          <View
            style={[
              styles.playerWorker,
              {
                left: this.player.x * this.tileSize + 2,
                top: this.player.y * this.tileSize + 2,
                width: this.tileSize - 4,
                height: this.tileSize - 4,
              },
            ]}
          >
            {/* Worker Cap */}
            <View style={[styles.workerCap, { backgroundColor: pixelColor }]} />
            {/* Worker Head */}
            <View
              style={[
                styles.workerHead,
                {
                  borderColor: pixelColor,
                  backgroundColor: isLight ? palette.screenBg : '#FFF',
                },
              ]}
            />
            {/* Worker Body */}
            <View style={[styles.workerBody, { backgroundColor: pixelColor }]} />
          </View>
        </View>

        {/* Moves / Pushes HUD */}
        <View style={styles.hudOverlay}>
          <Text style={[styles.hudInfoText, { color: pixelColor }]}>
            MOVES: {this.moves}  •  PUSHES: {this.pushes}
          </Text>
        </View>

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
              <Text style={[styles.menuTitle, { color: pixelColor }]}>SOKOBAN DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>NOKIA WAREHOUSE PUZZLER</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO WORK</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  boardArea: {
    position: 'absolute',
  },
  wallTile: {
    position: 'absolute',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wallBrickPattern: {
    width: '75%',
    height: '75%',
    borderWidth: 1,
  },
  targetTile: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boxTile: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crateCross: {
    fontSize: 10,
    fontWeight: '900',
  },
  playerWorker: {
    position: 'absolute',
    alignItems: 'center',
  },
  workerCap: {
    width: 8,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  workerHead: {
    width: 6,
    height: 5,
    borderWidth: 1,
    borderRadius: 3,
  },
  workerBody: {
    width: 10,
    height: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginTop: 0.5,
  },
  hudOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hudInfoText: {
    fontSize: 9,
    fontWeight: '800',
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
