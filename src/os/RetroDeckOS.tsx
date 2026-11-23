import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ArcadeCartridgeDef,
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
} from '../arcade/types';
import { RetroPalette } from '../theme/palettes';

export interface RetroDeckOSCallbacks {
  getCartridges: () => ArcadeCartridgeDef[];
  getHighScores: () => Record<string, number>;
  onLaunchGame: (cart: ArcadeCartridgeDef) => void;
  onOpenCartVault: () => void;
  onCyclePalette: () => void;
  onToggleScanlines: () => void;
  getPaletteName: () => string;
  getScanlines: () => boolean;
}

type OsAppId =
  | 'boot'
  | 'desktop'
  | 'arcade'
  | 'calc'
  | 'clock'
  | 'synth'
  | 'paint'
  | 'notes'
  | 'stats'
  | 'term'
  | 'setup';

interface DesktopIcon {
  id: OsAppId;
  code: string;
  label: string;
}

const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'arcade', code: '[+]', label: 'GAMES' },
  { id: 'calc', code: '1+2', label: 'CALC' },
  { id: 'clock', code: '12:0', label: 'CLOCK' },
  { id: 'synth', code: 'SFX', label: 'SYNTH' },
  { id: 'paint', code: 'PIX', label: 'PAINT' },
  { id: 'notes', code: 'TXT', label: 'NOTES' },
  { id: 'stats', code: 'TOP', label: 'STATS' },
  { id: 'term', code: '$>_', label: 'SHELL' },
  { id: 'setup', code: 'SYS', label: 'SETUP' },
];

const CALC_KEYS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['C', '0', '=', '+'],
];

const SYNTH_SOUNDS: { label: string; sfx: ArcadeSound }[] = [
  { label: 'HIT', sfx: 'hit' },
  { label: 'SCORE', sfx: 'score' },
  { label: 'PWRUP', sfx: 'powerup' },
  { label: 'SHOOT', sfx: 'shoot' },
  { label: 'BOOM', sfx: 'explode' },
  { label: 'DIE', sfx: 'die' },
  { label: 'BOMB', sfx: 'bomb' },
  { label: 'CLEAR', sfx: 'levelclear' },
  { label: 'OVER', sfx: 'gameover' },
];

const TERM_CMDS = [
  'neofetch',
  'uname -a',
  'ls /carts',
  'free -k',
  'randgame',
  'reboot',
];

export class RetroDeckOS implements ArcadeGameInstance {
  private cb: RetroDeckOSCallbacks;
  private app: OsAppId = 'boot';
  private bootTimer = 0;
  private uptime = 0;

  // Input edge / repeat
  private moveCd = 0;
  private prevA = false;
  private prevB = false;

  // Desktop 3x3 cursor
  private deskIdx = 0;

  // In-LCD Arcade Browser
  private gameIdx = 0;

  // Calculator state
  private calcR = 0;
  private calcC = 0;
  private calcDisplay = '0';
  private calcAcc: number | null = null;
  private calcOp: string | null = null;
  private calcFresh = true;

  // Clock / Stopwatch state
  private swRunning = false;
  private swTime = 0;
  private swLap = 0;

  // Synth state
  private synthIdx = 0;

  // Pixel Paint 16x10
  private paintW = 16;
  private paintH = 10;
  private paintGrid: boolean[][] = [];
  private paintR = 4;
  private paintC = 7;

  // Notes state
  private noteIdx = 0;
  private notes: { title: string; done: boolean }[] = [
    { title: 'BEAT 100 GAMES', done: false },
    { title: 'TRY BOSS RUSH 100', done: false },
    { title: 'TEST 8-BIT SYNTH', done: true },
    { title: 'DRAW PIXEL ART', done: false },
    { title: 'CHECK TOP SCORES', done: false },
  ];

  // Terminal state
  private termIdx = 0;
  private termOut: string[] = [
    'RETRODECK OS v1.0 (ARM64)',
    'TYPE: D-PAD + [A] TO RUN',
    'READY. 100 ROMS MOUNTED.',
  ];

