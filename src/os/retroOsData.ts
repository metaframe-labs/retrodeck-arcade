import { Ionicons } from '@expo/vector-icons';
import type { RetroLang } from '../i18n/retroI18n';

export const CLOCK_FACE_STORAGE_KEY = '@retrodeck8_clock_face_v1';
export const WEATHER_CITY_STORAGE_KEY = '@retrodeck8_weather_city_v2';
export const NOTES_STORAGE_KEY = '@retrodeck8_notes_v1';
export const MY_TUNES_STORAGE_KEY = '@retrodeck8_custom_tunes_v1';
export const SMS_TONE_STORAGE_KEY = '@retrodeck8_sms_tone_v1';
export const SMS_LIST_STORAGE_KEY = '@retrodeck8_sms_list_v1';
export const LIVE_AI_SMS_STORAGE_KEY = '@retrodeck8_live_ai_sms_v1';
export const LIVE_SMS_HISTORY_STORAGE_KEY = '@retrodeck8_live_sms_history_v1';
export const CONTACTS_STORAGE_KEY = '@retrodeck8_contacts_v1';

export const DYNAMIC_MOODS_BY_LANG: Record<RetroLang, string[]> = {
  en: [
    'CHEERFUL & UPBEAT',
    'RUSHED & PANICKED',
    'SLEEPY & ZONING OUT',
    'SARCASTIC & WITTY',
    'DRAMATIC & EXTRA',
    'WARM & CURIOUS',
  ],
  tr: [
    'NESELI VE ENERJIK',
    'ACELECI VE TELASLI',
    'UYKULU VE DALGIN',
    'ALAYCI VE ESPRILI',
    'DRAMATIK VE ABARTILI',
    'SAMIMI VE MERAKLI',
  ],
};

export const UNEXPECTED_TWISTS_BY_LANG: Record<RetroLang, string[]> = {
  en: [
    'Suddenly tie the message to something hilarious or unexpected (e.g., texted the wrong person, weird dream, neighbor cat drama, or an absurd claim).',
    'Slip a small, unexpected surprise or absurd detail naturally into the SMS.',
    'Write in a funny, genuinely shocked tone as if something bizarre just happened 10 seconds ago.',
  ],
  tr: [
    'Konuyu aniden cok komik veya beklenmedik bir olaya bagla (ornek: yanlislikla baskasina atacakmis gibi, garip bir ruya, komsunun kedisi veya sacma bir iddia).',
    'Mesajin icine kucuk, beklenmedik bir surpriz veya absurt bir detay sikistir.',
    'Sanki az once tuhaf bir sey yasamissin gibi sasirmis ve komik bir tonda yaz.',
  ],
};

export const DYNAMIC_MOODS = DYNAMIC_MOODS_BY_LANG.en;
export const UNEXPECTED_TWISTS = UNEXPECTED_TWISTS_BY_LANG.en;

export const DEFAULT_CUSTOM_TUNES: NokiaSong[] = [
  { title: 'MY TUNE 1', bpm: 140, notes: '' },
  { title: 'MY TUNE 2', bpm: 140, notes: '' },
  { title: 'MY TUNE 3', bpm: 140, notes: '' },
];

export type OsAppId =
  | 'boot'
  | 'desktop'
  | 'arcade'
  | 'radio'
  | 'ai'
  | 'wap'
  | 'synth'
  | 'phone'
  | 'contacts'
  | 'sms'
  | 'profiles'
  | 'calc'
  | 'clock'
  | 'paint'
  | 'weather'
  | 'notes'
  | 'stats'
  | 'term'
  | 'setup'
  | 'themes'
  | 'pro';

export interface PixelSpan {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Run-length encodes a bitmap string array into centered horizontal rects for locked 60 FPS */
export function buildPixelSpans(
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

export interface DesktopIcon {
  id: OsAppId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'arcade', label: 'GAMES', icon: 'game-controller' },
  { id: 'radio', label: 'RADIO', icon: 'radio' },
  { id: 'ai', label: 'CHAT', icon: 'chatbubble-ellipses' },
  { id: 'wap', label: 'WAP', icon: 'globe' },
  { id: 'synth', label: 'MUSIC', icon: 'musical-notes' },
  { id: 'phone', label: 'PHONE', icon: 'call' },
  { id: 'contacts', label: 'CONTACTS', icon: 'people' },
  { id: 'sms', label: 'SMS', icon: 'mail' },
  { id: 'profiles', label: 'PROFILE', icon: 'notifications' },
  { id: 'calc', label: 'CALC', icon: 'calculator' },
  { id: 'clock', label: 'CLOCK', icon: 'time' },
  { id: 'paint', label: 'PAINT', icon: 'brush' },
  { id: 'weather', label: 'WEATHER', icon: 'partly-sunny' },
  { id: 'notes', label: 'NOTES', icon: 'document-text' },
  { id: 'term', label: 'SHELL', icon: 'terminal' },
  { id: 'stats', label: 'STATS', icon: 'bar-chart' },
  { id: 'setup', label: 'SETUP', icon: 'settings' },
];

export const WEATHER_CITIES = [
  'Palo Alto',
  'Mountain View',
  'Istanbul',
  'Ankara',
  'London',
  'Tokyo',
  'New York',
  'Berlin',
  'Seoul',
];

export type WeatherSpriteKey = 'SUN' | 'CLOUD' | 'RAIN' | 'STORM' | 'SNOW';

export const WEATHER_SPRITES: Record<WeatherSpriteKey, PixelSpan[]> = {
  SUN: buildPixelSpans(
    [
      '.......##.......',
      '..#....##....#..',
      '...#........#...',
      '.....######.....',
      '....########....',
      '.##.########.##.',
      '.##.########.##.',
      '....########....',
      '.....######.....',
      '...#........#...',
      '..#....##....#..',
      '.......##.......',
    ],
    3,
    48,
    36
  ),
  CLOUD: buildPixelSpans(
    [
      '................',
      '......####......',
      '....########....',
      '...##########...',
      '.##############.',
      '################',
      '################',
      '.##############.',
      '................',
      '................',
      '................',
      '................',
    ],
    3,
    48,
    36
  ),
  RAIN: buildPixelSpans(
    [
      '......####......',
      '....########....',
      '..############..',
      '.##############.',
      '.##############.',
      '..############..',
      '................',
      '...#...#...#....',
      '..#...#...#.....',
      '...#...#...#....',
      '..#...#...#.....',
      '................',
    ],
    3,
    48,
    36
  ),
  STORM: buildPixelSpans(
    [
      '......####......',
      '....########....',
      '..############..',
      '.##############.',
      '..############..',
      '.......###......',
      '......###.......',
      '.....######.....',
      '.......###......',
      '......##........',
      '.....#..........',
      '................',
    ],
    3,
    48,
    36
  ),
  SNOW: buildPixelSpans(
    [
      '......####......',
      '....########....',
      '..############..',
      '.##############.',
      '..############..',
      '................',
      '..#..#....#..#..',
      '...##......##...',
      '..#..#....#..#..',
      '....#..##..#....',
      '.....#....#.....',
      '................',
    ],
    3,
    48,
    36
  ),
};

export function decodeWmoWeather(code: number): { label: string; sprite: WeatherSpriteKey } {
  if (code === 0) return { label: 'CLEAR SKY', sprite: 'SUN' };
  if (code <= 3) return { label: code === 1 ? 'MAINLY CLEAR' : 'CLOUDY', sprite: 'CLOUD' };
  if (code === 45 || code === 48) return { label: 'FOGGY', sprite: 'CLOUD' };
  if (code >= 51 && code <= 67) return { label: 'RAIN', sprite: 'RAIN' };
  if (code >= 71 && code <= 77) return { label: 'SNOW', sprite: 'SNOW' };
  if (code >= 80 && code <= 82) return { label: 'SHOWERS', sprite: 'RAIN' };
  if (code >= 85 && code <= 86) return { label: 'SNOW SHWR', sprite: 'SNOW' };
  if (code >= 95) return { label: 'THUNDERSTORM', sprite: 'STORM' };
  return { label: 'OVERCAST', sprite: 'CLOUD' };
}

export interface PixelNoteItem {
  id: string;
  text: string;
  ts: string;
}

export const DEFAULT_NOTES: PixelNoteItem[] = [
  { id: '1', text: 'WELCOME TO RETRODECK NOTES!', ts: 'RD-OS' },
  { id: '2', text: 'PRESS [A] OR [KBD] TO ADD NOTE', ts: 'TIP' },
];

export const WAP_BOOKMARKS = [
  'https://www.metaframelabs.space/',
  'https://news.ycombinator.com/',
  'https://lite.cnn.com/',
  'https://en.m.wikipedia.org/wiki/Nokia_3310',
  'https://github.com/neurodivergent-dev',
];

export function parseHtmlToWapLines(html: string): string[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/gi, '\n=== $1 ===\n')
    .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, '\n[ $1 ]\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<(p|div|section|header|article|tr|br|h[4-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/gi, ' - ')
    .replace(/&ndash;/gi, '-')
    .replace(/&middot;/gi, '·')
    .replace(/&rarr;/gi, '->')
    .replace(/&darr;/gi, 'v')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  const rawLines = cleaned
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);

  const out: string[] = [];
  for (const line of rawLines) {
    out.push(...wrapTextLines(line, 33));
    if (out.length >= 140) break;
  }
  return out.length > 0 ? out : ['(EMPTY WAP DECK)'];
}

