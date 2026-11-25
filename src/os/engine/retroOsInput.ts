import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArcadeInput, ArcadeSound } from '../../arcade/types';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { PALETTE_ORDER, isPaletteProLocked } from '../../theme/palettes';
import { RetroAudioEngine, KEYPAD_SOUND_STYLES } from '../../audio/RetroAudioEngine';
import { somaRadioService, SOMA_CHANNELS } from '../../services/somaRadioService';
import {
  CALC_KEYS,
  COMPOSER_KEYS,
  DESKTOP_ICONS,
  DESKTOP_MENU_STYLES,
  DIAL_KEYS,
  LIVE_SMS_PERSONAS,
  MENU_STYLE_STORAGE_KEY,
  NOKIA_OPERATORS,
  NOKIA_PROFILES,
  NOKIA_SMS_TONES,
  NOKIA_SONGS,
  PAINT_ARTWORKS,
  POSTCARD_STAMPS,
  REAL_POSTCARDS,
  SMS_TONE_STORAGE_KEY,
  TERM_PRESETS,
  WAP_BOOKMARKS,
  WEATHER_CITIES,
} from '../retroOsData';
import { tOs } from '../../i18n/retroI18n';
import { rollAutonomousSmsIntervalSec } from './autonomousSmsSim';
import {
  dismissPostFormatWinActivation,
  openFormatSimulator,
  startPostFormatWinCountdownOnDesktopEntry,
  syncPostFormatWinTimer,
  updateFormatSimFrame,
} from './formatSimEngine';
import type { RetroDeckOS } from '../RetroDeckOS';

export function executePhoneKeyImpl(os: RetroDeckOS, k: string): ArcadeSound | null {
  if (k === 'CLR') {
    os.dialBuffer = os.dialBuffer.slice(0, -1);
    return 'hit';
  }
  if (k === 'LOCK') {
    os.keyLocked = true;
    os.unlockStage = false;
    return 'score';
  }
  if (k === 'RING') {
    const activeRing = os.songs[os.ringtoneIdx] || os.songs[0];
    os.callState = 'ringing';
    os.callTitle = 'RETRODECK CALLING';
    os.callSub = `♪ ${activeRing.title.trim()}`;
    const res = RetroAudioEngine.playNokiaMelody(activeRing.notes, activeRing.bpm);
    os.ringRepeatTimer = 0;
    os.ringDuration = res.totalSec > 0 ? res.totalSec : 2.5;
    return null;
  }
  if (k === 'CALL') {
    const num = os.dialBuffer || '0532-3310';
    const norm = num.replace(/\D/g, '');
    const matched = os
      .getAllContacts()
      .find((c) => c.number === num || (norm.length >= 3 && c.number.replace(/\D/g, '') === norm));
    os.callState = 'connected';
    os.callTitle = matched ? matched.name : `CALLING ${num}`;
    os.callSub = matched ? matched.number : 'VOICE LINE ACTIVE';
    os.callTimer = 0;
    return 'powerup';
  }
  if (os.dialBuffer.length < 16) {
    os.dialBuffer += k;
  }
  RetroAudioEngine.playDialKey(k);
  if (os.dialBuffer === '*#0000#') {
    os.callState = 'info';
    os.callTitle = 'V 05.57  23-11-26';
    os.callSub = 'NHM-5NX (c) NOKIA';
    os.dialBuffer = '';
  } else if (os.dialBuffer === '*#06#') {
    os.callState = 'info';
    os.callTitle = 'IMEI SERIAL NO:';
    os.callSub = '350993-10-331000-8';
    os.dialBuffer = '';
  } else if (os.dialBuffer === '*#92702689#') {
    os.callState = 'warranty';
    os.warrantyPage = 0;
    os.dialBuffer = '';
    return 'powerup';
  } else if (os.dialBuffer === '*#7780#') {
    os.callState = 'info';
    os.callTitle = 'FACTORY RESTORE';
    os.callSub = '3310 ROM SETTINGS OK';
    os.dialBuffer = '';
  } else if (os.dialBuffer === '*#7370#') {
    os.dialBuffer = '';
    os.callState = 'idle';
    openFormatSimulator(os, 2, true);
    return 'explode';
  }
  return null;
}

