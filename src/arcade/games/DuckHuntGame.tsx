import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const BUSH_Y = 192;

interface Duck {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'flying' | 'falling';
  flapTimer: number;
  flapFrame: number;
  escapeTimer: number;
}

export class DuckHuntGame implements ArcadeGameInstance {
  private crossX = ARENA_W / 2;
  private crossY = 100;
  private duck: Duck | null = null;
  private ammo = 3;
  private ducksShot = 0;
  private missedDucks = 0;
  private flashTimer = 0;

  private score = 0;
  private highScore = 0;
  private round = 1;
  private gameOver = false;
  private isMenu = true;
  private nextId = 1;
  private lastA = false;
  private lastB = false;

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
    this.crossX = ARENA_W / 2;
    this.crossY = 100;
    this.score = 0;
    this.round = 1;
    this.ducksShot = 0;
    this.missedDucks = 0;
    this.gameOver = false;
    this.isMenu = true;
    this.spawnDuck();
  }

  private spawnDuck(): void {
    this.ammo = 3;
    const spd = 85 + this.round * 14;
    const angle = -Math.PI / 4 - Math.random() * (Math.PI / 2);
    this.duck = {
      id: this.nextId++,
      x: 40 + Math.random() * (ARENA_W - 80),
      y: BUSH_Y - 16,
      vx: Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * spd,
      state: 'flying',
      flapTimer: 0,
      flapFrame: 0,
      escapeTimer: 6.0,
    };
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

    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Crosshair movement
    const aimSpd = 195;
    if (input.left) this.crossX = Math.max(12, this.crossX - aimSpd * dt);
    if (input.right) this.crossX = Math.min(ARENA_W - 12, this.crossX + aimSpd * dt);
    if (input.up) this.crossY = Math.max(14, this.crossY - aimSpd * dt);
    if (input.down) this.crossY = Math.min(BUSH_Y - 8, this.crossY + aimSpd * dt);

    // Shoot with [A] or [B]
    const trigger = (input.a && !this.lastA) || (input.b && !this.lastB);
    if (trigger && this.ammo > 0 && this.duck && this.duck.state === 'flying') {
      this.ammo--;
      this.flashTimer = 0.08;
      sound = 'shoot';

      if (Math.hypot(this.crossX - this.duck.x, this.crossY - this.duck.y) <= 22) {
        this.duck.state = 'falling';
        this.ducksShot++;
        this.score += 100 * this.round + this.ammo * 50;
        if (this.score > this.highScore) this.highScore = this.score;
        if (this.ducksShot % 5 === 0) this.round++;
        sound = 'score';
      }
    }

    // Update Duck
    if (this.duck) {
      if (this.duck.state === 'flying') {
        this.duck.flapTimer += dt;
        if (this.duck.flapTimer >= 0.12) {
          this.duck.flapTimer = 0;
          this.duck.flapFrame = 1 - this.duck.flapFrame;
        }

        this.duck.escapeTimer -= dt;
        this.duck.x += this.duck.vx * dt;
        this.duck.y += this.duck.vy * dt;

        // Fly away if out of ammo or time
        if (this.ammo === 0 || this.duck.escapeTimer <= 0) {
          this.duck.vy = -140;
          if (this.duck.y < -20) {
            this.missedDucks++;
            if (this.missedDucks >= 3) {
              this.gameOver = true;
              this.lastA = input.a;
              this.lastB = input.b;
              return 'gameover';
            } else {
              this.spawnDuck();
              sound = 'die';
            }
          }
        } else {
          // Bounce inside sky box
          if (this.duck.x < 18) { this.duck.x = 18; this.duck.vx = Math.abs(this.duck.vx); }
          if (this.duck.x > ARENA_W - 18) { this.duck.x = ARENA_W - 18; this.duck.vx = -Math.abs(this.duck.vx); }
          if (this.duck.y < 18) { this.duck.y = 18; this.duck.vy = Math.abs(this.duck.vy); }
          if (this.duck.y > BUSH_Y - 22) { this.duck.y = BUSH_Y - 22; this.duck.vy = -Math.abs(this.duck.vy); }
        }
      } else {
        // Falling down into bushes
        this.duck.y += 180 * dt;
        if (this.duck.y >= BUSH_Y) {
          this.spawnDuck();
        }
      }
    }

    this.lastA = input.a;
    this.lastB = input.b;
    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, 3 - this.missedDucks),
      level: this.round,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'DUCKS ESCAPED!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] TO HUNT AGAIN'
        : `AMMO: ${'●'.repeat(this.ammo)} • D-PAD: AIM • [A]: SHOOT`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={[StyleSheet.absoluteFill, this.flashTimer > 0 && { opacity: 0.7 }]}>
        {/* Bush Foreground */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: BUSH_Y, bottom: 0, backgroundColor: pixelColor, opacity: 0.28 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: BUSH_Y, height: 2, backgroundColor: pixelColor }} />

        {/* Ammo & Hits Bottom Bar */}
        <View style={styles.bottomHud}>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>SHOTS: {'● '.repeat(this.ammo)}</Text>
          <Text style={[styles.hudTxt, { color: pixelColor }]}>HITS: {this.ducksShot}</Text>
        </View>

        {/* Flying / Falling Duck */}
        {this.duck && (
          <View
            style={{
              position: 'absolute',
              left: this.duck.x - 12,
              top: this.duck.y - 8,
              width: 24,
              height: 16,
              transform: [
                { scaleX: this.duck.vx >= 0 ? 1 : -1 },
                { rotate: this.duck.state === 'falling' ? '180deg' : '0deg' },
              ],
            }}
          >
            {/* Body */}
            <View style={{ position: 'absolute', left: 2, top: 6, width: 14, height: 8, borderRadius: 4, backgroundColor: pixelColor }} />
            {/* Head */}
            <View style={{ position: 'absolute', left: 14, top: 2, width: 8, height: 7, borderRadius: 3.5, backgroundColor: pixelColor }}>
              <View style={{ position: 'absolute', right: 2, top: 2, width: 2, height: 2, backgroundColor: bg }} />
            </View>
            {/* Beak */}
            <View style={{ position: 'absolute', left: 21, top: 5, width: 4, height: 2.5, backgroundColor: pixelColor }} />
            {/* Flapping Wing */}
            <View
              style={{
                position: 'absolute',
                left: 6,
                top: this.duck.flapFrame === 0 ? 0 : 9,
                width: 8,
                height: 6,
                borderRadius: 2,
                backgroundColor: pixelColor,
              }}
            />
          </View>
        )}

        {/* Aim Crosshair */}
        {!this.gameOver && !this.isMenu && (
          <View style={{ position: 'absolute', left: this.crossX - 10, top: this.crossY - 10, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: pixelColor, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: 20, height: 1, backgroundColor: pixelColor }} />
            <View style={{ position: 'absolute', width: 1, height: 20, backgroundColor: pixelColor }} />
          </View>
        )}

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>DUCK HUNT DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>AIM & SHOOT FLYING DUCKS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO HUNT</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  bottomHud: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudTxt: {
    fontSize: 9,
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
