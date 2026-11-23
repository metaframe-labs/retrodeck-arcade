export type RetroPaletteId = 'phosphor' | 'nokia' | 'amber' | 'crimson' | 'oled';

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
  phosphor: {
    id: 'phosphor',
    name: 'PHOSPHOR',
    screenBg: '#04120E',
    pixelOn: '#00FFAA',
    pixelGlow: 'rgba(0, 255, 170, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.28)',
    bezelAccent: '#00FFAA',
    textMuted: '#5B9A84',
  },
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
  crimson: {
    id: 'crimson',
    name: 'CRIMSON',
    screenBg: '#14040A',
    pixelOn: '#FF2A6D',
    pixelGlow: 'rgba(255, 42, 109, 0.55)',
    scanlineColor: 'rgba(0, 0, 0, 0.28)',
    bezelAccent: '#FF2A6D',
    textMuted: '#9A4360',
  },
  oled: {
    id: 'oled',
    name: 'OLED MONO',
    screenBg: '#030406',
    pixelOn: '#F2F6FF',
    pixelGlow: 'rgba(242, 246, 255, 0.45)',
    scanlineColor: 'rgba(0, 0, 0, 0.22)',
    bezelAccent: '#00E5FF',
    textMuted: '#788496',
  },
};

export const PALETTE_ORDER: RetroPaletteId[] = ['nokia', 'phosphor', 'amber', 'crimson', 'oled'];
