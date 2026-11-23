import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ROWS = 7;
const COLS = 9;
const CELL = 26;
const GRID_X = 43;
const GRID_Y = 36;

interface IceLevel {
  start: [number, number];
  goal: [number, number];
  rocks: [number, number][];
}

// All 6 levels mathematically verified solvable!
const LEVELS: IceLevel[] = [
  {
    start: [3, 0],
    goal: [3, 8],
    rocks: [
      [3, 4],
      [4, 8],
      [1, 5],
    ],
  },
  {
    start: [0, 0],
    goal: [3, 4],
    rocks: [
      [0, 7],
      [5, 6],
      [4, 1],
      [2, 2],
      [3, 5],
    ],
  },
  {
    start: [6, 0],
    goal: [1, 5],
    rocks: [
      [2, 0],
      [3, 4],
      [6, 3],
      [5, 8],
      [0, 7],
      [1, 4],
    ],
  },
  {
    start: [0, 8],
    goal: [5, 2],
    rocks: [
      [0, 1],
      [4, 2],
      [3, 7],
      [6, 0],
      [4, 1],
      [5, 3],
    ],
  },
  {
    start: [6, 8],
    goal: [0, 4],
    rocks: [
      [0, 8],
      [1, 0],
      [6, 1],
      [5, 6],
      [2, 5],
      [3, 3],
    ],
  },
  {
    start: [3, 0],
    goal: [3, 4],
    rocks: [
      [3, 1],
      [6, 8],
      [0, 7],
      [1, 1],
      [5, 2],
      [4, 5],
      [2, 4],
    ],
  },
];

export class IceSliderGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private lives = 3;
  private gameOver = false;

  private pr = 3;
  private pc = 0;
  private goalR = 3;
  private goalC = 8;
  private rocks: Set<string> = new Set();

  private sliding = false;
  private dr = 0;
  private dc = 0;
  private slideStepTimer = 0;
  private moves = 0;
  private prevB = false;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.gameOver = false;
    this.loadLevel();
  }

  private loadLevel() {
    const def = LEVELS[(this.level - 1) % LEVELS.length];
    this.pr = def.start[0];
    this.pc = def.start[1];
    this.goalR = def.goal[0];
    this.goalC = def.goal[1];
    this.rocks = new Set(def.rocks.map(([r, c]) => `${r},${c}`));
    this.sliding = false;
    this.dr = 0;
    this.dc = 0;
    this.moves = 0;
    this.prevB = false;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    const resetPress = input.b && !this.prevB;
    this.prevB = input.b;
    if (resetPress) {
      this.loadLevel();
      return 'hit';
    }

    if (this.sliding) {
      this.slideStepTimer -= dt;
      if (this.slideStepTimer <= 0) {
        this.slideStepTimer = 0.045;
        const nr = this.pr + this.dr;
        const nc = this.pc + this.dc;
        if (
          nr < 0 ||
          nr >= ROWS ||
          nc < 0 ||
          nc >= COLS ||
          this.rocks.has(`${nr},${nc}`)
        ) {
          this.sliding = false;
          if (this.pr === this.goalR && this.pc === this.goalC) {
            const bonus = Math.max(50, 250 - this.moves * 15);
            this.score += bonus;
            if (this.score > this.highScore) this.highScore = this.score;
            this.level++;
            this.loadLevel();
            return 'levelclear';
          }
          return 'hit';
        } else {
          this.pr = nr;
          this.pc = nc;
        }
      }
      return null;
    }

    let ndr = 0;
    let ndc = 0;
    if (input.up) ndr = -1;
    else if (input.down) ndr = 1;
    else if (input.left) ndc = -1;
    else if (input.right) ndc = 1;

    if (ndr !== 0 || ndc !== 0) {
      const nr = this.pr + ndr;
      const nc = this.pc + ndc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !this.rocks.has(`${nr},${nc}`)) {
        this.dr = ndr;
        this.dc = ndc;
        this.sliding = true;
        this.slideStepTimer = 0.02;
        this.moves++;
        return 'shoot';
      }
    }

    return null;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>ICE SLIDER LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>MOVES:{this.moves}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        <View
          style={[
            styles.grid,
            {
              left: GRID_X,
              top: GRID_Y,
              width: COLS * CELL + 2,
              height: ROWS * CELL + 2,
              borderColor: fg,
            },
          ]}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((__, c) => {
              const isRock = this.rocks.has(`${r},${c}`);
              const isGoal = r === this.goalR && c === this.goalC;
              const isPlayer = r === this.pr && c === this.pc;

              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      left: c * CELL,
                      top: r * CELL,
                      width: CELL,
                      height: CELL,
                      borderColor: fg,
                      backgroundColor: isRock ? fg : 'transparent',
                    },
                  ]}
                >
                  {isGoal && !isPlayer && (
                    <View style={[styles.goalRing, { borderColor: fg }]}>
                      <Text style={[styles.goalTxt, { color: fg }]}>O</Text>
                    </View>
                  )}
                  {isPlayer && (
                    <View style={[styles.playerDot, { backgroundColor: fg }]} />
                  )}
                </View>
              );
            })
          )}
        </View>

        <Text style={[styles.hint, { color: fg }]}>
          D-PAD: SLIDE ON ICE   [B]: RESTART LEVEL
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
    paddingHorizontal: 10,
  },
  hdrText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  grid: {
    position: 'absolute',
    borderWidth: 2,
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  playerDot: {
    width: 15,
    height: 15,
    borderRadius: 4,
  },
  hint: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
