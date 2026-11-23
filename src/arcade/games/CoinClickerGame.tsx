import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

export class CoinClickerGame implements ArcadeGameInstance {
  private coins = 0;
  private totalEarned = 0;
  private highScore = 0;
  private clickPower = 1;
  private autoRate = 0;
  private autoAccum = 0;

  private clickCost = 15;
  private autoCost = 30;
  private selectedShop = 0; // 0: Click Power, 1: Auto Miner
  private pulseTimer = 0;
  private isMenu = true;

  private lastA = false;
  private lastB = false;
  private lastLeft = false;
  private lastRight = false;

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
    this.coins = 0;
    this.totalEarned = 0;
    this.clickPower = 1;
    this.autoRate = 0;
    this.autoAccum = 0;
    this.clickCost = 15;
    this.autoCost = 30;
    this.selectedShop = 0;
    this.pulseTimer = 0;
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

    if (this.pulseTimer > 0) this.pulseTimer -= dt;

    // Auto-mining income
    if (this.autoRate > 0) {
      this.autoAccum += this.autoRate * dt;
      if (this.autoAccum >= 1) {
        const whole = Math.floor(this.autoAccum);
        this.autoAccum -= whole;
        this.coins += whole;
        this.totalEarned += whole;
        if (this.totalEarned > this.highScore) this.highScore = this.totalEarned;
      }
    }

    // Switch shop selection
    if ((input.left && !this.lastLeft) || (input.right && !this.lastRight)) {
      this.selectedShop = 1 - this.selectedShop;
      sound = 'hit';
    }

    // Mine coin with [A]
    if (input.a && !this.lastA) {
      this.coins += this.clickPower;
      this.totalEarned += this.clickPower;
      if (this.totalEarned > this.highScore) this.highScore = this.totalEarned;
      this.pulseTimer = 0.1;
      sound = 'hit';
    }

    // Buy selected upgrade with [B]
    if (input.b && !this.lastB) {
      if (this.selectedShop === 0 && this.coins >= this.clickCost) {
        this.coins -= this.clickCost;
        this.clickPower += Math.max(1, Math.floor(this.clickPower * 0.5) + 1);
        this.clickCost = Math.floor(this.clickCost * 1.65);
        sound = 'score';
      } else if (this.selectedShop === 1 && this.coins >= this.autoCost) {
        this.coins -= this.autoCost;
        this.autoRate += Math.max(2, Math.floor(this.autoRate * 0.5) + 2);
        this.autoCost = Math.floor(this.autoCost * 1.7);
        sound = 'powerup';
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastA = input.a;
    this.lastB = input.b;
    this.lastLeft = input.left;
    this.lastRight = input.right;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.totalEarned,
      highScore: this.highScore,
      lives: 1,
      level: this.clickPower + this.autoRate,
      gameOver: false,
      isMenu: this.isMenu,
      subMessage: `[A]: MINE (+${this.clickPower}) • [B]: BUY UPGRADE • ◀/▶: SHOP`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Wallet Counter */}
        <Text style={[styles.walletTxt, { color: pixelColor }]}>${this.coins}</Text>
        <Text style={[styles.rateTxt, { color: pixelColor }]}>
          +{this.clickPower}/TAP   •   +{this.autoRate}/SEC
        </Text>

        {/* Big Coin Icon */}
        <View style={styles.coinCenter}>
          <View
            style={[
              styles.bigCoin,
              {
                borderColor: pixelColor,
                backgroundColor: this.pulseTimer > 0 ? pixelColor : 'transparent',
                transform: [{ scale: this.pulseTimer > 0 ? 1.12 : 1 }],
              },
            ]}
          >
            <Text style={{ fontSize: 32, fontWeight: '900', color: this.pulseTimer > 0 ? bg : pixelColor }}>
              $
            </Text>
          </View>
        </View>

        {/* Shop Cards */}
        <View style={styles.shopRow}>
          <View
            style={[
              styles.shopCard,
              {
                borderColor: pixelColor,
                backgroundColor: this.selectedShop === 0 ? pixelColor : 'transparent',
                opacity: this.coins >= this.clickCost ? 1 : 0.55,
              },
            ]}
          >
            <Text style={[styles.shopTitle, { color: this.selectedShop === 0 ? bg : pixelColor }]}>
              [B] TAP POWER
            </Text>
            <Text style={[styles.shopCost, { color: this.selectedShop === 0 ? bg : pixelColor }]}>
              COST: ${this.clickCost}
            </Text>
          </View>

          <View
            style={[
              styles.shopCard,
              {
                borderColor: pixelColor,
                backgroundColor: this.selectedShop === 1 ? pixelColor : 'transparent',
                opacity: this.coins >= this.autoCost ? 1 : 0.55,
              },
            ]}
          >
            <Text style={[styles.shopTitle, { color: this.selectedShop === 1 ? bg : pixelColor }]}>
              [B] AUTO MINER
            </Text>
            <Text style={[styles.shopCost, { color: this.selectedShop === 1 ? bg : pixelColor }]}>
              COST: ${this.autoCost}
            </Text>
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>COIN CLICKER DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>TAP [A] & BUILD IDLE EMPIRE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO MINE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  walletTxt: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rateTxt: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  coinCenter: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bigCoin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopRow: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    right: 18,
    flexDirection: 'row',
    gap: 10,
  },
  shopCard: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  shopCost: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
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
