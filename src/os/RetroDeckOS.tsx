import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ArcadeCartridgeDef,
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
} from '../arcade/types';
import { RetroPalette } from '../theme/palettes';
import { NokiaNoteEvent, RetroAudioEngine } from '../audio/RetroAudioEngine';
import {
  BYOK_PROVIDERS,
  BYOKChatMessage,
  BYOKConfig,
  DEFAULT_BYOK_CONFIG,
  callBYOKAIChat,
  getProviderMeta,
  getProviderModel,
  loadBYOKConfig,
  saveBYOKConfig,
} from '../services/byokAiService';

export interface RetroDeckOSCallbacks {
  getCartridges: () => ArcadeCartridgeDef[];
  getHighScores: () => Record<string, number>;
  onLaunchGame: (cart: ArcadeCartridgeDef) => void;
  onOpenCartVault: () => void;
  onCyclePalette: () => void;
  onToggleScanlines: () => void;
  getPaletteName: () => string;
  getScanlines: () => boolean;
  onRequestKeyboard?: (open: boolean) => void;
  onPlaySound?: (sound: ArcadeSound) => void;
}

type OsAppId =
  | 'boot'
  | 'desktop'
  | 'arcade'
  | 'ai'
  | 'synth'
  | 'phone'
  | 'sms'
  | 'profiles'
  | 'calc'
  | 'clock'
  | 'paint'
  | 'stats'
  | 'term'
  | 'setup';

interface PixelSpan {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Run-length encodes a bitmap string array into centered horizontal rects for locked 60 FPS */
function buildPixelSpans(
  rows: string[],
  px: number,
  targetW?: number,
  targetH?: number
): PixelSpan[] {
  const spans: PixelSpan[] = [];
  let minC = 9999;
  let maxC = -1;
  let minR = 9999;
  let maxR = -1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '.') {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }

  if (maxC < minC) return spans;

  const boxW = targetW ?? (rows[0]?.length || 0) * px;
  const boxH = targetH ?? rows.length * px;
  const drawnW = (maxC - minC + 1) * px;
  const drawnH = (maxR - minR + 1) * px;
  const offsetX = Math.round((boxW - drawnW) / 2) - minC * px;
  const offsetY = Math.round((boxH - drawnH) / 2) - minR * px;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      if (row[c] !== '.') {
        const start = c;
        while (c < row.length && row[c] !== '.') c++;
        spans.push({
          key: `${r}-${start}`,
          x: start * px + offsetX,
          y: r * px + offsetY,
          w: (c - start) * px,
          h: px,
        });
      } else {
        c++;
      }
    }
  }
  return spans;
}

interface DesktopIcon {
  id: OsAppId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'arcade', label: 'GAMES', icon: 'game-controller' },
  { id: 'ai', label: 'CHAT', icon: 'chatbubble-ellipses' },
  { id: 'synth', label: 'MUSIC', icon: 'musical-notes' },
  { id: 'phone', label: 'PHONE', icon: 'call' },
  { id: 'sms', label: 'SMS', icon: 'mail' },
  { id: 'profiles', label: 'PROFILE', icon: 'notifications' },
  { id: 'calc', label: 'CALC', icon: 'calculator' },
  { id: 'clock', label: 'CLOCK', icon: 'time' },
  { id: 'paint', label: 'PAINT', icon: 'brush' },
  { id: 'stats', label: 'STATS', icon: 'trophy' },
  { id: 'term', label: 'SHELL', icon: 'terminal' },
  { id: 'setup', label: 'SETUP', icon: 'settings' },
];

// Wide 36x10 (72x14 aspect ratio) Iconic Nokia 3310 Picture Message Banners!
export type PicArtKey = 'COFFEE' | 'HEART' | 'SAD' | 'CAKE' | 'SNAKE';

const PIC_BANNERS: Record<PicArtKey, PixelSpan[]> = {
  COFFEE: buildPixelSpans(
    [
      '.............#....#....#............',
      '............#....#....#.............',
      '.............#....#....#............',
      '.........###############............',
      '.........#.............#####........',
      '.........#.............#...#........',
      '.........#.............#####........',
      '..........#...........#.............',
      '...........###########..............',
      '.......###################..........',
    ],
    2
  ),
  HEART: buildPixelSpans(
    [
      '....#####...#####....####...####....',
      '..#######.#######..######.######....',
      '.#################.#############....',
      '.#################.#############....',
      '..###############...###########.....',
      '...#############.....#########......',
      '.....#########.........#####........',
      '.......#####.............#..........',
      '.........#..........................',
      '....................................',
    ],
    2
  ),
  SAD: buildPixelSpans(
    [
      '...........##############...........',
      '.........##..............##.........',
      '........#...###......###...#........',
      '.......#....###......###....#.......',
      '.......#.........##.........#.......',
      '.......#.....##########.....#.......',
      '........#...##........##...#........',
      '.........##..............##.........',
      '...........##############...........',
      '....................................',
    ],
    2
  ),
  CAKE: buildPixelSpans(
    [
      '............#.....#.....#...........',
      '............#.....#.....#...........',
      '............#.....#.....#...........',
      '.........###################........',
      '.........#..#..#..#..#..#..#........',
      '.........###################........',
      '.......#######################......',
      '.......#.....................#......',
      '.......#######################......',
      '.....###########################....',
    ],
    2
  ),
  SNAKE: buildPixelSpans(
    [
      '....................................',
      '...##############...................',
      '................#...................',
      '........########.......##...........',
      '........#.............####..........',
      '........#########......##...........',
      '................#...................',
      '................###########@........',
      '....................................',
      '....................................',
    ],
    2
  ),
};

interface NokiaPicSms {
  sender: string;
  title: string;
  text: string;
  artKey: PicArtKey;
}

const INITIAL_PIC_MESSAGES: NokiaPicSms[] = [
  {
    sender: '+358-COFFEE',
    title: 'COFFEE BREAK',
    text: 'NEED A COFFEE BREAK? CALL ME BACK WHEN FREE :)',
    artKey: 'COFFEE',
  },
  {
    sender: 'NOKIA-LOVE',
    title: 'TWIN HEARTS',
    text: 'MY LOVE LASTS LONGER THAN A 3310 BATTERY!',
    artKey: 'HEART',
  },
  {
    sender: '+358-FRIEND',
    title: 'MISS YOU',
    text: 'WHERE ARE YOU? NO SMS FOR 2 DAYS :(',
    artKey: 'SAD',
  },
  {
    sender: 'PARTY-3310',
    title: 'BIRTHDAY',
    text: 'HAPPY BIRTHDAY! (THIS PICTURE SMS COST 2 CREDITS)',
    artKey: 'CAKE',
  },
  {
    sender: 'SNAKE-KING',
    title: 'SNAKE II',
    text: 'JUST SCORED 9999 ON SNAKE II! CAN YOU BEAT IT?',
    artKey: 'SNAKE',
  },
];

const DIAL_KEYS = [
  ['1', '2', '3', 'CALL'],
  ['4', '5', '6', 'RING'],
  ['7', '8', '9', 'CLR'],
  ['*', '0', '#', 'LOCK'],
];

const NOKIA_PROFILES = ['GENERAL', 'SILENT', 'MEETING', 'OUTDOOR'];
const NOKIA_OPERATORS = ['NOKIA', 'TRKCELL', 'TELSIM', 'CYBER', 'RD-OS 1.2'];

interface NokiaSong {
  title: string;
  bpm: number;
  notes: string;
}