  // Setup state
  private setupIdx = 0;

  constructor(cb: RetroDeckOSCallbacks) {
    this.cb = cb;
    this.clearCanvas();
  }

  private clearCanvas() {
    this.paintGrid = Array.from({ length: this.paintH }, () =>
      Array(this.paintW).fill(false)
    );
    // Draw a tiny retro smiley on boot
    this.paintGrid[2][5] = true;
    this.paintGrid[2][10] = true;
    this.paintGrid[6][5] = true;
    this.paintGrid[7][6] = true;
    this.paintGrid[7][7] = true;
    this.paintGrid[7][8] = true;
    this.paintGrid[7][9] = true;
    this.paintGrid[6][10] = true;
  }

  public init() {
    this.reset();
  }

  public reset() {
    this.app = 'boot';
    this.bootTimer = 0;
    this.deskIdx = 0;
    this.prevA = false;
    this.prevB = false;
  }

  public goDesktop() {
    this.app = 'desktop';
    this.prevA = true;
    this.prevB = true;
  }

  public getCurrentTitle(): string {
    if (this.app === 'boot') return 'BIOS BOOT';
    if (this.app === 'desktop') return 'RETRODECK OS';
    return `RD-OS // ${this.app.toUpperCase()}`;
  }

  public getControlsHint(): string {
    switch (this.app) {
      case 'boot':
        return 'Booting RetroDeck OS v1.0... Press [A] to skip';
      case 'desktop':
        return 'D-PAD: Select App • [A]: Open • CARTS: Full Vault';
      case 'arcade':
        return '[▲]/[▼]: Browse 100 Games • [A]: Launch • [B]: Desktop';
      case 'calc':
        return 'D-PAD: Key • [A]: Press • [B]: Back to Desktop';
      case 'clock':
        return '[A]: Start/Stop Stopwatch • [▲]: Reset • [B]: Desktop';
      case 'synth':
        return 'D-PAD: Select Sound • [A]: Play SFX • [B]: Desktop';
      case 'paint':
        return 'D-PAD: Cursor • [A]: Draw/Erase • [B]: Desktop';
      case 'notes':
        return '[▲]/[▼]: Select • [A]: Check/Uncheck • [B]: Desktop';
      case 'stats':
        return 'Viewing Arcade High Scores & Rank • [B]: Desktop';
      case 'term':
        return '[▲]/[▼]: Command • [A]: Execute • [B]: Desktop';
      case 'setup':
        return '[▲]/[▼]: Setting • [A]: Toggle/Run • [B]: Desktop';
      default:
        return 'D-PAD: Navigate • [A]: Select • [B]: Back';
    }
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    this.uptime += dt;
    if (this.swRunning) this.swTime += dt;
    if (this.moveCd > 0) this.moveCd -= dt;

    const pressA = input.a && !this.prevA;
    const pressB = input.b && !this.prevB;
    this.prevA = input.a;
    this.prevB = input.b;

    // Boot sequence
    if (this.app === 'boot') {
      this.bootTimer += dt;
      if (this.bootTimer >= 1.5 || pressA || pressB) {
        this.app = 'desktop';
        return 'powerup';
      }
      return null;
    }

    // Global B = return to desktop from any sub-app
    if (this.app !== 'desktop' && pressB) {
      this.app = 'desktop';
      return 'hit';
    }

    // Directional helper
    let dir: 'up' | 'down' | 'left' | 'right' | null = null;
    if (this.moveCd <= 0) {
      if (input.up) dir = 'up';
      else if (input.down) dir = 'down';
      else if (input.left) dir = 'left';
      else if (input.right) dir = 'right';
      if (dir) this.moveCd = this.app === 'arcade' ? 0.11 : 0.15;
    }

    if (this.app === 'desktop') {
      if (dir === 'left') this.deskIdx = (this.deskIdx + 8) % 9;
      if (dir === 'right') this.deskIdx = (this.deskIdx + 1) % 9;
      if (dir === 'up') this.deskIdx = (this.deskIdx + 6) % 9;
      if (dir === 'down') this.deskIdx = (this.deskIdx + 3) % 9;
      if (dir) return 'hit';

      if (pressA) {
        this.app = DESKTOP_ICONS[this.deskIdx].id;
        return 'score';
      }
      return null;
    }

    if (this.app === 'arcade') {
      const carts = this.cb.getCartridges();
      if (dir === 'up') this.gameIdx = (this.gameIdx + carts.length - 1) % carts.length;
      if (dir === 'down') this.gameIdx = (this.gameIdx + 1) % carts.length;
      if (dir === 'left') this.gameIdx = (this.gameIdx + carts.length - 5) % carts.length;
      if (dir === 'right') this.gameIdx = (this.gameIdx + 5) % carts.length;
      if (dir) return 'hit';

      if (pressA && carts[this.gameIdx]) {
        this.cb.onLaunchGame(carts[this.gameIdx]);
        return 'powerup';
      }
      return null;
    }

    if (this.app === 'calc') {
      if (dir === 'up') this.calcR = (this.calcR + 3) % 4;
      if (dir === 'down') this.calcR = (this.calcR + 1) % 4;
      if (dir === 'left') this.calcC = (this.calcC + 3) % 4;
      if (dir === 'right') this.calcC = (this.calcC + 1) % 4;
      if (dir) return 'hit';
      if (pressA) {
        this.pressCalcKey(CALC_KEYS[this.calcR][this.calcC]);
        return 'score';
      }
      return null;
    }

    if (this.app === 'clock') {
      if (pressA) {
        this.swRunning = !this.swRunning;
        return 'score';
      }
      if (dir === 'up') {
        this.swRunning = false;
        this.swTime = 0;
        this.swLap = 0;
        return 'hit';
      }
      if (dir === 'down') {
        this.swLap = this.swTime;
        return 'hit';
      }
      return null;
    }

    if (this.app === 'synth') {
      if (dir === 'left') this.synthIdx = (this.synthIdx + 8) % 9;
      if (dir === 'right') this.synthIdx = (this.synthIdx + 1) % 9;
      if (dir === 'up') this.synthIdx = (this.synthIdx + 6) % 9;
      if (dir === 'down') this.synthIdx = (this.synthIdx + 3) % 9;
      if (dir) return 'hit';
      if (pressA) {
        return SYNTH_SOUNDS[this.synthIdx].sfx;
      }
      return null;
    }

    if (this.app === 'paint') {
      if (dir === 'up') this.paintR = (this.paintR + this.paintH - 1) % this.paintH;
      if (dir === 'down') this.paintR = (this.paintR + 1) % this.paintH;
      if (dir === 'left') this.paintC = (this.paintC + this.paintW - 1) % this.paintW;
      if (dir === 'right') this.paintC = (this.paintC + 1) % this.paintW;
      if (pressA) {
        this.paintGrid[this.paintR][this.paintC] = !this.paintGrid[this.paintR][this.paintC];
        return 'hit';
      }
      return null;
    }

    if (this.app === 'notes') {
      if (dir === 'up') this.noteIdx = (this.noteIdx + this.notes.length - 1) % this.notes.length;
      if (dir === 'down') this.noteIdx = (this.noteIdx + 1) % this.notes.length;
      if (dir) return 'hit';
      if (pressA) {
        this.notes[this.noteIdx].done = !this.notes[this.noteIdx].done;
        return 'score';
      }
      return null;
    }

    if (this.app === 'term') {
      if (dir === 'up') this.termIdx = (this.termIdx + TERM_CMDS.length - 1) % TERM_CMDS.length;
      if (dir === 'down') this.termIdx = (this.termIdx + 1) % TERM_CMDS.length;
      if (dir) return 'hit';
      if (pressA) {
        return this.execTermCmd(TERM_CMDS[this.termIdx]);
      }
      return null;
    }

    if (this.app === 'setup') {
      if (dir === 'up') this.setupIdx = (this.setupIdx + 3) % 4;
      if (dir === 'down') this.setupIdx = (this.setupIdx + 1) % 4;
      if (dir) return 'hit';
      if (pressA) {
        if (this.setupIdx === 0) this.cb.onCyclePalette();
        else if (this.setupIdx === 1) this.cb.onToggleScanlines();
        else if (this.setupIdx === 2) this.cb.onOpenCartVault();
        else if (this.setupIdx === 3) {
          this.app = 'boot';
          this.bootTimer = 0;
        }
        return 'powerup';
      }
      return null;
    }

    return null;
  }

