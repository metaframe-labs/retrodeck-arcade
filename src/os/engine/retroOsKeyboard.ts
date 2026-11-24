import { getProviderMeta, saveBYOKConfig } from '../../services/byokAiService';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { DEFAULT_CUSTOM_TUNES, NOKIA_SONGS, REAL_POSTCARDS, POSTCARD_STAMPS } from '../retroOsData';
import { tKbd, tOs, type KeyboardStringKey } from '../../i18n/retroI18n';
import type { RetroDeckOS } from '../RetroDeckOS';

const APP_HINT_KEYS: Record<string, KeyboardStringKey> = {
  boot: 'hintBoot',
  desktop: 'hintDesktop',
  arcade: 'hintArcade',
  radio: 'hintRadio',
  wap: 'hintWap',
  calc: 'hintCalc',
  clock: 'hintClock',
  synth: 'hintSynth',
  phone: 'hintPhone',
  contacts: 'hintContacts',
  sms: 'hintSms',
  profiles: 'hintProfiles',
  paint: 'hintPaint',
  weather: 'hintWeather',
  notes: 'hintNotes',
  stats: 'hintStats',
  term: 'hintTerm',
  setup: 'hintSetup',
  themes: 'hintThemes',
  pro: 'hintPro',
};

export function getControlsHintImpl(os: RetroDeckOS): string {
  if (os.keyLocked) {
    return tKbd(os.unlockStage ? 'hintLockedStage' : 'hintLocked', os.lang);
  }
  if (os.app === 'ai') {
    return tKbd(os.aiTab === 'chat' ? 'hintAiChat' : 'hintAiByok', os.lang);
  }
  return tKbd(APP_HINT_KEYS[os.app] || 'hintDefault', os.lang);
}

export function getKeyboardBindingImpl(os: RetroDeckOS): {
  targetLabel: string;
  value: string;
  placeholder: string;
  secure: boolean;
} {
  const L = os.lang;
  if (os.app === 'wap') {
    return {
      targetLabel: tKbd('lblWap', L),
      value: os.wapUrl,
      placeholder: tKbd('phWap', L),
      secure: false,
    };
  }
  if (os.app === 'term') {
    return {
      targetLabel: tKbd('lblTerm', { cwd: os.termCwd }, L),
      value: os.termInput,
      placeholder: tKbd('phTerm', L),
      secure: false,
    };
  }
  if (os.app === 'weather') {
    return {
      targetLabel: tKbd('lblWeather', L),
      value: os.weatherQuery,
      placeholder: tKbd('phWeather', L),
      secure: false,
    };
  }
  if (os.app === 'notes') {
    return {
      targetLabel: tKbd('lblNote', L),
      value: os.noteDraft,
      placeholder: tKbd('phNote', L),
      secure: false,
    };
  }
  if (os.app === 'synth') {
    return {
      targetLabel: tKbd('lblTune', L),
      value: os.tuneNameDraft,
      placeholder: tKbd('phTune', L),
      secure: false,
    };
  }
  if (os.app === 'sms') {
    if (os.smsReplyTargetIdx !== null) {
      const target = os.smsList[os.smsReplyTargetIdx];
      return {
        targetLabel: tKbd('lblSmsReply', { sender: target?.sender || 'SMS' }, L).slice(0, 14),
        value: os.smsDraftText,
        placeholder: tKbd('phSmsReply', L),
        secure: false,
      };
    }
    return {
      targetLabel: tKbd('lblPostcard', L),
      value: os.smsDraftText,
      placeholder: tKbd('phPostcard', L),
      secure: false,
    };
  }
  if (os.app === 'contacts') {
    if (os.smsContactTarget) {
      return {
        targetLabel: tKbd('lblSmsReply', { sender: os.smsContactTarget.name }, L).slice(0, 14),
        value: os.smsDraftText,
        placeholder: tKbd('phSmsReply', L),
        secure: false,
      };
    }
    return {
      targetLabel: tKbd('lblNewContact', L),
      value: os.contactDraft,
      placeholder: tKbd('phNewContact', L),
      secure: false,
    };
  }
  const pid = os.byokConfig.activeProvider;
  const meta = getProviderMeta(pid);
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'key') {
    return {
      targetLabel: tKbd('lblKey', { name: meta.shortName }, L),
      value: os.byokConfig.keys[pid] || '',
      placeholder: meta.keyPlaceholder || tKbd('phKeyDefault', L),
      secure: false,
    };
  }
  if (os.app === 'ai' && os.aiTab === 'byok' && os.kbdTarget === 'model') {
    return {
      targetLabel: tKbd('lblModel', { name: meta.shortName }, L),
      value: os.byokConfig.models[pid] ?? meta.defaultModel,
      placeholder: meta.defaultModel,
      secure: false,
    };
  }
  return {
    targetLabel: tKbd('lblAi', L),
    value: os.aiPrompt,
    placeholder: tKbd('phAi', L),
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
  if (os.app === 'contacts') {
    if (os.smsContactTarget) {
      os.smsDraftText = next.slice(0, 120);
      return;
    }
    os.contactDraft = next.slice(0, 40);
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
        os.smsBanner = tOs('smsSentTo', { sender: target.sender }, os.lang);
        os.smsBannerTimer = 3.0;
        os.cb.onPlaySound?.('score');
        os.triggerLivePersonaSms(target.personaId, replyText);
      }
      return;
    }
    os.smsMode = 'compose';
    return;
  }
  if (os.app === 'contacts') {
    os.cb.onRequestKeyboard?.(false);
    if (os.smsContactTarget) {
      const target = os.smsContactTarget;
      const msgText = os.smsDraftText.trim();
      os.smsDraftText = '';
      os.smsContactTarget = null;
      if (msgText) {
        os.smsBanner = tOs('smsSentTo', { sender: target.name }, os.lang);
        os.smsBannerTimer = 3.0;
        os.cb.onPlaySound?.('score');
        if (target.personaId) {
          os.triggerLivePersonaSms(target.personaId, msgText);
        } else {
          os.triggerLivePersonaSms(`custom_${target.id}`, msgText, target);
        }
      }
      return;
    }
    const raw = os.contactDraft.trim();
    os.contactDraft = '';
    if (raw.length > 0) {
      const numMatch = raw.match(/([+*#\d][\d\s-]{2,})$/);
      const number = numMatch
        ? numMatch[1].trim()
        : `555-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const name = (numMatch ? raw.slice(0, numMatch.index).trim() : raw)
        .replace(/[,|]+$/, '')
        .trim()
        .toUpperCase()
        .slice(0, 16) || 'NEW CONTACT';
      os.customContacts = [
        {
          id: String(Date.now()),
          name,
          number,
          tag: 'CUSTOM',
          isCustom: true,
        },
        ...os.customContacts,
      ];
      os.contactIdx = 0;
      os.contactDeleteConfirm = false;
      os.saveCustomContacts();
      os.smsBanner = tOs('contactsAddedBanner', { name }, os.lang);
      os.smsBannerTimer = 2.5;
      os.cb.onPlaySound?.('powerup');
    }
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