const NOKIA_SONGS: NokiaSong[] = [
  {
    title: 'NOKIA TUNE',
    bpm: 180,
    notes: '8e2 8d2 4f#1 4g#1 8c#2 8b1 4d1 4e1 8b1 8a1 4c#1 4e1 2a1',
  },
  {
    title: 'TETRIS 3310',
    bpm: 160,
    notes: '4e2 8b1 8c2 4d2 8c2 8b1 4a1 8a1 8c2 4e2 8d2 8c2 4b1 8c2 4d2 4e2 4c2 4a1 2a1',
  },
  {
    title: 'MARIO BROS',
    bpm: 200,
    notes: '8e2 8e2 8- 8e2 8- 8c2 8e2 8- 4g2 4- 4g1',
  },
  {
    title: 'STAR WARS',
    bpm: 120,
    notes: '4g1 4g1 4g1 8d#1. 16a#1 4g1 8d#1. 16a#1 2g1 4d2 4d2 4d2 8d#2. 16a#1 4f#1 8d#1. 16a#1 2g1',
  },
  {
    title: 'AXEL F 3310',
    bpm: 145,
    notes: '4f1 8g#1. 16f1 16f1 8a#1 8f1 8d#1 4f1 8c2. 16f1 16f1 8c#2 8c2 8g#1 8f1 8c2 8f2 16f1 8d#1 16d#1 8c1 8g1 2f1',
  },
  {
    title: 'PAC-MAN',
    bpm: 160,
    notes: '16b1 16b2 16f#2 16d#2 32b2 16f#2 8d#2 16c2 16c3 16g2 16e2 32c3 16g2 8e2',
  },
  {
    title: 'CUSTOM 3310',
    bpm: 160,
    notes: '8c1 8d1 8e1 8f1 8g1 8a1 8b1 4c2',
  },
];

const COMPOSER_KEYS: { label: string; token: string | 'PLAY' | 'SONG' | 'DEL' }[] = [
  { label: '▶ PLAY', token: 'PLAY' },
  { label: '♫ SONG', token: 'SONG' },
  { label: '1: C1', token: '8c1' },
  { label: '2: D1', token: '8d1' },
  { label: '3: E1', token: '8e1' },
  { label: '4: F1', token: '8f1' },
  { label: '5: G1', token: '8g1' },
  { label: '6: A1', token: '8a1' },
  { label: '7: B1', token: '8b1' },
  { label: '8: C2', token: '8c2' },
  { label: '9: E2', token: '8e2' },
  { label: '⌫ DEL', token: 'DEL' },
];

const CALC_KEYS = [
  ['7', '8', '9', '/', 'FX'],
  ['4', '5', '6', '*', 'C'],
  ['1', '2', '3', '-', '='],
  ['0', '.', '00', '+', '='],
];

const CURRENCY_MODES = [
  { label: 'CALC MODE', rate: 1, unit: '' },
  { label: 'USD -> EUR', rate: 0.92, unit: 'EUR' },
  { label: 'EUR -> USD', rate: 1.09, unit: 'USD' },
  { label: 'USD -> TRY', rate: 34.5, unit: 'TRY' },
  { label: 'TRY -> USD', rate: 1 / 34.5, unit: 'USD' },
];

const TERM_CMDS = [
  'neofetch',
  'uname -a',
  'ls /carts',
  'free -k',
  'randgame',
  'reboot',
];

function stripMarkdownForLcd(raw: string): string {
  return raw
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^#{1,6}\s+(.+)$/gm, '[$1]')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function wrapTextLines(text: string, maxCols = 34): string[] {
  const out: string[] = [];
  const cleaned = stripMarkdownForLcd(text);
  const paragraphs = cleaned.replace(/\r/g, '').split('\n');
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w.slice(0, maxCols);
      } else if (cur.length + 1 + w.length <= maxCols) {
        cur += ' ' + w;
      } else {
        out.push(cur);
        cur = w.slice(0, maxCols);
      }
    }
    if (cur) out.push(cur);
  }
  return out.length > 0 ? out : ['...'];
}

export class RetroDeckOS implements ArcadeGameInstance {
  private cb: RetroDeckOSCallbacks;
  private app: OsAppId = 'boot';
  private bootTimer = 0;
  private uptime = 0;

  // Keyguard & Screensaver state
  private keyLocked = false;
  private unlockStage = false; // true after pressing A once while locked ("NOW PRESS * / UP")
  private unlockHintTimer = 0;
  private idleTimer = 0;

  // Input edge / repeat
  private moveCd = 0;
  private prevA = false;
  private prevB = false;

  // Desktop 4x3 cursor
  private deskIdx = 0;

  // In-LCD Arcade Browser
  private gameIdx = 0;

  // AI & BYOK state
  private byokConfig: BYOKConfig = { ...DEFAULT_BYOK_CONFIG };
  private aiTab: 'chat' | 'byok' = 'chat';
  private byokRow = 0;
  private kbdTarget: 'chat' | 'key' | 'model' = 'chat';
  private aiPrompt = '';
  private aiLoading = false;
  private aiStatus = 'READY';
  private chatHistory: BYOKChatMessage[] = [];
  private chatLines: string[] = [
    'AI> WELCOME TO RETRODECK AI!',
    'AI> PRESS [KBD] OR [A] TO TYPE,',
    'AI> OR [RIGHT] FOR BYOK KEYS.',
  ];
  private chatScroll = 0;

  // Calculator + Currency Converter state
  private calcR = 0;
  private calcC = 0;
  private calcDisplay = '0';
  private calcAcc: number | null = null;
  private calcOp: string | null = null;
  private calcFresh = true;
  private fxModeIdx = 0;

  // Clock / Stopwatch / Countdown Timer state
  private clockTab: 'sw' | 'cd' = 'sw';
  private swRunning = false;
  private swTime = 0;
  private swLap = 0;
  private cdRunning = false;
  private cdPresetSec = 30;
  private cdRemaining = 30;
  private cdAlarmActive = false;

  // Nokia 3310 Composer / Music state
  private synthIdx = 0;
  private songIdx = 0;
  private songs: NokiaSong[] = NOKIA_SONGS.map((s) => ({ ...s }));
  private melodyPlaying = false;
  private melodyTimer = 0;
  private melodyDuration = 0;
  private melodyEvents: NokiaNoteEvent[] = [];

  // Pixel Paint 16x10
  private paintW = 16;
  private paintH = 10;
  private paintGrid: boolean[][] = [];
  private paintR = 4;
  private paintC = 7;

  // Terminal state
  private termIdx = 0;
  private termShowLogo = true;
  private termOut: string[] = [
    'root@retrodeck',
    '------------------',
    'OS: RetroDeck v1.1',
    'CPU: ARM64 @ 60Hz',
    'ROMS: 100 + BYOK AI',
    'RAM: 18/64KB (OK)',
  ];

  // Setup state
  private setupIdx = 0;

  // Nokia 3310 Phone / SMS / Profiles state
  private dialR = 0;
  private dialC = 0;
  private dialBuffer = '';
  private callState: 'idle' | 'ringing' | 'connected' | 'info' = 'idle';
  private callTitle = '';
  private callSub = '';
  private callTimer = 0;

  private smsList: NokiaPicSms[] = INITIAL_PIC_MESSAGES.map((m) => ({ ...m }));
  private smsIdx = 0;
  private smsBanner = '';
  private smsBannerTimer = 0;
  private smsSendingAi = false;

  private profRow = 0;
  private profileIdx = 0;
  private operatorIdx = 0;
  private torchInvert = false;

  constructor(cb: RetroDeckOSCallbacks) {
    this.cb = cb;
    this.clearCanvas();
    loadBYOKConfig().then((cfg) => {
      this.byokConfig = cfg;
    });
  }

  private clearCanvas() {
    this.paintGrid = Array.from({ length: this.paintH }, () =>
      Array(this.paintW).fill(false)
    );
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
    this.keyLocked = false;
    this.unlockStage = false;
    this.idleTimer = 0;
    this.prevA = false;
    this.prevB = false;
  }

  public goDesktop() {
    this.app = 'desktop';
    this.keyLocked = false;
    this.unlockStage = false;
    this.idleTimer = 0;
    this.prevA = true;
    this.prevB = true;
    this.melodyPlaying = false;
    this.cdAlarmActive = false;
    RetroAudioEngine.stopNokiaMelody();
    this.cb.onRequestKeyboard?.(false);
  }

