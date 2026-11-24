import React from 'react';
import { View, Text, Pressable, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { Ionicons } from '@expo/vector-icons';
import {
  ArcadeCartridgeDef,
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
} from '../arcade/types';
import { isCartridgeProLocked } from '../arcade/cartridges';
import {
  PALETTE_ORDER,
  RETRO_PALETTES,
  RetroPalette,
  RetroPaletteId,
  isPaletteProLocked,
} from '../theme/palettes';
import {
  NokiaNoteEvent,
  RetroAudioEngine,
  KEYPAD_SOUND_STYLES,
} from '../audio/RetroAudioEngine';
import {
  somaRadioService,
  SOMA_CHANNELS,
  SomaChannel,
} from '../services/somaRadioService';
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
  onSelectPalette?: (id: RetroPaletteId) => void;
  getPaletteId?: () => RetroPaletteId;
  onToggleScanlines: () => void;
  getPaletteName: () => string;
  getScanlines: () => boolean;
  onRequestKeyboard?: (open: boolean) => void;
  onPlaySound?: (sound: ArcadeSound) => void;
  getIsPro?: () => boolean;
  onOpenPaywall?: () => void;
  onOpenCustomerCenter?: () => void;
  onPurchasePackage?: (type: 'monthly' | 'yearly' | 'lifetime') => Promise<{ success: boolean; isPro: boolean; userCancelled?: boolean }>;
  onRestorePurchases?: () => Promise<boolean>;
  onResetProDebug?: () => Promise<void>;
  getProPackages?: () => { type: 'monthly' | 'yearly' | 'lifetime'; title: string; priceString: string; badge?: string }[];
  getProExpirationDate?: () => string | null;
}


import { styles } from './retroOsStyles';
import {
  renderAnalogDial,
  renderStatusLeft,
  renderStatusRight,
  renderDesktop,
  renderArcadeBrowser,
  renderSetup,
  renderThemes,
  renderPro,
} from './render/renderCoreApps';
import {
  renderWap,
  renderAiApp,
  renderPhone,
  renderSms,
  renderProfiles,
} from './render/renderCommsApps';
import {
  renderRadio,
  renderCalc,
  renderClock,
  renderSynth,
  renderPaint,
  renderWeather,
  renderNotes,
  renderStats,
  renderTerm,
} from './render/renderMediaToolApps';
import { pushTermLinesImpl, execTermCmdImpl } from './engine/retroOsShell';
import {
  triggerLivePersonaSmsImpl,
  executeAiActionsImpl,
  sendAiMessageImpl,
  sendPictureSmsToAiImpl,
  fetchWapPageImpl,
  fetchWeatherImpl,
} from './engine/retroOsAiAndNet';
import {
  getControlsHintImpl,
  getKeyboardBindingImpl,
  setKeyboardTextImpl,
  submitKeyboardImpl,
} from './engine/retroOsKeyboard';
import {
  executePhoneKeyImpl,
  pressNumericKeyImpl,
  updateOsFrameImpl,
} from './engine/retroOsInput';
import {
  CLOCK_FACE_STORAGE_KEY,
  WEATHER_CITY_STORAGE_KEY,
  NOTES_STORAGE_KEY,
  MY_TUNES_STORAGE_KEY,
  SMS_TONE_STORAGE_KEY,
  SMS_LIST_STORAGE_KEY,
  LIVE_AI_SMS_STORAGE_KEY,
  LIVE_SMS_HISTORY_STORAGE_KEY,
  DYNAMIC_MOODS,
  UNEXPECTED_TWISTS,
  DEFAULT_CUSTOM_TUNES,
  OsAppId,
  PixelSpan,
  DESKTOP_ICONS,
  WEATHER_CITIES,
  WeatherSpriteKey,
  WEATHER_SPRITES,
  decodeWmoWeather,
  PixelNoteItem,
  DEFAULT_NOTES,
  WAP_BOOKMARKS,
  parseHtmlToWapLines,
  PicArtKey,
  ALL_PIC_ART_KEYS,
  PIC_BANNERS,
  NokiaPicSms,
  LiveSmsPersona,
  LIVE_SMS_PERSONAS,
  REAL_POSTCARDS,
  POSTCARD_STAMPS,
  INITIAL_PIC_MESSAGES,
  DIAL_KEYS,
  NOKIA_PROFILES,
  NOKIA_OPERATORS,
  NokiaSong,
  NOKIA_SONGS,
  NOKIA_SMS_TONES,
  COMPOSER_KEYS,
  CALC_KEYS,
  TERM_PRESETS,
  PAINT_ARTWORKS,
  stripEmojis,
  stripMarkdownForLcd,
  wrapTextLines,
} from './retroOsData';

