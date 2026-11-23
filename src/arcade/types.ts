import React from 'react';
import { RetroPalette, RetroPaletteId } from '../theme/palettes';

export interface ArcadeInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
}

export type ArcadeSound =
  | 'hit'
  | 'score'
  | 'powerup'
  | 'shoot'
  | 'explode'
  | 'die'
  | 'bomb'
  | 'levelclear'
  | 'gameover';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 1.0 -> 0.0
  decay: number;
}

export interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
}

export interface ArcadeStats {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  gameOver: boolean;
  isMenu?: boolean;
  message?: string;
  subMessage?: string;
}

export interface ArcadeGameInstance {
  init: () => void;
  update: (input: ArcadeInput, dt: number) => ArcadeSound | null;
  getStats: () => ArcadeStats;
  reset: () => void;
  renderEntities: (palette: RetroPalette) => React.ReactNode;
  setHighScore?: (score: number) => void;
}

export interface ArcadeCartridgeDef {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  year: string;
  defaultPalette: RetroPaletteId;
  controlsHint: string;
  gamepadLabels: {
    up?: string;
    down?: string;
    left?: string;
    right?: string;
    a?: string;
    b?: string;
    upLabel?: string;
    downLabel?: string;
    leftLabel?: string;
    rightLabel?: string;
    aLabel?: string;
    bLabel?: string;
  };
  createGame: (initialHighScore?: number) => ArcadeGameInstance;
}
