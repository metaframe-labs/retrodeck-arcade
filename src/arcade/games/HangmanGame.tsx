import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const WORDS = [
  'NOKIA', 'ARCADE', 'PIXEL', 'SNAKE', 'RETRO', 'TETRIS', 'GALAXY', 'LASER',
  'CYBER', 'ROBOT', 'ROCKET', 'MATRIX', 'PLANET', 'TURBO', 'VECTOR', 'SIGNAL',
  'PUZZLE', 'KNIGHT', 'DRAGON', 'COMET', 'ORBIT', 'MEMORY', 'SCREEN', 'BUTTON',
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const KB_COLS = 9;

export class HangmanGame implements ArcadeGameInstance {
  private word = 'NOKIA';
  private guessed = new Set<string>();
  private wrongCount = 0;
  private readonly maxWrong = 6;

  private cursorIdx = 0; // 0..25
  private score = 0;
  private highScore = 0;
  private wordsSolved = 0;
  private roundState: 'playing' | 'won' | 'lost' = 'playing';
  private isMenu = true;

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
    this.wordsSolved = 0;
    this.isMenu = true;
    this.nextWord();
  }

  private nextWord(): void {
    this.word = WORDS[Math.floor(Math.random() * WORDS.length)];
    this.guessed.clear();
    this.wrongCount = 0;
    this.cursorIdx = 0;
    this.roundState = 'playing';
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

    if (this.roundState !== 'playing') {
      if (input.a && !this.lastA) {
        if (this.roundState === 'lost') {
          this.score = 0;
          this.wordsSolved = 0;
        }
        this.nextWord();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    // Navigate alphabet grid
    if (input.left && !this.lastLeft) this.cursorIdx = (this.cursorIdx + 25) % 26;
    if (input.right && !this.lastRight) this.cursorIdx = (this.cursorIdx + 1) % 26;
    if (input.up && !this.lastUp) this.cursorIdx = (this.cursorIdx - KB_COLS + 26) % 26;
    if (input.down && !this.lastDown) this.cursorIdx = (this.cursorIdx + KB_COLS) % 26;

    // Pick Letter with [A]
    if (input.a && !this.lastA) {
      const letter = ALPHABET[this.cursorIdx];
      if (!this.guessed.has(letter)) {
        this.guessed.add(letter);
        if (this.word.includes(letter)) {
          this.score += 30;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';

          const allFound = this.word.split('').every((ch) => this.guessed.has(ch));
          if (allFound) {
            this.roundState = 'won';
            this.wordsSolved++;
            this.score += 200 + (this.maxWrong - this.wrongCount) * 40;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'levelclear';
          }
        } else {
          this.wrongCount++;
          if (this.wrongCount >= this.maxWrong) {
            this.roundState = 'lost';
            sound = 'gameover';
          } else {
            sound = 'die';
          }
        }
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
      lives: Math.max(0, this.maxWrong - this.wrongCount),
      level: this.wordsSolved + 1,
      gameOver: this.roundState === 'lost',
      isMenu: this.isMenu,
      message:
        this.roundState === 'won'
          ? `SOLVED: ${this.word}`
          : this.roundState === 'lost'
          ? `WORD WAS: ${this.word}`
          : undefined,
      subMessage:
        this.roundState !== 'playing'
          ? 'PRESS [A] FOR NEXT WORD'
          : 'D-PAD: PICK LETTER • [A]: GUESS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top Left: Gallows + Stickman */}
        <View style={styles.gallowsWrap}>
          {/* Base, Pole, Top Bar, Rope */}
          <View style={{ position: 'absolute', left: 6, bottom: 0, width: 42, height: 3, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', left: 16, top: 4, width: 3, height: 76, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', left: 16, top: 4, width: 36, height: 3, backgroundColor: pixelColor }} />
          <View style={{ position: 'absolute', left: 50, top: 4, width: 2, height: 12, backgroundColor: pixelColor }} />

          {/* 1: Head */}
          {this.wrongCount >= 1 && (
            <View style={{ position: 'absolute', left: 44, top: 16, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: pixelColor }} />
          )}
          {/* 2: Torso */}
          {this.wrongCount >= 2 && (
            <View style={{ position: 'absolute', left: 50, top: 30, width: 2, height: 22, backgroundColor: pixelColor }} />
          )}
          {/* 3: Left Arm */}
          {this.wrongCount >= 3 && (
            <View style={{ position: 'absolute', left: 40, top: 34, width: 11, height: 2, backgroundColor: pixelColor, transform: [{ rotate: '-30deg' }] }} />
          )}
          {/* 4: Right Arm */}
          {this.wrongCount >= 4 && (
            <View style={{ position: 'absolute', left: 51, top: 34, width: 11, height: 2, backgroundColor: pixelColor, transform: [{ rotate: '30deg' }] }} />
          )}
          {/* 5: Left Leg */}
          {this.wrongCount >= 5 && (
            <View style={{ position: 'absolute', left: 41, top: 55, width: 12, height: 2, backgroundColor: pixelColor, transform: [{ rotate: '-45deg' }] }} />
          )}
          {/* 6: Right Leg */}
          {this.wrongCount >= 6 && (
            <View style={{ position: 'absolute', left: 49, top: 55, width: 12, height: 2, backgroundColor: pixelColor, transform: [{ rotate: '45deg' }] }} />
          )}
        </View>

        {/* Top Right: Secret Word Blanks */}
        <View style={styles.wordZone}>
          <Text style={[styles.hintLabel, { color: pixelColor }]}>
            TRIES LEFT: {this.maxWrong - this.wrongCount}
          </Text>
          <View style={styles.blanksRow}>
            {this.word.split('').map((ch, i) => {
              const show = this.guessed.has(ch) || this.roundState === 'lost';
              return (
                <View key={`ch-${i}`} style={[styles.blankBox, { borderBottomColor: pixelColor }]}>
                  <Text style={[styles.blankChar, { color: pixelColor }]}>{show ? ch : ''}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bottom: On-Screen Retro Alphabet Keyboard */}
        <View style={styles.kbWrap}>
          {ALPHABET.map((letter, idx) => {
            const c = idx % KB_COLS;
            const r = Math.floor(idx / KB_COLS);
            const selected = idx === this.cursorIdx && this.roundState === 'playing';
            const used = this.guessed.has(letter);
            return (
              <View
                key={letter}
                style={{
                  position: 'absolute',
                  left: c * 31,
                  top: r * 30,
                  width: 27,
                  height: 26,
                  borderRadius: 3,
                  borderWidth: selected ? 2.5 : 1,
                  borderColor: pixelColor,
                  backgroundColor: selected ? pixelColor : 'transparent',
                  opacity: used ? 0.25 : 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: selected ? bg : pixelColor }}>
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>HANGMAN DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>GUESS THE RETRO WORD</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  gallowsWrap: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 74,
    height: 82,
  },
  wordZone: {
    position: 'absolute',
    left: 100,
    right: 14,
    top: 24,
    alignItems: 'center',
  },
  hintLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 14,
  },
  blanksRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  blankBox: {
    width: 22,
    height: 26,
    borderBottomWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blankChar: {
    fontSize: 17,
    fontWeight: '900',
  },
  kbWrap: {
    position: 'absolute',
    left: 22,
    top: 122,
    width: 280,
    height: 92,
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