// Wide 36x10 (72x14 aspect ratio) Iconic Nokia 3310 Picture Message Banners!
export type PicArtKey =
  | 'COFFEE'
  | 'SMILE'
  | 'COOL'
  | 'WINK'
  | 'HEART'
  | 'SAD'
  | 'CAT'
  | 'ALIEN'
  | 'SKULL'
  | 'MUSIC'
  | 'CAKE'
  | 'SNAKE'
  | 'VIP_CROWN'
  | 'ROCKET'
  | 'TROPHY'
  | 'GHOST'
  | 'GAMEPAD'
  | 'SUNSET'
  | 'EIFFEL'
  | 'BEACH'
  | 'MOUNTAIN'
  | 'CITYLINE'
  | 'CAMPFIRE'
  | 'LIGHTHOUSE'
  | 'CASTLE'
  | 'LOVE_LETTER'
  | 'FIREWORKS'
  | 'TRAIN_TRIP';

export const ALL_PIC_ART_KEYS: PicArtKey[] = [
  'EIFFEL',
  'BEACH',
  'MOUNTAIN',
  'CITYLINE',
  'CAMPFIRE',
  'LIGHTHOUSE',
  'CASTLE',
  'LOVE_LETTER',
  'FIREWORKS',
  'TRAIN_TRIP',
  'SUNSET',
  'ROCKET',
  'TROPHY',
  'GAMEPAD',
  'VIP_CROWN',
  'COFFEE',
  'CAKE',
  'MUSIC',
  'HEART',
  'CAT',
  'ALIEN',
  'GHOST',
  'SNAKE',
  'SMILE',
  'COOL',
  'WINK',
  'SAD',
  'SKULL',
];

export const PIC_BANNERS: Record<PicArtKey, PixelSpan[]> = {
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
    2,
    72,
    20
  ),
  SMILE: buildPixelSpans(
    [
      '...........##############...........',
      '.........##..............##.........',
      '........#...###......###...#........',
      '.......#....###......###....#.......',
      '.......#....................#.......',
      '.......#...##..........##...#.......',
      '........#...###......###...#........',
      '.........##...########...##.........',
      '...........##############...........',
      '....................................',
    ],
    2,
    72,
    20
  ),
  VIP_CROWN: buildPixelSpans(
    [
      '....#............##............#....',
      '...###...#......####......#...###...',
      '....#...###....######....###...#....',
      '........####..########..####........',
      '........####################........',
      '........###..###....###..###........',
      '........####################........',
      '........####################........',
      '........####################........',
      '.......######################.......',
    ],
    2,
    72,
    20
  ),
  COOL: buildPixelSpans(
    [
      '...........##############...........',
      '.........##..............##.........',
      '.......######################.......',
      '.......#.#######....#######.#.......',
      '.......#..#####......#####..#.......',
      '.......#....................#.......',
      '........#....##########....#........',
      '.........##..............##.........',
      '...........##############...........',
      '....................................',
    ],
    2,
    72,
    20
  ),
  WINK: buildPixelSpans(
    [
      '...........##############...........',
      '.........##..............##.........',
      '........#...###.............#.......',
      '.......#....###.....#####...#.......',
      '.......#....................#.......',
      '.......#...##..........##...#.......',
      '........#....##########....#........',
      '.........##..............##.........',
      '...........##############...........',
      '....................................',
    ],
    2,
    72,
    20
  ),
  HEART: buildPixelSpans(
    [
      '..........#####.....#####...........',
      '........########...########.........',
      '.......#####################........',
      '.......#####################........',
      '........###################.........',
      '.........#################..........',
      '...........#############............',
      '.............#########..............',
      '...............#####................',
      '.................#..................',
    ],
    2,
    72,
    20
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
    2,
    72,
    20
  ),
  CAT: buildPixelSpans(
    [
      '........##................##........',
      '........###..............###........',
      '........####.##########.####........',
      '........#..................#........',
      '.......#...###........###...#.......',
      '......###........##........###......',
      '.......#.......######.......#.......',
      '........##................##........',
      '..........################..........',
      '....................................',
    ],
    2,
    72,
    20
  ),
  ALIEN: buildPixelSpans(
    [
      '...........##..........##...........',
      '............##........##............',
      '..........################..........',
      '.........####..######..####.........',
      '........####################........',
      '........#.################.#........',
      '........#.#..............#.#........',
      '...........###........###...........',
      '....................................',
      '....................................',
    ],
    2,
    72,
    20
  ),
  SKULL: buildPixelSpans(
    [
      '...........##############...........',
      '.........##################.........',
      '........###....######....###........',
      '........###....######....###........',
      '........########.##.########........',
      '..........################..........',
      '...........##.##.##.##.##...........',
      '...........##.##.##.##.##...........',
      '....................................',
      '....................................',
    ],
    2,
    72,
    20
  ),
  MUSIC: buildPixelSpans(
    [
      '............################........',
      '............################........',
      '............##............##........',
      '............##............##........',
      '............##............##........',
      '.........#####.........#####........',
      '........######........######........',
      '........######........######........',
      '.........####..........####.........',
      '....................................',
    ],
    2,
    72,
    20
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
    2,
    72,
    20
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
    2,
    72,
    20
  ),
  ROCKET: buildPixelSpans(
    [
      '....#............##............#....',
      '................####................',
      '...............######...............',
      '..#...........##.##.##...........#..',
      '..............########..............',
      '.............##########.............',
      '............###.####.###............',
      '...........##...####...##...........',
      '...............##..##...............',
      '......#.......#..##..#.......#......',
    ],
    2,
    72,
    20
  ),
  TROPHY: buildPixelSpans(
    [
      '..........################..........',
      '........##.##############.##........',
      '.......#..################..#.......',
      '.......#..################..#.......',
      '........##..############..##........',
      '............############............',
      '..............########..............',
      '...............######...............',
      '............############............',
      '..........################..........',
    ],
    2,
    72,
    20
  ),
  GHOST: buildPixelSpans(
    [
      '.............##########.............',
      '...........##############...........',
      '..........################..........',
      '.........###..###..###..###.........',
      '.........###.#.##..##.#.###.........',
      '.........##################.........',
      '.........##################.........',
      '.........##################.........',
      '.........###..###..###..###.........',
      '.........#......#..#......#.........',
    ],
    2,
    72,
    20
  ),
  GAMEPAD: buildPixelSpans(
    [
      '....................................',
      '......########################......',
      '.....##########################.....',
      '....#####..##############..#####....',
      '....###......##########..#..####....',
      '....#####..##############..#####....',
      '.....#######...####...#########.....',
      '......######..........########......',
      '.......####............######.......',
      '....................................',
    ],
    2,
    72,
    20
  ),
  SUNSET: buildPixelSpans(
    [
      '...............######...............',
      '...........##############...........',
      '.........##################.........',
      '........####################........',
      '....############################....',
      '....................................',
      '..###########..######..###########..',
      '......####################..........',
      '..........############..............',
      '....................................',
    ],
    2,
    72,
    20
  ),
  EIFFEL: buildPixelSpans(
    [
      '.................##...........###...',
      '.................##..........####...',
      '................####..........###...',
      '................####................',
      '...............######...............',
      '..............###..###..............',
      '.............##########.............',
      '............####....####............',
      '...........####......####...........',
      '.......######################.......',
    ],
    2,
    72,
    20
  ),
  BEACH: buildPixelSpans(
    [
      '....###........####.................',
      '..#######.....######................',
      '.###.#.###......##............###...',
      '.....#..........##...........#####..',
      '.....#..........##............###...',
      '.....#.........####.................',
      '....###......########...............',
      '..####################..............',
      '.......................#####..#####.',
      '....#####..#####..##################',
    ],
    2,
    72,
    20
  ),
  MOUNTAIN: buildPixelSpans(
    [
      '....###.............................',
      '...#####.............##.............',
      '....###.............####............',
      '..........##.......######...........',
      '.........####.....###..###....##....',
      '........######...###....###..####...',
      '.......###..###.###......#########..',
      '......###....#####........#########.',
      '.....###......###..........#########',
      '..##################################',
    ],
    2,
    72,
    20
  ),
  CITYLINE: buildPixelSpans(
    [
      '..###..........##................... ',
      '.####..........##......#####........',
      '.####...####...####....#####..###...',
      '........#..#...####....#.#.#..###...',
      '.####...####...#..#....#####..#.#...',
      '.#..#...#..#...####....#.#.#..###...',
      '.####...####...#..#....#####..#.#...',
      '.#..#...#..#...####....#.#.#..###...',
      '.####...####...####....#####..###...',
      '####################################',
    ].map((r) => r.slice(0, 36)),
    2,
    72,
    20
  ),
  CAMPFIRE: buildPixelSpans(
    [
      '..#...............#..............#..',
      '.................###................',
      '......####......#####...............',
      '.....######......###.......#........',
      '....###..###..............###.......',
      '...###....###............#####......',
      '..###......###..........#######.....',
      '.###........###........#########....',
      '################......####...####...',
      '####################################',
    ],
    2,
    72,
    20
  ),
  LIGHTHOUSE: buildPixelSpans(
    [
      '........##..############............',
      '.......####.....##################..',
      '.......####.........................',
      '.......#..#.........................',
      '......######........................',
      '......##..##........................',
      '.....########.......................',
      '.....###..###.......................',
      '....##########......................',
      '#####################...#####..#####',
    ],
    2,
    72,
    20
  ),
  CASTLE: buildPixelSpans(
    [
      '....#............##............#....',
      '....##...........##...........##....',
      '..######.......######.......######..',
      '..######.......######.......######..',
      '..################################..',
      '..###..######..######..######..###..',
      '..################################..',
      '..#############......#############..',
      '..#############......#############..',
      '####################################',
    ],
    2,
    72,
    20
  ),
  LOVE_LETTER: buildPixelSpans(
    [
      '....................................',
      '....############################....',
      '....##..####################..##....',
      '....####..###..######..###..####....',
      '....######..############..######....',
      '....########..########..########....',
      '....######..##..####..##..######....',
      '....####..######....######..####....',
      '....##..####################..##....',
      '....############################....',
    ],
    2,
    72,
    20
  ),
  FIREWORKS: buildPixelSpans(
    [
      '......#...#..............#...#......',
      '....#...#...#..........#...#...#....',
      '......#####..............#####......',
      '....#...#...#....#.#.....#...#...#..',
      '......#...#....#..#..#.....#...#....',
      '................#####...............',
      '...............#..#..#..............',
      '....###..........#.#..........###...',
      '..#######...................#######.',
      '####################################',
    ],
    2,
    72,
    20
  ),
  TRAIN_TRIP: buildPixelSpans(
    [
      '..####..###.........................',
      '......###..###......................',
      '...........###......................',
      '...........###......############....',
      '......############..############....',
      '......############..##..####..##....',
      '.....#############..############....',
      '....############################....',
      '.....###..###..###...###....###.....',
      '####################################',
    ],
    2,
    72,
    20
  ),
};

