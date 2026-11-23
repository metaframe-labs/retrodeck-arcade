import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

export class QuickDrawGame implements ArcadeGameInstance {
  private phase: 'wait' | 'draw' | 'result' = 'wait';
  private timer = 2.0;
  private reactionMs = 0;
  private bestMs = 999;
  private cpuSpeedMs = 480;
  private banner = '';

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private round = 1;
  private gameOver = false;
  private isMenu = true;
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
    this.round = 1;
    this.bestMs = 999;
    this.gameOver = false;
    this.isMenu = true;
    this.startDuel();
  }

  private startDuel(): void {
    this.phase = 'wait';
    this.timer = 1.4 + Math.random() * 2.6;
    this.reactionMs = 0;
    this.cpuSpeedMs = Math.max(210, 500 - (this.round - 1) * 32);
    this.banner = 'WAIT FOR SIGNAL...';
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if (input.a && !this.lastA) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      return sound;
    }

    if (this.phase === 'wait') {
      if (input.a && !this.lastA) {
        // Foul / Early fire!
        this.banner = 'TOO EARLY! FOUL!';
        this.phase = 'result';
        this.timer = 1.3;
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        sound = 'die';
      } else {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.phase = 'draw';
          this.reactionMs = 0;
          this.banner = '>>> DRAW! <<<';
          sound = 'powerup';
        }
      }
    } else if (this.phase === 'draw') {
      this.reactionMs += dt * 1000;

      if (input.a && !this.lastA) {
        const ms = Math.round(this.reactionMs);
        if (ms < this.bestMs) this.bestMs = ms;
        const pts = Math.max(50, 600 - ms);
        this.score += pts;
        if (this.score > this.highScore) this.highScore = this.score;
        this.round++;
        this.banner = `BANG! ${ms}ms (WIN!)`;
        this.phase = 'result';
        this.timer = 1.4;
        sound = 'score';
      } else if (this.reactionMs >= this.cpuSpeedMs) {
        this.banner = `OUTDRAWN! (${this.cpuSpeedMs}ms)`;
        this.phase = 'result';
        this.timer = 1.4;
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver = true;
          this.lastA = input.a;
          return 'gameover';
        }
        sound = 'die';
      }
    } else if (this.phase === 'result') {
      this.timer -= dt;
      if (this.timer <= 0 && !this.gameOver) {
        this.startDuel();
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.round,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'OUTGUNNED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] FOR REMATCH'
        : `BEST: ${this.bestMs < 999 ? `${this.bestMs}ms` : '--'} • WAIT THEN PRESS [A]!`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';
    const isDraw = this.phase === 'draw';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Sun / Horizon */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 42, height: 2, backgroundColor: pixelColor }} />

        {/* Big Signal Box */}
        <View
          style={[
            styles.signalBox,
            {
              borderColor: pixelColor,
              backgroundColor: isDraw ? pixelColor : 'transparent',
            },
          ]}
        >
          <Text style={[styles.signalTxt, { color: isDraw ? bg : pixelColor }]}>
            {this.banner}
          </Text>
        </View>

        {/* Left Cowboy (Player) */}
        <View style={{ position: 'absolute', left: 48, bottom: 44, width: 24, height: 42, alignItems: 'center' }}>
          {/* Hat */}
          <View style={{ width: 22, height: 3, backgroundColor: pixelColor }} />
          <View style={{ width: 12, height: 5, backgroundColor: pixelColor, marginTop: -5 }} />
          {/* Head */}
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: pixelColor, marginTop: 3 }} />
          {/* Body */}
          <View style={{ width: 12, height: 15, backgroundColor: pixelColor, marginTop: 1 }} />
          {/* Legs */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={{ width: 4, height: 10, backgroundColor: pixelColor }} />
            <View style={{ width: 4, height: 10, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* Right Cowboy (Outlaw CPU) */}
        <View style={{ position: 'absolute', right: 48, bottom: 44, width: 24, height: 42, alignItems: 'center' }}>
          <View style={{ width: 22, height: 3, backgroundColor: pixelColor }} />
          <View style={{ width: 12, height: 5, backgroundColor: pixelColor, marginTop: -5 }} />
          <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: pixelColor, marginTop: 3 }} />
          <View style={{ width: 12, height: 15, backgroundColor: pixelColor, marginTop: 1 }} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={{ width: 4, height: 10, backgroundColor: pixelColor }} />
            <View style={{ width: 4, height: 10, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* Duel Info */}
        <Text style={[styles.footerTxt, { color: pixelColor }]}>
          DUEL #{this.round}   •   OUTLAW SPEED: {this.cpuSpeedMs}ms
        </Text>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>QUICK DRAW DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>WILD WEST REFLEX DUEL</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO DUEL</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  signalBox: {
    position: 'absolute',
    top: 30,
    left: 34,
    right: 34,
    height: 52,
    borderWidth: 2.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalTxt: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  footerTxt: {
    position: 'absolute',
    bottom: 14,
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
