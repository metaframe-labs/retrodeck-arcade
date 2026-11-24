import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

type PrizeKind = 'diamond' | 'gold' | 'star' | 'stone' | 'junk';

interface Prize {
  id: number;
  kind: PrizeKind;
  x: number;
  y: number;
  r: number;
  val: number;
  caught: boolean;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface FloatingPopup {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  negative: boolean;
}

const VIRTUAL_W = 320;
const VIRTUAL_H = 240;
const RAIL_Y = 34;
const CLAW_HOME_Y = 46;
const PIT_SURFACE_Y = 136;
const PIT_FLOOR_Y = 222;

const pctX = (x: number) => `${(x / VIRTUAL_W) * 100}%` as const;
const pctY = (y: number) => `${(y / VIRTUAL_H) * 100}%` as const;
const pctW = (w: number) => `${(w / VIRTUAL_W) * 100}%` as const;
const pctH = (h: number) => `${(h / VIRTUAL_H) * 100}%` as const;

export class CraneClawGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private level = 1;
  private tokens = 7;
  private maxTokens = 7;
  private roundScore = 0;
  private targetScore = 270;
  private gameOver = false;

  private craneX = 160;
  private clawY = CLAW_HOME_Y;
  private state: 'aim' | 'down' | 'up' = 'aim';
  private grabbed: Prize | null = null;
  private prizes: Prize[] = [];
  private sparks: Spark[] = [];
  private popups: FloatingPopup[] = [];
  private animTime = 0;
  private clawSway = 0;
  private craneVel = 0;
  private nextId = 1;
  private prevA = false;
  private status = 'AIM & PRESS [A]';

  public init() {
    this.reset();
  }

  public setHighScore(hs: number) {
    if (hs > this.highScore) this.highScore = hs;
  }

  public reset() {
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.sparks = [];
    this.popups = [];
    this.setupPit();
  }

