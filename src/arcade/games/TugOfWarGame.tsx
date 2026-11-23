import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

export class TugOfWarGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private knotX = 160; // win <= 72, lose >= 248
  private stamina = 100;
  private tired = false;
  private prevA = false;
  private prevLeft = false;
  private pullAnim = 0;
  private banner = 'MASH A / LEFT TO PULL!';
  private roundDelay = 0;

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameOver = false;
    this.startMatch();
  }

  private startMatch() {
    this.knotX = 160;
    this.stamina = 100;
    this.tired = false;
    this.prevA = false;
    this.prevLeft = false;
    this.roundDelay = 0;
    this.banner = `CHALLENGER #${this.level} — PULL!`;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    if (this.roundDelay > 0) {
      this.roundDelay -= dt;
      if (this.roundDelay <= 0) this.startMatch();
      return null;
    }

    let sound: ArcadeSound | null = null;
    if (this.pullAnim > 0) this.pullAnim -= dt * 5;

    // Stamina regen
    this.stamina = Math.min(100, this.stamina + (this.tired ? 38 : 26) * dt);
    if (this.tired && this.stamina >= 40) {
      this.tired = false;
      this.banner = 'RECOVERED! PULL!';
    }

    // CPU pull strength increases per level with rhythmic surges
    const cpuPull = 30 + this.level * 9 + Math.sin(Date.now() * 0.004) * 8;
    this.knotX += cpuPull * dt;

    const tapA = input.a && !this.prevA;
    const tapL = input.left && !this.prevLeft;
    this.prevA = input.a;
    this.prevLeft = input.left;

    if ((tapA || tapL) && !this.tired) {
      this.knotX -= 13.5;
      this.stamina -= 11;
      this.pullAnim = 1;
      sound = 'hit';
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.tired = true;
        this.banner = 'TIRED! BREATHE!';
      }
    }

    // Check win/loss
    if (this.knotX <= 72) {
      this.score += 150 * this.level;
      if (this.score > this.highScore) this.highScore = this.score;
      this.level++;
      this.banner = 'YOU WIN THE PULL!';
      this.roundDelay = 1.1;
      return 'levelclear';
    } else if (this.knotX >= 248) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      this.banner = 'PULLED OVER! TRY AGAIN!';
      this.roundDelay = 1.1;
      return 'die';
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT-MUSCLED!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const lean = this.pullAnim > 0 ? -4 : 0;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>TUG WAR LV{this.level}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>HP:{this.lives}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SC:{this.score}</Text>
        </View>

        {/* Stamina bar */}
        <Text style={[styles.stamLbl, { color: fg }]}>
          {this.tired ? 'TIRED!' : 'STAMINA'}
        </Text>
        <View style={[styles.stamBar, { borderColor: fg }]}>
          <View
            style={[
              styles.stamFill,
              { width: `${this.stamina}%`, backgroundColor: fg, opacity: this.tired ? 0.4 : 1 },
            ]}
          />
        </View>

        {/* Win / Lose threshold lines */}
        <View style={[styles.markLine, { left: 72, borderColor: fg }]} />
        <View style={[styles.markLine, { left: 160, borderColor: fg, opacity: 0.35 }]} />
        <View style={[styles.markLine, { left: 248, borderColor: fg }]} />
        <Text style={[styles.winLbl, { left: 56, color: fg }]}>WIN</Text>
        <Text style={[styles.winLbl, { left: 234, color: fg }]}>LOSE</Text>

        {/* Rope */}
        <View style={[styles.rope, { backgroundColor: fg }]} />

        {/* Knot Marker */}
        <View
          style={[
            styles.knot,
            { left: this.knotX - 7, backgroundColor: fg, borderColor: bg },
          ]}
        />

        {/* Player Team (Left) */}
        <View style={[styles.person, { left: 24 + lean, top: 122 }]}>
          <View style={[styles.head, { backgroundColor: fg }]} />
          <View style={[styles.body, { backgroundColor: fg }]} />
        </View>
        <View style={[styles.person, { left: 46 + lean, top: 122 }]}>
          <View style={[styles.head, { backgroundColor: fg }]} />
          <View style={[styles.body, { backgroundColor: fg }]} />
        </View>

        {/* CPU Team (Right) */}
        <View style={[styles.person, { left: 262, top: 122 }]}>
          <View style={[styles.head, { backgroundColor: fg }]} />
          <View style={[styles.body, { backgroundColor: fg }]} />
        </View>
        <View style={[styles.person, { left: 284, top: 122 }]}>
          <View style={[styles.head, { backgroundColor: fg }]} />
          <View style={[styles.body, { backgroundColor: fg }]} />
        </View>

        {/* Ground */}
        <View style={[styles.ground, { backgroundColor: fg }]} />

        {/* Banner */}
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
  stamLbl: {
    position: 'absolute',
    top: 34,
    left: 20,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  stamBar: {
    position: 'absolute',
    top: 47,
    left: 20,
    width: 140,
    height: 10,
    borderWidth: 1.5,
  },
  stamFill: {
    height: '100%',
  },
  markLine: {
    position: 'absolute',
    top: 90,
    height: 78,
    width: 0,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
  },
  winLbl: {
    position: 'absolute',
    top: 76,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  rope: {
    position: 'absolute',
    top: 138,
    left: 34,
    right: 34,
    height: 4,
  },
  knot: {
    position: 'absolute',
    top: 133,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  person: {
    position: 'absolute',
    width: 14,
    height: 36,
    alignItems: 'center',
  },
  head: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  body: {
    width: 10,
    height: 22,
  },
  ground: {
    position: 'absolute',
    top: 162,
    left: 12,
    right: 12,
    height: 3,
  },
  bannerBox: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    borderWidth: 2,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bannerTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
