import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickLang, RetroLang } from '../../i18n/retroI18n';
import {
  LIVE_SMS_PERSONAS_BY_LANG,
  LivePersonaRandomEvent,
  LiveSmsPersona,
} from '../retroOsData';

export const AUTONOMOUS_SMS_STATE_STORAGE_KEY = '@retrodeck8_autonomous_sms_sim_v1';

/** Core emotional states of the Autonomous SMS Simulation Mood Engine */
export type SimMood = 'CHEERFUL' | 'DRAMATIC' | 'WORRIED' | 'ANGRY';

/** Context Engine trigger categories */
export type SimContextTrigger =
  | 'SPONTANEOUS_EVENT'
  | 'UNANSWERED_NUDGE'
  | 'SUDDEN_TOPIC_PIVOT'
  | 'CONTEXT_FOLLOWUP'
  | 'USER_REPLY_REACTION';

export interface PersonaSimState {
  mood: SimMood;
  awaitingReply: boolean;
  unansweredCount: number;
  lastMessageText?: string;
  lastEventId?: string;
  lastSentAtMs?: number;
  recentEventIds: string[];
}

export interface AutonomousSimState {
  personas: Record<string, PersonaSimState>;
  lastActiveAtMs: number;
  lastOsEvent?: {
    type: 'HIGH_SCORE' | 'PRO_UNLOCKED' | 'LATE_NIGHT' | 'FORMAT_COMPLETE';
    detail: string;
    atMs: number;
  };
}

/** Random autonomous SMS interval strictly between 30 and 90 seconds */
export function rollAutonomousSmsIntervalSec(): number {
  return 30 + Math.random() * 60;
}

export function getDefaultPersonaMood(personaId: string): SimMood {
  if (personaId === 'flort') return 'DRAMATIC';
  return 'CHEERFUL';
}

export function getOrCreatePersonaState(
  sim: AutonomousSimState,
  personaId: string
): PersonaSimState {
  if (!sim.personas[personaId]) {
    sim.personas[personaId] = {
      mood: getDefaultPersonaMood(personaId),
      awaitingReply: false,
      unansweredCount: 0,
      recentEventIds: [],
    };
  }
  return sim.personas[personaId];
}

export function formatSimMoodBadge(mood: SimMood, lang: RetroLang): string {
  const trMap: Record<SimMood, string> = {
    CHEERFUL: 'NESELI',
    DRAMATIC: 'DRAMATIK',
    WORRIED: 'ENDISELI',
    ANGRY: 'KIZGIN',
  };
  return lang === 'tr' ? trMap[mood] : mood;
}

export function describeSimMoodForPrompt(mood: SimMood, lang: RetroLang): string {
  const descriptions: Record<SimMood, { en: string; tr: string }> = {
    CHEERFUL: {
      en: 'CHEERFUL (upbeat, warm, playful, high energy)',
      tr: 'NESELI (enerjik, sicak, neseli ve keyifli)',
    },
    DRAMATIC: {
      en: 'DRAMATIC (theatrical, extra, exaggerating everything for effect)',
      tr: 'DRAMATIK (abartili, duygusal veya tiyatral tepkiler veren)',
    },
    WORRIED: {
      en: 'WORRIED (anxious, concerned, checking in persistently)',
      tr: 'ENDISELI (merak icinde, telasli, ust uste kontrol eden)',
    },
    ANGRY: {
      en: 'ANGRY / SALTY (impatient, blunt, annoyed at being ignored or delayed)',
      tr: 'KIZGIN / SITEMKAR (sabirsiz, bekletildigi veya cevapsiz kaldigi icin tepkili)',
    },
  };
  return pickLang(lang, descriptions[mood].en, descriptions[mood].tr);
}

/**
 * Analyzes user reply text to evolve the persona's mood after user interaction.
 */
