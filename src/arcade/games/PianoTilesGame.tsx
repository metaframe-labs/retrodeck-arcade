import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;

const LANE_W = 56;
const BOARD_L = Math.floor((ARENA_W - LANE_W * 4) / 2); // 48
const ROW_H = 52;
const KEY_LABELS = ['◀', '▲', '▼', '▶'];

interface TileRow {
  id: number;
  blackLane: number; // 0..3
  y: number;
  tapped: boolean;
}

export class PianoTilesGame implements ArcadeGameInstance {
  private rows: TileRow[] = [];
  private speed = 95;
  private tilesCleared = 0;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;

  private lastLeft = false;
  private lastUp = false;
  private lastDown = false;
  private lastRight = false;
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
    this.rows = [];
    for (let i = 0; i < 6; i++) {
      this.rows.push({
        id: this.nextId++,
        blackLane: Math.floor(Math.random() * 4),
        y: 130 - i * ROW_H,
        tapped: false,
      });
    }
    this.speed = 95;
    this.tilesCleared = 0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  private pressLane(lane: number): ArcadeSound {
    // Must tap the lowest untapped black tile!
    const untapped = this.rows.filter((r) => !r.tapped);
    if (untapped.length === 0) return 'hit';
    untapped.sort((a, b) => b.y - a.y);
    const lowest = untapped[0];

    if (lowest.blackLane === lane) {
      lowest.tapped = true;
      this.tilesCleared++;
      this.score += 25;
      if (this.score > this.highScore) this.highScore = this.score;
      return 'score';
    } else {
      // Tapped white tile -> Game Over!
      this.gameOver = true;
      return 'gameover';
    }
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

    if (input.left && !this.lastLeft) sound = this.pressLane(0);
    else if (input.up && !this.lastUp) sound = this.pressLane(1);
    else if (input.down && !this.lastDown) sound = this.pressLane(2);
    else if (input.right && !this.lastRight) sound = this.pressLane(3);

    if (this.gameOver) {
      this.updateInput(input);
      return sound;
    }

    this.speed = Math.min(245, 95 + this.tilesCleared * 2.5);
    for (const r of this.rows) {
      r.y += this.speed * dt;
    }

    // Spawn new top row seamlessly
    let minY = 999;
    for (const r of this.rows) if (r.y < minY) minY = r.y;
    if (minY > -ROW_H) {
      this.rows.push({
        id: this.nextId++,
        blackLane: Math.floor(Math.random() * 4),
        y: minY - ROW_H,
        tapped: false,
      });
    }

    // Check missed bottom tile
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const r = this.rows[i];
      if (!r.tapped && r.y >= ARENA_H - 12) {
        this.gameOver = true;
        this.updateInput(input);
        return 'gameover';
      }
      if (r.y > ARENA_H + 20) {
        this.rows.splice(i, 1);
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastUp = input.up;
    this.lastDown = input.down;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: 1,
      level: Math.floor(this.tilesCleared / 15) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'WRONG TILE!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO PLAY AGAIN'
        : `TILES: ${this.tilesCleared} • TAP ◀ ▲ ▼ ▶ FOR BLACK TILES`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* 4 Piano Columns */}
        <View style={{ position: 'absolute', left: BOARD_L, top: 0, bottom: 0, width: LANE_W * 4, borderLeftWidth: 2, borderRightWidth: 2, borderColor: pixelColor }}>
          {[1, 2, 3].map((col) => (
            <View key={`div-${col}`} style={{ position: 'absolute', left: col * LANE_W, top: 0, bottom: 0, width: 1, backgroundColor: pixelColor, opacity: 0.25 }} />
          ))}

          {/* Scrolling Tile Rows */}
          {this.rows.map((r) => (
            <View
              key={r.id}
              style={{
                position: 'absolute',
                left: r.blackLane * LANE_W + 2,
                top: r.y,
                width: LANE_W - 4,
                height: ROW_H - 2,
                backgroundColor: r.tapped ? 'transparent' : pixelColor,
                borderWidth: r.tapped ? 1 : 0,
                borderColor: pixelColor,
                opacity: r.tapped ? 0.2 : 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!r.tapped && (
                <Text style={{ fontSize: 16, fontWeight: '900', color: bg }}>
                  {KEY_LABELS[r.blackLane]}
                </Text>
              )}
            </View>
          ))}

          {/* Bottom Key Legend */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, flexDirection: 'row', backgroundColor: bg, borderTopWidth: 1.5, borderColor: pixelColor }}>
            {KEY_LABELS.map((lbl, i) => (
              <View key={`kl-${i}`} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: pixelColor }}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>PIANO TILES DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>DON'T TAP THE WHITE TILES!</Text>
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