  private emitSparks(x: number, y: number, count = 8, speed = 55) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = speed * (0.65 + Math.random() * 0.6);
      this.sparks.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 12,
        life: 0.42,
        maxLife: 0.42,
        size: i % 2 === 0 ? 3.5 : 2.5,
      });
    }
  }

  private addPopup(x: number, y: number, text: string, negative = false) {
    this.popups.push({
      id: this.nextId++,
      x: Math.max(44, Math.min(VIRTUAL_W - 44, x)),
      y,
      text,
      life: 0.95,
      negative,
    });
  }

  private spawnWave(isRefill = false) {
    this.prizes = [];
    const mult = 1 + (this.level - 1) * 0.25;
    const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

    const diamondVal = round10(220 * mult);
    const goldVal = round10(150 * mult);
    const starVal = round10(100 * mult);
    const stoneVal = round10(60 * mult);
    const junkVal = -round10(40 * mult);

    const specs: { kind: PrizeKind; val: number; r: number; minY: number; maxY: number }[] =
      this.level === 1
        ? [
            { kind: 'gold', val: goldVal, r: 11, minY: 176, maxY: 208 },
            { kind: 'gold', val: goldVal, r: 11, minY: 176, maxY: 208 },
            { kind: 'star', val: starVal, r: 12, minY: 160, maxY: 200 },
            { kind: 'star', val: starVal, r: 12, minY: 160, maxY: 200 },
            { kind: 'stone', val: stoneVal, r: 14, minY: 148, maxY: 192 },
            { kind: 'stone', val: stoneVal, r: 14, minY: 148, maxY: 192 },
            { kind: 'stone', val: stoneVal, r: 14, minY: 148, maxY: 192 },
            { kind: 'junk', val: junkVal, r: 11, minY: 150, maxY: 190 },
          ]
        : [
            { kind: 'diamond', val: diamondVal, r: 9.5, minY: 186, maxY: 210 },
            { kind: 'gold', val: goldVal, r: 11, minY: 174, maxY: 208 },
            { kind: 'gold', val: goldVal, r: 11, minY: 174, maxY: 208 },
            { kind: 'star', val: starVal, r: 12, minY: 156, maxY: 198 },
            { kind: 'star', val: starVal, r: 12, minY: 156, maxY: 198 },
            { kind: 'stone', val: stoneVal, r: 14, minY: 146, maxY: 190 },
            { kind: 'stone', val: stoneVal, r: 14, minY: 146, maxY: 190 },
            ...(this.level >= 5
              ? [{ kind: 'gold' as const, val: goldVal, r: 11, minY: 170, maxY: 206 }]
              : []),
            { kind: 'junk', val: junkVal, r: 11, minY: 148, maxY: 186 },
            ...(this.level >= 4
              ? [{ kind: 'junk' as const, val: junkVal, r: 11, minY: 148, maxY: 186 }]
              : []),
          ];

    specs.forEach((s) => {
      let x = 60;
      let y = 185;
      for (let t = 0; t < 95; t++) {
        x = 36 + Math.random() * (VIRTUAL_W - 72);
        y = s.minY + Math.random() * (s.maxY - s.minY);
        const overlaps = this.prizes.some((p) => Math.hypot(p.x - x, p.y - y) <= p.r + s.r + 7);
        const blocksHighGem =
          s.val < 0 &&
          this.prizes.some((p) => p.val >= goldVal && Math.abs(p.x - x) < p.r + s.r + 3 && y < p.y);
        if (!overlaps && !blocksHighGem) break;
      }
      this.prizes.push({
        id: this.nextId++,
        kind: s.kind,
        x,
        y,
        r: s.r,
        val: s.val,
        caught: false,
      });
    });

    if (!isRefill) {
      const positiveVals = this.prizes
        .filter((p) => p.val > 0)
        .map((p) => p.val)
        .sort((a, b) => b - a);
      const maxGrabs = Math.min(this.tokens, positiveVals.length);
      const bestPossible = positiveVals.slice(0, maxGrabs).reduce((sum, v) => sum + v, 0);
      const difficultyRatio = Math.min(0.75, 0.4 + (this.level - 1) * 0.065);
      this.targetScore = Math.max(100, round10(bestPossible * difficultyRatio));
    }
  }

  private setupPit() {
    this.tokens = this.level >= 5 ? 8 : 7;
    this.maxTokens = this.tokens;
    this.roundScore = 0;
    this.craneX = 160;
    this.clawY = CLAW_HOME_Y;
    this.state = 'aim';
    this.grabbed = null;
    this.prevA = false;
    this.clawSway = 0;
    this.craneVel = 0;
    this.spawnWave(false);
    this.status = `QUOTA: ${this.targetScore} PTS`;
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    this.animTime += dt;

    // Update particles & floating score popups
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 90 * dt;
      sp.life -= dt;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 24 * dt;
      pop.life -= dt;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }

    let sound: ArcadeSound | null = null;
    const drop = input.a && !this.prevA;
    this.prevA = input.a;

    if (this.state === 'aim') {
      const spd = 138;
      let moveDir = 0;
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;

      this.craneX = Math.max(32, Math.min(VIRTUAL_W - 32, this.craneX + moveDir * spd * dt));
      this.craneVel = moveDir * spd;
      const targetSway = -moveDir * 10;
      this.clawSway += (targetSway - this.clawSway) * Math.min(1, dt * 10);

      if (drop && this.tokens > 0) {
        this.tokens--;
        this.state = 'down';
        this.grabbed = null;
        this.clawSway = 0;
        sound = 'shoot';
      }
    } else if (this.state === 'down') {
      this.clawSway *= Math.max(0, 1 - dt * 12);
      this.clawY += Math.min(260, 138 + this.level * 10) * dt;
      for (const p of this.prizes) {
        if (!p.caught && Math.hypot(p.x - this.craneX, p.y - (this.clawY + 10)) <= p.r + 7) {
          p.caught = true;
          this.grabbed = p;
          this.state = 'up';
          this.emitSparks(p.x, p.y, p.kind === 'diamond' ? 12 : 7, 52);
          sound = 'hit';
          break;
        }
      }
      if (this.clawY >= PIT_FLOOR_Y - 12) {
        this.state = 'up';
        this.emitSparks(this.craneX, PIT_FLOOR_Y - 4, 5, 34);
        sound = 'hit';
      }
    } else if (this.state === 'up') {
      const reelSpd =
        this.grabbed?.kind === 'diamond'
          ? 148
          : this.grabbed?.kind === 'stone'
          ? 106
          : this.grabbed
          ? 126
          : 155;
      this.clawY -= reelSpd * dt;
      if (this.grabbed) {
        const swayOffset = Math.sin(this.animTime * 9) * 1.8;
        this.grabbed.x = this.craneX + swayOffset;
        this.grabbed.y = this.clawY + 14;
      }
      if (this.clawY <= CLAW_HOME_Y) {
        this.clawY = CLAW_HOME_Y;
        this.state = 'aim';
        if (this.grabbed) {
          const val = this.grabbed.val;
          const kind = this.grabbed.kind;
          this.prizes = this.prizes.filter((p) => p.id !== this.grabbed!.id);
          this.grabbed = null;
          this.roundScore = Math.max(0, this.roundScore + val);
          this.score = Math.max(0, this.score + val);
          if (this.score > this.highScore) this.highScore = this.score;

          if (val >= 0) {
            this.status =
              kind === 'diamond'
                ? `ROYAL GEM +${val}!`
                : kind === 'gold'
                ? `GOLD BULLION +${val}!`
                : `CAUGHT +${val}!`;
            this.addPopup(this.craneX, CLAW_HOME_Y + 8, `+${val}`, false);
            this.emitSparks(this.craneX, CLAW_HOME_Y + 6, 10, 65);
          } else {
            this.status = `BOMB JUNK ${val}!`;
            this.addPopup(this.craneX, CLAW_HOME_Y + 8, `${val}`, true);
          }
          sound = val >= 150 ? 'powerup' : val > 0 ? 'score' : 'die';
        } else {
          this.status = 'EMPTY CLAW!';
          this.addPopup(this.craneX, CLAW_HOME_Y + 8, 'MISS', true);
        }

        if (this.roundScore >= this.targetScore) {
          const bonus = this.tokens * 50;
          this.score += bonus;
          if (this.score > this.highScore) this.highScore = this.score;
          this.level++;
          this.setupPit();
          this.addPopup(160, 88, bonus > 0 ? `CLEAR +${bonus}!` : 'STAGE CLEAR!', false);
          return 'levelclear';
        } else if (this.tokens <= 0) {
          this.gameOver = true;
          return 'gameover';
        } else if (!this.prizes.some((p) => p.val > 0)) {
          this.spawnWave(true);
          this.status = 'BONUS VEIN REFILLED!';
        }
      }
    }

    return sound;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.tokens,
      level: this.level,
      gameOver: this.gameOver,
      message: this.gameOver ? 'OUT OF TOKENS' : undefined,
      subMessage: this.gameOver ? `FINAL SCORE: ${this.score}` : undefined,
    };
  }

  private renderPrizeSprite(p: Prize, fg: string, bg: string, shimmer: boolean) {
    const d = p.r * 2;
    const baseBox = {
      left: pctX(p.x - p.r),
      top: pctY(p.y - p.r),
      width: pctW(d),
      height: pctH(d),
    };

    if (p.kind === 'diamond') {
      return (
        <View key={p.id} style={[styles.prizeAnchor, baseBox]}>
          <View
            style={[
              styles.diamondOuter,
              {
                borderColor: fg,
                backgroundColor: shimmer ? fg : bg,
              },
            ]}
          >
            <View
              style={[
                styles.diamondInner,
                {
                  borderColor: shimmer ? bg : fg,
                },
              ]}
            />
          </View>
          {/* Sparkle cross above diamond */}
          {shimmer && (
            <View style={[styles.sparkleDot, { backgroundColor: fg, top: -3, right: -2 }]} />
          )}
          <View style={[styles.valTag, { backgroundColor: fg }]}>
            <Text style={[styles.valTagTxt, { color: bg }]}>{p.val}</Text>
          </View>
        </View>
      );
    }

    if (p.kind === 'gold') {
      return (
        <View key={p.id} style={[styles.prizeAnchor, baseBox]}>
          <View style={[styles.goldOuter, { borderColor: fg, backgroundColor: bg }]}>
            <View style={[styles.goldInnerRim, { borderColor: fg }]}>
              <Text style={[styles.goldSym, { color: fg }]}>$</Text>
            </View>
            <View style={[styles.shinePixel, { backgroundColor: fg }]} />
          </View>
          <View style={[styles.valTag, { backgroundColor: fg }]}>
            <Text style={[styles.valTagTxt, { color: bg }]}>{p.val}</Text>
          </View>
        </View>
      );
    }

    if (p.kind === 'star') {
      return (
        <View key={p.id} style={[styles.prizeAnchor, baseBox]}>
          <View style={[styles.starCapsule, { borderColor: fg, backgroundColor: bg }]}>
            <View style={[styles.starCoreRing, { borderColor: fg }]}>
              <Text style={[styles.starGlyph, { color: fg }]}>★</Text>
            </View>
          </View>
          <View style={[styles.valTag, { borderColor: fg, borderWidth: 1, backgroundColor: bg }]}>
            <Text style={[styles.valTagTxt, { color: fg }]}>{p.val}</Text>
          </View>
        </View>
      );
    }

    if (p.kind === 'stone') {
      return (
        <View key={p.id} style={[styles.prizeAnchor, baseBox]}>
          <View style={[styles.oreBoulder, { borderColor: fg, backgroundColor: bg }]}>
            {/* Chiseled rock facets */}
            <View style={[styles.oreCrack1, { backgroundColor: fg }]} />
            <View style={[styles.oreCrack2, { backgroundColor: fg }]} />
            <Text style={[styles.oreLabel, { color: fg }]}>{p.val}</Text>
          </View>
        </View>
      );
    }

    // Junk / Bomb hazard ('junk')
    return (
      <View key={p.id} style={[styles.prizeAnchor, baseBox]}>
        {/* Bomb fuse */}
        <View style={[styles.bombFuse, { backgroundColor: fg }]} />
        {shimmer && <View style={[styles.fuseSpark, { backgroundColor: fg }]} />}
        <View style={[styles.junkBomb, { borderColor: fg, backgroundColor: fg }]}>
          <View style={[styles.junkInnerRing, { borderColor: bg }]}>
            <Text style={[styles.junkGlyph, { color: bg }]}>✕</Text>
          </View>
        </View>
        <View style={[styles.valTag, { borderColor: fg, borderWidth: 1, backgroundColor: bg }]}>
          <Text style={[styles.valTagTxt, { color: fg }]}>{p.val}</Text>
        </View>
      </View>
    );
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;
    const progressPct = Math.min(100, Math.round((this.roundScore / Math.max(1, this.targetScore)) * 100));
    const shimmer = Math.floor(this.animTime * 5) % 2 === 0;

    // Articulated jaw angles based on crane state
    const jawsOpen = this.state === 'aim' || (this.state === 'down' && !this.grabbed);
    const jawsClamped = Boolean(this.grabbed);
    const leftJawDeg = jawsOpen ? '24deg' : jawsClamped ? '-16deg' : '-5deg';
    const rightJawDeg = jawsOpen ? '-24deg' : jawsClamped ? '16deg' : '5deg';

    // Aiming sightline dots while aiming
    const sightDots =
      this.state === 'aim'
        ? [72, 92, 112, 132, 152, 172]
        : [];

    const cableHeight = Math.max(4, this.clawY - RAIL_Y);

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Top Arcade Quota HUD */}
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <View style={[styles.lvBadge, { backgroundColor: fg }]}>
            <Text style={[styles.lvBadgeTxt, { color: bg }]}>LV.{this.level}</Text>
          </View>

          {/* Progress Quota Gauge */}
          <View style={styles.quotaWrap}>
            <View style={[styles.quotaTrack, { borderColor: fg }]}>
              <View
                style={[
                  styles.quotaFill,
                  {
                    width: `${progressPct}%`,
                    backgroundColor: fg,
                  },
                ]}
              />
            </View>
            <Text style={[styles.hdrText, { color: fg }]}>
              {this.roundScore}/{this.targetScore}
            </Text>
          </View>

          {/* Coin Token Pips */}
          <View style={styles.tokenRow}>
            {Array.from({ length: this.maxTokens }).map((_, idx) => {
              const active = idx < this.tokens;
              return (
                <View
                  key={idx}
                  style={[
                    styles.tokenPip,
                    {
                      borderColor: fg,
                      backgroundColor: active ? fg : 'transparent',
                      opacity: active ? 1 : 0.35,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Cabinet Side Gantry Pillars */}
        <View style={[styles.sidePillarLeft, { borderColor: fg }]} />
        <View style={[styles.sidePillarRight, { borderColor: fg }]} />

        {/* Underground Mineral Cavern Horizon Line */}
        <View style={[styles.strataLine, { top: pctY(PIT_SURFACE_Y), borderColor: fg }]} />

        {/* Double-Beam Overhead Gantry Track */}
        <View style={[styles.gantryBeam, { top: pctY(RAIL_Y - 4), borderColor: fg }]}>
          {[28, 68, 108, 148, 188, 228, 268].map((rx) => (
            <View
              key={rx}
              style={[styles.gantryRivet, { left: pctX(rx), backgroundColor: fg }]}
            />
          ))}
        </View>

        {/* Motorized Crane Trolley Carriage */}
        <View
          style={[
            styles.trolleyBox,
            {
              left: pctX(this.craneX - 13),
              top: pctY(RAIL_Y - 7),
              width: pctW(26),
              height: pctH(10),
              borderColor: fg,
              backgroundColor: bg,
            },
          ]}
        >
          <View
            style={[
              styles.trolleyLed,
              { backgroundColor: this.state === 'aim' && shimmer ? bg : fg, borderColor: fg },
            ]}
          />
        </View>

        {/* Dotted Vertical Aiming Sightline */}
        {sightDots.map((dy) => (
          <View
            key={dy}
            style={[
              styles.sightDot,
              {
                left: pctX(this.craneX - 1),
                top: pctY(dy),
                backgroundColor: fg,
              },
            ]}
          />
        ))}

        {/* Winch Steel Cable */}
        <View
          style={[
            styles.cable,
            {
              left: pctX(this.craneX - 1),
              top: pctY(RAIL_Y + 2),
              height: pctH(cableHeight),
              backgroundColor: fg,
            },
          ]}
        />

        {/* Articulated Mechanical 2-Jaw Claw Assembly */}
        <View
          style={[
            styles.clawRig,
            {
              left: pctX(this.craneX - 14),
              top: pctY(this.clawY - 2),
              width: pctW(28),
              height: pctH(20),
              transform: [{ rotate: `${this.clawSway.toFixed(1)}deg` }],
            },
          ]}
        >
          {/* Hydraulic Wrist Hub */}
          <View style={[styles.clawHub, { borderColor: fg, backgroundColor: fg }]}>
            <View style={[styles.clawBolt, { backgroundColor: bg }]} />
          </View>

          {/* Left Articulated Pincer */}
          <View
            style={[
              styles.pincerArmLeft,
              {
                borderColor: fg,
                transform: [{ rotate: leftJawDeg }],
              },
            ]}
          />

          {/* Right Articulated Pincer */}
          <View
            style={[
              styles.pincerArmRight,
              {
                borderColor: fg,
                transform: [{ rotate: rightJawDeg }],
              },
            ]}
          />
        </View>

        {/* Pit Treasures, Stones & Hazards */}
        {this.prizes.map((p) => this.renderPrizeSprite(p, fg, bg, shimmer))}

        {/* Pixel Spark Burst Particles */}
        {this.sparks.map((sp) => (
          <View
            key={sp.id}
            style={{
              position: 'absolute',
              left: pctX(sp.x),
              top: pctY(sp.y),
              width: sp.size,
              height: sp.size,
              backgroundColor: fg,
              opacity: Math.max(0.2, sp.life / sp.maxLife),
            }}
          />
        ))}

        {/* Floating Score Popups */}
        {this.popups.map((pop) => (
          <View
            key={pop.id}
            style={[
              styles.popupBadge,
              {
                left: pctX(pop.x - 28),
                top: pctY(pop.y),
                width: pctW(56),
                backgroundColor: pop.negative ? bg : fg,
                borderColor: fg,
                opacity: Math.min(1, pop.life * 1.4),
              },
            ]}
          >
            <Text style={[styles.popupTxt, { color: pop.negative ? fg : bg }]} numberOfLines={1}>
              {pop.text}
            </Text>
          </View>
        ))}

        {/* Reinforced Pit Bedrock Floor & Status Ticker */}
        <View style={[styles.pitFloor, { top: pctY(PIT_FLOOR_Y), borderColor: fg, backgroundColor: fg }]} />
        <Text style={[styles.statusTxt, { color: fg }]} numberOfLines={1}>
          {this.status}
        </Text>
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
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '10.5%',
    borderBottomWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 7,
    gap: 6,
  },
  lvBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  lvBadgeTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  quotaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quotaTrack: {
    flex: 1,
    height: 8,
    borderWidth: 1.5,
    padding: 1,
    justifyContent: 'center',
  },
  quotaFill: {
    height: '100%',
  },
  hdrText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  tokenPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.2,
  },
  sidePillarLeft: {
    position: 'absolute',
    top: '10.5%',
    bottom: '7.5%',
    left: '2.5%',
    width: 4,
    borderRightWidth: 1.5,
    opacity: 0.35,
  },
  sidePillarRight: {
    position: 'absolute',
    top: '10.5%',
    bottom: '7.5%',
    right: '2.5%',
    width: 4,
    borderLeftWidth: 1.5,
    opacity: 0.35,
  },
  strataLine: {
    position: 'absolute',
    left: '3.5%',
    right: '3.5%',
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.25,
  },
  gantryBeam: {
    position: 'absolute',
    left: '3%',
    right: '3%',
    height: 6,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    justifyContent: 'center',
  },
  gantryRivet: {
    position: 'absolute',
    width: 2,
    height: 2,
  },
  trolleyBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trolleyLed: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  sightDot: {
    position: 'absolute',
    width: 2,
    height: 3,
    opacity: 0.22,
  },
  cable: {
    position: 'absolute',
    width: 2.2,
  },
  clawRig: {
    position: 'absolute',
    alignItems: 'center',
  },
  clawHub: {
    width: 12,
    height: 7,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  clawBolt: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  pincerArmLeft: {
    position: 'absolute',
    top: 5,
    left: 3,
    width: 9,
    height: 13,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderBottomLeftRadius: 5,
  },
  pincerArmRight: {
    position: 'absolute',
    top: 5,
    right: 3,
    width: 9,
    height: 13,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderBottomRightRadius: 5,
  },
  prizeAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondOuter: {
    width: '78%',
    height: '78%',
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondInner: {
    width: '52%',
    height: '52%',
    borderWidth: 1.2,
  },
  sparkleDot: {
    position: 'absolute',
    width: 3,
    height: 3,
  },
  goldOuter: {
    width: '94%',
    height: '88%',
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldInnerRim: {
    width: '76%',
    height: '72%',
    borderWidth: 1,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldSym: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 11,
  },
  shinePixel: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 2.5,
    height: 2.5,
  },
  starCapsule: {
    width: '94%',
    height: '94%',
    borderRadius: 99,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starCoreRing: {
    width: '74%',
    height: '74%',
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlyph: {
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 11,
  },
  oreBoulder: {
    width: '96%',
    height: '88%',
    borderWidth: 2.2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  oreCrack1: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 6,
    height: 1.5,
    transform: [{ rotate: '28deg' }],
    opacity: 0.65,
  },
  oreCrack2: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    width: 5,
    height: 1.5,
    transform: [{ rotate: '-22deg' }],
    opacity: 0.65,
  },
  oreLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  bombFuse: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 5,
  },
  fuseSpark: {
    position: 'absolute',
    top: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  junkBomb: {
    width: '92%',
    height: '92%',
    borderRadius: 99,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  junkInnerRing: {
    width: '72%',
    height: '72%',
    borderRadius: 99,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  junkGlyph: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 10.5,
  },
  valTag: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
  },
  valTagTxt: {
    fontSize: 6.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 7.5,
  },
  popupBadge: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  pitFloor: {
    position: 'absolute',
    left: '2.5%',
    right: '2.5%',
    height: 3,
  },
  statusTxt: {
    position: 'absolute',
    bottom: '1%',
    left: 8,
    right: 8,
    textAlign: 'center',
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
