import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Hole {
  hasMole: boolean;
  isGolden: boolean;
  timer: number;
  whackedTimer: number;
}

export class WhackAMoleGame implements ArcadeGameInstance {
  private holes: Hole[] = [];
  private cursorX = 1; // 0..2
  private cursorY = 1; // 0..2

  private timeLeft = 45;
  private spawnTimer = 0.7;
  private combo = 0;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
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
    this.holes = Array.from({ length: 9 }, () => ({
      hasMole: false,
      isGolden: false,
      timer: 0,
      whackedTimer: 0,
    }));
    this.cursorX = 1;
    this.cursorY = 1;
    this.timeLeft = 45;
    this.spawnTimer = 0.6;
    this.combo = 0;
    this.score = 0;
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

    // Countdown timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.updateInput(input);
      return 'gameover';
    }

    // Move cursor on 3x3 grid
    if (input.left && !this.lastLeft) this.cursorX = Math.max(0, this.cursorX - 1);
    if (input.right && !this.lastRight) this.cursorX = Math.min(2, this.cursorX + 1);
    if (input.up && !this.lastUp) this.cursorY = Math.max(0, this.cursorY - 1);
    if (input.down && !this.lastDown) this.cursorY = Math.min(2, this.cursorY + 1);

    // Whack with [A]
    if (input.a && !this.lastA) {
      const idx = this.cursorY * 3 + this.cursorX;
      const hole = this.holes[idx];
      if (hole.hasMole) {
        hole.hasMole = false;
        hole.whackedTimer = 0.25;
        this.combo++;
        const pts = (hole.isGolden ? 100 : 30) + this.combo * 5;
        this.score += pts;
        if (this.score > this.highScore) this.highScore = this.score;
        sound = hole.isGolden ? 'powerup' : 'score';
      } else {
        this.combo = 0;
        sound = 'hit';
      }
    }

    // Update moles
    for (const h of this.holes) {
      if (h.whackedTimer > 0) h.whackedTimer -= dt;
      if (h.hasMole) {
        h.timer -= dt;
        if (h.timer <= 0) {
          h.hasMole = false;
          this.combo = 0;
        }
      }
    }

    // Spawn moles faster as time progresses
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const elapsed = 45 - this.timeLeft;
      this.spawnTimer = Math.max(0.32, 0.85 - elapsed * 0.012);

      const emptyIdxs = this.holes
        .map((h, i) => (!h.hasMole ? i : -1))
        .filter((i) => i !== -1);

      if (emptyIdxs.length > 0) {
        const pick = emptyIdxs[Math.floor(Math.random() * emptyIdxs.length)];
        const isGolden = Math.random() < 0.16;
        this.holes[pick].hasMole = true;
        this.holes[pick].isGolden = isGolden;
        this.holes[pick].timer = Math.max(0.65, (isGolden ? 0.9 : 1.45) - elapsed * 0.014);
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
      level: Math.floor(this.score / 300) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'TIME UP!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO PLAY AGAIN'
        : `TIME: ${Math.ceil(this.timeLeft)}s • COMBO x${this.combo}`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Header Bar */}
        <View style={styles.hudRow}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>TIME: {Math.ceil(this.timeLeft)}s</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>COMBO x{this.combo}</Text>
        </View>

        {/* 3x3 Mole Grid */}
        {this.holes.map((h, idx) => {
          const c = idx % 3;
          const r = Math.floor(idx / 3);
          const left = 54 + c * 74;
          const top = 40 + r * 62;
          const selected = c === this.cursorX && r === this.cursorY;

          return (
            <View
              key={`hole-${idx}`}
              style={[
                styles.holeWrap,
                {
                  left,
                  top,
                  borderColor: selected ? pixelColor : 'transparent',
                  borderWidth: selected ? 2 : 0,
                },
              ]}
            >
              {/* Hole Oval */}
              <View style={[styles.holePit, { borderColor: pixelColor }]} />

              {/* Mole Popping Up */}
              {h.hasMole && (
                <View style={[styles.moleBody, { backgroundColor: pixelColor }]}>
                  <View style={styles.moleEyes}>
                    <View style={[styles.moleEye, { backgroundColor: bg }]} />
                    <View style={[styles.moleEye, { backgroundColor: bg }]} />
                  </View>
                  {h.isGolden && (
                    <Text style={{ fontSize: 8, fontWeight: '900', color: bg, marginTop: 1 }}>★</Text>
                  )}
                </View>
              )}

              {/* Whack Feedback */}
              {h.whackedTimer > 0 && (
                <Text style={[styles.bonkTxt, { color: pixelColor }]}>POW!</Text>
              )}
            </View>
          );
        })}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>WHACK-A-MOLE</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>SMASH MOLES BEFORE TIME UP</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO START</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hudRow: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  holeWrap: {
    position: 'absolute',
    width: 64,
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  holePit: {
    width: 46,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  moleBody: {
    position: 'absolute',
    bottom: 10,
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
    paddingTop: 6,
  },
  moleEyes: {
    flexDirection: 'row',
    gap: 6,
  },
  moleEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  bonkTxt: {
    position: 'absolute',
    top: 4,
    fontSize: 10,
    fontWeight: '900',
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
