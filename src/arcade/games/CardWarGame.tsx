import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Card {
  rank: number; // 2..14 (11=J,12=Q,13=K,14=A)
  suit: string;
}

const SUITS = ['S', 'H', 'D', 'C'];

function rankLabel(r: number): string {
  if (r === 11) return 'J';
  if (r === 12) return 'Q';
  if (r === 13) return 'K';
  if (r === 14) return 'A';
  return String(r);
}

export class CardWarGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private gameOver = false;

  private pDeck: Card[] = [];
  private cDeck: Card[] = [];
  private pot: Card[] = [];

  private pCard: Card | null = null;
  private cCard: Card | null = null;
  private isWar = false;
  private banner = 'PRESS A TO FLIP';
  private prevA = false;
  private streak = 0;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.streak = 0;
    this.dealFresh();
  }

  private dealFresh() {
    const deck: Card[] = [];
    for (let r = 2; r <= 14; r++) {
      for (const suit of SUITS) {
        deck.push({ rank: r, suit });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Use 16 cards each for brisk, exciting matches
    this.pDeck = deck.slice(0, 16);
    this.cDeck = deck.slice(16, 32);
    this.pot = [];
    this.pCard = null;
    this.cCard = null;
    this.isWar = false;
    this.banner = `MATCH ${this.level} - FLIP!`;
    this.prevA = false;
  }

  public update(input: ArcadeInput, _dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    const flip = input.a && !this.prevA;
    this.prevA = input.a;
    if (!flip) return null;

    if (this.pDeck.length === 0) {
      this.gameOver = true;
      return 'gameover';
    }
    if (this.cDeck.length === 0) {
      this.level++;
      this.score += 300;
      if (this.score > this.highScore) this.highScore = this.score;
      this.dealFresh();
      return 'levelclear';
    }

    // If WAR, burn 1 card each into pot if available
    if (this.isWar) {
      if (this.pDeck.length > 1) this.pot.push(this.pDeck.shift()!);
      if (this.cDeck.length > 1) this.pot.push(this.cDeck.shift()!);
    }

    const pc = this.pDeck.shift()!;
    const cc = this.cDeck.shift()!;
    this.pCard = pc;
    this.cCard = cc;
    this.pot.push(pc, cc);

    if (pc.rank > cc.rank) {
      this.pDeck.push(...this.pot);
      const won = this.pot.length;
      this.pot = [];
      this.isWar = false;
      this.streak++;
      this.score += won * 15 + this.streak * 5;
      if (this.score > this.highScore) this.highScore = this.score;
      this.banner = won > 2 ? `WAR WON! +${won} CARDS` : 'YOU WIN HAND!';
      if (this.cDeck.length === 0) {
        this.banner = 'CPU OUT! PRESS A';
        return 'levelclear';
      }
      return won > 2 ? 'powerup' : 'score';
    } else if (cc.rank > pc.rank) {
      this.cDeck.push(...this.pot);
      const lost = this.pot.length;
      this.pot = [];
      this.isWar = false;
      this.streak = 0;
      this.banner = lost > 2 ? `CPU WINS WAR!` : 'CPU WINS HAND';
      if (this.pDeck.length === 0) {
        this.gameOver = true;
        return 'gameover';
      }
      return 'hit';
    } else {
      this.isWar = true;
      this.banner = 'WAR! TIE! FLIP AGAIN!';
      return 'bomb';
    }
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.pDeck.length,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT OF CARDS' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    const renderCard = (card: Card | null, label: string, count: number) => (
      <View style={styles.sideCol}>
        <Text style={[styles.sideLbl, { color: fg }]}>
          {label} ({count})
        </Text>
        <View
          style={[
            styles.card,
            {
              borderColor: fg,
              backgroundColor: card ? bg : fg,
            },
          ]}
        >
          {card ? (
            <>
              <Text style={[styles.cardCorner, { color: fg }]}>
                {rankLabel(card.rank)}
              </Text>
              <Text style={[styles.cardBig, { color: fg }]}>
                {rankLabel(card.rank)}
              </Text>
              <Text style={[styles.cardSuit, { color: fg }]}>[{card.suit}]</Text>
            </>
          ) : (
            <Text style={[styles.cardBack, { color: bg }]}>WAR</Text>
          )}
        </View>
      </View>
    );

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>CARD WAR DX</Text>
          <Text style={[styles.hdrText, { color: fg }]}>POT:{this.pot.length}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        <View style={styles.table}>
          {renderCard(this.pCard, 'YOU', this.pDeck.length)}
          <View style={styles.vsCol}>
            <Text style={[styles.vsTxt, { color: fg }]}>
              {this.isWar ? 'WAR!' : 'VS'}
            </Text>
          </View>
          {renderCard(this.cCard, 'CPU', this.cDeck.length)}
        </View>

        <View style={[styles.bannerBox, { borderColor: fg }]}>
          <Text style={[styles.bannerTxt, { color: fg }]}>{this.banner}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderBottomWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  hdrText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  table: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sideCol: {
    alignItems: 'center',
  },
  sideLbl: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  card: {
    width: 78,
    height: 108,
    borderWidth: 2.5,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCorner: {
    position: 'absolute',
    top: 5,
    left: 7,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  cardBig: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  cardSuit: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  cardBack: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  vsCol: {
    alignItems: 'center',
  },
  vsTxt: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  bannerBox: {
    position: 'absolute',
    bottom: 18,
    left: 24,
    right: 24,
    borderWidth: 2,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bannerTxt: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
