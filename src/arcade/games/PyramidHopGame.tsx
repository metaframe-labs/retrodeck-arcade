import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const PYR_ROWS = 6; // 1 + 2 + 3 + 4 + 5 + 6 = 21 cubes

interface Orb {
  id: number;
  r: number;
  c: number;
}

export class PyramidHopGame implements ArcadeGameInstance {
  private lit: boolean[][] = [];
  private pr = 0;
  private pc = 0;
  private orbs: Orb[] = [];
  private orbTimer = 1.2;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;

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
    if (score > this.highScore) this.highScore = score;
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
    this.resetPyramid();
  }

  private resetPyramid(): void {
    this.lit = [];
    for (let r = 0; r < PYR_ROWS; r++) {
      this.lit.push(Array(r + 1).fill(false));
    }
    this.pr = 0;
    this.pc = 0;
    this.lit[0][0] = true;
    this.orbs = [];
    this.orbTimer = 1.1;
  }

  private allLit(): boolean {
    return this.lit.every((row) => row.every(Boolean));
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    // Pyramid hopping: Up = up-left, Right = up-right, Left = down-left, Down = down-right
    let nr = this.pr;
    let nc = this.pc;
    if (input.up && !this.lastUp) { nr = this.pr - 1; nc = this.pc - 1; }
    else if (input.right && !this.lastRight) { nr = this.pr - 1; nc = this.pc; }
    else if (input.left && !this.lastLeft) { nr = this.pr + 1; nc = this.pc; }
    else if (input.down && !this.lastDown) { nr = this.pr + 1; nc = this.pc + 1; }

    if (nr !== this.pr || nc !== this.pc) {
      if (nr < 0 || nr >= PYR_ROWS || nc < 0 || nc > nr) {
        // Jumped off the pyramid edge!
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
        this.pr = 0;
        this.pc = 0;
        sound = 'die';
      } else {
        this.pr = nr;
        this.pc = nc;
        if (!this.lit[this.pr][this.pc]) {
          this.lit[this.pr][this.pc] = true;
          this.score += 30;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
          if (this.allLit()) {
            this.level++;
            this.score += 400;
            if (this.score > this.highScore) this.highScore = this.score;
            this.resetPyramid();
            this.updateInput(input);
            return 'levelclear';
          }
        } else {
          sound = 'hit';
        }
      }
    }

    // Falling enemy orbs hopping down the pyramid
    this.orbTimer -= dt;
    if (this.orbTimer <= 0) {
      this.orbTimer = Math.max(0.55, 1.15 - this.level * 0.08);
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        o.r++;
        o.c += Math.random() > 0.5 ? 1 : 0;
        if (o.r >= PYR_ROWS) {
          this.orbs.splice(i, 1);
          continue;
        }
      }
      if (this.orbs.length < 3 && Math.random() < 0.65) {
        this.orbs.push({ id: this.nextId++, r: 0, c: 0 });
      }
    }

    // Orb collision with player
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (o.r === this.pr && o.c === this.pc) {
        this.orbs.splice(i, 1);
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
        this.pr = 0;
        this.pc = 0;
        sound = 'die';
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
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'FELL OFF PYRAMID!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '▲:UL ▶:UR ◀:DL ▼:DR • LIGHT ALL CUBES',
    };
  }

  private getCubePos(r: number, c: number): { x: number; y: number } {
    const rowWidth = (r + 1) * 34;
    const x = 160 - rowWidth / 2 + c * 34 + 17;
    const y = 36 + r * 30;
    return { x, y };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    const pPos = this.getCubePos(this.pr, this.pc);

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Pyramid Cubes */}
        {this.lit.map((row, r) =>
          row.map((isOn, c) => {
            const { x, y } = this.getCubePos(r, c);
            return (
              <View
                key={`cb-${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: x - 14,
                  top: y - 12,
                  width: 28,
                  height: 24,
                  borderWidth: 2,
                  borderColor: pixelColor,
                  borderRadius: 3,
                  backgroundColor: isOn ? pixelColor : 'transparent',
                }}
              />
            );
          })
        )}

        {/* Enemy Orbs */}
        {this.orbs.map((o) => {
          const { x, y } = this.getCubePos(o.r, o.c);
          return (
            <View
              key={o.id}
              style={{
                position: 'absolute',
                left: x - 6,
                top: y - 6,
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: pixelColor,
                backgroundColor: bg,
              }}
            />
          );
        })}

        {/* Hopper Character */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: pPos.x - 7,
              top: pPos.y - 8,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: this.lit[this.pr][this.pc] ? bg : pixelColor,
              borderWidth: 2,
              borderColor: pixelColor,
            }}
          />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PYRAMID HOP DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>LIGHT EVERY PYRAMID CUBE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO HOP</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
