import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const MORSE_TABLE: { char: string; code: string }[] = [
  { char: 'A', code: '.-' }, { char: 'B', code: '-...' }, { char: 'C', code: '-.-.' },
  { char: 'D', code: '-..' }, { char: 'E', code: '.' }, { char: 'F', code: '..-.' },
  { char: 'G', code: '--.' }, { char: 'H', code: '....' }, { char: 'I', code: '..' },
  { char: 'K', code: '-.-' }, { char: 'M', code: '--' }, { char: 'N', code: '-.' },
  { char: 'O', code: '---' }, { char: 'R', code: '.-.' }, { char: 'S', code: '...' },
  { char: 'T', code: '-' }, { char: 'U', code: '..-' }, { char: 'W', code: '.--' },
];

export class MorseCodeGame implements ArcadeGameInstance {
  private target = MORSE_TABLE[0];
  private entered = '';
  private timeLeft = 10;
  private maxTime = 10;
  private streak = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;

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
    this.lives = 3;
    this.streak = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.nextLetter();
  }

  private nextLetter(): void {
    this.target = MORSE_TABLE[Math.floor(Math.random() * MORSE_TABLE.length)];
    this.entered = '';
    this.maxTime = Math.max(4.5, 10 - this.streak * 0.3);
    this.timeLeft = this.maxTime;
  }

  private pushSymbol(sym: '.' | '-'): ArcadeSound {
    this.entered += sym;
    if (!this.target.code.startsWith(this.entered)) {
      this.streak = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      this.entered = '';
      return 'die';
    }

    if (this.entered === this.target.code) {
      this.streak++;
      this.score += 60 + this.streak * 20;
      if (this.score > this.highScore) this.highScore = this.score;
      this.nextLetter();
      return 'score';
    }
    return 'hit';
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastB = input.b;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastB = input.b;
      return sound;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.streak = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.lastA = input.a;
        this.lastB = input.b;
        return 'gameover';
      }
      this.nextLetter();
      sound = 'die';
    }

    if (input.a && !this.lastA) sound = this.pushSymbol('.');
    else if (input.b && !this.lastB) sound = this.pushSymbol('-');

    this.lastA = input.a;
    this.lastB = input.b;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.streak + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'SIGNAL LOST!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '[A]: DOT (•) • [B]: DASH (—)',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const fmt = (s: string) => s.replace(/\./g, '● ').replace(/-/g, '▬ ');

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Time Bar */}
        <View style={[styles.timeTrack, { borderColor: pixelColor }]}>
          <View style={{ width: `${Math.max(0, (this.timeLeft / this.maxTime) * 100)}%`, height: '100%', backgroundColor: pixelColor }} />
        </View>

        {/* Big Target Letter & Code Reference */}
        <View style={[styles.letterBox, { borderColor: pixelColor }]}>
          <Text style={[styles.bigChar, { color: pixelColor }]}>{this.target.char}</Text>
          <Text style={[styles.codeHint, { color: pixelColor }]}>{fmt(this.target.code)}</Text>
        </View>

        {/* Player Transmitted Input */}
        <Text style={[styles.txLbl, { color: pixelColor }]}>TRANSMITTED:</Text>
        <Text style={[styles.txVal, { color: pixelColor }]}>
          {this.entered ? fmt(this.entered) : '_ _ _'}
        </Text>

        {/* Legend */}
        <Text style={[styles.footerTxt, { color: pixelColor }]}>
          [A] = ● DOT     •     [B] = ▬ DASH
        </Text>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MORSE CODE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TELEGRAPH SIGNAL CHALLENGE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO TRANSMIT</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  timeTrack: {
    position: 'absolute',
    top: 14,
    left: 28,
    right: 28,
    height: 8,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 1,
  },
  letterBox: {
    position: 'absolute',
    top: 38,
    left: 64,
    right: 64,
    height: 92,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigChar: {
    fontSize: 40,
    fontWeight: '900',
  },
  codeHint: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 2,
  },
  txLbl: {
    position: 'absolute',
    top: 146,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.75,
  },
  txVal: {
    position: 'absolute',
    top: 162,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  footerTxt: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
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
