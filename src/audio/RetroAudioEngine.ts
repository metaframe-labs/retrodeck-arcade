import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArcadeSound } from '../arcade/types';
import { bytesToBase64 } from '../core/base64';

const KEY_SOUND_STORAGE_KEY = '@retrodeck8_key_sound_v1';
const VOLUME_STORAGE_KEY = '@retrodeck8_volume_v1';

export type KeypadSoundStyle =
  | 'classic'
  | 'thock'
  | 'gameboy'
  | 'nokia'
  | 'bubble'
  | 'silent';

export const KEYPAD_SOUND_STYLES: { id: KeypadSoundStyle; name: string }[] = [
  { id: 'classic', name: 'RETRO DEFAULT' },
  { id: 'thock', name: 'MECH THOCK' },
  { id: 'gameboy', name: 'GB BLIP' },
  { id: 'nokia', name: '3310 SOFT' },
  { id: 'bubble', name: 'SOFT POP' },
  { id: 'silent', name: 'MUTE KEYS' },
];

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

/** Synthesizes authentic 8-bit sound waveforms directly into Base64 WAV data URI */
export function synthesizeRetroSoundUri(
  sound: ArcadeSound,
  keyStyle: KeypadSoundStyle = 'classic',
  gain: number = 1.0
): string {
  let duration = 0.10;
  if (sound === 'hit') {
    if (keyStyle === 'thock') duration = 0.065;
    else if (keyStyle === 'gameboy') duration = 0.055;
    else if (keyStyle === 'nokia') duration = 0.038;
    else if (keyStyle === 'bubble') duration = 0.05;
    else if (keyStyle === 'silent') duration = 0.02;
    else duration = 0.10; // classic default
  } else if (sound === 'shoot') duration = 0.12;
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
        } else if (keyStyle === 'thock') {
          // Punchy tactile mechanical keyboard thock (audible on phone speakers)
          const freq = 290 - progress * 165;
          const env = Math.pow(1 - progress, 1.35);
          const warmBody = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 2.6);
          const transient = progress < 0.12
            ? Math.sin(2 * Math.PI * 860 * t) * (1 - progress / 0.12) * 0.55
            : 0;
          const mixed = Math.max(-1, Math.min(1, warmBody * 0.85 + transient));
          sample = Math.floor(128 + mixed * 124 * env);
        } else if (keyStyle === 'gameboy') {
          // Crisp warm Game Boy two-step menu blip (660 Hz -> 880 Hz, 25% pulse duty)
          const freq = progress < 0.42 ? 660 : 880;
          const phase = (freq * t) % 1;
          const wave = phase < 0.25 ? 1 : -0.5;
          const env = Math.max(0, 1 - progress * 1.15);
          sample = Math.floor(128 + wave * 92 * env);
        } else if (keyStyle === 'nokia') {
          // Smooth Nokia keypad pip (warm 960Hz rounded square, zero harshness)
          const freq = 960;
          const env = Math.sin(progress * Math.PI);
          const sine = Math.sin(2 * Math.PI * freq * t);
          const softSq = Math.tanh(sine * 2.2);
          sample = Math.floor(128 + softSq * 90 * env);
        } else if (keyStyle === 'bubble') {
          // Smooth rising retro pop/bloop
          const freq = 340 + progress * 460;
          const env = Math.sin(progress * Math.PI);
          const wave = Math.sin(2 * Math.PI * freq * t);
          sample = Math.floor(128 + wave * 105 * env);
        } else {
          // 'classic' (Original default sound preserved)
          const freq = 520 - progress * 280;
          const env = Math.max(0, 1 - progress * 1.4);
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

    const scaled = Math.round(128 + (sample - 128) * gain);
    buffer[dataOffset + i] = Math.max(0, Math.min(255, scaled));
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
export function synthesizeNokiaMelodyUri(
  notation: string,
  bpm: number = 160,
  gain: number = 1.0
): {
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
      buffer[dataOffset + i] = Math.round(128 + wave * 98 * gain);
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
  private static masterVolume = 1.0; // 0.0 to 1.0
  private static keySoundStyle: KeypadSoundStyle = 'classic';
  private static melodyPlayer: any = null;
  private static notePlayer: any = null;

  public static getEffectiveGain(): number {
    if (this.masterVolume <= 0) return 0;
    return Math.pow(this.masterVolume, 1.8);
  }

  public static getVolume(): number {
    return this.masterVolume;
  }

  private static rebuildPoolForSound(s: ArcadeSound, count: number): void {
    const gain = this.getEffectiveGain();
    const newUri = synthesizeRetroSoundUri(s, this.keySoundStyle, gain);
    this.soundUris[s] = newUri;

    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        const oldPool = this.pools[s];
        if (oldPool) {
          oldPool.forEach((p) => {
            try {
              if (typeof p?.remove === 'function') p.remove();
            } catch {}
          });
        }
        const voiceList: any[] = [];
        for (let v = 0; v < count; v++) {
          const player = SafeExpoAudio.createAudioPlayer(newUri, { keepAudioSessionActive: true });
          if (player) {
            player.volume = gain;
            voiceList.push(player);
          }
        }
        this.pools[s] = voiceList;
        this.poolIndex[s] = 0;
      } catch (err) {
        console.warn(`[RetroAudioEngine] Failed to refresh voices for ${s}:`, err);
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a1 = new Audio(newUri);
        const a2 = new Audio(newUri);
        a1.volume = gain * 0.9;
        a2.volume = gain * 0.9;
        this.pools[s] = [a1, a2];
        this.poolIndex[s] = 0;
      } catch {
        // ignore
      }
    }
  }

  public static setVolume(vol: number, persist = true): void {
    const clamped = Math.max(0, Math.min(1, Math.round(vol * 10) / 10));
    this.masterVolume = clamped;
    if (persist) {
      AsyncStorage.setItem(VOLUME_STORAGE_KEY, String(clamped)).catch(() => {});
    }
    if (clamped === 0) {
      this.stopNokiaMelody();
    }
    if (this.melodyPlayer) {
      try {
        const gain = this.getEffectiveGain();
        this.melodyPlayer.volume = Platform.OS === 'web' ? gain * 0.9 : gain;
      } catch {}
    }
    // Re-synthesize all sound effects (including menu score/powerup/hit) with physical PCM gain scaling
    const poolSizes: Partial<Record<ArcadeSound, number>> = {
      shoot: 2,
      hit: 3,
      explode: 2,
      score: 2,
      powerup: 1,
      bomb: 1,
      die: 1,
      gameover: 1,
      levelclear: 1,
    };
    (Object.keys(poolSizes) as ArcadeSound[]).forEach((s) => {
      this.rebuildPoolForSound(s, poolSizes[s] || 1);
    });
  }

  public static getKeySoundStyle(): KeypadSoundStyle {
    return this.keySoundStyle;
  }

  public static setKeySoundStyle(style: KeypadSoundStyle, persist = true): void {
    this.keySoundStyle = style;
    if (persist) {
      AsyncStorage.setItem(KEY_SOUND_STORAGE_KEY, style).catch(() => {});
    }
    this.rebuildPoolForSound('hit', 3);
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
    const gain = this.getEffectiveGain();
    const { uri, events, totalSec } = synthesizeNokiaMelodyUri(notation, bpm, gain);
    if (this.isMuted || gain <= 0) {
      return { events, totalSec };
    }

    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
        if (p) {
          p.volume = gain;
          this.melodyPlayer = p;
          p.play();
        }
      } catch (e) {
        console.warn('[RetroAudioEngine] playNokiaMelody error:', e);
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a = new Audio(uri);
        a.volume = gain * 0.9;
        this.melodyPlayer = a;
        a.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    return { events, totalSec };
  }

  public static playNokiaNote(token: string, bpm: number = 160): void {
    const gain = this.getEffectiveGain();
    if (this.isMuted || gain <= 0) return;
    const { uri } = synthesizeNokiaMelodyUri(token, bpm, gain);
    if (Platform.OS !== 'web' && SafeExpoAudio?.createAudioPlayer) {
      try {
        if (this.notePlayer && typeof this.notePlayer.remove === 'function') {
          this.notePlayer.remove();
        }
        const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
        if (p) {
          p.volume = gain;
          this.notePlayer = p;
          p.play();
        }
      } catch {
        // ignore
      }
    } else if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      try {
        const a = new Audio(uri);
        a.volume = gain * 0.9;
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

    try {
      const savedStyle = await AsyncStorage.getItem(KEY_SOUND_STORAGE_KEY);
      if (savedStyle && KEYPAD_SOUND_STYLES.some((s) => s.id === savedStyle)) {
        this.keySoundStyle = savedStyle as KeypadSoundStyle;
      }
      const savedVol = await AsyncStorage.getItem(VOLUME_STORAGE_KEY);
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!Number.isNaN(parsed)) {
          this.masterVolume = Math.max(0, Math.min(1, parsed));
        }
      }
    } catch {
      // ignore storage read failure
    }

    const sounds: ArcadeSound[] = [
      'hit',
      'shoot',
      'score',
      'powerup',
      'explode',
      'bomb',
      'die',
      'gameover',
      'levelclear',
    ];

    const gain = this.getEffectiveGain();

    // Pre-synthesize all sound URIs
    for (const s of sounds) {
      this.soundUris[s] = synthesizeRetroSoundUri(s, this.keySoundStyle, gain);
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

        // Voice pool sizes: 2-3 voices for high-frequency sounds, 1-2 for others
        const poolSizes: Partial<Record<ArcadeSound, number>> = {
          shoot: 2,
          hit: 3,
          explode: 2,
          score: 2,
          powerup: 1,
          bomb: 1,
          die: 1,
          gameover: 1,
          levelclear: 1,
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
                player.volume = gain;
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
          a1.volume = gain * 0.9;
          a2.volume = gain * 0.9;
          this.pools[s] = [a1, a2];
          this.poolIndex[s] = 0;
        } catch {
          // Ignore
        }
      }
    }
  }

  public static play(sound: ArcadeSound): void {
    const gain = this.getEffectiveGain();
    if (this.isMuted || gain <= 0) return;
    // 1. Native Mobile (expo-audio)
    if (Platform.OS !== 'web') {
      try {
        const pool = this.pools[sound];
        if (pool && pool.length > 0) {
          const idx = (this.poolIndex[sound] || 0) % pool.length;
          this.poolIndex[sound] = (idx + 1) % pool.length;
          const player = pool[idx];

          if (player) {
            player.volume = gain;
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
          const uri =
            this.soundUris[sound] || synthesizeRetroSoundUri(sound, this.keySoundStyle, gain);
          const p = SafeExpoAudio.createAudioPlayer(uri, { keepAudioSessionActive: true });
          if (p) {
            p.volume = gain;
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
        audio.volume = gain * 0.9;
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const uri =
        this.soundUris[sound] || synthesizeRetroSoundUri(sound, this.keySoundStyle, gain);
      const audio = new Audio(uri);
      audio.volume = gain * 0.9;
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  }
}
