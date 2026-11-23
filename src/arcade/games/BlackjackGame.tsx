import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

const RANKS = [
  { r: 'A', v: 11 }, { r: '2', v: 2 }, { r: '3', v: 3 }, { r: '4', v: 4 },
  { r: '5', v: 5 }, { r: '6', v: 6 }, { r: '7', v: 7 }, { r: '8', v: 8 },
  { r: '9', v: 9 }, { r: '10', v: 10 }, { r: 'J', v: 10 }, { r: 'Q', v: 10 }, { r: 'K', v: 10 },
];
const SUITS = ['♠', '♣', '♦', '♥'];

export class BlackjackGame implements ArcadeGameInstance {
  private deck: Card[] = [];
  private playerHand: Card[] = [];
  private dealerHand: Card[] = [];

  private phase: 'playing' | 'result' = 'playing';
  private banner = '';
  private chips = 500;
  private bet = 50;
  private highScore = 500;
  private handsPlayed = 0;

  private gameOver = false;
  private isMenu = true;
  private lastA = false;
  private lastB = false;

  constructor(initialHighScore = 500) {
    this.highScore = Math.max(500, initialHighScore);
    this.init();
  }

  public setHighScore(score: number): void {
    if (score > this.highScore) this.highScore = score;
  }

  public reset(): void {
    this.init();
  }

  public init(): void {
    this.chips = 500;
    this.bet = 50;
    this.handsPlayed = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.dealHand();
  }

  private buildDeck(): void {
    this.deck = [];
    for (const s of SUITS) {
      for (const rk of RANKS) {
        this.deck.push({ rank: rk.r, suit: s, value: rk.v });
      }
    }
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  private drawCard(): Card {
    if (this.deck.length < 10) this.buildDeck();
    return this.deck.pop()!;
  }

  private handScore(hand: Card[]): number {
    let total = 0;
    let aces = 0;
    for (const c of hand) {
      total += c.value;
      if (c.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  private dealHand(): void {
    if (this.deck.length < 15) this.buildDeck();
    this.playerHand = [this.drawCard(), this.drawCard()];
    this.dealerHand = [this.drawCard(), this.drawCard()];
    this.phase = 'playing';
    this.banner = '';
    this.handsPlayed++;

    if (this.handScore(this.playerHand) === 21) {
      this.chips += Math.floor(this.bet * 1.5);
      if (this.chips > this.highScore) this.highScore = this.chips;
      this.banner = 'BLACKJACK! +75';
      this.phase = 'result';
    }
  }

  public update(input: ArcadeInput, _dt: number): ArcadeSound | null {
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

    if (this.phase === 'result') {
      if ((input.a && !this.lastA) || (input.b && !this.lastB)) {
        if (this.chips < this.bet) {
          this.gameOver = true;
          sound = 'gameover';
        } else {
          this.dealHand();
          sound = 'hit';
        }
      }
      this.lastA = input.a;
      this.lastB = input.b;
      return sound;
    }

    // HIT with [A]
    if (input.a && !this.lastA) {
      this.playerHand.push(this.drawCard());
      const pVal = this.handScore(this.playerHand);
      if (pVal > 21) {
        this.chips -= this.bet;
        this.banner = 'BUST! -50';
        this.phase = 'result';
        sound = 'die';
      } else if (pVal === 21) {
        sound = this.resolveDealer();
      } else {
        sound = 'hit';
      }
    }

    // STAND with [B]
    if (input.b && !this.lastB) {
      sound = this.resolveDealer();
    }

    this.lastA = input.a;
    this.lastB = input.b;
    return sound;
  }

  private resolveDealer(): ArcadeSound {
    while (this.handScore(this.dealerHand) < 17) {
      this.dealerHand.push(this.drawCard());
    }
    const pVal = this.handScore(this.playerHand);
    const dVal = this.handScore(this.dealerHand);

    this.phase = 'result';
    if (dVal > 21 || pVal > dVal) {
      this.chips += this.bet;
      if (this.chips > this.highScore) this.highScore = this.chips;
      this.banner = 'YOU WIN! +50';
      return 'score';
    } else if (pVal === dVal) {
      this.banner = 'PUSH (TIE)';
      return 'hit';
    } else {
      this.chips -= this.bet;
      this.banner = 'DEALER WINS -50';
      return 'die';
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.chips,
      highScore: this.highScore,
      lives: Math.max(0, Math.floor(this.chips / this.bet)),
      level: this.handsPlayed,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUT OF CHIPS!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO REBUY'
        : this.phase === 'result'
        ? `${this.banner} • PRESS [A] NEXT HAND`
        : '[A]: HIT (DRAW) • [B]: STAND',
    };
  }

  private renderCard(c: Card, hidden: boolean, key: string, color: string, bg: string) {
    return (
      <View
        key={key}
        style={[
          styles.card,
          {
            borderColor: color,
            backgroundColor: hidden ? color : bg,
          },
        ]}
      >
        {hidden ? (
          <Text style={{ fontSize: 14, fontWeight: '900', color: bg }}>?</Text>
        ) : (
          <>
            <Text style={[styles.cardRank, { color }]}>{c.rank}</Text>
            <Text style={[styles.cardSuit, { color }]}>{c.suit}</Text>
          </>
        )}
      </View>
    );
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#0A0F14';

    const pScore = this.handScore(this.playerHand);
    const dScore = this.phase === 'playing' ? this.dealerHand[0]?.value || 0 : this.handScore(this.dealerHand);

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Dealer Zone */}
        <View style={styles.zoneTop}>
          <Text style={[styles.zoneLabel, { color: pixelColor }]}>
            DEALER ({this.phase === 'playing' ? `${dScore}+?` : dScore})
          </Text>
          <View style={styles.handRow}>
            {this.dealerHand.map((c, idx) =>
              this.renderCard(c, this.phase === 'playing' && idx === 1, `d-${idx}`, pixelColor, bg)
            )}
          </View>
        </View>

        {/* Center Status Banner */}
        <View style={styles.centerInfo}>
          {this.banner ? (
            <View style={[styles.bannerPill, { backgroundColor: pixelColor }]}>
              <Text style={[styles.bannerTxt, { color: bg }]}>{this.banner}</Text>
            </View>
          ) : (
            <Text style={[styles.promptTxt, { color: pixelColor }]}>[A] HIT   •   [B] STAND</Text>
          )}
        </View>

        {/* Player Zone */}
        <View style={styles.zoneBottom}>
          <Text style={[styles.zoneLabel, { color: pixelColor }]}>
            YOU ({pScore})  •  CHIPS: ${this.chips}
          </Text>
          <View style={styles.handRow}>
            {this.playerHand.map((c, idx) =>
              this.renderCard(c, false, `p-${idx}`, pixelColor, bg)
            )}
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BLACKJACK 21</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>BEAT THE DEALER TO 21</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DEAL</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  zoneTop: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoneBottom: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoneLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  handRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  card: {
    width: 38,
    height: 52,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRank: {
    fontSize: 14,
    fontWeight: '900',
  },
  cardSuit: {
    fontSize: 13,
    marginTop: -2,
  },
  centerInfo: {
    position: 'absolute',
    top: 106,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  bannerTxt: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  promptTxt: {
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
