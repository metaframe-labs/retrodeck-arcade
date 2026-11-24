import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTE_ORDER, RETRO_PALETTES, isPaletteProLocked } from '../../theme/palettes';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { somaRadioService, SOMA_CHANNELS } from '../../services/somaRadioService';
import {
  BYOKChatMessage,
  callBYOKAIChat,
  getProviderMeta,
  getProviderModel,
} from '../../services/byokAiService';
import {
  ALL_PIC_ART_KEYS,
  DYNAMIC_MOODS_BY_LANG,
  LIVE_SMS_PERSONAS_BY_LANG,
  NOKIA_SMS_TONES,
  OsAppId,
  PicArtKey,
  RetroContact,
  UNEXPECTED_TWISTS_BY_LANG,
  WEATHER_CITY_STORAGE_KEY,
  parseHtmlToWapLines,
  stripEmojis,
  stripMarkdownForLcd,
} from '../retroOsData';
import { pickLang, tOs } from '../../i18n/retroI18n';
import type { RetroDeckOS } from '../RetroDeckOS';

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function isSmsTooSimilar(candidate: string, previousTexts: string[]): boolean {
  const cleanCand = candidate.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!cleanCand) return true;
  const candWords = normalizeWords(cleanCand);

  for (const prev of previousTexts) {
    const cleanPrev = prev.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!cleanPrev) continue;
    if (cleanCand === cleanPrev) return true;
    if (cleanCand.length >= 20 && cleanPrev.length >= 20) {
      if (cleanCand.includes(cleanPrev) || cleanPrev.includes(cleanCand)) return true;
    }
    const prevWords = normalizeWords(cleanPrev);
    if (candWords.size >= 3 && prevWords.size >= 3) {
      let overlap = 0;
      candWords.forEach((w) => {
        if (prevWords.has(w)) overlap++;
      });
      const union = candWords.size + prevWords.size - overlap;
      if (union > 0 && overlap / union >= 0.55) return true;
    }
  }
  return false;
}