  public getCurrentTitle(): string {
    if (this.keyLocked) return '3310 KEYGUARD';
    if (this.app === 'boot') return 'BIOS BOOT';
    if (this.app === 'desktop') return 'RETRODECK OS';
    if (this.app === 'synth') return '3310 COMPOSER';
    if (this.app === 'sms') return '3310 PIC-SMS';
    if (this.app === 'ai') {
      const meta = getProviderMeta(this.byokConfig.activeProvider);
      return `RD-AI // ${meta.shortName}`;
    }
    return `RD-OS // ${this.app.toUpperCase()}`;
  }

  public getControlsHint(): string {
    if (this.keyLocked) {
      return this.unlockStage
        ? 'NOW PRESS [▲] (STAR *) TO UNLOCK KEYGUARD!'
        : 'KEYGUARD ACTIVE • PRESS [A] THEN [▲] (*) TO UNLOCK';
    }
    switch (this.app) {
      case 'boot':
        return 'Booting RetroDeck OS... Press [A] to skip';
      case 'desktop':
        return 'D-PAD: Select Icon • [A]: Open • KBD: Keyboard';
      case 'arcade':
        return '[▲]/[▼]: Browse 100 Games • [A]: Launch • [B]: Desktop';
      case 'ai':
        return this.aiTab === 'chat'
          ? '[▲]/[▼]: Scroll • [A]: Type/Send • [▶]: BYOK Setup • [B]: Exit'
          : '[▲]/[▼]: Select • [◀]/[▶]: Provider • [A]: Edit Key/Model';
      case 'calc':
        return 'D-PAD: Key • [A]: Press (FX = Currency Converter) • [B]: Exit';
      case 'clock':
        return '[◀]/[▶]: Stopwatch/Timer • [A]: Start/Stop • [▲]/[▼]: Set/Reset';
      case 'synth':
        return 'D-PAD: Select Note/Play • [A]: Play/Add Note • [B]: Exit';
      case 'phone':
        return 'D-PAD: Keypad • [A]: Dial (*#0000# / LOCK) • [B]: Exit';
      case 'sms':
        return '[◀]/[▶]: Picture SMS • [A]: Send to Groq/AI & Receive Pic-SMS!';
      case 'profiles':
        return '[▲]/[▼]: Select • [A]: Profile / Lock Keys / Torch • [B]: Exit';
      case 'paint':
        return 'D-PAD: Cursor • [A]: Draw/Erase • [B]: Desktop';
      case 'stats':
        return 'Viewing Arcade High Scores & Rank • [B]: Desktop';
      case 'term':
        return 'D-PAD: Command • [A]: Execute • [B]: Desktop';
      case 'setup':
        return '[▲]/[▼]: Setting • [A]: Toggle/Run • [B]: Desktop';
      default:
        return 'D-PAD: Navigate • [A]: Select • [B]: Back';
    }
  }

  public getKeyboardBinding(): {
    targetLabel: string;
    value: string;
    placeholder: string;
    secure: boolean;
  } {
    const pid = this.byokConfig.activeProvider;
    const meta = getProviderMeta(pid);
    if (this.app === 'ai' && this.aiTab === 'byok' && this.kbdTarget === 'key') {
      return {
        targetLabel: `${meta.shortName} KEY`,
        value: this.byokConfig.keys[pid] || '',
        placeholder: meta.keyPlaceholder || 'PASTE API KEY...',
        secure: false,
      };
    }
    if (this.app === 'ai' && this.aiTab === 'byok' && this.kbdTarget === 'model') {
      return {
        targetLabel: `${meta.shortName} MDL`,
        value: this.byokConfig.models[pid] ?? meta.defaultModel,
        placeholder: meta.defaultModel,
        secure: false,
      };
    }
    return {
      targetLabel: 'AI PROMPT',
      value: this.aiPrompt,
      placeholder: 'ASK RETRODECK AI...',
      secure: false,
    };
  }

  public setKeyboardText(next: string) {
    this.idleTimer = 0;
    const pid = this.byokConfig.activeProvider;
    if (this.app === 'ai' && this.aiTab === 'byok' && this.kbdTarget === 'key') {
      this.byokConfig = {
        ...this.byokConfig,
        keys: { ...this.byokConfig.keys, [pid]: next },
      };
      saveBYOKConfig(this.byokConfig);
      return;
    }
    if (this.app === 'ai' && this.aiTab === 'byok' && this.kbdTarget === 'model') {
      this.byokConfig = {
        ...this.byokConfig,
        models: { ...this.byokConfig.models, [pid]: next },
      };
      saveBYOKConfig(this.byokConfig);
      return;
    }
    this.aiPrompt = next;
    if (this.app !== 'ai') {
      this.app = 'ai';
      this.aiTab = 'chat';
    }
  }

  public submitKeyboard() {
    this.idleTimer = 0;
    if (this.app === 'ai' && this.aiTab === 'byok') {
      saveBYOKConfig(this.byokConfig);
      this.aiStatus = 'SAVED!';
      this.cb.onPlaySound?.('score');
      this.cb.onRequestKeyboard?.(false);
      return;
    }
    if (this.app !== 'ai') {
      this.app = 'ai';
      this.aiTab = 'chat';
    }
    this.sendAiMessage();
  }

  private appendChatLines(prefix: string, text: string) {
    const wrapped = wrapTextLines(`${prefix} ${text}`, 33);
    this.chatLines.push(...wrapped);
    if (this.chatLines.length > 60) {
      this.chatLines = this.chatLines.slice(this.chatLines.length - 60);
    }
    this.chatScroll = Math.max(0, this.chatLines.length - 6);
  }

  private async sendAiMessage() {
    const msg = this.aiPrompt.trim();
    if (!msg || this.aiLoading) return;
    this.aiPrompt = '';
    this.appendChatLines('YOU>', msg);
    this.chatHistory.push({ role: 'user', content: msg });
    if (this.chatHistory.length > 10) {
      this.chatHistory = this.chatHistory.slice(-10);
    }

    this.aiLoading = true;
    this.aiStatus = 'THINKING...';
    this.cb.onPlaySound?.('shoot');

    try {
      const reply = await callBYOKAIChat(this.chatHistory, this.byokConfig);
      const clean = reply.trim() || '(EMPTY)';
      this.chatHistory.push({ role: 'assistant', content: clean });
      this.appendChatLines('AI>', clean);
      this.aiStatus = 'OK';
      this.cb.onPlaySound?.('powerup');
    } catch (err: any) {
      const errMsg = err?.message || 'API ERROR';
      this.appendChatLines('ERR>', errMsg.toUpperCase());
      this.aiStatus = 'ERR';
      this.cb.onPlaySound?.('die');
    } finally {
      this.aiLoading = false;
    }
  }

