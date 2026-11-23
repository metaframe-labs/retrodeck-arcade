import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const COLS = 4;
const ROWS = 4;
const CELL = 46;
const GAP = 5;
const BOARD_SIZE = COLS * CELL + (COLS + 1) * GAP; // 209
const BX = Math.floor((ARENA_W - BOARD_SIZE) / 2);
const BY = Math.floor((ARENA_H - BOARD_SIZE) / 2) + 4;

const SYMBOLS = ['★', '♦', '▲', '●', '✚', '◆', '■', '☀'];

interface CardSlot {
  symbol: string;
  revealed: boolean;
  matched: boolean;
}

export class MemoryPairsGame implements ArcadeGameInstance {
  private cards: CardSlot[] = [];
  private cursorX = 0;
  private cursorY = 0;
  private firstIdx: number | null = null;
  private secondIdx: number | null = null;
  private mismatchTimer = 0;

  private turns = 0;
  private pairsFound = 0;
  private score = 0;
  private highScore = 0;
  private level = 1;
  private gameWon = false;
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
    this.level = 1;
    this.isMenu = true;
    this.dealBoard();
  }

  private dealBoard(): void {
    const deck = [...SYMBOLS, ...SYMBOLS];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.cards = deck.map((s) => ({ symbol: s, revealed: false, matched: false }));
    this.cursorX = 0;
    this.cursorY = 0;
    this.firstIdx = null;
    this.secondIdx = null;
    this.mismatchTimer = 0;
    this.turns = 0;
    this.pairsFound = 0;
    this.gameWon = false;
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

    if (this.gameWon) {
      if (input.a && !this.lastA) {
        this.level++;
        this.dealBoard();
        sound = 'powerup';
      }
      this.updateInput(input);
      return sound;
    }

    if (this.mismatchTimer > 0) {
      this.mismatchTimer -= dt;
      if (this.mismatchTimer <= 0) {
        if (this.firstIdx !== null) this.cards[this.firstIdx].revealed = false;
        if (this.secondIdx !== null) this.cards[this.secondIdx].revealed = false;
        this.firstIdx = null;
        this.secondIdx = null;
      }
      this.updateInput(input);
      return sound;
    }

    if (input.left && !this.lastLeft) this.cursorX = (this.cursorX + COLS - 1) % COLS;
    if (input.right && !this.lastRight) this.cursorX = (this.cursorX + 1) % COLS;
    if (input.up && !this.lastUp) this.cursorY = (this.cursorY + ROWS - 1) % ROWS;
    if (input.down && !this.lastDown) this.cursorY = (this.cursorY + 1) % ROWS;

    if (input.a && !this.lastA) {
      const idx = this.cursorY * COLS + this.cursorX;
      const card = this.cards[idx];
      if (!card.revealed && !card.matched) {
        card.revealed = true;
        sound = 'hit';

        if (this.firstIdx === null) {
          this.firstIdx = idx;
        } else {
          this.secondIdx = idx;
          this.turns++;
          if (this.cards[this.firstIdx].symbol === card.symbol) {
            this.cards[this.firstIdx].matched = true;
            card.matched = true;
            this.firstIdx = null;
            this.secondIdx = null;
            this.pairsFound++;
            this.score += 100;
            if (this.score > this.highScore) this.highScore = this.score;
            sound = 'score';

            if (this.pairsFound === 8) {
              this.gameWon = true;
              const bonus = Math.max(100, 600 - this.turns * 15);
              this.score += bonus;
              if (this.score > this.highScore) this.highScore = this.score;
              sound = 'levelclear';
            }
          } else {
            this.mismatchTimer = 0.65;
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
      lives: 1,
      level: this.level,
      gameOver: false,
      isMenu: this.isMenu,
      message: this.gameWon ? 'ALL PAIRS MATCHED!' : undefined,
      subMessage: this.gameWon
        ? 'PRESS [A] FOR NEXT BOARD'
        : `PAIRS: ${this.pairsFound}/8 • TURNS: ${this.turns}`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.hudTxt, { color: pixelColor }]}>
          PAIRS {this.pairsFound}/8   •   TURNS {this.turns}
        </Text>

        <View
          style={{
            position: 'absolute',
            left: BX,
            top: BY,
            width: BOARD_SIZE,
            height: BOARD_SIZE,
            borderWidth: 1.5,
            borderColor: pixelColor,
            borderRadius: 4,
          }}
        >
          {this.cards.map((card, idx) => {
            const c = idx % COLS;
            const r = Math.floor(idx / COLS);
            const selected = c === this.cursorX && r === this.cursorY;
            const open = card.revealed || card.matched;

            return (
              <View
                key={`mp-${idx}`}
                style={{
                  position: 'absolute',
                  left: GAP + c * (CELL + GAP),
                  top: GAP + r * (CELL + GAP),
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  borderWidth: selected ? 3 : 1.5,
                  borderColor: pixelColor,
                  backgroundColor: card.matched
                    ? isLight
                      ? 'rgba(23,38,22,0.12)'
                      : 'rgba(255,255,255,0.1)'
                    : open
                    ? bg
                    : pixelColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: open ? 20 : 14,
                    fontWeight: '900',
                    color: open ? pixelColor : bg,
                    opacity: card.matched ? 0.55 : 1,
                  }}
                >
                  {open ? card.symbol : '?'}
                </Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>MEMORY PAIRS</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>MATCH ALL 8 SYMBOL PAIRS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FLIP</Text>
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
    top: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
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