export async function triggerLivePersonaSmsImpl(
  os: RetroDeckOS,
  forcedPersonaId?: string,
  userReply?: string,
  customContact?: RetroContact,
  replyingToText?: string
): Promise<boolean> {
  if (os.liveSmsFetching) return false;
  const meta = getProviderMeta(os.byokConfig.activeProvider);
  const hasKey =
    !meta.requiresKey || Boolean(os.byokConfig.keys[os.byokConfig.activeProvider]?.trim());
  if (!hasKey) return false;

  const lang = os.lang;
  const personas = LIVE_SMS_PERSONAS_BY_LANG[lang] || LIVE_SMS_PERSONAS_BY_LANG.en;
  const moods = DYNAMIC_MOODS_BY_LANG[lang] || DYNAMIC_MOODS_BY_LANG.en;
  const twists = UNEXPECTED_TWISTS_BY_LANG[lang] || UNEXPECTED_TWISTS_BY_LANG.en;

  // Avoid picking the same random persona twice in a row
  const lastLivePersonaId = os.smsList.find((m) => m.isLivePersona)?.personaId;
  const pool =
    !forcedPersonaId && personas.length > 1 && lastLivePersonaId
      ? personas.filter((p) => p.id !== lastLivePersonaId)
      : personas;

  const persona = customContact
    ? {
        id: forcedPersonaId || `custom_${customContact.id}`,
        sender: customContact.name,
        tag: customContact.tag || 'SMS',
        instruction: pickLang(
          lang,
          `You are "${customContact.name}" (phone ${customContact.number}), saved in the user's RetroDeck contacts. Reply naturally and warmly as this real contact in English.`,
          `Sen kullanicinin telefon rehberinde kayitli "${customContact.name}" (${customContact.number}) isimli kisisin. Bu kisiye yakisan dogal ve samimi bir Turkce SMS cevabi yaz.`
        ),
        fallback: pickLang(
          lang,
          `hey just got your text! talk soon - ${customContact.name}`,
          `selam mesajini simdi gordum, musait olunca donerim!`
        ),
      }
    : (forcedPersonaId ? personas.find((p) => p.id === forcedPersonaId) : null) ||
      pool[Math.floor(Math.random() * pool.length)];

  os.liveSmsFetching = true;
  try {
    // Reconstruct memory from personaHistories, backfilling from inbox SMS if missing
    let history = [...(os.personaHistories[persona.id] || [])];
    if (history.length === 0) {
      const inboxForPersona = os.smsList
        .filter((m) => m.isLivePersona && m.personaId === persona.id)
        .slice(0, 5)
        .reverse();
      history = inboxForPersona.map((m) => ({ role: 'assistant' as const, content: m.text }));
    }
    if (
      replyingToText &&
      !history.some((h) => h.role === 'assistant' && h.content.trim() === replyingToText.trim())
    ) {
      history.push({ role: 'assistant', content: replyingToText.trim() });
    }

    const previousBotTexts = Array.from(
      new Set(
        [
          ...(replyingToText ? [replyingToText.trim()] : []),
          ...history.filter((h) => h.role === 'assistant').map((h) => h.content),
        ].filter(Boolean)
      )
    ).slice(-6);

    const mood = moods[Math.floor(Math.random() * moods.length)];
    const isUnexpected = !userReply && Math.random() < 0.35;
    const twist = isUnexpected
      ? pickLang(
          lang,
          `\nEXTRA SITUATION: ${twists[Math.floor(Math.random() * twists.length)]}`,
          `\nEKSTRA DURUM: ${twists[Math.floor(Math.random() * twists.length)]}`
        )
      : '';

    const forbiddenBlock =
      previousBotTexts.length > 0
        ? pickLang(
            lang,
            `\n\nYOUR PREVIOUS SENT MESSAGES (STRICTLY DO NOT REPEAT OR PARAPHRASE THESE — CONTINUE THE STORY OR MOVE TO A NEW SITUATION):\n${previousBotTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`,
            `\n\nDAHA ONCE ATTIGIN MESAJLAR (BUNLARI ASLA TEKRARLAMA VE AYNI SEYI BASKA KELIMELERLE YAZMA — HIKAYEYI DEVAM ETTIR VEYA YENI KONU AC):\n${previousBotTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`
          )
        : '';

    const systemPrompt = pickLang(
      lang,
      `${persona.instruction}\n` +
        `CURRENT MOOD / VIBE: ${mood}.${twist}\n` +
        `CURRENT TIME: ${os.formatClock()}.${forbiddenBlock}\n` +
        `STRICT RULES:\n` +
        `1) Write ONE realistic SMS strictly in English (25 to 125 chars).\n` +
        `2) Progress from what you previously texted — acknowledge earlier context naturally OR bring up a totally fresh moment/event.\n` +
        `3) NEVER repeat openings, jokes, numbers, or phrasing from your previous messages.\n` +
        `4) Plain text only: NO emojis, NO quotes around output, NEVER mention AI.`,
      `${persona.instruction}\n` +
        `SU ANKI RUH HALIN / KISILIGIN: ${mood}.${twist}\n` +
        `SAAT: ${os.formatClock()}.${forbiddenBlock}\n` +
        `KESIN KURALLAR:\n` +
        `1) En az 25, en fazla 125 karakterlik tek bir gercekci Turkce SMS yaz.\n` +
        `2) Onceki mesajlarina bagli kalarak olayi devam ettir YA DA tamamen farkli, yeni bir gelisme yaz.\n` +
        `3) Onceki attigin mesajlarla ayni girisi, espriyi veya cumle yapisini ASLA tekrarlama.\n` +
        `4) Sadece duz metin: emoji yok, tirnak yok, yapay zeka oldugunu asla belli etme.`
    );

    const buildUserTurn = (extraGuard = ''): BYOKChatMessage[] => {
      const threadLog = history
        .slice(-10)
        .map((h) => `${h.role === 'assistant' ? persona.sender : 'USER'}: "${h.content}"`)
        .join('\n');
      const logSection = threadLog
        ? `[RECENT SMS THREAD]\n${threadLog}\n\n`
        : '';

      const promptText = userReply
        ? pickLang(
            lang,
            `${logSection}TASK: The user just replied to ${replyingToText ? `your message "${replyingToText}"` : 'you'} with: "${userReply}".\n` +
              `Write your direct NEXT SMS response reacting specifically to "${userReply}". Never repeat or copy your earlier SMS above.${extraGuard}`,
            `${logSection}GOREV: Kullanici az once ${replyingToText ? `"${replyingToText}" mesajina` : 'sana'} su cevabi yazdi: "${userReply}".\n` +
              `Kullanicinin yazdigi "${userReply}" cevabina dogrudan karsilik veren YENI bir SMS yaz. Yukaridaki eski mesajini asla tekrar etme.${extraGuard}`
          )
        : history.length > 0
        ? pickLang(
            lang,
            `${logSection}TASK: Based on your previous messages above, write the NEXT follow-up or a fresh topic SMS right now (completely different from previous lines).${extraGuard}`,
            `${logSection}GOREV: Yukarida daha once attigin mesajlara gore simdi SIRADAKI devam mesajini ya da tamamen yeni bir konuyu yaz (eski mesajlari tekrarlama).${extraGuard}`
          )
        : pickLang(
            lang,
            `TASK: Send a spontaneous, natural first SMS message right now.${extraGuard}`,
            `GOREV: Bana simdi dogal, samimi ilk SMS mesajini gonder.${extraGuard}`
          );

      return [{ role: 'user', content: promptText }];
    };

    const parseReply = (raw: string) =>
      stripMarkdownForLcd(raw)
        .replace(/^["']|["']$/g, '')
        .replace(/^(?:USER|ME|ASSISTANT|BOT):\s*/i, '')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, 130);

    const recentGlobalTexts = [
      ...previousBotTexts,
      ...os.smsList.slice(0, 6).map((m) => m.text),
    ];

    let cleaned = parseReply(
      await callBYOKAIChat(buildUserTurn(), os.byokConfig, systemPrompt, {
        temperature: 0.9,
        maxTokens: 140,
      })
    );

    // Retry once if empty or too similar to previously sent SMS
    if (!cleaned || cleaned.length < 8 || isSmsTooSimilar(cleaned, recentGlobalTexts)) {
      const retryGuard = pickLang(
        lang,
        ' IMPORTANT: Your previous draft was TOO SIMILAR to what you already sent! Acknowledge the conversation naturally with 100% NEW words and details.',
        ' ONEMLI: Onceki taslagin az onceki mesajla AYNI cikti! Tamamen YENI kelimeler ve farkli bir cumleyle cevap ver.'
      );
      const retried = parseReply(
        await callBYOKAIChat(buildUserTurn(retryGuard), os.byokConfig, systemPrompt, {
          temperature: 1.05,
          maxTokens: 140,
        })
      );
      if (retried && retried.length >= 8 && !isSmsTooSimilar(retried, previousBotTexts)) {
        cleaned = retried;
      } else if (retried && retried.length >= 8 && isSmsTooSimilar(cleaned, previousBotTexts)) {
        cleaned = retried;
      }
    }

    if (!cleaned || cleaned.length < 8 || isSmsTooSimilar(cleaned, previousBotTexts)) {
      if (userReply) {
        const snippet = userReply.slice(0, 32);
        cleaned = pickLang(
          lang,
          `Got your text ("${snippet}")! Catching up on that now, talk in a bit.`,
          `Tamamdir mesajini aldim ("${snippet}"), ona gore hallediyorum!`
        );
      } else {
        cleaned = !isSmsTooSimilar(persona.fallback, previousBotTexts)
          ? persona.fallback
          : pickLang(
              lang,
              `Quick update from ${persona.sender} at ${os.formatClock()} - still around?`,
              `${persona.sender} saat ${os.formatClock()} itibariyla tekrar yaziyor, musait misin?`
            );
      }
    }

    // Persist expanded conversation memory per persona (up to 12 turns)
    const nextHistory = [...history];
    if (userReply) {
      nextHistory.push({ role: 'user', content: userReply });
    }
    nextHistory.push({ role: 'assistant', content: cleaned });
    os.personaHistories[persona.id] = nextHistory.slice(-12);
    os.savePersonaHistories();

    os.smsList.unshift({
      sender: persona.sender,
      title: persona.tag,
      text: cleaned,
      artKey: 'SMILE',
      isLivePersona: true,
      personaId: persona.id,
      timestamp: os.formatClock(),
      mood: isUnexpected ? pickLang(lang, 'SURPRISE', 'SURPRIZ') : mood.split(' ')[0],
    });
    if (os.smsList.length > 25) os.smsList.pop();
    os.smsIdx = 0;
    os.smsBanner = `✉ ${tOs('smsNewBanner', lang)}: ${persona.sender}`;
    os.smsBannerTimer = 4.5;
    if (os.app !== 'sms' || os.keyLocked) os.unreadSmsCount += 1;
    os.saveSmsList();
    os.playActiveSmsTone();
    return true;
  } catch {
    return false;
  } finally {
    os.liveSmsFetching = false;
  }
}

export function executeAiActionsImpl(os: RetroDeckOS, rawReply: string): { displayText: string; actionLogs: string[] } {
  const actionLogs: string[] = [];
  const regex = /\[\[ACTION:([A-Z_]+)(?:\|([^\]]*))?\]\]/gi;
  const matches = Array.from(rawReply.matchAll(regex));
  const displayText = rawReply.replace(regex, '').replace(/\n{3,}/g, '\n\n').trim();

  const isPro = os.cb.getIsPro?.() ?? false;
  const carts = os.cb.getCartridges();

  for (const m of matches) {
    const cmd = (m[1] || '').toUpperCase();
    const arg = (m[2] || '').trim();

    if (cmd === 'OPEN_APP') {
      const target = arg.toLowerCase() as OsAppId;
      const validApps: OsAppId[] = [
        'desktop', 'arcade', 'radio', 'wap', 'synth', 'phone', 'contacts', 'sms',
        'profiles', 'calc', 'clock', 'paint', 'weather', 'notes',
        'stats', 'term', 'setup', 'themes', 'pro',
      ];
      if (validApps.includes(target)) {
        actionLogs.push(`OPENING ${target.toUpperCase()}...`);
        setTimeout(() => {
          os.app = target;
          if (target === 'radio') somaRadioService.fetchNowPlaying();
          if (target === 'themes') {
            const curId = os.cb.getPaletteId?.();
            const idx = curId ? PALETTE_ORDER.indexOf(curId) : 0;
            os.themeIdx = idx >= 0 ? idx : 0;
          }
          os.cb.onRequestKeyboard?.(false);
          os.cb.onPlaySound?.('powerup');
        }, 550);
      }
    } else if (cmd === 'PLAY_GAME') {
      const q = arg.toLowerCase();
      const found = carts.find(
        (c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      );
      if (found) {
        if (isCartridgeProLocked(found.id, isPro)) {
          actionLogs.push(`LOCKED: ${found.title} (PRO)`);
          setTimeout(() => {
            os.openProScreen('PRO REQUIRED FOR THIS GAME!');
            os.cb.onPlaySound?.('die');
          }, 550);
        } else {
          actionLogs.push(`LAUNCHING ${found.title}`);
          setTimeout(() => {
            os.cb.onRequestKeyboard?.(false);
            os.cb.onLaunchGame(found);
          }, 600);
        }
      }
    } else if (cmd === 'SET_THEME') {
      const q = arg.toLowerCase().replace(/\s+/g, '_');
      const foundId = PALETTE_ORDER.find((id) => {
        const p = RETRO_PALETTES[id];
        return id === q || id.includes(q) || p.name.toLowerCase().includes(arg.toLowerCase());
      });
      if (foundId) {
        if (isPaletteProLocked(foundId, isPro)) {
          actionLogs.push(`THEME ${RETRO_PALETTES[foundId].name} REQUIRES PRO`);
          setTimeout(() => {
            os.openProScreen('PRO REQUIRED FOR THIS THEME!');
            os.cb.onPlaySound?.('die');
          }, 550);
        } else {
          os.cb.onSelectPalette?.(foundId);
          actionLogs.push(`THEME -> ${RETRO_PALETTES[foundId].name}`);
        }
      }
    } else if (cmd === 'CYCLE_THEME') {
      os.cb.onCyclePalette();
      actionLogs.push(`THEME -> ${os.cb.getPaletteName()}`);
    } else if (cmd === 'RADIO') {
      const sub = arg.toUpperCase();
      if (sub === 'PLAY') {
        somaRadioService.playCurrentChannel();
        actionLogs.push('RADIO: PLAYING');
      } else if (sub === 'STOP') {
        somaRadioService.stop();
        actionLogs.push('RADIO: STOPPED');
      } else if (sub === 'NEXT') {
        somaRadioService.nextChannel();
        somaRadioService.playCurrentChannel();
        actionLogs.push(`RADIO -> ${somaRadioService.getChannel().name}`);
      } else if (sub === 'PREV') {
        somaRadioService.prevChannel();
        somaRadioService.playCurrentChannel();
        actionLogs.push(`RADIO -> ${somaRadioService.getChannel().name}`);
      }
    } else if (cmd === 'WEATHER') {
      const city = arg || os.weatherQuery;
      os.weatherQuery = city;
      AsyncStorage.setItem(WEATHER_CITY_STORAGE_KEY, city).catch(() => {});
      os.fetchWeather(city);
      actionLogs.push(`WEATHER -> ${city.toUpperCase()}`);
      setTimeout(() => {
        os.app = 'weather';
        os.cb.onRequestKeyboard?.(false);
      }, 550);
    } else if (cmd === 'ADD_NOTE' && arg) {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      os.notes = [{ id: String(Date.now()), text: arg, ts: `${hh}:${mm}` }, ...os.notes.slice(0, 29)];
      os.noteIdx = 0;
      os.saveNotes();
      actionLogs.push(`NOTE SAVED!`);
    } else if (cmd === 'SCANLINES') {
      const sub = arg.toUpperCase();
      const cur = os.cb.getScanlines();
      if (sub === 'TOGGLE' || (sub === 'ON' && !cur) || (sub === 'OFF' && cur)) {
        os.cb.onToggleScanlines();
        actionLogs.push(`SCANLINES: ${!cur ? 'ON' : 'OFF'}`);
      }
    } else if (cmd === 'MUTE') {
      const mute = arg.toUpperCase() === 'ON';
      RetroAudioEngine.setMuted(mute);
      actionLogs.push(`AUDIO: ${mute ? 'MUTED' : 'UNMUTED'}`);
    } else if (cmd === 'PLAY_SONG') {
      const q = arg.toLowerCase();
      const song = os.songs.find((s) => s.title.toLowerCase().includes(q)) || os.songs[0];
      if (song && song.notes) {
        RetroAudioEngine.playNokiaMelody(song.notes, song.bpm);
        actionLogs.push(`PLAYING ${song.title.trim()}`);
      }
    } else if (cmd === 'STOP_AUDIO') {
      os.melodyPlaying = false;
      RetroAudioEngine.stopNokiaMelody();
      somaRadioService.stop();
      actionLogs.push('AUDIO STOPPED');
    } else if (cmd === 'LIVE_SMS') {
      os.triggerLivePersonaSms();
      actionLogs.push('INCOMING SMS TRIGGERED');
    } else if (cmd === 'LOCK') {
      actionLogs.push('LOCKING KEYGUARD...');
      setTimeout(() => {
        os.keyLocked = true;
        os.unlockStage = false;
        os.cb.onRequestKeyboard?.(false);
      }, 550);
    } else if (cmd === 'SET_LANG') {
      const nextLang = arg.toLowerCase() === 'tr' ? 'tr' : 'en';
      os.setLang(nextLang);
      actionLogs.push(`LANGUAGE: ${nextLang.toUpperCase()}`);
    } else if (cmd === 'REBOOT') {
      actionLogs.push('REBOOTING OS...');
      setTimeout(() => {
        os.app = 'boot';
        os.bootTimer = 0;
        os.cb.onRequestKeyboard?.(false);
      }, 600);
    }
  }

  return { displayText, actionLogs };
}

export async function sendAiMessageImpl(os: RetroDeckOS) {
  const msg = os.aiPrompt.trim();
  if (!msg || os.aiLoading) return;
  if (msg.toLowerCase() === '/clear' || msg.toLowerCase() === 'clear') {
    os.aiPrompt = '';
    os.clearAiChat();
    os.cb.onPlaySound?.('die');
    return;
  }
  os.aiPrompt = '';
  os.appendChatLines('YOU>', msg);
  os.chatHistory.push({ role: 'user', content: msg });
  if (os.chatHistory.length > 10) {
    os.chatHistory = os.chatHistory.slice(-10);
  }

  os.aiLoading = true;
  os.aiStatus = 'THINKING...';
  os.cb.onPlaySound?.('shoot');

  try {
    const sysGuide = pickLang(
      os.lang,
      `You are the built-in AI assistant of the RetroDeck OS handheld console. You can directly control the user's device.\n` +
        `Current state: Theme=${os.cb.getPaletteName()}, Pro=${os.cb.getIsPro?.() ? 'YES' : 'NO'}, Radio=${somaRadioService.getIsPlaying() ? 'ON' : 'OFF'}, Scanlines=${os.cb.getScanlines() ? 'ON' : 'OFF'}, Lang=${os.lang.toUpperCase()}.\n` +
        `If the user asks to open an app, launch a game, change theme, toggle radio/music, add a note, check weather, change language, lock the screen, or trigger a live SMS, append the matching tag at the end of your reply:\n` +
        `[[ACTION:OPEN_APP|arcade|radio|wap|synth|phone|contacts|sms|profiles|calc|clock|paint|weather|notes|stats|term|setup|themes|pro|desktop]]\n` +
        `[[ACTION:PLAY_GAME|<game e.g. snake, tetris, pong, pac-boy, breakout, space-invaders, minesweeper, dino>]]\n` +
        `[[ACTION:SET_THEME|<theme e.g. gameboy, nokia, famicom, atomic_purple, playdate, cyberpunk, matrix, pipboy, oled>]]\n` +
        `[[ACTION:CYCLE_THEME]]\n` +
        `[[ACTION:RADIO|PLAY|STOP|NEXT|PREV]]\n` +
        `[[ACTION:WEATHER|<city>]]\n` +
        `[[ACTION:ADD_NOTE|<note text>]]\n` +
        `[[ACTION:SCANLINES|ON|OFF|TOGGLE]]\n` +
        `[[ACTION:MUTE|ON|OFF]]\n` +
        `[[ACTION:PLAY_SONG|<song name>]]\n` +
        `[[ACTION:STOP_AUDIO]]\n` +
        `[[ACTION:LIVE_SMS]]\n` +
        `[[ACTION:SET_LANG|en|tr]]\n` +
        `[[ACTION:LOCK]]\n` +
        `[[ACTION:REBOOT]]\n` +
        `Keep answers short, clear, and helpful in English. Never use emojis, plain text only. Omit ACTION tags when no control action is needed.`,
      `Sen RetroDeck OS el konsolunun dahili AI asistanisin. Kullanicinin cihazini dogrudan kontrol edebilirsin.\n` +
        `Mevcut durum: Tema=${os.cb.getPaletteName()}, Pro=${os.cb.getIsPro?.() ? 'YES' : 'NO'}, Radyo=${somaRadioService.getIsPlaying() ? 'ON' : 'OFF'}, Scanlines=${os.cb.getScanlines() ? 'ON' : 'OFF'}, Dil=${os.lang.toUpperCase()}.\n` +
        `Eger kullanici bir uygulama acmak, oyun baslatmak, tema degistirmek, radyo/muzik acmak, not eklemek, hava durumuna bakmak, dil degistirmek, ekrani kilitlemek veya canli SMS istemek gibi bir islem talep ederse cevabinin sonuna su etiketlerden uygun olani ekle:\n` +
        `[[ACTION:OPEN_APP|arcade|radio|wap|synth|phone|contacts|sms|profiles|calc|clock|paint|weather|notes|stats|term|setup|themes|pro|desktop]]\n` +
        `[[ACTION:PLAY_GAME|<oyun adi orn: snake, tetris, pong, pac-boy, breakout, space-invaders, minesweeper, dino>]]\n` +
        `[[ACTION:SET_THEME|<tema adi orn: gameboy, nokia, famicom, atomic_purple, playdate, cyberpunk, matrix, pipboy, oled>]]\n` +
        `[[ACTION:CYCLE_THEME]]\n` +
        `[[ACTION:RADIO|PLAY|STOP|NEXT|PREV]]\n` +
        `[[ACTION:WEATHER|<sehir>]]\n` +
        `[[ACTION:ADD_NOTE|<not metni>]]\n` +
        `[[ACTION:SCANLINES|ON|OFF|TOGGLE]]\n` +
        `[[ACTION:MUTE|ON|OFF]]\n` +
        `[[ACTION:PLAY_SONG|<melodi adi>]]\n` +
        `[[ACTION:STOP_AUDIO]]\n` +
        `[[ACTION:LIVE_SMS]]\n` +
        `[[ACTION:SET_LANG|en|tr]]\n` +
        `[[ACTION:LOCK]]\n` +
        `[[ACTION:REBOOT]]\n` +
        `Kisa, net ve yardimsever Turkce cevap ver. Asla emoji kullanma, sadece duz metin yaz. Islem gerekmiyorsa hic ACTION etiketi ekleme.`
    );

    const reply = await callBYOKAIChat(os.chatHistory, os.byokConfig, sysGuide, {
      temperature: 0.75,
      maxTokens: 320,
    });
    const rawClean = reply.trim() || '(EMPTY)';
    const { displayText, actionLogs } = os.executeAiActions(rawClean);
    const shown = stripEmojis(displayText) || (actionLogs.length > 0 ? 'DONE!' : '(EMPTY)');

    os.chatHistory.push({ role: 'assistant', content: shown });
    os.appendChatLines('AI>', shown);
    for (const log of actionLogs) {
      os.appendChatLines('OS>', log);
    }
    os.aiStatus = 'OK';
    os.cb.onPlaySound?.('powerup');
  } catch (err: any) {
    const errMsg = err?.message || 'API ERROR';
    os.appendChatLines('ERR>', errMsg.toUpperCase());
    os.aiStatus = 'ERR';
    os.cb.onPlaySound?.('die');
  } finally {
    os.aiLoading = false;
  }
}

export async function sendPictureSmsToAiImpl(os: RetroDeckOS) {
  if (os.smsSendingAi) return;
  const cur = os.smsList[os.smsIdx];
  if (!cur) {
    os.smsBanner = 'INBOX EMPTY!';
    os.smsBannerTimer = 2.0;
    os.cb.onPlaySound?.('hit');
    return;
  }
  const meta = getProviderMeta(os.byokConfig.activeProvider);
  const hasKey =
    !meta.requiresKey || Boolean(os.byokConfig.keys[os.byokConfig.activeProvider]?.trim());

  os.playActiveSmsTone();

  if (!hasKey) {
    os.smsBanner = `SENT! (ADD ${meta.shortName} KEY FOR AI REPLY)`;
    os.smsBannerTimer = 2.8;
    return;
  }

  os.smsSendingAi = true;
  os.smsBanner = `SENDING PIC-SMS TO ${meta.shortName}...`;
  os.smsBannerTimer = 10;

  try {
    const prompt = pickLang(
      os.lang,
      `You received a Nokia 3310 Picture SMS: [${cur.title}] "${cur.text}". Reply like a witty 2000s Nokia 3310 user in English (max 75 chars, plain text only, no emojis). Start your reply with one tag: [COFFEE], [SMILE], [COOL], [WINK], [HEART], [SAD], [CAT], [ALIEN], [SKULL], [MUSIC], [CAKE], or [SNAKE].`,
      `Bir Nokia 3310 Picture SMS aldin: [${cur.title}] "${cur.text}". 2000ler Nokia 3310 kullanicisi gibi esprili bir Turkce cevap yaz (en fazla 75 karakter, sadece duz metin, emoji yasak). Cevabinin basina su etiketlerden birini koy: [COFFEE], [SMILE], [COOL], [WINK], [HEART], [SAD], [CAT], [ALIEN], [SKULL], [MUSIC], [CAKE], or [SNAKE].`
    );
    const raw = await callBYOKAIChat([{ role: 'user', content: prompt }], os.byokConfig);
    const cleaned = stripMarkdownForLcd(raw).toUpperCase();

    const allKeys: PicArtKey[] = [
      'COFFEE',
      'SMILE',
      'COOL',
      'WINK',
      'HEART',
      'SAD',
      'CAT',
      'ALIEN',
      'SKULL',
      'MUSIC',
      'CAKE',
      'SNAKE',
    ];
    let artKey: PicArtKey = 'SMILE';
    for (const k of allKeys) {
      if (cleaned.includes(k)) {
        artKey = k;
        break;
      }
    }

    const body = cleaned
      .replace(/\[(COFFEE|SMILE|COOL|WINK|HEART|SAD|CAT|ALIEN|SKULL|MUSIC|CAKE|SNAKE)\]/g, '')
      .trim()
      .slice(0, 82);

    os.smsList.unshift({
      sender: `${meta.shortName}-3310`,
      title: `${meta.shortName} PIC-SMS`,
      text: body || 'HEY! LOW ON CREDITS, CALL ME BACK ON MY 3310 XD',
      artKey,
    });
    if (os.smsList.length > 20) os.smsList.pop();
    os.smsIdx = 0;
    os.smsBanner = `NEW PIC-SMS FROM ${meta.shortName}!`;
    os.smsBannerTimer = 3.0;
    os.saveSmsList();
    const smsTone = NOKIA_SMS_TONES[os.smsToneIdx] || NOKIA_SMS_TONES[0];
    RetroAudioEngine.playNokiaMelody(smsTone.notes, smsTone.bpm);
  } catch (err: any) {
    os.smsBanner = `SMS ERR: ${(err?.message || 'FAILED').slice(0, 24).toUpperCase()}`;
    os.smsBannerTimer = 3.0;
  } finally {
    os.smsSendingAi = false;
  }
}

export async function fetchWapPageImpl(os: RetroDeckOS, rawUrl: string) {
  if (os.wapLoading) return;
  let url = rawUrl.trim();
  if (!url) url = 'https://www.metaframelabs.space/';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  os.wapUrl = url;
  os.wapLoading = true;
  os.wapScroll = 0;
  os.cb.onPlaySound?.('shoot');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Nokia3330/1.0 (RetroDeckOS WAP 1.1)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });
    const text = await res.text();
    os.wapLines = parseHtmlToWapLines(text);
    os.cb.onPlaySound?.('powerup');
  } catch (err: any) {
    os.wapLines = [
      '=== WAP CONNECTION ERROR ===',
      `URL: ${url.slice(0, 28)}`,
      `ERR: ${(err?.message || 'UNREACHABLE').toUpperCase().slice(0, 28)}`,
      'CHECK URL OR TRY ANOTHER SITE.',
    ];
    os.cb.onPlaySound?.('die');
  } finally {
    os.wapLoading = false;
  }
}