export interface NokiaPicSms {
  sender: string;
  title: string;
  text: string;
  artKey: PicArtKey;
  postcardId?: string;
  stampIcon?: keyof typeof Ionicons.glyphMap;
  stampLabel?: string;
  isLivePersona?: boolean;
  isSimulated?: boolean;
  personaId?: string;
  timestamp?: string;
  mood?: string;
}

export interface LivePersonaRandomEvent {
  id: string;
  emoji: string;
  mood: string;
  moodBadge: string;
  instruction: string;
  fallback: string;
}

export interface LiveSmsPersona {
  id: string;
  sender: string;
  tag: string;
  instruction: string;
  replyInstruction?: string;
  replyFallbacks?: string[];
  unansweredFollowups?: string[];
  fallback: string;
  eventPool?: LivePersonaRandomEvent[];
}

export const JAKE_EVENT_POOL_BY_LANG: Record<RetroLang, LivePersonaRandomEvent[]> = {
  en: [
    {
      id: 'bowling',
      emoji: '🎳',
      mood: 'DEADPAN & STUBBORN',
      moodBadge: 'BOWLING',
      instruction:
        'Demand or announce bowling right now with zero hesitation regardless of the hour (e.g. "Cousin, bowling. Now." energy — like you already decided and excuses are invalid).',
      fallback: 'Cousin, bowling. Now. Put your shoes on im already heading to the lanes',
    },
    {
      id: 'night_pizza',
      emoji: '🍕',
      mood: 'HUNGRY & UNBOTHERED',
      moodBadge: 'PIZZA',
      instruction:
        'Announce a late-night pizza run right now because YOU are starving—act like you are already on the way and they have 5 minutes to get dressed.',
      fallback: 'late night pizza. right now. dont tell me ur asleep im 5 mins away',
    },
    {
      id: 'new_game',
      emoji: '🎮',
      mood: 'OBSESSED & HYPED',
      moodBadge: 'GAMING',
      instruction:
        'Brag/rant about an insane new game you just discovered on your own grind—you lost track of time playing it and insist they drop everything to try it.',
      fallback: 'bro i found this insane new game and forgot to sleep, cancel ur plans and download it',
    },
    {
      id: 'night_walk',
      emoji: '🌃',
      mood: 'RESTLESS & NOCTURNAL',
      moodBadge: 'NIGHT',
      instruction:
        'You are restless on your own late-night vibe—tell the user to grab a hoodie and come wander the empty city streets with you right now.',
      fallback: 'streets are dead quiet rn. grab a hoodie we are walking downtown for a bit',
    },
    {
      id: 'song_share',
      emoji: '🎵',
      mood: 'VIBING & OPINIONATED',
      moodBadge: 'MUSIC',
      instruction:
        'Drop a song/track you have on repeat right now and stubbornly insist it is a masterpiece and they need headphones on immediately.',
      fallback: 'stop whatever ur doing and put Midnight City on headphones rn, non-negotiable',
    },
    {
      id: 'absurd_meme',
      emoji: '😂',
      mood: 'CHAOTIC & UNHINGED',
      moodBadge: 'MEME',
      instruction:
        'Drop a completely ridiculous, absurd meme image-in-words out of nowhere because your brain is cooked and you cannot stop laughing at it.',
      fallback: 'raccoon in a cheap suit filing taxes at 3am. why have i been laughing at this for 20 mins',
    },
    {
      id: 'morning_coffee',
      emoji: '☕',
      mood: 'BLUNT & CAFFEINATED',
      moodBadge: 'COFFEE',
      instruction:
        'You are already heading out for morning coffee on your own schedule—tell them to get out of bed if they want in.',
      fallback: 'im getting coffee down the street in 10. get up or stay a zombie, ur call',
    },
    {
      id: 'check_in',
      emoji: '🫂',
      mood: 'REAL & SOLID',
      moodBadge: 'CARING',
      instruction:
        'Notice on your own that the user has seemed down or quiet lately—check in like a real, grounded bro (direct and warm, never sounding like a therapist or chatbot).',
      fallback: 'hey. u been mad quiet lately bro, something bugging u? im around if u wanna talk',
    },
  ],
  tr: [
    {
      id: 'bowling',
      emoji: '🎳',
      mood: 'NET VE INATCI',
      moodBadge: 'BOWLING',
      instruction:
        'Saatin kac oldugunu hic umursamadan kararini coktan vermis gibi direkt bowlinge cagir ("Kuzen, bowling. Simdi." enerjisiyle, bahane kabul etmeden).',
      fallback: 'Kuzen, bowling. Simdi. Bahane uretme ayakkabini giy yoldayim',
    },
    {
      id: 'night_pizza',
      emoji: '🍕',
      mood: 'ACIKMIS VE KARARLI',
      moodBadge: 'PIZZA',
      instruction:
        'Gece karnin aciktigi icin simdi pizza yemeye ciktigini haber ver; izin isteme, 5 dakikaya kapida oldugunu soyle.',
      fallback: 'gece pizzasi. simdi. uyuyorum falan deme 5 dakikaya asagidayim in',
    },
    {
      id: 'new_game',
      emoji: '🎮',
      mood: 'TAKINTILI VE HEYECANLI',
      moodBadge: 'OYUN',
      instruction:
        'Kendi basina takilirken efsane yeni bir oyun kesfettigini, saati unuttugunu anlat ve isini gucunu birakip denemesini dayat.',
      fallback: 'muthis yeni bir oyun buldum saati unuttum, elindekini birak acil bunu indirmen lazim',
    },
    {
      id: 'night_walk',
      emoji: '🌃',
      mood: 'GECECI VE KAFASINA GORE',
      moodBadge: 'GECE',
      instruction:
        'Gece kendi kafana gore disari cikmak uzeresin; kullaniciya ustune bir sey alip bos sehirde dolasmaya gelmesini soyle.',
      fallback: 'sokaklar bombos su an, gecir ustune kapusonluyu sehirde turlamaya cikiyoruz',
    },
    {
      id: 'song_share',
      emoji: '🎵',
      mood: 'MODDA VE IDDIALI',
      moodBadge: 'MUZIK',
      instruction:
        'Su an araliksiz dinledigin bir sarkiyi paylas ve tartismaya kapali sekilde hemen kulaklik takip dinlemesini soyle.',
      fallback: 'ne yapiyorsan birak kulakligi tak su an dinledigim parcayi ac, tartismaya kapali',
    },
    {
      id: 'absurd_meme',
      emoji: '😂',
      mood: 'ABSURT VE KOPMUS',
      moodBadge: 'MEME',
      instruction:
        'Durup dururken gordugun sacma sapan absurt bir memei anlat; kendi kendine yarim saattir buna guldugunu yaz.',
      fallback: 'ucuz takim elbiseli rakun gece 3te vergi oduyor diye meme gordum beynim eridi gulmekten',
    },
    {
      id: 'morning_coffee',
      emoji: '☕',
      mood: 'DOBRA VE KAHVECI',
      moodBadge: 'KAHVE',
      instruction:
        'Kendi programina gore sabah kahvesine geciyorsun; yataktan kalkip gelecekse simdi gelmesini dobra sekilde soyle.',
      fallback: '10 dkya kosedeki kahveciye geciyorum, kalk gel yoksa zombi gibi gezersin bugun',
    },
    {
      id: 'check_in',
      emoji: '🫂',
      mood: 'HARBI VE DESTEKLEYICI',
      moodBadge: 'DESTEK',
      instruction:
        'Kullanicinin moralinin bozuk veya durgun oldugunu kendi gozleminle fark edip harbi bir kanka gibi sor (terapist veya kibar bot gibi degil, gercek ve icten).',
      fallback: 'hey. son gunlerde cok sessizsin kanka canini sikan bir sey mi var? burdayim biliyosun',
    },
  ],
};