export type { PicArtKey } from './retroOsData';

export class RetroDeckOS implements ArcadeGameInstance {
  /** @internal */ cb: RetroDeckOSCallbacks;
  /** @internal */ app: OsAppId = 'boot';
  /** @internal */ bootTimer = 0;
  /** @internal */ uptime = 0;

  // Keyguard & Screensaver state
  /** @internal */ keyLocked = false;
  /** @internal */ unlockStage = false; // true after pressing A once while locked ("NOW PRESS * / UP")
  /** @internal */ unlockHintTimer = 0;
  /** @internal */ idleTimer = 0;

  // Input edge / repeat
  /** @internal */ moveCd = 0;
  /** @internal */ prevA = false;
  /** @internal */ prevB = false;
  /** @internal */ prevUp = false;
  /** @internal */ prevDown = false;
  /** @internal */ prevLeft = false;
  /** @internal */ prevRight = false;

  // Desktop 4x3 cursor
  /** @internal */ deskIdx = 0;

  // In-LCD Arcade Browser
  /** @internal */ gameIdx = 0;

  /** @internal */ playActiveSmsTone() {
    const smsTone = NOKIA_SMS_TONES[this.smsToneIdx] || NOKIA_SMS_TONES[0];
    RetroAudioEngine.playNokiaMelody(smsTone.notes, smsTone.bpm);
  }

  /** @internal */ triggerPurchaseFailedSms(reason: string) {
    this.smsList.unshift({
      sender: 'BANK-RD8',
      title: 'PAYMENT FAILED',
      text: `DEAR USER, YOUR PURCHASE OF RETRODECK PRO COULD NOT BE COMPLETED (${reason.toUpperCase()}). PLEASE CHECK YOUR CARD & RETRY!`,
      artKey: 'SAD',
    });
    if (this.smsList.length > 10) this.smsList.pop();
    this.smsIdx = 0;
    this.smsBanner = '✉ NEW SMS: PURCHASE FAILED!';
    this.smsBannerTimer = 5.0;
    if (this.app !== 'sms' || this.keyLocked) this.unreadSmsCount += 1;
    this.saveSmsList();
    this.playActiveSmsTone();
  }

  /** @internal */ triggerPurchaseSuccessSms(planName: string) {
    this.smsList.unshift({
      sender: 'RETRODECK-VIP',
      title: 'PRO ACTIVATED!',
      text: `CONGRATS! RETRODECK PRO (${planName.toUpperCase()}) IS NOW ACTIVE! ALL 100 CARTS, DEV VAULT & PRO THEMES UNLOCKED!`,
      artKey: 'VIP_CROWN',
    });
    if (this.smsList.length > 10) this.smsList.pop();
    this.smsIdx = 0;
    this.smsBanner = '✉ NEW SMS: WELCOME TO PRO!';
    this.smsBannerTimer = 5.0;
    if (this.app !== 'sms' || this.keyLocked) this.unreadSmsCount += 1;
    this.saveSmsList();
    this.playActiveSmsTone();
  }

