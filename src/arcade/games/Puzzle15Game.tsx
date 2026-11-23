import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const SIZE = 4;
const CELL = 46;
const GAP = 4;
const BOARD_SIZE = SIZE * CELL + (SIZE + 1) * GAP; // 204
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = Math.floor((ARENA_H - BOARD_SIZE) / 2) + 4;

export class Puzzle15Game implements ArcadeGameInstance {
  private tiles: number[] = []; // 1..15, 0 = empty
  private emptyIdx = 15;
  private moves = 0;
  private solvedCount = 0;

  private score = 0;
  private highScore = 0;
  private gameWon = false;
  private isMenu = true;

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
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.score = 0;
    this.solvedCount = 0;
    this.isMenu = true;
    this.shuffleBoard();
  }

  private shuffleBoard(): void {
    // Start solved, then perform 80 valid random moves so it is 100% mathematically solvable!
    this.tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    this.emptyIdx = 15;
    this.moves = 0;
    this.gameWon = false;

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    let lastEmpty = -1;
    const steps = 40 + this.solvedCount * 15;

    for (let i = 0; i < steps; i++) {
      const er = Math.floor(this.emptyIdx / SIZE);
      const ec = this.emptyIdx % SIZE;
      const neighbors: number[] = [];

      for (const [dr, dc] of dirs) {
        const nr = er + dr;
        const nc = ec + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          const nIdx = nr * SIZE + nc;
          if (nIdx !== lastEmpty) neighbors.push(nIdx);
        }
      }

      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      lastEmpty = this.emptyIdx;
      this.tiles[this.emptyIdx] = this.tiles[pick];
      this.tiles[pick] = 0;
      this.emptyIdx = pick;
    }
  }

  private checkSolved(): boolean {
    for (let i = 0; i < 15; i++) {
      if (this.tiles[i] !== i + 1) return false;
    }
    return this.tiles[15] === 0;
  }

  public update(input: ArcadeInput, _dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.gameWon) {
      if (input.a && !this.lastA) {
        this.shuffleBoard();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (input.b && !this.lastB) {
      this.shuffleBoard();
      this.updateInput(input);
      return 'die';
    }

    // D-pad slides the adjacent tile INTO the empty space in the pressed direction
    const er = Math.floor(this.emptyIdx / SIZE);
    const ec = this.emptyIdx % SIZE;
    let srcR = er;
    let srcC = ec;

    if (input.up && !this.lastUp) srcR = er + 1;
    else if (input.down && !this.lastDown) srcR = er - 1;
    else if (input.left && !this.lastLeft) srcC = ec + 1;
    else if (input.right && !this.lastRight) srcC = ec - 1;

    if ((srcR !== er || srcC !== ec) && srcR >= 0 && srcR < SIZE && srcC >= 0 && srcC < SIZE) {
      const srcIdx = srcR * SIZE + srcC;
      this.tiles[this.emptyIdx] = this.tiles[srcIdx];
      this.tiles[srcIdx] = 0;
      this.emptyIdx = srcIdx;
      this.moves++;
      sound = 'hit';

      if (this.checkSolved()) {
        this.gameWon = true;
        this.solvedCount++;
        const bonus = Math.max(100, 1000 - this.moves * 5);
        this.score += bonus;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'levelclear';
      }
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
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.solvedCount + 1,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.gameWon ? 'PUZZLE SOLVED!' : undefined,
      subMessage: this.gameWon
        ? 'PRESS [A] FOR NEXT SHUFFLE'
        : `MOVES: ${this.moves} • D-PAD: SLIDE • [B]: RESHUFFLE`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.movesTxt, { color: pixelColor }]}>MOVES: {this.moves}</Text>

        <View
          style={{
            position: 'absolute',
            left: BX,
            top: BY,
            width: BOARD_SIZE,
            height: BOARD_SIZE,
            borderWidth: 2,
            borderColor: pixelColor,
            borderRadius: 4,
          }}
        >
          {this.tiles.map((val, idx) => {
            if (val === 0) return null;
            const r = Math.floor(idx / SIZE);
            const c = idx % SIZE;
            const correct = val === idx + 1;

            return (
              <View
                key={`t-${val}`}
                style={{
                  position: 'absolute',
                  left: GAP + c * (CELL + GAP),
                  top: GAP + r * (CELL + GAP),
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: pixelColor,
                  backgroundColor: correct ? pixelColor : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '900',
                    color: correct ? bg : pixelColor,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {val}
                </Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>15-PUZZLE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>ORDER TILES 1 TO 15</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SOLVE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  movesTxt: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
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
