import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { PALETTE_ORDER, RETRO_PALETTES, isPaletteProLocked } from '../../theme/palettes';
import { RetroAudioEngine, KEYPAD_SOUND_STYLES } from '../../audio/RetroAudioEngine';
import { somaRadioService } from '../../services/somaRadioService';
import { styles } from '../retroOsStyles';
import { DESKTOP_ICONS, NOKIA_OPERATORS, NOKIA_PROFILES } from '../retroOsData';
import type { RetroDeckOS } from '../RetroDeckOS';

export function renderAnalogDial(fg: string, dialSize = 84) {
  const d = new Date();
  const hours = d.getHours();
  const mins = d.getMinutes();
  const secs = d.getSeconds();
  const secDeg = secs * 6;
  const minDeg = mins * 6 + secs * 0.1;
  const hourDeg = ((hours % 12) * 30) + mins * 0.5;
  const center = dialSize / 2;
  const scale = dialSize / 84;

  return (
    <View
      style={{
        width: dialSize,
        height: dialSize,
        borderRadius: center,
        borderWidth: 2,
        borderColor: fg,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r = center - 6;
        const isMajor = i % 3 === 0;
        const dotSize = isMajor ? 4 : 2;
        const tx = center + Math.cos(angle) * r - dotSize / 2 - 2;
        const ty = center + Math.sin(angle) * r - dotSize / 2 - 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: tx,
              top: ty,
              width: dotSize,
              height: dotSize,
              backgroundColor: fg,
            }}
          />
        );
      })}

      {/* Hour Hand */}
      <View
        style={{
          position: 'absolute',
          width: 3,
          height: Math.round(20 * scale),
          backgroundColor: fg,
          borderRadius: 1.5,
          transform: [
            { rotate: `${hourDeg}deg` },
            { translateY: -Math.round(9 * scale) },
          ],
        }}
      />

      {/* Minute Hand */}
      <View
        style={{
          position: 'absolute',
          width: 2,
          height: Math.round(29 * scale),
          backgroundColor: fg,
          borderRadius: 1,
          transform: [
            { rotate: `${minDeg}deg` },
            { translateY: -Math.round(13 * scale) },
          ],
        }}
      />

      {/* Second Hand */}
      <View
        style={{
          position: 'absolute',
          width: 1,
          height: Math.round(33 * scale),
          backgroundColor: fg,
          opacity: 0.85,
          transform: [
            { rotate: `${secDeg}deg` },
            { translateY: -Math.round(14 * scale) },
          ],
        }}
      />

      {/* Center Pivot */}
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: fg,
        }}
      />
    </View>
  );
}

