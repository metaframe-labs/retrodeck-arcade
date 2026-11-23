import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface Jumper {
  id: number;
  x: number;
  baseX: number;
  y: number;
  vy: number;
  phase: number;
}

const BOAT_Y = 202;
const BOAT_W = 46;

export class ParachuteRescueGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private boatX = 160;
  private planeX = 40;
  private planeDir = 1;
  private jumpers: Jumper[] = [];
  private nextId = 1;
  private dropTimer = 0.8;
  private time = 0;
  private rescued = 0;

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
    this.boatX = 160;
    this.planeX = 40;
    this.planeDir = 1;
    this.jumpers = [];
    this.dropTimer = 0.7;
    this.time = 0;
    this.rescued = 0;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    this.time += dt;
    let sound: ArcadeSound | null = null;

    const boatSpeed = input.a ? 250 : 185;
    if (input.left) this.boatX = Math.max(BOAT_W / 2 + 6, this.boatX - boatSpeed * dt);
    if (input.right) this.boatX = Math.min(314 - BOAT_W / 2, this.boatX + boatSpeed * dt);

    // Patrol plane at top
    this.planeX += this.planeDir * (72 + this.level * 10) * dt;
    if (this.planeX > 286) {
      this.planeX = 286;
      this.planeDir = -1;
    } else if (this.planeX < 34) {
      this.planeX = 34;
      this.planeDir = 1;
    }

    this.dropTimer -= dt;
    if (this.dropTimer <= 0 && this.jumpers.length < 5) {
      this.jumpers.push({
        id: this.nextId++,
        x: this.planeX,
        baseX: this.planeX,
        y: 48,
        vy: 34 + this.level * 5 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
      });
      this.dropTimer = Math.max(0.65, 1.75 - this.level * 0.14);
    }

    for (let i = this.jumpers.length - 1; i >= 0; i--) {
      const j = this.jumpers[i];
      j.y += j.vy * dt;
      j.x = Math.max(18, Math.min(302, j.baseX + Math.sin(this.time * 2.4 + j.phase) * 20));

      // Boat catch check
      if (j.y >= BOAT_Y - 12 && j.y <= BOAT_Y + 8 && Math.abs(j.x - this.boatX) <= BOAT_W / 2 + 6) {
        this.jumpers.splice(i, 1);
        this.rescued++;
        this.score += 50;
        if (this.score > this.highScore) this.highScore = this.score;
        this.level = 1 + Math.floor(this.rescued / 8);
        sound = 'score';
        continue;
      }

      // Splash into shark water
      if (j.y > 218) {
        this.jumpers.splice(i, 1);
        this.lives--;
        sound = 'die';
        if (this.lives <= 0) {
          this.gameOver = true;
          return 'gameover';
        }
      }
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
      message: this.gameOver ? 'SHARK BAIT!' : undefined,
      subMessage: this.gameOver ? `SAVED: ${this.rescued}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const sharkX = 40 + ((this.time * 38) % 240);

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>PARACHUTE</Text>
          <Text style={[styles.hdrText, { color: fg }]}>SAVED:{this.rescued}</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {/* Plane */}
        <View style={[styles.plane, { left: this.planeX - 18, top: 32 }]}>
          <View style={[styles.planeBody, { backgroundColor: fg }]} />
          <View style={[styles.planeWing, { backgroundColor: fg }]} />
        </View>

        {/* Parachutists */}
        {this.jumpers.map((j) => (
          <View key={j.id} style={[styles.jumper, { left: j.x - 10, top: j.y - 16 }]}>
            <View style={[styles.chute, { borderColor: fg, backgroundColor: fg }]} />
            <View style={styles.cordsRow}>
              <View style={[styles.cord, { backgroundColor: fg }]} />
              <View style={[styles.cord, { backgroundColor: fg }]} />
            </View>
            <View style={[styles.person, { backgroundColor: fg }]} />
          </View>
        ))}

        {/* Rescue Boat */}
        <View
          style={[
            styles.boat,
            {
              left: this.boatX - BOAT_W / 2,
              top: BOAT_Y,
              width: BOAT_W,
              backgroundColor: fg,
            },
          ]}
        >
          <View style={[styles.boatDeck, { backgroundColor: bg }]} />
        </View>

        {/* Ocean + Shark Fin */}
        <View style={[styles.sharkFin, { left: sharkX, borderBottomColor: fg }]} />
        <View style={[styles.ocean, { borderTopColor: fg }]} />
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
    paddingHorizontal: 8,
  },
  hdrText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  plane: {
    position: 'absolute',
    width: 36,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planeBody: {
    width: 32,
    height: 6,
    borderRadius: 3,
  },
  planeWing: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
  jumper: {
    position: 'absolute',
    width: 20,
    height: 24,
    alignItems: 'center',
  },
  chute: {
    width: 18,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 1,
  },
  cordsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cord: {
    width: 1.5,
    height: 6,
  },
  person: {
    width: 6,
    height: 8,
  },
  boat: {
    position: 'absolute',
    height: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    paddingTop: 2,
  },
  boatDeck: {
    width: 28,
    height: 4,
  },
  sharkFin: {
    position: 'absolute',
    bottom: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ocean: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
});
