import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RetroAudioEngine } from '../../audio/RetroAudioEngine';
import { somaRadioService, SOMA_CHANNELS } from '../../services/somaRadioService';
import { styles } from '../retroOsStyles';
import {
  CALC_KEYS,
  COMPOSER_KEYS,
  NOKIA_SONGS,
  TERM_PRESETS,
  WEATHER_SPRITES,
  WeatherSpriteKey,
  decodeWmoWeather,
} from '../retroOsData';
import { renderAnalogDial } from './renderCoreApps';
import type { RetroDeckOS } from '../RetroDeckOS';

export function renderRadio(os: RetroDeckOS, fg: string, bg: string) {
  const channel = somaRadioService.getChannel();
  const isPlaying = somaRadioService.getIsPlaying();
  const isLoading = somaRadioService.getIsLoading();
  const song = somaRadioService.getCurrentSong();
  const volPercent = Math.round(somaRadioService.getVolume() * 100);
  const channelIdx = somaRadioService.getChannelIndex();
  const totalChannels = SOMA_CHANNELS.length;

  // Animated visualizer bars simulation
  const bars = [4, 7, 12, 16, 9, 14, 8, 15, 11, 6, 13, 10, 5, 8];

  return (
    <View style={styles.listWrap}>
      {/* Radio Header / Frequency & Status */}
      <View
        style={[
          styles.aiPromptBar,
          {
            borderColor: fg,
            backgroundColor: isPlaying ? fg : 'transparent',
            marginBottom: 4,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        ]}
      >
        <Text
          style={[
            styles.aiPromptTxt,
            { color: isPlaying ? bg : fg, fontWeight: '900' },
          ]}
        >
          {isPlaying ? '● ON AIR' : isLoading ? '◌ TUNING...' : '○ STANDBY'} [{channel.freq}]
        </Text>
        <Text
          style={[
            styles.aiPromptTxt,
            { color: isPlaying ? bg : fg, fontWeight: '800' },
          ]}
        >
          VOL {volPercent}%
        </Text>
      </View>

      {/* Big Station Display Card */}
      <View
        style={[
          styles.calcScreen,
          {
            borderColor: fg,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 4,
            height: 52,
            marginBottom: 4,
          },
        ]}
      >
        <Text
          style={[
            styles.clockDate,
            { color: fg, marginBottom: 1, letterSpacing: 1 },
          ]}
        >
          SomaFM CH {channelIdx + 1}/{totalChannels} • {channel.genre}
        </Text>
        <Text
          style={[
            styles.calcNum,
            { color: fg, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
          ]}
          numberOfLines={1}
        >
          {channel.name}
        </Text>
        <Text
          style={[
            styles.miniHint,
            { color: fg, fontSize: 7.5, opacity: 0.85, marginTop: 1 },
          ]}
          numberOfLines={1}
        >
          {channel.description}
        </Text>
      </View>

      {/* Live Now Playing Info & Visualizer */}
      <View
        style={[
          styles.aiChatBox,
          {
            borderColor: fg,
            paddingVertical: 3,
            paddingHorizontal: 6,
            marginBottom: 4,
            justifyContent: 'space-between',
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.miniHint,
              { color: fg, fontSize: 7.5, fontWeight: '900' },
            ]}
          >
            NOW PLAYING:
          </Text>
          <Text
            style={[
              styles.aiChatLine,
              { color: fg, fontSize: 9.5, lineHeight: 13 },
            ]}
            numberOfLines={1}
          >
            {song?.title || (isPlaying ? 'LIVE STREAMING...' : 'PRESS [A] TO TUNE IN')}
          </Text>
          {song?.artist ? (
            <Text
              style={[
                styles.miniHint,
                { color: fg, fontSize: 8, opacity: 0.9 },
              ]}
              numberOfLines={1}
            >
              BY: {song.artist}
            </Text>
          ) : null}
        </View>

        {/* Retro Spectrum Bars */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: 18,
            marginTop: 2,
            paddingHorizontal: 4,
          }}
        >
          {bars.map((maxH, i) => {
            const activeH = isPlaying
              ? Math.max(3, Math.min(18, Math.round(((Math.sin((os.uptime * 10) + i) + 1) / 2) * maxH + 3)))
              : 2;
            return (
              <View
                key={i}
                style={{
                  width: 7,
                  height: activeH,
                  backgroundColor: fg,
                  borderRadius: 1,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function renderCalc(os: RetroDeckOS, fg: string, bg: string) {
  if (os.isNumericDeckActive) {
    const opBtns: { label: string; key: string }[] = [
      { label: '+', key: '+' },
      { label: '-', key: '-' },
      { label: '×', key: '*' },
      { label: '÷', key: '/' },
      { label: '.', key: '.' },
      { label: '=', key: '=' },
    ];
    return (
      <View style={styles.calcWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.compTitle, { color: fg }]}>RETRODECK CALC</Text>
          <Text style={[styles.compBpm, { color: fg }]}>
            {os.calcOp ? `[OP: ${os.calcOp}]` : '[NUM PAD]'}
          </Text>
        </View>
        <View
          style={[
            styles.swBox,
            {
              borderColor: fg,
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingHorizontal: 14,
              marginBottom: 6,
            },
          ]}
        >
          {os.calcAcc !== null && os.calcOp ? (
            <Text style={[styles.miniHint, { color: fg, opacity: 0.75, marginBottom: 2 }]}>
              {os.calcAcc} {os.calcOp}
            </Text>
          ) : null}
          <Text
            style={[
              styles.clockBig,
              {
                color: fg,
                fontSize: os.calcDisplay.length > 9 ? 18 : 26,
                letterSpacing: 1,
              },
            ]}
            numberOfLines={1}
          >
            {os.calcDisplay}
          </Text>
        </View>
        {/* Single-row touchable operators (+, -, ×, ÷, ., =) */}
        <View style={{ flexDirection: 'row', gap: 4, height: 26, marginBottom: 2 }}>
          {opBtns.map((op) => {
            const active = os.calcOp === op.key;
            return (
              <Pressable
                key={op.key}
                onPress={() => {
                  os.pressCalcKey(op.key);
                  os.cb.onPlaySound?.('hit');
                }}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: fg,
                  backgroundColor: active ? fg : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    styles.compKeyTxt,
                    { color: active ? bg : fg, fontSize: 10 },
                  ]}
                >
                  {op.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.calcWrap}>
      <View style={[styles.calcScreen, { borderColor: fg }]}>
        <Text style={[styles.calcModeTag, { color: fg }]}>
          {os.calcOp ? `OP: ${os.calcOp}` : 'CALC'}
        </Text>
        <Text style={[styles.calcNum, { color: fg }]} numberOfLines={1}>
          {os.calcDisplay}
        </Text>
      </View>
      <View style={styles.calcGrid}>
        {CALC_KEYS.map((row, r) => (
          <View key={r} style={styles.calcRow}>
            {row.map((k, c) => {
              const sel = r === os.calcR && c === os.calcC;
              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.calcKey5,
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

export function renderClock(os: RetroDeckOS, fg: string, bg: string) {
  const d = new Date();
  const hours = d.getHours();
  const mins = d.getMinutes();
  const secs = d.getSeconds();
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;

  return (
    <View style={styles.listWrap}>
      <View style={styles.aiTabsRow}>
        {[
          { id: 'clk', label: '1.CLOCK' },
          { id: 'sw', label: '2.STOPWATCH' },
          { id: 'cd', label: '3.TIMER' },
        ].map((t) => {
          const active = os.clockTab === t.id;
          return (
            <View
              key={t.id}
              style={[
                styles.aiTabPill,
                { borderColor: fg, backgroundColor: active ? fg : 'transparent' },
              ]}
            >
              <Text style={[styles.aiTabTxt, { color: active ? bg : fg }]}>
                {t.label}
              </Text>
            </View>
          );
        })}
      </View>

      {os.clockTab === 'clk' ? (
        <View style={styles.centerBox}>
          {os.clockFace === 'analog' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
              {renderAnalogDial(fg, 84)}

              {/* Digital & Date Side Readout */}
              <View style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
                <Text style={[styles.swLbl, { color: fg, opacity: 0.75 }]}>ANALOG WATCH</Text>
                <Text style={[styles.swTime, { color: fg, fontSize: 16 }]}>
                  {hh}:{mm}:{ss}
                </Text>
                <Text style={[styles.clockDate, { color: fg, marginTop: 2, marginBottom: 0 }]}>
                  {dateStr}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.swBox, { borderColor: fg }]}>
              <Text style={[styles.swLbl, { color: fg }]}>DIGITAL WATCH</Text>
              <Text style={[styles.clockBig, { color: fg }]}>
                {hh}:{mm}:{ss}
              </Text>
              <Text style={[styles.clockDate, { color: fg, marginBottom: 0 }]}>
                {dateStr}
              </Text>
            </View>
          )}
          <Text style={[styles.miniHint, { color: fg }]}>
            [A] {os.clockFace === 'analog' ? 'DIGITAL' : 'ANALOG'} • [◀/▶] TABS • ALSO IN SETUP
          </Text>
        </View>
      ) : (
        <View style={styles.centerBox}>
          <Text style={[styles.clockDate, { color: fg }]}>
            TIME {hh}:{mm}:{ss}
          </Text>
          {os.clockTab === 'sw' ? (
            <View style={[styles.swBox, { borderColor: fg }]}>
              <Text style={[styles.swLbl, { color: fg }]}>
                STOPWATCH {os.swRunning ? '[RUN]' : '[STOP]'}
              </Text>
              <Text style={[styles.swTime, { color: fg }]}>{os.swTime.toFixed(2)}s</Text>
              {os.swLap > 0 && (
                <Text style={[styles.swLap, { color: fg }]}>LAP: {os.swLap.toFixed(2)}s</Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.swBox,
                {
                  borderColor: fg,
                  backgroundColor: os.cdAlarmActive ? fg : 'transparent',
                },
              ]}
            >
              <Text style={[styles.swLbl, { color: os.cdAlarmActive ? bg : fg }]}>
                {os.cdAlarmActive
                  ? '((( TIME UP! ALARM )))'
                  : `COUNTDOWN (${os.cdPresetSec}s)`}
              </Text>
              <Text style={[styles.swTime, { color: os.cdAlarmActive ? bg : fg }]}>
                {os.cdRemaining.toFixed(1)}s
              </Text>
            </View>
          )}
          <Text style={[styles.miniHint, { color: fg }]}>
            {os.clockTab === 'sw'
              ? '[A] START/STOP • [▲] RESET • [▼] LAP'
              : '[A] START/STOP • [▲] +15S • [▼] -5S'}
          </Text>
        </View>
      )}
    </View>
  );
}

export function renderSynth(os: RetroDeckOS, fg: string, bg: string) {
  const isPro = os.cb.getIsPro?.() ?? false;

  if (os.synthMode === 'list') {
    const visibleCount = 6;
    const start = Math.max(0, Math.min(os.songs.length - visibleCount, os.synthListIdx - 2));
    const slice = os.songs.slice(start, start + visibleCount);
    const selCustom = os.isCustomTune(os.synthListIdx);

    return (
      <View style={styles.listWrap}>
        <View style={styles.compHeader}>
          <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
            TUNES ({os.synthListIdx + 1}/{os.songs.length})
          </Text>
          <Text style={[styles.listMeta, { color: fg }]}>
            {os.synthClearConfirm
              ? 'PRESS [▶] CONFIRM'
              : selCustom
              ? '[▶]x2 CLEAR'
              : '[A] SELECT'}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-start', marginTop: 3 }}>
          {slice.map((s, i) => {
            const realIdx = start + i;
            const sel = realIdx === os.synthListIdx;
            const custom = os.isCustomTune(realIdx);
            const locked = custom && !isPro;
            const noteCount = s.notes.trim().split(/\s+/).filter(Boolean).length;
            const isRing = realIdx === os.ringtoneIdx;
            return (
              <View
                key={`${s.title}-${realIdx}`}
                style={[
                  styles.listRow,
                  { backgroundColor: sel ? fg : 'transparent', borderColor: fg },
                ]}
              >
                <Text style={[styles.listTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                  {String(realIdx + 1).padStart(2, '0')}. {s.title.trim()}
                  {isRing ? ' [RING]' : ''}
                </Text>
                <Text style={[styles.listMeta, { color: sel ? bg : fg }]}>
                  {locked ? '[PRO]' : custom ? `${noteCount}N` : `${s.bpm}BPM`}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.miniHint, { color: fg, textAlign: 'center', marginTop: 2 }]} numberOfLines={1}>
          {os.synthClearConfirm
            ? 'PRESS [▶] AGAIN TO CLEAR ALL NOTES!'
            : '[▲/▼] SEL • [A] LOAD • [◀] RENAME • [▶]x2 CLR'}
        </Text>
      </View>
    );
  }

  const curSong = os.songs[os.songIdx];
  const isCustom = os.isCustomTune();
  const isLocked = isCustom && !isPro;
  const tokens = curSong.notes.trim().split(/\s+/).filter(Boolean);

  let activeNoteIdx = -1;
  if (os.melodyPlaying) {
    for (let i = 0; i < os.melodyEvents.length; i++) {
      const ev = os.melodyEvents[i];
      if (
        os.melodyTimer >= ev.startSec &&
        os.melodyTimer < ev.startSec + ev.durationSec
      ) {
        activeNoteIdx = i;
        break;
      }
    }
  }

  return (
    <View style={styles.listWrap}>
      <View style={styles.compHeader}>
        <Text style={[styles.compTitle, { color: fg }]} numberOfLines={1}>
          ♪ {os.songIdx + 1}/{os.songs.length} {curSong.title.trim()}
          {os.songIdx === os.ringtoneIdx ? ' [RING]' : ''}
        </Text>
        <Text style={[styles.compBpm, { color: fg }]}>
          {isLocked ? '[PRO]' : (os.melodyPlaying ? 'PLAYING' : (isCustom ? 'SAVED' : `${curSong.bpm}BPM`))}
        </Text>
      </View>

      <View style={[styles.compStaff, { borderColor: fg }]}>
        <View style={styles.compTokensWrap}>
          {isLocked ? (
            <Text style={[styles.compTokTxt, { color: fg }]}>
              PRO REQUIRED TO COMPOSE & SAVE CUSTOM TUNES
            </Text>
          ) : (
            <>
              {tokens.slice(0, 18).map((tok, idx) => {
                const isPlaying = idx === activeNoteIdx;
                return (
                  <View
                    key={idx}
                    style={[styles.compTokPill, isPlaying && { backgroundColor: fg }]}
                  >
                    <Text style={[styles.compTokTxt, { color: isPlaying ? bg : fg }]}>
                      {tok}
                    </Text>
                  </View>
                );
              })}
              {tokens.length === 0 && (
                <Text style={[styles.compTokTxt, { color: fg }]}>
                  {isCustom
                    ? '(EMPTY SLOT - TAP NOTES TO COMPOSE & AUTO-SAVE)'
                    : '(EMPTY - TAP NOTES BELOW TO COMPOSE)'}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.compKeypad}>
        {COMPOSER_KEYS.map((item, idx) => {
          const sel = idx === os.synthIdx;
          const label =
            item.token === 'PLAY' && os.melodyPlaying ? '■ STOP' : item.label;
          return (
            <View
              key={idx}
              style={[
                styles.compKey,
                { borderColor: fg, backgroundColor: sel ? fg : 'transparent' },
              ]}
            >
              <Text style={[styles.compKeyTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function renderPaint(os: RetroDeckOS, fg: string, bg: string) {
  return (
    <View style={styles.centerBox}>
      <View style={[styles.paintBoard, { borderColor: fg }]}>
        {os.paintGrid.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((on, c) => {
              const isCur = r === os.paintR && c === os.paintC;
              return (
                <View
                  key={c}
                  style={{
                    width: 15,
                    height: 15,
                    backgroundColor: on ? fg : bg,
                    borderWidth: isCur ? 2 : 0.3,
                    borderColor: isCur ? (on ? bg : fg) : fg,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Text style={[styles.miniHint, { color: fg }]}>
        POS ({os.paintC},{os.paintR}) • [A] TOGGLE PIXEL
      </Text>
    </View>
  );
}

export function renderWeather(os: RetroDeckOS, fg: string, bg: string) {
  const data = os.weatherData;
  const cond = data ? decodeWmoWeather(data.code) : { label: 'SYNCING...', sprite: 'CLOUD' as WeatherSpriteKey };
  const spans = WEATHER_SPRITES[cond.sprite];
  const dayTags = ['TOM', 'D+2', 'D+3'];

  return (
    <View style={styles.listWrap}>
      <View style={[styles.compHeader, { marginBottom: 4 }]}>
        <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
          {data
            ? `◀ ${data.city}${data.region ? `, ${data.region}` : ''}${
                data.country ? `, ${data.country}` : ''
              } ▶`
            : `◀ ${os.weatherQuery.toUpperCase()} ▶`}
        </Text>
        <Text style={[styles.listMeta, { color: fg }]}>
          {os.weatherLoading ? 'FETCH...' : 'OPEN-METEO'}
        </Text>
      </View>

      {os.weatherError ? (
        <View style={[styles.swBox, { borderColor: fg, flex: 1, justifyContent: 'center', width: '100%' }]}>
          <Text style={[styles.subHeader, { color: fg }]}>{os.weatherError}</Text>
          <Text style={[styles.miniHint, { color: fg }]}>
            [▲] RETRY   •   [◀/▶] CHANGE CITY   •   [A] KBD
          </Text>
        </View>
      ) : !data ? (
        <View style={[styles.swBox, { borderColor: fg, flex: 1, justifyContent: 'center', width: '100%' }]}>
          <Text style={[styles.subHeader, { color: fg }]}>
            {os.weatherLoading ? 'LOADING WEATHER...' : 'PRESS [▲] TO FETCH'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Hero Current Forecast Box with 60 FPS Pixel LCD Animations */}
          {(() => {
            const t = os.uptime;
            const isStorm = cond.sprite === 'STORM';
            const lightningFlash = isStorm && (t % 2.8) < 0.12;
            const boxFg = lightningFlash ? bg : fg;
            const boxBg = lightningFlash ? fg : 'transparent';

            const spriteDx =
              cond.sprite === 'CLOUD'
                ? Math.round(Math.sin(t * 1.4) * 3)
                : cond.sprite === 'RAIN' || cond.sprite === 'STORM'
                ? Math.round(Math.sin(t * 2.2) * 1.5)
                : 0;
            const spriteDy =
              cond.sprite === 'SUN'
                ? Math.round(Math.sin(t * 2.6) * 1.5)
                : cond.sprite === 'SNOW'
                ? Math.round(Math.sin(t * 1.8) * 1)
                : 0;

            return (
              <View
                style={[
                  styles.swBox,
                  {
                    borderColor: fg,
                    backgroundColor: boxBg,
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginBottom: 4,
                    overflow: 'hidden',
                  },
                ]}
              >
                <View style={{ width: 48, height: 36, position: 'relative', overflow: 'hidden' }}>
                  {spans.map((sp) => (
                    <View
                      key={sp.key}
                      style={{
                        position: 'absolute',
                        left: sp.x + spriteDx,
                        top: sp.y + spriteDy,
                        width: sp.w,
                        height: sp.h,
                        backgroundColor: boxFg,
                      }}
                    />
                  ))}

                  {/* SUN: twinkling outer ray pixels */}
                  {cond.sprite === 'SUN' &&
                    [0, 1, 2, 3].map((i) => {
                      const angle = t * 1.8 + (i * Math.PI) / 2;
                      const rx = Math.round(23 + Math.cos(angle) * 20);
                      const ry = Math.round(17 + Math.sin(angle) * 15);
                      return (
                        <View
                          key={`ray-${i}`}
                          style={{
                            position: 'absolute',
                            left: rx,
                            top: ry,
                            width: 2,
                            height: 2,
                            backgroundColor: boxFg,
                            opacity: Math.sin(t * 6 + i) > -0.2 ? 1 : 0.25,
                          }}
                        />
                      );
                    })}

                  {/* CLOUD: drifting secondary pixel wisp */}
                  {cond.sprite === 'CLOUD' && (
                    <View
                      style={{
                        position: 'absolute',
                        left: Math.round(((t * 8) % 56) - 10),
                        top: 28,
                        width: 12,
                        height: 3,
                        backgroundColor: boxFg,
                        opacity: 0.7,
                      }}
                    />
                  )}

                  {/* RAIN & STORM: falling pixel raindrops */}
                  {(cond.sprite === 'RAIN' || cond.sprite === 'STORM') &&
                    [0, 1, 2, 3, 4, 5].map((i) => {
                      const speed = cond.sprite === 'STORM' ? 42 : 28;
                      const dropX = 6 + i * 7;
                      const dropY = 20 + Math.round(((t * speed + i * 5.3) % 16));
                      return (
                        <View
                          key={`drop-${i}`}
                          style={{
                            position: 'absolute',
                            left: dropX,
                            top: dropY,
                            width: 2,
                            height: 4,
                            backgroundColor: boxFg,
                          }}
                        />
                      );
                    })}

                  {/* SNOW: drifting pixel snowflakes */}
                  {cond.sprite === 'SNOW' &&
                    [0, 1, 2, 3, 4, 5, 6].map((i) => {
                      const fallY = Math.round(((t * 14 + i * 5.7) % 34));
                      const swayX = Math.round(4 + i * 6 + Math.sin(t * 2.5 + i * 1.4) * 3);
                      return (
                        <View
                          key={`snow-${i}`}
                          style={{
                            position: 'absolute',
                            left: swayX,
                            top: fallY,
                            width: 2,
                            height: 2,
                            backgroundColor: boxFg,
                          }}
                        />
                      );
                    })}
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.clockBig, { color: boxFg, fontSize: 24, lineHeight: 26 }]}>
                    {data.tempC}°C
                  </Text>
                  <Text style={[styles.swLbl, { color: boxFg }]}>{cond.label}</Text>
                  <Text style={[styles.miniHint, { color: boxFg, marginTop: 2 }]}>
                    FL {data.feelsC}°  •  WIND {data.windKmh}KM/H  •  HUM {data.humidity}%
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* 3-Day Mini Forecast */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {data.daily.map((d, i) => {
              const dc = decodeWmoWeather(d.code);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: fg,
                    paddingVertical: 4,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                  }}
                >
                  <Text style={[styles.swLbl, { color: fg }]}>{dayTags[i]}</Text>
                  <Text style={[styles.miniHint, { color: fg, marginTop: 1 }]} numberOfLines={1}>
                    {dc.sprite}
                  </Text>
                  <Text style={[styles.swLbl, { color: fg, marginTop: 1 }]}>
                    {d.minC}°/{d.maxC}°
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export function renderNotes(os: RetroDeckOS, fg: string, bg: string) {
  const total = os.notes.length;
  const selected = total > 0 ? os.notes[os.noteIdx] : null;
  const start = Math.max(0, Math.min(os.noteIdx - 1, Math.max(0, total - 3)));
  const visible = os.notes.slice(start, start + 3);

  return (
    <View style={styles.listWrap}>
      <View style={[styles.compHeader, { marginBottom: 4 }]}>
        <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
          PIXEL NOTES ({total})
        </Text>
        <Text style={[styles.listMeta, { color: fg }]}>
          {os.noteDeleteConfirm ? 'PRESS [▶] CONFIRM DEL' : '[A] +NEW'}
        </Text>
      </View>

      {/* Preview Box of Selected Note */}
      <View
        style={[
          styles.swBox,
          {
            borderColor: fg,
            width: '100%',
            alignItems: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginBottom: 5,
            minHeight: 46,
            justifyContent: 'center',
          },
        ]}
      >
        {selected ? (
          <>
            <Text style={[styles.miniHint, { color: fg, opacity: 0.75, marginTop: 0 }]}>
              [{selected.ts}] NOTE #{os.noteIdx + 1}
            </Text>
            <Text style={[styles.listTxt, { color: fg, flex: 0, marginTop: 2 }]} numberOfLines={2}>
              {selected.text}
            </Text>
          </>
        ) : (
          <Text style={[styles.emptyTxt, { color: fg, marginTop: 0 }]}>
            NO NOTES YET. PRESS [A] TO WRITE!
          </Text>
        )}
      </View>

      {/* Scrollable Note Index */}
      {visible.map((note, idx) => {
        const absIdx = start + idx;
        const sel = absIdx === os.noteIdx;
        return (
          <View
            key={note.id}
            style={[styles.listRow, { backgroundColor: sel ? fg : 'transparent' }]}
          >
            <Text style={[styles.listTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
              {sel ? '> ' : '  '}
              {note.text}
            </Text>
            <Text style={[styles.listMeta, { color: sel ? bg : fg }]}>{note.ts}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function renderStats(os: RetroDeckOS, fg: string, _bg: string) {
  const carts = os.cb.getCartridges();
  const scores = os.cb.getHighScores();
  const entries = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalPts = entries.reduce((acc, [, v]) => acc + v, 0);
  const top4 = entries.slice(0, 4);

  return (
    <View style={styles.listWrap}>
      <Text style={[styles.subHeader, { color: fg }]}>
        PLAYED: {entries.length}/{carts.length}   TOTAL: {totalPts}
      </Text>
      <View style={[styles.statRule, { backgroundColor: fg }]} />
      {top4.length === 0 ? (
        <Text style={[styles.emptyTxt, { color: fg }]}>
          NO HIGH SCORES YET. PLAY A GAME!
        </Text>
      ) : (
        top4.map(([id, val], idx) => {
          const title = carts.find((c) => c.id === id)?.title || id;
          return (
            <View key={id} style={styles.listRow}>
              <Text style={[styles.listTxt, { color: fg }]}>
                #{idx + 1} {title}
              </Text>
              <Text style={[styles.listMeta, { color: fg }]}>{val}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

export function renderTerm(os: RetroDeckOS, fg: string, bg: string) {
  const visibleLines = os.termShowLogo
    ? os.termOut.slice(0, 6)
    : os.termOut.slice(os.termScroll, os.termScroll + 6);

  return (
    <View style={styles.listWrap}>
      {/* Full-Screen Scrollable Unix Terminal Output */}
      <View
        style={[
          styles.termScreen,
          {
            borderColor: fg,
            flexDirection: 'row',
            alignItems: 'center',
          },
        ]}
      >
        {os.termShowLogo && (
          <View style={[styles.neoConsole, { borderColor: fg }]}>
            <View style={[styles.neoLcd, { borderColor: fg, backgroundColor: fg }]}>
              <Text style={[styles.neoLcdTxt, { color: bg }]}>RD-OS</Text>
            </View>
            <View style={styles.neoControls}>
              <View style={styles.neoDpad}>
                <View style={[styles.neoDpadV, { backgroundColor: fg }]} />
                <View style={[styles.neoDpadH, { backgroundColor: fg }]} />
              </View>
              <View style={styles.neoBtns}>
                <View style={[styles.neoBtnDot, { backgroundColor: fg }]} />
                <View style={[styles.neoBtnDot, { backgroundColor: fg, marginTop: -4 }]} />
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          {visibleLines.map((line, i) => (
            <Text key={i} style={[styles.termLine, { color: fg }]} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      {/* Live Interactive Shell Prompt Bar */}
      <View style={[styles.aiPromptBar, { borderColor: fg, backgroundColor: fg }]}>
        <Text style={[styles.aiPromptTxt, { color: bg }]} numberOfLines={1}>
          {`root@rd:${os.termCwd}$ ${os.termInput || '(PRESS [A]/[KBD] OR ◀/▶)_'}`}
        </Text>
      </View>
    </View>
  );
}