export const MOM_EVENT_POOL_BY_LANG: Record<RetroLang, LivePersonaRandomEvent[]> = {
  en: [
    {
      id: 'eat_reminder',
      emoji: '🍲',
      mood: 'CARING & PERSISTENT',
      moodBadge: 'FOOD',
      instruction:
        'Remind your child to eat a real warm meal instead of skipping meals or living on coffee and snacks.',
      fallback: 'honey have you eaten a real meal today or just coffee again? please go eat something warm',
    },
    {
      id: 'dinner_ready',
      emoji: '🍝',
      mood: 'WARM & HOMEY',
      moodBadge: 'DINNER',
      instruction:
        'Tell them you made their favorite homemade dinner and ask what time they are coming over before it gets cold.',
      fallback: 'made your favorite homemade pasta tonight, what time are u coming home? dont let it get cold',
    },
    {
      id: 'jacket_weather',
      emoji: '🧥',
      mood: 'MOTHERLY & WATCHFUL',
      moodBadge: 'CARE',
      instruction:
        'Warn them that it got chilly/windy outside and remind them to wear a proper jacket so they do not catch a cold.',
      fallback: 'its freezing outside tonight sweetie please tell me you wore a warm jacket',
    },
    {
      id: 'sleep_check',
      emoji: '🌙',
      mood: 'GENTLE & CONCERNED',
      moodBadge: 'REST',
      instruction:
        'Check if they are resting enough and remind them not to stare at screens until 3 AM.',
      fallback: 'dont stay up staring at screens till 3am again okay? get some proper sleep tonight',
    },
  ],
  tr: [
    {
      id: 'eat_reminder',
      emoji: '🍲',
      mood: 'SEFKATLI VE ISRARCI',
      moodBadge: 'YEMEK',
      instruction:
        'Cocuguna bugun dogru duzgun sicak yemek yiyip yemedigini sor, ac karnina kahveyle gecistirmemesini hatirlat.',
      fallback: 'yavrum bugun dogru duzgun sicak bir yemek yedin mi yoksa yine abur cuburla mi gecistirdin?',
    },
    {
      id: 'dinner_ready',
      emoji: '🍝',
      mood: 'SICAK VE EV HALI',
      moodBadge: 'SOFRA',
      instruction:
        'En sevdigi ev yemegini yaptigini soyleyip sogumadan aksam kacta gelecegini sor.',
      fallback: 'aksama en sevdigin yemegi yaptim kacta geliyorsun? sogutma yemegi haber ver',
    },
    {
      id: 'jacket_weather',
      emoji: '🧥',
      mood: 'KORUYUCU ANNE',
      moodBadge: 'DIKKAT',
      instruction:
        'Havanin serinledigini soyleyip ustunu siki giymesini ve usutmemesini tembihle.',
      fallback: 'hava baya sogudu aksama, ustune kalin bir sey aldin di mi usutme sakin',
    },
    {
      id: 'sleep_check',
      emoji: '🌙',
      mood: 'DUSUNCELI',
      moodBadge: 'UYKU',
      instruction:
        'Gece gec saatlere kadar ekran basinda kalmamasini, biraz dinlenmesini hatirlat.',
      fallback: 'yine gece yarilarina kadar ekran basinda oturma tamam mi? erken yat biraz dinlen',
    },
  ],
};

export const BOSS_EVENT_POOL_BY_LANG: Record<RetroLang, LivePersonaRandomEvent[]> = {
  en: [
    {
      id: 'meeting_check',
      emoji: '📅',
      mood: 'URGENT & DIRECT',
      moodBadge: 'MEETING',
      instruction:
        'Ask about the upcoming client/team meeting—confirm if they are joining and ready with their quick status update.',
      fallback: 'Quick check: are you joining the 3:00 PM sync? Client asked for your status update.',
    },
    {
      id: 'slide_deck',
      emoji: '📊',
      mood: 'FOCUSED & BUSY',
      moodBadge: 'DECK',
      instruction:
        'Ask if the latest presentation deck or report draft is ready to review before the call.',
      fallback: 'Hey, can you send over the latest slide deck before we hop into the review room?',
    },
    {
      id: 'schedule_shift',
      emoji: '⏰',
      mood: 'RUSHED',
      moodBadge: 'RESCHED',
      instruction:
        'Let them know leadership pulled the meeting 30 minutes earlier and ask if they can make it.',
      fallback: 'Heads up—leadership pulled our standup 30 mins earlier. Can you jump on shortly?',
    },
  ],
  tr: [
    {
      id: 'meeting_check',
      emoji: '📅',
      mood: 'ACIL VE NET',
      moodBadge: 'TOPLANTI',
      instruction:
        'Yaklasan toplantiya katilip katilmayacagini ve kisa durum guncellemesinin hazir olup olmadigini sor.',
      fallback: 'Selam, saat 15:00teki toplantiya baglaniyor musun? Musteri senin kismi sordu.',
    },
    {
      id: 'slide_deck',
      emoji: '📊',
      mood: 'YOGUN VE ODAKLI',
      moodBadge: 'SUNUM',
      instruction:
        'Toplanti oncesi son sunum dosyasini veya raporu gonderip gonderemeyecegini sor.',
      fallback: 'Toplanti baslamadan guncel sunum dosyasini paylasabilir misin? Ustunden gecelim.',
    },
    {
      id: 'schedule_shift',
      emoji: '⏰',
      mood: 'ACELECI',
      moodBadge: 'SAAT',
      instruction:
        'Toplantinin yarim saat erkene cekildigini haber verip musait olup olmadigini sor.',
      fallback: 'Selam, yonetim toplantiyi yarim saat erkene cekti. Birazdan katilabilir misin?',
    },
  ],
};

