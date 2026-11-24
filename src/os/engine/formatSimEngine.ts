import { ArcadeSound } from '../../arcade/types';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { pickLang, RetroLang } from '../../i18n/retroI18n';
import { RetroPalette } from '../../theme/palettes';
import type { RetroDeckOS } from '../RetroDeckOS';

export type FormatPresetId = 'win98_cd' | 'winxp_cd' | 'nokia_7370';
export type FormatPhase = 'select' | 'confirm' | 'wiping' | 'installing' | 'complete';
export type PostFormatWinStyle = 'win98' | 'winxp';

export const POST_FORMAT_THEME_DURATION_SEC = 45;

/** Temporary post-format Windows 98 SE Classic Teal + 3D Silver Console Palette */
export const WIN98_TEMP_PALETTE: RetroPalette = {
  id: 'nokia',
  name: 'WINDOWS 98 SE',
  tagline: 'Classic #008080 Teal & 3D Silver',
  category: 'CRT',
  screenBg: '#008080',
  pixelOn: '#FFFFFF',
  pixelGlow: 'rgba(255, 255, 255, 0.22)',
  scanlineColor: 'rgba(0, 32, 32, 0.12)',
  bezelAccent: '#DFDFDF',
  ledColor: '#00FF00',
  keypadAccent: '#000080',
  textMuted: '#B8DFDF',
  isLightLcd: false,
  chassisBg: '#23262B',
  deckBg: '#2F333B',
  bezelBg: '#1B1E24',
  surfaceBg: '#3A3F48',
  surfaceBorder: '#9AA2B1',
  buttonBg: '#464C57',
  buttonBorder: '#C0C6D4',
};

/** Temporary post-format Windows XP Professional Luna Royal Blue + Olive Start Palette */
export const WINXP_TEMP_PALETTE: RetroPalette = {
  id: 'gba_cobalt',
  name: 'WINDOWS XP LUNA',
  tagline: 'Bliss Sky & Luna Royal Taskbar',
  category: 'CRT',
  screenBg: '#1E5BB8',
  pixelOn: '#FFFFFF',
  pixelGlow: 'rgba(255, 255, 255, 0.25)',
  scanlineColor: 'rgba(0, 24, 72, 0.12)',
  bezelAccent: '#45B630',
  ledColor: '#45B630',
  keypadAccent: '#245EDC',
  textMuted: '#B8D4FF',
  isLightLcd: false,
  chassisBg: '#0E2046',
  deckBg: '#152F66',
  bezelBg: '#102552',
  surfaceBg: '#1D3F85',
  surfaceBorder: '#4D84EB',
  buttonBg: '#234B9E',
  buttonBorder: '#6BA0FF',
};

export function getPostFormatPalette(style: PostFormatWinStyle): RetroPalette {
  return style === 'winxp' ? WINXP_TEMP_PALETTE : WIN98_TEMP_PALETTE;
}

export interface FormatPresetMeta {
  id: FormatPresetId;
  title: string;
  subtitle: string;
  badge: string;
  winStyle: PostFormatWinStyle;
}

export interface FormatSimState {
  phase: FormatPhase;
  presetIdx: number;
  backupHomework: boolean;
  wipePct: number;
  installPct: number;
  stalledAtBadSector: boolean;
  badSectorFixed: boolean;
  stallTimer: number;
  shakeTimer: number;
  hddTickTimer: number;
  abortWarnTimer: number;
  smackCount: number;
  extraScrews: number;
}

export const FORMAT_PRESET_IDS: FormatPresetId[] = ['win98_cd', 'winxp_cd', 'nokia_7370'];

export function createInitialFormatState(presetIdx = 0): FormatSimState {
  return {
    phase: 'select',
    presetIdx: Math.max(0, Math.min(FORMAT_PRESET_IDS.length - 1, presetIdx)),
    backupHomework: true,
    wipePct: 0,
    installPct: 0,
    stalledAtBadSector: false,
    badSectorFixed: false,
    stallTimer: 0,
    shakeTimer: 0,
    hddTickTimer: 0,
    abortWarnTimer: 0,
    smackCount: 0,
    extraScrews: 2,
  };
}