export async function fetchWeatherImpl(os: RetroDeckOS, rawCity: string) {
  if (os.weatherLoading) return;
  let city = rawCity.trim() || 'Palo Alto';
  if (/^(silicon valley|silikon vadisi)$/i.test(city)) {
    city = 'Palo Alto';
  }
  os.weatherQuery = city;
  os.weatherLoading = true;
  os.weatherError = '';
  os.cb.onPlaySound?.('shoot');

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoJson = await geoRes.json();
    const loc = geoJson?.results?.[0];
    if (!loc) {
      os.weatherError = `CITY NOT FOUND: ${city.toUpperCase().slice(0, 14)}`;
      os.cb.onPlaySound?.('die');
      return;
    }

    const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;
    const fcRes = await fetch(fcUrl);
    const fcJson = await fcRes.json();
    const cur = fcJson?.current;
    const daily = fcJson?.daily;
    if (!cur || !daily) {
      os.weatherError = 'WEATHER FEED UNAVAILABLE';
      os.cb.onPlaySound?.('die');
      return;
    }

    const nextDaily: { minC: number; maxC: number; code: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      nextDaily.push({
        minC: Math.round(daily.temperature_2m_min?.[i] ?? cur.temperature_2m),
        maxC: Math.round(daily.temperature_2m_max?.[i] ?? cur.temperature_2m),
        code: Number(daily.weather_code?.[i] ?? cur.weather_code ?? 0),
      });
    }

    const regionLabel =
      String(loc.admin1 || '').toLowerCase() === 'california' ? 'CA' : '';

    os.weatherData = {
      city: String(loc.name || city).toUpperCase(),
      region: regionLabel,
      country: String(loc.country_code || '').toUpperCase(),
      tempC: Math.round(cur.temperature_2m),
      feelsC: Math.round(cur.apparent_temperature),
      humidity: Math.round(cur.relative_humidity_2m),
      windKmh: Math.round(cur.wind_speed_10m),
      code: Number(cur.weather_code ?? 0),
      daily: nextDaily,
    };
    os.weatherQuery = loc.name || city;
    AsyncStorage.setItem(WEATHER_CITY_STORAGE_KEY, os.weatherQuery).catch(() => {});
    os.cb.onPlaySound?.('powerup');
  } catch {
    os.weatherError = 'OFFLINE / CONNECTION ERROR';
    os.cb.onPlaySound?.('die');
  } finally {
    os.weatherLoading = false;
  }
}
