import React from 'react';
import { View, Text, Platform, Dimensions, PixelRatio, Image, Pressable, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { PALETTE_ORDER, RETRO_PALETTES, isPaletteProLocked } from '../../theme/palettes';
import { RetroAudioEngine, KEYPAD_SOUND_STYLES } from '../../audio/RetroAudioEngine';
import { somaRadioService } from '../../services/somaRadioService';
import { styles } from '../retroOsStyles';
import { DESKTOP_MENU_STYLES, DesktopMenuStyle, hexWithAlpha, NOKIA_OPERATORS, NOKIA_PROFILES, REAL_POSTCARDS, STARTUP_SOUND_OPTIONS } from '../retroOsData';
import { getDesktopLabel, pickLang, tOs } from '../../i18n/retroI18n';
import {
  getWinExplorerPalette,
  getWinVariant,
  isWinUiActive,
  renderWinAppIconTile,
} from './winChromeHelper';
import { renderNexusDesktop } from './renderNexusDesktop';
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
  const visibleIcons = os.getVisibleDesktopIcons();
  const safeDeskIdx = Math.max(0, Math.min(os.deskIdx, Math.max(0, visibleIcons.length - 1)));
  const cols = 4;
  const rows = 3;
  const pageSize = cols * rows; // 12 items per page for large, crisp retro icons
  const totalPages = Math.max(1, Math.ceil(visibleIcons.length / pageSize));
  const curPage = Math.min(totalPages - 1, Math.floor(safeDeskIdx / pageSize));
  const pageStart = curPage * pageSize;
  const winStyle = os.postFormatWinStyle;
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const renderPageStrip = (isWin: boolean) => {
    if (totalPages <= 1) return null;
    const stripBg = isWin
      ? 'rgba(0, 0, 0, 0.35)'
      : os.getActiveWallpaper()
      ? hexWithAlpha(bg, 0.78)
      : 'transparent';
    const stripBorder = isWin ? 'rgba(255,255,255,0.45)' : hexWithAlpha(fg, 0.45);
    const stripInk = isWin ? '#FFFFFF' : fg;

    return (
      <Pressable
        onPress={() => {
          const nextPage = (curPage + 1) % totalPages;
          os.deskIdx = nextPage * pageSize;
          os.cb.onPlaySound?.('hit');
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 6,
          paddingVertical: 1.5,
          borderWidth: 1,
          borderColor: stripBorder,
          backgroundColor: stripBg,
          borderRadius: 3,
        }}
      >
        <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: stripInk }}>
          {pickLang(os.lang, `PAGE ${curPage + 1}/${totalPages}`, `SAYFA ${curPage + 1}/${totalPages}`)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: totalPages }).map((_, p) => (
            <View
              key={p}
              style={{
                width: p === curPage ? 12 : 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: stripInk,
                opacity: p === curPage ? 1 : 0.35,
              }}
            />
          ))}
        </View>
      </Pressable>
    );
  };

  const isWinDesktop =
    Boolean(winStyle) ||
    os.menuStyle === 'windows' ||
    os.menuStyle === 'windows_7' ||
    os.menuStyle === 'windows_8';
  const activeWall = os.getActiveWallpaper();

  const renderWallBackdrop = () =>
    activeWall ? (
      <>
        <Image
          source={activeWall.image}
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: -6,
            bottom: -6,
            width: undefined,
            height: undefined,
          }}
          resizeMode="cover"
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: -6,
            bottom: -6,
            backgroundColor: bg,
            opacity: os.getWallpaperDimOpacity(),
          }}
        />
      </>
    ) : null;

  if (!winStyle && os.menuStyle === 'nexus_os') {
    return renderNexusDesktop(os, fg, bg, renderWallBackdrop);
  }

  if (isWinDesktop) {
    const winVariant = getWinVariant(os);
    const isXp = winVariant === 'winxp';
    const isWin7 = winVariant === 'win7';
    const isWin8 = winVariant === 'win8';
    const isWin10 = winVariant === 'win10';
    const isWin11 = winVariant === 'win11';
    const isWin95 = winVariant === 'win95';

    const selHighlight = isXp
      ? '#2B65CE'
      : isWin7
      ? '#3898EC'
      : isWin8
      ? '#2D89EF'
      : isWin10
      ? '#0078D7'
      : isWin11
      ? '#0067C0'
      : '#000080';

    // WINDOWS 8 METRO START SCREEN (Vibrant Sharp-Edge Live Tiles Mosaic)
    if (isWin8) {
      const METRO_COLORS: Record<string, string> = {
        arcade: '#107C10',
        store: '#0078D7',
        phone: '#16A34A',
        sms: '#D80073',
        contacts: '#FA6800',
        ai: '#6A00FF',
        radio: '#E51400',
        calc: '#00ABA9',
        clock: '#1BA1E2',
        wallpapers: '#0D9488',
        profiles: '#8A2BE2',
        setup: '#647687',
        j2me: '#EA580C',
        wap: '#0284C7',
        synth: '#A200FF',
        paint: '#D80073',
        weather: '#1BA1E2',
        notes: '#E3C800',
        term: '#1E293B',
        stats: '#059669',
        format: '#0050EF',
        device: '#008A00',
      };

      const metroCols = 3;
      const metroRows = 3;
      const metroPageSize = metroCols * metroRows;
      const metroTotalPages = Math.max(1, Math.ceil(visibleIcons.length / metroPageSize));
      const metroCurPage = Math.min(metroTotalPages - 1, Math.floor(safeDeskIdx / metroPageSize));
      const metroStart = metroCurPage * metroPageSize;

      const getLiveBadge = (id: string): string | null => {
        if (id === 'arcade') return `${os.cb.getCartridges().length}`;
        if (id === 'store') return `${os.installedStoreApps.length}/10`;
        if (id === 'sms' && os.unreadSmsCount > 0) return `${os.unreadSmsCount}`;
        if (id === 'clock') return os.formatClock();
        if (id === 'weather' && os.weatherData) return `${Math.round(os.weatherData.tempC)}°`;
        return null;
      };

      return (
        <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', backgroundColor: '#25093D', paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'space-between' }]}>
          {renderWallBackdrop()}

          {/* Signature Windows 8 Metro Diagonal Geometric Facets */}
          {!activeWall && (
            <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: -10, bottom: -10 }}>
              <View style={{ position: 'absolute', top: -20, right: -30, width: 220, height: 140, backgroundColor: '#3B0E61', opacity: 0.65, transform: [{ rotate: '-18deg' }] }} />
              <View style={{ position: 'absolute', bottom: -30, left: -20, width: 200, height: 120, backgroundColor: '#4E147D', opacity: 0.45, transform: [{ rotate: '14deg' }] }} />
            </View>
          )}

          {/* Windows 8 Start Header: "Start" + Page + User Badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2, marginBottom: 2 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 12, fontWeight: '300', color: '#FFFFFF', letterSpacing: 0.6 }}>
              {pickLang(os.lang, 'Start', 'Baslangic')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  const nextPage = (metroCurPage + 1) % metroTotalPages;
                  os.deskIdx = nextPage * metroPageSize;
                  os.cb.onPlaySound?.('hit');
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 5, paddingVertical: 1 }}
              >
                <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', color: '#FFFFFF' }}>
                  {metroCurPage + 1}/{metroTotalPages}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>
                  RETRO_8
                </Text>
                <View style={{ width: 13, height: 13, backgroundColor: '#0078D7', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={8} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>

          {/* 3x3 Sharp-Edge Metro Live Tiles Grid */}
          <View style={{ flex: 1, gap: 4 }}>
            {Array.from({ length: metroRows }, (_, r) => (
              <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: metroCols }, (_, c) => {
                  const idx = metroStart + r * metroCols + c;
                  const item = visibleIcons[idx];
                  if (!item) {
                    return <View key={`sp-m-${c}`} style={{ flex: 1 }} />;
                  }
                  const sel = idx === safeDeskIdx;
                  const tileColor = METRO_COLORS[item.id] || '#0078D7';
                  const liveBadge = getLiveBadge(item.id);
                  const ink = item.id === 'notes' ? '#111827' : '#FFFFFF';

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        if (os.deskIdx !== idx) {
                          os.deskIdx = idx;
                          os.cb.onPlaySound?.('hit');
                        } else {
                          const s = os.launchDesktopApp(item.id);
                          os.cb.onPlaySound?.(s);
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: tileColor,
                        borderRadius: 0,
                        borderWidth: sel ? 2 : 1,
                        borderColor: sel ? '#FFFFFF' : 'rgba(255, 255, 255, 0.22)',
                        paddingHorizontal: 5,
                        paddingVertical: 4,
                        justifyContent: 'space-between',
                        transform: sel ? [{ scale: 1.03 }] : [],
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Ionicons name={item.icon} size={17} color={ink} />
                        {liveBadge && (
                          <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: ink, opacity: 0.92 }}>
                            {liveBadge}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: monoFont,
                          fontSize: 7.2,
                          fontWeight: '800',
                          color: ink,
                          letterSpacing: 0.2,
                        }}
                        numberOfLines={1}
                      >
                        {getDesktopLabel(item.id, item.label, os.lang)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.deskGrid, { position: 'relative' }]}>
        {/* Render custom wallpaper backdrop if active */}
        {renderWallBackdrop()}

        {/* 1) Windows XP: Authentic Bliss Meadow Backdrop (Sky + Soft Fluffy Clouds + Green Rolling Hills) */}
        {isXp && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, overflow: 'hidden' }}>
            {/* XP Sky Gradient Blocks */}
            <View style={{ height: '35%', backgroundColor: '#2B70DE' }} />
            <View style={{ height: '25%', backgroundColor: '#4C8EEB' }} />
            <View style={{ height: '40%', backgroundColor: '#75AFF7' }} />
            
            {/* XP Fluffy White Cloud Wisps */}
            <View style={{ position: 'absolute', top: 8, left: 14, width: 60, height: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)' }} />
            <View style={{ position: 'absolute', top: 14, left: 34, width: 44, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.85)' }} />
            <View style={{ position: 'absolute', top: 12, right: 28, width: 72, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.65)' }} />

            {/* XP Bliss Rolling Vivid Green Hills */}
            <View
              style={{
                position: 'absolute',
                left: -40,
                right: 30,
                bottom: -32,
                height: 80,
                borderRadius: 120,
                backgroundColor: '#4CB635',
                borderTopWidth: 2,
                borderTopColor: '#6ED64C',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 60,
                right: -50,
                bottom: -36,
                height: 76,
                borderRadius: 110,
                backgroundColor: '#359B20',
                borderTopWidth: 2,
                borderTopColor: '#4CB635',
              }}
            />
          </View>
        )}

        {/* 1b) Windows 7 Aero: Iconic Frutiger Aero Harmony Sky & Sweeping Glass Ribbons */}
        {isWin7 && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#0A4B86', overflow: 'hidden' }}>
            {/* Sky-to-lagoon layered depth */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '42%', backgroundColor: '#0E66B3', opacity: 0.9 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: '#0C759C', opacity: 0.75 }} />
            {/* Luminous sweeping Aero light ribbons */}
            <View
              style={{
                position: 'absolute',
                top: 22,
                left: -50,
                width: 340,
                height: 74,
                borderRadius: 48,
                backgroundColor: 'rgba(56, 189, 248, 0.28)',
                borderTopWidth: 1.5,
                borderTopColor: 'rgba(224, 242, 254, 0.55)',
                transform: [{ rotate: '-11deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 52,
                left: -20,
                width: 340,
                height: 60,
                borderRadius: 40,
                backgroundColor: 'rgba(110, 231, 183, 0.16)',
                borderTopWidth: 1,
                borderTopColor: 'rgba(186, 230, 253, 0.45)',
                transform: [{ rotate: '9deg' }],
              }}
            />
            {/* Soft sunlit Frutiger Aero glass bokeh orbs */}
            <View style={{ position: 'absolute', top: 10, right: 30, width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(186, 230, 253, 0.18)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' }} />
            <View style={{ position: 'absolute', bottom: 14, left: 26, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(125, 211, 252, 0.22)' }} />
            <View style={{ position: 'absolute', top: 64, right: 86, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.22)' }} />
          </View>
        )}

        {/* 2) Windows 95: Authentic Retro CRT #008080 Teal Solid Desktop */}
        {isWin95 && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#008080' }} />
        )}

        {/* 3) Windows 10: Iconic Dark Desktop with Windows Glowing Window Light Logo */}
        {isWin10 && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#0C0E14', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 140, height: 90, opacity: 0.18, flexDirection: 'row', flexWrap: 'wrap', gap: 6, transform: [{ skewY: '-12deg' }] }}>
              <View style={{ width: 62, height: 38, backgroundColor: '#0078D7' }} />
              <View style={{ width: 62, height: 38, backgroundColor: '#0078D7' }} />
              <View style={{ width: 62, height: 38, backgroundColor: '#0078D7' }} />
              <View style={{ width: 62, height: 38, backgroundColor: '#0078D7' }} />
            </View>
          </View>
        )}

        {/* 4) Windows 11: Authentic Light Mica Bloom Wallpaper (Soft Ice-Blue Ribbon Flower on Clean Frost-White Desk) */}
        {isWin11 && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#EDF2F9', overflow: 'hidden' }}>
            {/* Soft Ambient Background Aura */}
            <View style={{ position: 'absolute', width: 260, height: 200, borderRadius: 100, backgroundColor: '#E0EBF7', top: -40, left: -30 }} />
            <View style={{ position: 'absolute', width: 220, height: 180, borderRadius: 90, backgroundColor: '#DBE8F9', bottom: -50, right: -20 }} />

            {/* Central Fluent Bloom 3D Petals Layering */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              {/* Back Petals */}
              <View style={{ position: 'absolute', width: 95, height: 80, borderRadius: 38, backgroundColor: '#93C5FD', transform: [{ rotate: '-35deg' }], opacity: 0.85 }} />
              <View style={{ position: 'absolute', width: 90, height: 85, borderRadius: 38, backgroundColor: '#60A5FA', transform: [{ rotate: '40deg' }], opacity: 0.85 }} />
              {/* Middle Azure Folds */}
              <View style={{ position: 'absolute', width: 85, height: 68, borderRadius: 32, backgroundColor: '#3B82F6', transform: [{ rotate: '-12deg' }], opacity: 0.9 }} />
              <View style={{ position: 'absolute', width: 75, height: 75, borderRadius: 32, backgroundColor: '#2563EB', transform: [{ rotate: '25deg' }], opacity: 0.95 }} />
              {/* Front Core Petals with Highlights */}
              <View style={{ position: 'absolute', width: 55, height: 55, borderRadius: 24, backgroundColor: '#1D4ED8', transform: [{ rotate: '5deg' }] }} />
              <View style={{ position: 'absolute', width: 35, height: 35, borderRadius: 16, backgroundColor: '#38BDF8', transform: [{ rotate: '-20deg' }], opacity: 0.85 }} />
            </View>
          </View>
        )}

        {/* Real Windows Desktop: Single Left-Column Shortcuts (open wallpaper, ZERO full-screen 4x3 grid!) */}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
          <View style={{ width: 68, justifyContent: 'flex-start', gap: 5 }}>
            {visibleIcons.map((item, idx) => {
              const sel = !os.winStartOpen && idx === safeDeskIdx;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (os.winStartOpen) {
                      os.winStartOpen = false;
                      os.deskIdx = idx;
                      os.cb.onPlaySound?.('hit');
                      return;
                    }
                    if (os.deskIdx !== idx) {
                      os.deskIdx = idx;
                      os.cb.onPlaySound?.('hit');
                    } else {
                      const s = os.launchDesktopApp(item.id);
                      os.cb.onPlaySound?.(s);
                    }
                  }}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: isWin11 || isWin7 ? 4 : isWin8 ? 0 : 2,
                    borderWidth: sel ? 1 : 0,
                    borderStyle: sel && !isXp && !isWin7 && !isWin8 && !isWin11 ? 'dotted' : 'solid',
                    borderColor: sel ? (isWin7 ? 'rgba(224, 242, 254, 0.85)' : '#FFFFFF') : 'transparent',
                    backgroundColor: sel
                      ? isWin7
                        ? 'rgba(125, 211, 252, 0.34)'
                        : isXp
                        ? '#2B65CEE6'
                        : `${selHighlight}DD`
                      : 'transparent',
                    paddingVertical: 2,
                    paddingHorizontal: 3,
                  }}
                >
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    {renderWinAppIconTile(item.id, item.icon, sel, winVariant, 22)}
                    {item.id !== 'programs' && (
                      <View
                        style={{
                          position: 'absolute',
                          left: -4,
                          bottom: -2,
                          width: 6.5,
                          height: 6.5,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 0.5,
                          borderColor: '#222222',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: isWin11 ? 2 : 0,
                        }}
                      >
                        <Text style={{ fontSize: 5, fontWeight: '900', color: '#000080', lineHeight: 6 }}>
                          ↗
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      backgroundColor: sel
                        ? selHighlight
                        : isWin11
                        ? 'rgba(255, 255, 255, 0.78)'
                        : 'rgba(0, 0, 0, 0.45)',
                      paddingHorizontal: 4,
                      paddingVertical: 0.5,
                      borderRadius: isWin11 ? 3 : isWin8 ? 0 : 1,
                      marginTop: 1.5,
                    }}
                  >
                    <Text
                      style={[
                        styles.deskLbl,
                        {
                          color: sel ? '#FFFFFF' : isWin11 ? '#0F172A' : '#FFFFFF',
                          fontSize: 6.8,
                          fontWeight: sel ? '900' : '700',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Open Desktop Hint Pill on bottom-right */}
          {!os.winStartOpen && (
            <Pressable
              onPress={() => {
                os.winStartOpen = true;
                os.winStartPane = 'left';
                os.cb.onPlaySound?.('score');
              }}
              style={{
                alignSelf: 'flex-end',
                backgroundColor: isWin11 ? 'rgba(255,255,255,0.82)' : 'rgba(10, 24, 48, 0.65)',
                borderWidth: 1,
                borderColor: isWin11 ? 'rgba(15,23,42,0.18)' : 'rgba(186,230,253,0.45)',
                borderRadius: isWin11 ? 6 : 3,
                paddingHorizontal: 6,
                paddingVertical: 2.5,
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 6.8,
                  fontWeight: '800',
                  color: isWin11 ? '#0F172A' : '#E0F2FE',
                }}
              >
                {pickLang(os.lang, '[▶] START MENU', '[▶] BASLAT MENUSU')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Authentic Floating Two-Column Windows Start Menu Popup */}
        {os.winStartOpen && (() => {
          const leftItems = os.getWinStartLeftItems();
          const rightItems = os.getWinStartRightItems();
          const LEFT_VISIBLE = 6;
          const safeLeftIdx = Math.max(0, Math.min(os.winStartLeftIdx, Math.max(0, leftItems.length - 1)));
          const safeRightIdx = Math.max(0, Math.min(os.winStartRightIdx, Math.max(0, rightItems.length - 1)));
          const maxLeftStart = Math.max(0, leftItems.length - LEFT_VISIBLE);
          const leftStart = Math.max(0, Math.min(safeLeftIdx - 2, maxLeftStart));
          const visibleLeft = leftItems.slice(leftStart, leftStart + LEFT_VISIBLE);

          const menuOuterBg = isWin7
            ? 'rgba(18, 60, 108, 0.94)'
            : isXp
            ? '#245EDC'
            : isWin10
            ? '#1F1F1F'
            : isWin11
            ? '#F3F6FA'
            : '#C0C0C0';
          const menuOuterBorder = isWin7
            ? 'rgba(186, 230, 253, 0.8)'
            : isXp
            ? '#0B3592'
            : isWin11
            ? '#CBD5E1'
            : '#FFFFFF';
          const leftPaneBg = isWin10 ? '#18181B' : '#FFFFFF';
          const leftText = isWin10 ? '#F8FAFC' : '#0F172A';
          const rightPaneBg = isWin7
            ? 'rgba(12, 42, 78, 0.86)'
            : isXp
            ? '#D3E5FA'
            : isWin10
            ? '#252526'
            : isWin11
            ? '#E2E8F0'
            : '#DFDFDF';
          const rightText = isWin7 || isWin10 ? '#F0F9FF' : '#0F172A';

          return (
            <Pressable
              onPress={() => {
                os.winStartOpen = false;
                os.cb.onPlaySound?.('hit');
              }}
              style={{
                position: 'absolute',
                left: -6,
                right: -6,
                top: -4,
                bottom: -4,
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                paddingLeft: 6,
                paddingBottom: 4,
              }}
            >
              <Pressable
                onPress={(e) => e.stopPropagation?.()}
                style={{
                  width: 228,
                  backgroundColor: menuOuterBg,
                  borderWidth: 1.5,
                  borderColor: menuOuterBorder,
                  borderRadius: isWin7 || isWin11 ? 6 : isXp ? 5 : 1,
                  padding: 4,
                  shadowColor: '#000000',
                  shadowOffset: { width: 2, height: 3 },
                  shadowOpacity: 0.45,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {/* Left White/Dark Programs List */}
                  <View
                    style={{
                      flex: 1.25,
                      backgroundColor: leftPaneBg,
                      borderRadius: isWin7 || isWin11 ? 4 : 1,
                      borderWidth: 1,
                      borderColor: isWin10 ? '#333338' : '#CBD5E1',
                      padding: 3,
                      gap: 2,
                    }}
                  >
                    {visibleLeft.map((item, i) => {
                      const actualIdx = leftStart + i;
                      const sel = os.winStartPane === 'left' && actualIdx === safeLeftIdx;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            const s = os.launchDesktopApp(item.id);
                            os.cb.onPlaySound?.(s);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 4,
                            paddingVertical: 2.5,
                            borderRadius: isWin7 || isWin11 ? 3 : 1,
                            backgroundColor: sel ? selHighlight : 'transparent',
                          }}
                        >
                          {renderWinAppIconTile(item.id, item.icon, sel, winVariant, 15)}
                          <Text
                            style={{
                              fontFamily: monoFont,
                              fontSize: 7.4,
                              fontWeight: sel ? '900' : '700',
                              color: sel ? '#FFFFFF' : leftText,
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {getDesktopLabel(item.id, item.label, os.lang)}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: isWin10 ? '#333338' : '#E2E8F0',
                        paddingTop: 2,
                        marginTop: 1,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: 3,
                      }}
                    >
                      <Text style={{ fontFamily: monoFont, fontSize: 6.3, fontWeight: '800', color: isWin10 ? '#9CA3AF' : '#64748B' }}>
                        {pickLang(os.lang, 'ALL APPS', 'TUM PROGRAMLAR')}
                      </Text>
                      <Text style={{ fontFamily: monoFont, fontSize: 6.3, fontWeight: '900', color: selHighlight }}>
                        {safeLeftIdx + 1}/{leftItems.length}
                      </Text>
                    </View>
                  </View>

                  {/* Right Places / System Column */}
                  <View
                    style={{
                      flex: 0.95,
                      backgroundColor: rightPaneBg,
                      borderRadius: isWin7 || isWin11 ? 4 : 1,
                      padding: 4,
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3, paddingHorizontal: 2 }}>
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          backgroundColor: selHighlight,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="person" size={9} color="#FFFFFF" />
                      </View>
                      <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: rightText }} numberOfLines={1}>
                        RETRODECK
                      </Text>
                    </View>

                    <View style={{ gap: 2, flex: 1 }}>
                      {rightItems.map((item, rIdx) => {
                        const sel = os.winStartPane === 'right' && rIdx === safeRightIdx;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              const s = os.launchDesktopApp(item.id);
                              os.cb.onPlaySound?.(s);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 2.5,
                              borderRadius: isWin7 || isWin11 ? 3 : 1,
                              backgroundColor: sel ? selHighlight : 'transparent',
                            }}
                          >
                            <Ionicons
                              name={item.icon}
                              size={10}
                              color={sel ? '#FFFFFF' : isWin7 || isWin10 ? '#7DD3FC' : selHighlight}
                            />
                            <Text
                              style={{
                                fontFamily: monoFont,
                                fontSize: 6.8,
                                fontWeight: sel ? '900' : '700',
                                color: sel ? '#FFFFFF' : rightText,
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {getDesktopLabel(item.id, item.label, os.lang)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '800', color: rightText, opacity: 0.75, textAlign: 'center', marginTop: 2 }}>
                      [B] {pickLang(os.lang, 'CLOSE', 'KAPAT')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Pressable>
          );
        })()}
      </View>
    );
  }

  // STYLE 2: Classic Nokia 3310 Single-Item Carousel Menu
  if (os.menuStyle === 'nokia') {
    const total = visibleIcons.length;
    const curItem = visibleIcons[safeDeskIdx] || visibleIcons[0];
    const prevItem = visibleIcons[(safeDeskIdx + total - 1) % total];
    const nextItem = visibleIcons[(safeDeskIdx + 1) % total];

    return (
      <View style={[styles.deskGrid, { position: 'relative', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        {/* Top Menu Number Badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, 'MENU', 'MENU')}
          </Text>
          <View
            style={{
              backgroundColor: fg,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: bg }}>
              {String(safeDeskIdx + 1).padStart(2, '0')}/{total}
            </Text>
          </View>
        </View>

        {/* Center Hero Nokia 3310 Card */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingHorizontal: 4 }}>
          <View style={{ alignItems: 'center', opacity: 0.45, width: 38 }}>
            <Ionicons name={prevItem.icon} size={16} color={fg} />
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              ◀ {getDesktopLabel(prevItem.id, prevItem.label, os.lang)}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              marginHorizontal: 6,
              borderWidth: 2,
              borderColor: fg,
              backgroundColor: activeWall ? hexWithAlpha(bg, 0.80) : 'transparent',
              borderRadius: 6,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: fg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={curItem.icon} size={26} color={bg} />
            </View>
            <Text style={{ fontFamily: monoFont, fontSize: 13, fontWeight: '900', color: fg, letterSpacing: 1 }}>
              {getDesktopLabel(curItem.id, curItem.label, os.lang)}
            </Text>
          </View>

          <View style={{ alignItems: 'center', opacity: 0.45, width: 38 }}>
            <Ionicons name={nextItem.icon} size={16} color={fg} />
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              {getDesktopLabel(nextItem.id, nextItem.label, os.lang)} ▶
            </Text>
          </View>
        </View>

        {/* Bottom Selector Strip */}
        <View
          style={{
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            borderTopWidth: 1,
            borderTopColor: hexWithAlpha(fg, 0.4),
            paddingVertical: 2,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, '◀ / ▶ BROWSE  •  [A] SELECT', '◀ / ▶ GEZ  •  [A] SEC')}
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 3: Classic Retro Vertical List (6 rows per window)
  if (os.menuStyle === 'list') {
    const visibleCount = 6;
    const total = visibleIcons.length;
    const start = Math.max(0, Math.min(total - visibleCount, safeDeskIdx - 2));
    const slice = visibleIcons.slice(start, start + visibleCount);

    return (
      <View style={[styles.listWrap, { position: 'relative', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            paddingHorizontal: 4,
            paddingVertical: 1,
          }}
        >
          <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
            {pickLang(os.lang, 'APPLICATIONS', 'UYGULAMALAR')}
          </Text>
          <Text style={[styles.listMeta, { color: fg }]}>
            {String(safeDeskIdx + 1).padStart(2, '0')}/{total}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-start', gap: 2.5 }}>
          {slice.map((item, i) => {
            const realIdx = start + i;
            const sel = realIdx === safeDeskIdx;
            const rowInk = sel ? bg : fg;
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 6,
                  paddingVertical: 3.5,
                  borderWidth: 1,
                  borderColor: sel ? fg : hexWithAlpha(fg, activeWall ? 0.55 : 0.25),
                  backgroundColor: sel
                    ? fg
                    : activeWall
                    ? hexWithAlpha(bg, 0.74)
                    : 'transparent',
                  borderRadius: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name={item.icon} size={13} color={rowInk} />
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 9.5,
                      fontWeight: '900',
                      color: rowInk,
                    }}
                    numberOfLines={1}
                  >
                    {String(realIdx + 1).padStart(2, '0')}. {getDesktopLabel(item.id, item.label, os.lang)}
                  </Text>
                </View>
                <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: rowInk }}>
                  {sel ? '◀' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // STYLE 5: macOS Cupertino Desktop with Top Menu Bar & Bottom Glass Dock
  if (os.menuStyle === 'macos') {
    const palId = os.cb.getPaletteId?.();
    const isSonoma = palId === 'macos_sonoma';
    const isClassic = palId === 'macos_classic';
    const isAqua = palId === 'macos_aqua';
    const isSequoia = palId === 'macos_sequoia';
    const dockCols = 6;
    const dockPages = Math.ceil(visibleIcons.length / dockCols);
    const dockCurPage = Math.min(dockPages - 1, Math.floor(safeDeskIdx / dockCols));
    const dockPageStart = dockCurPage * dockCols;
    const dockSlice = visibleIcons.slice(dockPageStart, dockPageStart + dockCols);
    const activeItem = visibleIcons[safeDeskIdx] || visibleIcons[0];

    // Detect luminance of active background (wallpaper OR palette bg)
    const isLightWallpaper = (() => {
      if (isClassic) return true;
      const clean = bg.trim().toLowerCase().replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 125;
      }
      return false;
    })();

    // Apple Human Interface Guidelines (HIG) Unified Color Scale
    // Consistent frosted glass, graphite/slate typography, and harmonious translucent chrome
    const macScale = isClassic
      ? {
          topBarBg: '#FFFFFF',
          topBarBorder: '#000000',
          topBarInk: '#000000',
          topBarSubInk: '#4B5563',
          cardBg: '#FFFFFF',
          cardBorder: '#000000',
          cardTitle: '#000000',
          cardSub: '#555555',
          dockBg: '#E5E5E5',
          dockBorder: '#000000',
          tileBg: '#FFFFFF',
          tileBorder: '#000000',
          tileIcon: '#000000',
          accentBg: '#000000',
          accentText: '#FFFFFF',
        }
      : isLightWallpaper
      ? {
          // Apple Light Appearance: Frosted Vibrancy, San Francisco Graphite & Deep Charcoal
          topBarBg: 'rgba(255, 255, 255, 0.88)',
          topBarBorder: 'rgba(0, 0, 0, 0.12)',
          topBarInk: '#1D1D1F',
          topBarSubInk: '#6E6E73',
          cardBg: 'rgba(255, 255, 255, 0.92)',
          cardBorder: 'rgba(0, 0, 0, 0.10)',
          cardTitle: '#1D1D1F',
          cardSub: '#6E6E73',
          dockBg: 'rgba(255, 255, 255, 0.78)',
          dockBorder: 'rgba(0, 0, 0, 0.12)',
          tileBg: 'rgba(255, 255, 255, 0.95)',
          tileBorder: 'rgba(0, 0, 0, 0.08)',
          tileIcon: '#1D1D1F',
          accentBg: fg && fg.length === 7 ? fg : '#0071E3', // Apple Blue or active theme ink
          accentText: '#FFFFFF',
        }
      : {
          // Apple Dark Appearance: Frosted Dark Vibrancy & SF Off-White
          topBarBg: 'rgba(28, 28, 30, 0.82)',
          topBarBorder: 'rgba(255, 255, 255, 0.14)',
          topBarInk: '#F5F5F7',
          topBarSubInk: '#A1A1A6',
          cardBg: 'rgba(30, 30, 32, 0.88)',
          cardBorder: 'rgba(255, 255, 255, 0.15)',
          cardTitle: '#F5F5F7',
          cardSub: '#A1A1A6',
          dockBg: 'rgba(44, 44, 46, 0.75)',
          dockBorder: 'rgba(255, 255, 255, 0.18)',
          tileBg: 'rgba(255, 255, 255, 0.12)',
          tileBorder: 'rgba(255, 255, 255, 0.12)',
          tileIcon: '#F5F5F7',
          accentBg: fg && fg.length === 7 ? fg : '#0A84FF', // Apple Vivid Blue or active theme ink
          accentText: '#FFFFFF',
        };

    // Calculate contrast text for the active item accent tile
    const activeTileText = (() => {
      const clean = macScale.accentBg.trim().toLowerCase().replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 150 ? '#1D1D1F' : '#FFFFFF';
      }
      return '#FFFFFF';
    })();

    return (
      <View style={[styles.deskGrid, { position: 'relative', justifyContent: 'space-between' }]}>
        {/* Render wallpaper backdrop if active */}
        {renderWallBackdrop()}

        {/* macOS Sonoma Abstract Colorful Horizon Wallpaper */}
        {isSonoma && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#0B0A12', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', width: 260, height: 160, borderRadius: 80, backgroundColor: '#4F46E5', top: -30, left: -40, opacity: 0.65 }} />
            <View style={{ position: 'absolute', width: 220, height: 150, borderRadius: 75, backgroundColor: '#E11D48', bottom: -20, right: -30, opacity: 0.7 }} />
            <View style={{ position: 'absolute', width: 180, height: 120, borderRadius: 60, backgroundColor: '#F59E0B', bottom: 10, left: 10, opacity: 0.55 }} />
          </View>
        )}

        {/* macOS Sequoia Light Modern Abstract Dunes Wallpaper */}
        {isSequoia && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#EAEBF0', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', width: 240, height: 130, borderRadius: 65, backgroundColor: '#38BDF8', top: -20, right: -30, opacity: 0.45 }} />
            <View style={{ position: 'absolute', width: 200, height: 140, borderRadius: 70, backgroundColor: '#818CF8', bottom: -30, left: -20, opacity: 0.40 }} />
            <View style={{ position: 'absolute', width: 170, height: 100, borderRadius: 50, backgroundColor: '#F472B6', bottom: 15, right: 20, opacity: 0.35 }} />
          </View>
        )}

        {/* Mac OS X Aqua Iconic 2001 Blue Waves Backdrop */}
        {isAqua && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#1E64B4', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: -20, right: -20, top: 0, height: '45%', backgroundColor: '#3B8EEA', opacity: 0.8 }} />
            <View style={{ position: 'absolute', width: 280, height: 120, borderRadius: 60, backgroundColor: '#70B4FF', top: 30, left: -40, opacity: 0.5, transform: [{ rotate: '-8deg' }] }} />
            <View style={{ position: 'absolute', width: 260, height: 100, borderRadius: 50, backgroundColor: '#1B549E', bottom: -20, right: -20, opacity: 0.7 }} />
          </View>
        )}

        {/* macOS Classic Platinum Desk (System 7 Pinstripes) */}
        {isClassic && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#808080' }}>
            {/* Fine 50% dither pattern emulation */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          </View>
        )}

        {/* macOS Top Menu Bar ( Finder File Edit View Go Window Help) */}
        <View
          style={{
            height: 18,
            backgroundColor: macScale.topBarBg,
            borderBottomWidth: isClassic ? 1 : 0.5,
            borderBottomColor: macScale.topBarBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
            borderRadius: isClassic ? 0 : 4,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isLightWallpaper ? 0.15 : 0,
            shadowRadius: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Apple Logo Icon */}
            <Ionicons name="logo-apple" size={10} color={macScale.topBarInk} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: macScale.topBarInk }}>
              Finder
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: macScale.topBarSubInk }}>
              File
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: macScale.topBarSubInk }}>
              Edit
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: macScale.topBarSubInk }}>
              View
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="wifi" size={8} color={macScale.topBarInk} />
            <Ionicons name="search" size={8} color={macScale.topBarInk} />
            <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '700', color: macScale.topBarInk }}>
              {os.formatClock()}
            </Text>
          </View>
        </View>

        {/* Center Canvas with Hero App Preview Card */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 4 }}>
          <View
            style={{
              backgroundColor: macScale.cardBg,
              borderWidth: 1,
              borderColor: macScale.cardBorder,
              borderRadius: isClassic ? 2 : 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isLightWallpaper ? 0.18 : 0.45,
              shadowRadius: 5,
              elevation: 4,
            }}
          >
            {/* macOS Window Titlebar Dots (Red, Yellow, Green) */}
            <View style={{ flexDirection: 'row', gap: 3, position: 'absolute', top: 5, left: 6 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F59E0B' }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' }} />
            </View>

            <View style={{ marginTop: 2, alignItems: 'center' }}>
              {/* Distinct colored container for icon so it pops on ANY background */}
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: macScale.accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                }}
              >
                <Ionicons
                  name={activeItem.icon}
                  size={24}
                  color={activeTileText}
                />
              </View>
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 9.5,
                  fontWeight: '900',
                  color: macScale.cardTitle,
                  marginTop: 5,
                  letterSpacing: 0.5,
                }}
              >
                {getDesktopLabel(activeItem.id, activeItem.label, os.lang)}
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: macScale.cardSub, marginTop: 1 }}>
                {pickLang(os.lang, `App ${safeDeskIdx + 1} of ${visibleIcons.length} • [A] Launch`, `Uygulama ${safeDeskIdx + 1}/${visibleIcons.length} • [A] Ac`)}
              </Text>
            </View>
          </View>
        </View>

        {/* macOS Bottom Glass Floating Dock */}
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: macScale.dockBg,
            borderWidth: 1,
            borderColor: macScale.dockBorder,
            borderRadius: isClassic ? 3 : 10,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 3,
            gap: 6,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isLightWallpaper ? 0.2 : 0.45,
            shadowRadius: 5,
            elevation: 5,
          }}
        >
          {dockSlice.map((item, idxInPage) => {
            const realIdx = dockPageStart + idxInPage;
            const sel = realIdx === safeDeskIdx;

            const tileBg = sel
              ? macScale.accentBg
              : macScale.tileBg;

            const iconColor = sel
              ? activeTileText
              : macScale.tileIcon;

            const tileBorder = sel
              ? macScale.accentBg
              : macScale.tileBorder;

            return (
              <View key={item.id} style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: isClassic ? 2 : 5,
                    backgroundColor: tileBg,
                    borderWidth: 1,
                    borderColor: tileBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isLightWallpaper && !sel ? 0.15 : 0,
                    shadowRadius: 2,
                    elevation: isLightWallpaper && !sel ? 2 : 0,
                    transform: sel ? [{ scale: 1.15 }, { translateY: -2 }] : [],
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color={iconColor}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // STYLE 6: Sony PlayStation Portable (PSP) / PS3 XMB (Cross Media Bar)
  if (os.menuStyle === 'psp_xmb') {
    // 5 Categories: Settings, Games, Media, Network, Tools
    const rawXmbCategories: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; appIds: string[] }[] = [
      { id: 'settings', label: pickLang(os.lang, 'SETTINGS', 'AYARLAR'), icon: 'settings', appIds: ['setup', 'stats', 'term', 'format', 'device'] },
      { id: 'games', label: pickLang(os.lang, 'GAME', 'OYUN'), icon: 'game-controller', appIds: ['arcade', 'j2me'] },
      { id: 'media', label: pickLang(os.lang, 'MEDIA', 'MEDYA'), icon: 'musical-notes', appIds: ['radio', 'synth', 'wallpapers', 'paint'] },
      { id: 'network', label: pickLang(os.lang, 'NETWORK', 'AG'), icon: 'globe', appIds: ['ai', 'sms', 'contacts', 'phone', 'wap'] },
      { id: 'tools', label: pickLang(os.lang, 'EXTRAS', 'EKSTRALAR'), icon: 'briefcase', appIds: ['store', 'calc', 'clock', 'profiles', 'notes', 'weather'] },
    ];
    const XMB_CATEGORIES = rawXmbCategories
      .map((cat) => ({
        ...cat,
        appIds: cat.appIds.filter((id) => visibleIcons.some((icon) => icon.id === id)),
      }))
      .filter((cat) => cat.appIds.length > 0);

    const currentApp = visibleIcons[safeDeskIdx] || visibleIcons[0];
    let activeCatIdx = XMB_CATEGORIES.findIndex((cat) => cat.appIds.includes(currentApp.id));
    if (activeCatIdx === -1) activeCatIdx = Math.min(1, XMB_CATEGORIES.length - 1);
    const activeCat = XMB_CATEGORIES[activeCatIdx];
    const catApps = activeCat.appIds.map((id) => visibleIcons.find((icon) => icon.id === id)!).filter(Boolean);
    let itemIdxInCat = catApps.findIndex((item) => item.id === currentApp.id);
    if (itemIdxInCat === -1) itemIdxInCat = 0;

    // Theme Accent & Selection Colors
    const pspAccent = fg;
    const pspBg = bg;

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', justifyContent: 'space-between', paddingHorizontal: 0, paddingVertical: 4 }]}>
        {renderWallBackdrop()}

        {/* Dynamic PSP/PS3 Ambient Wave Ribbons adapted to active theme */}
        {!activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: 0, bottom: 0, backgroundColor: hexWithAlpha(pspBg, 0.95), overflow: 'hidden' }}>
            {/* Wave 1 */}
            <View
              style={{
                position: 'absolute',
                top: 40,
                left: -30,
                width: 380,
                height: 120,
                borderRadius: 90,
                borderWidth: 2,
                borderColor: hexWithAlpha(pspAccent, 0.35),
                transform: [{ rotate: '-12deg' }, { scaleX: 1.2 }],
              }}
            />
            {/* Wave 2 */}
            <View
              style={{
                position: 'absolute',
                top: 55,
                left: -10,
                width: 360,
                height: 100,
                borderRadius: 80,
                borderWidth: 1.5,
                borderColor: hexWithAlpha(pspAccent, 0.22),
                transform: [{ rotate: '-7deg' }, { scaleX: 1.1 }],
              }}
            />
            {/* Wave 3 Glow Fill */}
            <View
              style={{
                position: 'absolute',
                top: 75,
                left: 20,
                width: 320,
                height: 80,
                backgroundColor: hexWithAlpha(pspAccent, 0.08),
                transform: [{ rotate: '-5deg' }],
              }}
            />
          </View>
        )}

        {/* Top PSP Info Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="hardware-chip-outline" size={10} color={pspAccent} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: pspAccent, letterSpacing: 0.8 }}>
              PSP-3000
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wifi" size={9} color={pspAccent} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '700', color: pspAccent }}>
              {os.formatClock()}
            </Text>
          </View>
        </View>

        {/* Horizontal Category Bar (Cross Media Bar - Horizontal Axis) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingVertical: 5,
            paddingHorizontal: 8,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.72) : hexWithAlpha(bg, 0.65),
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: hexWithAlpha(pspAccent, 0.2),
          }}
        >
          {XMB_CATEGORIES.map((cat, idx) => {
            const isCatActive = idx === activeCatIdx;
            return (
              <View key={cat.id} style={{ alignItems: 'center', width: 44 }}>
                <View
                  style={{
                    width: isCatActive ? 28 : 22,
                    height: isCatActive ? 28 : 22,
                    borderRadius: 14,
                    backgroundColor: isCatActive ? pspAccent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: pspAccent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isCatActive ? 0.7 : 0,
                    shadowRadius: 5,
                  }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={isCatActive ? 16 : 13}
                    color={isCatActive ? pspBg : hexWithAlpha(pspAccent, 0.65)}
                  />
                </View>
                {isCatActive && (
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 6.8,
                      fontWeight: '900',
                      color: pspAccent,
                      marginTop: 2,
                      letterSpacing: 0.5,
                    }}
                  >
                    {cat.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Vertical Sub-Items List under Active Category (Vertical Axis - Windowed Carousel) */}
        {(() => {
          // Authentic PSP XMB displays max 3 items centered on the active item: [Previous, Selected, Next]
          const totalItems = catApps.length;
          // Determine 3 visible window items around itemIdxInCat
          const visibleIndices: number[] = [];
          if (totalItems <= 3) {
            for (let i = 0; i < totalItems; i++) visibleIndices.push(i);
          } else {
            // Center the selected item: prev, current, next
            const prev = (itemIdxInCat - 1 + totalItems) % totalItems;
            const next = (itemIdxInCat + 1) % totalItems;
            visibleIndices.push(prev, itemIdxInCat, next);
          }

          return (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 2 }}>
              {/* Category Items Counter / Indicator if more than 3 items */}
              {totalItems > 3 && (
                <View style={{ alignItems: 'flex-end', marginBottom: 2, paddingRight: 4 }}>
                  <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: hexWithAlpha(pspAccent, 0.6) }}>
                    ▲ ▼ {itemIdxInCat + 1}/{totalItems}
                  </Text>
                </View>
              )}

              {visibleIndices.map((realIdx) => {
                const item = catApps[realIdx];
                const isItemSel = realIdx === itemIdxInCat;
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: isItemSel ? 5 : 3,
                      paddingHorizontal: isItemSel ? 10 : 8,
                      marginVertical: 2,
                      borderRadius: 4,
                      backgroundColor: isItemSel ? pspAccent : 'transparent',
                      borderWidth: isItemSel ? 1 : 0,
                      borderColor: pspAccent,
                      opacity: isItemSel ? 1 : 0.45,
                      transform: isItemSel ? [{ scale: 1.03 }] : [{ scale: 0.95 }],
                    }}
                  >
                    <View
                      style={{
                        width: isItemSel ? 22 : 18,
                        height: isItemSel ? 22 : 18,
                        borderRadius: 4,
                        backgroundColor: isItemSel ? pspBg : hexWithAlpha(pspAccent, 0.15),
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isItemSel ? 13 : 11}
                        color={isItemSel ? pspAccent : pspAccent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: monoFont,
                          fontSize: isItemSel ? 9 : 7.8,
                          fontWeight: isItemSel ? '900' : '600',
                          color: isItemSel ? pspBg : pspAccent,
                        }}
                        numberOfLines={1}
                      >
                        {getDesktopLabel(item.id, item.label, os.lang)}
                      </Text>
                    </View>
                    {isItemSel && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: pspBg }}>
                          [A] ENTER
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Bottom D-Pad Prompt */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 14 }}>
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: hexWithAlpha(pspAccent, 0.5) }}>
            ◀ ▶ CATEGORY • ▲ ▼ SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: pspAccent }}>
            SONY XMB™
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 7: Xbox 360 Blades Dashboard (2005 Original Dashboard)
  if (os.menuStyle === 'xbox_blades') {
    // 4 Classic Xbox 360 Blades: Marketplace/Games (Green), Media (Blue), System (Purple), Live (Orange)
    // Always use vibrant, authentic high-saturation Xbox blade colors so tabs never turn washed-out white/transparent!
    const XBOX_BLADES: { id: string; label: string; color: string; appIds: string[] }[] = [
      { id: 'games', label: 'GAMES', color: '#107C10', appIds: ['arcade', 'store', 'j2me', 'synth'] },
      { id: 'media', label: 'MEDIA', color: '#0078D7', appIds: ['radio', 'wallpapers', 'paint'] },
      { id: 'system', label: 'SYSTEM', color: '#5C2D91', appIds: ['setup', 'clock', 'stats', 'term', 'format', 'device'] },
      { id: 'live', label: 'XBOX LIVE', color: '#D83B01', appIds: ['ai', 'sms', 'contacts', 'phone', 'calc', 'profiles', 'wap', 'weather', 'notes'] },
    ]
      .map((blade) => ({
        ...blade,
        appIds: blade.appIds.filter((id) => visibleIcons.some((icon) => icon.id === id)),
      }))
      .filter((blade) => blade.appIds.length > 0);

    let activeBladeIdx = os.xboxBladeIdx >= 0 && os.xboxBladeIdx < XBOX_BLADES.length ? os.xboxBladeIdx : 0;
    // Verify if currentApp matches activeBlade, otherwise sync
    const currentApp = visibleIcons[safeDeskIdx] || visibleIcons[0];
    const matchingIdx = XBOX_BLADES.findIndex((b) => b.appIds.includes(currentApp.id));
    if (matchingIdx !== -1 && matchingIdx !== activeBladeIdx) {
      activeBladeIdx = matchingIdx;
      os.xboxBladeIdx = matchingIdx;
    }

    const activeBlade = XBOX_BLADES[activeBladeIdx];
    const bladeApps = activeBlade.appIds.map((id) => visibleIcons.find((icon) => icon.id === id)!).filter(Boolean);
    let itemIdxInBlade = bladeApps.findIndex((item) => item.id === currentApp.id);
    if (itemIdxInBlade === -1) itemIdxInBlade = 0;

    // Windowed scrolling for apps in active blade: show 4 items around selected item
    const totalBladeApps = bladeApps.length;
    const maxVisibleBlade = Math.min(4, totalBladeApps);
    const bladeStartIdx = Math.max(0, Math.min(itemIdxInBlade - 1, totalBladeApps - maxVisibleBlade));
    const visibleBladeApps = bladeApps.slice(bladeStartIdx, bladeStartIdx + maxVisibleBlade);

    // Active blade theme accent
    const bladeAccent = activeBlade.color;

    // Selection highlight inside the central card
    const selBg = bladeAccent;
    const selText = '#FFFFFF';

    // Center card styling (dark glass to ensure maximum contrast over any wallpaper)
    const centerCardBg = 'rgba(15, 23, 42, 0.88)';
    const unselectedItemText = '#F8FAFC';
    const unselectedIconColor = 'rgba(255, 255, 255, 0.75)';

    // Dynamic Sliding Blades Architecture (Authentic 2005 Sliding Accordion Layout):
    // Blades before the active blade stack on the LEFT;
    // The active blade expands in the CENTER;
    // Blades after the active blade stack on the RIGHT!
    const leftBlades = XBOX_BLADES.slice(0, activeBladeIdx);
    const rightBlades = XBOX_BLADES.slice(activeBladeIdx + 1);

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0 }]}>
        {renderWallBackdrop()}

        {/* Xbox 360 Industrial Curved Gradient Backdrop */}
        {!activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#141618' }}>
            {/* Subtle silver curved sphere gradient */}
            <View
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
              }}
            />
            {/* Top Blade glow highlight */}
            <View style={{ height: 3, backgroundColor: bladeAccent }} />
          </View>
        )}

        {/* Header: Gamertag & Live Status */}
        <View
          style={{
            height: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.95) : 'rgba(0, 0, 0, 0.75)',
            borderBottomWidth: 1,
            borderBottomColor: activeWall ? hexWithAlpha(fg, 0.25) : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bladeAccent }} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: activeWall ? fg : '#FFFFFF' }}>
              RETRO_PLAYER_360
            </Text>
          </View>
          <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: bladeAccent }}>
            ● 100 G
          </Text>
        </View>

        {/* Center Canvas: Authentic Sliding Accordion Blades */}
        <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', paddingVertical: 3 }}>
          {/* Left Stacked Blades (Blades before active) */}
          {leftBlades.map((b) => {
            return (
              <View
                key={b.id}
                style={{
                  width: 14,
                  backgroundColor: b.color,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                  borderRightWidth: 1.5,
                  borderRightColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 1,
                  opacity: 0.95,
                }}
              >
                <Text
                  style={{
                    fontFamily: monoFont,
                    fontSize: 6.5,
                    fontWeight: '900',
                    color: '#FFFFFF',
                    transform: [{ rotate: '-90deg' }],
                    width: 48,
                    textAlign: 'center',
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 1,
                  }}
                  numberOfLines={1}
                >
                  {b.label}
                </Text>
              </View>
            );
          })}

          {/* Active Expanded Center Blade Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: centerCardBg,
              marginHorizontal: 3,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: bladeAccent,
              padding: 5,
              shadowColor: bladeAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }}
          >
            {/* Active Blade Title Header */}
            <View
              style={{
                backgroundColor: bladeAccent,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 3,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: '#FFFFFF' }}>
                {activeBlade.label}
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: '#FFFFFF' }}>
                {itemIdxInBlade + 1}/{bladeApps.length}
              </Text>
            </View>

            {/* List of Apps in Active Blade (windowed scroll) */}
            <View style={{ flex: 1, justifyContent: 'space-around' }}>
              {visibleBladeApps.map((item) => {
                const isSelected = item.id === currentApp.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 3.5,
                      paddingHorizontal: 6,
                      borderRadius: 3,
                      backgroundColor: isSelected ? selBg : 'transparent',
                      borderLeftWidth: isSelected ? 3 : 0,
                      borderLeftColor: '#FFFFFF',
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={12}
                      color={isSelected ? selText : unselectedIconColor}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 8,
                        fontWeight: isSelected ? '900' : '700',
                        color: isSelected ? selText : unselectedItemText,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang)}
                    </Text>
                    {isSelected && (
                      <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: selText }}>
                        ▶
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Right Stacked Blades (Blades after active) */}
          {rightBlades.map((b) => {
            return (
              <View
                key={b.id}
                style={{
                  width: 14,
                  backgroundColor: b.color,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                  borderLeftWidth: 1.5,
                  borderLeftColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 1,
                  opacity: 0.95,
                }}
              >
                <Text
                  style={{
                    fontFamily: monoFont,
                    fontSize: 6.5,
                    fontWeight: '900',
                    color: '#FFFFFF',
                    transform: [{ rotate: '90deg' }],
                    width: 48,
                    textAlign: 'center',
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 1,
                  }}
                  numberOfLines={1}
                >
                  {b.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer Blade Navigation Bar */}
        <View
          style={{
            height: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.9) : 'rgba(0, 0, 0, 0.9)',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: activeWall ? fg : 'rgba(255,255,255,0.5)' }}>
            ◀ ▶ SLIDE BLADE • ▲ ▼ SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: bladeAccent }}>
            [A] LAUNCH
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 8: Cyberpunk / Linux Tiling Window Manager (i3 / bspwm / sway style)
  if (os.menuStyle === 'cyberpunk') {
    const total = visibleIcons.length;
    const curItem = visibleIcons[safeDeskIdx] || visibleIcons[0];
    const workspaces = ['1:SYS', '2:NET', '3:MEDIA', '4:EXTRA'];
    const activeWsIdx = Math.min(3, Math.floor(safeDeskIdx / 5));

    // Visible terminal list window (5 items)
    const listPage = Math.floor(safeDeskIdx / 5);
    const visibleApps = visibleIcons.slice(listPage * 5, listPage * 5 + 5);

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0, backgroundColor: '#050811' }]}>
        {renderWallBackdrop()}

        {/* Tiling Polybar / Status Bar */}
        <View
          style={{
            height: 16,
            backgroundColor: '#0F172A',
            borderBottomWidth: 1,
            borderBottomColor: '#22D3EE',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
          }}
        >
          {/* Workspaces */}
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {workspaces.map((ws, i) => {
              const isWsActive = i === activeWsIdx;
              return (
                <View
                  key={ws}
                  style={{
                    backgroundColor: isWsActive ? '#22D3EE' : '#1E293B',
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 6.8,
                      fontWeight: '900',
                      color: isWsActive ? '#050811' : '#94A3B8',
                    }}
                  >
                    {ws}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Telemetry */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: '#4ADE80' }}>
              CPU: 32%
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: '#F43F5E' }}>
              MEM: 128MB
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: '#F8FAFC' }}>
              {os.formatClock()}
            </Text>
          </View>
        </View>

        {/* Tiled Layout: Split Left (Neofetch/Hero) and Right (Dmenu / App Launcher) */}
        <View style={{ flex: 1, flexDirection: 'row', padding: 4, gap: 4 }}>
          {/* Left Tile: Neofetch Terminal Pane */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#0A0F1D',
              borderWidth: 1,
              borderColor: '#1E293B',
              borderRadius: 3,
              padding: 5,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: '#22D3EE', marginBottom: 2 }}>
                ┌─[ retrodeck@kernel-8 ]
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '700', color: '#F43F5E' }}>
                OS: RetroDeck Linux v6.8
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '700', color: '#F59E0B' }}>
                WM: i3-gaps (tiling)
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '700', color: '#10B981' }}>
                UP: {Math.floor(os.uptime)}s
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '700', color: '#A855F7' }}>
                PKGS: {total} (pacman)
              </Text>
            </View>

            {/* Selected Target Preview */}
            <View style={{ backgroundColor: '#050811', padding: 4, borderWidth: 1, borderColor: '#22D3EE', borderRadius: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={curItem.icon} size={12} color="#22D3EE" />
                <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: '#22D3EE' }} numberOfLines={1}>
                  {curItem.id}.sh
                </Text>
              </View>
              <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '700', color: '#94A3B8', marginTop: 1 }}>
                EXEC: [A] RETURN
              </Text>
            </View>
          </View>

          {/* Right Tile: Dmenu / Interactive App Terminal Launcher */}
          <View
            style={{
              flex: 1.15,
              backgroundColor: '#0A0F1D',
              borderWidth: 1,
              borderColor: '#22D3EE',
              borderRadius: 3,
              padding: 4,
            }}
          >
            <View style={{ backgroundColor: '#22D3EE', paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3 }}>
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: '#050811' }}>
                $ dmenu_run ({safeDeskIdx + 1}/{total})
              </Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'space-around' }}>
              {visibleApps.map((item) => {
                const isSelected = item.id === curItem.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 4,
                      paddingVertical: 1.5,
                      backgroundColor: isSelected ? '#22D3EE' : 'transparent',
                      borderRadius: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 7.5,
                        fontWeight: '900',
                        color: isSelected ? '#050811' : '#4ADE80',
                        marginRight: 4,
                      }}
                    >
                      {isSelected ? '▶' : '$'}
                    </Text>
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 7.5,
                        fontWeight: isSelected ? '900' : '600',
                        color: isSelected ? '#050811' : '#F8FAFC',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Footer Prompt */}
        <View style={{ height: 12, backgroundColor: '#0F172A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '700', color: '#64748B' }}>
            [MOD]+[▲▼] NAVIGATE • [MOD]+[A] EXEC
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '900', color: '#22D3EE' }}>
            WS: #{activeWsIdx + 1}
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 9: Nintendo Wii Channels Grid (Wii Menu System)
  if (os.menuStyle === 'wii_channels') {
    const cols = 4;
    const rows = 3;
    const pageSize = cols * rows; // 12 TV channels per screen
    const totalPages = Math.max(1, Math.ceil(visibleIcons.length / pageSize));
    const curPage = Math.min(totalPages - 1, Math.floor(safeDeskIdx / pageSize));
    const pageStart = curPage * pageSize;
    const pageSlice = visibleIcons.slice(pageStart, pageStart + pageSize);
    const activeItem = visibleIcons[safeDeskIdx] || visibleIcons[0];

    // Grid coordinates
    const localIdx = safeDeskIdx - pageStart;

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 4, paddingVertical: 2, backgroundColor: activeWall ? 'transparent' : '#ECEFF1', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        {/* Wii Ambient Wave Top Decor */}
        {!activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#CFD8DC' }}>
            <View style={{ position: 'absolute', bottom: -10, left: '20%', width: 140, height: 20, borderRadius: 10, backgroundColor: 'rgba(3, 169, 244, 0.08)' }} />
          </View>
        )}

        {/* Top Header: Clock + Wii Disc Slot indicator */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, height: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0288D1' }} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: activeWall ? fg : '#37474F' }}>
              Wii Menu
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: activeWall ? fg : '#78909C' }}>
              P.{curPage + 1}/{totalPages}
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: activeWall ? fg : '#263238' }}>
              {os.formatClock()}
            </Text>
          </View>
        </View>

        {/* 4x3 Wii TV Channels Grid */}
        <View style={{ flex: 1, justifyContent: 'space-around', marginVertical: 2 }}>
          {Array.from({ length: rows }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
              {Array.from({ length: cols }).map((_, c) => {
                const idxInSlice = r * cols + c;
                const item = pageSlice[idxInSlice];
                if (!item) {
                  // Empty TV Slot with subtle static scan
                  return (
                    <View
                      key={c}
                      style={{
                        flex: 1,
                        height: 27,
                        borderRadius: 6,
                        backgroundColor: activeWall ? hexWithAlpha(bg, 0.4) : '#CFD8DC',
                        borderWidth: 1,
                        borderColor: activeWall ? hexWithAlpha(fg, 0.2) : '#B0BEC5',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.4,
                      }}
                    >
                      <Ionicons name="tv-outline" size={10} color={activeWall ? fg : '#90A4AE'} />
                    </View>
                  );
                }

                const isSelected = idxInSlice === localIdx;
                return (
                  <View
                    key={item.id}
                    style={{
                      flex: 1,
                      height: 27,
                      borderRadius: 6,
                      backgroundColor: isSelected
                        ? activeWall
                          ? fg
                          : '#FFFFFF'
                        : activeWall
                        ? hexWithAlpha(bg, 0.72)
                        : '#FAFAFA',
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? activeWall
                          ? fg
                          : '#03A9F4'
                        : activeWall
                        ? hexWithAlpha(fg, 0.3)
                        : '#CFD8DC',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: isSelected ? '#03A9F4' : '#000000',
                      shadowOffset: { width: 0, height: isSelected ? 2 : 1 },
                      shadowOpacity: isSelected ? 0.6 : 0.1,
                      shadowRadius: isSelected ? 3 : 1,
                      transform: isSelected ? [{ scale: 1.06 }] : [],
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={12}
                      color={isSelected ? (activeWall ? bg : '#0288D1') : activeWall ? fg : '#455A64'}
                    />
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 5.8,
                        fontWeight: isSelected ? '900' : '700',
                        color: isSelected ? (activeWall ? bg : '#0288D1') : activeWall ? fg : '#546E7A',
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang).slice(0, 7)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom Bar: Wii Message Board / Start Pill */}
        <View
          style={{
            height: 18,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.85) : '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: activeWall ? hexWithAlpha(fg, 0.3) : '#CFD8DC',
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="mail" size={10} color={activeWall ? fg : '#0288D1'} />
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: activeWall ? fg : '#455A64' }} numberOfLines={1}>
              {getDesktopLabel(activeItem.id, activeItem.label, os.lang)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: activeWall ? fg : '#03A9F4',
              paddingHorizontal: 6,
              paddingVertical: 1.5,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: activeWall ? bg : '#FFFFFF' }}>
              [A] START
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // STYLE 10: Fallout Pip-Boy 3000 (Monochrome Amber / Phosphor CRT with Vault Boy)
  if (os.menuStyle === 'pipboy') {
    const total = visibleIcons.length;
    const curItem = visibleIcons[safeDeskIdx] || visibleIcons[0];
    const pipTabs = ['STAT', 'INV', 'DATA', 'MAP', 'RADIO'];
    const activeTabIdx = Math.min(4, Math.floor(safeDeskIdx / 4));

    // Visible 4 items in inventory list
    const pageStart = activeTabIdx * 4;
    const visibleApps = visibleIcons.slice(pageStart, pageStart + 4);

    const pipColor = fg;
    const pipBg = bg;

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 2, paddingVertical: 2, backgroundColor: pipBg }]}>
        {renderWallBackdrop()}

        {/* CRT Curved Frame & Scanlines Overlay */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderWidth: 2,
            borderColor: hexWithAlpha(pipColor, 0.4),
            borderRadius: 6,
          }}
        />

        {/* Top Tab Bar: [ STAT ]  [ INV ]  [ DATA ]  [ MAP ]  [ RADIO ] */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: 16,
            borderBottomWidth: 1,
            borderBottomColor: pipColor,
            paddingHorizontal: 2,
          }}
        >
          {pipTabs.map((tab, idx) => {
            const isTabActive = idx === activeTabIdx;
            return (
              <View
                key={tab}
                style={{
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  backgroundColor: isTabActive ? pipColor : 'transparent',
                  borderRadius: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: monoFont,
                    fontSize: 7,
                    fontWeight: '900',
                    color: isTabActive ? pipBg : pipColor,
                    letterSpacing: 0.5,
                  }}
                >
                  {tab}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Center Split: Left App List & Right Vault Boy Telemetry Display */}
        <View style={{ flex: 1, flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, gap: 4 }}>
          {/* Left: Inventory List */}
          <View style={{ flex: 1.15, justifyContent: 'space-around' }}>
            {visibleApps.map((item) => {
              const isSelected = item.id === curItem.id;
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 2.5,
                    paddingHorizontal: 4,
                    backgroundColor: isSelected ? pipColor : 'transparent',
                    borderRadius: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 7.5,
                      fontWeight: '900',
                      color: isSelected ? pipBg : pipColor,
                      marginRight: 3,
                    }}
                  >
                    {isSelected ? '▶' : '-'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 7.5,
                      fontWeight: isSelected ? '900' : '700',
                      color: isSelected ? pipBg : pipColor,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getDesktopLabel(item.id, item.label, os.lang)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Right: Vault-Boy Status Monitor Tile */}
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: pipColor,
              borderRadius: 2,
              padding: 4,
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: hexWithAlpha(pipColor, 0.06),
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="body-outline" size={24} color={pipColor} />
              <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: pipColor, marginTop: 1 }}>
                VAULT-TEC OS
              </Text>
            </View>

            <View style={{ width: '100%', gap: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '700', color: pipColor }}>
                  RADS: 0
                </Text>
                <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '700', color: pipColor }}>
                  CND: 100%
                </Text>
              </View>
              <View style={{ width: '100%', height: 3, borderWidth: 0.5, borderColor: pipColor }}>
                <View style={{ width: '85%', height: '100%', backgroundColor: pipColor }} />
              </View>
            </View>
          </View>
        </View>

        {/* Footer HP / AP Status Bar */}
        <View
          style={{
            height: 14,
            borderTopWidth: 1,
            borderTopColor: pipColor,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: pipColor }}>
            HP: 240/240
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: pipColor }}>
            LEVEL: 8 • [A] SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: pipColor }}>
            AP: 95/95
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 11: Apple iPod Classic (2001 Dual-Pane Click Wheel Interface)
  if (os.menuStyle === 'ipod_classic') {
    const total = visibleIcons.length;
    const curItem = visibleIcons[safeDeskIdx] || visibleIcons[0];

    // Virtual windowed list: display 5 items on the left menu pane
    const PAGE_SIZE = 5;
    const maxStart = Math.max(0, total - PAGE_SIZE);
    const startIdx = Math.max(0, Math.min(safeDeskIdx - 2, maxStart));
    const visibleApps = visibleIcons.slice(startIdx, startIdx + PAGE_SIZE);

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0, backgroundColor: activeWall ? 'transparent' : '#FFFFFF', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        {/* Top Classic iPod Header: Play Status, Title, Battery */}
        <View
          style={{
            height: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 6,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.85) : '#E0E0E0',
            borderBottomWidth: 1,
            borderBottomColor: activeWall ? hexWithAlpha(fg, 0.3) : '#BDBDBD',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="play" size={8} color={activeWall ? fg : '#212121'} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: activeWall ? fg : '#212121' }}>
              iPod
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: activeWall ? fg : '#616161' }}>
              {os.formatClock()}
            </Text>
            <Ionicons name="battery-full" size={10} color={activeWall ? fg : '#2E7D32'} />
          </View>
        </View>

        {/* Dual-Pane Center: Left Menu List, Right Album / App Hero Card */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Left Pane: Authentic iPod Menu with Chevron > */}
          <View
            style={{
              flex: 1.1,
              backgroundColor: activeWall ? hexWithAlpha(bg, 0.75) : '#FFFFFF',
              borderRightWidth: 1,
              borderRightColor: activeWall ? hexWithAlpha(fg, 0.25) : '#E0E0E0',
              justifyContent: 'space-around',
              paddingVertical: 2,
            }}
          >
            {visibleApps.map((item, i) => {
              const actualIdx = startIdx + i;
              const isSelected = actualIdx === safeDeskIdx;
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 6,
                    paddingVertical: 2.5,
                    backgroundColor: isSelected
                      ? activeWall
                        ? fg
                        : '#0288D1'
                      : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 8,
                      fontWeight: isSelected ? '900' : '600',
                      color: isSelected ? (activeWall ? bg : '#FFFFFF') : activeWall ? fg : '#212121',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {getDesktopLabel(item.id, item.label, os.lang)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 7.5,
                      fontWeight: '900',
                      color: isSelected ? (activeWall ? bg : '#FFFFFF') : activeWall ? fg : '#9E9E9E',
                    }}
                  >
                    ›
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Right Pane: Album Art / Now Playing / Hero App Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: activeWall ? hexWithAlpha(bg, 0.6) : '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
            }}
          >
            {/* Square Album Art Jewel Case */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                backgroundColor: activeWall ? fg : '#212121',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <Ionicons
                name={curItem.icon}
                size={22}
                color={activeWall ? bg : '#FFFFFF'}
              />
            </View>
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 7.5,
                fontWeight: '900',
                color: activeWall ? fg : '#212121',
                marginTop: 4,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {getDesktopLabel(curItem.id, curItem.label, os.lang)}
            </Text>
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 6,
                fontWeight: '700',
                color: activeWall ? hexWithAlpha(fg, 0.7) : '#757575',
                marginTop: 1,
              }}
            >
              {safeDeskIdx + 1} of {total}
            </Text>
          </View>
        </View>

        {/* Bottom Click Wheel Center Button Prompt */}
        <View
          style={{
            height: 12,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.85) : '#EEEEEE',
            borderTopWidth: 1,
            borderTopColor: activeWall ? hexWithAlpha(fg, 0.25) : '#E0E0E0',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '700', color: activeWall ? fg : '#757575' }}>
            ▲▼ WHEEL • [A] SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6, fontWeight: '900', color: activeWall ? fg : '#212121' }}>
            APPLE COMPUTER
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 4: Big 3x2 Cards (6 large cards per page — ideal for showcasing wallpapers!)
  if (os.menuStyle === 'cards') {
    const cardCols = 3;
    const cardRows = 2;
    const cardPageSize = cardCols * cardRows;
    const cardTotalPages = Math.max(1, Math.ceil(visibleIcons.length / cardPageSize));
    const cardCurPage = Math.min(cardTotalPages - 1, Math.floor(safeDeskIdx / cardPageSize));
    const cardStart = cardCurPage * cardPageSize;

    return (
      <View style={[styles.deskGrid, { position: 'relative' }]}>
        {renderWallBackdrop()}

        {Array.from({ length: cardRows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cardCols }, (_, c) => {
              const idx = cardStart + r * cardCols + c;
              const item = visibleIcons[idx];
              if (!item) {
                return <View key={`sp-c-${c}`} style={styles.deskTileSpacer} />;
              }
              const sel = idx === safeDeskIdx;
              const iconColor = sel ? bg : fg;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.deskTile,
                    { borderRadius: 6 },
                    activeWall
                      ? {
                          borderWidth: 2,
                          borderColor: sel ? fg : hexWithAlpha(fg, 0.85),
                          backgroundColor: sel ? fg : hexWithAlpha(bg, 0.72),
                        }
                      : {
                          borderColor: fg,
                          backgroundColor: sel ? fg : 'transparent',
                        },
                  ]}
                >
                  <Ionicons name={item.icon} size={24} color={iconColor} />
                  <Text
                    style={[styles.deskLbl, { color: iconColor, fontSize: 9, marginTop: 4 }]}
                    numberOfLines={1}
                  >
                    {getDesktopLabel(item.id, item.label, os.lang)}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* Custom 3x2 Page Strip */}
        <Pressable
          onPress={() => {
            const nextPage = (cardCurPage + 1) % cardTotalPages;
            os.deskIdx = nextPage * cardPageSize;
            os.cb.onPlaySound?.('hit');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            borderWidth: 1,
            borderColor: hexWithAlpha(fg, 0.45),
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            borderRadius: 3,
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(
              os.lang,
              `PAGE ${cardCurPage + 1}/${cardTotalPages}`,
              `SAYFA ${cardCurPage + 1}/${cardTotalPages}`
            )}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {Array.from({ length: cardTotalPages }).map((_, p) => (
              <View
                key={p}
                style={{
                  width: p === cardCurPage ? 12 : 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: fg,
                  opacity: p === cardCurPage ? 1 : 0.35,
                }}
              />
            ))}
          </View>
        </Pressable>
      </View>
    );
  }

  // STYLE 1 (DEFAULT): Crisp 4x3 Grid (12 items per page)
  return (
    <View style={[styles.deskGrid, { position: 'relative' }]}>
      {renderWallBackdrop()}

      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.deskRow}>
          {Array.from({ length: cols }, (_, c) => {
            const idx = pageStart + r * cols + c;
            const item = visibleIcons[idx];
            if (!item) {
              return <View key={`sp-${c}`} style={styles.deskTileSpacer} />;
            }
            const sel = idx === safeDeskIdx;
            const iconColor = sel ? bg : fg;
            return (
              <View
                key={item.id}
                style={[
                  styles.deskTile,
                  activeWall
                    ? {
                        borderWidth: 1.5,
                        borderColor: sel ? fg : hexWithAlpha(fg, 0.85),
                        backgroundColor: sel ? fg : hexWithAlpha(bg, 0.72),
                      }
                    : {
                        borderColor: fg,
                        backgroundColor: sel ? fg : 'transparent',
                      },
                ]}
              >
                <Ionicons name={item.icon} size={19} color={iconColor} />
                <Text style={[styles.deskLbl, { color: iconColor, fontSize: 8.2, marginTop: 2 }]} numberOfLines={1}>
                  {getDesktopLabel(item.id, item.label, os.lang)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {renderPageStrip(false)}
    </View>
  );
}

export function renderArcadeBrowser(os: RetroDeckOS, fg: string, bg: string) {
  const entries = os.getArcadeCatalogEntries();
  const scores = os.cb.getHighScores();
  const isPro = os.cb.getIsPro?.() ?? false;
  const activeWall = os.getActiveWallpaper();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const totalEntries = entries.length;
  const safeGameIdx = Math.max(0, Math.min(os.gameIdx, Math.max(0, totalEntries - 1)));

  const getEntryTitle = (entry: (typeof entries)[number]) =>
    entry.kind === 'jar' ? entry.jar.name : entry.cart.title;
  const getEntryTag = (entry: (typeof entries)[number]) => {
    if (entry.kind === 'jar') return entry.jar.hasSave ? 'JAR • SAVE' : 'J2ME JAR';
    const hs = scores[entry.cart.id] || 0;
    const locked = isCartridgeProLocked(entry.cart.id, isPro);
    if (locked) return '[PRO]';
    return hs > 0 ? `HI:${hs}` : entry.cart.genre.slice(0, 6);
  };
  const renderEntryIcon = (
    entry: (typeof entries)[number],
    size: number,
    iconColor: string,
    radius = 4
  ) => {
    if (entry.kind === 'jar' && entry.jar.iconUri) {
      return (
        <Image
          source={{ uri: entry.jar.iconUri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="contain"
        />
      );
    }
    if (entry.kind === 'jar') {
      return <Ionicons name="phone-portrait-outline" size={Math.round(size * 0.78)} color={iconColor} />;
    }
    const locked = isCartridgeProLocked(entry.cart.id, isPro);
    return <Ionicons name={locked ? 'lock-closed' : 'game-controller'} size={Math.round(size * 0.78)} color={iconColor} />;
  };

  const renderWallBackdrop = () =>
    activeWall ? (
      <>
        <Image
          source={activeWall.image}
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: -6,
            bottom: -6,
            width: undefined,
            height: undefined,
          }}
          resizeMode="cover"
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: -6,
            bottom: -6,
            backgroundColor: bg,
            opacity: os.getWallpaperDimOpacity(),
          }}
        />
      </>
    ) : null;

  // STYLE 2: Nokia 3310 Single-Cartridge / JAR Carousel
  if (os.menuStyle === 'nokia') {
    const cur = entries[safeGameIdx] || entries[0];
    const prev = entries[(safeGameIdx + totalEntries - 1) % totalEntries];
    const next = entries[(safeGameIdx + 1) % totalEntries];

    return (
      <View style={[styles.deskGrid, { position: 'relative', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: fg }}>
            {cur?.kind === 'jar'
              ? 'J2ME JAR'
              : pickLang(os.lang, 'CARTRIDGE', 'KARTUS')}
          </Text>
          <View style={{ backgroundColor: fg, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: bg }}>
              {String(safeGameIdx + 1).padStart(3, '0')}/{totalEntries}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingHorizontal: 2 }}>
          <View style={{ alignItems: 'center', opacity: 0.45, width: 34 }}>
            {prev ? renderEntryIcon(prev, 16, fg, 3) : <Ionicons name="game-controller" size={14} color={fg} />}
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              ◀ {prev ? getEntryTitle(prev) : ''}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (cur) {
                const s = os.launchArcadeEntry(cur);
                os.cb.onPlaySound?.(s);
              }
            }}
            style={{
              flex: 1,
              marginHorizontal: 5,
              borderWidth: 2,
              borderColor: fg,
              backgroundColor: activeWall ? hexWithAlpha(bg, 0.82) : 'transparent',
              borderRadius: 6,
              paddingVertical: 12,
              paddingHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: cur?.kind === 'jar' && cur.jar.iconUri ? 'transparent' : fg,
                borderWidth: cur?.kind === 'jar' && cur.jar.iconUri ? 1.5 : 0,
                borderColor: fg,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {cur ? renderEntryIcon(cur, 32, bg, 6) : <Ionicons name="game-controller" size={22} color={bg} />}
            </View>
            <Text
              style={{ fontFamily: monoFont, fontSize: 11, fontWeight: '900', color: fg, textAlign: 'center' }}
              numberOfLines={1}
            >
              {cur ? getEntryTitle(cur) : ''}
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '800', color: fg, opacity: 0.85 }} numberOfLines={1}>
              {cur ? getEntryTag(cur) : ''}
            </Text>
          </Pressable>

          <View style={{ alignItems: 'center', opacity: 0.45, width: 34 }}>
            {next ? renderEntryIcon(next, 16, fg, 3) : <Ionicons name="game-controller" size={14} color={fg} />}
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              {next ? getEntryTitle(next) : ''} ▶
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            borderTopWidth: 1,
            borderTopColor: hexWithAlpha(fg, 0.4),
            paddingVertical: 2,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, '◀ / ▶ BROWSE  •  [A] PLAY', '◀ / ▶ GEZ  •  [A] OYNA')}
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 1 & 4: Paginated 4x3 Grid (12/page) OR Big 3x2 Cards (6/page)
  if (os.menuStyle === 'grid' || os.menuStyle === 'cards') {
    const isCards = os.menuStyle === 'cards';
    const cols = isCards ? 3 : 4;
    const rows = isCards ? 2 : 3;
    const pageSize = cols * rows;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const curPage = Math.min(totalPages - 1, Math.floor(safeGameIdx / pageSize));
    const pageStart = curPage * pageSize;

    return (
      <View style={[styles.deskGrid, { position: 'relative' }]}>
        {renderWallBackdrop()}

        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cols }, (_, c) => {
              const idx = pageStart + r * cols + c;
              const entry = entries[idx];
              if (!entry) {
                return <View key={`sp-g-${c}`} style={styles.deskTileSpacer} />;
              }
              const sel = idx === safeGameIdx;
              const ink = sel ? bg : fg;
              const title = getEntryTitle(entry);
              const tag = getEntryTag(entry);
              return (
                <Pressable
                  key={entry.kind === 'jar' ? entry.jar.appPath : entry.cart.id}
                  onPress={() => {
                    if (os.gameIdx !== idx) {
                      os.gameIdx = idx;
                      os.cb.onPlaySound?.('hit');
                    } else {
                      const s = os.launchArcadeEntry(entry);
                      os.cb.onPlaySound?.(s);
                    }
                  }}
                  style={[
                    styles.deskTile,
                    { borderRadius: isCards ? 6 : 4, paddingHorizontal: 2 },
                    activeWall
                      ? {
                          borderWidth: isCards ? 2 : 1.5,
                          borderColor: sel ? fg : hexWithAlpha(fg, 0.85),
                          backgroundColor: sel ? fg : hexWithAlpha(bg, 0.74),
                        }
                      : {
                          borderColor: fg,
                          backgroundColor: sel ? fg : 'transparent',
                        },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {renderEntryIcon(entry, isCards ? 20 : 14, ink, 3)}
                    {entry.kind === 'cart' && (
                      <Text style={{ fontFamily: monoFont, fontSize: isCards ? 8 : 7, fontWeight: '900', color: ink }}>
                        {String(entry.cartIndex + 1).padStart(2, '0')}
                      </Text>
                    )}
                    {entry.kind === 'jar' && (
                      <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: ink }}>
                        JAR
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.deskLbl,
                      { color: ink, fontSize: isCards ? 8.5 : 7.2, marginTop: isCards ? 3 : 1.5, textAlign: 'center' },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {isCards && (
                    <Text
                      style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', color: ink, opacity: 0.8, marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {tag}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Tappable Page Strip */}
        <Pressable
          onPress={() => {
            const nextPage = (curPage + 1) % totalPages;
            os.gameIdx = nextPage * pageSize;
            os.cb.onPlaySound?.('hit');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            borderWidth: 1,
            borderColor: hexWithAlpha(fg, 0.45),
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            borderRadius: 3,
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(
              os.lang,
              `PAGE ${curPage + 1}/${totalPages} (${safeGameIdx + 1}/${totalEntries})`,
              `SAYFA ${curPage + 1}/${totalPages} (${safeGameIdx + 1}/${totalEntries})`
            )}
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, '[A] PLAY ▶', '[A] OYNA ▶')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // WINDOWS EXPLORER GAMES FOLDER (Win 95/XP/7/8/10/11)
  if (isWinUiActive(os)) {
    const L = os.lang;
    const variant = getWinVariant(os);
    const exp = getWinExplorerPalette(variant);
    const cols = 4;
    const rows = 2;
    const pageSize = cols * rows;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const curPage = Math.min(totalPages - 1, Math.floor(safeGameIdx / pageSize));
    const pageStart = curPage * pageSize;
    const activeEntry = entries[safeGameIdx] || entries[0];

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: exp.paneBg,
          borderWidth: 1.5,
          borderColor: exp.frameBorder,
          borderRadius: exp.radius,
          overflow: 'hidden',
        }}
      >
        {/* Explorer Address Bar */}
        <View
          style={{
            backgroundColor: exp.toolbarBg,
            borderBottomWidth: 1,
            borderBottomColor: exp.toolbarBorder,
            paddingHorizontal: 5,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: exp.addressBg,
              borderWidth: 1,
              borderColor: exp.addressBorder,
              borderRadius: Math.min(3, exp.radius),
              paddingHorizontal: 5,
              paddingVertical: 1.5,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Ionicons name="folder-open" size={9} color="#107C10" />
            <Text style={{ fontFamily: monoFont, fontSize: 7.2, fontWeight: '800', color: exp.text, flex: 1 }} numberOfLines={1}>
              {os.j2meGames.length > 0
                ? pickLang(L, `Computer > C: > Games (JAR:${os.j2meGames.length})`, `Bilgisayar > C: > Oyunlar (JAR:${os.j2meGames.length})`)
                : pickLang(L, 'Computer > C: > Games > Cartridges', 'Bilgisayar > C: > Oyunlar > Kartuslar')}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              const nextPage = (curPage + 1) % totalPages;
              os.gameIdx = nextPage * pageSize;
              os.cb.onPlaySound?.('hit');
            }}
            style={{
              backgroundColor: exp.cardBg,
              borderWidth: 1,
              borderColor: exp.addressBorder,
              borderRadius: Math.min(3, exp.radius),
              paddingHorizontal: 5,
              paddingVertical: 1.5,
            }}
          >
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: exp.text }}>
              {pickLang(L, `P.${curPage + 1}/${totalPages}`, `S.${curPage + 1}/${totalPages}`)}
            </Text>
          </Pressable>
        </View>

        {/* 4x2 Games Icon Grid inside Explorer Window (JAR icons + Cartridges) */}
        <View style={{ flex: 1, padding: 5, justifyContent: 'space-around', gap: 4 }}>
          {Array.from({ length: rows }, (_, r) => (
            <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: cols }, (_, c) => {
                const idx = pageStart + r * cols + c;
                const entry = entries[idx];
                if (!entry) return <View key={`sp-w-${c}`} style={{ flex: 1 }} />;
                const sel = idx === safeGameIdx;
                const isJar = entry.kind === 'jar';
                const locked = entry.kind === 'cart' && isCartridgeProLocked(entry.cart.id, isPro);
                const iconBoxRadius = variant === 'win11' ? 6 : variant === 'win8' || variant === 'win95' ? 0 : 4;

                return (
                  <Pressable
                    key={isJar ? entry.jar.appPath : entry.cart.id}
                    onPress={() => {
                      if (os.gameIdx !== idx) {
                        os.gameIdx = idx;
                        os.cb.onPlaySound?.('hit');
                      } else {
                        const s = os.launchArcadeEntry(entry);
                        os.cb.onPlaySound?.(s);
                      }
                    }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: exp.radius,
                      borderWidth: 1,
                      borderColor: sel ? exp.selBorder : 'transparent',
                      backgroundColor: sel ? exp.selBg : 'transparent',
                      paddingHorizontal: 2,
                      paddingVertical: 2,
                      position: 'relative',
                    }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: iconBoxRadius,
                        backgroundColor:
                          isJar && entry.jar.iconUri
                            ? 'transparent'
                            : sel
                            ? exp.accent
                            : locked
                            ? '#B45309'
                            : isJar
                            ? '#2563EB'
                            : '#107C10',
                        borderWidth: 1,
                        borderColor: sel ? '#FFFFFF' : locked ? '#F59E0B' : isJar ? '#60A5FA' : '#0E6B0E',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {renderEntryIcon(entry, 24, '#FFFFFF', Math.max(0, iconBoxRadius - 1))}
                    </View>
                    {isJar && entry.jar.hasSave && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 6,
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#22C55E',
                          borderWidth: 1,
                          borderColor: '#FFFFFF',
                        }}
                      />
                    )}
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 7,
                        fontWeight: sel ? '900' : '700',
                        color: sel ? exp.selText : exp.text,
                        marginTop: 2.5,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {getEntryTitle(entry)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Explorer Bottom Details Bar */}
        <View
          style={{
            backgroundColor: exp.statusBg,
            borderTopWidth: 1,
            borderTopColor: exp.statusBorder,
            paddingHorizontal: 6,
            paddingVertical: 2.5,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: exp.subText, flex: 1 }} numberOfLines={1}>
            {activeEntry
              ? `${String(safeGameIdx + 1).padStart(3, '0')}. ${getEntryTitle(activeEntry)} • ${getEntryTag(activeEntry)}`
              : ''}
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: exp.accent }}>
            {pickLang(L, '[A] PLAY', '[A] OYNA')}
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 3: Classic 7-Row Retro List (with JAR icons + Cartridges)
  const visibleCount = 7;
  const start = Math.max(0, Math.min(totalEntries - visibleCount, safeGameIdx - 3));
  const slice = entries.slice(start, start + visibleCount);

  return (
    <View style={[styles.listWrap, { position: 'relative' }]}>
      {renderWallBackdrop()}
      <Text
        style={[
          styles.subHeader,
          {
            color: fg,
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.78) : 'transparent',
            paddingHorizontal: activeWall ? 4 : 0,
          },
        ]}
      >
        {tOs('arcadeHeader', { cur: safeGameIdx + 1, total: totalEntries }, os.lang)}
      </Text>
      {slice.map((entry, i) => {
        const realIdx = start + i;
        const sel = realIdx === safeGameIdx;
        const ink = sel ? bg : fg;
        return (
          <Pressable
            key={entry.kind === 'jar' ? entry.jar.appPath : entry.cart.id}
            onPress={() => {
              if (os.gameIdx !== realIdx) {
                os.gameIdx = realIdx;
                os.cb.onPlaySound?.('hit');
              } else {
                const s = os.launchArcadeEntry(entry);
                os.cb.onPlaySound?.(s);
              }
            }}
            style={[
              styles.listRow,
              {
                backgroundColor: sel
                  ? fg
                  : activeWall
                  ? hexWithAlpha(bg, 0.74)
                  : 'transparent',
                borderColor: fg,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              {entry.kind === 'jar' && renderEntryIcon(entry, 13, ink, 2)}
              <Text style={[styles.listTxt, { color: ink, flex: 1 }]} numberOfLines={1}>
                {entry.kind === 'jar'
                  ? entry.jar.name
                  : `${String(entry.cartIndex + 1).padStart(3, '0')}. ${entry.cart.title}`}
              </Text>
            </View>
            <Text style={[styles.listMeta, { color: ink }]}>
              {getEntryTag(entry)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function renderSetup(os: RetroDeckOS, fg: string, bg: string) {
  const isPro = os.cb.getIsPro?.() ?? false;
  const L = os.lang;
  const activeWall = os.getActiveWallpaper();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const menuStyleLabelMap = {
    grid: tOs('menuStyleGrid', L),
    nokia: tOs('menuStyleNokia', L),
    list: tOs('menuStyleList', L),
    cards: tOs('menuStyleCards', L),
    windows: tOs('menuStyleWindows', L),
    windows_7: tOs('menuStyleWindows7', L),
    windows_8: tOs('menuStyleWindows8', L),
    macos: tOs('menuStyleMacos', L),
    psp_xmb: tOs('menuStylePsp', L),
    xbox_blades: tOs('menuStyleXbox', L),
    cyberpunk: tOs('menuStyleCyberpunk', L),
    wii_channels: tOs('menuStyleWii', L),
    pipboy: tOs('menuStylePipboy', L),
    ipod_classic: tOs('menuStyleIpod', L),
    nexus_os: tOs('menuStyleNexus', L),
  };

  // SUB-PAGE: Dedicated Desktop Style Picker Screen
  if (os.setupSubPage === 'menu_style') {
    const totalStyles = DESKTOP_MENU_STYLES.length;
    const curStyle = DESKTOP_MENU_STYLES[os.menuStylePickerIdx] || DESKTOP_MENU_STYLES[0];
    const isCurApplied = curStyle === os.menuStyle;

    // Windowed list of 5 visible styles
    const PAGE_SIZE = 5;
    const maxStart = Math.max(0, totalStyles - PAGE_SIZE);
    const startIdx = Math.max(0, Math.min(os.menuStylePickerIdx - 2, maxStart));
    const visibleStyles = DESKTOP_MENU_STYLES.slice(startIdx, startIdx + PAGE_SIZE);

    return (
      <View style={styles.listWrap}>
        {/* Header with Title and Index */}
        <View style={[styles.compHeader, { marginBottom: 3 }]}>
          <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
            {tOs('setupMenuStylePickerTitle', L)}
          </Text>
          <Text style={[styles.listMeta, { color: fg }]}>
            {os.menuStylePickerIdx + 1}/{totalStyles}
          </Text>
        </View>

        {/* Styles List */}
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          {visibleStyles.map((styleKey, i) => {
            const actualIdx = startIdx + i;
            const isSelected = actualIdx === os.menuStylePickerIdx;
            const isApplied = styleKey === os.menuStyle;
            const label = menuStyleLabelMap[styleKey];

            return (
              <View
                key={styleKey}
                style={[
                  styles.setupRow,
                  {
                    borderColor: fg,
                    backgroundColor: isSelected ? fg : 'transparent',
                    marginBottom: 3,
                    paddingVertical: 3.5,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.setupTxt,
                    { color: isSelected ? bg : fg, flex: 1 },
                    isSelected && { fontWeight: '900' },
                  ]}
                  numberOfLines={1}
                >
                  {isSelected ? '▶ ' : '  '}
                  {label}
                </Text>
                {isApplied && (
                  <View
                    style={{
                      backgroundColor: isSelected ? bg : fg,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 2,
                      marginRight: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 6.5,
                        fontWeight: '900',
                        color: isSelected ? fg : bg,
                      }}
                    >
                      {tOs('active', L)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Bottom Navigation Hints */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, height: 12 }}>
          <Text style={[styles.miniHint, { color: fg, marginTop: 0 }]}>
            [B] {pickLang(L, 'BACK', 'GERI')}
          </Text>
          <Text style={[styles.miniHint, { color: fg, marginTop: 0, fontWeight: '900' }]}>
            {isCurApplied ? pickLang(L, 'ALREADY ACTIVE', 'ZATEN AKTIF') : `[A] ${pickLang(L, 'APPLY', 'UYGULA')}`}
          </Text>
        </View>
      </View>
    );
  }

  // SUB-PAGE 2: Dedicated Startup Sound Picker Screen
  if (os.setupSubPage === 'startup_sound') {
    const totalSounds = STARTUP_SOUND_OPTIONS.length;
    const curSound = STARTUP_SOUND_OPTIONS[os.startupSoundPickerIdx] || STARTUP_SOUND_OPTIONS[0];
    const isCurApplied = curSound.id === os.startupSoundId;

    const PAGE_SIZE = 5;
    const maxStart = Math.max(0, totalSounds - PAGE_SIZE);
    const startIdx = Math.max(0, Math.min(os.startupSoundPickerIdx - 2, maxStart));
    const visibleSounds = STARTUP_SOUND_OPTIONS.slice(startIdx, startIdx + PAGE_SIZE);

    return (
      <View style={styles.listWrap}>
        <View style={[styles.compHeader, { marginBottom: 3 }]}>
          <Text style={[styles.subHeader, { color: fg, marginBottom: 0 }]}>
            {pickLang(L, 'STARTUP CHIME', 'ACILIS SESI')}
          </Text>
          <Text style={[styles.listMeta, { color: fg }]}>
            {os.startupSoundPickerIdx + 1}/{totalSounds}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          {visibleSounds.map((item, i) => {
            const actualIdx = startIdx + i;
            const isSelected = actualIdx === os.startupSoundPickerIdx;
            const isApplied = item.id === os.startupSoundId;

            return (
              <View
                key={item.id}
                style={[
                  styles.setupRow,
                  {
                    borderColor: fg,
                    backgroundColor: isSelected ? fg : 'transparent',
                    marginBottom: 3,
                    paddingVertical: 3.5,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.setupTxt,
                    { color: isSelected ? bg : fg, flex: 1 },
                    isSelected && { fontWeight: '900' },
                  ]}
                  numberOfLines={1}
                >
                  {isSelected ? '▶ ' : '  '}
                  {item.name}
                </Text>
                {isApplied && (
                  <View
                    style={{
                      backgroundColor: isSelected ? bg : fg,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 2,
                      marginRight: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 6.5,
                        fontWeight: '900',
                        color: isSelected ? fg : bg,
                      }}
                    >
                      {tOs('active', L)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, height: 12 }}>
          <Text style={[styles.miniHint, { color: fg, marginTop: 0 }]}>
            [B] {pickLang(L, 'BACK', 'GERI')}
          </Text>
          <Text style={[styles.miniHint, { color: fg, marginTop: 0, fontWeight: '900' }]}>
            {isCurApplied ? pickLang(L, '[A] PREVIEW TONE', '[A] DINLE') : pickLang(L, '[A] SET & PREVIEW', '[A] SEC & DINLE')}
          </Text>
        </View>
      </View>
    );
  }

  const items = [
    isPro ? tOs('setupProActive', L) : tOs('setupProUpgrade', L),
    `${tOs('setupPalette', L)}: ${os.cb.getPaletteName()}`,
    `${tOs('setupWallpaper', L)}: ${activeWall ? activeWall.title : tOs('off', L)}`,
    `${tOs('setupMenuStyle', L)}: ${menuStyleLabelMap[os.menuStyle]}`,
    `${pickLang(L, 'Startup Sound', 'Acilis Sesi')}: ${STARTUP_SOUND_OPTIONS.find((s) => s.id === os.startupSoundId)?.name || 'AUTO'}`,
    `${tOs('setupScanlines', L)}: ${os.cb.getScanlines() ? tOs('on', L) : tOs('off', L)}`,
    `${tOs('setupClockFace', L)}: ${os.clockFace === 'analog' ? tOs('analog', L) : tOs('digital', L)}`,
    `${tOs('setupLiveSms', L)}: ${os.liveAiSmsEnabled ? tOs('on', L) : tOs('off', L)}`,
    tOs('setupLanguage', L),
    tOs('setupVault', L),
    tOs('setupReboot', L),
    tOs('setupFormatSim', L),
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
          {tOs('setupTitle', L)}
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
          {tOs('prev', L)}
        </Text>
        <Text style={[styles.miniHint, { color: fg, marginTop: 0, opacity: startIdx < maxStart ? 0.9 : 0.2 }]}>
          {tOs('more', L)}
        </Text>
      </View>
    </View>
  );
}

export function renderWallpapers(os: RetroDeckOS, fg: string, bg: string) {
  const L = os.lang;
  const totalScenes = REAL_POSTCARDS.length;
  const isCustomIdx = os.wallpaperIdx === totalScenes + 1;
  const isNone = os.wallpaperIdx === 0;

  const previewCard: { id: string; title: string; image: any; isCustom?: boolean } | null = isNone
    ? null
    : isCustomIdx
    ? os.wallpaperCustomUri
      ? {
          id: 'custom',
          title: pickLang(L, 'MY PHOTO (CROP)', 'BENIM RESMIM (KIRPILMIS)'),
          image: { uri: os.wallpaperCustomUri },
          isCustom: true,
        }
      : {
          id: 'custom',
          title: pickLang(L, '+ PICK FROM GALLERY', '+ GALERIDEN RESIM SEC'),
          image: null,
          isCustom: true,
        }
    : REAL_POSTCARDS[os.wallpaperIdx - 1] || REAL_POSTCARDS[0];

  const currentActiveId = os.wallpaperId || 'none';
  const isApplied = isNone
    ? currentActiveId === 'none'
    : isCustomIdx
    ? currentActiveId === 'custom'
    : previewCard?.id === currentActiveId;

  const dimLabels = [
    pickLang(L, 'VIVID (18%)', 'CANLI (%18)'),
    pickLang(L, 'BALANCED (36%)', 'DENGELI (%36)'),
    pickLang(L, 'THEME TINT (56%)', 'TEMA TONU (%56)'),
  ];
  const dimText = dimLabels[os.wallpaperDimIdx] || dimLabels[1];
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const cleanPreview = os.wallpaperCleanPreview && os.wallpaperViewMode === 'preview';
  const viewModeLabel =
    os.wallpaperViewMode === 'grid3x2'
      ? '3x2'
      : os.wallpaperViewMode === 'grid4x3'
      ? '4x3'
      : pickLang(L, 'FULL', 'TAM');

  // GRID MODES: 3x2 (6/page) or 4x3 (12/page) live pixel thumbnail gallery
  if (os.wallpaperViewMode === 'grid3x2' || os.wallpaperViewMode === 'grid4x3') {
    const is3x2 = os.wallpaperViewMode === 'grid3x2';
    const cols = is3x2 ? 3 : 4;
    const rows = is3x2 ? 2 : 3;
    const pageSize = cols * rows;
    const totalEntries = totalScenes + 2; // 0 = OFF, 1..N = scenes, N+1 = custom
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const curPage = Math.min(totalPages - 1, Math.floor(os.wallpaperIdx / pageSize));
    const pageStart = curPage * pageSize;

    return (
      <View style={[styles.deskGrid, { justifyContent: 'space-between' }]}>
        {/* Top Bar with Tappable View Mode Switcher */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: fg,
            paddingHorizontal: 6,
            paddingVertical: 2.5,
          }}
        >
          <Text
            style={{ fontFamily: monoFont, fontSize: 8.2, fontWeight: '900', color: bg, flex: 1 }}
            numberOfLines={1}
          >
            {String(os.wallpaperIdx).padStart(2, '0')}/{totalScenes}{' '}
            {previewCard ? previewCard.title : pickLang(L, 'OFF (SOLID)', 'KAPALI (DUZ)')}
          </Text>
          <Pressable
            onPress={() => {
              os.cycleWallpaperViewMode();
              os.cb.onPlaySound?.('hit');
            }}
            style={{
              backgroundColor: bg,
              paddingHorizontal: 5,
              paddingVertical: 1,
              marginLeft: 4,
            }}
          >
            <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
              [{viewModeLabel}]
            </Text>
          </Pressable>
        </View>

        {/* Live Pixel Thumbnail Grid */}
        <View style={{ flex: 1, gap: 3, paddingVertical: 2 }}>
          {Array.from({ length: rows }, (_, r) => (
            <View key={r} style={styles.deskRow}>
              {Array.from({ length: cols }, (_, c) => {
                const idx = pageStart + r * cols + c;
                if (idx >= totalEntries) {
                  return <View key={`sp-w-${c}`} style={styles.deskTileSpacer} />;
                }
                const isCustomEntry = idx === totalScenes + 1;
                const card = idx === 0 ? null : isCustomEntry ? (os.wallpaperCustomUri ? { id: 'custom', title: 'PHOTO', image: { uri: os.wallpaperCustomUri } } : null) : REAL_POSTCARDS[idx - 1];
                const sel = idx === os.wallpaperIdx;
                const activeItem = isCustomEntry ? currentActiveId === 'custom' : card ? card.id === currentActiveId : currentActiveId === 'none';

                return (
                  <Pressable
                    key={isCustomEntry ? '__custom__' : card ? card.id : '__none__'}
                    onPress={() => {
                      os.wallpaperIdx = idx;
                      if (isCustomEntry) {
                        if (!os.wallpaperCustomUri) {
                          os.pickAndCropCustomWallpaper();
                        } else {
                          os.setWallpaperById('custom');
                          os.smsBanner = `[WP] ${pickLang(L, 'MY PHOTO', 'BENIM RESMIM')}`;
                          os.smsBannerTimer = 2.0;
                          os.cb.onPlaySound?.('powerup');
                        }
                      } else {
                        os.setWallpaperById(card ? card.id : 'none');
                        os.smsBanner = card ? `[WP] ${card.title}` : `[WP] ${tOs('off', L)}`;
                        os.smsBannerTimer = 2.0;
                        os.cb.onPlaySound?.('powerup');
                      }
                    }}
                    style={{
                      flex: 1,
                      borderWidth: sel ? 2 : 1,
                      borderColor: sel ? fg : hexWithAlpha(fg, 0.45),
                      borderRadius: 3,
                      overflow: 'hidden',
                      backgroundColor: bg,
                      position: 'relative',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isCustomEntry ? (
                      card ? (
                        <Image
                          source={card.image}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="camera" size={14} color={fg} />
                          <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: fg, marginTop: 1 }}>
                            +CROP
                          </Text>
                        </View>
                      )
                    ) : card ? (
                      <Image
                        source={card.image}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: fg }}>
                        OFF
                      </Text>
                    )}

                    {/* Active/Selected Badge */}
                    {(sel || activeItem) && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: sel ? fg : hexWithAlpha(bg, 0.82),
                          paddingHorizontal: 2,
                          paddingVertical: 0.5,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: monoFont,
                            fontSize: is3x2 ? 6.8 : 6,
                            fontWeight: '900',
                            color: sel ? bg : fg,
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {activeItem ? '★ ' : ''}
                          {isCustomEntry && os.wallpaperCustomUri
                            ? pickLang(L, 'MY PHOTO', 'RESMIM')
                            : card
                            ? card.title
                            : 'OFF'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom Tappable Page & Mode Strip */}
        <Pressable
          onPress={() => {
            const nextPage = (curPage + 1) % totalPages;
            os.wallpaperIdx = nextPage * pageSize;
            os.cb.onPlaySound?.('hit');
          }}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: hexWithAlpha(fg, 0.5),
            paddingHorizontal: 6,
            paddingVertical: 1.5,
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(L, `PAGE ${curPage + 1}/${totalPages}`, `SAYFA ${curPage + 1}/${totalPages}`)}
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(L, '[0] VIEW  •  [A] APPLY', '[0] GORUNUM  •  [A] SEC')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        os.wallpaperCleanPreview = !os.wallpaperCleanPreview;
        os.cb.onPlaySound?.('hit');
      }}
      style={[styles.listWrap, { position: 'relative', justifyContent: 'space-between' }]}
    >
      {/* Full-Bleed Pixel Art Scene Preview */}
      {previewCard && (
        <>
          <Image
            source={previewCard.image}
            style={{
              position: 'absolute',
              left: -8,
              right: -8,
              top: -6,
              bottom: -6,
              width: undefined,
              height: undefined,
            }}
            resizeMode="cover"
          />
          {!cleanPreview && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: -8,
                right: -8,
                top: -6,
                bottom: -6,
                backgroundColor: bg,
                opacity: os.getWallpaperDimOpacity(),
              }}
            />
          )}
        </>
      )}

      {/* In clean preview mode with an image, hide ALL buttons, headers, and overlays */}
      {cleanPreview && previewCard ? null : (
        <>
          {/* Top Floating Scene Selector Pill (Matched to Active Theme Palette!) */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: fg,
              borderWidth: 1.5,
              borderColor: fg,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 8.8,
                fontWeight: '900',
                color: bg,
                flex: 1,
              }}
              numberOfLines={1}
            >
              ◀ {String(os.wallpaperIdx).padStart(2, '0')}/{totalScenes}{' '}
              {previewCard
                ? previewCard.title
                : pickLang(L, 'OFF (SOLID LCD)', 'KAPALI (TEMA RENGI)')}{' '}
              ▶
            </Text>
            <View
              style={{
                backgroundColor: isApplied ? bg : 'transparent',
                borderWidth: 1,
                borderColor: bg,
                paddingHorizontal: 4,
                paddingVertical: 1,
                marginLeft: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 7.5,
                  fontWeight: '900',
                  color: isApplied ? fg : bg,
                }}
              >
                {isApplied ? tOs('active', L) : pickLang(L, '[A] SET', '[A] SEC')}
              </Text>
            </View>
            {isCustomIdx && os.wallpaperCustomUri && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  if (!os.wallpaperCustomDeleteConfirm) {
                    os.wallpaperCustomDeleteConfirm = true;
                    os.smsBanner = pickLang(L, '[?] TAP/PRESS [A] TO CONFIRM DELETE', '[?] ONAYLAMAK ICIN SIL/A BAS');
                    os.smsBannerTimer = 2.5;
                    os.cb.onPlaySound?.('hit');
                  } else {
                    os.removeCustomWallpaper();
                  }
                }}
                style={{
                  backgroundColor: os.wallpaperCustomDeleteConfirm ? fg : bg,
                  borderWidth: 1,
                  borderColor: bg,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  marginLeft: 3,
                }}
              >
                <Text
                  style={{
                    fontFamily: monoFont,
                    fontSize: 7.5,
                    fontWeight: '900',
                    color: os.wallpaperCustomDeleteConfirm ? bg : fg,
                  }}
                >
                  {os.wallpaperCustomDeleteConfirm
                    ? pickLang(L, 'SURE?', 'SIL?')
                    : pickLang(L, 'DEL', 'SIL')}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                os.cycleWallpaperViewMode();
                os.cb.onPlaySound?.('hit');
              }}
              style={{
                backgroundColor: bg,
                paddingHorizontal: 4,
                paddingVertical: 1,
                marginLeft: 3,
              }}
            >
              <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
                [{viewModeLabel}]
              </Text>
            </Pressable>
          </View>

          {/* Center Card when custom image hasn't been picked yet */}
          {isCustomIdx && !os.wallpaperCustomUri && (
            <Pressable
              onPress={() => {
                os.pickAndCropCustomWallpaper();
              }}
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: fg,
                paddingVertical: 18,
                paddingHorizontal: 12,
                alignItems: 'center',
                gap: 5,
                backgroundColor: hexWithAlpha(fg, 0.08),
              }}
            >
              <Ionicons name="images" size={26} color={fg} />
              <Text style={{ fontFamily: monoFont, fontSize: 9.5, fontWeight: '900', color: fg }}>
                {pickLang(L, 'SELECT & CROP FROM GALLERY', 'GALERIDEN SEC VE KIRP')}
              </Text>
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 7.5,
                  fontWeight: '800',
                  color: fg,
                  opacity: 0.85,
                  textAlign: 'center',
                }}
              >
                {pickLang(
                  L,
                  'PRESS [A] OR TAP TO PICK YOUR OWN 4:3 WALLPAPER',
                  '[A] BAS VEYA DOKUN, KENDI 4:3 DUVAR KAGIDINI AYARLA'
                )}
              </Text>
            </Pressable>
          )}

          {/* Center Card only when OFF (solid LCD mode) */}
          {!previewCard && (
            <View
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: fg,
                paddingVertical: 18,
                paddingHorizontal: 10,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="image-outline" size={24} color={fg} />
              <Text style={{ fontFamily: monoFont, fontSize: 9.5, fontWeight: '900', color: fg }}>
                {pickLang(L, 'SOLID PALETTE MODE', 'KLASIK DUZ LCD MODU')}
              </Text>
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 8,
                  fontWeight: '800',
                  color: fg,
                  opacity: 0.8,
                  textAlign: 'center',
                }}
              >
                {pickLang(
                  L,
                  `PRESS [◀ / ▶] TO PREVIEW ${totalScenes} PIXEL SCENES`,
                  `${totalScenes} PIKSEL SAHNEYI GORMEK ICIN [◀ / ▶] BAS`
                )}
              </Text>
            </View>
          )}

          {/* Bottom Floating Theme-Matched Dim / Pure Preview Control Strip */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: previewCard ? hexWithAlpha(bg, 0.82) : 'transparent',
              borderWidth: 1.5,
              borderColor: fg,
              paddingHorizontal: 6,
              paddingVertical: 2.5,
            }}
          >
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 7.5,
                fontWeight: '900',
                color: fg,
              }}
            >
              ▲/▼ {pickLang(L, 'TINT:', 'UYUM:')} {dimText}
            </Text>
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 7.5,
                fontWeight: '900',
                color: fg,
              }}
            >
              {isCustomIdx && !os.wallpaperCustomUri
                ? pickLang(L, '[A] PICK/CROP', '[A] RESIM SEC')
                : isCustomIdx && os.wallpaperCustomDeleteConfirm
                ? pickLang(L, '[A] CONFIRM DELETE', '[A] SILMEYI ONAYLA')
                : isApplied && previewCard
                ? pickLang(L, '[A]/TAP FULLSCREEN', '[A]/DOKUN TAM EKRAN')
                : pickLang(L, '[A] APPLY', '[A] UYGULA')}
            </Text>
          </View>
        </>
      )}
    </Pressable>
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
        {tOs('themesHeader', { cur: os.themeIdx + 1, total: PALETTE_ORDER.length }, os.lang)}
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
              {active ? tOs('active', os.lang) : (locked ? '[PRO]' : t.category.slice(0, 6))}
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
      label: tOs('proRestoreLabel', os.lang),
      price: tOs('proRestoreSub', os.lang),
      badge: 'STORE',
    },
    {
      id: 'debug_reset',
      label: tOs('proRevokeLabel', os.lang),
      price: tOs('proRevokeSub', os.lang),
      badge: 'DEV',
    },
  ];

  return (
    <View style={[styles.listWrap, { paddingVertical: 2, paddingHorizontal: 4 }]}>
      {/* Header Bar */}
      <View style={[styles.compHeader, { marginBottom: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: fg }]}>
        <Text style={[styles.subHeader, { color: fg, marginBottom: 0, fontSize: 10, letterSpacing: 1 }]}>
          {isPro ? tOs('setupProActive', os.lang) : tOs('proTitleUpgrade', os.lang)}
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
            ? (expiration ? `${tOs('active', os.lang)}: ${new Date(expiration).toLocaleDateString()}` : tOs('proHeaderLifetime', os.lang))
            : tOs('proHeaderUnlockTag', os.lang)}
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
                ? tOs('proHintReset', os.lang)
                : (os.proIdx === 3
                    ? tOs('proHintRestore', os.lang)
                    : (isPro ? tOs('proHintDetails', os.lang) : tOs('proHintBuy', os.lang))))}
        </Text>
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 7.5,
            color: fg,
            opacity: 0.8,
          }}
        >
          [B] {tOs('back', os.lang)}
        </Text>
      </View>
    </View>
  );
}

export function renderJ2meInfo(os: RetroDeckOS, fg: string, bg: string) {
  const tr = os.lang === 'tr';
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const games = os.j2meGames;
  const totalSlots = games.length + 1;
  const safeIdx = Math.max(0, Math.min(os.j2meIdx, totalSlots - 1));

  if (games.length === 0) {
    const cards = [
      {
        icon: 'code-slash-outline' as const,
        label: tr ? 'DERLEYİCİ' : 'COMPILER',
        value: 'JAR → DEX',
        detail: tr ? 'Cihazda, başlatmadan önce' : 'On-device before launch',
      },
      {
        icon: 'save-outline' as const,
        label: tr ? 'KAYIT & RMS' : 'LIBRARY & RMS',
        value: tr ? 'OTOMATİK KAYIT' : 'AUTO SAVED',
        detail: tr ? 'Oyun ve ilerleme saklanır' : 'Game & saves persist here',
      },
    ];

    return (
      <View style={{ flex: 1, padding: 6, gap: 5, backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 27, height: 27, borderWidth: 1.5, borderColor: fg, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="phone-portrait-outline" size={15} color={fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: fg, fontFamily: monoFont, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>
              {tr ? 'J2ME OYUN ALANI' : 'J2ME GAME DECK'}
            </Text>
            <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7.5, opacity: 0.75 }}>
              {tr ? 'Gömülü Java ME çalışma zamanı' : 'Embedded Java ME runtime'}
            </Text>
          </View>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7, fontWeight: '900', borderWidth: 1, borderColor: fg, paddingHorizontal: 4, paddingVertical: 2 }}>
            ANDROID
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 5 }}>
          {cards.map((card) => (
            <View key={card.label} style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: hexWithAlpha(fg, 0.55), borderRadius: 5, paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={card.icon} size={9} color={fg} />
                <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 }}>{card.label}</Text>
              </View>
              <Text style={{ color: fg, fontFamily: monoFont, fontSize: 9, fontWeight: '900', marginTop: 2 }}>{card.value}</Text>
              <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, opacity: 0.75 }} numberOfLines={1}>{card.detail}</Text>
            </View>
          ))}
        </View>

        <View style={{ borderLeftWidth: 2, borderLeftColor: fg, paddingLeft: 6, gap: 2 }}>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7, fontWeight: '900' }}>
            {tr ? 'KALICI OYUN KÜTÜPHANESİ' : 'PERSISTENT GAME LIBRARY'}
          </Text>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7, opacity: 0.82 }} numberOfLines={2}>
            {tr
              ? 'Açılan her .jar oyunu ve oyun içi kayıtları (RMS) burada saklanır; tekrar seçmen gerekmez.'
              : 'Every launched .jar game & its RMS save data stay stored here for 1-tap relaunch.'}
          </Text>
        </View>

        <Pressable
          onPress={() => os.cb.onLaunchJ2me?.()}
          style={{ minHeight: 29, borderWidth: 1.5, borderColor: fg, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: hexWithAlpha(fg, 0.12) }}
        >
          <Ionicons name="folder-open-outline" size={12} color={fg} />
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }}>
            {tr ? 'JAR DOSYASI SEÇ' : 'CHOOSE JAR FILE'}
          </Text>
        </Pressable>
        <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, opacity: 0.65, textAlign: 'center' }}>
          {tr ? '[A] BAŞLAT  •  [B] GERİ' : '[A] SELECT  •  [B] BACK'}
        </Text>
      </View>
    );
  }

  const cols = 4;
  const rows = 2;
  const pageSize = cols * rows;
  const totalPages = Math.max(1, Math.ceil(totalSlots / pageSize));
  const curPage = Math.min(totalPages - 1, Math.floor(safeIdx / pageSize));
  const pageStart = curPage * pageSize;
  const activeGame = games[safeIdx];

  return (
    <View style={{ flex: 1, padding: 6, gap: 4, backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: hexWithAlpha(fg, 0.4), paddingBottom: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="game-controller-outline" size={13} color={fg} />
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>
            {tr ? `J2ME OYUNLARIM (${games.length})` : `J2ME GAMES (${games.length})`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {totalPages > 1 && (
            <Pressable
              onPress={() => {
                const nextPage = (curPage + 1) % totalPages;
                os.j2meIdx = nextPage * pageSize;
                os.cb.onPlaySound?.('hit');
              }}
              style={{ borderWidth: 1, borderColor: hexWithAlpha(fg, 0.55), borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}
            >
              <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900' }}>
                {curPage + 1}/{totalPages}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              os.j2meDeleteConfirm = false;
              os.cb.onLaunchJ2me?.();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: fg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5, backgroundColor: hexWithAlpha(fg, 0.12) }}
          >
            <Ionicons name="add" size={10} color={fg} />
            <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7, fontWeight: '900' }}>
              {tr ? 'JAR EKLE' : 'ADD JAR'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 4x2 Visual Icon Grid for Saved JAR Games */}
      <View style={{ flex: 1, justifyContent: 'space-around', gap: 4 }}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: cols }, (_, c) => {
              const slotIdx = pageStart + r * cols + c;
              if (slotIdx >= totalSlots) return <View key={`j-sp-${c}`} style={{ flex: 1 }} />;
              const isAddTile = slotIdx === games.length;
              const isSel = slotIdx === safeIdx;
              const tileFg = isSel ? bg : fg;
              const tileBg = isSel ? fg : hexWithAlpha(fg, 0.06);

              if (isAddTile) {
                return (
                  <Pressable
                    key="add-jar-tile"
                    onPress={() => {
                      os.j2meIdx = slotIdx;
                      os.j2meDeleteConfirm = false;
                      os.cb.onLaunchJ2me?.();
                      os.cb.onPlaySound?.('score');
                    }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: fg,
                      borderRadius: 6,
                      backgroundColor: tileBg,
                      padding: 3,
                    }}
                  >
                    <Ionicons name="folder-open-outline" size={18} color={tileFg} />
                    <Text style={{ color: tileFg, fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', marginTop: 3 }} numberOfLines={1}>
                      {tr ? '+ JAR SEC' : '+ ADD JAR'}
                    </Text>
                  </Pressable>
                );
              }

              const g = games[slotIdx];
              return (
                <Pressable
                  key={g.appPath}
                  onPress={() => {
                    if (os.j2meIdx !== slotIdx) {
                      os.j2meIdx = slotIdx;
                      os.j2meDeleteConfirm = false;
                      os.cb.onPlaySound?.('hit');
                    } else {
                      os.j2meDeleteConfirm = false;
                      os.cb.onLaunchJ2me?.(g.appPath);
                      os.cb.onPlaySound?.('score');
                    }
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSel ? 1.5 : 1,
                    borderColor: isSel ? fg : hexWithAlpha(fg, 0.42),
                    borderRadius: 6,
                    backgroundColor: tileBg,
                    paddingHorizontal: 3,
                    paddingVertical: 3,
                    position: 'relative',
                  }}
                >
                  {g.iconUri ? (
                    <Image
                      source={{ uri: g.iconUri }}
                      style={{ width: 30, height: 30, borderRadius: 5 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 5,
                        borderWidth: 1,
                        borderColor: hexWithAlpha(tileFg, 0.5),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="phone-portrait-outline" size={16} color={tileFg} />
                    </View>
                  )}

                  {g.hasSave && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 4,
                        backgroundColor: isSel ? bg : fg,
                        borderRadius: 3,
                        paddingHorizontal: 2.5,
                        paddingVertical: 0.5,
                      }}
                    >
                      <Text style={{ color: isSel ? fg : bg, fontFamily: monoFont, fontSize: 5.2, fontWeight: '900' }}>
                        SAVE
                      </Text>
                    </View>
                  )}

                  <Text
                    style={{
                      color: tileFg,
                      fontFamily: monoFont,
                      fontSize: 6.8,
                      fontWeight: isSel ? '900' : '700',
                      marginTop: 3,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Bottom Details & Quick Play / Delete Strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: hexWithAlpha(fg, 0.35),
          paddingTop: 3,
          gap: 6,
        }}
      >
        <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', flex: 1 }} numberOfLines={1}>
          {os.j2meDeleteConfirm
            ? tr
              ? 'SILMEK ICIN [DEL] / COP KUTUSUNA BAS'
              : 'PRESS [DEL] / TRASH TO REMOVE'
            : activeGame
            ? `${activeGame.name} • ${(activeGame.vendor || 'J2ME')} v${activeGame.version}${activeGame.hasSave ? ' • SAVE' : ''}`
            : tr
            ? 'YENI .JAR OYUNU EKLE'
            : 'PICK NEW .JAR FILE'}
        </Text>
        {activeGame && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              onPress={() => {
                os.j2meDeleteConfirm = false;
                os.cb.onLaunchJ2me?.(activeGame.appPath);
                os.cb.onPlaySound?.('score');
              }}
              style={{ backgroundColor: fg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1.5 }}
            >
              <Text style={{ color: bg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900' }}>
                {tr ? 'OYNA' : 'PLAY'}
              </Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() => {
                if (!os.j2meDeleteConfirm) {
                  os.j2meDeleteConfirm = true;
                  os.cb.onPlaySound?.('hit');
                } else {
                  os.removeSelectedJ2meGame();
                  os.cb.onPlaySound?.('die');
                }
              }}
              style={{ borderWidth: 1, borderColor: hexWithAlpha(fg, 0.6), borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}
            >
              <Ionicons
                name={os.j2meDeleteConfirm ? 'checkmark-circle' : 'trash-outline'}
                size={10}
                color={fg}
              />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export function renderDeviceInfo(os: RetroDeckOS, fg: string, bg: string) {
  const tr = os.lang === 'tr';
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const screen = Dimensions.get('screen');
  const density = PixelRatio.get();
  const androidInfo = Platform.OS === 'android' ? Platform.constants : null;
  const brand = androidInfo?.Brand?.trim() || Platform.OS.toUpperCase();
  const manufacturer = androidInfo?.Manufacturer?.trim() || brand;
  const model = androidInfo?.Model?.trim() || (tr ? 'Bilinmeyen cihaz' : 'Unknown device');
  const androidRelease = androidInfo?.Release || String(Platform.Version);
  const androidApi = androidInfo?.Version;
  const pixelWidth = Math.round(screen.width * density);
  const pixelHeight = Math.round(screen.height * density);
  const rnVersion = androidInfo?.reactNativeVersion;
  const runtimeVersion = rnVersion ? `${rnVersion.major}.${rnVersion.minor}.${rnVersion.patch}` : '—';
  const retroDeckVersion = Constants.nativeAppVersion || Constants.expoConfig?.version || '—';
  // Mirrors VERSION_NAME in android/j2me-core/build.gradle.
  const j2meLoaderVersion = '1.8.2';
  const cards = [
    {
      icon: 'hardware-chip-outline' as const,
      label: tr ? 'CIHAZ' : 'DEVICE',
      value: model,
      detail: `${manufacturer} · ${brand}`,
    },
    {
      icon: 'hardware-chip-outline' as const,
      label: tr ? 'ANDROID' : 'ANDROID',
      value: `Android ${androidRelease}`,
      detail: androidApi ? `API ${androidApi}` : (tr ? 'SİSTEM SÜRÜMÜ' : 'SYSTEM VERSION'),
    },
    {
      icon: 'scan-outline' as const,
      label: tr ? 'EKRAN' : 'DISPLAY',
      value: `${pixelWidth} × ${pixelHeight} PX`,
      detail: `${Math.round(screen.width)} × ${Math.round(screen.height)} DP · ${density}×`,
    },
    {
      icon: 'apps-outline' as const,
      label: tr ? 'UYGULAMA' : 'APPLICATION',
      value: `RETRODECK OS ${retroDeckVersion}`,
      detail: `ANDROID · RN ${runtimeVersion}`,
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ flexGrow: 1, padding: 6, gap: 5 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 7,
          borderWidth: 1.5,
          borderColor: fg,
          borderRadius: 6,
          backgroundColor: hexWithAlpha(fg, 0.1),
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: fg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 7,
          }}
        >
          <Ionicons name="hardware-chip-outline" size={15} color={fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }} numberOfLines={1}>
            {tr ? 'CIHAZ HAKKINDA' : 'ABOUT THIS DEVICE'}
          </Text>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 7, opacity: 0.72 }} numberOfLines={1}>
            {manufacturer} · {brand}
          </Text>
        </View>
        <Ionicons name="shield-checkmark-outline" size={13} color={fg} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 5 }}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={{
              width: '48.5%',
              minHeight: 48,
              paddingHorizontal: 5,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: hexWithAlpha(fg, 0.42),
              borderRadius: 5,
              backgroundColor: hexWithAlpha(fg, 0.045),
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 }}>
              <Ionicons name={card.icon} size={9} color={fg} />
              <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 }}>
                {card.label}
              </Text>
            </View>
            <Text style={{ color: fg, fontFamily: monoFont, fontSize: 8, fontWeight: '900' }} numberOfLines={1}>
              {card.value}
            </Text>
            <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.2, opacity: 0.72 }} numberOfLines={1}>
              {card.detail}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          minHeight: 38,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: hexWithAlpha(fg, 0.42),
          borderRadius: 5,
          backgroundColor: hexWithAlpha(fg, 0.045),
        }}
      >
        <Ionicons name="code-slash-outline" size={12} color={fg} />
        <View style={{ flex: 1, marginLeft: 5 }}>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 }}>
            {tr ? 'JAVA ME ÇALIŞMA ZAMANI' : 'JAVA ME RUNTIME'}
          </Text>
          <Text style={{ color: fg, fontFamily: monoFont, fontSize: 8, fontWeight: '900' }}>
            J2ME Loader {j2meLoaderVersion}
          </Text>
        </View>
        <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.2, fontWeight: '900', textAlign: 'right' }}>
          JAR → DEX{`\n`}MIDP · CLDC
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}>
        <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, opacity: 0.65 }}>
          {tr ? 'SİSTEM BİLGİLERİ · SALT OKUNUR' : 'SYSTEM PROFILE · READ ONLY'}
        </Text>
        <Text style={{ color: fg, fontFamily: monoFont, fontSize: 6.5, fontWeight: '900' }}>
          [B] {tr ? 'GERİ' : 'BACK'}
        </Text>
      </View>
    </ScrollView>
  );
}