export function getFormatPresets(lang: RetroLang): FormatPresetMeta[] {
  return [
    {
      id: 'win98_cd',
      title: pickLang(lang, 'WIN 98 SE FORMAT CD', 'WIN 98 SE FORMAT CD'),
      subtitle: pickLang(lang, 'Teal Desktop + Driver Pack', ' Klasik Yesil Masaustu + Driver'),
      badge: 'W98',
      winStyle: 'win98',
    },
    {
      id: 'winxp_cd',
      title: pickLang(lang, 'WIN XP SP3 LUNA CD', 'WIN XP SP3 KATILIMSIZ CD'),
      subtitle: pickLang(lang, 'Luna Blue + Bliss + Winamp', 'Mavi Gorev Cubugu + Winamp'),
      badge: 'XP',
      winStyle: 'winxp',
    },
    {
      id: 'nokia_7370',
      title: pickLang(lang, 'DOS C: / NOKIA *#7370#', 'DOS C: / NOKIA *#7370#'),
      subtitle: pickLang(lang, 'Code 12345 + Sector Wipe', 'Kod 12345 + Bad Sector Silme'),
      badge: 'DOS',
      winStyle: 'win98',
    },
  ];
}

export function getWipeLogLines(state: FormatSimState, lang: RetroLang): string[] {
  const presetId = FORMAT_PRESET_IDS[state.presetIdx] || 'win98_cd';
  const pct = state.wipePct;

  const homeworkLine = state.backupHomework
    ? pickLang(
        lang,
        'COPY C:\\HOMEWORK_8GB -> D:\\ [SAFE!]',
        'YEDEK C:\\ODEVLER_8GB -> D:\\ [KURTARILDI!]'
      )
    : pickLang(
        lang,
        'DEL C:\\HOMEWORK_8GB\\*.* [R.I.P.]',
        'SILINDI C:\\ODEVLER_8GB\\*.* [ELVEDA]'
      );

  const pool =
    presetId === 'nokia_7370'
      ? [
          pickLang(lang, 'AUTH NOKIA CODE [12345]... OK', 'GUVENLIK KODU [12345]... ONAYLANDI'),
          pickLang(lang, 'ERASING NHM-5NX EEPROM BLOCK 01', 'SILINIYOR NHM-5NX EEPROM BLOK 01'),
          homeworkLine,
          pickLang(lang, 'CLEARING SNAKE II SRAM CACHE...', 'TEMIZLENIYOR YILAN II BELLEGI...'),
          pickLang(lang, 'RESETTING T9 DICTIONARY & WAP...', 'SIFIRLANIYOR T9 SOZLUK & WAP...'),
          state.badSectorFixed
            ? pickLang(lang, '0x3310 SMACKED -> RECOVERED!', '0x3310 KASAYA VURULDU -> DUZELDI!')
            : pickLang(lang, 'VERIFYING 3310 FLASH SECTORS...', 'DOGRULANIYOR 3310 FLASH SEKTOR...'),
          pickLang(lang, 'EEPROM WIPE 100% VERIFIED.', 'EEPROM FORMAT %100 TAMAMLANDI.'),
        ]
      : [
          pickLang(lang, 'UNMOUNTING C:\\ FAT32 VOLUME...', 'AYRILIYOR C:\\ FAT32 SURUCUSU...'),
          homeworkLine,
          pickLang(lang, 'DEL C:\\WINAMP\\dj_kantik_club.mp3', 'SILINIYOR C:\\WINAMP\\dj_kantik.mp3'),
          pickLang(lang, 'DEL C:\\SYSTEM32\\mirc32.exe', 'SILINIYOR C:\\MASAUSTU\\yeni_klasor(9)'),
          pickLang(lang, 'DEL C:\\TEMP\\halflife_crossfire.bsp', 'SILINIYOR C:\\TEMP\\knight_patch.zip'),
          state.badSectorFixed
            ? pickLang(lang, 'BAD SECTOR 0x3310 -> SMACKED OK!', 'BOZUK SEKTOR 0x3310 -> TOKATLADIK OK!')
            : pickLang(lang, 'SCANNING CLUSTERS FOR BAD SECTORS', 'TARANIYOR DISK YUZEYI & SEKTORLER'),
          pickLang(lang, 'WRITING NEW MASTER BOOT RECORD...', 'YAZILIYOR YENI MASTER BOOT RECORD...'),
        ];

  const count = Math.max(1, Math.min(pool.length, Math.ceil((pct / 100) * pool.length)));
  return pool.slice(Math.max(0, count - 3), count);
}

