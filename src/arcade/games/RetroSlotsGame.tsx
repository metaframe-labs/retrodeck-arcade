import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const SYMBOLS = ['7', '★', '♦', '♣', '♠', '●'];

export class RetroSlotsGame implements ArcadeGameInstance {
  private reels: number[] = [0, 0, 0];
  private spinTimers: number[] = [0, 0, 0];
  private tickAccum = 0;
  private spinning = false;

  private credits = 200;
  private bet = 10;
  private highScore = 200;
  private spins = 0;
  private banner = 'PULL [A] TO SPIN!';

  private gameOver = false;
  private isMenu = true;
  private lastA = false;
  private lastB = false;

  constructor(initialHighScore = 200) {
    this.highScore = Math.max(200, initialHighScore);
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.reels = [0, 0, 0];
    this.spinTimers = [0, 0, 0];
    this.spinning = false;
    this.credits = 200;
    this.bet = 10;
    this.spins = 0;
    this.banner = 'PRESS [A] TO SPIN!';
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

    // Change Bet with [B] when idle
    if (!this.spinning && input.b && !this.lastB) {
      this.bet = this.bet === 10 ? 25 : this.bet === 25 ? 50 : 10;
      sound = 'hit';
    }

    // Start Spin with [A]
    if (!this.spinning && input.a && !this.lastA) {
      if (this.credits < this.bet) {
        if (this.credits < 10) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        this.bet = 10;
      }
      this.credits -= this.bet;
      this.spins++;
      this.spinning = true;
      this.spinTimers = [0.55, 0.95, 1.35];
      this.banner = 'SPINNING...';
      sound = 'hit';
    }

    // Animate spinning reels
    if (this.spinning) {
      this.tickAccum += dt;
      const shouldStep = this.tickAccum >= 0.06;
      if (shouldStep) this.tickAccum = 0;

      let stillSpinning = false;
      for (let i = 0; i < 3; i++) {
        if (this.spinTimers[i] > 0) {
          this.spinTimers[i] -= dt;
          stillSpinning = true;
          if (shouldStep) {
            this.reels[i] = (this.reels[i] + 1 + Math.floor(Math.random() * 2)) % SYMBOLS.length;
          }
          if (this.spinTimers[i] <= 0) {
            this.reels[i] = Math.floor(Math.random() * SYMBOLS.length);
            sound = 'hit';
          }
        }
      }

      if (!stillSpinning) {
        this.spinning = false;
        const [a, b, c] = this.reels;
        if (a === b && b === c) {
          const mult = a === 0 ? 20 : a === 1 ? 10 : 6; // 7-7-7 = 20x!
          const win = this.bet * mult;
          this.credits += win;
          if (this.credits > this.highScore) this.highScore = this.credits;
          this.banner = a === 0 ? `JACKPOT 777! +${win}` : `TRIPLE MATCH! +${win}`;
          sound = 'levelclear';
        } else if (a === b || b === c || a === c) {
          const win = this.bet * 2;
          this.credits += win;
          if (this.credits > this.highScore) this.highScore = this.credits;
          this.banner = `PAIR WIN! +${win}`;
          sound = 'score';
        } else {
          this.banner = 'NO MATCH';
          if (this.credits < 10) {
            this.gameOver = true;
            sound = 'gameover';
          }
        }
      }
    }

    this.lastA = input.a;
    this.lastB = input.b;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.credits,
      highScore: this.highScore,
      lives: Math.max(0, Math.floor(this.credits / 10)),
      level: this.spins,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF CREDITS!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO RELOAD $200'
        : `BET: $${this.bet} • [A]: SPIN • [B]: CHANGE BET`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#0A0F14';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top Machine Header */}
        <View style={[styles.headerBox, { borderColor: pixelColor }]}>
          <Text style={[styles.headerTxt, { color: pixelColor }]}>
            ★ LUCKY 777 SLOTS ★
          </Text>
        </View>

        {/* 3 Reel Windows */}
        <View style={styles.reelsRow}>
          {this.reels.map((symIdx, i) => (
            <View
              key={`reel-${i}`}
              style={[
                styles.reelWindow,
                {
                  borderColor: pixelColor,
                  backgroundColor: bg,
                },
              ]}
            >
              <Text style={[styles.reelSymbol, { color: pixelColor }]}>
                {SYMBOLS[symIdx]}
              </Text>
            </View>
          ))}
        </View>

        {/* Result Banner */}
        <View style={styles.bannerWrap}>
          <View style={[styles.bannerBox, { backgroundColor: pixelColor }]}>
            <Text style={[styles.bannerTxt, { color: bg }]}>{this.banner}</Text>
          </View>
        </View>

        {/* Credits & Bet Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerTxt, { color: pixelColor }]}>CREDITS: ${this.credits}</Text>
          <Text style={[styles.footerTxt, { color: pixelColor }]}>BET: ${this.bet}</Text>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RETRO SLOTS 777</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MATCH 7-7-7 FOR 20X JACKPOT</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  headerBox: {
    position: 'absolute',
    top: 14,
    left: 44,
    right: 44,
    borderWidth: 2,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 3,
  },
  headerTxt: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  reelsRow: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  reelWindow: {
    width: 66,
    height: 78,
    borderWidth: 3,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelSymbol: {
    fontSize: 38,
    fontWeight: '900',
  },
  bannerWrap: {
    position: 'absolute',
    top: 152,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerBox: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 3,
  },
  bannerTxt: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerRow: {
    position: 'absolute',
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerTxt: {
    fontSize: 10,
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