  // AI & BYOK state
  /** @internal */ byokConfig: BYOKConfig = { ...DEFAULT_BYOK_CONFIG };
  /** @internal */ aiTab: 'chat' | 'byok' = 'chat';
  /** @internal */ byokRow = 0;
  /** @internal */ kbdTarget: 'chat' | 'key' | 'model' = 'chat';
  /** @internal */ aiPrompt = '';
  /** @internal */ aiLoading = false;
  /** @internal */ aiStatus = 'READY';
  /** @internal */ chatClearConfirm = false;
  /** @internal */ chatHistory: BYOKChatMessage[] = [];
  /** @internal */ chatLines: string[] = [
    'AI> WELCOME TO RETRODECK AI!',
    'AI> PRESS [KBD] OR [A] TO TYPE,',
    'AI> OR [RIGHT] FOR BYOK KEYS.',
  ];
  /** @internal */ chatScroll = 0;

  // Calculator state
  /** @internal */ calcR = 0;
  /** @internal */ calcC = 0;
  /** @internal */ calcDisplay = '0';
  /** @internal */ calcAcc: number | null = null;
  /** @internal */ calcOp: string | null = null;
  /** @internal */ calcFresh = true;

  // Clock / Stopwatch / Countdown Timer state
  /** @internal */ clockTab: 'clk' | 'sw' | 'cd' = 'clk';
  /** @internal */ clockFace: 'analog' | 'digital' = 'analog';
  /** @internal */ swRunning = false;
  /** @internal */ swTime = 0;
  /** @internal */ swLap = 0;
  /** @internal */ cdRunning = false;
  /** @internal */ cdPresetSec = 30;
  /** @internal */ cdRemaining = 30;
  /** @internal */ cdAlarmActive = false;

  // Nokia 3310 Composer / Music state
  /** @internal */ synthIdx = 0;
  /** @internal */ synthMode: 'pad' | 'list' = 'pad';
  /** @internal */ synthListIdx = 0;
  /** @internal */ synthClearConfirm = false;
  /** @internal */ tuneNameDraft = '';
  /** @internal */ songIdx = 0;
  /** @internal */ songs: NokiaSong[] = [
    ...NOKIA_SONGS.map((s) => ({ ...s })),
    ...DEFAULT_CUSTOM_TUNES.map((s) => ({ ...s })),
  ];
  /** @internal */ melodyPlaying = false;
  /** @internal */ melodyTimer = 0;
  /** @internal */ melodyDuration = 0;
  /** @internal */ melodyEvents: NokiaNoteEvent[] = [];

  // Pixel Paint 16x10
  /** @internal */ paintW = 16;
  /** @internal */ paintH = 10;
  /** @internal */ paintArtIdx = 0;
  /** @internal */ paintTitle = PAINT_ARTWORKS[0].title;
  /** @internal */ paintGrid: boolean[][] = [];
  /** @internal */ paintR = 4;
  /** @internal */ paintC = 7;
  /** @internal */ paintOnBar = false;
  /** @internal */ paintBarIdx = 1; // 0: ◀ ART, 1: ART ▶, 2: INV, 3: CLR

  // Nokia WAP 1.1 Browser state
  /** @internal */ wapUrl = 'https://www.metaframelabs.space/';
  /** @internal */ wapBookmarkIdx = 0;
  /** @internal */ wapLoading = false;
  /** @internal */ wapScroll = 0;
  /** @internal */ wapFetchedOnce = false;
  /** @internal */ wapLines: string[] = [
    '=== METAFRAME LABS ===',
    '// AI-NATIVE · PRIVACY-FIRST',
    "[ WE DON'T BUILD WEBSITES. ]",
    '[ WE BUILD MINDS. ]',
    'MetaFrame Labs turns data,',
    'intelligence & ideas into',
    'real-world AI products.',
    '• 7 products on Google Play',
    '• 100% privacy-first design',
    '• 1 mission: ideas -> products',
    '[A]: ENTER URL  [◀/▶]: SITES',
  ];