export function getInstallEtaJoke(installPct: number, lang: RetroLang): string {
  if (installPct < 18) return pickLang(lang, '39 MIN', '39 DK');
  if (installPct < 38) return pickLang(lang, '148 MIN', '148 DK');
  if (installPct < 58) return pickLang(lang, '3 SEC', '3 SN');
  if (installPct < 84) return pickLang(lang, '39 MIN', '39 DK');
  return pickLang(lang, '1 SEC', '1 SN');
}

const FULL_CD_KEY = 'FCKGW-RD800-3310X-VIP99';

export function getInstallCdKeySlice(installPct: number): string {
  const chars = Math.min(FULL_CD_KEY.length, Math.floor((installPct / 75) * FULL_CD_KEY.length));
  return FULL_CD_KEY.slice(0, chars);
}

export function getInstallDriverChecklist(
  installPct: number,
  lang: RetroLang,
  winStyle: PostFormatWinStyle = 'win98'
): { done: boolean; active: boolean; label: string }[] {
  const skinLabel =
    winStyle === 'winxp'
      ? pickLang(lang, 'Luna XP Theme + Bliss Hills', 'XP Luna Mavi Tema + Yesil Tepe')
      : pickLang(lang, 'Win98 Teal Desktop + 3D Gray', 'Win98 Turkuaz Masaustu + Baslat');
  const items = [
    skinLabel,
    pickLang(lang, 'SoundBlaster 16 + 3310 Synth', 'SoundBlaster 16 + Ses Karti'),
    pickLang(lang, 'DirectX 9.0c + CRT Scanline', 'DirectX 9.0c + Ekran Karti'),
    pickLang(lang, 'Winamp 2.91 + WinRAR (Trial)', 'Winamp + WinRAR (40 Gun Deneme)'),
  ];
  const thresholds = [22, 48, 74, 96];
  return items.map((label, idx) => {
    const done = installPct >= thresholds[idx];
    const prev = idx === 0 ? 0 : thresholds[idx - 1];
    const active = !done && installPct >= prev;
    return { done, active, label };
  });
}

export const NOKIA_STARTUP_MELODY_NOTES =
  '8e2 8d2 4f#1 4g#1 8c#2 8b1 4d1 4e1 8b1 8a1 4c#1 4e1 2a1';
export const NOKIA_STARTUP_MELODY_BPM = 180;
export const WIN_ACTIVATION_MIN_GUARD_MS = 350;

function clearPendingTechSmsTimer(os: RetroDeckOS) {
  if (os.postFormatTechSmsTimeout) {
    clearTimeout(os.postFormatTechSmsTimeout);
    os.postFormatTechSmsTimeout = null;
  }
}

export function activatePostFormatWinTheme(
  os: RetroDeckOS,
  style: PostFormatWinStyle,
  durationSec = POST_FORMAT_THEME_DURATION_SEC,
  startImmediately = true,
  nowMs = Date.now()
) {
  clearPendingTechSmsTimer(os);
  os.postFormatWinStyle = style;
  os.postFormatWinTimer = durationSec;
  os.postFormatWinActivationScreen = false;
  os.postFormatWinActivationShownAtMs = 0;

  if (startImmediately) {
    os.postFormatWinPendingBoot = false;
    os.postFormatWinExpiresAtMs = nowMs + durationSec * 1000;
  } else {
    os.postFormatWinPendingBoot = true;
    os.postFormatWinExpiresAtMs = null;
  }

  os.cb.onSetTemporaryPalette?.(getPostFormatPalette(style));
}

