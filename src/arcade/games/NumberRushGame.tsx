import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

interface NumNode {
  val: number;
  x: number;
  y: number;
  collected: boolean;
}

export class NumberRushGame implements ArcadeGameInstance {
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private gameOver = false;

  private px = 160;
  private py = 130;
  private nodes: NumNode[] = [];
  private target = 1;
  private timer = 22;
  private wrongCooldown = 0;

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
    this.setupStage();
  }

  private setupStage() {
    this.px = 160;
    this.py = 130;
    this.target = 1;
    this.timer = Math.max(11, 24 - (this.level - 1) * 1.5);
    this.wrongCooldown = 0;
    this.nodes = [];

    for (let v = 1; v <= 9; v++) {
      let x = 30;
      let y = 50;
      for (let tries = 0; tries < 100; tries++) {
        x = 26 + Math.random() * 268;
        y = 44 + Math.random() * 176;
        const tooClosePlayer = Math.hypot(x - this.px, y - this.py) < 34;
        const tooCloseNode = this.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 36);
        if (!tooClosePlayer && !tooCloseNode) break;
      }
      this.nodes.push({ val: v, x, y, collected: false });
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    if (this.gameOver) return null;

    let sound: ArcadeSound | null = null;
    if (this.wrongCooldown > 0) this.wrongCooldown -= dt;

    this.timer -= dt;
    if (this.timer <= 0) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
        return 'gameover';
      }
      this.setupStage();
      return 'die';
    }

    const spd = input.a ? 195 : 135;
    if (input.left) this.px = Math.max(14, this.px - spd * dt);
    if (input.right) this.px = Math.min(306, this.px + spd * dt);
    if (input.up) this.py = Math.max(34, this.py - spd * dt);
    if (input.down) this.py = Math.min(226, this.py + spd * dt);

    for (const n of this.nodes) {
      if (n.collected) continue;
      if (Math.hypot(n.x - this.px, n.y - this.py) < 17) {
        if (n.val === this.target) {
          n.collected = true;
          this.target++;
          this.score += 30 * this.level;
          if (this.score > this.highScore) this.highScore = this.score;
          sound = 'score';

          if (this.target > 9) {
            this.score += Math.floor(this.timer * 20);
            if (this.score > this.highScore) this.highScore = this.score;
            this.level++;
            this.setupStage();
            return 'levelclear';
          }
        } else if (this.wrongCooldown <= 0) {
          this.timer = Math.max(0.5, this.timer - 1.5);
          this.wrongCooldown = 0.6;
          sound = 'hit';
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
      message: this.gameOver ? 'TIME UP!' : undefined,
      subMessage: this.gameOver ? `SCORE: ${this.score}` : undefined,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: fg }]}>
          <Text style={[styles.hdrText, { color: fg }]}>NEXT:[{this.target}]</Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            T:{this.timer.toFixed(1)}S
          </Text>
          <Text style={[styles.hdrText, { color: fg }]}>
            HP:{this.lives} SC:{this.score}
          </Text>
        </View>

        {this.nodes.map((n) => {
          if (n.collected) return null;
          const isNext = n.val === this.target;
          return (
            <View
              key={n.val}
              style={[
                styles.node,
                {
                  left: n.x - 12,
                  top: n.y - 12,
                  borderColor: fg,
                  backgroundColor: isNext ? fg : bg,
                },
              ]}
            >
              <Text style={[styles.nodeTxt, { color: isNext ? bg : fg }]}>
                {n.val}
              </Text>
            </View>
          );
        })}

        {/* Player */}
        <View
          style={[
            styles.player,
            {
              left: this.px - 8,
              top: this.py - 8,
              borderColor: fg,
              backgroundColor: this.wrongCooldown > 0 ? bg : fg,
            },
          ]}
        >
          <View
            style={[
              styles.playerCore,
              { backgroundColor: this.wrongCooldown > 0 ? fg : bg },
            ]}
          />
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
    paddingHorizontal: 8,
  },
  hdrText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  node: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeTxt: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  player: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCore: {
    width: 6,
    height: 6,
  },
});