  private pressCalcKey(k: string) {
    if (k === 'C') {
      this.calcDisplay = '0';
      this.calcAcc = null;
      this.calcOp = null;
      this.calcFresh = true;
      return;
    }
    if ('0123456789'.includes(k)) {
      if (this.calcFresh || this.calcDisplay === '0') {
        this.calcDisplay = k;
        this.calcFresh = false;
      } else if (this.calcDisplay.length < 10) {
        this.calcDisplay += k;
      }
      return;
    }
    const cur = parseFloat(this.calcDisplay) || 0;
    if (k === '=') {
      if (this.calcAcc !== null && this.calcOp) {
        let res = cur;
        if (this.calcOp === '+') res = this.calcAcc + cur;
        else if (this.calcOp === '-') res = this.calcAcc - cur;
        else if (this.calcOp === '*') res = this.calcAcc * cur;
        else if (this.calcOp === '/') res = cur !== 0 ? this.calcAcc / cur : 0;
        this.calcDisplay = String(Number(res.toFixed(4))).slice(0, 10);
        this.calcAcc = null;
        this.calcOp = null;
        this.calcFresh = true;
      }
      return;
    }
    this.calcAcc = cur;
    this.calcOp = k;
    this.calcFresh = true;
  }

  private execTermCmd(cmd: string): ArcadeSound {
    const carts = this.cb.getCartridges();
    if (cmd === 'neofetch') {
      this.termOut = [
        'OS: RetroDeck OS v1.0',
        `ROMS: ${carts.length} CARTRIDGES`,
        `UP: ${Math.floor(this.uptime)}s  PAL: ${this.cb.getPaletteName()}`,
      ];
    } else if (cmd === 'uname -a') {
      this.termOut = ['RetroDeckOS 1.0.0 arm64', 'LCD 320x240 60Hz MONO', 'SYNTH-8BIT ACTIVE'];
    } else if (cmd === 'ls /carts') {
      this.termOut = [
        `TOTAL ${carts.length} CARTS MOUNTED`,
        `01: ${carts[0]?.title}`,
        `02: ${carts[1]?.title}`,
      ];
    } else if (cmd === 'free -k') {
      this.termOut = ['MEM TOTAL: 64 KB', 'MEM USED:  18 KB', 'MEM FREE:  46 KB (OK)'];
    } else if (cmd === 'randgame') {
      const pick = carts[Math.floor(Math.random() * carts.length)];
      if (pick) this.cb.onLaunchGame(pick);
      return 'powerup';
    } else if (cmd === 'reboot') {
      this.app = 'boot';
      this.bootTimer = 0;
      return 'powerup';
    }
    return 'score';
  }