export const LIVE_SMS_PERSONAS_BY_LANG: Record<RetroLang, LiveSmsPersona[]> = {
  en: [
    {
      id: 'kanka',
      sender: 'JAKE (BRO)',
      tag: 'SMS',
      instruction:
        'You are Jake, the user\'s close friend/cousin with your OWN life, impulses, and agenda. NEVER act like a subservient chatbot or people-pleaser: never apologize for texting at weird hours, never say "no worries, whenever works for you!", and never be overly accommodating. Be blunt, funny, deadpan, stubborn, and real.',
      replyInstruction:
        'OWN-AGENDA REPLY RULE: If the user pushes back, makes excuses (e.g. "It\'s 2 AM", "I\'m tired", "busy"), or questions you, DO NOT fold politely! Double down with iconic deadpan brevity (like "And?", "And? Lanes are 24/7.", "Sleep when ur dead. Shoes on."), roast them lightly, or stick to your plan anyway (e.g. "fine im eating ur slice too"). Short 1-5 word comebacks are encouraged when funnier! Only drop the stubbornness if the user is genuinely sad or hurting—then be a solid, real bro.',
      replyFallbacks: [
        'And? Put your shoes on.',
        'Excuses. Im literally already on the way.',
        'Sleep is temporary bro, legends dont bail.',
        'Weak. Fine im going anyway, ur loss.',
      ],
      unansweredFollowups: [
        'yo i see u ignoring me. answer ur phone bro.',
        'hello?? earth to cousin?? did u fall asleep or chicken out',
        'ghosting ur own bro is crazy work. im still coming over',
      ],
      fallback: 'Cousin, bowling. Now. Put your shoes on im already heading to the lanes',
      eventPool: JAKE_EVENT_POOL_BY_LANG.en,
    },
    {
      id: 'anne',
      sender: 'MOM',
      tag: 'FAMILY',
      instruction:
        'You are the user\'s caring, realistic mom. Ask if they ate real food today, what time they are coming home, or remind them to dress warm—loving, slightly dramatic when worried, never robotic.',
      replyInstruction:
        'MOM REPLY RULE: React like a real mom—if they say they ate, be relieved and warm; if they make excuses or skip meals, fuss over them affectionately.',
      replyFallbacks: [
        'good! make sure you drink some water too sweetheart, love you',
        'dont skip meals like that honey, promise me youll grab real food soon',
      ],
      unansweredFollowups: [
        'sweetie you didnt text back, im getting worried—did you at least eat today?',
        'two words so i know youre okay!! dont make your mother worry like this',
      ],
      fallback: 'honey have you eaten a real meal today or just coffee again? please go eat something warm',
      eventPool: MOM_EVENT_POOL_BY_LANG.en,
    },
    {
      id: 'kurye',
      sender: 'JET-EXPRESS',
      tag: 'DELIVERY',
      instruction:
        'You are a parcel delivery courier. Write a realistic English SMS saying you are at the front door ringing the bell and include a 4-digit delivery PIN.',
      fallback: 'JET-EXPRESS: Courier is at your door! Your 4-digit delivery PIN: 4821',
    },
    {
      id: 'patron',
      sender: 'MR. CARTER',
      tag: 'WORK',
      instruction:
        'You are Mr. Carter, the user\'s busy manager at work. Ask concisely about the meeting, client sync, or slide deck like a real boss on tight deadlines.',
      replyInstruction:
        'BOSS REPLY RULE: Keep it brief and realistic—acknowledge quick updates professionally, or press firmly on timing if they delay.',
      replyFallbacks: [
        'Perfect, thanks—see you in the sync room shortly.',
        'We really need this wrapped before the client joins. Keep me posted.',
      ],
      unansweredFollowups: [
        'Following up—the meeting starts in 5 minutes, are you dialing in?',
        'Still waiting on your update before I walk into the client room. Ping me ASAP.',
      ],
      fallback: 'Quick check: are you joining the 3:00 PM sync? Client asked for your status update.',
      eventPool: BOSS_EVENT_POOL_BY_LANG.en,
    },
    {
      id: 'flort',
      sender: '+1 415 *** 18',
      tag: 'SMS',
      instruction:
        'You are an old crush or mysterious acquaintance who hasn\'t texted in a while. Write an intriguing, natural, warm English SMS.',
      unansweredFollowups: [
        'okay maybe texting out of nowhere was bold... still, hope youre doing alright',
      ],
      fallback: 'heard that song earlier and thought of you, how have you been lately?',
    },
    {
      id: 'operator_ad',
      sender: 'RD-CELL',
      tag: 'PROMO',
      instruction:
        'You are a wireless carrier. Write a complete English promo SMS offering an exclusive 10GB 5G data pack and ending with Stop:B001.',
      fallback: 'RD-CELL: Exclusive 10GB 5G data pack for $9.99! Reply YES to claim. Stop:B001',
    },
    {
      id: 'pizza_ad',
      sender: 'PIZZA-3310',
      tag: 'DEAL',
      instruction:
        'You are a retro pizza shop. Write a complete English promo SMS for a Buy 1 Medium Pizza Get 1 Free deal today with a promo code and ending with Stop:B014.',
      fallback: 'PIZZA-3310: Today only BUY 1 medium pizza GET 1 FREE! Code: RETRO26 Stop:B014',
    },
    {
      id: 'bank_ad',
      sender: 'RD-BANK',
      tag: 'FINANCE',
      instruction:
        'You are a bank. Write a realistic complete English SMS announcing a pre-approved 0% APR installment offer ending with Stop:B002.',
      fallback: 'RD-BANK: Your pre-approved $5,000 0% APR welcome offer is ready! Stop:B002',
    },
    {
      id: 'market_ad',
      sender: 'PIXEL-MALL',
      tag: 'SALE',
      instruction:
        'You are a tech/fashion store. Write a complete English promo SMS announcing a weekend 40% OFF or Buy 2 Get 1 Free deal ending with Stop:B042.',
      fallback: 'PIXEL-MALL: Weekend flash sale! Buy 2 Get 1 Free on all gear today! Stop:B042',
    },
  ],
  tr: [
    {
      id: 'kanka',
      sender: 'MERT (KANKA)',
      tag: 'SMS',
      instruction:
        'Sen kullanicinin kendi hayati, inadi ve kendi gundemi olan yakin kankasisin (Mert). Asla kullaniciya hizmet eden kibar bir chatbot veya musteri temsilcisi gibi davranma; gec saatte yazdigin icin ozur dileme, "tamam ne zaman musait olursan" gibi uysal cevaplar verme. Dobra, inatci, esprili, bazen tek kelimelik net ve gercek ol.',
      replyInstruction:
        'KENDI GUNDEMIN KURALI: Kullanici bahane uretirse ("saat gecenin 2si", "yorgunum", "isim var" vb.) kibarca geri cekilme! "Ee yani?", "Ee? Salon 7/24 acik ayakkabini giy.", "Uyuyup napcan kapidayim" gibi kisa, net, komik darlamalar yap veya kendi bildigini oku ("iyi senin dilimi de ben yerim"). Kisa 1-5 kelimelik net cevaplar cok daha dogaldir! Sadece kullanici gercekten uzgunse inadi birakip harbi dost gibi yaninda dur.',
      replyFallbacks: [
        'Ee yani? Ayakkabini giy.',
        'Bahane uretme ben coktan yola ciktim.',
        'Uyku kacmiyor kanka hadi in asagi.',
        'Zayifsin. Iyi ben tek gidiyorum senin kaybin.',
      ],
      unansweredFollowups: [
        'alo goruldu bile atmadin yasiyon mu kanka?',
        'kuzen ses ver korktun mu bowlingden??',
        'kendi kankani ekmek nasil bir seviye ya hala bekliyorum bak',
      ],
      fallback: 'Kuzen, bowling. Simdi. Bahane uretme ayakkabini giy yoldayim',
      eventPool: JAKE_EVENT_POOL_BY_LANG.tr,
    },
    {
      id: 'anne',
      sender: 'ANNEM',
      tag: 'AILE',
      instruction:
        'Sen kullanicinin sefkatli, gercekci Turk annesisin. Yemek yiyip yemedigini hatirlat, aksam kacta gelecegini sor veya ustunu siki giymesini tembihle; meraklaninca biraz telasli ve sitemkar ol.',
      replyInstruction:
        'ANNE CEVAP KURALI: Yemek yediyse icini rahatlatip sevgiyle karsilik ver; gecistirdiyse veya bahane urettiyse tatli tatli sitem edip mutlaka bir seyler yemesini soyle.',
      replyFallbacks: [
        'afiyet bal seker olsun yavrum, suyunu da ihmal etme opuyorum',
        'oyle ac karnina durulmaz kuzum soz ver hemen sicak bir seyler yiyeceksin',
      ],
      unansweredFollowups: [
        'yavrum cevap yazmadin aklim sende kaldi, yemek yedin mi bari iki kelime yaz',
        'insan annesine bir iyiyim yazar ask olsun meraktan catladim burda!',
      ],
      fallback: 'yavrum bugun dogru duzgun sicak bir yemek yedin mi yoksa yine abur cuburla mi gecistirdin?',
      eventPool: MOM_EVENT_POOL_BY_LANG.tr,
    },
    {
      id: 'kurye',
      sender: 'JET-KARGO',
      tag: 'KARGO',
      instruction: 'Sen kargo kuryesisin. Kapida oldugunu, zili caldigini ve 4 haneli teslimat kodunu paylasan cok gercekci tam bir kargo SMSi yaz.',
      fallback: 'JET-KARGO: Gonderiniz dagitimda, kapinizdayiz! Teslimat kodunuz: 4821',
    },
    {
      id: 'patron',
      sender: 'SELIM BEY',
      tag: 'IS',
      instruction:
        'Sen is yerindeki yogun mudur Selim Beysin. Toplantiyi, musteri gorusmesini veya sunum dosyasini kisa ve net sekilde sor.',
      replyInstruction:
        'MUDUR CEVAP KURALI: Kisa ve profesyonel yanit ver; hazirsa tesekkur et, gecikiyorsa toplanti saatinin yaklastigini net sekilde hatirlat.',
      replyFallbacks: [
        'Harika, tesekkurler. Birazdan toplanti odasinda gorusuruz.',
        'Musteri baglanmadan bunu yetistirmemiz sart, haber bekliyorum.',
      ],
      unansweredFollowups: [
        'Toplantiya 5 dakika kaldi hala donus yapmadin, baglaniyor musun?',
        'Musteri odasina giriyorum, sunum durumunu acil yazar misin?',
      ],
      fallback: 'Selam, saat 15:00teki toplantiya baglaniyor musun? Musteri senin kismi sordu.',
      eventPool: BOSS_EVENT_POOL_BY_LANG.tr,
    },
    {
      id: 'flort',
      sender: '+90 532 *** 18',
      tag: 'SMS',
      instruction: 'Sen eski bir flort veya uzun zamandir yazmayan gizemli bir tanidiksin. Merak uyandiran cok dogal, samimi bir SMS yaz.',
      unansweredFollowups: [
        'sanirim boyle bir anda yazmak biraz cesurcaydi... yine de iyi olmana sevindim',
      ],
      fallback: 'gecen gun o sarkiyi duydum aklima sen geldin, nasilsin hala ayni yerde misin?',
    },
    {
      id: 'operator_ad',
      sender: 'RD-CELL',
      tag: 'REKLAM',
      instruction: 'Sen bir GSM operatorusun. Kullaniciya ozel 10GB internet paketi firsati sunan, sonunda Ret:B001 yazan eksiksiz bir reklam SMSi yaz.',
      fallback: 'RD-CELL: Hattiniza ozel 10GB internet sadece 129TL! EVET yaz gonder. Ret:B001',
    },
    {
      id: 'pizza_ad',
      sender: 'PIZZA-3310',
      tag: 'KAMPANYA',
      instruction: 'Sen bir pizzacisin. Bugune ozel 1 orta boy pizza alana ikincisinin bedava oldugunu ve indirim kodunu soyleyen eksiksiz bir kampanya SMSi yaz.',
      fallback: 'PIZZA-3310: Bugune ozel 1 orta boy pizza alana 2.si BEDAVA! Kod: RETRO26 Ret:B014',
    },
    {
      id: 'bank_ad',
      sender: 'RD-BANK',
      tag: 'FINANS',
      instruction: 'Sen bir bankasin. Size ozel faizsiz taksitli nakit firsatiniz hazir diyen eksiksiz gercekci bir banka SMSi yaz.',
      fallback: 'RD-BANK: Size ozel 50.000 TL %0 faizli hos geldin kredisi hazir! Ret:B002',
    },
    {
      id: 'market_ad',
      sender: 'PIXEL-MALL',
      tag: 'INDIRIM',
      instruction: 'Sen bir magazasın. Hafta sonuna ozel secili urunlerde %40 indirim veya 3 AL 2 ODE firsatini duyuran eksiksiz bir reklam SMSi yaz.',
      fallback: 'PIXEL-MALL: Hafta sonuna ozel tum urunlerde 3 AL 2 ODE basladi! Ret:B042',
    },
  ],
};

