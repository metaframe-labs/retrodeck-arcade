import { Platform } from 'react-native';
import { ArcadeSound } from '../arcade/types';
import { bytesToBase64 } from '../core/base64';

// Dynamic safe load of expo-audio
let SafeExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-audio');
  SafeExpoAudio = mod?.createAudioPlayer ? mod : mod?.default ? mod.default : mod;
} catch {
  SafeExpoAudio = null;
}

const SAMPLE_RATE = 22050;

/** Generates standard 44-byte RIFF WAV byte buffer */
function createWavBuffer(numSamples: number): Uint8Array {
  const buffer = new Uint8Array(44 + numSamples);
  const view = new DataView(buffer.buffer);

  // "RIFF" chunk descriptor
  buffer.set([0x52, 0x49, 0x46, 0x46], 0);
  view.setUint32(4, 36 + numSamples, true);
  // "WAVE" format
  buffer.set([0x57, 0x41, 0x56, 0x45], 8);

  // "fmt " subchunk
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true); // ByteRate = SampleRate * 1 * 1
  view.setUint16(32, 1, true); // BlockAlign = 1
  view.setUint16(34, 8, true); // 8-bit unsigned PCM

  // "data" subchunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, numSamples, true);

  return buffer;
}

export type KeypadSoundStyle =
  | 'nokia_blip'   // Iconic high-pitch 3310 piezo tap
  | 'gameboy_click' // Chunky mechanical Game Boy tactile click
  | 'cyber_beep'   // Futuristic sci-fi synth pulse
  | 'dtmf_tone'    // Phone keypad multi-frequency dial tone
  | 'silent';      // No key tone

export const KEYPAD_SOUND_STYLES: { id: KeypadSoundStyle; name: string }[] = [
  { id: 'nokia_blip', name: 'NOKIA 3310' },
  { id: 'gameboy_click', name: 'ORIGINAL GB' },
  { id: 'cyber_beep', name: 'CYBER SYNTH' },
  { id: 'dtmf_tone', name: 'PHONE DTMF' },
  { id: 'silent', name: 'MUTE KEYS' },
];

/** Synthesizes authentic 8-bit sound waveforms directly into Base64 WAV data URI */
export function synthesizeRetroSoundUri(sound: ArcadeSound, keyStyle: KeypadSoundStyle = 'nokia_blip'): string {
  let duration = 0.10;
  if (sound === 'hit') {
    if (keyStyle === 'gameboy_click') duration = 0.04;
    else if (keyStyle === 'cyber_beep') duration = 0.08;
    else if (keyStyle === 'dtmf_tone') duration = 0.07;
    else duration = 0.05; // nokia_blip
  }
  else if (sound === 'shoot') duration = 0.12;
  else if (sound === 'score') duration = 0.16;
  else if (sound === 'powerup') duration = 0.24;
  else if (sound === 'explode') duration = 0.25;
  else if (sound === 'bomb') duration = 0.32;
  else if (sound === 'die' || sound === 'gameover') duration = 0.35;

  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const buffer = createWavBuffer(numSamples);
  const dataOffset = 44;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / numSamples;
    let sample = 128;

    switch (sound) {
      case 'hit': {
        if (keyStyle === 'silent') {
          sample = 128;
          break;
        }
        if (keyStyle === 'gameboy_click') {
          // Tactile low-frequency square thump + transient click
          const env = Math.max(0, 1 - progress * 2.2);
          const click = Math.sin(2 * Math.PI * 180 * t) > 0 ? 1 : -1;
          const pop = (Math.random() * 2 - 1) * Math.exp(-progress * 25);
          sample = Math.floor(128 + (click * 70 + pop * 50) * env);
        } else if (keyStyle === 'cyber_beep') {
          // Sci-Fi chirp sine pulse
          const freq = 1200 + Math.sin(progress * Math.PI) * 400;
          const env = Math.sin(progress * Math.PI);
          const wave = Math.sin(2 * Math.PI * freq * t);
          sample = Math.floor(128 + wave * 95 * env);
        } else if (keyStyle === 'dtmf_tone') {
          // Dual-tone multi-frequency phone dialer beep (697 Hz + 1209 Hz)
          const env = Math.max(0, 1 - progress * 1.2);
          const f1 = Math.sin(2 * Math.PI * 697 * t);
          const f2 = Math.sin(2 * Math.PI * 1209 * t);
          const mix = (f1 + f2) * 0.5 > 0 ? 1 : -1;
          sample = Math.floor(128 + mix * 90 * env);
        } else {
          // Default: Classic authentic Nokia 3310 piezo chirp (crisp 1850Hz pulse)
          const freq = 1850;
          const env = Math.max(0, 1 - progress * 1.8);
          const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
          sample = Math.floor(128 + wave * 105 * env);
        }
        break;
      }
      case 'shoot': {
        const freq = 1600 - progress * 1250;
        const env = Math.max(0, 1 - progress * 1.1);
        const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 110 * env);
        break;
      }
      case 'score': {
        const freq = progress < 0.5 ? 880 : 1320;
        const noteProgress = (progress % 0.5) * 2;
        const env = Math.max(0, 1 - noteProgress * 1.2);
        const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 105 * env);
        break;
      }
      case 'powerup': {
        const notes = [523, 659, 784, 1046];
        const noteIdx = Math.min(3, Math.floor(progress * 4));
        const freq = notes[noteIdx];
        const env = Math.max(0, 1 - (progress % 0.25) * 2.8);
        const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 110 * env);
        break;
      }
      case 'explode':
      case 'bomb': {
        const env = Math.pow(1 - progress, 1.4);
        const noise = Math.random() * 2 - 1;
        const rumble = Math.sin(2 * Math.PI * 65 * t);
        sample = Math.floor(128 + (noise * 0.75 + rumble * 0.25) * 115 * env);
        break;
      }
      case 'die':
      case 'gameover': {
        const freq = Math.max(65, 440 - progress * 360);
        const env = Math.max(0, 1 - progress * 0.95);
        const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 105 * env);
        break;
      }
      default: {
        const wave = Math.sin(2 * Math.PI * 440 * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 90 * (1 - progress));
        break;
      }
    }

    buffer[dataOffset + i] = Math.max(0, Math.min(255, sample));
  }

  const base64 = bytesToBase64(buffer);
  return `data:audio/wav;base64,${base64}`;
}

