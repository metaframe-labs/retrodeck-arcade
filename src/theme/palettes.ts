export type RetroPaletteId =
  | 'nokia'
  | 'phosphor'
  | 'amber'
  | 'crimson'
  | 'oled'
  | 'gameboy'
  | 'cyberpunk'
  | 'synthwave'
  | 'gameboy_pocket'
  | 'virtualboy'
  | 'matrix'
  | 'solarized'
  | 'gameboy_light'
  | 'macintosh'
  | 'commodore64'
  | 'dracula'
  | 'nord'
  | 'vaporwave'
  | 'pipboy'
  | 'sunset';

export interface RetroPalette {
  id: RetroPaletteId;
  name: string;
  screenBg: string;
  pixelOn: string;
  pixelGlow: string;
  scanlineColor: string;
  bezelAccent: string;
  textMuted: string;
  isLightLcd?: boolean;
}

export const RETRO_PALETTES: Record<RetroPaletteId, RetroPalette> = {
  nokia: {
    id: 'nokia',
    name: 'NOKIA 3310',
    screenBg: '#94B07C',
    pixelOn: '#172616',
    pixelGlow: 'rgba(23, 38, 22, 0.25)',
    scanlineColor: 'rgba(23, 38, 22, 0.08)',
    bezelAccent: '#94B07C',
    textMuted: '#7B9369',
    isLightLcd: true,
  },
  gameboy: {
    id: 'gameboy',
    name: 'ORIGINAL GB',
    screenBg: '#8BAC0F',
    pixelOn: '#0F380F',
    pixelGlow: 'rgba(15, 56, 15, 0.28)',
    scanlineColor: 'rgba(15, 56, 15, 0.09)',
    bezelAccent: '#8BAC0F',
    textMuted: '#306230',
    isLightLcd: true,
  },
  gameboy_pocket: {
    id: 'gameboy_pocket',
    name: 'GB POCKET',
    screenBg: '#C4CFA1',
    pixelOn: '#2B381A',
    pixelGlow: 'rgba(43, 56, 26, 0.25)',
    scanlineColor: 'rgba(43, 56, 26, 0.08)',
    bezelAccent: '#9AA774',
    textMuted: '#68774E',
    isLightLcd: true,
  },
  gameboy_light: {
    id: 'gameboy_light',
    name: 'GB LIGHT',
    screenBg: '#003B36',
    pixelOn: '#00FFA3',
    pixelGlow: 'rgba(0, 255, 163, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.22)',
    bezelAccent: '#00FFA3',
    textMuted: '#008F7A',
  },
  phosphor: {
    id: 'phosphor',
    name: 'PHOSPHOR GREEN',
    screenBg: '#04120E',
    pixelOn: '#00FFAA',
    pixelGlow: 'rgba(0, 255, 170, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.28)',
    bezelAccent: '#00FFAA',
    textMuted: '#5B9A84',
  },
  pipboy: {
    id: 'pipboy',
    name: 'PIP-BOY 3000',
    screenBg: '#021808',
    pixelOn: '#1FF742',
    pixelGlow: 'rgba(31, 247, 66, 0.65)',
    scanlineColor: 'rgba(0, 0, 0, 0.35)',
    bezelAccent: '#1FF742',
    textMuted: '#148C2B',
  },
  amber: {
    id: 'amber',
    name: 'AMBER CRT',
    screenBg: '#140B02',
    pixelOn: '#FFB000',
    pixelGlow: 'rgba(255, 176, 0, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.3)',
    bezelAccent: '#FFB000',
    textMuted: '#A87924',
  },
  commodore64: {
    id: 'commodore64',
    name: 'COMMODORE 64',
    screenBg: '#40318D',
    pixelOn: '#8A7CE6',
    pixelGlow: 'rgba(138, 124, 230, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#8A7CE6',
    textMuted: '#6859B8',
  },
  macintosh: {
    id: 'macintosh',
    name: 'MACINTOSH 1984',
    screenBg: '#E7E8EB',
    pixelOn: '#1A1B1E',
    pixelGlow: 'rgba(26, 27, 30, 0.2)',
    scanlineColor: 'rgba(0, 0, 0, 0.06)',
    bezelAccent: '#B8BAC2',
    textMuted: '#737785',
    isLightLcd: true,
  },
  crimson: {
    id: 'crimson',
    name: 'CRIMSON RED',
    screenBg: '#14040A',
    pixelOn: '#FF2A6D',
    pixelGlow: 'rgba(255, 42, 109, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.28)',
    bezelAccent: '#FF2A6D',
    textMuted: '#9A4360',
  },
  virtualboy: {
    id: 'virtualboy',
    name: 'VIRTUAL BOY',
    screenBg: '#000000',
    pixelOn: '#EA0000',
    pixelGlow: 'rgba(234, 0, 0, 0.6)',
    scanlineColor: 'rgba(0, 0, 0, 0.35)',
    bezelAccent: '#EA0000',
    textMuted: '#7E1212',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'CYBERPUNK CYAN',
    screenBg: '#050D1A',
    pixelOn: '#00F0FF',
    pixelGlow: 'rgba(0, 240, 255, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#00F0FF',
    textMuted: '#4B889B',
  },
  synthwave: {
    id: 'synthwave',
    name: 'SYNTHWAVE NEON',
    screenBg: '#120524',
    pixelOn: '#FF007F',
    pixelGlow: 'rgba(255, 0, 127, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#FF007F',
    textMuted: '#844D9E',
  },
  vaporwave: {
    id: 'vaporwave',
    name: 'VAPORWAVE PURPLE',
    screenBg: '#1E0E38',
    pixelOn: '#05FFA1',
    pixelGlow: 'rgba(5, 255, 161, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#FF71CE',
    textMuted: '#8B65A8',
  },
  sunset: {
    id: 'sunset',
    name: 'NEON SUNSET',
    screenBg: '#1C0B1B',
    pixelOn: '#FF7B00',
    pixelGlow: 'rgba(255, 123, 0, 0.6)',
    scanlineColor: 'rgba(0, 0, 0, 0.28)',
    bezelAccent: '#FF0055',
    textMuted: '#9B456E',
  },
  matrix: {
    id: 'matrix',
    name: 'MATRIX CODE',
    screenBg: '#010A03',
    pixelOn: '#00FF41',
    pixelGlow: 'rgba(0, 255, 65, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.3)',
    bezelAccent: '#00FF41',
    textMuted: '#2D8045',
  },
  dracula: {
    id: 'dracula',
    name: 'DRACULA GOTH',
    screenBg: '#21222C',
    pixelOn: '#BD93F9',
    pixelGlow: 'rgba(189, 147, 249, 0.5)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#BD93F9',
    textMuted: '#6272A4',
  },
  nord: {
    id: 'nord',
    name: 'NORD FROST',
    screenBg: '#242933',
    pixelOn: '#88C0D0',
    pixelGlow: 'rgba(136, 192, 208, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.22)',
    bezelAccent: '#81A1C1',
    textMuted: '#4C566A',
  },
  solarized: {
    id: 'solarized',
    name: 'SOLARIZED DARK',
    screenBg: '#002B36',
    pixelOn: '#2AA198',
    pixelGlow: 'rgba(42, 161, 152, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.25)',
    bezelAccent: '#2AA198',
    textMuted: '#586E75',
  },
  oled: {
    id: 'oled',
    name: 'OLED MONO',
    screenBg: '#030406',
    pixelOn: '#F2F6FF',
    pixelGlow: 'rgba(242, 246, 255, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.22)',
    bezelAccent: '#F2F6FF',
    textMuted: '#788496',
  },
};

export const PALETTE_ORDER: RetroPaletteId[] = [
  'gameboy',
  'nokia',
  'gameboy_pocket',
  'gameboy_light',
  'macintosh',
  'commodore64',
  'phosphor',
  'pipboy',
  'amber',
  'crimson',
  'virtualboy',
  'cyberpunk',
  'synthwave',
  'vaporwave',
  'sunset',
  'matrix',
  'dracula',
  'nord',
  'solarized',
  'oled',
];