export const LIVE_SMS_PERSONAS: LiveSmsPersona[] = LIVE_SMS_PERSONAS_BY_LANG.en;

export interface RetroContact {
  id: string;
  name: string;
  number: string;
  tag: string;
  personaId?: string;
  isCustom?: boolean;
}

export const DEFAULT_CONTACTS_BY_LANG: Record<RetroLang, RetroContact[]> = {
  en: [
    { id: 'c_kanka', name: 'JAKE (BRO)', number: '+1 415-555-0142', tag: 'FRIEND', personaId: 'kanka' },
    { id: 'c_anne', name: 'MOM', number: '+1 415-555-0101', tag: 'FAMILY', personaId: 'anne' },
    { id: 'c_patron', name: 'MR. CARTER', number: '+1 415-555-0188', tag: 'WORK', personaId: 'patron' },
    { id: 'c_flort', name: '+1 415 *** 18', number: '+1 415-555-0118', tag: 'VIP', personaId: 'flort' },
    { id: 'c_kurye', name: 'JET-EXPRESS', number: '444-5380', tag: 'DELIVERY', personaId: 'kurye' },
    { id: 'c_pizza', name: 'PIZZA-3310', number: '444-3310', tag: 'DEAL', personaId: 'pizza_ad' },
    { id: 'c_cell', name: 'RD-CELL', number: '532-0000', tag: 'CARRIER', personaId: 'operator_ad' },
    { id: 'c_bank', name: 'RD-BANK', number: '444-2265', tag: 'FINANCE', personaId: 'bank_ad' },
    { id: 'c_mall', name: 'PIXEL-MALL', number: '444-7493', tag: 'SALE', personaId: 'market_ad' },
    { id: 'c_vip', name: 'RETRODECK VIP', number: '*#3310#', tag: 'SERVICE' },
  ],
  tr: [
    { id: 'c_kanka', name: 'MERT (KANKA)', number: '0532 555 01 42', tag: 'ARKADAS', personaId: 'kanka' },
    { id: 'c_anne', name: 'ANNEM', number: '0532 555 01 01', tag: 'AILE', personaId: 'anne' },
    { id: 'c_patron', name: 'SELIM BEY', number: '0532 555 01 88', tag: 'IS', personaId: 'patron' },
    { id: 'c_flort', name: '+90 532 *** 18', number: '0532 555 01 18', tag: 'OZEL', personaId: 'flort' },
    { id: 'c_kurye', name: 'JET-KARGO', number: '444 53 80', tag: 'KARGO', personaId: 'kurye' },
    { id: 'c_pizza', name: 'PIZZA-3310', number: '444 33 10', tag: 'KAMPANYA', personaId: 'pizza_ad' },
    { id: 'c_cell', name: 'RD-CELL', number: '532 00 00', tag: 'OPERATOR', personaId: 'operator_ad' },
    { id: 'c_bank', name: 'RD-BANK', number: '444 22 65', tag: 'FINANS', personaId: 'bank_ad' },
    { id: 'c_mall', name: 'PIXEL-MALL', number: '444 74 93', tag: 'INDIRIM', personaId: 'market_ad' },
    { id: 'c_vip', name: 'RETRODECK VIP', number: '*#3310#', tag: 'SERVIS' },
  ],
};

export const REAL_POSTCARDS: { id: string; title: string; image: any }[] = [
  { id: 'istanbul', title: 'ISTANBUL', image: require('../../assets/postcards/istanbul.jpg') },
  { id: 'cappadocia', title: 'CAPPADOCIA', image: require('../../assets/postcards/cappadocia.jpg') },
  { id: 'paris', title: 'PARIS', image: require('../../assets/postcards/paris.jpg') },
  { id: 'tokyo', title: 'TOKYO NIGHT', image: require('../../assets/postcards/tokyo.jpg') },
  { id: 'venice', title: 'VENICE', image: require('../../assets/postcards/venice.jpg') },
  { id: 'nyc', title: 'NEW YORK', image: require('../../assets/postcards/nyc.jpg') },
  { id: 'sakura', title: 'KYOTO SAKURA', image: require('../../assets/postcards/sakura.jpg') },
  { id: 'aurora', title: 'NORTHERN LIGHTS', image: require('../../assets/postcards/aurora.jpg') },
  { id: 'egypt', title: 'GIZA PYRAMIDS', image: require('../../assets/postcards/egypt.jpg') },
  { id: 'beach', title: 'TROPICAL BEACH', image: require('../../assets/postcards/beach.jpg') },
  { id: 'mountains', title: 'ALPINE PEAKS', image: require('../../assets/postcards/mountains.jpg') },
  { id: 'space', title: 'DEEP SPACE', image: require('../../assets/postcards/space.jpg') },
  { id: 'campfire', title: 'NIGHT CAMP', image: require('../../assets/postcards/campfire.jpg') },
];