export function evaluateMoodAfterUserReply(
  personaId: string,
  currentMood: SimMood,
  userReply: string
): SimMood {
  const lower = userReply.toLowerCase();

  const negativeOrExcuse =
    /\b(no|nope|nah|cant|can't|busy|tired|sleep|later|2\s*am|3\s*am|stop|leave|never|hayir|hayır|yok|olmaz|gelemem|isim var|işim var|yorgunum|uyuyorum|sonra|birak|bırak|sanane)\b/i.test(
      lower
    );

  const distressedOrSad =
    /\b(sad|bad|terrible|depressed|lonely|awful|crying|stressed|kotuyum|kötüyüm|moralim bozuk|uzgunum|üzgünüm|yalnizim|yalnızım|berbat|yoruldum)\b/i.test(
      lower
    );

  const warmOrConfirming =
    /\b(yes|yeah|yep|sure|ok|okay|omw|on my way|coming|ate|eaten|sent|done|love|thanks|lets go|let's go|evet|tamam|olur|geliyorum|yoldayim|yoldayım|yedim|attim|attım|gonderdim|hadi|sagol|sağol)\b/i.test(
      lower
    );

  if (distressedOrSad) {
    return 'WORRIED';
  }

  if (negativeOrExcuse) {
    if (personaId === 'anne') return 'WORRIED';
    if (personaId === 'patron') return currentMood === 'WORRIED' ? 'ANGRY' : 'WORRIED';
    if (personaId === 'kanka') return Math.random() < 0.55 ? 'DRAMATIC' : 'ANGRY';
    return 'DRAMATIC';
  }

  if (warmOrConfirming) {
    return 'CHEERFUL';
  }

  return currentMood;
}

/**
 * Shifts persona mood when their previous SMS goes unanswered.
 */
export function evaluateMoodOnUnanswered(
  personaId: string,
  prevUnansweredCount: number
): SimMood {
  const nextCount = prevUnansweredCount + 1;
  if (personaId === 'anne') {
    return nextCount >= 2 ? 'DRAMATIC' : 'WORRIED';
  }
  if (personaId === 'patron') {
    return nextCount >= 2 ? 'ANGRY' : 'WORRIED';
  }
  if (personaId === 'kanka') {
    return nextCount >= 2 ? 'ANGRY' : 'DRAMATIC';
  }
  return 'DRAMATIC';
}

export interface SelectedSimTurn {
  persona: LiveSmsPersona;
  trigger: SimContextTrigger;
  mood: SimMood;
  moodBadge: string;
  pickedEvent: LivePersonaRandomEvent | null;
  contextDirective: string;
  offlineFallback: string;
}

/**
 * Autonomous Context Engine:
 * Decides WHICH character texts next and WHY (unanswered follow-up, sudden topic pivot,
 * event-driven context continuation, or fresh event from pool).
 */
