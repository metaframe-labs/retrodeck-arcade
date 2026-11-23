import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const SIZE = 5;
const CELL = 36;
const GAP = 4;
const BOARD_SIZE = SIZE * CELL + (SIZE + 1) * GAP; // 204
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = Math.floor((ARENA_H - BOARD_SIZE) / 2) + 4;

export class LightsOutGame implements ArcadeGameInstance {
  private lights: boolean[][] = [];
  private cursorX = 2;
  private cursorY = 2;
  private moves = 0;
  private level = 1;

  private score = 0;
  private highScore = 0;
  private levelClear = false;
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
    this.level = 1;
    this.isMenu = true;
    this.generatePuzzle();
  }

  private toggleAt(c: number, r: number): void {
    const pts = [
      [c, r],
      [c - 1, r],
      [c + 1, r],
      [c, r - 1],
      [c, r + 1],
    ];
    for (const [x, y] of pts) {
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        this.lights[y][x] = !this.lights[y][x];
      }
    }
  }

  private generatePuzzle(): void {
    // Start all OFF, apply random toggles so every puzzle is 100% mathematically solvable!
    this.lights = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const pressCount = Math.min(12, 3 + this.level * 2);
    for (let i = 0; i < pressCount; i++) {
      const rx = Math.floor(Math.random() * SIZE);
      const ry = Math.floor(Math.random() * SIZE);
      this.toggleAt(rx, ry);
    }
    // Guarantee at least one light is on
    if (this.allOff()) {
      this.toggleAt(2, 2);
    }
    this.cursorX = 2;
    this.cursorY = 2;
    this.moves = 0;
    this.levelClear = false;
  }

  private allOff(): boolean {
    return this.lights.every((row) => row.every((v) => !v));
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

    if (this.levelClear) {
      if (input.a && !this.lastA) {
        this.level++;
        this.generatePuzzle();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (input.b && !this.lastB) {
      this.generatePuzzle();
      this.updateInput(input);
      return 'die';
    }

    if (input.left && !this.lastLeft) this.cursorX = (this.cursorX + SIZE - 1) % SIZE;
    if (input.right && !this.lastRight) this.cursorX = (this.cursorX + 1) % SIZE;
    if (input.up && !this.lastUp) this.cursorY = (this.cursorY + SIZE - 1) % SIZE;
    if (input.down && !this.lastDown) this.cursorY = (this.cursorY + 1) % SIZE;

    if (input.a && !this.lastA) {
      this.toggleAt(this.cursorX, this.cursorY);
      this.moves++;
      sound = 'hit';

      if (this.allOff()) {
        this.levelClear = true;
        this.score += Math.max(100, 500 - this.moves * 15) + this.level * 100;
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
    const litCount = this.lights.flat().filter(Boolean).length;
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.level,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.levelClear ? 'LIGHTS OUT!' : undefined,
      subMessage: this.levelClear
        ? 'PRESS [A] FOR NEXT STAGE'
        : `LIT: ${litCount} • [A]: TOGGLE CROSS • [B]: NEW`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          STAGE {this.level}   •   MOVES: {this.moves}
        </Text>

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
          {this.lights.map((row, r) =>
            row.map((on, c) => {
              const selected = c === this.cursorX && r === this.cursorY;
              return (
                <View
                  key={`lo-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: GAP + c * (CELL + GAP),
                    top: GAP + r * (CELL + GAP),
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    borderWidth: selected ? 3 : 1.5,
                    borderColor: pixelColor,
                    backgroundColor: on ? pixelColor : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bg }} />}
                </View>
              );
            })
          )}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>LIGHTS OUT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TURN ALL 25 LIGHTS OFF</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SOLVE</Text>
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