  public getStats(): ArcadeStats {
    return {
      score: 0,
      highScore: 0,
      lives: 0,
      level: 1,
      gameOver: false,
    };
  }

  private formatClock(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  public renderEntities(palette: RetroPalette): React.ReactNode {
    const fg = palette.pixelOn;
    const bg = palette.screenBg;

    if (this.app === 'boot') {
      const pct = Math.min(100, Math.floor((this.bootTimer / 1.4) * 100));
      return (
        <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.bootLogo, { color: fg }]}>RETRODECK OS</Text>
          <Text style={[styles.bootSub, { color: fg }]}>POCKET KERNEL v1.0</Text>
          <View style={[styles.bootBar, { borderColor: fg }]}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: fg }} />
          </View>
          <Text style={[styles.bootLog, { color: fg }]}>
            {pct < 35
              ? 'MEM CHECK: 64KB OK'
              : pct < 75
              ? `MOUNTING ${this.cb.getCartridges().length} CARTS...`
              : 'STARTING DESKTOP...'}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* OS Top Status Bar */}
        <View style={[styles.osBar, { borderBottomColor: fg, backgroundColor: fg }]}>
          <Text style={[styles.osBarTxt, { color: bg }]}>
            {this.app === 'desktop' ? 'RD-OS 1.0' : `< ${this.app.toUpperCase()}`}
          </Text>
          <Text style={[styles.osBarTxt, { color: bg }]}>{this.formatClock()}</Text>
          <Text style={[styles.osBarTxt, { color: bg }]}>BAT[###]</Text>
        </View>

        {/* Body */}
        <View style={styles.osBody}>
          {this.app === 'desktop' && this.renderDesktop(fg, bg)}
          {this.app === 'arcade' && this.renderArcadeBrowser(fg, bg)}
          {this.app === 'calc' && this.renderCalc(fg, bg)}
          {this.app === 'clock' && this.renderClock(fg, bg)}
          {this.app === 'synth' && this.renderSynth(fg, bg)}
          {this.app === 'paint' && this.renderPaint(fg, bg)}
          {this.app === 'notes' && this.renderNotes(fg, bg)}
          {this.app === 'stats' && this.renderStats(fg, bg)}
          {this.app === 'term' && this.renderTerm(fg, bg)}
          {this.app === 'setup' && this.renderSetup(fg, bg)}
        </View>

        {/* OS Footer Taskbar */}
        <View style={[styles.osFooter, { borderTopColor: fg }]}>
          <Text style={[styles.footerTxt, { color: fg }]}>
            {this.app === 'desktop'
              ? '[A] OPEN   [D-PAD] MOVE'
              : '[A] ACTION   [B] DESKTOP'}
          </Text>
        </View>
      </View>
    );
  }

  private renderDesktop(fg: string, bg: string) {
    return (
      <View style={styles.deskGrid}>
        {DESKTOP_ICONS.map((item, idx) => {
          const sel = idx === this.deskIdx;
          return (
            <View
              key={item.id}
              style={[
                styles.deskTile,
                {
                  borderColor: fg,
                  backgroundColor: sel ? fg : 'transparent',
                },
              ]}
            >
              <Text style={[styles.deskCode, { color: sel ? bg : fg }]}>{item.code}</Text>
              <Text style={[styles.deskLbl, { color: sel ? bg : fg }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  private renderArcadeBrowser(fg: string, bg: string) {
    const carts = this.cb.getCartridges();
    const scores = this.cb.getHighScores();
    const visibleCount = 7;
    const start = Math.max(0, Math.min(carts.length - visibleCount, this.gameIdx - 3));
    const slice = carts.slice(start, start + visibleCount);

    return (
      <View style={styles.listWrap}>
        <Text style={[styles.subHeader, { color: fg }]}>
          CARTRIDGE BAY ({this.gameIdx + 1}/{carts.length})  ◀/▶ ±5
        </Text>
        {slice.map((c, i) => {
          const realIdx = start + i;
          const sel = realIdx === this.gameIdx;
          const hs = scores[c.id] || 0;
          return (
            <View
              key={c.id}
              style={[
                styles.listRow,
                { backgroundColor: sel ? fg : 'transparent', borderColor: fg },
              ]}
            >
              <Text style={[styles.listTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                {String(realIdx + 1).padStart(3, '0')}. {c.title}
              </Text>
              <Text style={[styles.listMeta, { color: sel ? bg : fg }]}>
                {hs > 0 ? `HI:${hs}` : c.genre.slice(0, 6)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  private renderCalc(fg: string, bg: string) {
    return (
      <View style={styles.calcWrap}>
        <View style={[styles.calcScreen, { borderColor: fg }]}>
          <Text style={[styles.calcOp, { color: fg }]}>{this.calcOp || ''}</Text>
          <Text style={[styles.calcNum, { color: fg }]}>{this.calcDisplay}</Text>
        </View>
        <View style={styles.calcGrid}>
          {CALC_KEYS.map((row, r) => (
            <View key={r} style={styles.calcRow}>
              {row.map((k, c) => {
                const sel = r === this.calcR && c === this.calcC;
                return (
                  <View
                    key={k}
                    style={[
                      styles.calcKey,
                      { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                    ]}
                  >
                    <Text style={[styles.calcKeyTxt, { color: sel ? bg : fg }]}>{k}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  private renderClock(fg: string, _bg: string) {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const dateStr = d.toISOString().slice(0, 10);

    return (
      <View style={styles.centerBox}>
        <Text style={[styles.clockBig, { color: fg }]}>
          {hh}:{mm}:{ss}
        </Text>
        <Text style={[styles.clockDate, { color: fg }]}>{dateStr}</Text>
        <View style={[styles.swBox, { borderColor: fg }]}>
          <Text style={[styles.swLbl, { color: fg }]}>
            STOPWATCH {this.swRunning ? '[RUN]' : '[STOP]'}
          </Text>
          <Text style={[styles.swTime, { color: fg }]}>{this.swTime.toFixed(2)}s</Text>
          {this.swLap > 0 && (
            <Text style={[styles.swLap, { color: fg }]}>LAP: {this.swLap.toFixed(2)}s</Text>
          )}
        </View>
        <Text style={[styles.miniHint, { color: fg }]}>[A] START/STOP • [▲] RST • [▼] LAP</Text>
      </View>
    );
  }

  private renderSynth(fg: string, bg: string) {
    return (
      <View style={styles.deskGrid}>
        {SYNTH_SOUNDS.map((item, idx) => {
          const sel = idx === this.synthIdx;
          return (
            <View
              key={item.sfx}
              style={[
                styles.deskTile,
                { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
              ]}
            >
              <Text style={[styles.deskCode, { color: sel ? bg : fg }]}>#{idx + 1}</Text>
              <Text style={[styles.deskLbl, { color: sel ? bg : fg }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  private renderPaint(fg: string, bg: string) {
    return (
      <View style={styles.centerBox}>
        <View style={[styles.paintBoard, { borderColor: fg }]}>
          {this.paintGrid.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((on, c) => {
                const isCur = r === this.paintR && c === this.paintC;
                return (
                  <View
                    key={c}
                    style={{
                      width: 15,
                      height: 15,
                      backgroundColor: on ? fg : bg,
                      borderWidth: isCur ? 2 : 0.3,
                      borderColor: isCur ? (on ? bg : fg) : fg,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <Text style={[styles.miniHint, { color: fg }]}>
          POS ({this.paintC},{this.paintR}) • [A] TOGGLE PIXEL
        </Text>
      </View>
    );
  }

  private renderNotes(fg: string, bg: string) {
    return (
      <View style={styles.listWrap}>
        <Text style={[styles.subHeader, { color: fg }]}>POCKET CHECKLIST</Text>
        {this.notes.map((n, i) => {
          const sel = i === this.noteIdx;
          return (
            <View
              key={i}
              style={[styles.listRow, { backgroundColor: sel ? fg : 'transparent' }]}
            >
              <Text style={[styles.listTxt, { color: sel ? bg : fg }]}>
                [{n.done ? 'X' : ' '}] {n.title}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  private renderStats(fg: string, _bg: string) {
    const carts = this.cb.getCartridges();
    const scores = this.cb.getHighScores();
    const entries = Object.entries(scores)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const totalPts = entries.reduce((acc, [, v]) => acc + v, 0);
    const top4 = entries.slice(0, 4);

    return (
      <View style={styles.listWrap}>
        <Text style={[styles.subHeader, { color: fg }]}>
          PLAYED: {entries.length}/{carts.length}   TOTAL: {totalPts}
        </Text>
        <View style={[styles.statRule, { backgroundColor: fg }]} />
        {top4.length === 0 ? (
          <Text style={[styles.listTxt, { color: fg, marginTop: 18, textAlign: 'center' }]}>
            NO HIGH SCORES YET. PLAY A GAME!
          </Text>
        ) : (
          top4.map(([id, val], idx) => {
            const title = carts.find((c) => c.id === id)?.title || id;
            return (
              <View key={id} style={styles.listRow}>
                <Text style={[styles.listTxt, { color: fg }]}>
                  #{idx + 1} {title}
                </Text>
                <Text style={[styles.listMeta, { color: fg }]}>{val}</Text>
              </View>
            );
          })
        )}
      </View>
    );
  }

  private renderTerm(fg: string, bg: string) {
    return (
      <View style={styles.listWrap}>
        <View style={[styles.termScreen, { borderColor: fg }]}>
          {this.termOut.map((line, i) => (
            <Text key={i} style={[styles.termLine, { color: fg }]} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.termCmds}>
          {TERM_CMDS.map((cmd, i) => {
            const sel = i === this.termIdx;
            return (
              <View
                key={cmd}
                style={[styles.termRow, { backgroundColor: sel ? fg : 'transparent' }]}
              >
                <Text style={[styles.termCmdTxt, { color: sel ? bg : fg }]}>
                  {sel ? '>' : ' '} $ {cmd}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  private renderSetup(fg: string, bg: string) {
    const items = [
      `PALETTE: ${this.cb.getPaletteName()}`,
      `CRT SCANLINES: ${this.cb.getScanlines() ? 'ON' : 'OFF'}`,
      'OPEN FULL CARTRIDGE VAULT',
      'REBOOT RETRODECK OS',
    ];
    return (
      <View style={styles.listWrap}>
        <Text style={[styles.subHeader, { color: fg }]}>SYSTEM PREFERENCES</Text>
        {items.map((label, i) => {
          const sel = i === this.setupIdx;
          return (
            <View
              key={label}
              style={[
                styles.setupRow,
                { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
              ]}
            >
              <Text style={[styles.listTxt, { color: sel ? bg : fg }]}>
                {sel ? '> ' : '  '}
                {label}
              </Text>
            </View>
          );
        })}
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
  bootLogo: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  bootSub: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
    marginBottom: 16,
  },
  bootBar: {
    width: 180,
    height: 12,
    borderWidth: 2,
    marginBottom: 10,
  },
  bootLog: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  osBar: {
    height: 20,
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  osBarTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  osBody: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  osFooter: {
    height: 18,
    borderTopWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  deskGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    padding: 4,
  },
  deskTile: {
    width: '31%',
    height: '30%',
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deskCode: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  deskLbl: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  listWrap: {
    flex: 1,
  },
  subHeader: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 2,
  },
  listTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    flex: 1,
  },
  listMeta: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginLeft: 6,
  },
  calcWrap: {
    flex: 1,
    paddingHorizontal: 14,
  },
  calcScreen: {
    borderWidth: 2,
    height: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  calcOp: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  calcNum: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  calcGrid: {
    flex: 1,
    justifyContent: 'space-between',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '22%',
  },
  calcKey: {
    width: '23%',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcKeyTxt: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockBig: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  clockDate: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  swBox: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  swLbl: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  swTime: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  swLap: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  miniHint: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  paintBoard: {
    borderWidth: 2,
  },
  statRule: {
    height: 1.5,
    marginBottom: 6,
  },
  termScreen: {
    borderWidth: 1.5,
    padding: 5,
    marginBottom: 6,
  },
  termLine: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  termCmds: {
    flex: 1,
  },
  termRow: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  termCmdTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  setupRow: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 6,
  },
});