export function selectAutonomousSimTurn(
  sim: AutonomousSimState,
  lang: RetroLang,
  lastSenderPersonaId?: string,
  forcedPersonaId?: string,
  currentHour = new Date().getHours()
): SelectedSimTurn {
  const personas = LIVE_SMS_PERSONAS_BY_LANG[lang] || LIVE_SMS_PERSONAS_BY_LANG.en;

  const resolveForced = (q?: string): LiveSmsPersona | null => {
    if (!q) return null;
    const clean = q.trim().toLowerCase();
    if (!clean) return null;
    if (clean === 'jake' || clean === 'mert' || clean === 'bro') {
      return personas.find((p) => p.id === 'kanka') || null;
    }
    if (clean === 'mom' || clean === 'anne' || clean === 'annem') {
      return personas.find((p) => p.id === 'anne') || null;
    }
    if (clean === 'boss' || clean === 'patron' || clean === 'carter' || clean === 'selim') {
      return personas.find((p) => p.id === 'patron') || null;
    }
    return (
      personas.find((p) => p.id.toLowerCase() === clean) ||
      personas.find((p) => p.sender.toLowerCase().includes(clean)) ||
      null
    );
  };

  let chosenPersona = resolveForced(forcedPersonaId);

  // 1) Check if a core character (Jake, Mom, Boss) is waiting for a reply and decides to double-text!
  const socialIds = ['kanka', 'anne', 'patron', 'flort'];
  if (!chosenPersona) {
    const waitingCandidates = personas.filter((p) => {
      if (!socialIds.includes(p.id)) return false;
      const st = sim.personas[p.id];
      return Boolean(st?.awaitingReply && st.unansweredCount < 2);
    });

    // 45% chance an unanswered social contact follows up (Jake is extra persistent!)
    if (waitingCandidates.length > 0 && Math.random() < 0.45) {
      const jakeWaiting = waitingCandidates.find((p) => p.id === 'kanka');
      chosenPersona =
        jakeWaiting && Math.random() < 0.6
          ? jakeWaiting
          : waitingCandidates[Math.floor(Math.random() * waitingCandidates.length)];
    }
  }

  // 2) Otherwise weighted selection heavily favoring core autonomous characters (Jake, Mom, Boss)
  if (!chosenPersona) {
    const weights: Record<string, number> = {
      kanka: 34, // Jake / Mert
      anne: 22, // Mom / Annem
      patron: 18, // Boss (Mr. Carter / Selim Bey)
      flort: 10, // Mystery crush
      kurye: 6, // Delivery
      pizza_ad: 3,
      operator_ad: 3,
      bank_ad: 2,
      market_ad: 2,
    };

    const pool = personas.filter((p) => p.id !== lastSenderPersonaId || personas.length <= 1);
    const totalWeight = pool.reduce((acc, p) => acc + (weights[p.id] ?? 5), 0);
    let roll = Math.random() * totalWeight;
    chosenPersona = pool[0];
    for (const p of pool) {
      roll -= weights[p.id] ?? 5;
      if (roll <= 0) {
        chosenPersona = p;
        break;
      }
    }
  }

  const pState = getOrCreatePersonaState(sim, chosenPersona.id);

  // Determine Context Trigger!
  let trigger: SimContextTrigger = 'SPONTANEOUS_EVENT';
  if (pState.awaitingReply && pState.lastMessageText && pState.unansweredCount < 2) {
    // Friend (Jake) can either double-text about being ignored OR suddenly pivot to a brand new random topic!
    if (chosenPersona.id === 'kanka' && Math.random() < 0.35) {
      trigger = 'SUDDEN_TOPIC_PIVOT';
    } else {
      trigger = 'UNANSWERED_NUDGE';
    }
  } else if (
    chosenPersona.id === 'kanka' &&
    pState.lastMessageText &&
    !pState.awaitingReply &&
    Math.random() < 0.3
  ) {
    trigger = 'SUDDEN_TOPIC_PIVOT';
  } else if (pState.lastMessageText && !pState.awaitingReply && Math.random() < 0.35) {
    trigger = 'CONTEXT_FOLLOWUP';
  }

  // Update mood based on trigger & recent OS events
  let activeMood: SimMood = pState.mood;
  if (trigger === 'UNANSWERED_NUDGE') {
    activeMood = evaluateMoodOnUnanswered(chosenPersona.id, pState.unansweredCount);
    pState.mood = activeMood;
  } else if (trigger === 'SUDDEN_TOPIC_PIVOT') {
    activeMood = Math.random() < 0.65 ? 'CHEERFUL' : 'DRAMATIC';
    pState.mood = activeMood;
  } else {
    // Late night hours make Mom worried or Jake dramatic/cheerful
    if ((currentHour >= 1 && currentHour <= 4) && chosenPersona.id === 'anne') {
      activeMood = 'WORRIED';
      pState.mood = activeMood;
    } else if (sim.lastOsEvent && Date.now() - sim.lastOsEvent.atMs < 180_000) {
      if (sim.lastOsEvent.type === 'HIGH_SCORE' && chosenPersona.id === 'kanka') {
        activeMood = 'DRAMATIC';
        pState.mood = activeMood;
      } else if (sim.lastOsEvent.type === 'FORMAT_COMPLETE' && chosenPersona.id === 'kanka') {
        activeMood = 'DRAMATIC';
        pState.mood = activeMood;
      } else if (sim.lastOsEvent.type === 'PRO_UNLOCKED') {
        activeMood = 'CHEERFUL';
        pState.mood = activeMood;
      }
    }
  }

  // Pick from persona's eventPool if needed
  let pickedEvent: LivePersonaRandomEvent | null = null;
  if (
    chosenPersona.eventPool &&
    chosenPersona.eventPool.length > 0 &&
    (trigger === 'SPONTANEOUS_EVENT' || trigger === 'SUDDEN_TOPIC_PIVOT')
  ) {
    const recentIds = pState.recentEventIds || [];
    const fresh = chosenPersona.eventPool.filter((ev) => !recentIds.includes(ev.id));
    const candidates = fresh.length > 0 ? fresh : chosenPersona.eventPool;
    pickedEvent = candidates[Math.floor(Math.random() * candidates.length)];
    const maxRecent = Math.max(1, Math.min(4, chosenPersona.eventPool.length - 1));
    pState.recentEventIds = [...recentIds, pickedEvent.id].slice(-maxRecent);
    pState.lastEventId = pickedEvent.id;
  }

  // Build Context Engine directive & offline fallback
  let contextDirective = '';
  let offlineFallback = pickedEvent ? pickedEvent.fallback : chosenPersona.fallback;

  const recentOsContext =
    sim.lastOsEvent && Date.now() - sim.lastOsEvent.atMs < 180_000
      ? pickLang(
          lang,
          ` (Optional side context: user recently achieved "${sim.lastOsEvent.detail}" on their RetroDeck console.)`,
          ` (Opsiyonel arka plan detayi: kullanici az once konsolunda "${sim.lastOsEvent.detail}" olayini gerceklestirdi.)`
        )
      : '';

  if (trigger === 'UNANSWERED_NUDGE') {
    const prevSnippet = (pState.lastMessageText || '').slice(0, 70);
    const nudges = chosenPersona.unansweredFollowups || [];
    if (nudges.length > 0) {
      offlineFallback = nudges[pState.unansweredCount % nudges.length];
    }
    contextDirective = pickLang(
      lang,
      `CONTEXT ENGINE [UNANSWERED FOLLOW-UP]: The user NEVER replied to your previous SMS ("${prevSnippet}"). Send a realistic follow-up reacting to their silence in a ${activeMood} mood (e.g., calling them out for ghosting, checking if they ate, or asking if they are joining the meeting).`,
      `BAGLAM MOTORU [CEVAPSIZ MESAJ TAKIBI]: Kullanici bir onceki "${prevSnippet}" mesajina HIC CEVAP VERMEDI. Bu sessizlige ${formatSimMoodBadge(activeMood, lang)} ruh haliyle gercekci bir takip mesaji yaz (goruldu/sessizlik sitemi, yemek yedin mi merakı veya toplanti hatirlatmasi).`
    );
  } else if (trigger === 'SUDDEN_TOPIC_PIVOT' && pickedEvent) {
    const pivotPrefix = pickLang(lang, 'wait forget what i said, ', 'neyse bosver onu da ');
    offlineFallback = `${pivotPrefix}${pickedEvent.fallback}`.slice(0, 125);
    contextDirective = pickLang(
      lang,
      `CONTEXT ENGINE [SUDDEN TOPIC PIVOT]: Abruptly pivot away from whatever you talked about before ("wait forget all that—" / "random thought tho—") and launch into this completely new agenda: ${pickedEvent.instruction}${recentOsContext}`,
      `BAGLAM MOTORU [ANI KONU DEGISIMI]: Onceki konuyu bir anda bosverip ("neyse bosver onu simdi" / "aklima ne geldi bak") aniden bambaska su konuyu ac: ${pickedEvent.instruction}${recentOsContext}`
    );
  } else if (trigger === 'CONTEXT_FOLLOWUP' && pState.lastMessageText) {
    contextDirective = pickLang(
      lang,
      `CONTEXT ENGINE [STORY CONTINUATION]: Build naturally on what happened earlier ("${pState.lastMessageText.slice(0, 70)}") with a new development, consequence, or update.${recentOsContext}`,
      `BAGLAM MOTORU [OLAY DEVAMI]: Daha onceki "${pState.lastMessageText.slice(0, 70)}" olayinin ustune yeni bir gelisme, sonuc veya devam mesaji uret.${recentOsContext}`
    );
  } else if (pickedEvent) {
    contextDirective = pickLang(
      lang,
      `CONTEXT ENGINE [AUTONOMOUS EVENT]: ${pickedEvent.instruction}${recentOsContext}`,
      `BAGLAM MOTORU [OTONOM OLAY]: ${pickedEvent.instruction}${recentOsContext}`
    );
  } else {
    contextDirective = pickLang(
      lang,
      `CONTEXT ENGINE [SPONTANEOUS]: Initiate a natural in-character SMS fitting the current hour (${currentHour}:00).${recentOsContext}`,
      `BAGLAM MOTORU [DOGAL GIRIS]: Su anki saate (${currentHour}:00) uygun dogal bir karakter mesaji baslat.${recentOsContext}`
    );
  }

  const moodLabel = formatSimMoodBadge(activeMood, lang);
  const moodBadge = pickedEvent ? `${moodLabel}/${pickedEvent.moodBadge}` : moodLabel;

  return {
    persona: chosenPersona,
    trigger,
    mood: activeMood,
    moodBadge,
    pickedEvent,
    contextDirective,
    offlineFallback,
  };
}

export async function loadAutonomousSimState(): Promise<AutonomousSimState | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTONOMOUS_SMS_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.personas) {
      return parsed as AutonomousSimState;
    }
  } catch {
    // ignore storage read errors
  }
  return null;
}

export function saveAutonomousSimState(state: AutonomousSimState): void {
  AsyncStorage.setItem(AUTONOMOUS_SMS_STATE_STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}