  /** Sends a Nokia 3310 Picture Message to Groq / Active BYOK AI and receives a Picture SMS back! */
  private async sendPictureSmsToAi() {
    if (this.smsSendingAi) return;
    const cur = this.smsList[this.smsIdx];
    const meta = getProviderMeta(this.byokConfig.activeProvider);
    const hasKey =
      !meta.requiresKey || Boolean(this.byokConfig.keys[this.byokConfig.activeProvider]?.trim());

    RetroAudioEngine.playNokiaSmsTone();

    if (!hasKey) {
      this.smsBanner = `SENT! (ADD ${meta.shortName} KEY FOR AI REPLY)`;
      this.smsBannerTimer = 2.8;
      return;
    }

    this.smsSendingAi = true;
    this.smsBanner = `SENDING PIC-SMS TO ${meta.shortName}...`;
    this.smsBannerTimer = 10;

    try {
      const prompt = `You received a Nokia 3310 Picture SMS: [${cur.title}] "${cur.text}". Reply like a witty 2000s Nokia 3310 user in English (max 75 chars, plain text only). Start your reply with one tag: [COFFEE], [HEART], [SAD], [CAKE], or [SNAKE].`;
      const raw = await callBYOKAIChat([{ role: 'user', content: prompt }], this.byokConfig);
      const cleaned = stripMarkdownForLcd(raw).toUpperCase();

      let artKey: PicArtKey = 'COFFEE';
      if (cleaned.includes('HEART') || cleaned.includes('LOVE')) artKey = 'HEART';
      else if (cleaned.includes('SAD') || cleaned.includes('MISS')) artKey = 'SAD';
      else if (cleaned.includes('CAKE') || cleaned.includes('BIRTH')) artKey = 'CAKE';
      else if (cleaned.includes('SNAKE')) artKey = 'SNAKE';

      const body = cleaned
        .replace(/\[(COFFEE|HEART|SAD|CAKE|SNAKE)\]/g, '')
        .trim()
        .slice(0, 82);

      this.smsList.unshift({
        sender: `${meta.shortName}-3310`,
        title: `${meta.shortName} PIC-SMS`,
        text: body || 'HEY! LOW ON CREDITS, CALL ME BACK ON MY 3310 XD',
        artKey,
      });
      if (this.smsList.length > 10) this.smsList.pop();
      this.smsIdx = 0;
      this.smsBanner = `NEW PIC-SMS FROM ${meta.shortName}!`;
      this.smsBannerTimer = 3.0;
      RetroAudioEngine.playNokiaSmsTone();
    } catch (err: any) {
      this.smsBanner = `SMS ERR: ${(err?.message || 'FAILED').slice(0, 24).toUpperCase()}`;
      this.smsBannerTimer = 3.0;
    } finally {
      this.smsSendingAi = false;
    }
  }