  // Real Interactive Shell (rdsh) state
  /** @internal */ termIdx = -1;
  /** @internal */ termCwd = '/home';
  /** @internal */ termInput = '';
  /** @internal */ termScroll = 0;
  /** @internal */ termShowLogo = true;
  /** @internal */ termOut: string[] = [
    'root@retrodeck',
    '------------------',
    'OS: RetroDeck v1.2',
    'CPU: ARM64 @ 60Hz',
    'ROMS: 100 + BYOK AI',
    'TYPE "help" OR [KBD]',
  ];

  // Setup state
  /** @internal */ setupIdx = 0;

  // In-LCD Themes Browser state
  /** @internal */ themeIdx = 0;

  // RetroDeck Pro In-LCD App state
  /** @internal */ proIdx = 0; // 0: Monthly, 1: Yearly, 2: Lifetime, 3: Restore Purchases
  /** @internal */ proStatusMsg = '';
  /** @internal */ proBusy = false;

  // Nokia 3310 Phone / SMS / Profiles state
  /** @internal */ dialR = 0;
  /** @internal */ dialC = 0;
  /** @internal */ dialBuffer = '';
  /** @internal */ isNumericDeckActive = false;
  /** @internal */ callState: 'idle' | 'ringing' | 'connected' | 'info' | 'warranty' = 'idle';
  /** @internal */ warrantyPage = 0;
  /** @internal */ callTitle = '';
  /** @internal */ callSub = '';
  /** @internal */ callTimer = 0;
  /** @internal */ ringRepeatTimer = 0;
  /** @internal */ ringDuration = 0;

  /** @internal */ smsList: NokiaPicSms[] = INITIAL_PIC_MESSAGES.map((m) => ({ ...m }));
  /** @internal */ smsIdx = 0;
  /** @internal */ smsBanner = '';
  /** @internal */ smsBannerTimer = 0;
  /** @internal */ unreadSmsCount = 0;
  /** @internal */ smsSendingAi = false;
  /** @internal */ smsDeleteConfirm = false;
  /** @internal */ smsMode: 'inbox' | 'compose' = 'inbox';
  /** @internal */ smsStudioTab: 'art' | 'stamps' = 'art';
  /** @internal */ smsArtIdx = 0;
  /** @internal */ smsStampIdx = 0;
  /** @internal */ smsDraftText = '';
  /** @internal */ smsReplyTargetIdx: number | null = null;
  /** @internal */ liveAiSmsEnabled = true;
  /** @internal */ liveSmsTimer = 80;
  /** @internal */ liveSmsFetching = false;
  /** @internal */ personaHistories: Record<string, { role: 'user' | 'assistant'; content: string }[]> = {};

  /** @internal */ profRow = 0;
  /** @internal */ profileIdx = 0;
  /** @internal */ ringtoneIdx = 0;
  /** @internal */ smsToneIdx = 0;
  /** @internal */ operatorIdx = 0;
  /** @internal */ torchInvert = false;

  // Device battery telemetry for OS status bar
  /** @internal */ batteryPct: number | null = null;
  /** @internal */ batteryCharging = false;
  /** @internal */ batteryPollTimer = 0;

  // Live Weather state (Open-Meteo, zero API key required)
  /** @internal */ weatherCityIdx = 0;
  /** @internal */ weatherQuery = 'Palo Alto';
  /** @internal */ weatherLoading = false;
  /** @internal */ weatherFetchedOnce = false;
  /** @internal */ weatherError = '';
  /** @internal */ weatherData: {
    city: string;
    region: string;
    country: string;
    tempC: number;
    feelsC: number;
    humidity: number;
    windKmh: number;
    code: number;
    daily: { minC: number; maxC: number; code: number }[];
  } | null = null;

  // Persistent Pixel Notepad state
  /** @internal */ notes: PixelNoteItem[] = DEFAULT_NOTES.map((n) => ({ ...n }));
  /** @internal */ noteIdx = 0;
  /** @internal */ noteDraft = '';
  /** @internal */ noteDeleteConfirm = false;

