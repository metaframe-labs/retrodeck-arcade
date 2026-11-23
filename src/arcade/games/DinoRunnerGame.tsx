import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const ARENA_W = 320;
const ARENA_H = 240;
const GROUND_Y = 192;

interface Obstacle {
  id: number;
  type: 'cactus_small' | 'cactus_tall' | 'cactus_double' | 'bird';
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DinoRunnerGame implements ArcadeGameInstance {
  private readonly dinoX = 42;
  private dinoY = GROUND_Y; // feet Y
  private dinoVy = 0;
  private isDucking = false;
  private isGrounded = true;

  private readonly gravity = 1150;
  private readonly jumpVel = -390;

  private speed = 170;
  private distance = 0;
  private groundOffset = 0;
  private legFrame = 0;
  private legTimer = 0;

  private obstacles: Obstacle[] = [];
  private spawnTimer = 1.0;
  private nextEntityId = 1;

  private score = 0;
  private highScore = 0;
  private gameOver = false;
  private isMenu = true;

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
    this.dinoY = GROUND_Y;
    this.dinoVy = 0;
    this.isDucking = false;
    this.isGrounded = true;
    this.speed = 170;
    this.distance = 0;
    this.groundOffset = 0;
    this.obstacles = [];
    this.spawnTimer = 1.0;
    this.score = 0;
    this.gameOver = false;
    this.isMenu = true;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    let sound: ArcadeSound | null = null;

    if (this.isMenu) {
      if ((input.a && !this.lastA) || (input.up && !this.lastUp)) {
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

    // Speed scales gently over time
    this.speed = Math.min(340, 170 + this.distance / 28);
    const dx = this.speed * dt;
    this.distance += dx;
    this.groundOffset = (this.groundOffset + dx) % 24;

    const newScore = Math.floor(this.distance / 12);
    if (newScore > 0 && newScore % 100 === 0 && newScore !== this.score) {
      sound = 'score';
    }
    this.score = newScore;
    if (this.score > this.highScore) this.highScore = this.score;

    // Running leg animation
    this.legTimer += dt;
    if (this.legTimer >= 0.09) {
      this.legTimer = 0;
      this.legFrame = 1 - this.legFrame;
    }

    // Duck & Jump controls
    this.isDucking = input.down || input.b;
    const triggerJump = (input.a || input.up) && this.isGrounded;

    if (triggerJump && !this.isDucking) {
      this.dinoVy = this.jumpVel;
      this.isGrounded = false;
      sound = 'hit';
    }

    // Fast-fall if pressing down in air
    const grav = !this.isGrounded && this.isDucking ? this.gravity * 2.2 : this.gravity;
    this.dinoVy += grav * dt;
    this.dinoY += this.dinoVy * dt;

    if (this.dinoY >= GROUND_Y) {
      this.dinoY = GROUND_Y;
      this.dinoVy = 0;
      this.isGrounded = true;
    }

    // Spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const minGap = Math.max(0.75, 1.45 - (this.speed - 170) / 300);
      this.spawnTimer = minGap + Math.random() * 0.65;

      const r = Math.random();
      if (this.score > 40 && r < 0.28) {
        // Flying Pterodactyl (high or mid - duckable or jumpable)
        const flyHigh = Math.random() < 0.55;
        this.obstacles.push({
          id: this.nextEntityId++,
          type: 'bird',
          x: ARENA_W + 20,
          y: flyHigh ? GROUND_Y - 34 : GROUND_Y - 18,
          w: 22,
          h: 12,
        });
      } else if (r < 0.55) {
        this.obstacles.push({
          id: this.nextEntityId++,
          type: 'cactus_small',
          x: ARENA_W + 20,
          y: GROUND_Y - 20,
          w: 12,
          h: 20,
        });
      } else if (r < 0.8) {
        this.obstacles.push({
          id: this.nextEntityId++,
          type: 'cactus_tall',
          x: ARENA_W + 20,
          y: GROUND_Y - 28,
          w: 14,
          h: 28,
        });
      } else {
        this.obstacles.push({
          id: this.nextEntityId++,
          type: 'cactus_double',
          x: ARENA_W + 20,
          y: GROUND_Y - 22,
          w: 24,
          h: 22,
        });
      }
    }

    // Dino hitbox (forgiving inset)
    const dinoH = this.isDucking && this.isGrounded ? 15 : 26;
    const dinoW = this.isDucking && this.isGrounded ? 24 : 18;
    const hitL = this.dinoX + 3;
    const hitR = this.dinoX + dinoW - 3;
    const hitT = this.dinoY - dinoH + 3;
    const hitB = this.dinoY - 2;

    // Move & Check Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.x -= dx;

      if (ob.x + ob.w < -20) {
        this.obstacles.splice(i, 1);
        continue;
      }

      if (hitR >= ob.x + 2 && hitL <= ob.x + ob.w - 2 && hitB >= ob.y + 2 && hitT <= ob.y + ob.h - 2) {
        this.gameOver = true;
        this.lastA = input.a;
        this.lastUp = input.up;
        return 'gameover';
      }
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
      level: Math.floor(this.score / 100) + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'EXTINCT!' : undefined,
      subMessage: this.gameOver ? 'PRESS [A] TO RETRY' : '[A]/[▲]: JUMP • [▼]/[B]: DUCK',
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bgColor = isLight ? palette.screenBg : '#000';
    const ducking = this.isDucking && this.isGrounded;

    const pebbles = [];
    for (let x = -24; x < ARENA_W + 24; x += 24) {
      pebbles.push(x - this.groundOffset);
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Ground Horizon Line */}
        <View style={[styles.groundLine, { top: GROUND_Y, backgroundColor: pixelColor }]} />

        {/* Desert Pebbles */}
        {pebbles.map((px, i) => (
          <View
            key={`peb-${i}`}
            style={{
              position: 'absolute',
              left: px,
              top: GROUND_Y + 4 + (i % 3) * 3,
              width: i % 2 === 0 ? 6 : 3,
              height: 1.5,
              backgroundColor: pixelColor,
              opacity: 0.5,
            }}
          />
        ))}

        {/* Obstacles */}
        {this.obstacles.map((ob) => {
          if (ob.type === 'bird') {
            return (
              <View key={ob.id} style={[styles.birdWrap, { left: ob.x, top: ob.y }]}>
                <View style={[styles.birdBeak, { backgroundColor: pixelColor }]} />
                <View style={[styles.birdBody, { backgroundColor: pixelColor }]} />
                <View
                  style={[
                    styles.birdWing,
                    {
                      backgroundColor: pixelColor,
                      top: this.legFrame === 0 ? -4 : 6,
                    },
                  ]}
                />
              </View>
            );
          }

          return (
            <View
              key={ob.id}
              style={{ position: 'absolute', left: ob.x, top: ob.y, width: ob.w, height: ob.h }}
            >
              {/* Main cactus trunk */}
              <View
                style={{
                  position: 'absolute',
                  left: ob.w / 2 - 2.5,
                  top: 0,
                  width: 5,
                  height: ob.h,
                  backgroundColor: pixelColor,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
              {/* Left arm */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: ob.h * 0.3,
                  width: ob.w / 2 - 2,
                  height: 3,
                  backgroundColor: pixelColor,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: ob.h * 0.15,
                  width: 3,
                  height: ob.h * 0.25,
                  backgroundColor: pixelColor,
                }}
              />
              {/* Right arm */}
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: ob.h * 0.4,
                  width: ob.w / 2 - 2,
                  height: 3,
                  backgroundColor: pixelColor,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: ob.h * 0.22,
                  width: 3,
                  height: ob.h * 0.28,
                  backgroundColor: pixelColor,
                }}
              />
            </View>
          );
        })}

        {/* T-Rex Character */}
        <View
          style={{
            position: 'absolute',
            left: this.dinoX,
            top: this.dinoY - (ducking ? 15 : 26),
            width: ducking ? 24 : 18,
            height: ducking ? 15 : 26,
          }}
        >
          {ducking ? (
            <>
              {/* Ducking Dino */}
              <View style={{ position: 'absolute', left: 0, top: 4, width: 16, height: 7, backgroundColor: pixelColor, borderRadius: 2 }} />
              <View style={{ position: 'absolute', left: 13, top: 1, width: 11, height: 7, backgroundColor: pixelColor, borderRadius: 2 }}>
                <View style={{ position: 'absolute', right: 3, top: 2, width: 2, height: 2, backgroundColor: bgColor }} />
              </View>
              <View style={{ position: 'absolute', left: 5, top: 11, width: 3, height: this.legFrame === 0 ? 4 : 2, backgroundColor: pixelColor }} />
              <View style={{ position: 'absolute', left: 11, top: 11, width: 3, height: this.legFrame === 1 ? 4 : 2, backgroundColor: pixelColor }} />
            </>
          ) : (
            <>
              {/* Standing / Jumping Dino */}
              <View style={{ position: 'absolute', left: 7, top: 0, width: 11, height: 9, backgroundColor: pixelColor, borderRadius: 2 }}>
                <View style={{ position: 'absolute', right: 3, top: 2, width: 2, height: 2, backgroundColor: bgColor }} />
              </View>
              <View style={{ position: 'absolute', left: 3, top: 8, width: 11, height: 11, backgroundColor: pixelColor, borderRadius: 2 }} />
              {/* Tail */}
              <View style={{ position: 'absolute', left: 0, top: 11, width: 4, height: 5, backgroundColor: pixelColor }} />
              {/* Tiny arm */}
              <View style={{ position: 'absolute', left: 14, top: 12, width: 3, height: 2, backgroundColor: pixelColor }} />
              {/* Legs */}
              <View
                style={{
                  position: 'absolute',
                  left: 5,
                  top: 19,
                  width: 3,
                  height: !this.isGrounded ? 6 : this.legFrame === 0 ? 7 : 4,
                  backgroundColor: pixelColor,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 10,
                  top: 19,
                  width: 3,
                  height: !this.isGrounded ? 6 : this.legFrame === 1 ? 7 : 4,
                  backgroundColor: pixelColor,
                }}
              />
            </>
          )}
        </View>

        {/* Menu Overlay */}
        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>DINO RUNNER DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>ENDLESS DESERT SPRINT</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO RUN</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  groundLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  birdWrap: {
    position: 'absolute',
    width: 22,
    height: 12,
  },
  birdBeak: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 6,
    height: 3,
  },
  birdBody: {
    position: 'absolute',
    left: 5,
    top: 3,
    width: 15,
    height: 5,
    borderRadius: 2,
  },
  birdWing: {
    position: 'absolute',
    left: 8,
    width: 8,
    height: 5,
    borderRadius: 1,
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
