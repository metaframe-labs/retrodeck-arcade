import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♣', '♦', '♥'];

export class HiLoCardsGame implements ArcadeGameInstance {
  private curVal = 7;
  private curSuit = '♠';
  private nextVal: number | null = null;
  private nextSuit = '♦';
  private revealTimer = 0;
  private banner = 'HIGHER [▲] OR LOWER [▼]?';

  private streak = 0;
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;

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
    this.curVal = 2 + Math.floor(Math.random() * 11);
    this.curSuit = SUITS[Math.floor(Math.random() * 4)];
    this.nextVal = null;
    this.revealTimer = 0;
    this.banner = 'HIGHER [▲/A] OR LOWER [▼/B]?';
    this.streak = 0;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
  }

  private guess(higher: boolean): ArcadeSound {
    const nv = 1 + Math.floor(Math.random() * 13);
    const ns = SUITS[Math.floor(Math.random() * 4)];
    this.nextVal = nv;
    this.nextSuit = ns;
    this.revealTimer = 0.85;

    if (nv === this.curVal) {
      this.banner = 'SAME CARD — SAFE!';
      return 'hit';
    }

    const correct = higher ? nv > this.curVal : nv < this.curVal;
    if (correct) {
      this.streak++;
      this.score += 50 + this.streak * 25;
      if (this.score > this.highScore) this.highScore = this.score;
      this.banner = `CORRECT! STREAK x${this.streak}`;
      return 'score';
    } else {
      this.streak = 0;
      this.lives--;
      this.banner = 'WRONG CALL!';
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      return 'die';
    }
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

    if (this.revealTimer > 0) {
      this.revealTimer -= dt;
      if (this.revealTimer <= 0 && this.nextVal !== null) {
        this.curVal = this.nextVal;
        this.curSuit = this.nextSuit;
        this.nextVal = null;
        this.banner = 'HIGHER [▲/A] OR LOWER [▼/B]?';
      }
      this.updateInput(input);
      return sound;
    }

    if ((input.up && !this.lastUp) || (input.a && !this.lastA)) {
      sound = this.guess(true);
    } else if ((input.down && !this.lastDown) || (input.b && !this.lastB)) {
      sound = this.guess(false);
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastA = input.a;
    this.lastB = input.b;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.streak + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF LIVES!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO PLAY AGAIN'
        : `STREAK x${this.streak} • [▲/A]: HIGHER • [▼/B]: LOWER`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>STREAK x{this.streak}</Text>

        {/* Two Cards Side-by-Side */}
        <View style={styles.cardsRow}>
          {/* Current Open Card */}
          <View style={[styles.card, { borderColor: pixelColor, backgroundColor: bg }]}>
            <Text style={[styles.cardRank, { color: pixelColor }]}>{LABELS[this.curVal]}</Text>
            <Text style={[styles.cardSuit, { color: pixelColor }]}>{this.curSuit}</Text>
          </View>

          <Text style={[styles.vsTxt, { color: pixelColor }]}>→</Text>

          {/* Next Card (Hidden or Revealed) */}
          <View
            style={[
              styles.card,
              {
                borderColor: pixelColor,
                backgroundColor: this.nextVal === null ? pixelColor : bg,
              },
            ]}
          >
            {this.nextVal === null ? (
              <Text style={{ fontSize: 28, fontWeight: '900', color: bg }}>?</Text>
            ) : (
              <>
                <Text style={[styles.cardRank, { color: pixelColor }]}>{LABELS[this.nextVal]}</Text>
                <Text style={[styles.cardSuit, { color: pixelColor }]}>{this.nextSuit}</Text>
              </>
            )}
          </View>
        </View>

        {/* Banner */}
        <View style={styles.bannerWrap}>
          <View style={[styles.bannerBox, { backgroundColor: pixelColor }]}>
            <Text style={[styles.bannerTxt, { color: bg }]}>{this.banner}</Text>
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>HI-LO CARDS DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>PREDICT HIGHER OR LOWER CARD</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DEAL</Text>
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cardsRow: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  card: {
    width: 72,
    height: 100,
    borderWidth: 3,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRank: {
    fontSize: 28,
    fontWeight: '900',
  },
  cardSuit: {
    fontSize: 22,
    marginTop: 2,
  },
  vsTxt: {
    fontSize: 22,
    fontWeight: '900',
  },
  bannerWrap: {
    position: 'absolute',
    bottom: 24,
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
    fontSize: 10,
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