  constructor(cb: RetroDeckOSCallbacks) {
    this.cb = cb;
    this.clearCanvas();
    this.refreshBattery();
    loadBYOKConfig().then((cfg) => {
      this.byokConfig = cfg;
    });
    AsyncStorage.getItem(CLOCK_FACE_STORAGE_KEY)
      .then((val) => {
        if (val === 'analog' || val === 'digital') {
          this.clockFace = val;
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(WEATHER_CITY_STORAGE_KEY)
      .then((city) => {
        if (city && city.trim()) {
          this.weatherQuery = city.trim();
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(NOTES_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.notes = parsed;
          }
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(MY_TUNES_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (let i = 0; i < DEFAULT_CUSTOM_TUNES.length; i++) {
              const saved = parsed[i];
              if (saved && typeof saved.notes === 'string') {
                this.songs[NOKIA_SONGS.length + i] = {
                  title: saved.title || DEFAULT_CUSTOM_TUNES[i].title,
                  bpm: typeof saved.bpm === 'number' ? saved.bpm : 140,
                  notes: saved.notes,
                };
              }
            }
          }
        }
      })
    AsyncStorage.getItem(SMS_TONE_STORAGE_KEY)
      .then((val) => {
        const idx = val ? parseInt(val, 10) : NaN;
        if (!isNaN(idx) && idx >= 0 && idx < NOKIA_SMS_TONES.length) {
          this.smsToneIdx = idx;
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(SMS_LIST_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.smsList = parsed;
            this.smsIdx = 0;
          }
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(LIVE_AI_SMS_STORAGE_KEY)
      .then((val) => {
        if (val === '0' || val === '1') {
          this.liveAiSmsEnabled = val === '1';
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(LIVE_SMS_HISTORY_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.personaHistories = parsed;
          }
        }
      })
      .catch(() => {});
  }

  /** @internal */ savePersonaHistories() {
    AsyncStorage.setItem(LIVE_SMS_HISTORY_STORAGE_KEY, JSON.stringify(this.personaHistories)).catch(() => {});
  }

  /** @internal */ toggleLiveAiSms() {
    this.liveAiSmsEnabled = !this.liveAiSmsEnabled;
    AsyncStorage.setItem(LIVE_AI_SMS_STORAGE_KEY, this.liveAiSmsEnabled ? '1' : '0').catch(() => {});
  }

  /** @internal */ async triggerLivePersonaSms(forcedPersonaId?: string, userReply?: string): Promise<boolean> {
    return triggerLivePersonaSmsImpl(this, forcedPersonaId, userReply);
  }

  /** @internal */ saveSmsList() {
    AsyncStorage.setItem(SMS_LIST_STORAGE_KEY, JSON.stringify(this.smsList)).catch(() => {});
  }

  /** @internal */ isCustomTune(idx = this.songIdx): boolean {
    return idx >= NOKIA_SONGS.length;
  }

  /** @internal */ saveCustomTunes() {
    const custom = this.songs.slice(NOKIA_SONGS.length);
    AsyncStorage.setItem(MY_TUNES_STORAGE_KEY, JSON.stringify(custom)).catch(() => {});
  }

  /** @internal */ toggleClockFace() {
    this.clockFace = this.clockFace === 'analog' ? 'digital' : 'analog';
    AsyncStorage.setItem(CLOCK_FACE_STORAGE_KEY, this.clockFace).catch(() => {});
  }

  /** @internal */ async refreshBattery() {
    try {
      const state = await Battery.getPowerStateAsync();
      if (typeof state.batteryLevel === 'number' && state.batteryLevel >= 0 && state.batteryLevel <= 1) {
        this.batteryPct = Math.round(state.batteryLevel * 100);
      } else {
        this.batteryPct = null;
      }
      this.batteryCharging =
        state.batteryState === Battery.BatteryState.CHARGING ||
        state.batteryState === Battery.BatteryState.FULL;
    } catch {
      this.batteryPct = null;
      this.batteryCharging = false;
    }
  }

  /** @internal */ clearCanvas(blank = false) {
    if (blank) {
      this.paintTitle = 'BLANK CANVAS';
      this.paintGrid = Array.from({ length: this.paintH }, () =>
        Array(this.paintW).fill(false)
      );
      return;
    }
    const art = PAINT_ARTWORKS[this.paintArtIdx] || PAINT_ARTWORKS[0];
    this.paintTitle = art.title;
    this.paintGrid = Array.from({ length: this.paintH }, (_, r) =>
      Array.from({ length: this.paintW }, (_, c) => art.rows[r]?.[c] === '#')
    );
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

  public openProScreen(statusMsg = '') {
    this.app = 'pro';
    this.proIdx = 0;
    this.proStatusMsg = statusMsg;
    this.keyLocked = false;
    this.unlockStage = false;
    this.idleTimer = 0;
    this.prevA = true;
    this.prevB = true;
    this.cb.onRequestKeyboard?.(false);
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
    if (this.keyLocked) return 'RD-OS KEYGUARD';
    if (this.app === 'boot') return 'BIOS BOOT';
    if (this.app === 'desktop') return 'RETRODECK OS';
    if (this.app === 'radio') {
      const ch = somaRadioService.getChannel();
      return `FM ${ch.freq} // ${ch.name}`;
    }
    if (this.app === 'synth') return 'RD COMPOSER';
    if (this.app === 'sms') return 'RD PIC-SMS';
    if (this.app === 'wap') return 'RETRO WAP 1.1';
    if (this.app === 'ai') {
      const meta = getProviderMeta(this.byokConfig.activeProvider);
      return `RD-AI // ${meta.shortName}`;
    }
    return `RD-OS // ${this.app.toUpperCase()}`;
  }

  public getControlsHint(): string {
    return getControlsHintImpl(this);
  }

  public getKeyboardBinding(): {
    targetLabel: string;
    value: string;
    placeholder: string;
    secure: boolean;
  } {
    return getKeyboardBindingImpl(this);
  }

  public setKeyboardText(next: string) {
    setKeyboardTextImpl(this, next);
  }

  public submitKeyboard() {
    submitKeyboardImpl(this);
  }

  /** @internal */ executePhoneKey(k: string): ArcadeSound | null {
    return executePhoneKeyImpl(this, k);
  }

  public setNumericDeckActive(active: boolean) {
    this.isNumericDeckActive = active;
  }

  public pressNavDir(dir: 'up' | 'down' | 'left' | 'right') {
    this.idleTimer = 0;
    this.prevUp = false;
    this.prevDown = false;
    this.prevLeft = false;
    this.prevRight = false;
    this.moveCd = 0;
    const s = this.update(
      {
        up: dir === 'up',
        down: dir === 'down',
        left: dir === 'left',
        right: dir === 'right',
        a: false,
        b: false,
      },
      1 / 60
    );
    if (s) this.cb.onPlaySound?.(s);
  }

  public pressNumericKey(key: string) {
    pressNumericKeyImpl(this, key);
  }

  /** @internal */ appendChatLines(prefix: string, text: string) {
    const wrapped = wrapTextLines(`${prefix} ${text}`, 33);
    this.chatLines.push(...wrapped);
    if (this.chatLines.length > 60) {
      this.chatLines = this.chatLines.slice(this.chatLines.length - 60);
    }
    this.chatScroll = Math.max(0, this.chatLines.length - 6);
  }

  /** @internal */ executeAiActions(rawReply: string): { displayText: string; actionLogs: string[] } {
    return executeAiActionsImpl(this, rawReply);
  }

  /** @internal */ clearAiChat() {
    this.chatHistory = [];
    this.chatLines = [
      'AI> CHAT CLEARED! READY.',
      'AI> PRESS [A] TO TYPE OR [▶] FOR BYOK.',
    ];
    this.chatScroll = 0;
    this.aiStatus = 'CLEARED';
    this.chatClearConfirm = false;
  }

  /** @internal */ async sendAiMessage() {
    return sendAiMessageImpl(this);
  }

  /** Sends a Nokia 3310 Picture Message to Groq / Active BYOK AI and receives a Picture SMS back! */
  /** @internal */ async sendPictureSmsToAi() {
    return sendPictureSmsToAiImpl(this);
  }

  /** @internal */ async fetchWapPage(rawUrl: string) {
    return fetchWapPageImpl(this, rawUrl);
  }

  /** @internal */ saveNotes() {
    AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.notes)).catch(() => {});
  }

  /** @internal */ async fetchWeather(rawCity: string) {
    return fetchWeatherImpl(this, rawCity);
  }

  /** @internal */ cycleProvider(delta: number) {
    const idx = BYOK_PROVIDERS.findIndex((p) => p.id === this.byokConfig.activeProvider);
    const nextIdx = (idx + delta + BYOK_PROVIDERS.length) % BYOK_PROVIDERS.length;
    this.byokConfig = {
      ...this.byokConfig,
      activeProvider: BYOK_PROVIDERS[nextIdx].id,
    };
    saveBYOKConfig(this.byokConfig);
  }

  public update(input: ArcadeInput, dt: number): ArcadeSound | null {
    return updateOsFrameImpl(this, input, dt);
  }

  /** @internal */ pressCalcKey(k: string) {
    if (k === 'DEL') {
      if (this.calcFresh) return;
      this.calcDisplay =
        this.calcDisplay.length > 1 ? this.calcDisplay.slice(0, -1) : '0';
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

  /** @internal */ pushTermLines(lines: string[], showLogo = false) {
    pushTermLinesImpl(this, lines, showLogo);
  }

  /** @internal */ execTermCmd(rawCmd: string): ArcadeSound {
    return execTermCmdImpl(this, rawCmd);
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

  /** @internal */ formatClock(): string {
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
          <Text style={[styles.bootSub, { color: fg }]}>RETRODECK OS KERNEL v1.2</Text>
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
            {renderStatusLeft(this, bg)}
            <Text style={[styles.osBarTxt, { color: bg }]}>[KEYGUARD]</Text>
            {renderStatusRight(this, bg)}
          </View>

          <View style={[styles.centerBox, { transform: [{ translateY: driftY }] }]}>
            {this.clockFace === 'analog' ? (
              <View
                style={[
                  styles.swBox,
                  {
                    borderColor: fg,
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  },
                ]}
              >
                {renderAnalogDial(fg, 76)}
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={[styles.swLbl, { color: fg }]}>
                    {NOKIA_OPERATORS[this.operatorIdx]} // RD-OS
                  </Text>
                  <Text style={[styles.swTime, { color: fg, fontSize: 16, marginVertical: 2 }]}>
                    {hh}:{mm}:{ss}
                  </Text>
                  <Text style={[styles.swLap, { color: fg }]}>
                    KEYGUARD ({NOKIA_PROFILES[this.profileIdx]})
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.swBox, { borderColor: fg, paddingHorizontal: 22, paddingVertical: 10 }]}>
                <Text style={[styles.swLbl, { color: fg }]}>
                  {NOKIA_OPERATORS[this.operatorIdx]} // RD-OS
                </Text>
                <Text style={[styles.clockBig, { color: fg }]}>
                  {hh}:{mm}:{ss}
                </Text>
                <Text style={[styles.swLap, { color: fg }]}>
                  KEYGUARD LOCKED ({NOKIA_PROFILES[this.profileIdx]})
                </Text>
              </View>
            )}

            {(this.unreadSmsCount > 0 || this.smsBannerTimer > 0) && (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: fg,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Ionicons name="mail" size={11} color={bg} />
                <Text
                  style={{
                    color: bg,
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontSize: 9,
                    fontWeight: '900',
                  }}
                >
                  {this.smsBannerTimer > 0
                    ? this.smsBanner.replace('✉ ', '')
                    : `${this.unreadSmsCount} NEW MESSAGE${this.unreadSmsCount > 1 ? 'S' : ''}`}
                </Text>
              </View>
            )}
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
          {this.app === 'desktop' ? (
            renderStatusLeft(this, bg)
          ) : (
            <Text style={[styles.osBarTxt, { color: bg }]}>{`< ${this.app.toUpperCase()}`}</Text>
          )}
          <Text style={[styles.osBarTxt, { color: bg }]}>{this.formatClock()}</Text>
          {renderStatusRight(this, bg)}
        </View>

        {/* Body */}
        <View style={styles.osBody}>
          {this.app === 'desktop' && renderDesktop(this, fg, bg)}
          {this.app === 'arcade' && renderArcadeBrowser(this, fg, bg)}
          {this.app === 'radio' && renderRadio(this, fg, bg)}
          {this.app === 'ai' && renderAiApp(this, fg, bg)}
          {this.app === 'wap' && renderWap(this, fg, bg)}
          {this.app === 'synth' && renderSynth(this, fg, bg)}
          {this.app === 'phone' && renderPhone(this, fg, bg)}
          {this.app === 'sms' && renderSms(this, fg, bg)}
          {this.app === 'profiles' && renderProfiles(this, fg, bg)}
          {this.app === 'calc' && renderCalc(this, fg, bg)}
          {this.app === 'clock' && renderClock(this, fg, bg)}
          {this.app === 'paint' && renderPaint(this, fg, bg)}
          {this.app === 'weather' && renderWeather(this, fg, bg)}
          {this.app === 'notes' && renderNotes(this, fg, bg)}
          {this.app === 'stats' && renderStats(this, fg, bg)}
          {this.app === 'term' && renderTerm(this, fg, bg)}
          {this.app === 'setup' && renderSetup(this, fg, bg)}
          {this.app === 'themes' && renderThemes(this, fg, bg)}
          {this.app === 'pro' && renderPro(this, fg, bg)}

          {/* Global Nokia 3310 SMS Notification Overlay Banner */}
          {this.smsBannerTimer > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                left: 6,
                right: 6,
                backgroundColor: fg,
                borderWidth: 1,
                borderColor: bg,
                paddingVertical: 3,
                paddingHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  color: bg,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  fontSize: 8.5,
                  fontWeight: '900',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {this.smsBanner}
              </Text>
            </View>
          )}
        </View>

        {/* OS Footer Taskbar */}
        <View style={[styles.osFooter, { borderTopColor: fg }]}>
          <Text style={[styles.footerTxt, { color: fg }]} numberOfLines={1}>
            {this.app === 'desktop'
              ? '[A] OPEN   [D-PAD] MOVE   [KBD] KEYBOARD'
              : this.app === 'radio'
              ? '[A] PLAY/STOP   [◀/▶] STATION   [▲/▼] VOL   [B] DESKTOP'
              : this.app === 'ai'
              ? '[A] KBD/SEND   [◀/▶] TAB   [B] DESKTOP'
              : this.app === 'sms'
              ? '[◀/▶] READ   [▼]x2/DEL DELETE   [A] AI REPLY   [B] DESKTOP'
              : this.app === 'weather'
              ? '[◀/▶] CITY   [▲/▼] REFRESH   [A] SEARCH   [B] DESKTOP'
              : this.app === 'notes'
              ? '[A] NEW NOTE   [▲/▼] SELECT   [▶]x2 DELETE   [B] DESKTOP'
              : this.app === 'paint'
              ? '[A] PIXEL / SELECT   [D-PAD] DRAW & TOOLBAR   [B] EXIT'
              : '[A] ACTION   [B] DESKTOP'}
          </Text>
        </View>
      </View>
    );
  }
}