/** Renders retro LCD antenna mast, 4 stepped cellular signal bars, and operator name */
export function renderStatusLeft(os: RetroDeckOS, ink: string): React.ReactNode {
  const signalBars = (Math.floor(os.uptime / 4) + os.operatorIdx) % 7 === 0 ? 3 : 4;
  const barHeights = [3, 5, 7, 9];

  return (
    <View style={styles.osBarLeft}>
      <View style={styles.sigMeter}>
        <View style={styles.sigAnt}>
          <View style={[styles.sigAntWingL, { backgroundColor: ink }]} />
          <View style={[styles.sigAntWingR, { backgroundColor: ink }]} />
          <View style={[styles.sigAntBridge, { backgroundColor: ink }]} />
          <View style={[styles.sigAntStem, { backgroundColor: ink }]} />
        </View>
        {barHeights.map((h, idx) => (
          <View
            key={idx}
            style={[
              styles.sigBar,
              {
                height: h,
                backgroundColor: ink,
                opacity: idx < signalBars ? 1 : 0.25,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.osBarTxt, { color: ink }]} numberOfLines={1}>
        {NOKIA_OPERATORS[os.operatorIdx]}
      </Text>
    </View>
  );
}

/** Renders live audio/radio badge, battery percentage, and 4-cell pixel LCD battery icon */
export function renderStatusRight(os: RetroDeckOS, ink: string): React.ReactNode {
  const isMuted = RetroAudioEngine.getMuted() || NOKIA_PROFILES[os.profileIdx] === 'SILENT';
  const isRadio = somaRadioService.getIsPlaying();
  const isPro = os.cb.getIsPro?.() ?? false;
  const pct = os.batteryPct;
  const filledCells =
    pct === null
      ? 4
      : pct <= 5
      ? 0
      : pct <= 25
      ? 1
      : pct <= 50
      ? 2
      : pct <= 75
      ? 3
      : 4;

  return (
    <View style={styles.osBarRight}>
      {(os.smsBannerTimer > 0 || os.unreadSmsCount > 0) && (
        <Ionicons name="mail" size={10} color={ink} style={{ marginRight: 2 }} />
      )}
      {isPro && (
        <Text style={[styles.osBarTxt, { color: ink, fontSize: 8 }]}>PRO</Text>
      )}
      {isMuted && <Ionicons name="volume-mute" size={10} color={ink} />}
      {!isMuted && isRadio && <Ionicons name="musical-notes" size={10} color={ink} />}
      {os.batteryCharging && <Ionicons name="flash" size={9} color={ink} />}
      {pct !== null && (
        <Text style={[styles.osBarTxt, { color: ink }]}>{pct}%</Text>
      )}
      <View style={styles.batWrap}>
        <View style={[styles.batShell, { borderColor: ink }]}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.batCell,
                {
                  backgroundColor: idx < filledCells ? ink : 'transparent',
                  opacity: pct === null ? 0.55 : 1,
                },
              ]}
            />
          ))}
        </View>
        <View style={[styles.batNub, { backgroundColor: ink }]} />
      </View>
    </View>
  );
}

