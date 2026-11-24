export type RetroLang = 'en' | 'tr';

export const LANG_STORAGE_KEY = '@retrodeck8_lang_v1';

let currentLang: RetroLang = 'en';

export function getRetroLang(): RetroLang {
  return currentLang;
}

export function setRetroLang(lang: RetroLang) {
  currentLang = lang === 'tr' ? 'tr' : 'en';
}

/** Inline bilingual picker — English first, Turkish second */
export function pickLang<T>(lang: RetroLang, en: T, tr: T): T {
  return lang === 'tr' ? tr : en;
}

export const DESKTOP_LABELS: Record<RetroLang, Record<string, string>> = {
  en: {
    arcade: 'GAMES',
    radio: 'RADIO',
    ai: 'CHAT',
    wap: 'WAP',
    synth: 'MUSIC',
    phone: 'PHONE',
    sms: 'SMS',
    profiles: 'PROFILE',
    calc: 'CALC',
    clock: 'CLOCK',
    paint: 'PAINT',
    weather: 'WEATHER',
    notes: 'NOTES',
    term: 'SHELL',
    stats: 'STATS',
    setup: 'SETUP',
  },
  tr: {
    arcade: 'OYUN',
    radio: 'RADYO',
    ai: 'SOHBET',
    wap: 'WAP',
    synth: 'MUZIK',
    phone: 'TELEFON',
    sms: 'SMS',
    profiles: 'PROFIL',
    calc: 'HESAP',
    clock: 'SAAT',
    paint: 'CIZIM',
    weather: 'HAVA',
    notes: 'NOTLAR',
    term: 'KONSOL',
    stats: 'SKOR',
    setup: 'AYAR',
  },
};

export const OS_STRINGS = {
  en: {
    setupTitle: 'SYSTEM SETUP',
    setupProActive: '★ RETRODECK PRO: ACTIVE',
    setupProUpgrade: '★ UPGRADE: RETRODECK PRO',
    setupPalette: 'PALETTE',
    setupScanlines: 'CRT SCANLINES',
    setupClockFace: 'CLOCK FACE',
    setupLiveSms: 'LIVE AI SMS',
    setupLanguage: 'LANGUAGE: ENGLISH (EN)',
    setupVault: 'OPEN FULL CARTRIDGE VAULT',
    setupReboot: 'REBOOT RETRODECK OS',
    on: 'ON',
    off: 'OFF',
    analog: 'ANALOG',
    digital: 'DIGITAL',
    unlockPrompt: 'UNLOCK: PRESS [A] THEN [▲] (*)',
    unlockNow: 'NOW PRESS [▲] (*) TO UNLOCK!',
    keyguardLocked: 'KEYGUARD LOCKED',
    newMsgSingle: 'NEW MESSAGE',
    newMsgPlural: 'NEW MESSAGES',
    smsNewBanner: 'NEW SMS',
    smsDeleted: 'SMS DELETED!',
    inboxEmpty: 'INBOX EMPTY!',
    confirmDel: 'CONFIRM DEL',
    from: 'FROM',
    prev: '▲ PREV',
    more: '▼ MORE',
    footerDesktop: '[A] OPEN   [D-PAD] MOVE   [KBD] KEYBOARD',
    footerRadio: '[A] PLAY/STOP   [◀/▶] STATION   [▲/▼] VOL   [B] DESKTOP',
    footerAi: '[A] KBD/SEND   [◀/▶] TAB   [B] DESKTOP',
    footerSms: '[◀/▶] READ   [▼]x2/DEL DELETE   [A] AI REPLY   [B] DESKTOP',
    footerWeather: '[◀/▶] CITY   [▲/▼] REFRESH   [A] SEARCH   [B] DESKTOP',
    footerNotes: '[A] NEW NOTE   [▲/▼] SELECT   [▶]x2 DELETE   [B] DESKTOP',
    footerPaint: '[A] PIXEL / SELECT   [D-PAD] DRAW & TOOLBAR   [B] EXIT',
    footerDefault: '[A] ACTION   [B] DESKTOP',
    aiWelcome1: 'AI> WELCOME TO RETRODECK AI!',
    aiWelcome2: 'AI> PRESS [KBD] OR [A] TO TYPE,',
    aiWelcome3: 'AI> OR [RIGHT] FOR BYOK KEYS.',
  },
  tr: {
    setupTitle: 'SISTEM AYARLARI',
    setupProActive: '★ RETRODECK PRO: AKTIF',
    setupProUpgrade: '★ YUKSELT: RETRODECK PRO',
    setupPalette: 'PALET',
    setupScanlines: 'CRT TARAMA',
    setupClockFace: 'SAAT TIPI',
    setupLiveSms: 'CANLI AI SMS',
    setupLanguage: 'DIL: TURKCE (TR)',
    setupVault: 'TUM OYUN KARTUSLARI',
    setupReboot: 'SISTEMI YENIDEN BASLAT',
    on: 'ACIK',
    off: 'KAPALI',
    analog: 'ANALOG',
    digital: 'DIJITAL',
    unlockPrompt: 'ACMAK ICIN: [A] SONRA [▲] (*)',
    unlockNow: 'SIMDI KILIT ACMAK ICIN [▲] (*) BAS!',
    keyguardLocked: 'TUS KILIDI AKTIF',
    newMsgSingle: 'YENI MESAJ',
    newMsgPlural: 'YENI MESAJ',
    smsNewBanner: 'YENI SMS',
    smsDeleted: 'SMS SILINDI!',
    inboxEmpty: 'KUTU BOS!',
    confirmDel: 'SILMEYI ONAYLA',
    from: 'KIMDEN',
    prev: '▲ YUKARI',
    more: '▼ ASAGI',
    footerDesktop: '[A] AC   [YON] SEC   [KBD] KLAVYE',
    footerRadio: '[A] CAL/DUR   [◀/▶] KANAL   [▲/▼] SES   [B] ANA EKRAN',
    footerAi: '[A] YAZ/GONDER   [◀/▶] SEKME   [B] ANA EKRAN',
    footerSms: '[◀/▶] OKU   [▼]x2/DEL SIL   [A] AI CEVAP   [B] ANA EKRAN',
    footerWeather: '[◀/▶] SEHIR   [▲/▼] YENILE   [A] ARA   [B] ANA EKRAN',
    footerNotes: '[A] YENI NOT   [▲/▼] SEC   [▶]x2 SIL   [B] ANA EKRAN',
    footerPaint: '[A] CIZ / SEC   [YON] TUVAL & ARAC   [B] CIKIS',
    footerDefault: '[A] ISLEM   [B] ANA EKRAN',
    aiWelcome1: 'AI> RETRODECK AI ASISTANA HOS GELDIN!',
    aiWelcome2: 'AI> YAZMAK ICIN [KBD] VEYA [A] BAS,',
    aiWelcome3: 'AI> YA DA BYOK ICIN [SAG] TUSA BAS.',
  },
} as const;

export type OsStringKey = keyof typeof OS_STRINGS.en;

export function tOs(key: OsStringKey, lang: RetroLang = currentLang): string {
  return OS_STRINGS[lang][key] ?? OS_STRINGS.en[key];
}

export function getDesktopLabel(appId: string, fallback: string, lang: RetroLang = currentLang): string {
  return DESKTOP_LABELS[lang]?.[appId] ?? DESKTOP_LABELS.en[appId] ?? fallback;
}