const SEMITONE_MAP: Record<string, number> = {
  c: 0,
  'c#': 1,
  d: 2,
  'd#': 3,
  e: 4,
  f: 5,
  'f#': 6,
  g: 7,
  'g#': 8,
  a: 9,
  'a#': 10,
  b: 11,
};

export interface NokiaNoteEvent {
  token: string;
  freq: number;
  durationSec: number;
  startSec: number;
}

/** Parses Nokia 3310 Composer notation (e.g. "8e2 8d2 4f#1 4g#1") into timed note events */
export function parseNokiaMelody(notation: string, bpm: number = 160): NokiaNoteEvent[] {
  const tokens = notation
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const beatSec = 60 / Math.max(40, Math.min(300, bpm));
  const events: NokiaNoteEvent[] = [];
  let cursor = 0;

  for (const tok of tokens) {
    const m = tok.toLowerCase().match(/^(1|2|4|8|16|32)(\.)?(-|[a-g]#?)([1-3])?$/);
    if (!m) continue;
    const div = parseInt(m[1], 10);
    const dotted = Boolean(m[2]);
    const noteStr = m[3];
    const oct = m[4] ? parseInt(m[4], 10) : 1;

    let dur = (4 / div) * beatSec;
    if (dotted) dur *= 1.5;

    let freq = 0;
    if (noteStr !== '-' && noteStr in SEMITONE_MAP) {
      const semi = SEMITONE_MAP[noteStr];
      // Octave 1 in Nokia Composer = C5 (523.25 Hz)
      const midi = 72 + (oct - 1) * 12 + semi;
      freq = 440 * Math.pow(2, (midi - 69) / 12);
    }

    events.push({
      token: tok,
      freq,
      durationSec: dur,
      startSec: cursor,
    });
    cursor += dur;
  }

  return events;
}

/** Synthesizes a Nokia 3310 piezo square-wave melody into a single Base64 WAV URI */
export function synthesizeNokiaMelodyUri(notation: string, bpm: number = 160): {
  uri: string;
  events: NokiaNoteEvent[];
  totalSec: number;
} {
  const events = parseNokiaMelody(notation, bpm);
  const totalSec = events.reduce((acc, e) => acc + e.durationSec, 0);
  const numSamples = Math.max(200, Math.min(SAMPLE_RATE * 25, Math.floor(totalSec * SAMPLE_RATE)));
  const buffer = createWavBuffer(numSamples);
  const dataOffset = 44;

  buffer.fill(128, dataOffset);

  for (const ev of events) {
    if (ev.freq <= 0) continue;
    const startSample = Math.floor(ev.startSec * SAMPLE_RATE);
    // Leave tiny 14ms articulation gap between notes like a real 3310 buzzer
    const gapSec = Math.min(0.014, ev.durationSec * 0.15);
    const toneSamples = Math.floor((ev.durationSec - gapSec) * SAMPLE_RATE);
    const endSample = Math.min(numSamples, startSample + toneSamples);

    for (let i = startSample; i < endSample; i++) {
      const localT = (i - startSample) / SAMPLE_RATE;
      const wave = Math.sin(2 * Math.PI * ev.freq * localT) >= 0 ? 1 : -1;
      buffer[dataOffset + i] = 128 + wave * 98;
    }
  }

  return {
    uri: `data:audio/wav;base64,${bytesToBase64(buffer)}`,
    events,
    totalSec,
  };
}

export class RetroAudioEngine {
  private static pools: Partial<Record<ArcadeSound, any[]>> = {};
  private static poolIndex: Partial<Record<ArcadeSound, number>> = {};
  private static soundUris: Partial<Record<ArcadeSound, string>> = {};
  private static isInitialized = false;
  private static isMuted = false;
  private static keySoundStyle: KeypadSoundStyle = 'nokia_blip';
  private static melodyPlayer: any = null;
  private static notePlayer: any = null;

  public static getKeySoundStyle(): KeypadSoundStyle {
    return this.keySoundStyle;
  }

  public static setKeySoundStyle(style: KeypadSoundStyle): void {
    this.keySoundStyle = style;
    // Re-synthesize 'hit' sound for the new key style
    const newUri = synthesizeRetroSoundUri('hit', style);
    this.soundUris.hit = newUri;

    // Refresh voice pool for 'hit'
    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        const voiceList: any[] = [];
        for (let v = 0; v < 3; v++) {
          const player = SafeExpoAudio.createAudioPlayer(newUri, { keepAudioSessionActive: true });
          if (player) {
            player.volume = 1.0;
            voiceList.push(player);
          }
        }
        this.pools.hit = voiceList;
        this.poolIndex.hit = 0;
      } catch (err) {
        console.warn('[RetroAudioEngine] Failed to refresh hit voices:', err);
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a1 = new Audio(newUri);
        const a2 = new Audio(newUri);
        a1.volume = 0.9;
        a2.volume = 0.9;
        this.pools.hit = [a1, a2];
        this.poolIndex.hit = 0;
      } catch {
        // ignore
      }
    }
  }

  public static setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopNokiaMelody();
    }
  }

  public static getMuted(): boolean {
    return this.isMuted;
  }

  public static stopNokiaMelody(): void {
    try {
      if (this.melodyPlayer) {
        if (typeof this.melodyPlayer.pause === 'function') this.melodyPlayer.pause();
        if (typeof this.melodyPlayer.remove === 'function') this.melodyPlayer.remove();
        this.melodyPlayer = null;
      }
    } catch {
      this.melodyPlayer = null;
    }
  }

  public static playNokiaMelody(notation: string, bpm: number = 160): {
    events: NokiaNoteEvent[];
    totalSec: number;
  } {
    this.stopNokiaMelody();
    const { uri, events, totalSec } = synthesizeNokiaMelodyUri(notation, bpm);
    if (this.isMuted) {
      return { events, totalSec };
    }

    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
        if (p) {
          p.volume = 1.0;
          this.melodyPlayer = p;
          p.play();
        }
      } catch (e) {
        console.warn('[RetroAudioEngine] playNokiaMelody error:', e);
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a = new Audio(uri);
        a.volume = 0.9;
        this.melodyPlayer = a;
        a.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    return { events, totalSec };
  }

  public static playNokiaNote(token: string, bpm: number = 160): void {
    if (this.isMuted) return;
    const { uri } = synthesizeNokiaMelodyUri(token, bpm);
    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        if (this.notePlayer && typeof this.notePlayer.remove === 'function') {
          this.notePlayer.remove();
        }
        const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
        if (p) {
          p.volume = 1.0;
          this.notePlayer = p;
          p.play();
        }
      } catch {
        // ignore
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a = new Audio(uri);
        a.volume = 0.9;
        a.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /** Plays the iconic Nokia 3310 Morse "S-M-S" (... -- ...) message tone */
  public static playNokiaSmsTone(): void {
    this.playNokiaMelody(
      '16e2 32- 16e2 32- 16e2 8- 8e2 32- 8e2 8- 16e2 32- 16e2 32- 16e2',
      170
    );
  }

  /** Plays a distinct keypad dialer tone for 0-9, *, # */
  public static playDialKey(key: string): void {
    const map: Record<string, string> = {
      '1': '16c1',
      '2': '16d1',
      '3': '16e1',
      '4': '16f1',
      '5': '16g1',
      '6': '16a1',
      '7': '16b1',
      '8': '16c2',
      '9': '16d2',
      '*': '16e2',
      '0': '16f2',
      '#': '16g2',
    };
    this.playNokiaNote(map[key] || '16c2', 180);
  }

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const sounds: ArcadeSound[] = [
      'hit',
      'shoot',
      'score',
      'powerup',
      'explode',
      'bomb',
      'die',
      'gameover',
    ];

    // Pre-synthesize all sound URIs
    for (const s of sounds) {
      this.soundUris[s] = synthesizeRetroSoundUri(s, this.keySoundStyle);
    }

    // 1. Native Mobile Audio (expo-audio on Android / iOS local build)
    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        if (SafeExpoAudio.setAudioModeAsync) {
          await SafeExpoAudio.setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'mixWithOthers',
            shouldPlayInBackground: false,
          });
        }

        // Voice pool sizes: 2 voices for high-frequency sounds, 1 for others
        const poolSizes: Partial<Record<ArcadeSound, number>> = {
          shoot: 2,
          hit: 2,
          explode: 2,
          score: 1,
          powerup: 1,
          bomb: 1,
          die: 1,
          gameover: 1,
        };

        for (const s of sounds) {
          const uri = this.soundUris[s]!;
          const count = poolSizes[s] || 1;
          const voiceList: any[] = [];
          for (let i = 0; i < count; i++) {
            try {
              const player = SafeExpoAudio.createAudioPlayer(uri, {
                keepAudioSessionActive: true,
              });
              if (player) {
                player.volume = 1.0;
                voiceList.push(player);
              }
            } catch (err) {
              console.warn(`[RetroAudioEngine] Failed to create voice for ${s}:`, err);
            }
          }
          this.pools[s] = voiceList;
          this.poolIndex[s] = 0;
        }
      } catch (e) {
        console.warn('[RetroAudioEngine] Native init error:', e);
      }
    }

    // 2. Web Browser Audio (HTML5 Audio pool)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      for (const s of sounds) {
        try {
          const uri = this.soundUris[s]!;
          const a1 = new Audio(uri);
          const a2 = new Audio(uri);
          a1.volume = 0.9;
          a2.volume = 0.9;
          this.pools[s] = [a1, a2];
          this.poolIndex[s] = 0;
        } catch {
          // Ignore
        }
      }
    }
  }

  public static play(sound: ArcadeSound): void {
    if (this.isMuted) return;
    // 1. Native Mobile (expo-audio)
    if (Platform.OS !== 'web') {
      try {
        const pool = this.pools[sound];
        if (pool && pool.length > 0) {
          const idx = (this.poolIndex[sound] || 0) % pool.length;
          this.poolIndex[sound] = (idx + 1) % pool.length;
          const player = pool[idx];

          if (player) {
            player.volume = 1.0;
            if (typeof player.seekTo === 'function') {
              player.seekTo(0)
                .then(() => {
                  player.play();
                })
                .catch(() => {
                  player.play();
                });
            } else {
              player.play();
            }
            return;
          }
        }

        // Lazy fallback if not pre-initialized
        if (SafeExpoAudio?.createAudioPlayer) {
          const uri = this.soundUris[sound] || synthesizeRetroSoundUri(sound);
          const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
          if (p) {
            p.volume = 1.0;
            p.play();
          }
        }
      } catch (err) {
        console.warn('[RetroAudioEngine] play error:', err);
      }
      return;
    }

    // 2. Web Browser (HTML5 Audio)
    try {
      const pool = this.pools[sound];
      if (pool && pool.length > 0) {
        const idx = (this.poolIndex[sound] || 0) % pool.length;
        this.poolIndex[sound] = (idx + 1) % pool.length;
        const audio = pool[idx];
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const uri = this.soundUris[sound] || synthesizeRetroSoundUri(sound);
      const audio = new Audio(uri);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  }
}
