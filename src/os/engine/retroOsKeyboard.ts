import { getProviderMeta, saveBYOKConfig } from '../../services/byokAiService';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { DEFAULT_CUSTOM_TUNES, NOKIA_SONGS, REAL_POSTCARDS, POSTCARD_STAMPS } from '../retroOsData';
import type { RetroDeckOS } from '../RetroDeckOS';

export function getControlsHintImpl(os: RetroDeckOS): string {
  if (os.keyLocked) {
    return os.unlockStage
      ? 'NOW PRESS [▲] (STAR *) TO UNLOCK KEYGUARD!'
      : 'KEYGUARD ACTIVE • PRESS [A] THEN [▲] (*) TO UNLOCK';
  }
  switch (os.app) {
    case 'boot':
      return 'Booting RetroDeck OS... Press [A] to skip';
    case 'desktop':
      return 'D-PAD: Select Icon • [A]: Open • KBD: Keyboard';
    case 'arcade':
      return '[▲]/[▼]: Browse 100 Games • [A]: Launch • [B]: Desktop';
    case 'radio':
      return '[◀]/[▶]: Tune Station • [A]: Play/Stop • [▲]/[▼]: Vol • [B]: Desktop';
    case 'ai':
      return os.aiTab === 'chat'
        ? '[▲]/[▼]: Scroll • [A]: Type • [◀]x2: Clear • [▶]: BYOK'
        : '[▲]/[▼]: Select • [◀]/[▶]: Provider • [A]: Edit Key/Model';
    case 'wap':
      return '[▲]/[▼]: Scroll Page • [◀]/[▶]: Bookmarks • [A]: Type URL / Go';
    case 'calc':
      return 'D-PAD: Key • [A]: Press • [B]: Exit';
    case 'clock':
      return '[◀]/[▶]: Stopwatch/Timer • [A]: Start/Stop • [▲]/[▼]: Set/Reset';
    case 'synth':
      return 'D-PAD: Select Note/Play • [A]: Play/Add Note • [B]: Exit';
    case 'phone':
      return 'D-PAD: Keypad • [A]: Dial (*#0000# / LOCK) • [B]: Exit';
    case 'sms':
      return '[◀]/[▶]: Read • [▼]x2 or DEL: Delete • [A]: AI Reply';
    case 'profiles':
      return '[▲]/[▼]: Select • [A]: Profile / Lock Keys / Torch • [B]: Exit';
    case 'paint':
      return 'D-PAD: Cursor • [A]: Draw/Erase • [* / #]: Art Presets • [B]: Desktop';
    case 'weather':
      return '[◀]/[▶]: City • [▲]/[▼]: Refresh • [A]: Search City • [B]: Desktop';
    case 'notes':
      return '[▲]/[▼]: Browse Notes • [A]: New Note • [▶]x2: Delete • [B]: Desktop';
    case 'stats':
      return 'Viewing Arcade High Scores & Rank • [B]: Desktop';
    case 'term':
      return '[A]: Run / Open KBD • [◀]/[▶]: History • [▲]/[▼]: Scroll • [B]: Exit';
    case 'setup':
      return '[▲]/[▼]: Setting • [A]: Open/Toggle • [B]: Desktop';
    case 'themes':
      return '[▲]/[▼]: Browse Themes • [◀]/[▶]: ±5 • [A]: Apply • [B]: Back';
    case 'pro':
      return '[▲]/[▼]: Select Plan • [A]: Purchase / Restore • [B]: Back';
    default:
      return 'D-PAD: Navigate • [A]: Select • [B]: Back';
  }
}

export function getKeyboardBindingImpl(os: RetroDeckOS): {
  targetLabel: string;
  value: string;
  placeholder: string;
  secure: boolean;
} {
  if (os.app === 'wap') {
    return {
      targetLabel: 'WAP URL',
      value: os.wapUrl,
      placeholder: 'https://www.metaframelabs.space/',
      secure: false,
    };
  }
  if (os.app === 'term') {
    return {
      targetLabel: `RDSH ${os.termCwd}$`,
      value: os.termInput,
      placeholder: 'help, ls, neofetch, open snake, ai ...',
      secure: false,
    };
  }
  if (os.app === 'weather') {
    return {
      targetLabel: 'WEATHER CITY',
      value: os.weatherQuery,
      placeholder: 'Istanbul, Tokyo, London...',
      secure: false,
    };
  }
  if (os.app === 'notes') {
    return {
      targetLabel: 'NEW NOTE',
      value: os.noteDraft,
      placeholder: 'TYPE YOUR PIXEL NOTE...',
      secure: false,
    };
  }
  if (os.app === 'synth') {
    return {
      targetLabel: 'TUNE NAME',
      value: os.tuneNameDraft,
      placeholder: 'MY TUNE NAME...',
      secure: false,
    };
  }
  if (os.app === 'sms') {
    if (os.smsReplyTargetIdx !== null) {
      const target = os.smsList[os.smsReplyTargetIdx];
      return {
        targetLabel: `REPLY ${target?.sender || 'SMS'}`.slice(0, 14),
        value: os.smsDraftText,
        placeholder: 'TYPE YOUR REPLY...',
        secure: false,
      };
    }
    return {
      targetLabel: 'POSTCARD MSG',
      value: os.smsDraftText,
      placeholder: 'WRITE POSTCARD MESSAGE...',
      secure: false,
    };
  }
  const pid = os.byokConfig.activeProvider;
  const meta = getProviderMeta(pid);
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'key') {
    return {
      targetLabel: `${meta.shortName} KEY`,
      value: os.byokConfig.keys[pid] || '',
      placeholder: meta.keyPlaceholder || 'PASTE API KEY...',
      secure: false,
    };
  }
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'model') {
    return {
      targetLabel: `${meta.shortName} MDL`,
      value: os.byokConfig.models[pid] ?? meta.defaultModel,
      placeholder: meta.defaultModel,
      secure: false,
    };
  }
  return {
    targetLabel: 'AI PROMPT',
    value: os.aiPrompt,
    placeholder: 'ASK RETRODECK AI...',
    secure: false,
  };
}

