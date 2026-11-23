import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const WHEEL_NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
const BET_OPTIONS = [
  { id: 'even', label: 'EVEN (2X)' },
  { id: 'odd', label: 'ODD (2X)' },
  { id: 'zero', label: 'ZERO 0 (10X)' },
];

export class RouletteGame implements ArcadeGameInstance {
  private wheelIdx = 0;
  private spinning = false;
  private spinTimer = 0;
  private stepAccum = 0;

  private betIdx = 0;
  private credits = 300;
  private wager = 50;
  private highScore = 300;
  private banner = 'PICK BET & SPIN [A]';

  private gameOver = false;
  private isMenu = true;
  private lastLeft = false;
  private lastRight = false;
  private lastA = false;

  constructor(initialHighScore = 300) {
    this.highScore = Math.max(300, initialHighScore);
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.wheelIdx = 0;
    this.spinning = false;
    this.betIdx = 0;
    this.credits = 300;
    this.banner = 'CHOOSE BET (◀/▶) • [A] SPIN';
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

    if (!this.spinning) {
      if (input.left && !this.lastLeft) {
        this.betIdx = (this.betIdx + 2) % 3;
        sound = 'hit';
      }
      if (input.right && !this.lastRight) {
        this.betIdx = (this.betIdx + 1) % 3;
        sound = 'hit';
      }
      if (input.a && !this.lastA) {
        if (this.credits < this.wager) {
          this.gameOver = true;
          this.updateInput(input);
          return 'gameover';
        }
        this.credits -= this.wager;
        this.spinning = true;
        this.spinTimer = 1.4 + Math.random() * 0.8;
        this.stepAccum = 0;
        this.banner = 'WHEEL SPINNING...';
        sound = 'hit';
      }
    } else {
      this.spinTimer -= dt;
      this.stepAccum += dt;
      const stepRate = this.spinTimer < 0.4 ? 0.14 : 0.05;
      if (this.stepAccum >= stepRate) {
        this.stepAccum = 0;
        this.wheelIdx = (this.wheelIdx + 1) % WHEEL_NUMS.length;
        sound = 'hit';
      }

      if (this.spinTimer <= 0) {
        this.spinning = false;
        const landed = WHEEL_NUMS[this.wheelIdx];
        const betType = BET_OPTIONS[this.betIdx].id;

        if (betType === 'zero' && landed === 0) {
          const win = this.wager * 10;
          this.credits += win;
          this.banner = `ZERO HIT! +$${win}`;
          sound = 'levelclear';
        } else if (betType === 'even' && landed > 0 && landed % 2 === 0) {
          const win = this.wager * 2;
          this.credits += win;
          this.banner = `LANDED ${landed} (EVEN) +$${win}`;
          sound = 'score';
        } else if (betType === 'odd' && landed % 2 === 1) {
          const win = this.wager * 2;
          this.credits += win;
          this.banner = `LANDED ${landed} (ODD) +$${win}`;
          sound = 'score';
        } else {
          this.banner = `LANDED ${landed} — HOUSE WINS`;
          sound = 'die';
          if (this.credits < this.wager) {
            this.gameOver = true;
            sound = 'gameover';
          }
        }
        if (this.credits > this.highScore) this.highScore = this.credits;
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
      score: this.credits,
      highScore: this.highScore,
      lives: Math.floor(this.credits / this.wager),
      level: 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BANKRUPT!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO REBUY $300' : `CREDITS: $${this.credits} • ◀/▶: BET • [A]: SPIN`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';
    const landed = WHEEL_NUMS[this.wheelIdx];

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>CREDITS: ${this.credits}   •   BET: ${this.wager}</Text>

        {/* Wheel Display */}
        <View style={styles.wheelWrap}>
          <View style={[styles.wheelCircle, { borderColor: pixelColor }]}>
            <Text style={[styles.wheelNum, { color: pixelColor }]}>{landed}</Text>
            <Text style={[styles.wheelType, { color: pixelColor }]}>
              {landed === 0 ? 'ZERO' : landed % 2 === 0 ? 'EVEN' : 'ODD'}
            </Text>
          </View>
        </View>

        {/* Result Banner */}
        <Text style={[styles.bannerTxt, { color: pixelColor }]}>{this.banner}</Text>

        {/* Bet Selector */}
        <View style={styles.betsRow}>
          {BET_OPTIONS.map((b, i) => {
            const sel = i === this.betIdx;
            return (
              <View
                key={b.id}
                style={[
                  styles.betBtn,
                  {
                    borderColor: pixelColor,
                    backgroundColor: sel ? pixelColor : 'transparent',
                  },
                ]}
              >
                <Text style={{ fontSize: 8, fontWeight: '900', color: sel ? bg : pixelColor }}>{b.label}</Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ROULETTE DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SPIN THE RETRO WHEEL</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
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
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wheelWrap: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wheelCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelNum: {
    fontSize: 32,
    fontWeight: '900',
  },
  wheelType: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerTxt: {
    position: 'absolute',
    top: 142,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  betsRow: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  betBtn: {
    flex: 1,
    height: 40,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