export function startPostFormatWinCountdownOnDesktopEntry(
  os: RetroDeckOS,
  nowMs = Date.now()
) {
  if (!os.postFormatWinStyle || !os.postFormatWinPendingBoot) return;
  const chosenStyle = os.postFormatWinStyle;
  const durationSec = os.postFormatWinTimer > 0 ? os.postFormatWinTimer : POST_FORMAT_THEME_DURATION_SEC;

  os.postFormatWinPendingBoot = false;
  os.postFormatWinExpiresAtMs = nowMs + durationSec * 1000;

  // Play Windows 98 / XP style ascending startup chime right as desktop lands!
  if (chosenStyle === 'winxp') {
    RetroAudioEngine.playNokiaMelody('8d#2 8a#1 8g#2 4d#2 4a#2', 155);
  } else {
    RetroAudioEngine.playNokiaMelody('8f1 8c2 8g2 4c3', 145);
  }

  // Deliver hilarious post-format technician SMS shortly after landing on Desktop
  clearPendingTechSmsTimer(os);
  const screws = os.formatSim.extraScrews;
  const savedHw = os.formatSim.backupHomework;
  os.postFormatTechSmsTimeout = setTimeout(() => {
    os.postFormatTechSmsTimeout = null;
    if (!os.postFormatWinStyle || os.postFormatWinActivationScreen) return;
    const lang = os.lang;
    const sender = pickLang(lang, 'PC-TECH GUY', 'BILGISAYARCI');
    const osTag = chosenStyle === 'winxp' ? 'Windows XP Luna' : 'Windows 98 SE';
    const hwNoteEn = savedHw ? 'Saved HOMEWORK_8GB to D:.' : 'R.I.P. your C: folders.';
    const hwNoteTr = savedHw ? "ODEVLER_8GB D'ye yedeklendi." : "C'deki her sey uctu gecmis olsun.";
    const text = pickLang(
      lang,
      `Bro fresh ${osTag} installed (45s crack trial :D)! ${hwNoteEn} Left ${screws} extra case screws on the desk, runs faster now!`,
      `Kardesim ${osTag} kurdum cillop gibi oldu (45sn deneme crackli :D). ${hwNoteTr} Kasadan ${screws} vida artti ellemeyelim!`
    );

    os.smsList.unshift({
      sender,
      title: `SIM•${chosenStyle.toUpperCase()}`,
      text,
      artKey: 'WINK',
      isLivePersona: false,
      isSimulated: true,
      timestamp: os.formatClock(),
      mood: pickLang(lang, 'FRESH OS', 'TERTEMIZ'),
    });
    if (os.smsList.length > 25) os.smsList.pop();
    os.smsIdx = 0;
    os.smsBanner = `✉ [SIM] ${sender} (${chosenStyle.toUpperCase()})`;
    os.smsBannerTimer = 5.0;
    if (os.app !== 'sms' || os.keyLocked) {
      os.unreadSmsCount += 1;
    }
    os.saveSmsList();
    os.playActiveSmsTone();
  }, 1600);
}

/**
 * Wall-clock check for the 45-second temporary Windows 98 / XP aesthetic.
 * Accurately tracks elapsed time across OS screen changes, Arcade games, modals,
 * Keyguard screensaver, and Android/iOS backgrounding (`Date.now()`).
 */
export function syncPostFormatWinTimer(
  os: RetroDeckOS,
  nowMs = Date.now(),
  isAppActive = true
): boolean {
  if (
    !os.postFormatWinStyle ||
    os.postFormatWinActivationScreen ||
    os.postFormatWinExpiresAtMs === null
  ) {
    return false;
  }

  const remainingMs = os.postFormatWinExpiresAtMs - nowMs;
  if (remainingMs > 0) {
    os.postFormatWinTimer = remainingMs / 1000;
    return false;
  }

  os.postFormatWinTimer = 0;
  // Wait to present the interactive Activation screen & error tone until app is in foreground
  if (!isAppActive) {
    return false;
  }

  clearPendingTechSmsTimer(os);
  os.postFormatWinExpiresAtMs = null;
  os.postFormatWinPendingBoot = false;
  os.postFormatWinActivationScreen = true;
  os.postFormatWinActivationShownAtMs = nowMs;
  os.keyLocked = false;
  os.unlockStage = false;
  os.smsBannerTimer = 0;
  os.cb.onRequestKeyboard?.(false);

  // Classic two-tone Windows Genuine Advantage error chord
  RetroAudioEngine.playNokiaMelody('16g1 8c1', 165);
  os.cb.onWinTrialExpired?.();
  return true;
}

