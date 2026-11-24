import React from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RetroAudioEngine, KEYPAD_SOUND_STYLES } from '../../audio/RetroAudioEngine';
import { getProviderMeta, getProviderModel } from '../../services/byokAiService';
import { styles } from '../retroOsStyles';
import {
  DIAL_KEYS,
  NOKIA_OPERATORS,
  NOKIA_PROFILES,
  NOKIA_SMS_TONES,
  PIC_BANNERS,
  POSTCARD_STAMPS,
  REAL_POSTCARDS,
  wrapTextLines,
} from '../retroOsData';
import { pickLang, tOs } from '../../i18n/retroI18n';
import type { RetroDeckOS } from '../RetroDeckOS';

export function renderWap(os: RetroDeckOS, fg: string, bg: string) {
  const cleanHost = os.wapUrl.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 26);
  const slice = os.wapLines.slice(os.wapScroll, os.wapScroll + 6);

  return (
    <View style={styles.listWrap}>
      {/* Top WAP Address Bar */}
      <View
        style={[
          styles.aiPromptBar,
          {
            borderColor: fg,
            backgroundColor: fg,
            marginBottom: 4,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[styles.aiPromptTxt, { color: bg }]} numberOfLines={1}>
          {os.wapLoading ? 'WAP: CONNECTING...' : `WAP://${cleanHost}`}
        </Text>
        <Text style={[styles.aiPromptTxt, { color: bg }]}>
          {os.wapScroll + 1}/{os.wapLines.length}
        </Text>
      </View>

      {/* WML Monochrome Page Content */}
      <View style={[styles.aiChatBox, { borderColor: fg, marginBottom: 2 }]}>
        {slice.map((line, i) => (
          <Text key={i} style={[styles.aiChatLine, { color: fg }]} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>

      <Text style={[styles.miniHint, { color: fg, textAlign: 'center' }]} numberOfLines={1}>
        [▲/▼] SCROLL • [◀/▶] SITES • [A/KBD] ENTER URL
      </Text>
    </View>
  );
}

export function renderAiApp(os: RetroDeckOS, fg: string, bg: string) {
  const pid = os.byokConfig.activeProvider;
  const meta = getProviderMeta(pid);
  const hasKey = !meta.requiresKey || Boolean(os.byokConfig.keys[pid]?.trim());
  const rawKey = os.byokConfig.keys[pid] || '';
  const maskedKey = rawKey
    ? rawKey.length > 8
      ? `${rawKey.slice(0, 5)}...${rawKey.slice(-3)}`
      : 'SET (***)'
    : 'NOT SET [PRESS A]';

  return (
    <View style={styles.listWrap}>
      <View style={styles.aiTabsRow}>
        <View
          style={[
            styles.aiTabPill,
            {
              borderColor: fg,
              backgroundColor: os.aiTab === 'chat' ? fg : 'transparent',
            },
          ]}
        >
          <Text style={[styles.aiTabTxt, { color: os.aiTab === 'chat' ? bg : fg }]}>
            1.CHAT ({meta.shortName})
          </Text>
        </View>
        <View
          style={[
            styles.aiTabPill,
            {
              borderColor: fg,
              backgroundColor: os.aiTab === 'byok' ? fg : 'transparent',
            },
          ]}
        >
          <Text style={[styles.aiTabTxt, { color: os.aiTab === 'byok' ? bg : fg }]}>
            2.BYOK [{hasKey ? 'KEY:OK' : 'NO KEY'}]
          </Text>
        </View>
      </View>

      {os.aiTab === 'chat' ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={[styles.aiChatBox, { borderColor: fg }]}>
            {os.chatLines.slice(os.chatScroll, os.chatScroll + 6).map((line, idx) => (
              <Text key={idx} style={[styles.aiChatLine, { color: fg }]} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>

          <View style={[styles.aiPromptBar, { borderColor: fg, backgroundColor: fg }]}>
            <Text style={[styles.aiPromptTxt, { color: bg }]} numberOfLines={1}>
              {os.aiLoading
                ? `> [${meta.shortName} THINKING...]`
                : `> ${os.aiPrompt || 'PRESS [KBD] OR [A] TO CHAT_'}`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {[
            `PROVIDER: < ${meta.name.toUpperCase()} >`,
            `API KEY: ${maskedKey}`,
            `MODEL: ${getProviderModel(pid, os.byokConfig)}`,
            '>> BACK TO AI CHAT <<',
          ].map((rowLabel, rIdx) => {
            const sel = rIdx === os.byokRow;
            return (
              <View
                key={rIdx}
                style={[
                  styles.setupRow,
                  { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                ]}
              >
                <Text style={[styles.setupTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                  {sel ? '> ' : '  '}
                  {rowLabel}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function renderPhone(os: RetroDeckOS, fg: string, bg: string) {
  if (os.callState === 'warranty') {
    const lifeMins = String(Math.floor(os.uptime / 60)).padStart(2, '0');
    const lifeSecs = String(Math.floor(os.uptime % 60)).padStart(2, '0');
    const pages = [
      { hdr: '1/5 SERIAL NO:', val: '350993103310008', sub: 'NHM-5NX FINLAND' },
      { hdr: '2/5 MADE DATE:', val: '092000', sub: 'SALO FACTORY FI' },
      { hdr: '3/5 PURCHASING:', val: '112026', sub: 'ORIGINAL OWNER' },
      { hdr: '4/5 REPAIRED:', val: '0000', sub: 'INDESTRUCTIBLE 3310' },
      { hdr: '5/5 LIFE TIMER:', val: `0000:${lifeMins}:${lifeSecs}`, sub: 'TOTAL ACTIVE TIME' },
    ];
    const p = pages[os.warrantyPage];
    return (
      <View style={styles.centerBox}>
        <View style={[styles.swBox, { borderColor: fg, width: '92%' }]}>
          <Text style={[styles.swLbl, { color: fg, marginBottom: 4 }]}>
            *#WAR0ANTY# ({p.hdr})
          </Text>
          <Text style={[styles.calcNum, { color: fg, textAlign: 'center' }]}>
            {p.val}
          </Text>
          <Text style={[styles.clockDate, { color: fg, marginTop: 4, marginBottom: 2 }]}>
            {p.sub}
          </Text>
        </View>
        <Text style={[styles.miniHint, { color: fg }]}>
          [A] / [▼]: NEXT WARRANTY PAGE • [B]: EXIT
        </Text>
      </View>
    );
  }

  if (os.callState !== 'idle') {
    return (
      <View style={styles.centerBox}>
        <View style={[styles.swBox, { borderColor: fg, width: '90%' }]}>
          <Text style={[styles.swLbl, { color: fg, marginBottom: 4 }]}>
            {os.callState === 'ringing'
              ? '((( INCOMING CALL )))'
              : os.callState === 'connected'
              ? `CONNECTED 00:${String(Math.floor(os.callTimer)).padStart(2, '0')}`
              : 'RETRODECK SERVICE'}
          </Text>
          <Text style={[styles.calcNum, { color: fg, textAlign: 'center' }]}>
            {os.callTitle}
          </Text>
          <Text style={[styles.clockDate, { color: fg, marginTop: 4, marginBottom: 4 }]}>
            {os.callSub}
          </Text>
        </View>
        <Text style={[styles.miniHint, { color: fg }]}>
          {os.callState === 'ringing'
            ? '[A] ANSWER CALL   [B] REJECT'
            : '[A] / [B] END / BACK'}
        </Text>
      </View>
    );
  }

  if (os.isNumericDeckActive) {
    const blink = Math.floor(os.uptime * 2.5) % 2 === 0;
    return (
      <View style={styles.calcWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: fg }]}>RETRODECK DIALER</Text>
          <Text style={[styles.compBpm, { color: fg }]}>[NUM PAD]</Text>
        </View>
        <View
          style={[
            styles.swBox,
            {
              borderColor: fg,
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              marginBottom: 4,
            },
          ]}
        >
          <Text
            style={[
              styles.clockBig,
              {
                color: fg,
                fontSize: os.dialBuffer.length > 10 ? 16 : 22,
                textAlign: 'center',
                letterSpacing: 1.5,
              },
            ]}
            numberOfLines={1}
          >
            {os.dialBuffer ? `${os.dialBuffer}${blink ? '_' : ' '}` : blink ? '_' : ' '}
          </Text>
          {!os.dialBuffer && (
            <Text style={[styles.miniHint, { color: fg, opacity: 0.75, marginTop: 4 }]}>
              DIAL NUMBER OR *#0000# / *#06#
            </Text>
          )}
        </View>
        <Text style={[styles.miniHint, { color: fg, textAlign: 'center' }]} numberOfLines={1}>
          [OK]: CALL   [DEL]: ERASE   [BACK]: DESKTOP
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.calcWrap}>
      <View style={[styles.calcScreen, { borderColor: fg }]}>
        <Text style={[styles.calcOp, { color: fg }]}>TEL:</Text>
        <Text style={[styles.calcNum, { color: fg }]} numberOfLines={1}>
          {os.dialBuffer || '*#0000# / *#06#'}
        </Text>
      </View>
      <View style={styles.calcGrid}>
        {DIAL_KEYS.map((row, r) => (
          <View key={r} style={styles.calcRow}>
            {row.map((k, c) => {
              const sel = r === os.dialR && c === os.dialC;
              return (
                <View
                  key={k}
                  style={[
                    styles.calcKey,
                    { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
                  ]}
                >
                  <Text style={[styles.compKeyTxt, { color: sel ? bg : fg }]}>{k}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export function renderSms(os: RetroDeckOS, fg: string, bg: string) {
  if (os.smsMode === 'compose') {
    const isArtTab = os.smsStudioTab === 'art';
    const scene = REAL_POSTCARDS[os.smsArtIdx] || REAL_POSTCARDS[0];
    const stamp = POSTCARD_STAMPS[os.smsStampIdx] || POSTCARD_STAMPS[0];
    const totalStamps = POSTCARD_STAMPS.length;
    const stripOffsets = [-3, -2, -1, 0, 1, 2, 3];

    return (
      <View style={styles.listWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: fg }]} numberOfLines={1}>
            {isArtTab ? 'POSTCARD P1/2: SCENE' : 'POSTCARD P2/2: ICON'}
          </Text>
          <Text style={[styles.compBpm, { color: fg }]}>
            {isArtTab
              ? `${os.smsArtIdx + 1}/${REAL_POSTCARDS.length} [${scene.title}]`
              : `${os.smsStampIdx + 1}/${totalStamps} [${stamp.label}]`}
          </Text>
        </View>

        {/* Real Full-Width Postcard Visual with Stamp & Postmark */}
        <View
          style={{
            width: '100%',
            height: isArtTab ? 78 : 56,
            borderWidth: 1.5,
            borderColor: fg,
            marginBottom: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Image
            source={scene.image}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              bottom: 3,
              left: 4,
              backgroundColor: '#000000AA',
              paddingHorizontal: 5,
              paddingVertical: 1.5,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontWeight: '900', fontFamily: 'monospace' }}>
              {scene.title}
            </Text>
          </View>
        </View>

        {!isArtTab && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: fg,
              paddingVertical: 2,
              paddingHorizontal: 4,
              marginBottom: 3,
            }}
          >
            {stripOffsets.map((off) => {
              const idx = (os.smsStampIdx + off + totalStamps) % totalStamps;
              const item = POSTCARD_STAMPS[idx];
              const isCenter = off === 0;
              return (
                <View
                  key={`${off}-${item.icon}-${idx}`}
                  style={{
                    width: isCenter ? 26 : 18,
                    height: isCenter ? 22 : 18,
                    backgroundColor: isCenter ? fg : 'transparent',
                    borderWidth: isCenter ? 1 : 0,
                    borderColor: fg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isCenter ? 1 : 0.7,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={isCenter ? 14 : 11}
                    color={isCenter ? bg : fg}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Message Preview Box */}
        <View
          style={[
            styles.swBox,
            {
              borderColor: fg,
              width: '100%',
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            },
          ]}
        >
          <Ionicons name={stamp.icon} size={13} color={fg} />
          <Text style={[styles.smsBodyTxt, { color: fg, fontSize: 8.5, flex: 1, textAlign: 'left' }]} numberOfLines={2}>
            {os.smsDraftText || '(PRESS [▲] OR [KBD] TO WRITE MESSAGE)'}
          </Text>
        </View>

        <Text style={[styles.miniHint, { color: fg, textAlign: 'center', marginTop: 2 }]} numberOfLines={1}>
          [◀/▶] PICK • [▼] {isArtTab ? 'ICONS (P2)' : 'SCENE (P1)'} • [▲] MSG • [A] SEND
        </Text>
      </View>
    );
  }

  if (os.smsList.length === 0) {
    return (
      <View style={[styles.listWrap, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.subHeader, { color: fg }]}>{tOs('inboxEmpty', os.lang)}</Text>
        <Text style={[styles.miniHint, { color: fg, marginTop: 6 }]}>
          {pickLang(os.lang, 'PRESS [▲] TO CREATE A POSTCARD', 'KARTPOSTAL OLUSTURMAK ICIN [▲] BAS')}
        </Text>
      </View>
    );
  }
  const msg = os.smsList[os.smsIdx] || os.smsList[0];
  const bannerSpans = PIC_BANNERS[msg.artKey] || PIC_BANNERS.COFFEE;
  const realCard = msg.postcardId
    ? REAL_POSTCARDS.find((p) => p.id === msg.postcardId) || REAL_POSTCARDS[0]
    : null;

  return (
    <View style={styles.listWrap}>
      <View style={styles.compHeader}>
        <Text style={[styles.compTitle, { color: fg }]} numberOfLines={1}>
          ✉ {os.smsIdx + 1}/{os.smsList.length} {msg.sender}
        </Text>
        <Text style={[styles.compBpm, { color: fg }]}>
          {os.smsDeleteConfirm ? `[${tOs('confirmDel', os.lang)}]` : `[${msg.title}]`}
        </Text>
      </View>

      {realCard ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Full-Size Illustrated Postcard */}
          <View
            style={{
              width: '100%',
              height: 82,
              borderWidth: 1.5,
              borderColor: fg,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Image
              source={realCard.image}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <View
              style={{
                position: 'absolute',
                bottom: 3,
                left: 4,
                backgroundColor: '#000000AA',
                paddingHorizontal: 5,
                paddingVertical: 1.5,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 7.5, fontWeight: '900', fontFamily: 'monospace' }}>
                {realCard.title}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.swBox,
              { borderColor: fg, width: '100%', paddingVertical: 3, paddingHorizontal: 6, marginTop: 3, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
            ]}
          >
            {msg.stampIcon && <Ionicons name={msg.stampIcon} size={13} color={fg} />}
            <Text style={[styles.smsBodyTxt, { color: fg, fontSize: 8.5, flex: 1, textAlign: msg.stampIcon ? 'left' : 'center' }]} numberOfLines={2}>
              {msg.text}
            </Text>
          </View>
        </View>
      ) : msg.isLivePersona ? (
        /* Authentic Plain-Text Real SMS Bubble with Timestamp & Mood */
        <View
          style={[
            styles.compStaff,
            {
              borderColor: fg,
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingHorizontal: 10,
              paddingVertical: 8,
              gap: 6,
            },
          ]}
        >
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.compTitle, { color: fg, fontSize: 9, opacity: 0.75 }]} numberOfLines={1}>
              {tOs('from', os.lang)}: {msg.sender}
            </Text>
            <Text style={[styles.listMeta, { color: fg, fontSize: 8, opacity: 0.75 }]}>
              {msg.mood ? `${msg.mood} • ` : ''}{msg.timestamp || os.formatClock()}
            </Text>
          </View>
          <Text style={[styles.smsBodyTxt, { color: fg, textAlign: 'left', fontSize: 10.5, lineHeight: 14 }]} numberOfLines={5}>
            {msg.text}
          </Text>
        </View>
      ) : (
        /* Classic Nokia 3310 Picture Message Card */
        <View
          style={[
            styles.compStaff,
            {
              borderColor: fg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            },
          ]}
        >
          {msg.stampIcon ? (
            <View
              style={[
                styles.picBannerBox,
                {
                  borderColor: fg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                },
              ]}
            >
              <Ionicons name={msg.stampIcon} size={18} color={fg} />
              {msg.stampLabel ? (
                <Text style={[styles.compBpm, { color: fg, fontSize: 9 }]}>
                  {msg.stampLabel}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.picBannerBox, { borderColor: fg }]}>
              {bannerSpans.map((s) => (
                <View
                  key={s.key}
                  style={{
                    position: 'absolute',
                    left: s.x,
                    top: s.y,
                    width: s.w,
                    height: s.h,
                    backgroundColor: fg,
                  }}
                />
              ))}
            </View>
          )}

          <Text style={[styles.smsBodyTxt, { color: fg }]} numberOfLines={3}>
            {msg.text}
          </Text>
        </View>
      )}

      <Text style={[styles.miniHint, { color: fg, textAlign: 'center' }]} numberOfLines={1}>
        {os.smsBannerTimer > 0
          ? os.smsBanner
          : (os.smsDeleteConfirm
              ? 'PRESS [▼] AGAIN TO CONFIRM DELETE!'
              : msg.isLivePersona
              ? '[▲] POSTCARD • [▼]/DEL DEL • [A] REPLY'
              : '[▲] POSTCARD • [▼]/DEL DEL • [A] AI')}
      </Text>
    </View>
  );
}

export function renderProfiles(os: RetroDeckOS, fg: string, bg: string) {
  const activeRing = os.songs[os.ringtoneIdx] || os.songs[0];
  const activeSms = NOKIA_SMS_TONES[os.smsToneIdx] || NOKIA_SMS_TONES[0];
  const activeKeyStyle =
    KEYPAD_SOUND_STYLES.find((s) => s.id === RetroAudioEngine.getKeySoundStyle()) ||
    KEYPAD_SOUND_STYLES[0];
  const volPct = Math.round(RetroAudioEngine.getVolume() * 100);
  const bars = Math.round(volPct / 10);
  const volBar = '█'.repeat(bars) + '░'.repeat(10 - bars);

  const rows = [
    `PROFILE: < ${NOKIA_PROFILES[os.profileIdx]} >`,
    `VOLUME: < [${volBar}] ${volPct}% >`,
    `RINGTONE: < ${activeRing.title.trim()} >`,
    `SMS TONE: < ${activeSms.title} >`,
    `KEY SOUND: < ${activeKeyStyle.name} >`,
    `OPERATOR: < ${NOKIA_OPERATORS[os.operatorIdx]} >`,
    `[A] LOCK KEYS • [◀/▶] TORCH: ${os.torchInvert ? 'ON' : 'OFF'}`,
  ];
  return (
    <View style={styles.listWrap}>
      <Text style={[styles.subHeader, { color: fg }]}>PROFILES & AUDIO</Text>
      {rows.map((label, i) => {
        const sel = i === os.profRow;
        return (
          <View
            key={i}
            style={[
              styles.setupRow,
              {
                borderColor: fg,
                backgroundColor: sel ? fg : 'transparent',
                paddingVertical: 3.5,
                marginBottom: 2.5,
              },
            ]}
          >
            <Text style={[styles.setupTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
              {sel ? '> ' : '  '}
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
