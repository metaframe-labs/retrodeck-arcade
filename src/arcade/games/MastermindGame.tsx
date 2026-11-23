import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface GuessRow {
  digits: number[];
  exact: number; // ● right digit & position
  misplaced: number; // ○ right digit, wrong position
}

export class MastermindGame implements ArcadeGameInstance {
  private secret: number[] = [1, 2, 3, 4];
  private current: number[] = [1, 1, 1, 1];
  private cursorCol = 0;
  private history: GuessRow[] = [];
  private readonly maxAttempts = 8;

  private score = 0;
  private highScore = 0;
  private codesBroken = 0;
  private state: 'playing' | 'won' | 'lost' = 'playing';
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
    this.codesBroken = 0;
    this.isMenu = true;
    this.newCode();
  }

  private newCode(): void {
    this.secret = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
    this.current = [1, 1, 1, 1];
    this.cursorCol = 0;
    this.history = [];
    this.state = 'playing';
  }

  private evaluate(guess: number[]): { exact: number; misplaced: number } {
    let exact = 0;
    const sCounts = Array(7).fill(0);
    const gCounts = Array(7).fill(0);

    for (let i = 0; i < 4; i++) {
      if (guess[i] === this.secret[i]) {
        exact++;
      } else {
        sCounts[this.secret[i]]++;
        gCounts[guess[i]]++;
      }
    }

    let misplaced = 0;
    for (let d = 1; d <= 6; d++) {
      misplaced += Math.min(sCounts[d], gCounts[d]);
    }
    return { exact, misplaced };
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

    if (this.state !== 'playing') {
      if (input.a && !this.lastA) {
        if (this.state === 'lost') {
          this.score = 0;
          this.codesBroken = 0;
        }
        this.newCode();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (input.left && !this.lastLeft) this.cursorCol = (this.cursorCol + 3) % 4;
    if (input.right && !this.lastRight) this.cursorCol = (this.cursorCol + 1) % 4;
    if (input.up && !this.lastUp) {
      this.current[this.cursorCol] = (this.current[this.cursorCol] % 6) + 1;
      sound = 'hit';
    }
    if (input.down && !this.lastDown) {
      this.current[this.cursorCol] = ((this.current[this.cursorCol] + 4) % 6) + 1;
      sound = 'hit';
    }

    // Submit guess with [A]
    if (input.a && !this.lastA) {
      const { exact, misplaced } = this.evaluate(this.current);
      this.history.push({ digits: [...this.current], exact, misplaced });

      if (exact === 4) {
        this.state = 'won';
        this.codesBroken++;
        const bonus = (this.maxAttempts - this.history.length + 1) * 100;
        this.score += bonus;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = 'levelclear';
      } else if (this.history.length >= this.maxAttempts) {
        this.state = 'lost';
        sound = 'gameover';
      } else {
        sound = 'score';
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
      lives: Math.max(0, this.maxAttempts - this.history.length),
      level: this.codesBroken + 1,
      gameOver: this.state === 'lost',
      isMenu: this.isMenu,
      message:
        this.state === 'won'
          ? `CRACKED: ${this.secret.join('')}`
          : this.state === 'lost'
          ? `CODE WAS: ${this.secret.join('')}`
          : undefined,
      subMessage:
        this.state !== 'playing'
          ? 'PRESS [A] FOR NEW CODE'
          : '◀/▶: SLOT • ▲/▼: 1-6 • [A]: CHECK (●=EXACT ○=MOVE)',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Left: History Log (up to 8 attempts) */}
        <View style={[styles.historyBox, { borderColor: pixelColor }]}>
          <Text style={[styles.panelTitle, { color: pixelColor }]}>LOG (●EXACT ○POS)</Text>
          {this.history.map((h, i) => (
            <View key={`h-${i}`} style={styles.histRow}>
              <Text style={[styles.histDigits, { color: pixelColor }]}>
                {i + 1}. {h.digits.join(' ')}
              </Text>
              <Text style={[styles.histClues, { color: pixelColor }]}>
                {'●'.repeat(h.exact)}{'○'.repeat(h.misplaced)}
              </Text>
            </View>
          ))}
        </View>

        {/* Right: Active Code Entry Dial */}
        <View style={styles.entryBox}>
          <Text style={[styles.panelTitle, { color: pixelColor }]}>
            TRY {this.history.length + 1}/{this.maxAttempts}
          </Text>
          <View style={styles.dialRow}>
            {this.current.map((d, idx) => {
              const sel = idx === this.cursorCol && this.state === 'playing';
              return (
                <View
                  key={`d-${idx}`}
                  style={[
                    styles.dialCell,
                    {
                      borderColor: pixelColor,
                      backgroundColor: sel ? pixelColor : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: sel ? bg : pixelColor }}>{d}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.helpTxt, { color: pixelColor }]}>▲/▼ CHANGE (1-6)</Text>
          <Text style={[styles.helpTxt, { color: pixelColor }]}>[A] SUBMIT CODE</Text>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MASTERMIND DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CRACK THE 4-DIGIT CODE (1-6)</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DECODE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  historyBox: {
    position: 'absolute',
    left: 12,
    top: 12,
    bottom: 12,
    width: 150,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 6,
  },
  panelTitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
    textAlign: 'center',
  },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  histDigits: {
    fontSize: 10,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  histClues: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  entryBox: {
    position: 'absolute',
    right: 12,
    top: 34,
    width: 138,
    alignItems: 'center',
  },
  dialRow: {
    flexDirection: 'row',
    gap: 5,
    marginVertical: 10,
  },
  dialCell: {
    width: 28,
    height: 38,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpTxt: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    opacity: 0.85,
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
