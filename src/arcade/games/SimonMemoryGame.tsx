import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

type Pad = 0 | 1 | 2 | 3; // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT

export class SimonMemoryGame implements ArcadeGameInstance {
  private sequence: Pad[] = [];
  private phase: 'watch' | 'input' | 'pause' = 'watch';
  private playIdx = 0;
  private inputIdx = 0;
  private phaseTimer = 0;
  private activePad: Pad | null = null;

  private score = 0;
  private highScore = 0;
  private round = 1;
  private gameOver = false;
  private isMenu = true;

  private lastUp = false;
  private lastRight = false;
  private lastDown = false;
  private lastLeft = false;
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
    this.sequence = [Math.floor(Math.random() * 4) as Pad];
    this.phase = 'watch';
    this.playIdx = 0;
    this.inputIdx = 0;
    this.phaseTimer = 0.7;
    this.activePad = null;
    this.score = 0;
    this.round = 1;
    this.gameOver = false;
    this.isMenu = true;
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

    if (this.phase === 'watch') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.activePad !== null) {
          this.activePad = null;
          this.playIdx++;
          if (this.playIdx >= this.sequence.length) {
            this.phase = 'input';
            this.inputIdx = 0;
          } else {
            this.phaseTimer = 0.22;
          }
        } else {
          this.activePad = this.sequence[this.playIdx];
          this.phaseTimer = Math.max(0.28, 0.52 - this.round * 0.02);
          sound = 'hit';
        }
      }
    } else if (this.phase === 'pause') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.activePad = null;
        this.sequence.push(Math.floor(Math.random() * 4) as Pad);
        this.round = this.sequence.length;
        this.phase = 'watch';
        this.playIdx = 0;
        this.phaseTimer = 0.45;
      }
    } else if (this.phase === 'input') {
      if (this.activePad !== null) {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.activePad = null;
      }

      let pressed: Pad | null = null;
      if (input.up && !this.lastUp) pressed = 0;
      else if (input.right && !this.lastRight) pressed = 1;
      else if (input.down && !this.lastDown) pressed = 2;
      else if (input.left && !this.lastLeft) pressed = 3;

      if (pressed !== null) {
        this.activePad = pressed;
        this.phaseTimer = 0.18;

        if (pressed === this.sequence[this.inputIdx]) {
          this.inputIdx++;
          this.score += 25;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';

          if (this.inputIdx >= this.sequence.length) {
            this.score += this.round * 50;
            if (this.score > this.highScore) this.highScore = this.score;
            this.phase = 'pause';
            this.phaseTimer = 0.65;
            sound = 'score';
          }
        } else {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastUp = input.up;
    this.lastRight = input.right;
    this.lastDown = input.down;
    this.lastLeft = input.left;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.round,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'WRONG PATTERN!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : this.phase === 'watch'
        ? 'WATCH THE SEQUENCE...'
        : 'YOUR TURN! REPEAT WITH D-PAD',
    };
  }

  private renderPad(pad: Pad, label: string, left: number, top: number, color: string, bg: string) {
    const lit = this.activePad === pad;
    return (
      <View
        key={`pad-${pad}`}
        style={[
          styles.padBox,
          {
            left,
            top,
            borderColor: color,
            backgroundColor: lit ? color : 'transparent',
          },
        ]}
      >
        <Text style={[styles.padLabel, { color: lit ? bg : color }]}>{label}</Text>
      </View>
    );
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Status Banner */}
        <Text style={[styles.statusText, { color: pixelColor }]}>
          {this.phase === 'watch' ? '● WATCH ●' : this.phase === 'input' ? '▶ REPEAT ◀' : '★ GOOD! ★'}
        </Text>

        {/* Cross D-Pad Memory Buttons */}
        {this.renderPad(0, '▲', 132, 42, pixelColor, bg)}
        {this.renderPad(3, '◀', 72, 98, pixelColor, bg)}
        {this.renderPad(1, '▶', 192, 98, pixelColor, bg)}
        {this.renderPad(2, '▼', 132, 154, pixelColor, bg)}

        {/* Center Round Indicator */}
        <View style={[styles.centerBadge, { borderColor: pixelColor }]}>
          <Text style={[styles.centerText, { color: pixelColor }]}>{this.round}</Text>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>SIMON MEMORY</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>REPEAT THE D-PAD SEQUENCE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  statusText: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  padBox: {
    position: 'absolute',
    width: 56,
    height: 48,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padLabel: {
    fontSize: 20,
    fontWeight: '900',
  },
  centerBadge: {
    position: 'absolute',
    left: 140,
    top: 102,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    fontSize: 15,
    fontWeight: '900',
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
