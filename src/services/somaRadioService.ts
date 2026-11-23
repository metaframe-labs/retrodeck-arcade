import { Platform } from 'react-native';

export interface SomaChannel {
  id: string;
  name: string;
  genre: string;
  freq: string; // e.g. "101.4 FM"
  streamUrl: string;
  description: string;
}

export const SOMA_CHANNELS: SomaChannel[] = [
  {
    id: 'spacestation',
    name: 'SPACE STATION',
    genre: 'AMBIENT ELEC',
    freq: '88.5 FM',
    streamUrl: 'https://ice6.somafm.com/spacestation-128-mp3',
    description: 'Spaced-out ambient and mid-tempo electronica.',
  },
  {
    id: 'defcon',
    name: 'DEF CON RADIO',
    genre: 'HACKER BEATS',
    freq: '93.7 FM',
    streamUrl: 'https://ice6.somafm.com/defcon-128-mp3',
    description: 'Music for Hacking. The DEF CON Year-Round Channel.',
  },
  {
    id: 'groovesalad',
    name: 'GROOVE SALAD',
    genre: 'DOWNTEMPO',
    freq: '96.2 FM',
    streamUrl: 'https://ice6.somafm.com/groovesalad-128-mp3',
    description: 'A nicely chilled plate of ambient downtempo beats.',
  },
  {
    id: 'vaporwaves',
    name: 'VAPORWAVES',
    genre: 'VAPORWAVE',
    freq: '84.0 FM',
    streamUrl: 'https://ice6.somafm.com/vaporwaves-128-mp3',
    description: 'All Vaporwave. All the time. Aesthetic retro sound.',
  },
  {
    id: 'secretagent',
    name: 'SECRET AGENT',
    genre: 'SPY LOUNGE',
    freq: '00.7 FM',
    streamUrl: 'https://ice6.somafm.com/secretagent-128-mp3',
    description: 'Soundtrack for spies, PIs, and a stylish mysterious life.',
  },
  {
    id: 'cliqhop',
    name: 'CLIQHOP IDM',
    genre: 'INTELLIGENT DANCE',
    freq: '104.2 FM',
    streamUrl: 'https://ice6.somafm.com/cliqhop-128-mp3',
    description: "Blips'n'beeps backed mostly w/beats. IDM electronica.",
  },
  {
    id: 'synphaera',
    name: 'SYNPHAERA',
    genre: 'SPACE AMBIENT',
    freq: '107.9 FM',
    streamUrl: 'https://ice6.somafm.com/synphaera-128-mp3',
    description: 'Modern electronic ambient and deep space exploration.',
  },
  {
    id: 'dronezone',
    name: 'DRONE ZONE',
    genre: 'DEEP DRONE',
    freq: '91.1 FM',
    streamUrl: 'https://ice6.somafm.com/dronezone-128-mp3',
    description: 'Atmospheric textures with minimal beats. Deep chill.',
  },
  {
    id: 'lush',
    name: 'LUSH',
    genre: 'CHILL VOCALS',
    freq: '98.5 FM',
    streamUrl: 'https://ice6.somafm.com/lush-128-mp3',
    description: 'Sensuous and mellow female vocals with electronic influence.',
  },
  {
    id: 'suburbsofgoa',
    name: 'SUBURBS OF GOA',
    genre: 'WORLD BEATS',
    freq: '102.8 FM',
    streamUrl: 'https://ice6.somafm.com/suburbsofgoa-128-mp3',
    description: 'Desi-influenced Asian world beats and beyond.',
  },
];

export interface SomaSongInfo {
  title: string;
  artist: string;
  album: string;
}

// Global radio manager singleton so audio streams continuously across OS & Cartridge games
class SomaRadioService {
  private player: any = null;
  private currentChannelIndex: number = 0;
  private isPlaying: boolean = false;
  private isLoading: boolean = false;
  private volume: number = 0.85;
  private currentSong: SomaSongInfo | null = null;
  private songPollTimer: any = null;
  private listeners: Set<() => void> = new Set();
  private safeExpoAudio: any = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('expo-audio');
      this.safeExpoAudio = mod?.createAudioPlayer ? mod : mod?.default ? mod.default : mod;
    } catch {
      this.safeExpoAudio = null;
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  public getChannel(): SomaChannel {
    return SOMA_CHANNELS[this.currentChannelIndex];
  }

  public getChannelIndex(): number {
    return this.currentChannelIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getCurrentSong(): SomaSongInfo | null {
    return this.currentSong;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.player) {
      try {
        this.player.volume = this.volume;
      } catch {}
    }
    this.notify();
  }

  public nextChannel() {
    this.currentChannelIndex = (this.currentChannelIndex + 1) % SOMA_CHANNELS.length;
    if (this.isPlaying) {
      this.playCurrentChannel();
    } else {
      this.fetchNowPlaying();
      this.notify();
    }
  }

  public prevChannel() {
    this.currentChannelIndex =
      (this.currentChannelIndex - 1 + SOMA_CHANNELS.length) % SOMA_CHANNELS.length;
    if (this.isPlaying) {
      this.playCurrentChannel();
    } else {
      this.fetchNowPlaying();
      this.notify();
    }
  }

  public async togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      await this.playCurrentChannel();
    }
  }

  public async playCurrentChannel() {
    const channel = this.getChannel();
    this.isLoading = true;
    this.notify();

    // Start polling song metadata
    this.fetchNowPlaying();
    if (!this.songPollTimer) {
      this.songPollTimer = setInterval(() => this.fetchNowPlaying(), 15000);
    }

    try {
      if (Platform.OS === 'web') {
        if (!this.player) {
          const audio = new Audio(channel.streamUrl);
          audio.crossOrigin = 'anonymous';
          this.player = audio;
        } else {
          this.player.src = channel.streamUrl;
        }
        this.player.volume = this.volume;
        await this.player.play();
        this.isPlaying = true;
        this.isLoading = false;
        this.notify();
        return;
      }

      // Native mobile: use expo-audio
      if (this.safeExpoAudio?.createAudioPlayer) {
        if (this.player) {
          try {
            this.player.pause();
          } catch {}
        }
        this.player = this.safeExpoAudio.createAudioPlayer(channel.streamUrl, {
          updateInterval: 1000,
          downloadFirst: false,
        });
        if (this.player) {
          this.player.volume = this.volume;
          this.player.play();
          this.isPlaying = true;
          this.isLoading = false;
          this.notify();
          return;
        }
      }

      // Fallback
      this.isPlaying = true;
      this.isLoading = false;
      this.notify();
    } catch (e) {
      this.isPlaying = false;
      this.isLoading = false;
      this.notify();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isLoading = false;
    if (this.songPollTimer) {
      clearInterval(this.songPollTimer);
      this.songPollTimer = null;
    }
    if (this.player) {
      try {
        if (Platform.OS === 'web') {
          this.player.pause();
        } else if (typeof this.player.pause === 'function') {
          this.player.pause();
        }
      } catch {}
    }
    this.notify();
  }

  public async fetchNowPlaying() {
    const channel = this.getChannel();
    try {
      const res = await fetch(`https://somafm.com/songs/${channel.id}.json`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.songs && json.songs.length > 0) {
          const first = json.songs[0];
          this.currentSong = {
            title: first.title || 'LIVE BROADCAST',
            artist: first.artist || 'SomaFM',
            album: first.album || '',
          };
          this.notify();
        }
      }
    } catch {
      // offline / network silence
    }
  }
}

export const somaRadioService = new SomaRadioService();