/**
 * Triggered on "Press any key to continue." on the WINDOWS ACTIVATION screen.
 * Restores the user's real RetroDeck OS theme, boots RetroDeck OS, and plays the iconic Nokia Startup Tune!
 */
export function dismissPostFormatWinActivation(
  os: RetroDeckOS,
  nowMs = Date.now(),
  bypassGuard = false
): boolean {
  if (!os.postFormatWinActivationScreen) return false;
  if (!bypassGuard && nowMs - os.postFormatWinActivationShownAtMs < WIN_ACTIVATION_MIN_GUARD_MS) {
    return false;
  }

  clearPendingTechSmsTimer(os);
  os.postFormatWinActivationScreen = false;
  os.postFormatWinActivationShownAtMs = 0;
  os.postFormatWinStyle = null;
  os.postFormatWinExpiresAtMs = null;
  os.postFormatWinPendingBoot = false;
  os.postFormatWinTimer = 0;

  os.cb.onSetTemporaryPalette?.(null);
  os.app = 'boot';
  os.bootTimer = 0;
  os.keyLocked = false;
  os.unlockStage = false;
  os.idleTimer = 0;
  os.cb.onRequestKeyboard?.(false);

  // Iconic Nokia Startup / Connecting People Melody!
  RetroAudioEngine.playNokiaMelody(NOKIA_STARTUP_MELODY_NOTES, NOKIA_STARTUP_MELODY_BPM);
  return true;
}

export function clearPostFormatWinTheme(os: RetroDeckOS) {
  clearPendingTechSmsTimer(os);
  if (!os.postFormatWinStyle && !os.postFormatWinActivationScreen) return;
  os.postFormatWinStyle = null;
  os.postFormatWinTimer = 0;
  os.postFormatWinExpiresAtMs = null;
  os.postFormatWinPendingBoot = false;
  os.postFormatWinActivationScreen = false;
  os.postFormatWinActivationShownAtMs = 0;
  os.cb.onSetTemporaryPalette?.(null);
}

export function openFormatSimulator(os: RetroDeckOS, presetIdx = 0, skipToConfirm = false) {
  const next = createInitialFormatState(presetIdx);
  if (skipToConfirm) {
    next.phase = 'confirm';
  }
  os.formatSim = next;
  os.app = 'format';
  os.keyLocked = false;
  os.unlockStage = false;
  os.idleTimer = 0;
  os.cb.onRequestKeyboard?.(false);
}

export function finishFormatSimulationAndReboot(os: RetroDeckOS): ArcadeSound {
  const presets = getFormatPresets(os.lang);
  const preset = presets[os.formatSim.presetIdx] || presets[0];
  const chosenStyle: PostFormatWinStyle =
    preset.id === 'nokia_7370'
      ? Math.random() < 0.5
        ? 'winxp'
        : 'win98'
      : preset.winStyle;

  // Arm temporary Windows 98 / XP mode; 45s wall-clock countdown starts right as boot finishes!
  activatePostFormatWinTheme(os, chosenStyle, POST_FORMAT_THEME_DURATION_SEC, false);

  os.recordMajorSimEvent(
    'FORMAT_COMPLETE',
    `${preset?.title || 'FORMAT C:'} (${chosenStyle.toUpperCase()} THEME)`
  );

  os.app = 'boot';
  os.bootTimer = 0;
  os.cb.onRequestKeyboard?.(false);

  return 'powerup';
}

