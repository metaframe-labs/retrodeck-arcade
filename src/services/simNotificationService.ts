import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { pickLang, RetroLang } from '../i18n/retroI18n';
import {
  AutonomousSimState,
  getOrCreatePersonaState,
  selectAutonomousSimTurn,
  SimContextTrigger,
  SimMood,
} from '../os/engine/autonomousSmsSim';

export const SIM_NOTIFICATION_CHANNEL_ID = 'retrodeck-sim-sms';
export const SCHEDULED_SIM_QUEUE_STORAGE_KEY = '@retrodeck8_scheduled_sim_queue_v1';

/** Nokia 3310 classic Morse "S-M-S" (... --- ...) vibration cadence */
const NOKIA_MORSE_SMS_VIBRATION = [
  0, 90, 60, 90, 60, 90, 140, 220, 140, 220, 140, 90, 60, 90, 60, 90,
];

export interface ScheduledSimSmsItem {
  queueId: string;
  notificationId?: string;
  personaId: string;
  sender: string;
  tag: string;
  text: string;
  mood: SimMood;
  moodBadge: string;
  trigger: SimContextTrigger;
  deliverAtMs: number;
}

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function isTooSimilar(candidate: string, previousTexts: string[]): boolean {
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

function cloneSimState(state: AutonomousSimState): AutonomousSimState {
  return JSON.parse(JSON.stringify(state)) as AutonomousSimState;
}

class SimNotificationService {
  private initialized = false;
  private permissionRequestedOnce = false;
  private consumedResponseIds = new Set<string>();

  public async init(): Promise<void> {
    if (this.initialized || Platform.OS === 'web') return;
    this.initialized = true;
    try {
      // Suppress OS banner while app is already open in foreground (3310 LCD handles it live)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(SIM_NOTIFICATION_CHANNEL_ID, {
          name: 'RetroDeck Simulated SMS',
          description: 'In-game virtual character SMS notifications (simulation only, no real carrier SMS)',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: NOKIA_MORSE_SMS_VIBRATION,
          lightColor: '#8BAC0F',
          enableVibrate: true,
        });
      }
    } catch {
      // Gracefully degrade if native module is not yet linked in an older dev client
    }
  }

  /** Requests Android 13+ POST_NOTIFICATIONS / iOS notification permission once after user interaction */
  public async ensurePermissionsOnInteraction(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    await this.init();
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      if (!this.permissionRequestedOnce && current.canAskAgain) {
        this.permissionRequestedOnce = true;
        const next = await Notifications.requestPermissionsAsync();
        return Boolean(next.granted);
      }
      return false;
    } catch {
      return false;
    }
  }

  public async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const current = await Notifications.getPermissionsAsync();
      return Boolean(current.granted);
    } catch {
      return false;
    }
  }

  public async cancelPendingAsync(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // ignore
    }
  }

  /**
   * Pre-schedules up to 3 autonomous simulated SMS notifications with Android AlarmManager
   * when the app moves to background or closes, persisting the exact queue so the Nokia 3310
   * inbox receives the exact same messages upon return.
   */
  public async scheduleBackgroundSimBatch(params: {
    enabled: boolean;
    simState: AutonomousSimState;
    lang: RetroLang;
    personaHistories: Record<string, { role: 'user' | 'assistant'; content: string }[]>;
    recentInboxTexts: string[];
  }): Promise<number> {
    if (Platform.OS === 'web') return 0;
    await this.init();
    await this.cancelPendingAsync();

    if (!params.enabled) {
      await AsyncStorage.removeItem(SCHEDULED_SIM_QUEUE_STORAGE_KEY).catch(() => {});
      return 0;
    }

    const permitted = await this.hasPermission();
    if (!permitted) {
      await AsyncStorage.removeItem(SCHEDULED_SIM_QUEUE_STORAGE_KEY).catch(() => {});
      return 0;
    }

    const workingSim = cloneSimState(params.simState);
    const now = Date.now();
    // Staggered realistic autonomous delays: 45-90s, ~3.5-5.5m, ~10-15m
    const delaysSec = [
      45 + Math.floor(Math.random() * 45),
      210 + Math.floor(Math.random() * 120),
      600 + Math.floor(Math.random() * 300),
    ];

    const usedTexts = [...params.recentInboxTexts];
    let lastSenderId: string | undefined;
    const scheduledItems: ScheduledSimSmsItem[] = [];

    for (let i = 0; i < delaysSec.length; i++) {
      const delaySec = delaysSec[i];
      const deliverAtMs = now + delaySec * 1000;
      const futureHour = new Date(deliverAtMs).getHours();

      const turn = selectAutonomousSimTurn(
        workingSim,
        params.lang,
        lastSenderId,
        undefined,
        futureHour
      );
      const { persona, trigger, mood, moodBadge } = turn;
      const pHistory = (params.personaHistories[persona.id] || [])
        .filter((h) => h.role === 'assistant')
        .map((h) => h.content);
      const forbidden = [...pHistory, ...usedTexts];

      const candidates = [
        turn.offlineFallback,
        ...(persona.unansweredFollowups || []),
        ...(persona.eventPool?.map((ev) => ev.fallback) || []),
        persona.fallback,
      ].filter(Boolean);

      const chosenText =
        candidates.find((c) => !isTooSimilar(c, forbidden)) || turn.offlineFallback || persona.fallback;

      usedTexts.push(chosenText);
      lastSenderId = persona.id;

      // Advance working preview state so subsequent queued slots build on earlier ones!
      const pState = getOrCreatePersonaState(workingSim, persona.id);
      const isSocial = ['kanka', 'anne', 'patron', 'flort'].includes(persona.id);
      if (trigger === 'UNANSWERED_NUDGE') {
        pState.unansweredCount += 1;
        pState.awaitingReply = isSocial && pState.unansweredCount < 2;
      } else {
        pState.unansweredCount = 0;
        pState.awaitingReply = isSocial;
      }
      pState.lastMessageText = chosenText;
      pState.lastSentAtMs = deliverAtMs;

      const queueId = `sim_${deliverAtMs}_${i}`;
      const simTag = pickLang(params.lang, 'SIM', 'SIMULASYON');
      const simFooter = pickLang(
        params.lang,
        'RetroDeck OS • Simulated SMS (No real SMS)',
        'RetroDeck OS • Sanal SMS Simulasyonu'
      );

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `✉ [${simTag}] ${persona.sender} • ${moodBadge}`,
            body: `${chosenText}\n${simFooter}`,
            sound: true,
            data: {
              type: 'RETRODECK_SIM_SMS',
              queueId,
              personaId: persona.id,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySec,
            channelId: SIM_NOTIFICATION_CHANNEL_ID,
          },
        });

        scheduledItems.push({
          queueId,
          notificationId,
          personaId: persona.id,
          sender: persona.sender,
          tag: persona.tag,
          text: chosenText,
          mood,
          moodBadge,
          trigger,
          deliverAtMs,
        });
      } catch {
        // Skip if scheduling fails on unsupported runtime
      }
    }

    if (scheduledItems.length > 0) {
      await AsyncStorage.setItem(
        SCHEDULED_SIM_QUEUE_STORAGE_KEY,
        JSON.stringify(scheduledItems)
      ).catch(() => {});
    }
    return scheduledItems.length;
  }

  /**
   * Cancels remaining future notifications and returns all queued items that already
   * fired in the Android/iOS tray (or the specific item tapped by the user).
   */
  public async reconcileDeliveredQueueAsync(
    tappedQueueId?: string
  ): Promise<{ delivered: ScheduledSimSmsItem[]; hadScheduledQueue: boolean }> {
    if (Platform.OS === 'web') {
      return { delivered: [], hadScheduledQueue: false };
    }
    await this.cancelPendingAsync();

    try {
      const raw = await AsyncStorage.getItem(SCHEDULED_SIM_QUEUE_STORAGE_KEY);
      if (!raw) {
        return { delivered: [], hadScheduledQueue: false };
      }
      await AsyncStorage.removeItem(SCHEDULED_SIM_QUEUE_STORAGE_KEY).catch(() => {});

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { delivered: [], hadScheduledQueue: false };
      }

      const now = Date.now();
      const delivered = (parsed as ScheduledSimSmsItem[])
        .filter((item) => item.deliverAtMs <= now + 1500 || (tappedQueueId && item.queueId === tappedQueueId))
        .sort((a, b) => a.deliverAtMs - b.deliverAtMs);

      return { delivered, hadScheduledQueue: true };
    } catch {
      return { delivered: [], hadScheduledQueue: false };
    }
  }

  /**
   * Listens for both live notification taps and cold-boot launches from an Android notification tap.
   */
  public subscribeToNotificationTaps(onTapSimSms: (queueId?: string) => void): () => void {
    if (Platform.OS === 'web') return () => {};

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (this.consumedResponseIds.has(id)) return;
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === 'RETRODECK_SIM_SMS') {
        this.consumedResponseIds.add(id);
        const queueId = typeof data.queueId === 'string' ? data.queueId : undefined;
        onTapSimSms(queueId);
      }
    };

    // Check if app was cold-launched by tapping a notification while completely closed
    Notifications.getLastNotificationResponseAsync()
      .then((res) => handleResponse(res))
      .catch(() => {});

    let sub: Notifications.EventSubscription | null = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((res) => {
        handleResponse(res);
      });
    } catch {
      sub = null;
    }

    return () => {
      sub?.remove();
    };
  }
}

export const simNotificationService = new SimNotificationService();