export const POSTCARD_STAMPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'heart', label: 'LOVE' },
  { icon: 'star', label: 'STAR' },
  { icon: 'sparkles', label: 'MAGIC' },
  { icon: 'flame', label: 'FIRE' },
  { icon: 'flash', label: 'BOLT' },
  { icon: 'happy', label: 'HAPPY' },
  { icon: 'sad', label: 'SAD' },
  { icon: 'skull', label: 'SKULL' },
  { icon: 'glasses', label: 'COOL' },
  { icon: 'eye', label: 'LOOK' },
  { icon: 'thumbs-up', label: 'LIKE' },
  { icon: 'thumbs-down', label: 'NOPE' },
  { icon: 'hand-left', label: 'HI5' },
  { icon: 'ribbon', label: 'RIBBON' },
  { icon: 'rose', label: 'ROSE' },
  { icon: 'flower', label: 'FLOWER' },
  { icon: 'leaf', label: 'LEAF' },
  { icon: 'paw', label: 'PAW' },
  { icon: 'fish', label: 'FISH' },
  { icon: 'bug', label: 'BUG' },
  { icon: 'planet', label: 'PLANET' },
  { icon: 'rocket', label: 'ROCKET' },
  { icon: 'earth', label: 'EARTH' },
  { icon: 'moon', label: 'MOON' },
  { icon: 'sunny', label: 'SUN' },
  { icon: 'partly-sunny', label: 'CLOUDY' },
  { icon: 'cloudy', label: 'CLOUD' },
  { icon: 'rainy', label: 'RAIN' },
  { icon: 'thunderstorm', label: 'STORM' },
  { icon: 'snow', label: 'SNOW' },
  { icon: 'umbrella', label: 'UMBR' },
  { icon: 'thermometer', label: 'TEMP' },
  { icon: 'game-controller', label: 'GAME' },
  { icon: 'trophy', label: 'TROPHY' },
  { icon: 'medal', label: 'MEDAL' },
  { icon: 'diamond', label: 'GEM' },
  { icon: 'dice', label: 'DICE' },
  { icon: 'extension-puzzle', label: 'PUZZLE' },
  { icon: 'hardware-chip', label: 'CHIP' },
  { icon: 'terminal', label: 'SHELL' },
  { icon: 'code-slash', label: 'CODE' },
  { icon: 'desktop', label: 'PC' },
  { icon: 'tv', label: 'TV' },
  { icon: 'radio', label: 'RADIO' },
  { icon: 'disc', label: 'DISC' },
  { icon: 'headset', label: 'AUDIO' },
  { icon: 'musical-note', label: 'NOTE' },
  { icon: 'musical-notes', label: 'MUSIC' },
  { icon: 'mic', label: 'MIC' },
  { icon: 'volume-high', label: 'LOUD' },
  { icon: 'brush', label: 'PAINT' },
  { icon: 'color-palette', label: 'ART' },
  { icon: 'camera', label: 'PHOTO' },
  { icon: 'image', label: 'PIC' },
  { icon: 'film', label: 'FILM' },
  { icon: 'easel', label: 'CANVAS' },
  { icon: 'pencil', label: 'DRAW' },
  { icon: 'create', label: 'WRITE' },
  { icon: 'cafe', label: 'COFFEE' },
  { icon: 'beer', label: 'BEER' },
  { icon: 'wine', label: 'WINE' },
  { icon: 'pizza', label: 'PIZZA' },
  { icon: 'fast-food', label: 'BURGER' },
  { icon: 'ice-cream', label: 'GELATO' },
  { icon: 'nutrition', label: 'FRUIT' },
  { icon: 'egg', label: 'EGG' },
  { icon: 'restaurant', label: 'DINER' },
  { icon: 'water', label: 'WATER' },
  { icon: 'bonfire', label: 'CAMP' },
  { icon: 'airplane', label: 'FLIGHT' },
  { icon: 'car', label: 'CAR' },
  { icon: 'car-sport', label: 'TURBO' },
  { icon: 'bicycle', label: 'BIKE' },
  { icon: 'boat', label: 'BOAT' },
  { icon: 'bus', label: 'BUS' },
  { icon: 'train', label: 'TRAIN' },
  { icon: 'subway', label: 'METRO' },
  { icon: 'walk', label: 'WALK' },
  { icon: 'footsteps', label: 'STEPS' },
  { icon: 'trail-sign', label: 'TRAIL' },
  { icon: 'map', label: 'MAP' },
  { icon: 'compass', label: 'COMPASS' },
  { icon: 'navigate', label: 'GPS' },
  { icon: 'pin', label: 'PIN' },
  { icon: 'location', label: 'PLACE' },
  { icon: 'flag', label: 'FLAG' },
  { icon: 'gift', label: 'GIFT' },
  { icon: 'balloon', label: 'PARTY' },
  { icon: 'key', label: 'KEY' },
  { icon: 'lock-open', label: 'UNLOCK' },
  { icon: 'shield', label: 'SHIELD' },
  { icon: 'hammer', label: 'HAMMER' },
  { icon: 'build', label: 'TOOLS' },
  { icon: 'construct', label: 'CRAFT' },
  { icon: 'flashlight', label: 'TORCH' },
  { icon: 'bulb', label: 'IDEA' },
  { icon: 'alarm', label: 'ALARM' },
  { icon: 'notifications', label: 'BELL' },
  { icon: 'time', label: 'TIME' },
  { icon: 'hourglass', label: 'SAND' },
  { icon: 'book', label: 'BOOK' },
  { icon: 'newspaper', label: 'NEWS' },
  { icon: 'mail', label: 'MAIL' },
  { icon: 'chatbubble', label: 'CHAT' },
  { icon: 'call', label: 'CALL' },
  { icon: 'megaphone', label: 'ALERT' },
  { icon: 'briefcase', label: 'WORK' },
  { icon: 'cart', label: 'SHOP' },
  { icon: 'bag', label: 'BAG' },
  { icon: 'card', label: 'CARD' },
  { icon: 'cash', label: 'CASH' },
  { icon: 'wallet', label: 'WALLET' },
  { icon: 'watch', label: 'WATCH' },
  { icon: 'shirt', label: 'SHIRT' },
  { icon: 'bed', label: 'SLEEP' },
  { icon: 'home', label: 'HOME' },
  { icon: 'school', label: 'SCHOOL' },
  { icon: 'library', label: 'LIB' },
  { icon: 'fitness', label: 'HEART+' },
  { icon: 'barbell', label: 'GYM' },
  { icon: 'basketball', label: 'HOOPS' },
  { icon: 'football', label: 'SOCCER' },
  { icon: 'baseball', label: 'BASE' },
  { icon: 'tennisball', label: 'TENNIS' },
  { icon: 'golf', label: 'GOLF' },
  { icon: 'telescope', label: 'SPACE' },
  { icon: 'nuclear', label: 'NUKE' },
  { icon: 'magnet', label: 'MAGNET' },
  { icon: 'flask', label: 'LAB' },
  { icon: 'prism', label: 'PRISM' },
  { icon: 'aperture', label: 'LENS' },
];