export function setKeyboardTextImpl(os: RetroDeckOS, next: string) {
  os.idleTimer = 0;
  if (os.app === 'wap') {
    os.wapUrl = next;
    return;
  }
  if (os.app === 'term') {
    os.termInput = next;
    return;
  }
  if (os.app === 'weather') {
    os.weatherQuery = next;
    return;
  }
  if (os.app === 'notes') {
    os.noteDraft = next;
    return;
  }
  if (os.app === 'synth') {
    os.tuneNameDraft = next.toUpperCase().slice(0, 14);
    return;
  }
  if (os.app === 'sms') {
    if (os.smsReplyTargetIdx !== null) {
      os.smsDraftText = next.slice(0, 120);
      return;
    }
    os.smsDraftText = next.toUpperCase().slice(0, 82);
    if (os.smsMode !== 'compose') os.smsMode = 'compose';
    return;
  }
  const pid = os.byokConfig.activeProvider;
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'key') {
    os.byokConfig = {
      ...os.byokConfig,
      keys: { ...os.byokConfig.keys, [pid]: next },
    };
    saveBYOKConfig(os.byokConfig);
    return;
  }
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'model') {
    os.byokConfig = {
      ...os.byokConfig,
      models: { ...os.byokConfig.models, [pid]: next },
    };
    saveBYOKConfig(os.byokConfig);
    return;
  }
  os.aiPrompt = next;
  if (os.app !== 'ai') {
    os.app = 'ai';
    os.aiTab = 'chat';
  }
}

export function submitKeyboardImpl(os: RetroDeckOS) {
  os.idleTimer = 0;
  if (os.app === 'wap') {
    os.cb.onRequestKeyboard?.(false);
    os.fetchWapPage(os.wapUrl);
    return;
  }
  if (os.app === 'term') {
    const cmd = os.termInput.trim() || 'help';
    os.termInput = '';
    const s = os.execTermCmd(cmd);
    os.cb.onPlaySound?.(s);
    return;
  }
  if (os.app === 'weather') {
    os.cb.onRequestKeyboard?.(false);
    os.fetchWeather(os.weatherQuery);
    return;
  }
  if (os.app === 'notes') {
    const text = os.noteDraft.trim();
    if (text.length > 0) {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      os.notes = [
        { id: String(Date.now()), text, ts: `${hh}:${mm}` },
        ...os.notes.slice(0, 29),
      ];
      os.noteIdx = 0;
      os.noteDeleteConfirm = false;
      os.saveNotes();
      os.cb.onPlaySound?.('score');
    }
    os.noteDraft = '';
    os.cb.onRequestKeyboard?.(false);
    return;
  }
  if (os.app === 'synth') {
    const targetIdx = os.synthMode === 'list' ? os.synthListIdx : os.songIdx;
    if (os.isCustomTune(targetIdx)) {
      const clean = os.tuneNameDraft.trim().toUpperCase().slice(0, 14);
      const fallback = DEFAULT_CUSTOM_TUNES[targetIdx - NOKIA_SONGS.length]?.title || 'MY TUNE';
      os.songs[targetIdx].title = clean || fallback;
      os.saveCustomTunes();
      os.cb.onPlaySound?.('powerup');
    }
    os.tuneNameDraft = '';
    os.cb.onRequestKeyboard?.(false);
    return;
  }
  if (os.app === 'sms') {
    os.cb.onRequestKeyboard?.(false);
    if (os.smsReplyTargetIdx !== null) {
      const target = os.smsList[os.smsReplyTargetIdx];
      const replyText = os.smsDraftText.trim();
      os.smsDraftText = '';
      os.smsReplyTargetIdx = null;
      if (replyText && target?.personaId) {
        os.smsBanner = `SENT TO ${target.sender}!`;
        os.smsBannerTimer = 3.0;
        os.cb.onPlaySound?.('score');
        os.triggerLivePersonaSms(target.personaId, replyText);
      }
      return;
    }
    os.smsMode = 'compose';
    return;
  }
  if (os.app === 'ai' && os.aiTab === 'byok') {
    saveBYOKConfig(os.byokConfig);
    os.aiStatus = 'SAVED!';
    os.cb.onPlaySound?.('score');
    os.cb.onRequestKeyboard?.(false);
    return;
  }
  if (os.app !== 'ai') {
    os.app = 'ai';
    os.aiTab = 'chat';
  }
  os.sendAiMessage();
}
