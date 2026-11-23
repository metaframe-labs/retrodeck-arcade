import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

interface DropItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  kind: 'apple' | 'star' | 'bomb';
}

export class FruitCatcherGame implements ArcadeGameInstance {
  private basketX = ARENA_W / 2 - 20;
  private readonly basketY = 208;
  private readonly basketW = 40;
  private readonly basketH = 14;

  private items: DropItem[] = [];
  private spawnTimer = 0.6;
  private caught = 0;

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
    this.basketX = ARENA_W / 2 - 20;
    this.items = [];
    this.spawnTimer = 0.5;
    this.caught = 0;
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

    const spd = (input.a || input.b ? 260 : 185);
    if (input.left) this.basketX = Math.max(6, this.basketX - spd * dt);
    if (input.right) this.basketX = Math.min(ARENA_W - 6 - this.basketW, this.basketX + spd * dt);

    // Spawn fruits & bombs
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const level = Math.floor(this.caught / 10) + 1;
      this.spawnTimer = Math.max(0.32, 0.78 - level * 0.05);
      const r = Math.random();
      const kind: 'apple' | 'star' | 'bomb' = r < 0.22 ? 'bomb' : r < 0.36 ? 'star' : 'apple';
      this.items.push({
        id: this.nextId++,
        x: 16 + Math.random() * (ARENA_W - 32),
        y: -14,
        vy: 85 + Math.random() * 45 + level * 12,
        kind,
      });
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.vy * dt;

      // Basket catch check
      if (
        it.y >= this.basketY - 6 &&
        it.y <= this.basketY + this.basketH &&
        it.x >= this.basketX - 4 &&
        it.x <= this.basketX + this.basketW + 4
      ) {
        this.items.splice(i, 1);
        if (it.kind === 'bomb') {
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          }
          sound = 'die';
        } else {
          this.caught++;
          this.score += it.kind === 'star' ? 100 : 30;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = it.kind === 'star' ? 'powerup' : 'score';
        }
        continue;
      }

      if (it.y > ARENA_H + 14) {
        this.items.splice(i, 1);
        if (it.kind === 'apple') {
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.lastA = input.a;
            return 'gameover';
          }
          sound = 'die';
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
      level: Math.floor(this.caught / 10) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'BASKET DROPPED!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '◀ / ▶: CATCH ● & ★ • AVOID ✹ BOMBS',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Items */}
        {this.items.map((it) => (
          <Text
            key={it.id}
            style={{
              position: 'absolute',
              left: it.x - 7,
              top: it.y - 8,
              fontSize: 15,
              fontWeight: '900',
              color: pixelColor,
            }}
          >
            {it.kind === 'bomb' ? '✹' : it.kind === 'star' ? '★' : '●'}
          </Text>
        ))}

        {/* Catcher Basket */}
        {!this.gameOver && (
          <View
            style={{
              position: 'absolute',
              left: this.basketX,
              top: this.basketY,
              width: this.basketW,
              height: this.basketH,
              borderLeftWidth: 3,
              borderRightWidth: 3,
              borderBottomWidth: 3,
              borderColor: pixelColor,
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
            }}
          />
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>FRUIT CATCHER</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>CATCH FRUIT • DODGE BOMBS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO PLAY</Text>
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
