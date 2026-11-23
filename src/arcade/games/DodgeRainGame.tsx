import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface FallingItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  isStar: boolean;
}

export class DodgeRainGame implements ArcadeGameInstance {
  private px = ARENA_W / 2 - 8;
  private readonly py = 204;
  private readonly pw = 16;
  private readonly ph = 18;

  private items: FallingItem[] = [];
  private spawnTimer = 0.4;
  private elapsed = 0;

  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
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
    this.px = ARENA_W / 2 - 8;
    this.items = [];
    this.spawnTimer = 0.4;
    this.elapsed = 0;
    this.score = 0;
    this.lives = 3;
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

    this.elapsed += dt;
    const dash = input.a || input.b ? 1.55 : 1.0;
    const spd = 175 * dash;
    if (input.left) this.px = Math.max(8, this.px - spd * dt);
    if (input.right) this.px = Math.min(ARENA_W - 8 - this.pw, this.px + spd * dt);

    // Spawn meteors & bonus stars
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.14, 0.42 - this.elapsed * 0.005);
      const isStar = Math.random() < 0.22;
      this.items.push({
        id: this.nextId++,
        x: 12 + Math.random() * (ARENA_W - 24),
        y: -14,
        vy: (95 + Math.random() * 65 + this.elapsed * 2.2) * (isStar ? 0.85 : 1),
        isStar,
      });
    }

    // Update falling items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.vy * dt;

      if (it.y > ARENA_H + 16) {
        this.items.splice(i, 1);
        if (!it.isStar) {
          this.score += 5;
          if (this.score > this.highScore) this.highScore = this.score;
        }
        continue;
      }

      // Collision with player
      if (
        Math.abs(it.x - (this.px + this.pw / 2)) < 11 &&
        Math.abs(it.y - (this.py + this.ph / 2)) < 12
      ) {
        this.items.splice(i, 1);
        if (it.isStar) {
          this.score += 100;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';
        } else {
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          } else {
            sound = 'die';
          }
        }
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
      level: Math.floor(this.elapsed / 15) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'STRUCK DOWN!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: DODGE SPEARS • [A]: SPRINT • CATCH ★',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ground */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: this.py + this.ph, height: 2, backgroundColor: pixelColor }} />

        {/* Falling Spears & Stars */}
        {this.items.map((it) =>
          it.isStar ? (
            <Text
              key={it.id}
              style={{
                position: 'absolute',
                left: it.x - 6,
                top: it.y - 7,
                fontSize: 13,
                fontWeight: '900',
                color: pixelColor,
              }}
            >
              ★
            </Text>
          ) : (
            <View key={it.id} style={{ position: 'absolute', left: it.x - 3, top: it.y - 8, width: 6, height: 14, alignItems: 'center' }}>
              <View style={{ width: 2, height: 8, backgroundColor: pixelColor }} />
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 4,
                  borderRightWidth: 4,
                  borderTopWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: pixelColor,
                }}
              />
            </View>
          )
        )}

        {/* Runner */}
        {!this.gameOver && (
          <View style={{ position: 'absolute', left: this.px, top: this.py, width: this.pw, height: this.ph, alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pixelColor, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 3, height: 2, backgroundColor: bg }} />
            </View>
            <View style={{ width: 12, height: 7, borderRadius: 2, backgroundColor: pixelColor, marginTop: 1 }} />
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 1 }}>
              <View style={{ width: 3, height: 3, backgroundColor: pixelColor }} />
              <View style={{ width: 3, height: 3, backgroundColor: pixelColor }} />
            </View>
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>DODGE RAIN DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>EVADE METEORS • CATCH STARS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO SURVIVE</Text>
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
