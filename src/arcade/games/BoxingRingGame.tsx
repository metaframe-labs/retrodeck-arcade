import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

export class BoxingRingGame implements ArcadeGameInstance {
  private playerHp = 100;
  private cpuHp = 100;
  private playerState: 'idle' | 'punch' | 'block' | 'hit' = 'idle';
  private cpuState: 'idle' | 'windup' | 'punch' | 'hit' = 'idle';
  private pTimer = 0;
  private cTimer = 1.2;

  private banner = 'FIGHT!';
  private kos = 0;
  private score = 0;
  private highScore = 0;
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
    this.playerHp = 100;
    this.cpuHp = 100;
    this.playerState = 'idle';
    this.cpuState = 'idle';
    this.pTimer = 0;
    this.cTimer = 1.2;
    this.kos = 0;
    this.score = 0;
    this.banner = 'BELL RANG — FIGHT!';
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

    // Player states
    if (this.pTimer > 0) {
      this.pTimer -= dt;
      if (this.pTimer <= 0) this.playerState = 'idle';
    }

    if (this.playerState === 'idle' || this.playerState === 'block') {
      if (input.b || input.down) {
        this.playerState = 'block';
      } else {
        this.playerState = 'idle';
      }

      // Punch with [A]
      if (input.a && !this.lastA && this.playerState !== 'block') {
        this.playerState = 'punch';
        this.pTimer = 0.22;
        const counterBonus = this.cpuState === 'windup' ? 22 : 12;
        this.cpuHp = Math.max(0, this.cpuHp - counterBonus);
        this.cpuState = 'hit';
        this.cTimer = 0.35;
        this.score += counterBonus * 5;
        if (this.score > this.highScore) this.highScore = this.score;
        this.banner = counterBonus > 15 ? 'COUNTER HOOK!' : 'JAB HIT!';
        sound = counterBonus > 15 ? 'score' : 'hit';

        if (this.cpuHp <= 0) {
          this.kos++;
          this.score += 500;
          if (this.score > this.highScore) this.highScore = this.score;
          this.cpuHp = 100 + this.kos * 20;
          this.playerHp = Math.min(100, this.playerHp + 35);
          this.banner = `KO #${this.kos}! NEXT CHALLENGER!`;
          sound = 'levelclear';
        }
      }
    }

    // CPU Boxer AI
    this.cTimer -= dt;
    if (this.cTimer <= 0) {
      if (this.cpuState === 'idle' || this.cpuState === 'hit') {
        this.cpuState = 'windup';
        this.cTimer = Math.max(0.32, 0.65 - this.kos * 0.05);
        this.banner = 'INCOMING — HOLD [B] BLOCK!';
      } else if (this.cpuState === 'windup') {
        this.cpuState = 'punch';
        this.cTimer = 0.28;
        if (this.playerState === 'block') {
          this.banner = 'BLOCKED!';
          this.score += 25;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'hit';
        } else {
          this.playerHp = Math.max(0, this.playerHp - (18 + this.kos * 3));
          this.playerState = 'hit';
          this.pTimer = 0.35;
          this.banner = 'OUCH! HIT!';
          sound = 'die';
          if (this.playerHp <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          }
        }
      } else if (this.cpuState === 'punch') {
        this.cpuState = 'idle';
        this.cTimer = 0.7 + Math.random() * 0.8;
      }
    }

    this.lastA = input.a;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.ceil(this.playerHp / 25),
      level: this.kos + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'KNOCKED OUT!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] FOR REMATCH' : '[A]: PUNCH • HOLD [B]: BLOCK',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Health Bars */}
        <View style={styles.hpRow}>
          <View style={{ width: 120 }}>
            <Text style={[styles.hpLbl, { color: pixelColor }]}>YOU {this.playerHp}%</Text>
            <View style={[styles.hpTrack, { borderColor: pixelColor }]}>
              <View style={{ width: `${Math.max(0, this.playerHp)}%`, height: '100%', backgroundColor: pixelColor }} />
            </View>
          </View>
          <View style={{ width: 120 }}>
            <Text style={[styles.hpLbl, { color: pixelColor, textAlign: 'right' }]}>CPU {this.cpuHp}</Text>
            <View style={[styles.hpTrack, { borderColor: pixelColor }]}>
              <View style={{ width: `${Math.max(0, Math.min(100, (this.cpuHp / (100 + this.kos * 20)) * 100))}%`, height: '100%', backgroundColor: pixelColor }} />
            </View>
          </View>
        </View>

        {/* Ring Ropes */}
        <View style={{ position: 'absolute', left: 10, right: 10, top: 82, height: 1.5, backgroundColor: pixelColor, opacity: 0.3 }} />
        <View style={{ position: 'absolute', left: 10, right: 10, top: 112, height: 1.5, backgroundColor: pixelColor, opacity: 0.3 }} />
        <View style={{ position: 'absolute', left: 10, right: 10, bottom: 42, height: 2, backgroundColor: pixelColor }} />

        {/* Player Boxer (Left) */}
        <View
          style={{
            position: 'absolute',
            left: this.playerState === 'punch' ? 98 : 78,
            bottom: 44,
            width: 34,
            height: 62,
            alignItems: 'center',
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: pixelColor }} />
          <View style={{ width: 22, height: 26, borderRadius: 4, backgroundColor: pixelColor, marginTop: 2 }} />
          {/* Gloves */}
          <View
            style={{
              position: 'absolute',
              right: this.playerState === 'punch' ? -22 : this.playerState === 'block' ? -2 : -10,
              top: this.playerState === 'block' ? 4 : 18,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: pixelColor,
              borderWidth: 1.5,
              borderColor: bg,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <View style={{ width: 6, height: 16, backgroundColor: pixelColor }} />
            <View style={{ width: 6, height: 16, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* CPU Boxer (Right) */}
        <View
          style={{
            position: 'absolute',
            right: this.cpuState === 'punch' ? 98 : this.cpuState === 'windup' ? 68 : 78,
            bottom: 44,
            width: 34,
            height: 62,
            alignItems: 'center',
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: pixelColor, backgroundColor: bg }} />
          <View style={{ width: 22, height: 26, borderRadius: 4, borderWidth: 2.5, borderColor: pixelColor, backgroundColor: bg, marginTop: 2 }} />
          {/* CPU Glove */}
          <View
            style={{
              position: 'absolute',
              left: this.cpuState === 'punch' ? -22 : this.cpuState === 'windup' ? 6 : -10,
              top: this.cpuState === 'windup' ? 8 : 18,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: pixelColor,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <View style={{ width: 6, height: 16, backgroundColor: pixelColor }} />
            <View style={{ width: 6, height: 16, backgroundColor: pixelColor }} />
          </View>
        </View>

        {/* Status Banner */}
        <Text style={[styles.bannerTxt, { color: pixelColor }]}>{this.banner}</Text>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>BOXING RING DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>PUNCH [A] • BLOCK [B]</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO FIGHT</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hpRow: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hpLbl: {
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 3,
  },
  hpTrack: {
    height: 8,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 1,
  },
  bannerTxt: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
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
