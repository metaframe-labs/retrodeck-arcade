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

/** Synthesizes authentic 8-bit sound waveforms directly into Base64 WAV data URI */
export function synthesizeRetroSoundUri(sound: ArcadeSound): string {
  let duration = 0.10;
  if (sound === 'shoot') duration = 0.12;
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
        const freq = 520 - progress * 280;
        const env = Math.max(0, 1 - progress * 1.4);
        const wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        sample = Math.floor(128 + wave * 105 * env);
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

export class RetroAudioEngine {
  private static pools: Partial<Record<ArcadeSound, any[]>> = {};
  private static poolIndex: Partial<Record<ArcadeSound, number>> = {};
  private static soundUris: Partial<Record<ArcadeSound, string>> = {};
  private static isInitialized = false;

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
      this.soundUris[s] = synthesizeRetroSoundUri(s);
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
