import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

export class MathBlitzGame implements ArcadeGameInstance {
  private question = '2 + 2 = ?';
  private options: number[] = [3, 4, 5];
  private correctIdx = 1;
  private selectedIdx = 1;

  private timeLeft = 10;
  private maxTime = 10;
  private streak = 0;
  private solved = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;

  private lastLeft = false;
  private lastRight = false;
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
    this.streak = 0;
    this.solved = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.nextQuestion();
  }

  private nextQuestion(): void {
    const level = Math.floor(this.solved / 5) + 1;
    const ops = level >= 2 ? ['+', '-', '×'] : ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];

    let a = 2 + Math.floor(Math.random() * (8 + level * 5));
    let b = 2 + Math.floor(Math.random() * (8 + level * 4));
    let ans = 0;

    if (op === '+') {
      ans = a + b;
    } else if (op === '-') {
      if (b > a) [a, b] = [b, a];
      ans = a - b;
    } else {
      a = 2 + Math.floor(Math.random() * (6 + level * 2));
      b = 2 + Math.floor(Math.random() * 8);
      ans = a * b;
    }

    this.question = `${a} ${op} ${b} = ?`;

    const wrongSet = new Set<number>([ans]);
    while (wrongSet.size < 3) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 5));
      const candidate = Math.max(0, ans + offset);
      if (candidate !== ans) wrongSet.add(candidate);
    }

    this.options = Array.from(wrongSet).sort(() => Math.random() - 0.5);
    this.correctIdx = this.options.indexOf(ans);
    this.selectedIdx = 1;
    this.maxTime = Math.max(4.0, 9.5 - level * 0.6);
    this.timeLeft = this.maxTime;
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
      this.streak = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        this.updateInput(input);
        return 'gameover';
      } else {
        this.nextQuestion();
        sound = 'die';
      }
    }

    if (input.left && !this.lastLeft) this.selectedIdx = (this.selectedIdx + 2) % 3;
    if (input.right && !this.lastRight) this.selectedIdx = (this.selectedIdx + 1) % 3;

    if (input.a && !this.lastA) {
      if (this.selectedIdx === this.correctIdx) {
        this.solved++;
        this.streak++;
        this.score += 50 + this.streak * 15 + Math.floor(this.timeLeft * 10);
        if (this.score > this.highScore) this.highScore = this.score;
        this.nextQuestion();
        sound = 'score';
      } else {
        this.streak = 0;
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          sound = 'gameover';
        } else {
          this.nextQuestion();
          sound = 'die';
        }
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: Math.floor(this.solved / 5) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BRAIN OVERLOAD!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RETRY'
        : `STREAK x${this.streak} • ◀/▶: PICK • [A]: SUBMIT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Time Bar */}
        <View style={[styles.timeTrack, { borderColor: pixelColor }]}>
          <View style={{ width: `${Math.max(0, (this.timeLeft / this.maxTime) * 100)}%`, height: '100%', backgroundColor: pixelColor }} />
        </View>

        <Text style={[styles.streakTxt, { color: pixelColor }]}>
          SOLVED: {this.solved}   •   STREAK x{this.streak}
        </Text>

        {/* Big Question Box */}
        <View style={[styles.questionBox, { borderColor: pixelColor }]}>
          <Text style={[styles.questionTxt, { color: pixelColor }]}>{this.question}</Text>
        </View>

        {/* 3 Choices */}
        <View style={styles.optionsRow}>
          {this.options.map((opt, idx) => {
            const sel = idx === this.selectedIdx;
            return (
              <View
                key={`opt-${idx}`}
                style={[
                  styles.optCard,
                  {
                    borderColor: pixelColor,
                    backgroundColor: sel ? pixelColor : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.optTxt, { color: sel ? bg : pixelColor }]}>{opt}</Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MATH BLITZ DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SPEED MENTAL ARITHMETIC</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
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
  streakTxt: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questionBox: {
    position: 'absolute',
    top: 58,
    left: 36,
    right: 36,
    height: 68,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionTxt: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  optionsRow: {
    position: 'absolute',
    top: 148,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  optCard: {
    flex: 1,
    height: 56,
    borderWidth: 2.5,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optTxt: {
    fontSize: 20,
    fontWeight: '900',
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