export function updateFormatSimFrame(
  os: RetroDeckOS,
  dt: number,
  dir: 'up' | 'down' | 'left' | 'right' | null,
  pressA: boolean,
  pressB: boolean
): ArcadeSound | null {
  const st = os.formatSim;

  if (st.shakeTimer > 0) {
    st.shakeTimer = Math.max(0, st.shakeTimer - dt);
  }
  if (st.abortWarnTimer > 0) {
    st.abortWarnTimer = Math.max(0, st.abortWarnTimer - dt);
  }

  // Stage 1: BIOS / Media Selection
  if (st.phase === 'select') {
    if (pressB) {
      os.app = 'desktop';
      return 'hit';
    }
    if (dir === 'up') {
      st.presetIdx = (st.presetIdx + FORMAT_PRESET_IDS.length - 1) % FORMAT_PRESET_IDS.length;
      return 'hit';
    }
    if (dir === 'down') {
      st.presetIdx = (st.presetIdx + 1) % FORMAT_PRESET_IDS.length;
      return 'hit';
    }
    if (dir === 'left' || dir === 'right') {
      st.backupHomework = !st.backupHomework;
      return 'score';
    }
    if (pressA) {
      st.phase = 'confirm';
      return 'score';
    }
    return null;
  }

  // Stage 2: Scary Retro Confirmation
  if (st.phase === 'confirm') {
    if (pressB) {
      st.phase = 'select';
      return 'hit';
    }
    if (dir === 'left' || dir === 'right') {
      st.backupHomework = !st.backupHomework;
      return 'hit';
    }
    if (pressA) {
      st.phase = 'wiping';
      st.wipePct = 0;
      st.installPct = 0;
      st.stalledAtBadSector = false;
      st.badSectorFixed = false;
      st.stallTimer = 0;
      st.smackCount = 0;
      st.extraScrews = 1 + Math.floor(Math.random() * 3);
      return 'explode';
    }
    return null;
  }

  // Stage 3: Sector-by-Sector Wiping + 68% Bad Sector "Smack Case" Gag
  if (st.phase === 'wiping') {
    if (pressB) {
      if (st.abortWarnTimer > 0) {
        os.app = 'desktop';
        return 'die';
      }
      st.abortWarnTimer = 3.0;
      st.shakeTimer = 0.25;
      return 'die';
    }

    if (st.stalledAtBadSector) {
      st.stallTimer += dt;
      if (pressA) {
        st.stalledAtBadSector = false;
        st.badSectorFixed = true;
        st.smackCount += 1;
        st.shakeTimer = 0.35;
        st.wipePct = 76;
        return 'explode';
      }
      if (st.stallTimer >= 2.8) {
        st.stalledAtBadSector = false;
        st.badSectorFixed = true;
        st.wipePct = 74;
        return 'score';
      }
      return null;
    }

    const prevPct = st.wipePct;
    st.wipePct += dt * 16.5;
    if (pressA) {
      st.wipePct += 8.5;
      st.smackCount += 1;
      st.shakeTimer = 0.14;
    }

    if (!st.badSectorFixed && prevPct < 68 && st.wipePct >= 68) {
      st.wipePct = 68;
      st.stalledAtBadSector = true;
      st.stallTimer = 0;
      st.shakeTimer = 0.25;
      return 'die';
    }

    if (st.wipePct >= 100) {
      st.wipePct = 100;
      st.phase = 'installing';
      st.installPct = 0;
      return 'powerup';
    }

    st.hddTickTimer += dt;
    if (pressA) return 'shoot';
    if (st.hddTickTimer >= 0.42) {
      st.hddTickTimer = 0;
      return 'hit';
    }
    return null;
  }

  // Stage 4: OS & Driver Pack Reinstallation ("39 Minutes Remaining" Gag)
  if (st.phase === 'installing') {
    if (pressB) {
      if (st.abortWarnTimer > 0) {
        os.app = 'desktop';
        return 'die';
      }
      st.abortWarnTimer = 3.0;
      st.shakeTimer = 0.22;
      return 'die';
    }

    st.installPct += dt * 15.5;
    if (pressA) {
      st.installPct += 10;
      st.shakeTimer = 0.1;
    }

    if (st.installPct >= 100) {
      st.installPct = 100;
      st.phase = 'complete';
      RetroAudioEngine.playNokiaMelody('16e2 16d2 8f#1 8g#1 16c#2 16b1 8d1 8e1 16b1 16a1 8c#1 8e1 4a1', 180);
      return 'powerup';
    }

    st.hddTickTimer += dt;
    if (pressA) return 'score';
    if (st.hddTickTimer >= 0.5) {
      st.hddTickTimer = 0;
      return 'hit';
    }
    return null;
  }

  // Stage 5: Complete Summary -> Reboot to Fresh Win98 / WinXP Desktop!
  if (st.phase === 'complete') {
    if (pressA || pressB) {
      return finishFormatSimulationAndReboot(os);
    }
    return null;
  }

  return null;
}
