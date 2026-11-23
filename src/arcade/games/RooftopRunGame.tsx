import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface Building {
  id: number;
  x: number;
  w: number;
  topY: number;
}

export class RooftopRunGame implements ArcadeGameInstance {
  private readonly px = 56;
  private py = 140;
  private vy = 0;
  private jumpsLeft = 2; // Double jump!

  private buildings: Building[] = [];
  private distance = 0;
  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
  private lastA = false;
  private lastUp = false;

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
    this.py = 144;
    this.vy = 0;
    this.jumpsLeft = 2;
    this.distance = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;

    this.buildings = [
      { id: this.nextId++, x: 0, w: 180, topY: 162 },
      { id: this.nextId++, x: 225, w: 130, topY: 146 },
    ];
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;
    const jump = (input.a && !this.lastA) || (input.up && !this.lastUp);

    if (this.isMenu) {
      if (jump) {
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    if (this.gameOver) {
      if (input.a && !this.lastA) {
        this.init();
        this.isMenu = false;
        sound = 'powerup';
      }
      this.lastA = input.a;
      this.lastUp = input.up;
      return sound;
    }

    if (jump && this.jumpsLeft > 0) {
      this.vy = this.jumpsLeft === 2 ? -335 : -290;
      this.jumpsLeft--;
      sound = 'hit';
    }

    const prevBottom = this.py + 18;
    this.vy += 940 * dt;
    this.py += this.vy * dt;

    const spd = Math.min(285, 145 + this.distance / 35);
    const dx = spd * dt;
    this.distance += dx;
    this.score = Math.floor(this.distance / 10);
    if (this.score > this.highScore) this.highScore = this.score;

    // Scroll buildings & check rooftop landings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      b.x -= dx;
      if (b.x + b.w < -20) {
        this.buildings.splice(i, 1);
        continue;
      }

      if (
        this.vy >= 0 &&
        this.px + 12 >= b.x &&
        this.px + 2 <= b.x + b.w &&
        prevBottom <= b.topY + 6 &&
        this.py + 18 >= b.topY
      ) {
        this.py = b.topY - 18;
        this.vy = 0;
        this.jumpsLeft = 2;
      }
    }

    // Spawn next building seamlessly
    const last = this.buildings[this.buildings.length - 1];
    if (last && last.x + last.w < ARENA_W + 40) {
      const gap = 38 + Math.random() * 44;
      const w = 75 + Math.random() * 95;
      const topY = Math.max(106, Math.min(188, last.topY + (Math.random() - 0.5) * 64));
      this.buildings.push({ id: this.nextId++, x: last.x + last.w + gap, w, topY });
    }

    // Fell into abyss
    if (this.py > ARENA_H + 10) {
      this.gameOver = true;
      this.lastA = input.a;
      this.lastUp = input.up;
      return 'gameover';
    }

    this.lastA = input.a;
    this.lastUp = input.up;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: Math.floor(this.distance / 500) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'FELL OFF ROOF!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '[A] / [▲]: JUMP & DOUBLE JUMP',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Buildings */}
        {this.buildings.map((b) => (
          <View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.topY,
              width: b.w,
              bottom: 0,
              backgroundColor: pixelColor,
              borderTopWidth: 2,
              borderColor: bg,
              padding: 6,
            }}
          >
            {/* Retro lit windows */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: Math.min(8, Math.floor(b.w / 18) * 2) }).map((_, wi) => (
                <View key={wi} style={{ width: 6, height: 8, backgroundColor: bg, opacity: 0.7 }} />
              ))}
            </View>
          </View>
        ))}

        {/* Parkour Runner */}
        <View style={{ position: 'absolute', left: this.px, top: this.py, width: 14, height: 18, alignItems: 'center' }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: pixelColor }} />
          <View style={{ width: 9, height: 7, backgroundColor: pixelColor, marginTop: 1 }} />
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 1 }}>
            <View style={{ width: 3, height: 4, backgroundColor: pixelColor }} />
            <View style={{ width: 3, height: 4, backgroundColor: pixelColor }} />
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>ROOFTOP RUN DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DOUBLE-JUMP ACROSS SKYLINE</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RUN</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
