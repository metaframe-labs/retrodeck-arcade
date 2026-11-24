import { Ionicons } from '@expo/vector-icons';

export const CLOCK_FACE_STORAGE_KEY = '@retrodeck8_clock_face_v1';
export const WEATHER_CITY_STORAGE_KEY = '@retrodeck8_weather_city_v2';
export const NOTES_STORAGE_KEY = '@retrodeck8_notes_v1';
export const MY_TUNES_STORAGE_KEY = '@retrodeck8_custom_tunes_v1';
export const SMS_TONE_STORAGE_KEY = '@retrodeck8_sms_tone_v1';
export const SMS_LIST_STORAGE_KEY = '@retrodeck8_sms_list_v1';
export const LIVE_AI_SMS_STORAGE_KEY = '@retrodeck8_live_ai_sms_v1';
export const LIVE_SMS_HISTORY_STORAGE_KEY = '@retrodeck8_live_sms_history_v1';

export const DYNAMIC_MOODS = [
  'NESELI VE ENERJIK',
  'ACELECI VE TELAŞLI',
  'UYKULU VE DALGIN',
  'ALAYCI VE ESPRILI',
  'DRAMATIK VE ABARTILI',
  'SAMIMI VE MERAKLI',
];

export const UNEXPECTED_TWISTS = [
  'Konuyu aniden cok komik veya beklenmedik bir olaya bagla (ornek: yanlislikla baskasina atacakmis gibi, garip bir ruya, komsunun kedisi veya sacma bir iddia).',
  'Mesajin icine kucuk, beklenmedik bir surpriz veya absurt bir detay sıkıştır.',
  'Sanki az once tuhaf bir sey yasamissin gibi sasirmis ve komik bir tonda yaz.',
];

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
  personaId?: string;
  timestamp?: string;
  mood?: string;
}

export interface LiveSmsPersona {
  id: string;
  sender: string;
  tag: string;
  instruction: string;
  fallback: string;
}

export const LIVE_SMS_PERSONAS: LiveSmsPersona[] = [
  {
    id: 'kanka',
    sender: 'MERT (KANKA)',
    tag: 'SMS',
    instruction: 'Sen kullanicinin yakin Turk arkadasisin (Mert). Halisaha, aksam bulusma, kahve veya oyun hakkinda cok dogal, samimi, sokak agziyla tam bir cumlelik SMS yaz.',
    fallback: 'kanka aksam 8de halisaha var unutmadin di mi? adam lazim acil don',
  },
  {
    id: 'anne',
    sender: 'ANNEM',
    tag: 'AILE',
    instruction: 'Sen kullanicinin Turk annesisin. Aksam kacta gelecegini sor, yemek yaptigini soyle veya ustunu siki giy gibi cok dogal, samimi tam bir anne SMSi yaz.',
    fallback: 'oglum aksam kacta geliyosun? sevdigin yemegi yaptim sogumasin haber ver',
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
    instruction: 'Sen is yerindeki mudursun. Toplantinin saati degistigini veya sunum dosyasini soran gercekci, kibar ama aceleci tam bir is SMSi yaz.',
    fallback: 'Selam, musteri toplantisini 15:00e cektiler. Sunum dosyasini birazdan atabilir misin?',
  },
  {
    id: 'flort',
    sender: '+90 532 *** 18',
    tag: 'SMS',
    instruction: 'Sen eski bir flort veya uzun zamandir yazmayan gizemli bir tanidiksin. Merak uyandiran cok dogal, samimi bir SMS yaz.',
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
];

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