export function pressNumericKeyImpl(os: RetroDeckOS, key: string) {
  os.idleTimer = 0;

  // "Press any key to continue." on Windows Activation Easter Egg screen
  if (os.postFormatWinActivationScreen) {
    dismissPostFormatWinActivation(os);
    return;
  }

  // Keyguard unlock support
  if (os.keyLocked) {
    if (key === 'OK') {
      os.unlockStage = true;
      os.unlockHintTimer = 2.5;
      os.cb.onPlaySound?.('hit');
    } else if (key === '*' && os.unlockStage) {
      os.keyLocked = false;
      os.unlockStage = false;
      os.cb.onPlaySound?.('powerup');
    }
    return;
  }

  // Global BACK action
  if (key === 'BACK') {
    if (os.app === 'format') {
      const s = updateFormatSimFrame(os, 0, null, false, true);
      if (s) os.cb.onPlaySound?.(s);
      return;
    }
    if (os.app === 'phone' && os.callState !== 'idle') {
      os.callState = 'idle';
      RetroAudioEngine.stopNokiaMelody();
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (os.app === 'wallpapers' && os.wallpaperCleanPreview) {
      os.wallpaperCleanPreview = false;
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (os.app !== 'desktop') {
      os.wallpaperCleanPreview = false;
      os.app = 'desktop';
      os.cb.onPlaySound?.('hit');
    }
    return;
  }

  // Wallpaper Gallery numeric keypad support (4/6/*/# scene, 2/8 contrast dim, 0 clean preview, OK apply)
  if (os.app === 'wallpapers') {
    const total = REAL_POSTCARDS.length + 1;
    if (key === '4' || key === '*') {
      os.wallpaperIdx = (os.wallpaperIdx + total - 1) % total;
      os.cb.onPlaySound?.('hit');
    } else if (key === '6' || key === '#') {
      os.wallpaperIdx = (os.wallpaperIdx + 1) % total;
      os.cb.onPlaySound?.('hit');
    } else if (key === '2') {
      os.cycleWallpaperDim(-1);
      os.cb.onPlaySound?.('hit');
    } else if (key === '8') {
      os.cycleWallpaperDim(1);
      os.cb.onPlaySound?.('hit');
    } else if (key === '0') {
      if (os.wallpaperViewMode === 'preview') {
        os.wallpaperCleanPreview = !os.wallpaperCleanPreview;
      } else {
        os.cycleWallpaperViewMode();
      }
      os.cb.onPlaySound?.('hit');
    } else if (key === 'OK') {
      const nextId =
        os.wallpaperIdx === 0 ? 'none' : REAL_POSTCARDS[os.wallpaperIdx - 1]?.id || 'none';
      if (os.wallpaperViewMode === 'preview' && os.wallpaperId === nextId && nextId !== 'none') {
        os.wallpaperCleanPreview = !os.wallpaperCleanPreview;
        os.cb.onPlaySound?.('hit');
        return;
      }
      os.setWallpaperById(nextId);
      const card = os.getActiveWallpaper();
      os.smsBanner = card ? `[WP] ${card.title}` : `[WP] ${tOs('off', os.lang)}`;
      os.smsBannerTimer = 2.0;
      os.cb.onPlaySound?.('powerup');
    }
    return;
  }

  // Format Simulator numeric keypad support (2/8 up/down, 4/6/*/# toggle, OK confirm/smack)
  if (os.app === 'format') {
    const dir =
      key === '2'
        ? 'up'
        : key === '8'
        ? 'down'
        : key === '4' || key === '*'
        ? 'left'
        : key === '6' || key === '#'
        ? 'right'
        : null;
    const s = updateFormatSimFrame(os, 0, dir, key === 'OK', false);
    if (s) os.cb.onPlaySound?.(s);
    return;
  }

  // Text input apps (AI, WAP, Terminal, Weather, Notes)
  if (
    os.app === 'wap' ||
    os.app === 'term' ||
    os.app === 'ai' ||
    os.app === 'weather' ||
    os.app === 'notes'
  ) {
    const cur = os.getKeyboardBinding().value;
    if (key === 'DEL') os.setKeyboardText(cur.slice(0, -1));
    else if (key === 'CLR') os.setKeyboardText('');
    else if (key === 'OK') os.submitKeyboard();
    else os.setKeyboardText(cur + key);
    os.cb.onPlaySound?.('hit');
    return;
  }

  // Calculator
  if (os.app === 'calc') {
    if (key === 'DEL' || key === 'CLR') os.pressCalcKey('C');
    else if (key === 'OK') os.pressCalcKey('=');
    else if (key === '*') {
      const ops = ['+', '-', '*', '/'];
      const curIdx = os.calcOp ? ops.indexOf(os.calcOp) : -1;
      const nextOp = ops[(curIdx + 1) % ops.length];
      if (os.calcAcc === null) {
        os.pressCalcKey(nextOp);
      } else {
        os.calcOp = nextOp;
        os.calcFresh = true;
      }
    } else if (key === '#') os.pressCalcKey('=');
    else if ('0123456789'.includes(key)) os.pressCalcKey(key);
    os.cb.onPlaySound?.('hit');
    return;
  }

  // SomaFM Radio: 1-9 & 0 tune stations, * / # adjust volume, OK toggles play
  if (os.app === 'radio') {
    if (key === 'OK') {
      somaRadioService.togglePlay();
      os.cb.onPlaySound?.(somaRadioService.getIsPlaying() ? 'hit' : 'powerup');
    } else if (key === '*') {
      somaRadioService.setVolume(Math.max(0, somaRadioService.getVolume() - 0.1));
      os.cb.onPlaySound?.('hit');
    } else if (key === '#') {
      somaRadioService.setVolume(Math.min(1, somaRadioService.getVolume() + 0.1));
      os.cb.onPlaySound?.('score');
    } else if ('0123456789'.includes(key)) {
      const chIdx = key === '0' ? 9 : parseInt(key, 10) - 1;
      somaRadioService.setChannel(chIdx);
      if (!somaRadioService.getIsPlaying()) {
        somaRadioService.playCurrentChannel();
      }
      os.cb.onPlaySound?.('score');
    }
    return;
  }

  // Arcade Browser: 2/8 browse, OK launches
  if (os.app === 'arcade') {
    const carts = os.cb.getCartridges();
    if (key === '2') {
      os.gameIdx = (os.gameIdx + carts.length - 1) % carts.length;
      os.cb.onPlaySound?.('hit');
    } else if (key === '8') {
      os.gameIdx = (os.gameIdx + 1) % carts.length;
      os.cb.onPlaySound?.('hit');
    } else if (key === 'OK' && carts[os.gameIdx]) {
      const isPro = os.cb.getIsPro?.() ?? false;
      const selected = carts[os.gameIdx];
      if (isCartridgeProLocked(selected.id, isPro)) {
        os.openProScreen('PRO REQUIRED FOR THIS GAME!');
        os.cb.onPlaySound?.('die');
        return;
      }
      os.cb.onLaunchGame(selected);
      os.cb.onPlaySound?.('powerup');
    }
    return;
  }

  // Desktop: OK opens highlighted app; digits jump straight to Phone dialer like Nokia 3310!
  if (os.app === 'desktop') {
    if (key === 'OK') {
      const nextApp = DESKTOP_ICONS[os.deskIdx].id;
      if (nextApp === 'wallpapers') {
        os.openWallpaperGallery();
        os.cb.onPlaySound?.('score');
        return;
      }
      if (nextApp === 'format') {
        openFormatSimulator(os, 0, false);
        os.cb.onPlaySound?.('explode');
        return;
      }
      os.app = nextApp;
      if (os.app === 'radio') somaRadioService.fetchNowPlaying();
      os.cb.onPlaySound?.('score');
      return;
    }
    if (key === 'DEL' || key === 'CLR') return;
    os.app = 'phone';
    os.callState = 'idle';
    os.dialBuffer = '';
  }

  // Phone Dialer: full interactive 3310 keypad + DTMF tones + USSD codes
  if (os.app === 'phone') {
    if (os.callState === 'warranty') {
      if (key === 'OK' || key === '8' || key === '6') {
        os.warrantyPage = (os.warrantyPage + 1) % 5;
        os.cb.onPlaySound?.('score');
      } else if (key === '2' || key === '4') {
        os.warrantyPage = (os.warrantyPage + 4) % 5;
        os.cb.onPlaySound?.('hit');
      }
      return;
    }
    if (os.callState !== 'idle') {
      if (key === 'OK' && os.callState === 'ringing') {
        RetroAudioEngine.stopNokiaMelody();
        os.callState = 'connected';
        os.callTimer = 0;
        os.cb.onPlaySound?.('score');
      } else {
        os.callState = 'idle';
        RetroAudioEngine.stopNokiaMelody();
        os.cb.onPlaySound?.('hit');
      }
      return;
    }

    if (key === 'DEL') {
      if (os.dialBuffer.length > 0) {
        os.dialBuffer = os.dialBuffer.slice(0, -1);
        os.dialR = 2;
        os.dialC = 3;
      } else {
        os.app = 'desktop';
      }
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (key === 'CLR') {
      os.dialBuffer = '';
      os.dialR = 2;
      os.dialC = 3;
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (key === 'OK') {
      os.dialR = 0;
      os.dialC = 3; // CALL
      const s = os.executePhoneKey('CALL');
      if (s) os.cb.onPlaySound?.(s);
      return;
    }

    // Highlight matching key on LCD DIAL_KEYS & dial with DTMF tone
    for (let r = 0; r < DIAL_KEYS.length; r++) {
      const c = DIAL_KEYS[r].indexOf(key);
      if (c !== -1) {
        os.dialR = r;
        os.dialC = c;
        break;
      }
    }
    const s = os.executePhoneKey(key);
    if (s) os.cb.onPlaySound?.(s);
  }

  // SMS App keypad shortcuts (DEL / CLR deletes active SMS, OK sends to AI)
  if (os.app === 'sms') {
    if (key === 'DEL' || key === 'CLR') {
      if (os.smsList.length > 0) {
        os.smsList = os.smsList.filter((_, idx) => idx !== os.smsIdx);
        os.smsIdx = Math.min(os.smsIdx, Math.max(0, os.smsList.length - 1));
        os.smsDeleteConfirm = false;
        os.smsBanner = tOs('smsDeleted', os.lang);
        os.smsBannerTimer = 2.0;
        os.saveSmsList();
        os.cb.onPlaySound?.('die');
      }
      return;
    }
    if (key === '4') {
      if (os.smsList.length > 0) {
        os.smsIdx = (os.smsIdx + os.smsList.length - 1) % os.smsList.length;
      }
      os.smsDeleteConfirm = false;
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (key === '6') {
      if (os.smsList.length > 0) {
        os.smsIdx = (os.smsIdx + 1) % os.smsList.length;
      }
      os.smsDeleteConfirm = false;
      os.cb.onPlaySound?.('hit');
      return;
    }
    if (key === 'OK') {
      os.sendPictureSmsToAi();
      return;
    }
  }

  // Contacts keypad shortcuts
  if (os.app === 'contacts') {
    const contacts = os.getAllContacts();
    const totalRows = contacts.length + 1;
    if (key === '2') {
      os.contactIdx = (os.contactIdx + totalRows - 1) % totalRows;
      os.contactDeleteConfirm = false;
      os.cb.onPlaySound?.('hit');
    } else if (key === '8') {
      os.contactIdx = (os.contactIdx + 1) % totalRows;
      os.contactDeleteConfirm = false;
      os.cb.onPlaySound?.('hit');
    } else if (key === 'DEL' || key === 'CLR') {
      const sel = contacts[os.contactIdx];
      if (sel?.isCustom) {
        os.customContacts = os.customContacts.filter((c) => c.id !== sel.id);
        os.contactIdx = Math.max(0, Math.min(os.contactIdx, os.getAllContacts().length - 1));
        os.contactDeleteConfirm = false;
        os.saveCustomContacts();
        os.smsBanner = tOs('contactsDeletedBanner', os.lang);
        os.smsBannerTimer = 2.0;
        os.cb.onPlaySound?.('die');
      }
    } else if (key === 'OK') {
      const sel = contacts[os.contactIdx];
      if (!sel) {
        os.smsContactTarget = null;
        os.cb.onRequestKeyboard?.(true);
        os.cb.onPlaySound?.('score');
      } else {
        os.app = 'phone';
        os.callState = 'connected';
        os.callTitle = sel.name;
        os.callSub = sel.number;
        os.callTimer = 0;
        os.cb.onPlaySound?.('powerup');
      }
    }
    return;
  }

  // Paint keypad shortcuts: * / 4 prev art, # / 6 next art, CLR / DEL blank canvas, OK toggle/action
  if (os.app === 'paint') {
    if (key === '*' || key === '4') {
      const s = execPaintBarAction(os, 0);
      os.cb.onPlaySound?.(s);
    } else if (key === '#' || key === '6') {
      const s = execPaintBarAction(os, 1);
      os.cb.onPlaySound?.(s);
    } else if (key === 'CLR' || key === 'DEL') {
      const s = execPaintBarAction(os, 3);
      os.cb.onPlaySound?.(s);
    } else if (key === 'OK') {
      if (os.paintOnBar) {
        const s = execPaintBarAction(os, os.paintBarIdx);
        os.cb.onPlaySound?.(s);
      } else {
        os.paintGrid[os.paintR][os.paintC] = !os.paintGrid[os.paintR][os.paintC];
        if (os.paintTitle === 'BLANK CANVAS') os.paintTitle = 'CUSTOM ART';
        os.cb.onPlaySound?.('hit');
      }
    }
    return;
  }
}

export function execPaintBarAction(os: RetroDeckOS, barIdx: number): ArcadeSound {
  if (barIdx === 0) {
    os.paintArtIdx = (os.paintArtIdx + PAINT_ARTWORKS.length - 1) % PAINT_ARTWORKS.length;
    os.clearCanvas(false);
    return 'score';
  }
  if (barIdx === 1) {
    os.paintArtIdx = (os.paintArtIdx + 1) % PAINT_ARTWORKS.length;
    os.clearCanvas(false);
    return 'score';
  }
  if (barIdx === 2) {
    for (let r = 0; r < os.paintH; r++) {
      for (let c = 0; c < os.paintW; c++) {
        os.paintGrid[r][c] = !os.paintGrid[r][c];
      }
    }
    return 'hit';
  }
  os.clearCanvas(true);
  return 'die';
}

export function updateOsFrameImpl(os: RetroDeckOS, input: ArcadeInput, dt: number): ArcadeSound | null {
  os.uptime += dt;
  os.batteryPollTimer += dt;
  if (os.batteryPollTimer >= 10) {
    os.batteryPollTimer = 0;
    os.refreshBattery();
  }
  if (os.swRunning) os.swTime += dt;
  if (os.moveCd > 0) os.moveCd -= dt;
  if (os.unlockHintTimer > 0) os.unlockHintTimer -= dt;

  // Countdown timer tick
  if (os.cdRunning) {
    os.cdRemaining -= dt;
    if (os.cdRemaining <= 0) {
      os.cdRemaining = 0;
      os.cdRunning = false;
      os.cdAlarmActive = true;
      const activeRing = os.songs[os.ringtoneIdx] || os.songs[0];
      RetroAudioEngine.playNokiaMelody(activeRing.notes, activeRing.bpm);
    }
  }

  if (os.callState === 'ringing') {
    os.ringRepeatTimer += dt;
    if (os.ringRepeatTimer >= os.ringDuration + 0.45) {
      os.ringRepeatTimer = 0;
      const activeRing = os.songs[os.ringtoneIdx] || os.songs[0];
      const res = RetroAudioEngine.playNokiaMelody(activeRing.notes, activeRing.bpm);
      os.ringDuration = res.totalSec > 0 ? res.totalSec : 2.5;
    }
  }
  if (os.callState === 'connected') {
    os.callTimer += dt;
  }
  if (os.smsBannerTimer > 0) {
    os.smsBannerTimer -= dt;
  }

  // Wall-clock check for the 45-second post-format Windows 98 / XP trial across all OS screens & Keyguard
  syncPostFormatWinTimer(os, Date.now(), true);

  // Autonomous SMS Simulation scheduler: starts AFTER first user interaction, random 30–90s interval
  if (
    os.liveAiSmsEnabled &&
    os.hasUserInteracted &&
    os.app !== 'boot' &&
    !os.postFormatWinActivationScreen &&
    !os.liveSmsFetching
  ) {
    os.liveSmsTimer -= dt;
    if (os.liveSmsTimer <= 0) {
      os.liveSmsTimer = rollAutonomousSmsIntervalSec();
      os.triggerLivePersonaSms();
    }
  }

  if (os.melodyPlaying) {
    os.melodyTimer += dt;
    if (os.melodyTimer >= os.melodyDuration) {
      os.melodyPlaying = false;
      os.melodyTimer = 0;
    }
  }

  const pressA = input.a && !os.prevA;
  const pressB = input.b && !os.prevB;
  os.prevA = input.a;
  os.prevB = input.b;

  // Windows Activation Easter Egg screen: "Press any key to continue." -> Nokia Startup Tune!
  if (os.postFormatWinActivationScreen) {
    const pressUpEdge = input.up && !os.prevUp;
    const pressDownEdge = input.down && !os.prevDown;
    const pressLeftEdge = input.left && !os.prevLeft;
    const pressRightEdge = input.right && !os.prevRight;
    os.prevUp = input.up;
    os.prevDown = input.down;
    os.prevLeft = input.left;
    os.prevRight = input.right;

    if (pressA || pressB || pressUpEdge || pressDownEdge || pressLeftEdge || pressRightEdge) {
      dismissPostFormatWinActivation(os);
    }
    return null;
  }

  const anyInput =
    input.up || input.down || input.left || input.right || pressA || pressB;

  // Boot sequence
  if (os.app === 'boot') {
    os.bootTimer += dt;
    if (os.bootTimer >= 3.5 || pressA || pressB) {
      os.app = 'desktop';
      if (os.postFormatWinStyle && os.postFormatWinPendingBoot) {
        startPostFormatWinCountdownOnDesktopEntry(os);
        return null;
      }
      return 'powerup';
    }
    return null;
  }

  // Keyguard / Pixel Clock Screensaver Handling (Unlock with Menu [A] + Star [▲])
  if (os.keyLocked) {
    if (pressA) {
      os.unlockStage = true;
      os.unlockHintTimer = 2.5;
      return 'hit';
    }
    if (os.unlockStage && (input.up || pressB)) {
      os.keyLocked = false;
      os.unlockStage = false;
      os.idleTimer = 0;
      return 'powerup';
    }
    if (input.down || input.left || input.right) {
      os.unlockHintTimer = 2.0;
      return 'hit';
    }
    return null;
  }

  // Auto Screensaver / Keyguard after 28s idle on desktop + arm Autonomous SMS on first input
  if (anyInput) {
    os.idleTimer = 0;
    os.markUserInteraction();
  } else if (os.app === 'desktop') {
    os.idleTimer += dt;
    if (os.idleTimer >= 28) {
      os.keyLocked = true;
      os.unlockStage = false;
      os.idleTimer = 0;
    }
  }

  // Global B = return to desktop from any sub-app (except synth list / sms compose / format wizard / clean wallpaper preview)
  if (os.app !== 'desktop' && os.app !== 'format' && pressB) {
    if (os.app === 'setup' && os.setupSubPage === 'menu_style') {
      os.setupSubPage = 'main';
      return 'hit';
    }
    if (os.app === 'wallpapers' && os.wallpaperCleanPreview) {
      os.wallpaperCleanPreview = false;
      return 'hit';
    }
    if (os.app === 'synth' && os.synthMode === 'list') {
      os.synthMode = 'pad';
      os.synthClearConfirm = false;
      return 'hit';
    }
    if (os.app === 'sms' && os.smsMode === 'compose') {
      os.smsMode = 'inbox';
      os.cb.onRequestKeyboard?.(false);
      return 'hit';
    }
    if (os.melodyPlaying || os.cdAlarmActive || os.callState === 'ringing') {
      os.melodyPlaying = false;
      os.cdAlarmActive = false;
      RetroAudioEngine.stopNokiaMelody();
    }
    os.callState = 'idle';
    os.smsContactTarget = null;
    os.contactDeleteConfirm = false;
    os.app = 'desktop';
    os.cb.onRequestKeyboard?.(false);
    return 'hit';
  }

  // Directional helper with single-press edge trigger & initial repeat delay
  const pressUp = input.up && !os.prevUp;
  const pressDown = input.down && !os.prevDown;
  const pressLeft = input.left && !os.prevLeft;
  const pressRight = input.right && !os.prevRight;

  os.prevUp = input.up;
  os.prevDown = input.down;
  os.prevLeft = input.left;
  os.prevRight = input.right;

  let dir: 'up' | 'down' | 'left' | 'right' | null = null;
  if (pressUp) { dir = 'up'; os.moveCd = 0.28; }
  else if (pressDown) { dir = 'down'; os.moveCd = 0.28; }
  else if (pressLeft) { dir = 'left'; os.moveCd = 0.28; }
  else if (pressRight) { dir = 'right'; os.moveCd = 0.28; }
  else if (os.moveCd <= 0) {
    if (input.up) { dir = 'up'; os.moveCd = 0.16; }
    else if (input.down) { dir = 'down'; os.moveCd = 0.16; }
    else if (input.left) { dir = 'left'; os.moveCd = 0.16; }
    else if (input.right) { dir = 'right'; os.moveCd = 0.16; }
  }

  if (os.app === 'desktop') {
    const total = DESKTOP_ICONS.length;
    if (!os.postFormatWinStyle && (os.menuStyle === 'nokia' || os.menuStyle === 'list' || os.menuStyle === 'macos' || os.menuStyle === 'ipod_classic')) {
      if (dir === 'left' || dir === 'up') os.deskIdx = (os.deskIdx + total - 1) % total;
      if (dir === 'right' || dir === 'down') os.deskIdx = (os.deskIdx + 1) % total;
    } else if (!os.postFormatWinStyle && os.menuStyle === 'pipboy') {
      // Pip-Boy 3000 Navigation: Left/Right jumps tabs (4 items per tab); Up/Down selects item
      if (dir === 'up') os.deskIdx = (os.deskIdx + total - 1) % total;
      if (dir === 'down') os.deskIdx = (os.deskIdx + 1) % total;
      if (dir === 'left') os.deskIdx = (os.deskIdx + total - 4) % total;
      if (dir === 'right') os.deskIdx = (os.deskIdx + 4) % total;
    } else if (!os.postFormatWinStyle && os.menuStyle === 'psp_xmb') {
      // PSP XMB Navigation: Left/Right switches Category; Up/Down navigates items in category
      const XMB_CATEGORIES: string[][] = [
        ['setup', 'stats', 'term', 'format'], // settings
        ['arcade'], // games
        ['radio', 'synth', 'wallpapers'], // media
        ['wap', 'ai', 'sms', 'contacts', 'phone'], // network
        ['notes', 'paint', 'calc', 'weather', 'clock', 'profiles'], // tools
      ];
      const curApp = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
      let catIdx = XMB_CATEGORIES.findIndex((cat) => cat.includes(curApp.id));
      if (catIdx === -1) catIdx = 1;
      const catApps = XMB_CATEGORIES[catIdx];
      let itemIdx = catApps.indexOf(curApp.id);
      if (itemIdx === -1) itemIdx = 0;

      if (dir === 'left') {
        const nextCatIdx = (catIdx + XMB_CATEGORIES.length - 1) % XMB_CATEGORIES.length;
        const targetAppId = XMB_CATEGORIES[nextCatIdx][0];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'right') {
        const nextCatIdx = (catIdx + 1) % XMB_CATEGORIES.length;
        const targetAppId = XMB_CATEGORIES[nextCatIdx][0];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'up') {
        const nextItemIdx = (itemIdx + catApps.length - 1) % catApps.length;
        const targetAppId = catApps[nextItemIdx];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'down') {
        const nextItemIdx = (itemIdx + 1) % catApps.length;
        const targetAppId = catApps[nextItemIdx];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      }
    } else if (!os.postFormatWinStyle && os.menuStyle === 'xbox_blades') {
      // Xbox 360 Blades Navigation: Left/Right slides active Blade; Up/Down selects item
      const XBOX_BLADES: string[][] = [
        ['arcade', 'synth'], // games
        ['radio', 'wallpapers', 'paint'], // media
        ['setup', 'stats', 'term', 'format', 'clock'], // system
        ['wap', 'ai', 'sms', 'contacts', 'phone', 'weather', 'notes', 'calc', 'profiles'], // live
      ];
      
      let bladeIdx = os.xboxBladeIdx >= 0 && os.xboxBladeIdx < XBOX_BLADES.length ? os.xboxBladeIdx : 0;
      const bladeApps = XBOX_BLADES[bladeIdx];
      const curApp = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
      let itemIdx = bladeApps.indexOf(curApp.id);
      if (itemIdx === -1) itemIdx = 0;

      if (dir === 'left') {
        bladeIdx = (bladeIdx + XBOX_BLADES.length - 1) % XBOX_BLADES.length;
        os.xboxBladeIdx = bladeIdx;
        const targetAppId = XBOX_BLADES[bladeIdx][0];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'right') {
        bladeIdx = (bladeIdx + 1) % XBOX_BLADES.length;
        os.xboxBladeIdx = bladeIdx;
        const targetAppId = XBOX_BLADES[bladeIdx][0];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'up') {
        const nextItemIdx = (itemIdx + bladeApps.length - 1) % bladeApps.length;
        const targetAppId = bladeApps[nextItemIdx];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      } else if (dir === 'down') {
        const nextItemIdx = (itemIdx + 1) % bladeApps.length;
        const targetAppId = bladeApps[nextItemIdx];
        const targetIdx = DESKTOP_ICONS.findIndex((icon) => icon.id === targetAppId);
        if (targetIdx !== -1) os.deskIdx = targetIdx;
      }
    } else if (!os.postFormatWinStyle && os.menuStyle === 'cyberpunk') {
      // Cyberpunk Tiling WM: Up/Down moves cursor; Left/Right jumps 5 items (workspaces)
      if (dir === 'up') os.deskIdx = (os.deskIdx + total - 1) % total;
      if (dir === 'down') os.deskIdx = (os.deskIdx + 1) % total;
      if (dir === 'left') os.deskIdx = (os.deskIdx + total - 5) % total;
      if (dir === 'right') os.deskIdx = (os.deskIdx + 5) % total;
    } else if (Boolean(os.postFormatWinStyle) || os.menuStyle === 'windows') {
      // Windows Desktop: Column-Major Layout (4 cols x 3 rows per page = 12 items)
      // Icons flow Down (top to bottom within column), then Right (next column)
      const rows = 3;
      const cols = 4;
      const pageSize = rows * cols;
      const curPage = Math.floor(os.deskIdx / pageSize);
      const pageStart = curPage * pageSize;
      const pageCount = Math.min(pageSize, total - pageStart);
      const localIdx = os.deskIdx - pageStart;
      const c = Math.floor(localIdx / rows);
      const r = localIdx % rows;

      if (dir === 'up') {
        const nextR = r > 0 ? r - 1 : rows - 1;
        const targetLocal = c * rows + nextR;
        if (targetLocal < pageCount) {
          os.deskIdx = pageStart + targetLocal;
        } else {
          os.deskIdx = pageStart + (c * rows + (r - 1 + rows) % rows);
          if (os.deskIdx >= total) os.deskIdx = total - 1;
        }
      } else if (dir === 'down') {
        const nextR = r < rows - 1 ? r + 1 : 0;
        const targetLocal = c * rows + nextR;
        if (targetLocal < pageCount) {
          os.deskIdx = pageStart + targetLocal;
        } else {
          os.deskIdx = pageStart + c * rows; // wrap back to top of column
        }
      } else if (dir === 'left') {
        if (c > 0) {
          const targetLocal = (c - 1) * rows + r;
          os.deskIdx = pageStart + Math.min(targetLocal, pageCount - 1);
        } else {
          // Wrap to previous page or last column
          const totalPages = Math.ceil(total / pageSize);
          const prevPage = (curPage + totalPages - 1) % totalPages;
          const prevPageStart = prevPage * pageSize;
          const prevPageCount = Math.min(pageSize, total - prevPageStart);
          const lastC = Math.floor((prevPageCount - 1) / rows);
          const targetLocal = lastC * rows + r;
          os.deskIdx = prevPageStart + Math.min(targetLocal, prevPageCount - 1);
        }
      } else if (dir === 'right') {
        const targetLocal = (c + 1) * rows + r;
        if (targetLocal < pageCount) {
          os.deskIdx = pageStart + targetLocal;
        } else {
          // Advance to next page or wrap to first column
          const totalPages = Math.ceil(total / pageSize);
          const nextPage = (curPage + 1) % totalPages;
          const nextPageStart = nextPage * pageSize;
          const targetLocal = 0 * rows + r;
          os.deskIdx = nextPageStart + Math.min(targetLocal, Math.min(pageSize, total - nextPageStart) - 1);
        }
      }
    } else {
      const cols = !os.postFormatWinStyle && os.menuStyle === 'cards' ? 3 : 4;
      if (dir === 'left') os.deskIdx = (os.deskIdx + total - 1) % total;
      if (dir === 'right') os.deskIdx = (os.deskIdx + 1) % total;
      if (dir === 'up') {
        if (os.deskIdx >= cols) {
          os.deskIdx -= cols;
        } else {
          const col = os.deskIdx % cols;
          const lastRowBase = Math.floor((total - 1) / cols) * cols;
          os.deskIdx =
            lastRowBase + col < total ? lastRowBase + col : Math.max(0, lastRowBase - cols + col);
        }
      }
      if (dir === 'down') {
        os.deskIdx =
          os.deskIdx + cols < total ? os.deskIdx + cols : os.deskIdx % cols;
      }
    }
    if (dir) return 'hit';

    if (pressA) {
      const targetApp = DESKTOP_ICONS[os.deskIdx].id;
      if (targetApp === 'wallpapers') {
        os.openWallpaperGallery();
        return 'score';
      }
      if (targetApp === 'format') {
        openFormatSimulator(os, 0, false);
        return 'explode';
      }
      os.app = targetApp;
      if (os.app === 'ai') {
        os.kbdTarget = 'chat';
      }
      if (os.app === 'wap' && !os.wapFetchedOnce) {
        os.wapFetchedOnce = true;
        os.fetchWapPage(os.wapUrl);
      }
      if (os.app === 'radio') {
        somaRadioService.fetchNowPlaying();
      }
      if (os.app === 'weather' && !os.weatherFetchedOnce) {
        os.weatherFetchedOnce = true;
        os.fetchWeather(os.weatherQuery);
      }
      if (os.app === 'notes') {
        os.noteDeleteConfirm = false;
      }
      if (os.app === 'sms') {
        os.smsDeleteConfirm = false;
        os.unreadSmsCount = 0;
      }
      return 'score';
    }
    return null;
  }

  if (os.app === 'radio') {
    if (dir === 'left') {
      somaRadioService.prevChannel();
      return 'hit';
    }
    if (dir === 'right') {
      somaRadioService.nextChannel();
      return 'hit';
    }
    if (dir === 'up') {
      const curVol = somaRadioService.getVolume();
      somaRadioService.setVolume(Math.min(1, curVol + 0.1));
      return 'score';
    }
    if (dir === 'down') {
      const curVol = somaRadioService.getVolume();
      somaRadioService.setVolume(Math.max(0, curVol - 0.1));
      return 'score';
    }
    if (pressA) {
      somaRadioService.togglePlay();
      return somaRadioService.getIsPlaying() ? 'hit' : 'powerup';
    }
    return null;
  }

  if (os.app === 'wap') {
    if (dir === 'up') {
      os.wapScroll = Math.max(0, os.wapScroll - 1);
      return 'hit';
    }
    if (dir === 'down') {
      os.wapScroll = Math.min(Math.max(0, os.wapLines.length - 6), os.wapScroll + 1);
      return 'hit';
    }
    if (dir === 'left') {
      os.wapBookmarkIdx =
        (os.wapBookmarkIdx + WAP_BOOKMARKS.length - 1) % WAP_BOOKMARKS.length;
      os.wapUrl = WAP_BOOKMARKS[os.wapBookmarkIdx];
      os.fetchWapPage(os.wapUrl);
      return 'score';
    }
    if (dir === 'right') {
      os.wapBookmarkIdx = (os.wapBookmarkIdx + 1) % WAP_BOOKMARKS.length;
      os.wapUrl = WAP_BOOKMARKS[os.wapBookmarkIdx];
      os.fetchWapPage(os.wapUrl);
      return 'score';
    }
    if (pressA) {
      os.cb.onRequestKeyboard?.(true);
      return 'score';
    }
    return null;
  }

  if (os.app === 'phone') {
    if (os.callState === 'warranty') {
      if (dir === 'up' || dir === 'left') {
        os.warrantyPage = (os.warrantyPage + 4) % 5;
        return 'hit';
      }
      if (dir === 'down' || dir === 'right' || pressA) {
        os.warrantyPage = (os.warrantyPage + 1) % 5;
        return 'score';
      }
      return null;
    }

    if (os.callState !== 'idle') {
      if (pressA) {
        if (os.callState === 'ringing') {
          RetroAudioEngine.stopNokiaMelody();
          os.callState = 'connected';
          os.callTimer = 0;
          return 'score';
        } else {
          os.callState = 'idle';
          RetroAudioEngine.stopNokiaMelody();
          return 'hit';
        }
      }
      return null;
    }

    if (dir === 'up') os.dialR = (os.dialR + 3) % 4;
    if (dir === 'down') os.dialR = (os.dialR + 1) % 4;
    if (dir === 'left') os.dialC = (os.dialC + 3) % 4;
    if (dir === 'right') os.dialC = (os.dialC + 1) % 4;
    if (dir) return 'hit';

    if (pressA) {
      return os.executePhoneKey(DIAL_KEYS[os.dialR][os.dialC]);
    }
    return null;
  }

  if (os.app === 'contacts') {
    const contacts = os.getAllContacts();
    const totalRows = contacts.length + 1;
    if (dir === 'up') {
      os.contactIdx = (os.contactIdx + totalRows - 1) % totalRows;
      os.contactDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'down') {
      os.contactIdx = (os.contactIdx + 1) % totalRows;
      os.contactDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'left') {
      const sel = contacts[os.contactIdx];
      if (!sel || !sel.isCustom) {
        os.contactDeleteConfirm = false;
        if (sel) {
          os.smsBanner = tOs('contactsBuiltInLocked', os.lang);
          os.smsBannerTimer = 2.0;
        }
        return 'hit';
      }
      if (!os.contactDeleteConfirm) {
        os.contactDeleteConfirm = true;
        return 'hit';
      }
      os.customContacts = os.customContacts.filter((c) => c.id !== sel.id);
      os.contactIdx = Math.max(0, Math.min(os.contactIdx, os.getAllContacts().length - 1));
      os.contactDeleteConfirm = false;
      os.saveCustomContacts();
      os.smsBanner = tOs('contactsDeletedBanner', os.lang);
      os.smsBannerTimer = 2.0;
      return 'explode';
    }
    if (dir === 'right') {
      const sel = contacts[os.contactIdx];
      os.contactDeleteConfirm = false;
      if (!sel) {
        os.smsContactTarget = null;
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
      os.smsContactTarget = sel;
      os.smsDraftText = '';
      os.cb.onRequestKeyboard?.(true);
      return 'score';
    }
    if (pressA) {
      os.contactDeleteConfirm = false;
      const sel = contacts[os.contactIdx];
      if (!sel) {
        os.smsContactTarget = null;
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
      os.app = 'phone';
      os.callState = 'connected';
      os.callTitle = sel.name;
      os.callSub = sel.number;
      os.callTimer = 0;
      return 'powerup';
    }
    return null;
  }

  if (os.app === 'sms') {
    if (os.smsMode === 'compose') {
      if (dir === 'down') {
        os.smsStudioTab = os.smsStudioTab === 'art' ? 'stamps' : 'art';
        return 'score';
      }
      if (os.smsStudioTab === 'art') {
        const totalScenes = REAL_POSTCARDS.length;
        if (dir === 'left') {
          os.smsArtIdx = (os.smsArtIdx + totalScenes - 1) % totalScenes;
          return 'hit';
        }
        if (dir === 'right') {
          os.smsArtIdx = (os.smsArtIdx + 1) % totalScenes;
          return 'hit';
        }
      } else {
        const totalStamps = POSTCARD_STAMPS.length;
        if (dir === 'left') {
          os.smsStampIdx = (os.smsStampIdx + totalStamps - 1) % totalStamps;
          return 'hit';
        }
        if (dir === 'right') {
          os.smsStampIdx = (os.smsStampIdx + 1) % totalStamps;
          return 'hit';
        }
      }
      if (dir === 'up') {
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
      if (pressA) {
        const text = os.smsDraftText.trim();
        if (!text) {
          os.cb.onRequestKeyboard?.(true);
          return 'score';
        }
        const scene = REAL_POSTCARDS[os.smsArtIdx] || REAL_POSTCARDS[0];
        const stamp = POSTCARD_STAMPS[os.smsStampIdx] || POSTCARD_STAMPS[0];
        os.smsList.unshift({
          sender: 'MY-POSTCARD',
          title: scene.title,
          text,
          artKey: 'SMILE',
          postcardId: scene.id,
          stampIcon: stamp.icon,
          stampLabel: stamp.label,
          timestamp: os.formatClock(),
        });
        if (os.smsList.length > 20) os.smsList.pop();
        os.smsIdx = 0;
        os.smsDraftText = '';
        os.smsMode = 'inbox';
        os.smsBanner = tOs('smsPostcardSent', os.lang);
        os.smsBannerTimer = 3.0;
        os.saveSmsList();
        os.playActiveSmsTone();
        return null;
      }
      return null;
    }

    if (dir === 'left') {
      if (os.smsList.length > 0) {
        os.smsIdx = (os.smsIdx + os.smsList.length - 1) % os.smsList.length;
      }
      os.smsDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'right') {
      if (os.smsList.length > 0) {
        os.smsIdx = (os.smsIdx + 1) % os.smsList.length;
      }
      os.smsDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'down') {
      // [▼] Request delete confirmation, then 2nd [▼] deletes message
      if (os.smsList.length === 0) return 'hit';
      if (!os.smsDeleteConfirm) {
        os.smsDeleteConfirm = true;
        os.smsBanner = 'PRESS [▼] AGAIN TO DELETE SMS!';
        os.smsBannerTimer = 3.0;
        return 'hit';
      }
      os.smsList = os.smsList.filter((_, idx) => idx !== os.smsIdx);
      os.smsIdx = Math.min(os.smsIdx, Math.max(0, os.smsList.length - 1));
      os.smsDeleteConfirm = false;
      os.smsBanner = 'SMS DELETED!';
      os.smsBannerTimer = 2.0;
      os.saveSmsList();
      return 'die';
    }
    if (dir === 'up') {
      os.smsDeleteConfirm = false;
      os.smsMode = 'compose';
      return 'score';
    }
    if (pressA) {
      if (os.smsDeleteConfirm) {
        os.smsDeleteConfirm = false;
      }
      if (os.smsList.length === 0) {
        os.smsMode = 'compose';
        return 'score';
      }
      const curMsg = os.smsList[os.smsIdx];
      if (curMsg?.isLivePersona && curMsg.personaId) {
        os.smsReplyTargetIdx = os.smsIdx;
        os.smsDraftText = '';
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
      os.sendPictureSmsToAi();
      return null;
    }
    return null;
  }

  if (os.app === 'profiles') {
    if (dir === 'up') {
      os.profRow = (os.profRow + 6) % 7;
      return 'hit';
    }
    if (dir === 'down') {
      os.profRow = (os.profRow + 1) % 7;
      return 'hit';
    }
    if (pressA || dir === 'left' || dir === 'right') {
      const step = dir === 'left' ? -1 : 1;
      if (os.profRow === 0) {
        os.profileIdx =
          (os.profileIdx + step + NOKIA_PROFILES.length) % NOKIA_PROFILES.length;
        RetroAudioEngine.setMuted(NOKIA_PROFILES[os.profileIdx] === 'SILENT');
        return 'score';
      } else if (os.profRow === 1) {
        // VOLUME CONTROL (0% to 100% in 10% steps)
        const curVol = RetroAudioEngine.getVolume();
        const nextVol = Math.round(Math.max(0, Math.min(1, curVol + step * 0.1)) * 10) / 10;
        RetroAudioEngine.setVolume(nextVol);
        return nextVol > 0 ? 'hit' : null;
      } else if (os.profRow === 2) {
        os.ringtoneIdx =
          (os.ringtoneIdx + step + os.songs.length) % os.songs.length;
        const ring = os.songs[os.ringtoneIdx];
        RetroAudioEngine.playNokiaMelody(ring.notes, ring.bpm);
        return null;
      } else if (os.profRow === 3) {
        os.smsToneIdx =
          (os.smsToneIdx + step + NOKIA_SMS_TONES.length) % NOKIA_SMS_TONES.length;
        AsyncStorage.setItem(SMS_TONE_STORAGE_KEY, String(os.smsToneIdx)).catch(() => {});
        os.playActiveSmsTone();
        return null;
      } else if (os.profRow === 4) {
        const curStyle = RetroAudioEngine.getKeySoundStyle();
        const curIdx = KEYPAD_SOUND_STYLES.findIndex((s) => s.id === curStyle);
        const nextIdx =
          (curIdx + step + KEYPAD_SOUND_STYLES.length) % KEYPAD_SOUND_STYLES.length;
        RetroAudioEngine.setKeySoundStyle(KEYPAD_SOUND_STYLES[nextIdx].id);
        return 'hit';
      } else if (os.profRow === 5) {
        os.operatorIdx =
          (os.operatorIdx + step + NOKIA_OPERATORS.length) % NOKIA_OPERATORS.length;
        return 'score';
      } else if (os.profRow === 6) {
        if (pressA) {
          os.keyLocked = true;
          os.unlockStage = false;
          return 'score';
        } else {
          os.torchInvert = !os.torchInvert;
          return 'powerup';
        }
      }
    }
    return null;
  }

  if (os.app === 'ai') {
    if (os.aiTab === 'chat') {
      if (dir === 'up') {
        os.chatClearConfirm = false;
        os.chatScroll = Math.max(0, os.chatScroll - 1);
        return 'hit';
      }
      if (dir === 'down') {
        os.chatClearConfirm = false;
        os.chatScroll = Math.min(Math.max(0, os.chatLines.length - 6), os.chatScroll + 1);
        return 'hit';
      }
      if (dir === 'left') {
        if (!os.chatClearConfirm) {
          os.chatClearConfirm = true;
          os.aiStatus = 'PRESS [◀] CLR';
          return 'hit';
        }
        os.clearAiChat();
        return 'die';
      }
      if (dir === 'right') {
        os.chatClearConfirm = false;
        os.aiTab = 'byok';
        os.byokRow = 0;
        os.kbdTarget = 'key';
        return 'hit';
      }
      if (pressA) {
        os.chatClearConfirm = false;
        os.kbdTarget = 'chat';
        if (os.aiPrompt.trim().length > 0) {
          os.sendAiMessage();
        } else {
          os.cb.onRequestKeyboard?.(true);
        }
        return 'score';
      }
    } else {
      if (dir === 'up') {
        os.byokRow = (os.byokRow + 3) % 4;
        os.kbdTarget = os.byokRow === 2 ? 'model' : 'key';
        return 'hit';
      }
      if (dir === 'down') {
        os.byokRow = (os.byokRow + 1) % 4;
        os.kbdTarget = os.byokRow === 2 ? 'model' : 'key';
        return 'hit';
      }
      if (dir === 'left') {
        if (os.byokRow === 0) {
          os.cycleProvider(-1);
        } else {
          os.aiTab = 'chat';
          os.kbdTarget = 'chat';
        }
        return 'hit';
      }
      if (dir === 'right') {
        if (os.byokRow === 0) {
          os.cycleProvider(1);
          return 'hit';
        }
      }
      if (pressA) {
        if (os.byokRow === 0) {
          os.cycleProvider(1);
          return 'score';
        } else if (os.byokRow === 1) {
          os.kbdTarget = 'key';
          os.cb.onRequestKeyboard?.(true);
          return 'score';
        } else if (os.byokRow === 2) {
          os.kbdTarget = 'model';
          os.cb.onRequestKeyboard?.(true);
          return 'score';
        } else {
          os.aiTab = 'chat';
          os.kbdTarget = 'chat';
          return 'score';
        }
      }
    }
    return null;
  }

  if (os.app === 'arcade') {
    const carts = os.cb.getCartridges();
    const total = carts.length;
    if (os.menuStyle === 'nokia') {
      if (dir === 'left' || dir === 'up') os.gameIdx = (os.gameIdx + total - 1) % total;
      if (dir === 'right' || dir === 'down') os.gameIdx = (os.gameIdx + 1) % total;
    } else if (os.menuStyle === 'grid' || os.menuStyle === 'cards') {
      const cols = os.menuStyle === 'cards' ? 3 : 4;
      if (dir === 'left') os.gameIdx = (os.gameIdx + total - 1) % total;
      if (dir === 'right') os.gameIdx = (os.gameIdx + 1) % total;
      if (dir === 'up') {
        if (os.gameIdx >= cols) {
          os.gameIdx -= cols;
        } else {
          const col = os.gameIdx % cols;
          const lastRowBase = Math.floor((total - 1) / cols) * cols;
          os.gameIdx =
            lastRowBase + col < total ? lastRowBase + col : Math.max(0, lastRowBase - cols + col);
        }
      }
      if (dir === 'down') {
        os.gameIdx =
          os.gameIdx + cols < total ? os.gameIdx + cols : os.gameIdx % cols;
      }
    } else {
      if (dir === 'up') os.gameIdx = (os.gameIdx + total - 1) % total;
      if (dir === 'down') os.gameIdx = (os.gameIdx + 1) % total;
      if (dir === 'left') os.gameIdx = (os.gameIdx + total - 5) % total;
      if (dir === 'right') os.gameIdx = (os.gameIdx + 5) % total;
    }
    if (dir) return 'hit';

    if (pressA && carts[os.gameIdx]) {
      const isPro = os.cb.getIsPro?.() ?? false;
      const selected = carts[os.gameIdx];
      if (isCartridgeProLocked(selected.id, isPro)) {
        os.openProScreen('PRO REQUIRED FOR THIS GAME!');
        return 'die';
      }
      os.cb.onLaunchGame(selected);
      return 'powerup';
    }
    return null;
  }

  if (os.app === 'calc') {
    if (os.isNumericDeckActive) {
      const ops = ['+', '-', '*', '/'];
      if (dir === 'left' || dir === 'right') {
        const curIdx = os.calcOp ? ops.indexOf(os.calcOp) : -1;
        const nextIdx =
          dir === 'right'
            ? (curIdx + 1) % ops.length
            : (curIdx - 1 + ops.length) % ops.length;
        const nextOp = ops[nextIdx];
        if (os.calcAcc === null) {
          os.pressCalcKey(nextOp);
        } else {
          os.calcOp = nextOp;
          os.calcFresh = true;
        }
        return 'hit';
      }
      if (dir === 'up') {
        os.pressCalcKey('C');
        return 'hit';
      }
      if (dir === 'down') {
        os.pressCalcKey('.');
        return 'hit';
      }
      if (pressA) {
        os.pressCalcKey('=');
        return 'score';
      }
      return null;
    }

    if (dir === 'up') os.calcR = (os.calcR + 3) % 4;
    if (dir === 'down') os.calcR = (os.calcR + 1) % 4;
    if (dir === 'left') os.calcC = (os.calcC + 4) % 5;
    if (dir === 'right') os.calcC = (os.calcC + 1) % 5;
    if (dir) return 'hit';
    if (pressA) {
      os.pressCalcKey(CALC_KEYS[os.calcR][os.calcC]);
      return 'score';
    }
    return null;
  }

  if (os.app === 'clock') {
    if (dir === 'left' || dir === 'right') {
      const tabs: ('clk' | 'sw' | 'cd')[] = ['clk', 'sw', 'cd'];
      const cur = tabs.indexOf(os.clockTab);
      os.clockTab =
        dir === 'right'
          ? tabs[(cur + 1) % tabs.length]
          : tabs[(cur + tabs.length - 1) % tabs.length];
      return 'hit';
    }
    if (os.clockTab === 'clk') {
      if (pressA) {
        os.toggleClockFace();
        return 'score';
      }
      return null;
    }
    if (os.clockTab === 'sw') {
      if (pressA) {
        os.swRunning = !os.swRunning;
        return 'score';
      }
      if (dir === 'up') {
        os.swRunning = false;
        os.swTime = 0;
        os.swLap = 0;
        return 'hit';
      }
      if (dir === 'down') {
        os.swLap = os.swTime;
        return 'hit';
      }
    } else {
      // Countdown Timer
      if (os.cdAlarmActive && pressA) {
        os.cdAlarmActive = false;
        RetroAudioEngine.stopNokiaMelody();
        os.cdRemaining = os.cdPresetSec;
        return 'hit';
      }
      if (pressA) {
        if (os.cdRemaining <= 0) os.cdRemaining = os.cdPresetSec;
        os.cdRunning = !os.cdRunning;
        return 'score';
      }
      if (dir === 'up') {
        os.cdRunning = false;
        os.cdPresetSec = Math.min(600, os.cdPresetSec + 15);
        os.cdRemaining = os.cdPresetSec;
        return 'hit';
      }
      if (dir === 'down') {
        os.cdRunning = false;
        os.cdPresetSec = Math.max(5, os.cdPresetSec - 5);
        os.cdRemaining = os.cdPresetSec;
        return 'hit';
      }
    }
    return null;
  }

  if (os.app === 'synth') {
    if (os.synthMode === 'list') {
      const total = os.songs.length;
      if (dir === 'up') {
        os.synthListIdx = (os.synthListIdx + total - 1) % total;
        os.synthClearConfirm = false;
        return 'hit';
      }
      if (dir === 'down') {
        os.synthListIdx = (os.synthListIdx + 1) % total;
        os.synthClearConfirm = false;
        return 'hit';
      }
      if (dir === 'left') {
        os.synthClearConfirm = false;
        if (!os.isCustomTune(os.synthListIdx)) return 'hit';
        const isPro = os.cb.getIsPro?.() ?? false;
        if (!isPro) {
          os.openProScreen('CUSTOM TUNES REQUIRE PRO!');
          return 'die';
        }
        os.tuneNameDraft = os.songs[os.synthListIdx].title.trim();
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
      if (dir === 'right') {
        if (!os.isCustomTune(os.synthListIdx)) {
          os.synthClearConfirm = false;
          return 'hit';
        }
        if (!os.synthClearConfirm) {
          os.synthClearConfirm = true;
          return 'hit';
        }
        os.songs[os.synthListIdx].notes = '';
        os.saveCustomTunes();
        os.synthClearConfirm = false;
        if (os.songIdx === os.synthListIdx && os.melodyPlaying) {
          os.melodyPlaying = false;
          RetroAudioEngine.stopNokiaMelody();
        }
        return 'explode';
      }
      if (pressA) {
        const isPro = os.cb.getIsPro?.() ?? false;
        if (os.isCustomTune(os.synthListIdx) && !isPro) {
          os.openProScreen('CUSTOM TUNES REQUIRE PRO!');
          return 'die';
        }
        os.songIdx = os.synthListIdx;
        os.synthMode = 'pad';
        os.synthClearConfirm = false;
        os.melodyPlaying = false;
        RetroAudioEngine.stopNokiaMelody();
        return 'score';
      }
      return null;
    }

    const totalKeys = COMPOSER_KEYS.length;
    if (dir === 'left') os.synthIdx = (os.synthIdx + totalKeys - 1) % totalKeys;
    if (dir === 'right') os.synthIdx = (os.synthIdx + 1) % totalKeys;
    if (dir === 'up') os.synthIdx = (os.synthIdx + totalKeys - 4) % totalKeys;
    if (dir === 'down') os.synthIdx = (os.synthIdx + 4) % totalKeys;
    if (dir) return 'hit';

    if (pressA) {
      const key = COMPOSER_KEYS[os.synthIdx];
      const curSong = os.songs[os.songIdx];
      if (key.token === 'SONG') {
        os.melodyPlaying = false;
        RetroAudioEngine.stopNokiaMelody();
        os.synthListIdx = os.songIdx;
        os.synthClearConfirm = false;
        os.synthMode = 'list';
        return 'score';
      }
      const isPro = os.cb.getIsPro?.() ?? false;
      if (os.isCustomTune() && !isPro) {
        os.melodyPlaying = false;
        RetroAudioEngine.stopNokiaMelody();
        os.openProScreen('CUSTOM TUNES REQUIRE PRO!');
        return 'die';
      }
      if (key.token === 'PLAY') {
        if (os.melodyPlaying) {
          os.melodyPlaying = false;
          RetroAudioEngine.stopNokiaMelody();
        } else {
          const res = RetroAudioEngine.playNokiaMelody(curSong.notes, curSong.bpm);
          os.melodyEvents = res.events;
          os.melodyDuration = res.totalSec;
          os.melodyTimer = 0;
          os.melodyPlaying = res.totalSec > 0;
        }
        return null;
      }
      if (key.token === 'RING') {
        os.ringtoneIdx = os.songIdx;
        const res = RetroAudioEngine.playNokiaMelody(curSong.notes, curSong.bpm);
        os.melodyEvents = res.events;
        os.melodyDuration = res.totalSec;
        os.melodyTimer = 0;
        os.melodyPlaying = res.totalSec > 0;
        return null;
      }
      if (key.token === 'DEL') {
        os.melodyPlaying = false;
        RetroAudioEngine.stopNokiaMelody();
        const parts = curSong.notes.trim().split(/\s+/).filter(Boolean);
        parts.pop();
        curSong.notes = parts.join(' ');
        if (os.isCustomTune()) os.saveCustomTunes();
        return 'hit';
      }
      os.melodyPlaying = false;
      RetroAudioEngine.stopNokiaMelody();
      RetroAudioEngine.playNokiaNote(key.token, curSong.bpm);
      const parts = curSong.notes.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 24) parts.shift();
      parts.push(key.token);
      curSong.notes = parts.join(' ');
      if (os.isCustomTune()) os.saveCustomTunes();
      return null;
    }
    return null;
  }

  if (os.app === 'paint') {
    if (os.paintOnBar) {
      if (dir === 'left') os.paintBarIdx = (os.paintBarIdx + 3) % 4;
      else if (dir === 'right') os.paintBarIdx = (os.paintBarIdx + 1) % 4;
      else if (dir === 'up') {
        os.paintOnBar = false;
        os.paintR = os.paintH - 1;
      } else if (dir === 'down') {
        os.paintOnBar = false;
        os.paintR = 0;
      }
      if (dir) return 'hit';
      if (pressA) {
        return execPaintBarAction(os, os.paintBarIdx);
      }
      return null;
    }

    if (dir === 'up') {
      if (os.paintR > 0) os.paintR--;
      else os.paintOnBar = true;
    }
    if (dir === 'down') {
      if (os.paintR < os.paintH - 1) os.paintR++;
      else os.paintOnBar = true;
    }
    if (dir === 'left') os.paintC = (os.paintC + os.paintW - 1) % os.paintW;
    if (dir === 'right') os.paintC = (os.paintC + 1) % os.paintW;
    if (pressA) {
      os.paintGrid[os.paintR][os.paintC] = !os.paintGrid[os.paintR][os.paintC];
      if (os.paintTitle === 'BLANK CANVAS') os.paintTitle = 'CUSTOM ART';
      return 'hit';
    }
    return null;
  }

  if (os.app === 'weather') {
    if (dir === 'left') {
      os.weatherCityIdx =
        (os.weatherCityIdx + WEATHER_CITIES.length - 1) % WEATHER_CITIES.length;
      os.weatherQuery = WEATHER_CITIES[os.weatherCityIdx];
      os.fetchWeather(os.weatherQuery);
      return 'hit';
    }
    if (dir === 'right') {
      os.weatherCityIdx = (os.weatherCityIdx + 1) % WEATHER_CITIES.length;
      os.weatherQuery = WEATHER_CITIES[os.weatherCityIdx];
      os.fetchWeather(os.weatherQuery);
      return 'hit';
    }
    if (dir === 'up' || dir === 'down') {
      os.fetchWeather(os.weatherQuery);
      return 'hit';
    }
    if (pressA) {
      os.cb.onRequestKeyboard?.(true);
      return 'score';
    }
    return null;
  }

  if (os.app === 'notes') {
    if (dir === 'up') {
      if (os.notes.length > 0) {
        os.noteIdx = (os.noteIdx + os.notes.length - 1) % os.notes.length;
      }
      os.noteDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'down') {
      if (os.notes.length > 0) {
        os.noteIdx = (os.noteIdx + 1) % os.notes.length;
      }
      os.noteDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'left') {
      os.noteDeleteConfirm = false;
      return 'hit';
    }
    if (dir === 'right') {
      if (os.notes.length === 0) return 'hit';
      if (!os.noteDeleteConfirm) {
        os.noteDeleteConfirm = true;
        return 'hit';
      }
      os.notes = os.notes.filter((_, idx) => idx !== os.noteIdx);
      os.noteIdx = Math.min(os.noteIdx, Math.max(0, os.notes.length - 1));
      os.noteDeleteConfirm = false;
      os.saveNotes();
      return 'explode';
    }
    if (pressA) {
      os.noteDeleteConfirm = false;
      os.cb.onRequestKeyboard?.(true);
      return 'score';
    }
    return null;
  }

  if (os.app === 'term') {
    if (dir === 'up') {
      os.termScroll = Math.max(0, os.termScroll - 1);
      return 'hit';
    }
    if (dir === 'down') {
      os.termScroll = Math.min(Math.max(0, os.termOut.length - 6), os.termScroll + 1);
      return 'hit';
    }
    if (dir === 'left') {
      os.termIdx =
        os.termIdx <= 0 ? TERM_PRESETS.length - 1 : os.termIdx - 1;
      os.termInput = TERM_PRESETS[os.termIdx];
      return 'hit';
    }
    if (dir === 'right') {
      os.termIdx = (os.termIdx + 1) % TERM_PRESETS.length;
      os.termInput = TERM_PRESETS[os.termIdx];
      return 'hit';
    }
    if (pressA) {
      if (os.termInput.trim().length > 0) {
        const cmd = os.termInput.trim();
        os.termInput = '';
        return os.execTermCmd(cmd);
      } else {
        os.cb.onRequestKeyboard?.(true);
        return 'score';
      }
    }
    return null;
  }

  if (os.app === 'wallpapers') {
    const total = REAL_POSTCARDS.length + 1;
    if (os.wallpaperViewMode === 'grid3x2' || os.wallpaperViewMode === 'grid4x3') {
      const cols = os.wallpaperViewMode === 'grid3x2' ? 3 : 4;
      if (dir === 'left') {
        os.wallpaperIdx = (os.wallpaperIdx + total - 1) % total;
        return 'hit';
      }
      if (dir === 'right') {
        os.wallpaperIdx = (os.wallpaperIdx + 1) % total;
        return 'hit';
      }
      if (dir === 'up') {
        if (os.wallpaperIdx >= cols) {
          os.wallpaperIdx -= cols;
        } else {
          const col = os.wallpaperIdx % cols;
          const lastRowBase = Math.floor((total - 1) / cols) * cols;
          os.wallpaperIdx =
            lastRowBase + col < total ? lastRowBase + col : Math.max(0, lastRowBase - cols + col);
        }
        return 'hit';
      }
      if (dir === 'down') {
        os.wallpaperIdx =
          os.wallpaperIdx + cols < total ? os.wallpaperIdx + cols : os.wallpaperIdx % cols;
        return 'hit';
      }
    } else {
      if (dir === 'left') {
        os.wallpaperIdx = (os.wallpaperIdx + total - 1) % total;
        return 'hit';
      }
      if (dir === 'right') {
        os.wallpaperIdx = (os.wallpaperIdx + 1) % total;
        return 'hit';
      }
      if (dir === 'up') {
        os.cycleWallpaperDim(-1);
        return 'hit';
      }
      if (dir === 'down') {
        os.cycleWallpaperDim(1);
        return 'hit';
      }
    }
    if (pressA) {
      const nextId =
        os.wallpaperIdx === 0 ? 'none' : REAL_POSTCARDS[os.wallpaperIdx - 1]?.id || 'none';
      if (os.wallpaperViewMode === 'preview' && os.wallpaperId === nextId && nextId !== 'none') {
        os.wallpaperCleanPreview = !os.wallpaperCleanPreview;
        return 'hit';
      }
      os.setWallpaperById(nextId);
      const card = os.getActiveWallpaper();
      os.smsBanner = card ? `[WP] ${card.title}` : `[WP] ${tOs('off', os.lang)}`;
      os.smsBannerTimer = 2.2;
      return 'powerup';
    }
    return null;
  }

  if (os.app === 'format') {
    return updateFormatSimFrame(os, dt, dir, pressA, pressB);
  }

  if (os.app === 'setup') {
    if (os.setupSubPage === 'menu_style') {
      const totalStyles = DESKTOP_MENU_STYLES.length;
      if (dir === 'up') {
        os.menuStylePickerIdx = (os.menuStylePickerIdx + totalStyles - 1) % totalStyles;
        return 'hit';
      }
      if (dir === 'down') {
        os.menuStylePickerIdx = (os.menuStylePickerIdx + 1) % totalStyles;
        return 'hit';
      }
      if (pressA) {
        const chosenStyle = DESKTOP_MENU_STYLES[os.menuStylePickerIdx];
        if (chosenStyle) {
          os.menuStyle = chosenStyle;
          AsyncStorage.setItem(MENU_STYLE_STORAGE_KEY, chosenStyle).catch(() => {});
          os.smsBanner = `[DESKTOP] ${chosenStyle.toUpperCase()}`;
          os.smsBannerTimer = 2.5;
          return 'powerup';
        }
      }
      return null;
    }

    const totalSetupItems = 11;
    if (dir === 'up') os.setupIdx = (os.setupIdx + totalSetupItems - 1) % totalSetupItems;
    if (dir === 'down') os.setupIdx = (os.setupIdx + 1) % totalSetupItems;
    if (dir === 'left' || dir === 'right') {
      if (os.setupIdx === 1) {
        os.cb.onCyclePalette();
        return 'score';
      }
      if (os.setupIdx === 2) {
        os.cycleWallpaper(dir === 'left' ? -1 : 1);
        return 'score';
      }
      if (os.setupIdx === 3) {
        const curIdx = DESKTOP_MENU_STYLES.indexOf(os.menuStyle);
        os.menuStylePickerIdx = curIdx >= 0 ? curIdx : 0;
        os.setupSubPage = 'menu_style';
        return 'score';
      }
      if (os.setupIdx === 4) {
        os.cb.onToggleScanlines();
        return 'score';
      }
      if (os.setupIdx === 5) {
        os.toggleClockFace();
        return 'score';
      }
      if (os.setupIdx === 6) {
        os.toggleLiveAiSms();
        return 'score';
      }
      if (os.setupIdx === 7) {
        os.toggleLang();
        return 'score';
      }
    }
    if (dir) return 'hit';
    if (pressA) {
      if (os.setupIdx === 0) {
        os.app = 'pro';
        os.proIdx = 0;
        os.proStatusMsg = '';
        return 'powerup';
      } else if (os.setupIdx === 1) {
        const curId = os.cb.getPaletteId?.();
        const idx = curId ? PALETTE_ORDER.indexOf(curId) : 0;
        os.themeIdx = idx >= 0 ? idx : 0;
        os.app = 'themes';
        return 'score';
      } else if (os.setupIdx === 2) {
        os.openWallpaperGallery();
        return 'score';
      } else if (os.setupIdx === 3) {
        // [A] Opens the dedicated Menu Style Picker page
        const curIdx = DESKTOP_MENU_STYLES.indexOf(os.menuStyle);
        os.menuStylePickerIdx = curIdx >= 0 ? curIdx : 0;
        os.setupSubPage = 'menu_style';
        return 'score';
      } else if (os.setupIdx === 4) os.cb.onToggleScanlines();
      else if (os.setupIdx === 5) os.toggleClockFace();
      else if (os.setupIdx === 6) os.toggleLiveAiSms();
      else if (os.setupIdx === 7) os.toggleLang();
      else if (os.setupIdx === 8) os.cb.onOpenCartVault();
      else if (os.setupIdx === 9) {
        os.app = 'boot';
        os.bootTimer = 0;
      } else if (os.setupIdx === 10) {
        openFormatSimulator(os, 0, false);
        return 'explode';
      }
      return 'powerup';
    }
    return null;
  }

  if (os.app === 'themes') {
    const total = PALETTE_ORDER.length;
    if (dir === 'up') os.themeIdx = (os.themeIdx + total - 1) % total;
    if (dir === 'down') os.themeIdx = (os.themeIdx + 1) % total;
    if (dir === 'left') os.themeIdx = (os.themeIdx + total - 5) % total;
    if (dir === 'right') os.themeIdx = (os.themeIdx + 5) % total;
    if (dir) return 'hit';

    if (pressA) {
      const isPro = os.cb.getIsPro?.() ?? false;
      const selectedId = PALETTE_ORDER[os.themeIdx];
      if (selectedId) {
        if (isPaletteProLocked(selectedId, isPro)) {
          os.openProScreen('PRO REQUIRED FOR THIS THEME!');
          return 'die';
        }
        os.cb.onSelectPalette?.(selectedId);
        return 'powerup';
      }
    }
    return null;
  }

  if (os.app === 'pro') {
    const isPro = os.cb.getIsPro?.() ?? false;
    const totalProItems = 5; // 0: Monthly, 1: Yearly, 2: Lifetime, 3: Restore, 4: Debug Revoke
    if (dir === 'up') os.proIdx = (os.proIdx + totalProItems - 1) % totalProItems;
    if (dir === 'down') os.proIdx = (os.proIdx + 1) % totalProItems;
    if (dir) return 'hit';

    if (pressA) {
      if (os.proBusy) return null;

      if (os.proIdx === 3) {
        // Restore purchases
        os.proBusy = true;
        os.proStatusMsg = tOs('proRestoring', os.lang);
        os.cb.onRestorePurchases?.().then((restored) => {
          os.proBusy = false;
          os.proStatusMsg = tOs(restored ? 'proRestored' : 'proNoPurchases', os.lang);
        }).catch(() => {
          os.proBusy = false;
          os.proStatusMsg = tOs('proRestoreErr', os.lang);
        });
        return 'powerup';
      }

      if (os.proIdx === 4) {
        // Debug: Revoke / Reset Purchases
        os.proBusy = true;
        os.proStatusMsg = tOs('proRevoking', os.lang);
        os.cb.onResetProDebug?.().then(() => {
          os.proBusy = false;
          os.proStatusMsg = tOs('proRevoked', os.lang);
        }).catch(() => {
          os.proBusy = false;
          os.proStatusMsg = tOs('proRevoked', os.lang);
        });
        return 'die';
      }

      const packageTypes: ('monthly' | 'yearly' | 'lifetime')[] = ['monthly', 'yearly', 'lifetime'];
      const targetType = packageTypes[os.proIdx];
      if (targetType) {
        if (isPro) {
          os.proStatusMsg = tOs('proAlreadyActive', os.lang);
          return 'score';
        }
        os.proBusy = true;
        os.proStatusMsg = tOs('proPurchasing', { title: targetType.toUpperCase() }, os.lang);
        os.cb.onPurchasePackage?.(targetType).then((res) => {
          os.proBusy = false;
          if (res.success || res.isPro) {
            os.proStatusMsg = tOs('proActivated', os.lang);
            os.triggerPurchaseSuccessSms(targetType);
          } else if (res.userCancelled) {
            os.proStatusMsg = tOs('proCancelled', os.lang);
            os.triggerPurchaseFailedSms('USER CANCELLED');
          } else {
            os.proStatusMsg = tOs('proDeclined', os.lang);
            os.triggerPurchaseFailedSms('CARD DECLINED');
          }
        }).catch((err) => {
          os.proBusy = false;
          os.proStatusMsg = tOs('proStoreErr', os.lang);
          os.triggerPurchaseFailedSms(err?.message || 'STORE ERROR');
        });
        return 'powerup';
      }
    }
    return null;
  }

  return null;
}