export function renderDesktop(os: RetroDeckOS, fg: string, bg: string) {
  const cols = 4;
  const rows = Math.ceil(DESKTOP_ICONS.length / cols);

  return (
    <View style={styles.deskGrid}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.deskRow}>
          {Array.from({ length: cols }, (_, c) => {
            const idx = r * cols + c;
            const item = DESKTOP_ICONS[idx];
            if (!item) {
              return <View key={`sp-${c}`} style={styles.deskTileSpacer} />;
            }
            const sel = idx === os.deskIdx;
            const iconColor = sel ? bg : fg;
            return (
              <View
                key={item.id}
                style={[
                  styles.deskTile,
                  {
                    borderColor: fg,
                    backgroundColor: sel ? fg : 'transparent',
                  },
                ]}
              >
                <Ionicons name={item.icon} size={16} color={iconColor} />
                <Text style={[styles.deskLbl, { color: iconColor }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function renderArcadeBrowser(os: RetroDeckOS, fg: string, bg: string) {
  const carts = os.cb.getCartridges();
  const scores = os.cb.getHighScores();
  const isPro = os.cb.getIsPro?.() ?? false;
  const visibleCount = 7;
  const start = Math.max(0, Math.min(carts.length - visibleCount, os.gameIdx - 3));
  const slice = carts.slice(start, start + visibleCount);

  return (
    <View style={styles.listWrap}>
      <Text style={[styles.subHeader, { color: fg }]}>
        CARTRIDGE BAY ({os.gameIdx + 1}/{carts.length})  ◀/▶ ±5
      </Text>
      {slice.map((c, i) => {
        const realIdx = start + i;
        const sel = realIdx === os.gameIdx;
        const hs = scores[c.id] || 0;
        const locked = isCartridgeProLocked(c.id, isPro);
        return (
          <View
            key={c.id}
            style={[
              styles.listRow,
              { backgroundColor: sel ? fg : 'transparent', borderColor: fg },
            ]}
          >
            <Text style={[styles.listTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
              {String(realIdx + 1).padStart(3, '0')}. {c.title}
            </Text>
            <Text style={[styles.listMeta, { color: sel ? bg : fg }]}>
              {locked ? '[PRO]' : (hs > 0 ? `HI:${hs}` : c.genre.slice(0, 6))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function renderSetup(os: RetroDeckOS, fg: string, bg: string) {
  const isPro = os.cb.getIsPro?.() ?? false;
  const items = [
    isPro ? '★ RETRODECK PRO: ACTIVE' : '★ UPGRADE: RETRODECK PRO',
    `PALETTE: ${os.cb.getPaletteName()}`,
    `CRT SCANLINES: ${os.cb.getScanlines() ? 'ON' : 'OFF'}`,
    `CLOCK FACE: ${os.clockFace.toUpperCase()}`,
    `LIVE AI SMS: ${os.liveAiSmsEnabled ? 'ON' : 'OFF'}`,
    'OPEN FULL CARTRIDGE VAULT',
    'REBOOT RETRODECK OS',
  ];

  // Virtual windowed scroll: show 5 items tightly and naturally stacked
  const PAGE_SIZE = 5;
  const maxStart = Math.max(0, items.length - PAGE_SIZE);
  const startIdx = Math.max(0, Math.min(os.setupIdx - 2, maxStart));
  const visibleItems = items.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <View style={styles.listWrap}>
      <View style={[styles.compHeader, { marginBottom: 3 }]}>
        <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
          SYSTEM SETUP
        </Text>
        <Text style={[styles.listMeta, { color: fg }]}>
          {os.setupIdx + 1}/{items.length}
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-start' }}>
        {visibleItems.map((label, i) => {
          const actualIdx = startIdx + i;
          const sel = actualIdx === os.setupIdx;
          const isProRow = actualIdx === 0;
          return (
            <View
              key={label}
              style={[
                styles.setupRow,
                {
                  borderColor: fg,
                  backgroundColor: sel ? fg : 'transparent',
                  marginBottom: 3,
                  paddingVertical: 3.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.setupTxt,
                  { color: sel ? bg : fg },
                  isProRow && { fontWeight: '900' },
                ]}
                numberOfLines={1}
              >
                {sel ? '▶ ' : '  '}
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, height: 12 }}>
        <Text style={[styles.miniHint, { color: fg, marginTop: 0, opacity: startIdx > 0 ? 0.9 : 0.2 }]}>
          ▲ PREV
        </Text>
        <Text style={[styles.miniHint, { color: fg, marginTop: 0, opacity: startIdx < maxStart ? 0.9 : 0.2 }]}>
          ▼ MORE
        </Text>
      </View>
    </View>
  );
}

export function renderThemes(os: RetroDeckOS, fg: string, bg: string) {
  const isPro = os.cb.getIsPro?.() ?? false;
  const activeId = os.cb.getPaletteId?.();
  const visibleCount = 7;
  const start = Math.max(0, Math.min(PALETTE_ORDER.length - visibleCount, os.themeIdx - 3));
  const slice = PALETTE_ORDER.slice(start, start + visibleCount);

  return (
    <View style={styles.listWrap}>
      <Text style={[styles.subHeader, { color: fg }]}>
        THEMES ({os.themeIdx + 1}/{PALETTE_ORDER.length})  ◀/▶ ±5
      </Text>
      {slice.map((id, i) => {
        const realIdx = start + i;
        const t = RETRO_PALETTES[id];
        const sel = realIdx === os.themeIdx;
        const active = id === activeId;
        const locked = isPaletteProLocked(id, isPro);
        return (
          <View
            key={id}
            style={[
              styles.listRow,
              { backgroundColor: sel ? fg : 'transparent', borderColor: fg },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4, gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: t.screenBg,
                  borderWidth: 1,
                  borderColor: sel ? bg : fg,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: 4, height: 4, backgroundColor: t.pixelOn }} />
              </View>
              <Text style={[styles.listTxt, { color: sel ? bg : fg }]} numberOfLines={1}>
                {String(realIdx + 1).padStart(3, '0')}. {t.name}
              </Text>
            </View>
            <Text style={[styles.listMeta, { color: sel ? bg : fg }]}>
              {active ? 'ACTIVE' : (locked ? '[PRO]' : t.category.slice(0, 6))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function renderPro(os: RetroDeckOS, fg: string, bg: string) {
  const isPro = os.cb.getIsPro?.() ?? false;
  const expiration = os.cb.getProExpirationDate?.();
  const pkgs = os.cb.getProPackages?.() ?? [
    { type: 'monthly', title: 'MONTHLY ACCESS', priceString: '$2.99 / MO', badge: 'FLEXIBLE' },
    { type: 'yearly', title: 'YEARLY PASS', priceString: '$19.99 / YR', badge: 'SAVE 45%' },
    { type: 'lifetime', title: 'LIFETIME VIP', priceString: '$49.99', badge: 'BEST VALUE' },
  ];

  const menuItems = [
    ...pkgs.map((p) => ({
      id: p.type,
      label: p.title,
      price: p.priceString,
      badge: p.badge,
    })),
    {
      id: 'restore',
      label: 'RESTORE PURCHASES',
      price: 'SYNC ACCOUNT',
      badge: 'STORE',
    },
    {
      id: 'debug_reset',
      label: 'REVOKE PRO (DEBUG)',
      price: 'RESET TO FREE',
      badge: 'DEV',
    },
  ];

  return (
    <View style={[styles.listWrap, { paddingVertical: 2, paddingHorizontal: 4 }]}>
      {/* Header Bar */}
      <View style={[styles.compHeader, { marginBottom: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: fg }]}>
        <Text style={[styles.subHeader, { color: fg, marginBottom: 0, fontSize: 10, letterSpacing: 1 }]}>
          {isPro ? '★ RETRODECK PRO: ACTIVE' : '★ UPGRADE TO PRO'}
        </Text>
        <Text style={[styles.listMeta, { color: fg, fontSize: 8 }]}>
          {os.proIdx + 1}/{menuItems.length}
        </Text>
      </View>

      {/* Status / Perks Banner */}
      <View
        style={{
          borderWidth: 1,
          borderColor: fg,
          paddingVertical: 2,
          paddingHorizontal: 4,
          marginBottom: 3,
          backgroundColor: isPro ? fg : 'transparent',
        }}
      >
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 8,
            fontWeight: 'bold',
            color: isPro ? bg : fg,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {isPro
            ? (expiration ? `PRO VALID UNTIL: ${new Date(expiration).toLocaleDateString()}` : 'LIFETIME ALL-ACCESS UNLOCKED')
            : 'ALL 100 CARTS • DEV VAULT • PRO THEMES'}
        </Text>
      </View>

      {/* Package Rows */}
      <View style={{ flex: 1, justifyContent: 'flex-start' }}>
        {menuItems.map((item, idx) => {
          const sel = idx === os.proIdx;
          return (
            <View
              key={item.id}
              style={[
                styles.setupRow,
                {
                  borderColor: fg,
                  backgroundColor: sel ? fg : 'transparent',
                  marginBottom: 2,
                  paddingVertical: 2.5,
                  paddingHorizontal: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4 }}>
                <Text
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontSize: 9,
                    fontWeight: 'bold',
                    color: sel ? bg : fg,
                  }}
                  numberOfLines={1}
                >
                  {sel ? '▶ ' : '  '}
                  {item.label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.badge ? (
                  <Text
                    style={{
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      fontSize: 7,
                      color: sel ? bg : fg,
                      opacity: 0.85,
                      marginRight: 4,
                      borderWidth: 0.5,
                      borderColor: sel ? bg : fg,
                      paddingHorizontal: 2,
                    }}
                  >
                    {item.badge}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontSize: 8.5,
                    fontWeight: '900',
                    color: sel ? bg : fg,
                  }}
                >
                  {item.price}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Action Prompt / Status Message */}
      <View style={{ borderTopWidth: 1, borderTopColor: fg, paddingTop: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 7.5,
            fontWeight: 'bold',
            color: fg,
          }}
          numberOfLines={1}
        >
          {os.proStatusMsg
            ? os.proStatusMsg
            : (os.proIdx === 4
                ? '[A] RESET PRO STATUS (DEBUG)'
                : (os.proIdx === 3
                    ? '[A] RESTORE PURCHASES'
                    : (isPro ? '[A] PLAN DETAILS' : '[A] BUY SELECTED PLAN')))}
        </Text>
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 7.5,
            color: fg,
            opacity: 0.8,
          }}
        >
          [B] BACK
        </Text>
      </View>
    </View>
  );
}
