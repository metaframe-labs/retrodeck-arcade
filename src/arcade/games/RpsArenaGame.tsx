import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArcadeGameInstance, ArcadeInput, ArcadeSound, ArcadeStats } from '../types';
import { RetroPalette } from '../../theme/palettes';

const MOVES = [
  { name: 'ROCK', icon: '●' },
  { name: 'PAPER', icon: '■' },
  { name: 'SCISSORS', icon: '✂' },
];

export class RpsArenaGame implements ArcadeGameInstance {
  private selectedIdx = 0;
  private playerChoice: number | null = null;
  private cpuChoice: number | null = null;
  private banner = 'PICK YOUR WEAPON!';

  private streak = 0;
  private wins = 0;
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private gameOver = false;
  private isMenu = true;

  private lastLeft = false;
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
    this.selectedIdx = 0;
    this.playerChoice = null;
    this.cpuChoice = null;
    this.banner = 'CHOOSE ROCK / PAPER / SCISSORS';
    this.streak = 0;
    this.wins = 0;
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.isMenu = true;
  }

  public update(input: ArcadeInput, _dt: number): ArcadeSound | null {
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

    if (input.left && !this.lastLeft) {
      this.selectedIdx = (this.selectedIdx + 2) % 3;
      sound = 'hit';
    }
    if (input.right && !this.lastRight) {
      this.selectedIdx = (this.selectedIdx + 1) % 3;
      sound = 'hit';
    }

    if (input.a && !this.lastA) {
      this.playerChoice = this.selectedIdx;
      this.cpuChoice = Math.floor(Math.random() * 3);

      if (this.playerChoice === this.cpuChoice) {
        this.banner = 'DRAW! GO AGAIN';
        sound = 'hit';
      } else if (
        (this.playerChoice === 0 && this.cpuChoice === 2) ||
        (this.playerChoice === 1 && this.cpuChoice === 0) ||
        (this.playerChoice === 2 && this.cpuChoice === 1)
      ) {
        this.wins++;
        this.streak++;
        this.score += 100 + this.streak * 25;
        if (this.score > this.highScore) this.highScore = this.score;
        this.banner = this.streak >= 2 ? `YOU WIN! STREAK x${this.streak}` : 'YOU WIN!';
        sound = 'score';
      } else {
        this.streak = 0;
        this.lives--;
        this.banner = 'CPU WINS ROUND!';
        if (this.lives <= 0) {
          this.gameOver = true;
          sound = 'gameover';
        } else {
          sound = 'die';
        }
      }
    }

    this.updateInput(input);
    return sound;
  }

  private updateInput(input: ArcadeInput): void {
    this.lastLeft = input.left;
    this.lastRight = input.right;
    this.lastA = input.a;
  }

  public getStats(): ArcadeStats {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.wins + 1,
      gameOver: this.gameOver,
      isMenu: this.isMenu,
      message: this.gameOver ? 'KNOCKED OUT!' : undefined,
      subMessage: this.gameOver
        ? 'PRESS [A] FOR REMATCH'
        : `WINS: ${this.wins} • ◀/▶: SELECT • [A]: THROW`,
    };
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const isLight = !!palette.isLightLcd;
    const pixelColor = palette.pixelOn;
    const bg = isLight ? palette.screenBg : '#000';

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Battle Stage */}
        <View style={styles.stageRow}>
          <View style={[styles.fighterBox, { borderColor: pixelColor }]}>
            <Text style={[styles.fighterLbl, { color: pixelColor }]}>YOU</Text>
            <Text style={[styles.bigIcon, { color: pixelColor }]}>
              {this.playerChoice !== null ? MOVES[this.playerChoice].icon : '?'}
            </Text>
          </View>

          <Text style={[styles.vsTxt, { color: pixelColor }]}>VS</Text>

          <View style={[styles.fighterBox, { borderColor: pixelColor }]}>
            <Text style={[styles.fighterLbl, { color: pixelColor }]}>CPU</Text>
            <Text style={[styles.bigIcon, { color: pixelColor }]}>
              {this.cpuChoice !== null ? MOVES[this.cpuChoice].icon : '?'}
            </Text>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.bannerWrap}>
          <View style={[styles.bannerBox, { backgroundColor: pixelColor }]}>
            <Text style={[styles.bannerTxt, { color: bg }]}>{this.banner}</Text>
          </View>
        </View>

        {/* 3 Weapon Choices */}
        <View style={styles.choicesRow}>
          {MOVES.map((m, idx) => {
            const sel = idx === this.selectedIdx;
            return (
              <View
                key={m.name}
                style={[
                  styles.choiceCard,
                  {
                    borderColor: pixelColor,
                    backgroundColor: sel ? pixelColor : 'transparent',
                  },
                ]}
              >
                <Text style={{ fontSize: 18, color: sel ? bg : pixelColor }}>{m.icon}</Text>
                <Text style={{ fontSize: 8, fontWeight: '900', color: sel ? bg : pixelColor, marginTop: 2 }}>
                  {m.name}
                </Text>
              </View>
            );
          })}
        </View>

        {this.isMenu && (
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { backgroundColor: isLight ? palette.screenBg : '#111', borderColor: pixelColor }]}>
              <Text style={[styles.menuTitle, { color: pixelColor }]}>RPS ARENA DX</Text>
              <Text style={[styles.menuSub, { color: pixelColor }]}>ROCK • PAPER • SCISSORS</Text>
              <Text style={[styles.menuPrompt, { color: pixelColor }]}>PRESS [A] TO BATTLE</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  stageRow: {
    position: 'absolute',
    top: 16,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fighterBox: {
    width: 96,
    height: 78,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fighterLbl: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bigIcon: {
    fontSize: 34,
    fontWeight: '900',
  },
  vsTxt: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  bannerWrap: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  bannerTxt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  choicesRow: {
    position: 'absolute',
    bottom: 18,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    height: 58,
    borderWidth: 2,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
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