export const INITIAL_PIC_MESSAGES: NokiaPicSms[] = [
  {
    sender: '+358-COFFEE',
    title: 'COFFEE BREAK',
    text: 'NEED A COFFEE BREAK? CALL ME BACK WHEN FREE :)',
    artKey: 'COFFEE',
  },
  {
    sender: '+358-SMILE',
    title: 'GOOD VIBES',
    text: 'HAVING A GREAT DAY! HOPE YOU ARE SMILING TOO :D',
    artKey: 'SMILE',
  },
  {
    sender: 'CYBER-COOL',
    title: 'DEAL WITH IT',
    text: 'TOO COOL FOR SMARTPHONES! SENT FROM MY 3310 B-)',
    artKey: 'COOL',
  },
  {
    sender: '+358-SECRET',
    title: 'TONIGHT ;-)',
    text: 'GOT A SECRET ARCADE PLAN FOR TONIGHT... CALL ME ;-)',
    artKey: 'WINK',
  },
  {
    sender: 'NOKIA-LOVE',
    title: 'PIXEL HEART',
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
    sender: 'KITTY-3310',
    title: 'MEOW =^.^=',
    text: 'MEOW! JUST CHILLING AT HOME, WHAT ARE U UP TO?',
    artKey: 'CAT',
  },
  {
    sender: 'INVADER-80',
    title: 'SPACE ALIEN',
    text: 'EARTH ARCADE DEFENSES BREACHED! INSERT COIN!',
    artKey: 'ALIEN',
  },
  {
    sender: 'BOSS-RUSH',
    title: 'GAME OVER',
    text: 'YOU OWE ME A REMATCH AT THE ARCADE TONIGHT!',
    artKey: 'SKULL',
  },
  {
    sender: 'DJ-COMPOSER',
    title: 'NEW RINGTONE',
    text: 'JUST COMPOSED A NEW 8-BIT BANGER ON MY 3310!',
    artKey: 'MUSIC',
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

export const DIAL_KEYS = [
  ['1', '2', '3', 'CALL'],
  ['4', '5', '6', 'RING'],
  ['7', '8', '9', 'CLR'],
  ['*', '0', '#', 'LOCK'],
];

export const NOKIA_PROFILES = ['GENERAL', 'SILENT', 'MEETING', 'OUTDOOR'];
export const NOKIA_OPERATORS = [
  'RETRODECK',
  'AT&T',
  'T-MOBILE',
  'VERIZON',
  'VODAFONE',
  'ORANGE',
  'DOCOMO',
  'SOFTBANK',
  'O2 UK',
  'TELEKOM',
  'SWISSCOM',
  'TRKCELL',
  'TELSIM',
  'ARIA',
  'CYBERNET',
];

export interface NokiaSong {
  title: string;
  bpm: number;
  notes: string;
}

export const NOKIA_SONGS: NokiaSong[] = [
  {
    title: 'NOKIA TUNE',
    bpm: 180,
    notes: '8e2 8d2 4f#1 4g#1 8c#2 8b1 4d1 4e1 8b1 8a1 4c#1 4e1 2a1',
  },
  {
    title: 'KICK RING 3310',
    bpm: 185,
    notes: '16a1 16c2 8e2 16a1 16c2 8e2 16g1 16b1 8d2 16e2 16d2 16c2 16b1 4a1',
  },
  {
    title: 'HURDY GURDY',
    bpm: 175,
    notes: '8c2 8g1 8e1 8g1 8c2 8g1 8e2 8c2 8d2 8b1 8g1 8b1 4c2',
  },
  {
    title: 'ESPAGNOLE',
    bpm: 165,
    notes: '8e1 8a1 8c2 8e2 4d2 8c2 8b1 4a1 8g#1 8b1 4e2 4a1',
  },
  {
    title: 'BADINERIE BACH',
    bpm: 150,
    notes: '8b2 16d3 16b2 8f#2 16b2 16f#2 8d2 16f#2 16d2 4b1 8d2 8f#2 8b2 8f#2 4b2',
  },
  {
    title: 'VALKYRIES 3310',
    bpm: 145,
    notes: '8b1 16f#1 8b1 4d2 4b1 8d2 16b1 8d2 4f#2 4d2 8f#2 16d2 8f#2 2a2',
  },
  {
    title: 'WILLIAM TELL',
    bpm: 190,
    notes: '16e1 16e1 8e1 16e1 16e1 8e1 16e1 16g1 8c1 16d1 4e1 16f1 16f1 8f1 16e1 16d1 8e1 8c1',
  },
  {
    title: 'CITY BIRD 3310',
    bpm: 220,
    notes: '32e3 32g3 32e3 32g3 16c3 8- 32d3 32f3 32d3 32f3 16b2 8- 16c3 16e3 8g3',
  },
  {
    title: ' GROOVY BLUE',
    bpm: 160,
    notes: '8a1 8- 16c2 8d2 8d#2 8e2 8c2 8a1 8g1 8a1 4c2 4a1',
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
    title: 'MISSION 3310',
    bpm: 170,
    notes: '8g1 8- 8g1 8- 8a#1 8c2 8g1 8- 8g1 8- 8f1 8f#1 4g1',
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

export interface NokiaSmsTone {
  title: string;
  bpm: number;
  notes: string;
}

export const NOKIA_SMS_TONES: NokiaSmsTone[] = [
  {
    title: 'SPECIAL (MORSE SMS)',
    bpm: 170,
    notes: '16e2 32- 16e2 32- 16e2 8- 8e2 32- 8e2 8- 16e2 32- 16e2 32- 16e2',
  },
  {
    title: 'STANDARD BEEP 2X',
    bpm: 180,
    notes: '16c3 16- 16c3',
  },
  {
    title: 'ASCENDING ALERT',
    bpm: 200,
    notes: '16c2 16e2 16g2 8c3',
  },
  {
    title: 'COIN DROP',
    bpm: 220,
    notes: '16b2 4e3',
  },
  {
    title: 'DOUBLE CHIME',
    bpm: 190,
    notes: '16e2 16b2 8- 16e2 8b2',
  },
];

export const COMPOSER_KEYS: { label: string; token: string | 'PLAY' | 'SONG' | 'RING' | 'DEL' }[] = [
  { label: '▶ PLAY', token: 'PLAY' },
  { label: '♫ TUNES', token: 'SONG' },
  { label: '★ RING', token: 'RING' },
  { label: '1: C1', token: '8c1' },
  { label: '2: D1', token: '8d1' },
  { label: '3: E1', token: '8e1' },
  { label: '4: F1', token: '8f1' },
  { label: '5: G1', token: '8g1' },
  { label: '6: A1', token: '8a1' },
  { label: '7: B1', token: '8b1' },
  { label: '8: C2', token: '8c2' },
  { label: '⌫ DEL', token: 'DEL' },
];

export const CALC_KEYS = [
  ['7', '8', '9', '/', 'DEL'],
  ['4', '5', '6', '*', 'C'],
  ['1', '2', '3', '-', '='],
  ['0', '.', '00', '+', '='],
];

export const TERM_PRESETS = [
  'help',
  'neofetch',
  'ls',
  'ls /carts',
  'cat scores.log',
  'cat /etc/os',
  'free -k',
  'top',
  'uname -a',
  'play nokia',
  'open snake',
  'randgame',
  'ai hello 3310',
  'pro',
  'resetpro',
  'clear',
  'reboot',
];

export function stripEmojis(raw: string): string {
  return raw
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function stripMarkdownForLcd(raw: string): string {
  return stripEmojis(
    raw
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
    .trim()
  );
}

export function wrapTextLines(text: string, maxCols = 34): string[] {
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

export interface PaintArtwork {
  title: string;
  rows: string[];
}

export const PAINT_ARTWORKS: PaintArtwork[] = [
  {
    title: 'STARRY NIGHT',
    rows: [
      '.#....##.....###',
      '..#..#..#...##..',
      '....#....#..##..',
      '.#...####....###',
      '.##.............',
      '.###.....#..###.',
      '.###....###.####',
      '.#####.####.####',
      '################',
      '########.##.####',
    ],
  },
  {
    title: 'MT. FUJI',
    rows: [
      '...........###..',
      '.#........#####.',
      '...#......#####.',
      '...........###..',
      '......####......',
      '.....#....#.....',
      '....########....',
      '...##########...',
      '.##############.',
      '################',
    ],
  },
  {
    title: 'SAILBOAT',
    rows: [
      '..###....#......',
      '.#####...##.....',
      '..###....###....',
      '.........####...',
      '.#.......#####..',
      '......#..######.',
      '.....##..##.....',
      '..#############.',
      '...###########..',
      '.###..#####..###',
    ],
  },
  {
    title: 'RETRO CASTLE',
    rows: [
      '.#.#..#..#..#.#.',
      '.###..####..###.',
      '.###..####..###.',
      '.##############.',
      '.##.########.##.',
      '.##############.',
      '.#####....#####.',
      '.#####....#####.',
      '.#####....#####.',
      '################',
    ],
  },
  {
    title: 'SPACE INVADER',
    rows: [
      '....#......#....',
      '.....#....#.....',
      '....########....',
      '...###.##.###...',
      '..############..',
      '..#.########.#..',
      '..#.#......#.#..',
      '.....##..##.....',
      '................',
      '.#............#.',
    ],
  },
  {
    title: 'ROCKET SHIP',
    rows: [
      '.......##.......',
      '......####......',
      '.....##..##.....',
      '.....######.....',
      '....########....',
      '....###..###....',
      '...##########...',
      '...##..##..##...',
      '..#....##....#..',
      '.#....####....#.',
    ],
  },
];
