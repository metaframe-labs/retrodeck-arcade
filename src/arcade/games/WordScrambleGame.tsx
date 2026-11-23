import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const WORD_LIST = [
  'NOKIA', 'RETRO', 'PIXEL', 'SNAKE', 'LASER', 'ROBOT', 'CYBER', 'SPACE',
  'TURBO', 'ORBIT', 'COMET', 'FLASH', 'QUEST', 'SWORD', 'MAGIC', 'LEVEL',
  'SCORE', 'BOARD', 'CLOCK', 'TRAIN', 'MUSIC', 'BRAIN', 'LOGIC', 'STORM',
];

export class WordScrambleGame implements ArcadeGameInstance {
  private targetWord = 'NOKIA';
  private pool: { ch: string; used: boolean }[] = [];
  private built: { ch: string; poolIdx: number }[] = [];
  private cursorIdx = 0;

  private timeLeft = 25;
  private solved = 0;
  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;

  private lastLeft = false;
  private lastRight = false;
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
    this.solved = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.nextWord();
  }

  private nextWord(): void {
    this.targetWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    let chars = this.targetWord.split('');
    // Ensure scrambled differs from target
    for (let tries = 0; tries < 8; tries++) {
      chars = [...chars].sort(() => Math.random() - 0.5);
      if (chars.join('') !== this.targetWord) break;
    }
    this.pool = chars.map((ch) => ({ ch, used: false }));
    this.built = [];
    this.cursorIdx = 0;
    this.timeLeft = Math.max(12, 26 - Math.floor(this.solved / 3) * 2);
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

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.updateInput(input);
      return 'gameover';
    }

    const len = this.pool.length;
    if (input.left && !this.lastLeft) this.cursorIdx = (this.cursorIdx + len - 1) % len;
    if (input.right && !this.lastRight) this.cursorIdx = (this.cursorIdx + 1) % len;

    // Pick letter with [A]
    if (input.a && !this.lastA) {
      const slot = this.pool[this.cursorIdx];
      if (!slot.used) {
        slot.used = true;
        this.built.push({ ch: slot.ch, poolIdx: this.cursorIdx });
        sound = 'hit';

        if (this.built.length === len) {
          const guess = this.built.map((b) => b.ch).join('');
          if (guess === this.targetWord) {
            this.solved++;
            this.score += 150 + Math.floor(this.timeLeft * 10);
            if (this.score > this.highScore) this.highScore = this.score;
            this.nextWord();
            sound = 'levelclear';
          } else {
            // Reset wrong word attempt
            this.pool.forEach((p) => (p.used = false));
            this.built = [];
            sound = 'die';
          }
        }
      }
    }

    // Undo last letter with [B]
    if (input.b && !this.lastB && this.built.length > 0) {
      const last = this.built.pop()!;
      this.pool[last.poolIdx].used = false;
      sound = 'hit';
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastA = input.a;
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: this.solved + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? `WORD WAS: ${this.targetWord}` : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO PLAY AGAIN'
        : `TIME: ${Math.ceil(this.timeLeft)}s • [A]: PICK • [B]: UNDO`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          SOLVED: {this.solved}   •   TIME: {Math.ceil(this.timeLeft)}s
        </Text>

        {/* Answer Slots */}
        <Text style={[styles.lblTxt, { top: 42, color: pixelColor }]}>UNSCRAMBLE THE WORD:</Text>
        <View style={[styles.tilesRow, { top: 64 }]}>
          {Array.from({ length: this.pool.length }).map((_, i) => (
            <View key={`ans-${i}`} style={[styles.ansSlot, { borderColor: pixelColor }]}>
              <Text style={[styles.tileChar, { color: pixelColor }]}>{this.built[i]?.ch || ''}</Text>
            </View>
          ))}
        </View>

        {/* Scrambled Pool */}
        <Text style={[styles.lblTxt, { top: 130, color: pixelColor }]}>PICK LETTERS (◀ / ▶ + [A]):</Text>
        <View style={[styles.tilesRow, { top: 152 }]}>
          {this.pool.map((slot, i) => {
            const sel = i === this.cursorIdx;
            return (
              <View
                key={`pl-${i}`}
                style={[
                  styles.poolTile,
                  {
                    borderColor: pixelColor,
                    backgroundColor: sel ? pixelColor : 'transparent',
                    opacity: slot.used ? 0.25 : 1,
                  },
                ]}
              >
                <Text style={[styles.tileChar, { color: sel ? bg : pixelColor }]}>{slot.ch}</Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>WORD SCRAMBLE</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>UNSCRAMBLE RETRO WORDS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
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
    top: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  lblTxt: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.75,
  },
  tilesRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ansSlot: {
    width: 40,
    height: 44,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poolTile: {
    width: 42,
    height: 46,
    borderWidth: 2,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileChar: {
    fontSize: 20,
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