  private cycleProvider(delta: number) {
    const idx = BYOK_PROVIDERS.findIndex((p) => p.id === this.byokConfig.activeProvider);
    const nextIdx = (idx + delta + BYOK_PROVIDERS.length) % BYOK_PROVIDERS.length;
    this.byokConfig = {
      ...this.byokConfig,
      activeProvider: BYOK_PROVIDERS[nextIdx].id,
    };
    saveBYOKConfig(this.byokConfig);
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    this.uptime += dt;
    if (this.swRunning) this.swTime += dt;
    if (this.moveCd > 0) this.moveCd -= dt;
    if (this.unlockHintTimer > 0) this.unlockHintTimer -= dt;

    // Countdown timer tick
    if (this.cdRunning) {
      this.cdRemaining -= dt;
      if (this.cdRemaining <= 0) {
        this.cdRemaining = 0;
        this.cdRunning = false;
        this.cdAlarmActive = true;
        RetroAudioEngine.playNokiaMelody(NOKIA_SONGS[0].notes, NOKIA_SONGS[0].bpm);
      }
    }

    if (this.callState === 'connected') {
      this.callTimer += dt;
    }
    if (this.smsBannerTimer > 0) {
      this.smsBannerTimer -= dt;
    }

    if (this.melodyPlaying) {
      this.melodyTimer += dt;
      if (this.melodyTimer >= this.melodyDuration) {
        this.melodyPlaying = false;
        this.melodyTimer = 0;
      }
    }

    const pressA = input.a && !this.prevA;
    const pressB = input.b && !this.prevB;
    this.prevA = input.a;
    this.prevB = input.b;

    const anyInput =
      input.up || input.down || input.left || input.right || pressA || pressB;

    // Boot sequence
    if (this.app === 'boot') {
      this.bootTimer += dt;
      if (this.bootTimer >= 1.5 || pressA || pressB) {
        this.app = 'desktop';
        return 'powerup';
      }
      return null;
    }

    // Keyguard / Pixel Clock Screensaver Handling (Unlock with Menu [A] + Star [▲])
    if (this.keyLocked) {
      if (pressA) {
        this.unlockStage = true;
        this.unlockHintTimer = 2.5;
        return 'hit';
      }
      if (this.unlockStage && (input.up || pressB)) {
        this.keyLocked = false;
        this.unlockStage = false;
        this.idleTimer = 0;
        return 'powerup';
      }
      if (input.down || input.left || input.right) {
        this.unlockHintTimer = 2.0;
        return 'hit';
      }
      return null;
    }

    // Auto Screensaver / Keyguard after 28s idle on desktop
    if (anyInput) {
      this.idleTimer = 0;
    } else if (this.app === 'desktop') {
      this.idleTimer += dt;
      if (this.idleTimer >= 28) {
        this.keyLocked = true;
        this.unlockStage = false;
        this.idleTimer = 0;
      }
    }

    // Global B = return to desktop from any sub-app
    if (this.app !== 'desktop' && pressB) {
      if (this.melodyPlaying || this.cdAlarmActive) {
        this.melodyPlaying = false;
        this.cdAlarmActive = false;
        RetroAudioEngine.stopNokiaMelody();
      }
      this.callState = 'idle';
      this.app = 'desktop';
      this.cb.onRequestKeyboard?.(false);
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
      const total = DESKTOP_ICONS.length; // 12 (4 cols x 3 rows)
      if (dir === 'left') this.deskIdx = (this.deskIdx + total - 1) % total;
      if (dir === 'right') this.deskIdx = (this.deskIdx + 1) % total;
      if (dir === 'up') this.deskIdx = (this.deskIdx + total - 4) % total;
      if (dir === 'down') this.deskIdx = (this.deskIdx + 4) % total;
      if (dir) return 'hit';

      if (pressA) {
        this.app = DESKTOP_ICONS[this.deskIdx].id;
        if (this.app === 'ai') {
          this.kbdTarget = 'chat';
        }
        return 'score';
      }
      return null;
    }

    if (this.app === 'phone') {
      if (this.callState !== 'idle') {
        if (pressA) {
          if (this.callState === 'ringing') {
            RetroAudioEngine.stopNokiaMelody();
            this.callState = 'connected';
            this.callTimer = 0;
            return 'score';
          } else {
            this.callState = 'idle';
            RetroAudioEngine.stopNokiaMelody();
            return 'hit';
          }
        }
        return null;
      }

      if (dir === 'up') this.dialR = (this.dialR + 3) % 4;
      if (dir === 'down') this.dialR = (this.dialR + 1) % 4;
      if (dir === 'left') this.dialC = (this.dialC + 3) % 4;
      if (dir === 'right') this.dialC = (this.dialC + 1) % 4;
      if (dir) return 'hit';

      if (pressA) {
        const k = DIAL_KEYS[this.dialR][this.dialC];
        if (k === 'CLR') {
          this.dialBuffer = this.dialBuffer.slice(0, -1);
          return 'hit';
        }
        if (k === 'LOCK') {
          this.keyLocked = true;
          this.unlockStage = false;
          return 'score';
        }
        if (k === 'RING') {
          this.callState = 'ringing';
          this.callTitle = 'NOKIA 3310 CALLING';
          this.callSub = '+358-50-3310-00';
          RetroAudioEngine.playNokiaMelody(NOKIA_SONGS[0].notes, NOKIA_SONGS[0].bpm);
          return null;
        }
        if (k === 'CALL') {
          const num = this.dialBuffer || '0532-3310';
          this.callState = 'connected';
          this.callTitle = `CALLING ${num}`;
          this.callSub = 'VOICE LINE ACTIVE';
          this.callTimer = 0;
          return 'powerup';
        }
        if (this.dialBuffer.length < 14) {
          this.dialBuffer += k;
        }
        RetroAudioEngine.playDialKey(k);
        if (this.dialBuffer === '*#0000#') {
          this.callState = 'info';
          this.callTitle = 'V 05.57  23-11-26';
          this.callSub = 'NHM-5NX (c) NOKIA';
          this.dialBuffer = '';
        } else if (this.dialBuffer === '*#06#') {
          this.callState = 'info';
          this.callTitle = 'IMEI SERIAL NO:';
          this.callSub = '350993-10-331000-8';
          this.dialBuffer = '';
        }
        return null;
      }
      return null;
    }

    if (this.app === 'sms') {
      if (dir === 'left' || dir === 'up') {
        this.smsIdx = (this.smsIdx + this.smsList.length - 1) % this.smsList.length;
        return 'hit';
      }
      if (dir === 'right' || dir === 'down') {
        this.smsIdx = (this.smsIdx + 1) % this.smsList.length;
        return 'hit';
      }
      if (pressA) {
        this.sendPictureSmsToAi();
        return null;
      }
      return null;
    }

    if (this.app === 'profiles') {
      if (dir === 'up') {
        this.profRow = (this.profRow + 3) % 4;
        return 'hit';
      }
      if (dir === 'down') {
        this.profRow = (this.profRow + 1) % 4;
        return 'hit';
      }
      if (pressA || dir === 'left' || dir === 'right') {
        const step = dir === 'left' ? -1 : 1;
        if (this.profRow === 0) {
          this.profileIdx =
            (this.profileIdx + step + NOKIA_PROFILES.length) % NOKIA_PROFILES.length;
          RetroAudioEngine.setMuted(NOKIA_PROFILES[this.profileIdx] === 'SILENT');
          return 'score';
        } else if (this.profRow === 1) {
          this.operatorIdx =
            (this.operatorIdx + step + NOKIA_OPERATORS.length) % NOKIA_OPERATORS.length;
          return 'score';
        } else if (this.profRow === 2 && pressA) {
          this.keyLocked = true;
          this.unlockStage = false;
          return 'score';
        } else if (this.profRow === 3 && pressA) {
          this.torchInvert = !this.torchInvert;
          return 'powerup';
        }
      }
      return null;
    }

    if (this.app === 'ai') {
      if (this.aiTab === 'chat') {
        if (dir === 'up') {
          this.chatScroll = Math.max(0, this.chatScroll - 1);
          return 'hit';
        }
        if (dir === 'down') {
          this.chatScroll = Math.min(Math.max(0, this.chatLines.length - 6), this.chatScroll + 1);
          return 'hit';
        }
        if (dir === 'right') {
          this.aiTab = 'byok';
          this.byokRow = 0;
          this.kbdTarget = 'key';
          return 'hit';
        }
        if (pressA) {
          this.kbdTarget = 'chat';
          if (this.aiPrompt.trim().length > 0) {
            this.sendAiMessage();
          } else {
            this.cb.onRequestKeyboard?.(true);
          }
          return 'score';
        }
      } else {
        if (dir === 'up') {
          this.byokRow = (this.byokRow + 3) % 4;
          this.kbdTarget = this.byokRow === 2 ? 'model' : 'key';
          return 'hit';
        }
        if (dir === 'down') {
          this.byokRow = (this.byokRow + 1) % 4;
          this.kbdTarget = this.byokRow === 2 ? 'model' : 'key';
          return 'hit';
        }
        if (dir === 'left') {
          if (this.byokRow === 0) {
            this.cycleProvider(-1);
          } else {
            this.aiTab = 'chat';
            this.kbdTarget = 'chat';
          }
          return 'hit';
        }
        if (dir === 'right') {
          if (this.byokRow === 0) {
            this.cycleProvider(1);
            return 'hit';
          }
        }
        if (pressA) {
          if (this.byokRow === 0) {
            this.cycleProvider(1);
            return 'score';
          } else if (this.byokRow === 1) {
            this.kbdTarget = 'key';
            this.cb.onRequestKeyboard?.(true);
            return 'score';
          } else if (this.byokRow === 2) {
            this.kbdTarget = 'model';
            this.cb.onRequestKeyboard?.(true);
            return 'score';
          } else {
            this.aiTab = 'chat';
            this.kbdTarget = 'chat';
            return 'score';
          }
        }
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
      if (dir === 'left') this.calcC = (this.calcC + 4) % 5;
      if (dir === 'right') this.calcC = (this.calcC + 1) % 5;
      if (dir) return 'hit';
      if (pressA) {
        this.pressCalcKey(CALC_KEYS[this.calcR][this.calcC]);
        return 'score';
      }
      return null;
    }

    if (this.app === 'clock') {
      if (dir === 'left' || dir === 'right') {
        this.clockTab = this.clockTab === 'sw' ? 'cd' : 'sw';
        return 'hit';
      }
      if (this.clockTab === 'sw') {
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
      } else {
        // Countdown Timer
        if (this.cdAlarmActive && pressA) {
          this.cdAlarmActive = false;
          RetroAudioEngine.stopNokiaMelody();
          this.cdRemaining = this.cdPresetSec;
          return 'hit';
        }
        if (pressA) {
          if (this.cdRemaining <= 0) this.cdRemaining = this.cdPresetSec;
          this.cdRunning = !this.cdRunning;
          return 'score';
        }
        if (dir === 'up') {
          this.cdRunning = false;
          this.cdPresetSec = Math.min(600, this.cdPresetSec + 15);
          this.cdRemaining = this.cdPresetSec;
          return 'hit';
        }
        if (dir === 'down') {
          this.cdRunning = false;
          this.cdPresetSec = Math.max(5, this.cdPresetSec - 5);
          this.cdRemaining = this.cdPresetSec;
          return 'hit';
        }
      }
      return null;
    }

    if (this.app === 'synth') {
      const totalKeys = COMPOSER_KEYS.length;
      if (dir === 'left') this.synthIdx = (this.synthIdx + totalKeys - 1) % totalKeys;
      if (dir === 'right') this.synthIdx = (this.synthIdx + 1) % totalKeys;
      if (dir === 'up') this.synthIdx = (this.synthIdx + totalKeys - 4) % totalKeys;
      if (dir === 'down') this.synthIdx = (this.synthIdx + 4) % totalKeys;
      if (dir) return 'hit';

      if (pressA) {
        const key = COMPOSER_KEYS[this.synthIdx];
        const curSong = this.songs[this.songIdx];
        if (key.token === 'PLAY') {
          if (this.melodyPlaying) {
            this.melodyPlaying = false;
            RetroAudioEngine.stopNokiaMelody();
          } else {
            const res = RetroAudioEngine.playNokiaMelody(curSong.notes, curSong.bpm);
            this.melodyEvents = res.events;
            this.melodyDuration = res.totalSec;
            this.melodyTimer = 0;
            this.melodyPlaying = res.totalSec > 0;
          }
          return null;
        }
        if (key.token === 'SONG') {
          this.melodyPlaying = false;
          RetroAudioEngine.stopNokiaMelody();
          this.songIdx = (this.songIdx + 1) % this.songs.length;
          return 'score';
        }
        if (key.token === 'DEL') {
          this.melodyPlaying = false;
          RetroAudioEngine.stopNokiaMelody();
          const parts = curSong.notes.trim().split(/\s+/).filter(Boolean);
          parts.pop();
          curSong.notes = parts.join(' ');
          return 'hit';
        }
        this.melodyPlaying = false;
        RetroAudioEngine.stopNokiaMelody();
        RetroAudioEngine.playNokiaNote(key.token, curSong.bpm);
        const parts = curSong.notes.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 24) parts.shift();
        parts.push(key.token);
        curSong.notes = parts.join(' ');
        return null;
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

    if (this.app === 'term') {
      if (dir === 'up' || dir === 'down') {
        this.termIdx = (this.termIdx + 3) % TERM_CMDS.length;
      }
      if (dir === 'left') {
        this.termIdx = (this.termIdx + TERM_CMDS.length - 1) % TERM_CMDS.length;
      }
      if (dir === 'right') {
        this.termIdx = (this.termIdx + 1) % TERM_CMDS.length;
      }
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
    if (k === 'FX') {
      this.fxModeIdx = (this.fxModeIdx + 1) % CURRENCY_MODES.length;
      return;
    }
    if (k === 'C') {
      this.calcDisplay = '0';
      this.calcAcc = null;
      this.calcOp = null;
      this.calcFresh = true;
      return;
    }
    if (k === '.' && !this.calcDisplay.includes('.')) {
      this.calcDisplay += '.';
      this.calcFresh = false;
      return;
    }
    if (k === '00' || '0123456789'.includes(k)) {
      if (this.calcFresh || this.calcDisplay === '0') {
        this.calcDisplay = k === '00' ? '0' : k;
        this.calcFresh = false;
      } else if (this.calcDisplay.length < 9) {
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
    const meta = getProviderMeta(this.byokConfig.activeProvider);
    if (cmd === 'neofetch') {
      this.termShowLogo = true;
      this.termOut = [
        'root@retrodeck',
        '------------------',
        'OS: RetroDeck v1.1',
        `PAL: ${this.cb.getPaletteName().slice(0, 13)}`,
        `ROM: ${carts.length} | AI:${meta.shortName}`,
        `UP: ${Math.floor(this.uptime)}s | 18/64KB`,
      ];
    } else if (cmd === 'uname -a') {
      this.termShowLogo = false;
      this.termOut = [
        'KERNEL: RetroDeckOS 1.1.0-arm64',
        'DISPLAY: 320x240 60Hz MONO LCD',
        'AUDIO: 8-BIT WAV SYNTHESIZER',
        `AI ENGINE: ${meta.name.toUpperCase()}`,
        `THEME: ${this.cb.getPaletteName()}`,
        'STATUS: ALL SYSTEMS NOMINAL',
      ];
    } else if (cmd === 'ls /carts') {
      this.termShowLogo = false;
      this.termOut = [
        `/carts (${carts.length} ROMS MOUNTED):`,
        `001:${carts[0]?.title.slice(0, 11)} 002:${carts[1]?.title.slice(0, 11)}`,
        `003:${carts[2]?.title.slice(0, 11)} 004:${carts[3]?.title.slice(0, 11)}`,
        `005:${carts[4]?.title.slice(0, 11)} 006:${carts[5]?.title.slice(0, 11)}`,
        `007:${carts[6]?.title.slice(0, 11)} 008:${carts[7]?.title.slice(0, 11)}`,
        '... +92 MORE IN [GAMES] VAULT',
      ];
    } else if (cmd === 'free -k') {
      this.termShowLogo = false;
      this.termOut = [
        '       TOTAL   USED   FREE   SHARED',
        'MEM:    64KB   18KB   46KB     2KB',
        'VRAM:   16KB    9KB    7KB     0KB',
        'ROM:  4096KB 3840KB  256KB     0KB',
        'RAM  [#####-------------] 28% USED',
        'VRAM [##########--------] 56% USED',
      ];
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
    const fg = this.torchInvert ? palette.screenBg : palette.pixelOn;
    const bg = this.torchInvert ? palette.pixelOn : palette.screenBg;

    if (this.app === 'boot') {
      const pct = Math.min(100, Math.floor((this.bootTimer / 1.4) * 100));
      return (
        <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.bootLogo, { color: fg }]}>RETRODECK OS</Text>
          <Text style={[styles.bootSub, { color: fg }]}>NOKIA 3310 AI KERNEL v1.2</Text>
          <View style={[styles.bootBar, { borderColor: fg }]}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: fg }} />
          </View>
          <Text style={[styles.bootLog, { color: fg }]}>
            {pct < 35
              ? 'MEM CHECK: 64KB OK'
              : pct < 75
              ? `MOUNTING ${this.cb.getCartridges().length} CARTS + BYOK...`
              : 'STARTING DESKTOP...'}
          </Text>
        </View>
      );
    }

    // Nokia 3310 Keyguard & Floating Pixel Digital Clock Screensaver
    if (this.keyLocked) {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const driftY = Math.round(Math.sin(this.uptime * 1.1) * 14);

      return (
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.osBar, { borderBottomColor: fg, backgroundColor: fg }]}>
            <Text style={[styles.osBarTxt, { color: bg }]}>
              Ψ|||| {NOKIA_OPERATORS[this.operatorIdx]}
            </Text>
            <Text style={[styles.osBarTxt, { color: bg }]}>[KEYGUARD]</Text>
            <Text style={[styles.osBarTxt, { color: bg }]}>
              {NOKIA_PROFILES[this.profileIdx].slice(0, 3)} [||||]
            </Text>
          </View>

          <View style={[styles.centerBox, { transform: [{ translateY: driftY }] }]}>
            <View style={[styles.swBox, { borderColor: fg, paddingHorizontal: 22, paddingVertical: 10 }]}>
              <Text style={[styles.swLbl, { color: fg }]}>
                {NOKIA_OPERATORS[this.operatorIdx]} // 3310
              </Text>
              <Text style={[styles.clockBig, { color: fg }]}>
                {hh}:{mm}:{ss}
              </Text>
              <Text style={[styles.swLap, { color: fg }]}>
                KEYGUARD LOCKED ({NOKIA_PROFILES[this.profileIdx]})
              </Text>
            </View>
          </View>

          <View style={[styles.osFooter, { borderTopColor: fg, backgroundColor: this.unlockStage ? fg : 'transparent' }]}>
            <Text style={[styles.footerTxt, { color: this.unlockStage ? bg : fg }]}>
              {this.unlockStage
                ? 'NOW PRESS [▲] (*) TO UNLOCK!'
                : 'UNLOCK: PRESS [A] THEN [▲] (*)'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* OS Top Status Bar */}
        <View style={[styles.osBar, { borderBottomColor: fg, backgroundColor: fg }]}>
          <Text style={[styles.osBarTxt, { color: bg }]}>
            {this.app === 'desktop'
              ? `Ψ|||| ${NOKIA_OPERATORS[this.operatorIdx]}`
              : `< ${this.app.toUpperCase()}`}
          </Text>
          <Text style={[styles.osBarTxt, { color: bg }]}>{this.formatClock()}</Text>
          <Text style={[styles.osBarTxt, { color: bg }]}>
            {NOKIA_PROFILES[this.profileIdx].slice(0, 3)} [||||]
          </Text>
        </View>

        {/* Body */}
        <View style={styles.osBody}>
          {this.app === 'desktop' && this.renderDesktop(fg, bg)}
          {this.app === 'arcade' && this.renderArcadeBrowser(fg, bg)}
          {this.app === 'ai' && this.renderAiApp(fg, bg)}
          {this.app === 'synth' && this.renderSynth(fg, bg)}
          {this.app === 'phone' && this.renderPhone(fg, bg)}
          {this.app === 'sms' && this.renderSms(fg, bg)}
          {this.app === 'profiles' && this.renderProfiles(fg, bg)}
          {this.app === 'calc' && this.renderCalc(fg, bg)}
          {this.app === 'clock' && this.renderClock(fg, bg)}
          {this.app === 'paint' && this.renderPaint(fg, bg)}
          {this.app === 'stats' && this.renderStats(fg, bg)}
          {this.app === 'term' && this.renderTerm(fg, bg)}
          {this.app === 'setup' && this.renderSetup(fg, bg)}
        </View>

        {/* OS Footer Taskbar */}
        <View style={[styles.osFooter, { borderTopColor: fg }]}>
          <Text style={[styles.footerTxt, { color: fg }]} numberOfLines={1}>
            {this.app === 'desktop'
              ? '[A] OPEN   [D-PAD] MOVE   [KBD] KEYBOARD'
              : this.app === 'ai'
              ? '[A] KBD/SEND   [◀/▶] TAB   [B] DESKTOP'
              : this.app === 'sms'
              ? '[A] SEND PIC-SMS TO GROQ/AI   [B] DESKTOP'
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
          const iconColor = sel ? bg : fg;
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
              <Ionicons name={item.icon} size={18} color={iconColor} />
              <Text style={[styles.deskLbl, { color: iconColor }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  private renderAiApp(fg: string, bg: string) {
    const pid = this.byokConfig.activeProvider;
    const meta = getProviderMeta(pid);
    const hasKey = !meta.requiresKey || Boolean(this.byokConfig.keys[pid]?.trim());
    const rawKey = this.byokConfig.keys[pid] || '';
    const maskedKey = rawKey
      ? rawKey.length > 8
        ? `${rawKey.slice(0, 5)}...${rawKey.slice(-3)}`
        : 'SET (***)'
      : 'NOT SET [PRESS A]';

    return (
      <View style={styles.listWrap}>
        <View style={styles.aiTabsRow}>
          <View
            style={[
              styles.aiTabPill,
              {
                borderColor: fg,
                backgroundColor: this.aiTab === 'chat' ? fg : 'transparent',
              },
            ]}
          >
            <Text style={[styles.aiTabTxt, { color: this.aiTab === 'chat' ? bg : fg }]}>
              1.CHAT ({meta.shortName})
            </Text>
          </View>
          <View
            style={[
              styles.aiTabPill,
              {
                borderColor: fg,
                backgroundColor: this.aiTab === 'byok' ? fg : 'transparent',
              },
            ]}
          >
            <Text style={[styles.aiTabTxt, { color: this.aiTab === 'byok' ? bg : fg }]}>
              2.BYOK [{hasKey ? 'KEY:OK' : 'NO KEY'}]
            </Text>
          </View>
        </View>

        {this.aiTab === 'chat' ? (
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={[styles.aiChatBox, { borderColor: fg }]}>
              {this.chatLines.slice(this.chatScroll, this.chatScroll + 6).map((line, idx) => (
                <Text key={idx} style={[styles.aiChatLine, { color: fg }]} numberOfLines={1}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={[styles.aiPromptBar, { borderColor: fg, backgroundColor: fg }]}>
              <Text style={[styles.aiPromptTxt, { color: bg }]} numberOfLines={1}>
                {this.aiLoading
                  ? `> [${meta.shortName} THINKING...]`
                  : `> ${this.aiPrompt || 'PRESS [KBD] OR [A] TO CHAT_'}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {[
              `PROVIDER: < ${meta.name.toUpperCase()} >`,
              `API KEY: ${maskedKey}`,
              `MODEL: ${getProviderModel(pid, this.byokConfig)}`,
              '>> BACK TO AI CHAT <<',
            ].map((rowLabel, rIdx) => {
              const sel = rIdx === this.byokRow;
              return (
                <View
                  key={rIdx}
                  style={[
                    styles.setupRow,
                    { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                  ]}
                >
                  <Text style={[styles.setupTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                    {sel ? '> ' : '  '}
                    {rowLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
    const fx = CURRENCY_MODES[this.fxModeIdx];
    const numVal = parseFloat(this.calcDisplay) || 0;
    const converted =
      this.fxModeIdx > 0 ? `${(numVal * fx.rate).toFixed(2)} ${fx.unit}` : '';

    return (
      <View style={styles.calcWrap}>
        <View style={[styles.calcScreen, { borderColor: fg }]}>
          <Text style={[styles.calcModeTag, { color: fg }]}>
            {fx.label} {this.calcOp || ''}
          </Text>
          <Text style={[styles.calcNum, { color: fg }]} numberOfLines={1}>
            {converted ? `${this.calcDisplay} = ${converted}` : this.calcDisplay}
          </Text>
        </View>
        <View style={styles.calcGrid}>
          {CALC_KEYS.map((row, r) => (
            <View key={r} style={styles.calcRow}>
              {row.map((k, c) => {
                const sel = r === this.calcR && c === this.calcC;
                return (
                  <View
                    key={`${r}-${c}`}
                    style={[
                      styles.calcKey5,
                      { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                    ]}
                  >
                    <Text style={[styles.compKeyTxt, { color: sel ? bg : fg }]}>{k}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  private renderClock(fg: string, bg: string) {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    return (
      <View style={styles.listWrap}>
        <View style={styles.aiTabsRow}>
          <View
            style={[
              styles.aiTabPill,
              { borderColor: fg, backgroundColor: this.clockTab === 'sw' ? fg : 'transparent' },
            ]}
          >
            <Text style={[styles.aiTabTxt, { color: this.clockTab === 'sw' ? bg : fg }]}>
              1.STOPWATCH
            </Text>
          </View>
          <View
            style={[
              styles.aiTabPill,
              { borderColor: fg, backgroundColor: this.clockTab === 'cd' ? fg : 'transparent' },
            ]}
          >
            <Text style={[styles.aiTabTxt, { color: this.clockTab === 'cd' ? bg : fg }]}>
              2.COUNTDOWN
            </Text>
          </View>
        </View>

        <View style={styles.centerBox}>
          <Text style={[styles.clockDate, { color: fg }]}>
            TIME {hh}:{mm}:{ss}
          </Text>
          {this.clockTab === 'sw' ? (
            <View style={[styles.swBox, { borderColor: fg }]}>
              <Text style={[styles.swLbl, { color: fg }]}>
                STOPWATCH {this.swRunning ? '[RUN]' : '[STOP]'}
              </Text>
              <Text style={[styles.swTime, { color: fg }]}>{this.swTime.toFixed(2)}s</Text>
              {this.swLap > 0 && (
                <Text style={[styles.swLap, { color: fg }]}>LAP: {this.swLap.toFixed(2)}s</Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.swBox,
                {
                  borderColor: fg,
                  backgroundColor: this.cdAlarmActive ? fg : 'transparent',
                },
              ]}
            >
              <Text style={[styles.swLbl, { color: this.cdAlarmActive ? bg : fg }]}>
                {this.cdAlarmActive
                  ? '((( TIME UP! ALARM )))'
                  : `COUNTDOWN (${this.cdPresetSec}s)`}
              </Text>
              <Text style={[styles.swTime, { color: this.cdAlarmActive ? bg : fg }]}>
                {this.cdRemaining.toFixed(1)}s
              </Text>
            </View>
          )}
          <Text style={[styles.miniHint, { color: fg }]}>
            {this.clockTab === 'sw'
              ? '[A] START/STOP • [▲] RESET • [▼] LAP'
              : '[A] START/STOP • [▲] +15S • [▼] -5S'}
          </Text>
        </View>
      </View>
    );
  }

  private renderSynth(fg: string, bg: string) {
    const curSong = this.songs[this.songIdx];
    const tokens = curSong.notes.trim().split(/\s+/).filter(Boolean);

    let activeNoteIdx = -1;
    if (this.melodyPlaying) {
      for (let i = 0; i < this.melodyEvents.length; i++) {
        const ev = this.melodyEvents[i];
        if (
          this.melodyTimer >= ev.startSec &&
          this.melodyTimer < ev.startSec + ev.durationSec
        ) {
          activeNoteIdx = i;
          break;
        }
      }
    }

    return (
      <View style={styles.listWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: fg }]} numberOfLines={1}>
            ♪ {this.songIdx + 1}/{this.songs.length} {curSong.title}
          </Text>
          <Text style={[styles.compBpm, { color: fg }]}>
            {this.melodyPlaying ? 'PLAYING' : `${curSong.bpm}BPM`}
          </Text>
        </View>

        <View style={[styles.compStaff, { borderColor: fg }]}>
          <View style={styles.compTokensWrap}>
            {tokens.slice(0, 18).map((tok, idx) => {
              const isPlaying = idx === activeNoteIdx;
              return (
                <View
                  key={idx}
                  style={[styles.compTokPill, isPlaying && { backgroundColor: fg }]}
                >
                  <Text style={[styles.compTokTxt, { color: isPlaying ? bg : fg }]}>
                    {tok}
                  </Text>
                </View>
              );
            })}
            {tokens.length === 0 && (
              <Text style={[styles.compTokTxt, { color: fg }]}>
                (EMPTY - TAP NOTES BELOW TO COMPOSE)
              </Text>
            )}
          </View>
        </View>

        <View style={styles.compKeypad}>
          {COMPOSER_KEYS.map((item, idx) => {
            const sel = idx === this.synthIdx;
            const label =
              item.token === 'PLAY' && this.melodyPlaying ? '■ STOP' : item.label;
            return (
              <View
                key={idx}
                style={[
                  styles.compKey,
                  { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                ]}
              >
                <Text style={[styles.compKeyTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  private renderPhone(fg: string, bg: string) {
    if (this.callState !== 'idle') {
      return (
        <View style={styles.centerBox}>
          <View style={[styles.swBox, { borderColor: fg, width: '90%' }]}>
            <Text style={[styles.swLbl, { color: fg, marginBottom: 4 }]}>
              {this.callState === 'ringing'
                ? '((( INCOMING CALL )))'
                : this.callState === 'connected'
                ? `CONNECTED 00:${String(Math.floor(this.callTimer)).padStart(2, '0')}`
                : 'NOKIA 3310 SERVICE'}
            </Text>
            <Text style={[styles.calcNum, { color: fg, textAlign: 'center' }]}>
              {this.callTitle}
            </Text>
            <Text style={[styles.clockDate, { color: fg, marginTop: 4, marginBottom: 4 }]}>
              {this.callSub}
            </Text>
          </View>
          <Text style={[styles.miniHint, { color: fg }]}>
            {this.callState === 'ringing'
              ? '[A] ANSWER CALL   [B] REJECT'
              : '[A] / [B] END / BACK'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.calcWrap}>
        <View style={[styles.calcScreen, { borderColor: fg }]}>
          <Text style={[styles.calcOp, { color: fg }]}>TEL:</Text>
          <Text style={[styles.calcNum, { color: fg }]} numberOfLines={1}>
            {this.dialBuffer || '*#0000# / *#06#'}
          </Text>
        </View>
        <View style={styles.calcGrid}>
          {DIAL_KEYS.map((row, r) => (
            <View key={r} style={styles.calcRow}>
              {row.map((k, c) => {
                const sel = r === this.dialR && c === this.dialC;
                return (
                  <View
                    key={k}
                    style={[
                      styles.calcKey,
                      { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                    ]}
                  >
                    <Text style={[styles.compKeyTxt, { color: sel ? bg : fg }]}>{k}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  private renderSms(fg: string, _bg: string) {
    const msg = this.smsList[this.smsIdx] || this.smsList[0];
    const bannerSpans = PIC_BANNERS[msg.artKey] || PIC_BANNERS.COFFEE;
    const meta = getProviderMeta(this.byokConfig.activeProvider);

    return (
      <View style={styles.listWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: fg }]} numberOfLines={1}>
            ✉ {this.smsIdx + 1}/{this.smsList.length} {msg.sender}
          </Text>
          <Text style={[styles.compBpm, { color: fg }]}>[{msg.title}]</Text>
        </View>

        {/* Wide 72x20 (36x10 @ 2px) Authentic Nokia 3310 Picture Message Card */}
        <View style={[styles.compStaff, { borderColor: fg, alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={[styles.picBannerBox, { borderColor: fg }]}>
            {bannerSpans.map((s) => (
              <View
                key={s.key}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: s.w,
                  height: s.h,
                  backgroundColor: fg,
                }}
              />
            ))}
          </View>

          <Text style={[styles.smsBodyTxt, { color: fg }]} numberOfLines={3}>
            {msg.text}
          </Text>
        </View>

        <Text style={[styles.miniHint, { color: fg, textAlign: 'center' }]} numberOfLines={1}>
          {this.smsBannerTimer > 0
            ? this.smsBanner
            : `[A] SEND PIC-SMS TO ${meta.shortName} & GET REPLY`}
        </Text>
      </View>
    );
  }

  private renderProfiles(fg: string, bg: string) {
    const rows = [
      `PROFILE: < ${NOKIA_PROFILES[this.profileIdx]} >`,
      `OPERATOR: < ${NOKIA_OPERATORS[this.operatorIdx]} >`,
      'KEYGUARD & CLOCK SCREENSAVER (* TO UNLOCK)',
      `TORCH / INVERT LCD: ${this.torchInvert ? 'ON' : 'OFF'}`,
    ];
    return (
      <View style={styles.listWrap}>
        <Text style={[styles.subHeader, { color: fg }]}>NOKIA 3310 PROFILES & KEYGUARD</Text>
        {rows.map((label, i) => {
          const sel = i === this.profRow;
          return (
            <View
              key={i}
              style={[
                styles.setupRow,
                { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
              ]}
            >
              <Text style={[styles.setupTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                {sel ? '> ' : '  '}
                {label}
              </Text>
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
          <Text style={[styles.emptyTxt, { color: fg }]}>
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
        <View
          style={[
            styles.termScreen,
            {
              borderColor: fg,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          {this.termShowLogo && (
            <View style={[styles.neoConsole, { borderColor: fg }]}>
              <View style={[styles.neoLcd, { borderColor: fg, backgroundColor: fg }]}>
                <Text style={[styles.neoLcdTxt, { color: bg }]}>RD-OS</Text>
              </View>
              <View style={styles.neoControls}>
                <View style={styles.neoDpad}>
                  <View style={[styles.neoDpadV, { backgroundColor: fg }]} />
                  <View style={[styles.neoDpadH, { backgroundColor: fg }]} />
                </View>
                <View style={styles.neoBtns}>
                  <View style={[styles.neoBtnDot, { backgroundColor: fg }]} />
                  <View style={[styles.neoBtnDot, { backgroundColor: fg, marginTop: -4 }]} />
                </View>
              </View>
            </View>
          )}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {this.termOut.map((line, i) => (
              <Text key={i} style={[styles.termLine, { color: fg }]} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.termCmds}>
          {TERM_CMDS.map((cmd, i) => {
            const sel = i === this.termIdx;
            return (
              <View
                key={cmd}
                style={[
                  styles.termRow,
                  { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                ]}
              >
                <Text style={[styles.termCmdTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                  {sel ? '>' : ''}
                  {cmd}
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
              <Text style={[styles.setupTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
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
    padding: 2,
  },
  deskTile: {
    width: '23.5%',
    height: '30.5%',
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pixelIconBox: {
    width: 22,
    height: 14,
    marginBottom: 2,
  },
  deskLbl: {
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: 'monospace',
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
  aiTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 5,
  },
  aiTabPill: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 3,
    alignItems: 'center',
  },
  aiTabTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  aiChatBox: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'flex-start',
    marginBottom: 5,
  },
  aiChatLine: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  aiPromptBar: {
    height: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  aiPromptTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  calcWrap: {
    flex: 1,
    paddingHorizontal: 8,
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
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  calcModeTag: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  calcNum: {
    fontSize: 13,
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
  calcKey5: {
    width: '18.5%',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockBig: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  clockDate: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  swBox: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 5,
    alignItems: 'center',
    marginBottom: 6,
  },
  swLbl: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  swTime: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  swLap: {
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  compTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  compBpm: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  compStaff: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginBottom: 4,
    overflow: 'hidden',
  },
  picBannerBox: {
    width: 72,
    height: 20,
    alignSelf: 'center',
    marginVertical: 2,
  },
  smsBodyTxt: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  compTokensWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  compTokPill: {
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  compTokTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  compKeypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  compKey: {
    width: '24%',
    borderWidth: 1,
    paddingVertical: 3,
    marginBottom: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compKeyTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  miniHint: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  paintBoard: {
    borderWidth: 2,
  },
  statRule: {
    height: 1.5,
    marginBottom: 6,
  },
  termScreen: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  neoConsole: {
    width: 48,
    height: 66,
    borderWidth: 2,
    borderRadius: 4,
    padding: 3,
    marginRight: 8,
    justifyContent: 'space-between',
  },
  neoLcd: {
    height: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  neoLcdTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  neoControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 22,
  },
  neoDpad: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  neoDpadV: {
    position: 'absolute',
    width: 4,
    height: 12,
  },
  neoDpadH: {
    position: 'absolute',
    width: 12,
    height: 4,
  },
  neoBtns: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  neoBtnDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  termLine: {
    fontSize: 8.5,
    lineHeight: 11.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  termCmds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  termRow: {
    width: '32%',
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 2,
    alignItems: 'center',
  },
  termCmdTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  setupRow: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  emptyTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 18,
    textAlign: 'center',
  },
});
