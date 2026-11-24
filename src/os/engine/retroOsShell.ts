import { ArcadeSound } from '../../arcade/types';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { somaRadioService } from '../../services/somaRadioService';
import { callBYOKAIChat, getProviderMeta, getProviderModel } from '../../services/byokAiService';
import { ALL_PIC_ART_KEYS, LIVE_SMS_PERSONAS, NOKIA_SONGS, REAL_POSTCARDS, wrapTextLines } from '../retroOsData';
import { activatePostFormatWinTheme, openFormatSimulator } from './formatSimEngine';
import type { RetroDeckOS } from '../RetroDeckOS';

export function pushTermLinesImpl(os: RetroDeckOS, lines: string[], showLogo = false) {
  os.termShowLogo = showLogo;
  if (showLogo) {
    os.termOut = lines.slice(0, 6);
    os.termScroll = 0;
    return;
  }
  os.termOut.push(...lines);
  if (os.termOut.length > 80) {
    os.termOut = os.termOut.slice(os.termOut.length - 80);
  }
  os.termScroll = Math.max(0, os.termOut.length - 6);
}

export function execTermCmdImpl(os: RetroDeckOS, rawCmd: string): ArcadeSound {
  const clean = rawCmd.trim();
  if (!clean) return 'hit';

  const carts = os.cb.getCartridges();
  const scores = os.cb.getHighScores();
  const meta = getProviderMeta(os.byokConfig.activeProvider);
  const parts = clean.split(/\s+/);
  const bin = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');

  if (bin === 'clear' || bin === 'cls') {
    os.termShowLogo = false;
    os.termOut = [];
    os.termScroll = 0;
    return 'hit';
  }

  if (bin === 'neofetch') {
    os.pushTermLines(
      [
        'root@retrodeck',
        '------------------',
        'OS: RetroDeck v1.2',
        `PAL: ${os.cb.getPaletteName().slice(0, 13)}`,
        `ROM: ${carts.length} | AI:${meta.shortName}`,
        `UP: ${Math.floor(os.uptime)}s | 18/64KB`,
      ],
      true
    );
    return 'score';
  }

  // Echo command line into scrollback
  if (os.termShowLogo) {
    os.termOut = [];
    os.termShowLogo = false;
  }
  os.pushTermLines([`${os.termCwd}$ ${clean}`]);

  if (bin === 'help' || bin === '?') {
    os.pushTermLines([
      'CMDS: ls, cd, pwd, cat, clear, top,',
      'neofetch, uname, free, date, whoami,',
      'open <game>, randgame, play <song>,',
      'stop, ai <msg>, format, theme, reboot',
    ]);
    return 'score';
  }

  if (bin === 'lang') {
    const req = arg.trim().toLowerCase();
    if (req === 'en' || req === 'tr') os.setLang(req);
    else os.toggleLang();
    os.pushTermLines([`OS LANGUAGE: ${os.lang.toUpperCase()}`]);
    return 'score';
  }

  if (bin === 'pwd') {
    os.pushTermLines([os.termCwd]);
    return 'score';
  }

  if (bin === 'whoami') {
    os.pushTermLines(['root (uid=0, gid=0, groups=nokia3310)']);
    return 'score';
  }

  if (bin === 'date') {
    os.pushTermLines([new Date().toUTCString().toUpperCase()]);
    return 'score';
  }

  if (bin === 'uptime') {
    os.pushTermLines([`UP ${Math.floor(os.uptime)}s, LOAD AVG: 0.02, 0.01`]);
    return 'score';
  }

  if (bin === 'echo') {
    os.pushTermLines([arg || '']);
    return 'score';
  }

  if (bin === 'uname') {
    os.pushTermLines([
      'RetroDeckOS 1.2.0-arm64 #1 SMP PREEMPT',
      `LCD 320x240 60Hz | AI: ${meta.name.toUpperCase()}`,
    ]);
    return 'score';
  }

  if (bin === 'free') {
    os.pushTermLines([
      '      TOTAL  USED  FREE',
      'RAM:   64KB  18KB  46KB [#####---------]',
      'VRAM:  16KB   9KB   7KB [########------]',
    ]);
    return 'score';
  }

  if (bin === 'top' || bin === 'ps') {
    os.pushTermLines([
      'PID USER  CPU% MEM  COMMAND',
      '  1 root   4.2 6KB  /sbin/rd-kernel',
      ' 12 root   8.5 8KB  /bin/arcade-60fps',
      ` 24 root   1.1 4KB  /bin/byok-${meta.id}`,
    ]);
    return 'score';
  }

  if (bin === 'cd') {
    const target = (arg || '/home').trim();
    if (target === '..') {
      os.termCwd = '/';
    } else if (['/home', '/carts', '/etc', '/bin', '/'].includes(target)) {
      os.termCwd = target;
    } else if (['home', 'carts', 'etc', 'bin'].includes(target)) {
      os.termCwd = `/${target}`;
    } else {
      os.pushTermLines([`cd: ${target}: No such directory`]);
      return 'die';
    }
    return 'score';
  }

  if (bin === 'ls' || bin === 'dir') {
    const target = arg.trim() || os.termCwd;
    if (target === '/' || target === '.') {
      os.pushTermLines(['bin/  carts/  etc/  home/  boot.rom']);
    } else if (target.includes('cart')) {
      os.pushTermLines([
        `TOTAL ${carts.length} CARTRIDGES (USE "open <name>"):`,
        `01:${carts[0]?.id}  02:${carts[1]?.id}`,
        `03:${carts[2]?.id}  04:${carts[3]?.id}`,
        `05:${carts[4]?.id}  06:${carts[5]?.id}`,
      ]);
    } else if (target.includes('etc')) {
      os.pushTermLines(['os-release  byok.conf  palettes.conf']);
    } else if (target.includes('bin')) {
      os.pushTermLines(['rdsh  neofetch  open  play  ai  top']);
    } else {
      os.pushTermLines(['readme.txt  scores.log  nokia3310.rom']);
    }
    return 'score';
  }

  if (bin === 'cat') {
    const f = arg.toLowerCase();
    if (!f) {
      os.pushTermLines(['usage: cat <readme.txt|scores.log|/etc/os>']);
      return 'hit';
    }
    if (f.includes('score')) {
      const entries = Object.entries(scores)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      if (entries.length === 0) {
        os.pushTermLines(['scores.log: (empty - play a game!)']);
      } else {
        os.pushTermLines(
          entries.map(([id, val], i) => `#${i + 1} ${id}: ${val} PTS`)
        );
      }
    } else if (f.includes('os') || f.includes('etc')) {
      os.pushTermLines([
        'NAME="RetroDeck OS"',
        'VERSION="1.2 (Nokia 3310 Edition)"',
        `PALETTE="${os.cb.getPaletteName()}"`,
      ]);
    } else {
      os.pushTermLines([
        'RETRODECK OS // 100-IN-1 POCKET CONSOLE',
        'TYPE "open snake" OR "play nokia"!',
      ]);
    }
    return 'score';
  }

  if (bin === 'open' || bin === 'run') {
    if (!arg) {
      os.pushTermLines(['usage: open <game name or 1..100>']);
      return 'hit';
    }
    const num = parseInt(arg, 10);
    const q = arg.toLowerCase();
    const found =
      !isNaN(num) && num >= 1 && num <= carts.length
        ? carts[num - 1]
        : carts.find(
            (c) =>
              c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
          );
    if (found) {
      const isPro = os.cb.getIsPro?.() ?? false;
      if (isCartridgeProLocked(found.id, isPro)) {
        os.pushTermLines([`LOCKED: ${found.title} REQUIRES PRO!`, 'TYPE "pro" TO UPGRADE.']);
        return 'die';
      }
      os.pushTermLines([`BOOTING ${found.title}...`]);
      os.cb.onLaunchGame(found);
      return 'powerup';
    }
    os.pushTermLines([`open: "${arg}" not found in /carts`]);
    return 'die';
  }

  if (bin === 'randgame') {
    const isPro = os.cb.getIsPro?.() ?? false;
    const pool = isPro ? carts : carts.filter((c) => !isCartridgeProLocked(c.id, false));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) os.cb.onLaunchGame(pick);
    return 'powerup';
  }

  if (bin === 'ringtones' || bin === 'ringtone' || bin === 'tones') {
    if (arg) {
      const q = arg.toLowerCase();
      const idx = os.songs.findIndex((s) => s.title.toLowerCase().includes(q));
      if (idx >= 0) {
        os.ringtoneIdx = idx;
        const s = os.songs[idx];
        RetroAudioEngine.playNokiaMelody(s.notes, s.bpm);
        os.pushTermLines([`ACTIVE RINGTONE SET TO: ${s.title.trim()}`]);
        return 'score';
      }
    }
    os.pushTermLines([
      `ACTIVE RING: ${os.songs[os.ringtoneIdx]?.title.trim()}`,
      '3310 RINGTONES: nokia, kick, hurdy,',
      'espagnole, badinerie, valkyries, tell,',
      'city, groovy, tetris, mario, star, axel,',
      'mission, pacman, custom (use "play <name>")',
    ]);
    return 'score';
  }

  if (bin === 'play') {
    const q = (arg || 'nokia').toLowerCase();
    if (q === 'sms') {
      RetroAudioEngine.playNokiaSmsTone();
      os.pushTermLines(['PLAYING NOKIA 3310 MORSE SMS TONE...']);
      return 'score';
    }
    const song =
      os.songs.find((s) => s.title.toLowerCase().includes(q)) || os.songs[0];
    RetroAudioEngine.playNokiaMelody(song.notes, song.bpm);
    os.pushTermLines([`PLAYING: ${song.title} (${song.bpm} BPM)`]);
    return 'score';
  }

  if (bin === 'stop') {
    RetroAudioEngine.stopNokiaMelody();
    os.pushTermLines(['AUDIO STOPPED.']);
    return 'hit';
  }

  if (bin === 'theme' || bin === 'palette') {
    os.cb.onCyclePalette();
    os.pushTermLines([`THEME SWITCHED.`]);
    return 'powerup';
  }

  if (bin === 'wallpaper' || bin === 'wall' || bin === 'wp') {
    const q = arg.trim().toLowerCase();
    if (!q) {
      os.openWallpaperGallery();
      os.pushTermLines(['OPENING 20-SCENE PIXEL WALLPAPER GALLERY...']);
      return 'score';
    }
    if (q === 'off' || q === 'none' || q === 'clear') {
      os.setWallpaperById('none');
      os.pushTermLines(['WALLPAPER CLEARED (SOLID LCD).']);
      return 'hit';
    }
    const num = parseInt(q, 10);
    const match =
      !isNaN(num) && num >= 1 && num <= REAL_POSTCARDS.length
        ? REAL_POSTCARDS[num - 1]
        : REAL_POSTCARDS.find(
            (p) => p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
          );
    if (match) {
      os.setWallpaperById(match.id);
      os.pushTermLines([`WALLPAPER SET: ${match.title} (${REAL_POSTCARDS.length} SCENES)`]);
      return 'powerup';
    }
    os.pushTermLines(['usage: wallpaper <1..20 | tokyo | cyber | off>']);
    return 'die';
  }

  if (bin === 'pro' || bin === 'buy') {
    os.app = 'pro';
    os.proIdx = 0;
    os.proStatusMsg = '';
    os.cb.onRequestKeyboard?.(false);
    return 'powerup';
  }

  if (bin === 'revokepro' || bin === 'resetpro' || bin === 'unpro') {
    os.cb.onResetProDebug?.().then(() => {
      os.pushTermLines(['PRO STATUS REVOKED (DEBUG OK).']);
    });
    os.pushTermLines(['REVOKING PRO STATUS...']);
    return 'die';
  }

  if (bin === 'failsms' || bin === 'testfailsms') {
    os.triggerPurchaseFailedSms('TEST ERROR: INSUFFICIENT FUNDS');
    os.pushTermLines(['SENT TEST FAILED PURCHASE SMS TO 3310!']);
    return 'die';
  }

  if (bin === 'prosms' || bin === 'winsms') {
    os.triggerPurchaseSuccessSms('LIFETIME');
    os.pushTermLines(['SENT WELCOME PRO SMS TO 3310!']);
    return 'powerup';
  }

  if (bin === 'livesms') {
    os.markUserInteraction();
    os.pushTermLines([arg ? `SIMULATING SMS (${arg.toUpperCase()})...` : 'SIMULATING AUTONOMOUS SMS...']);
    os.triggerLivePersonaSms(arg || undefined);
    return 'score';
  }

  if (bin === 'lock') {
    os.keyLocked = true;
    os.unlockStage = false;
    return 'score';
  }

  if (bin === 'exit') {
    os.app = 'desktop';
    os.cb.onRequestKeyboard?.(false);
    return 'hit';
  }

  if (
    bin === 'format' ||
    bin === 'fdisk' ||
    bin === 'mkfs' ||
    (bin === 'rm' && arg.toLowerCase().includes('-rf')) ||
    (bin === 'sudo' && arg.toLowerCase().includes('rm'))
  ) {
    const q = arg.toLowerCase();
    const presetIdx =
      q.includes('7370') || q.includes('3310') || q.includes('dos')
        ? 2
        : q.includes('xp')
        ? 1
        : 0;
    os.pushTermLines(['MOUNTING FORMAT UTILITY [SIMULATION]...']);
    openFormatSimulator(os, presetIdx, false);
    return 'explode';
  }

  if (bin === 'win98' || bin === 'winxp') {
    const style = bin === 'winxp' ? 'winxp' : 'win98';
    activatePostFormatWinTheme(os, style, 45);
    os.pushTermLines([`ACTIVATED ${style.toUpperCase()} THEME (45s TRIAL)!`]);
    return 'powerup';
  }

  if (bin === 'reboot') {
    os.app = 'boot';
    os.bootTimer = 0;
    os.cb.onRequestKeyboard?.(false);
    return 'powerup';
  }

  if (bin === 'contacts' || bin === 'phonebook') {
    os.app = 'contacts';
    os.cb.onRequestKeyboard?.(false);
    return 'score';
  }

  if (bin === 'wap' || bin === 'curl') {
    const targetUrl = arg.trim() || 'https://www.metaframelabs.space/';
    os.app = 'wap';
    os.fetchWapPage(targetUrl);
    return 'powerup';
  }

  if (bin === 'stats') {
    os.app = 'stats';
    return 'score';
  }

  if (bin === 'ai' || bin === 'ask') {
    if (!arg) {
      os.pushTermLines(['usage: ai <your question>']);
      return 'hit';
    }
    os.pushTermLines([`[${meta.shortName} THINKING...]`]);
    callBYOKAIChat([{ role: 'user', content: arg }], os.byokConfig)
      .then((reply) => {
        const lines = wrapTextLines(`AI> ${reply}`, 34);
        os.pushTermLines(lines);
        os.cb.onPlaySound?.('powerup');
      })
      .catch((err: any) => {
        os.pushTermLines([
          `ERR> ${(err?.message || 'API ERROR').toUpperCase().slice(0, 32)}`,
        ]);
        os.cb.onPlaySound?.('die');
      });
    return 'shoot';
  }

  os.pushTermLines([`rdsh: ${bin}: command not found (try "help")`]);
  return 'die';
}
