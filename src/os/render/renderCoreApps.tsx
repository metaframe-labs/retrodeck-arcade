import React from 'react';
import { View, Text, Platform, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isCartridgeProLocked } from '../../arcade/cartridges';
import { PALETTE_ORDER, RETRO_PALETTES, isPaletteProLocked } from '../../theme/palettes';
import { RetroAudioEngine, KEYPAD_SOUND_STYLES } from '../../audio/RetroAudioEngine';
import { somaRadioService } from '../../services/somaRadioService';
import { styles } from '../retroOsStyles';
import { DESKTOP_ICONS, hexWithAlpha, NOKIA_OPERATORS, NOKIA_PROFILES, REAL_POSTCARDS } from '../retroOsData';
import { getDesktopLabel, pickLang, tOs } from '../../i18n/retroI18n';
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
  const rows = 3;
  const pageSize = cols * rows; // 12 items per page for large, crisp retro icons
  const totalPages = Math.max(1, Math.ceil(DESKTOP_ICONS.length / pageSize));
  const curPage = Math.min(totalPages - 1, Math.floor(os.deskIdx / pageSize));
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

  const isWinDesktop = Boolean(winStyle) || os.menuStyle === 'windows';
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

  if (isWinDesktop) {
    const isXp = winStyle === 'winxp' || (!winStyle && os.cb.getPaletteId?.() === 'windows_xp');
    const isWin8 = !winStyle && os.cb.getPaletteId?.() === 'windows_8';
    const isWin10 = !winStyle && os.cb.getPaletteId?.() === 'windows_10';
    const isWin11 = !winStyle && os.cb.getPaletteId?.() === 'windows_11';
    const isWin95 = !winStyle && (os.cb.getPaletteId?.() === 'windows_95' || (!isXp && !isWin8 && !isWin10 && !isWin11));

    // Authentic, Fluent / Modern & Win32 Desktop Icon Renderer
    const renderWinDesktopIcon = (itemId: string, sel: boolean) => {
      // Sleek Fluent App Tile with drop-shadow, inner depth gradient & crisp glyph
      const renderFluentTile = (
        iconName: keyof typeof Ionicons.glyphMap,
        tileBg: string,
        tileBorder: string,
        glyphColor: string = '#FFFFFF',
        accentBadge?: React.ReactNode
      ) => (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: isWin11 ? 6 : isWin8 ? 0 : 4,
            backgroundColor: sel ? '#0284C7' : tileBg,
            borderWidth: 1,
            borderColor: sel ? '#FFFFFF' : tileBorder,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1.5 },
            shadowOpacity: 0.35,
            shadowRadius: 2,
            elevation: 3,
          }}
        >
          <Ionicons name={iconName} size={13} color={sel ? '#FFFFFF' : glyphColor} />
          {accentBadge}
        </View>
      );

      switch (itemId) {
        // 1. MY COMPUTER / C: DRIVE (Fluent This PC Desktop App)
        case 'format':
          return renderFluentTile(
            'desktop',
            '#0284C7',
            '#0369A1',
            '#FFFFFF',
            <View style={{ position: 'absolute', bottom: 1, right: 1, width: 6, height: 4, backgroundColor: '#38BDF8', borderRadius: 1 }} />
          );

        // 2. INTERNET (Microsoft Edge / Internet Explorer Fluent Sphere)
        case 'wap':
          return renderFluentTile(
            'globe',
            '#0284C7',
            '#0369A1',
            '#E0F2FE'
          );

        // 3. GAMES (Xbox / Retro Arcade Console)
        case 'arcade':
          return renderFluentTile(
            'game-controller',
            '#107C10',
            '#0E6B0E',
            '#FFFFFF'
          );

        // 4. NOTEPAD (Fluent Fluent Text Editor Pad)
        case 'notes':
          return renderFluentTile(
            'document-text',
            '#0284C7',
            '#0369A1',
            '#FEF08A'
          );

        // 5. PAINT (Windows Paint 3D & Creative Studio)
        case 'paint':
          return renderFluentTile(
            'color-palette',
            '#E11D48',
            '#BE123C',
            '#FFFFFF'
          );

        // 6. CALC (Fluent Modern Calculator)
        case 'calc':
          return renderFluentTile(
            'calculator',
            '#475569',
            '#334155',
            '#38BDF8'
          );

        // 7. COMMAND PROMPT (Windows Terminal / PowerShell Console)
        case 'term':
          return renderFluentTile(
            'terminal',
            '#0F172A',
            '#334155',
            '#4ADE80'
          );

        // 8. SETTINGS (Windows Settings & Control Panel Gears)
        case 'setup':
          return renderFluentTile(
            'settings',
            '#475569',
            '#334155',
            '#F1F5F9'
          );

        // 9. PICTURES (Microsoft Photos & Wallpaper Studio)
        case 'wallpapers':
          return renderFluentTile(
            'images',
            '#0D9488',
            '#0F766E',
            '#FFFFFF'
          );

        // 10. MEDIA PLAYER (Windows Groove & Media Player)
        case 'radio':
          return renderFluentTile(
            'play-circle',
            '#EA580C',
            '#C2410C',
            '#FFFFFF'
          );

        // 11. MUSIC COMPOSER (Studio Synthesizer & Audio Tracks)
        case 'synth':
          return renderFluentTile(
            'musical-notes',
            '#7C3AED',
            '#6D28D9',
            '#FFFFFF'
          );

        // 12. MESSENGER (Microsoft Teams / AI Assistant Chat)
        case 'ai':
          return renderFluentTile(
            'chatbubbles',
            '#4F46E5',
            '#4338CA',
            '#FFFFFF'
          );

        // 13. MAIL (Windows Outlook Mail Client)
        case 'sms':
          return renderFluentTile(
            'mail',
            '#0284C7',
            '#0369A1',
            '#FFFFFF'
          );

        // 14. CONTACTS (Microsoft People & Address Book)
        case 'contacts':
          return renderFluentTile(
            'people',
            '#D97706',
            '#B45309',
            '#FFFFFF'
          );

        // 15. PHONE (Dial-up & Phone Link)
        case 'phone':
          return renderFluentTile(
            'call',
            '#16A34A',
            '#15803D',
            '#FFFFFF'
          );

        // 16. WEATHER (MSN Live Weather Radar)
        case 'weather':
          return renderFluentTile(
            'partly-sunny',
            '#0284C7',
            '#0369A1',
            '#FDE047'
          );

        // 17. CLOCK (Windows Alarms & World Clock)
        case 'clock':
          return renderFluentTile(
            'time',
            '#2563EB',
            '#1D4ED8',
            '#FFFFFF'
          );

        // 18. STATS (Windows Task Manager & Performance Monitor)
        case 'stats':
          return renderFluentTile(
            'stats-chart',
            '#059669',
            '#047857',
            '#6EE7B7'
          );

        // Default Fallback
        default:
          return renderFluentTile(
            'folder',
            '#F59E0B',
            '#D97706',
            '#FFFFFF'
          );
      }
    };

    const selHighlight = isXp
      ? '#2B65CE'
      : isWin8
      ? '#2D89EF'
      : isWin10
      ? '#0078D7'
      : isWin11
      ? '#0067C0'
      : '#000080';

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

        {/* Desktop Icons Grid (Windows Column-Major Layout: Top-to-Bottom, Left-to-Right) */}
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cols }, (_, c) => {
              // Windows Column-Major arrangement within current page
              const colMajorOffset = c * rows + r;
              const idx = pageStart + colMajorOffset;
              const item = DESKTOP_ICONS[idx];
              if (!item) {
                return <View key={`sp-${c}`} style={styles.deskTileSpacer} />;
              }
              const sel = idx === os.deskIdx;
              const badgeBg = '#FFFFFF';
              const badgeTxt = '#000080';
              return (
                <View
                  key={item.id}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: isWin11 ? 4 : isWin8 ? 0 : 2,
                    borderWidth: sel ? 1 : 0,
                    borderStyle: sel && !isXp && !isWin8 && !isWin11 ? 'dotted' : 'solid',
                    borderColor: sel ? '#FFFFFF' : 'transparent',
                    backgroundColor: sel ? (isXp ? '#2B65CEE6' : `${selHighlight}DD`) : 'transparent',
                    paddingVertical: 2,
                    marginHorizontal: 1,
                  }}
                >
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Authentic Win32 Detailed Professional Icon */}
                    {renderWinDesktopIcon(item.id, sel)}

                    {/* Authentic miniature Windows desktop shortcut curved overlay badge */}
                    <View
                      style={{
                        position: 'absolute',
                        left: -5,
                        bottom: -3,
                        width: 7,
                        height: 7,
                        backgroundColor: badgeBg,
                        borderWidth: 0.5,
                        borderColor: '#222222',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: isWin11 ? 2 : 0,
                      }}
                    >
                      <Text style={{ fontSize: 5.5, fontWeight: '900', color: badgeTxt, lineHeight: 6.5 }}>
                        ↗
                      </Text>
                    </View>
                  </View>
                  {/* Shortcut Label with Windows Drop Shadow */}
                  <View
                    style={{
                      backgroundColor: sel
                        ? selHighlight
                        : isWin11
                        ? 'rgba(255, 255, 255, 0.75)'
                        : isXp
                        ? 'rgba(0, 0, 0, 0.45)'
                        : 'rgba(0, 0, 0, 0.55)',
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: isWin11 ? 3 : isWin8 ? 0 : 1,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={[
                        styles.deskLbl,
                        {
                          color: sel ? '#FFFFFF' : isWin11 ? '#0F172A' : '#FFFFFF',
                          fontSize: 7.5,
                          fontWeight: sel ? '900' : '700',
                          textShadowColor: sel ? 'transparent' : isWin11 ? 'transparent' : 'rgba(0,0,0,0.9)',
                          textShadowOffset: { width: 1, height: 1 },
                          textShadowRadius: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {renderPageStrip(true)}
      </View>
    );
  }

  // STYLE 2: Classic Nokia 3310 Single-Item Carousel Menu
  if (os.menuStyle === 'nokia') {
    const total = DESKTOP_ICONS.length;
    const curItem = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
    const prevItem = DESKTOP_ICONS[(os.deskIdx + total - 1) % total];
    const nextItem = DESKTOP_ICONS[(os.deskIdx + 1) % total];

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
              {String(os.deskIdx + 1).padStart(2, '0')}/{total}
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
    const total = DESKTOP_ICONS.length;
    const start = Math.max(0, Math.min(total - visibleCount, os.deskIdx - 2));
    const slice = DESKTOP_ICONS.slice(start, start + visibleCount);

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
            {String(os.deskIdx + 1).padStart(2, '0')}/{total}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-start', gap: 2.5 }}>
          {slice.map((item, i) => {
            const realIdx = start + i;
            const sel = realIdx === os.deskIdx;
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
    const isSonoma = os.cb.getPaletteId?.() === 'macos_sonoma';
    const isClassic = os.cb.getPaletteId?.() === 'macos_classic';
    const dockCols = 6;
    const dockPages = Math.ceil(DESKTOP_ICONS.length / dockCols);
    const dockCurPage = Math.min(dockPages - 1, Math.floor(os.deskIdx / dockCols));
    const dockPageStart = dockCurPage * dockCols;
    const dockSlice = DESKTOP_ICONS.slice(dockPageStart, dockPageStart + dockCols);
    const activeItem = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];

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
            backgroundColor: isClassic ? '#FFFFFF' : 'rgba(255, 255, 255, 0.22)',
            borderBottomWidth: isClassic ? 1 : 0.5,
            borderBottomColor: isClassic ? '#000000' : 'rgba(255, 255, 255, 0.35)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
            borderRadius: isClassic ? 0 : 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Apple Logo Icon */}
            <Ionicons name="logo-apple" size={10} color={isClassic ? '#000000' : '#FFFFFF'} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: isClassic ? '#000000' : '#FFFFFF' }}>
              Finder
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: isClassic ? '#555555' : 'rgba(255,255,255,0.75)' }}>
              File
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: isClassic ? '#555555' : 'rgba(255,255,255,0.75)' }}>
              Edit
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '600', color: isClassic ? '#555555' : 'rgba(255,255,255,0.75)' }}>
              View
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="wifi" size={8} color={isClassic ? '#000000' : '#FFFFFF'} />
            <Ionicons name="search" size={8} color={isClassic ? '#000000' : '#FFFFFF'} />
            <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '700', color: isClassic ? '#000000' : '#FFFFFF' }}>
              {os.formatClock()}
            </Text>
          </View>
        </View>

        {/* Center Canvas with Hero App Preview Card */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 4 }}>
          <View
            style={{
              backgroundColor: isClassic ? '#FFFFFF' : 'rgba(0, 0, 0, 0.45)',
              borderWidth: 1,
              borderColor: isClassic ? '#000000' : 'rgba(255, 255, 255, 0.25)',
              borderRadius: isClassic ? 2 : 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 3,
            }}
          >
            {/* macOS Window Titlebar Dots (Red, Yellow, Green) */}
            <View style={{ flexDirection: 'row', gap: 3, position: 'absolute', top: 4, left: 6 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F59E0B' }} />
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' }} />
            </View>

            <View style={{ marginTop: 4, alignItems: 'center' }}>
              <Ionicons
                name={activeItem.icon}
                size={28}
                color={isClassic ? '#000000' : '#FFFFFF'}
              />
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 9.5,
                  fontWeight: '900',
                  color: isClassic ? '#000000' : '#FFFFFF',
                  marginTop: 4,
                  letterSpacing: 0.5,
                }}
              >
                {getDesktopLabel(activeItem.id, activeItem.label, os.lang)}
              </Text>
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: isClassic ? '#555555' : '#94A3B8', marginTop: 1 }}>
                {pickLang(os.lang, `App ${os.deskIdx + 1} of ${DESKTOP_ICONS.length} • [A] Launch`, `Uygulama ${os.deskIdx + 1}/${DESKTOP_ICONS.length} • [A] Ac`)}
              </Text>
            </View>
          </View>
        </View>

        {/* macOS Bottom Glass Floating Dock */}
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: isClassic ? '#E5E5E5' : 'rgba(255, 255, 255, 0.22)',
            borderWidth: 1,
            borderColor: isClassic ? '#000000' : 'rgba(255, 255, 255, 0.45)',
            borderRadius: isClassic ? 3 : 10,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 3,
            gap: 6,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {dockSlice.map((item, idxInPage) => {
            const realIdx = dockPageStart + idxInPage;
            const sel = realIdx === os.deskIdx;
            return (
              <View key={item.id} style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: isClassic ? 2 : 5,
                    backgroundColor: sel ? (isClassic ? '#000000' : '#0284C7') : isClassic ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                    borderWidth: 1,
                    borderColor: sel ? '#FFFFFF' : isClassic ? '#000000' : 'rgba(255, 255, 255, 0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: sel ? [{ scale: 1.15 }, { translateY: -2 }] : [],
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color={sel ? '#FFFFFF' : isClassic ? '#000000' : '#FFFFFF'}
                  />
                </View>
                {/* Active Indicator Dot under Icon */}
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: isClassic ? '#000000' : '#FFFFFF',
                    marginTop: 2,
                    opacity: sel ? 1 : 0.3,
                  }}
                />
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
    const XMB_CATEGORIES: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; appIds: string[] }[] = [
      { id: 'settings', label: pickLang(os.lang, 'SETTINGS', 'AYARLAR'), icon: 'settings', appIds: ['setup', 'stats', 'term', 'format'] },
      { id: 'games', label: pickLang(os.lang, 'GAME', 'OYUN'), icon: 'game-controller', appIds: ['arcade'] },
      { id: 'media', label: pickLang(os.lang, 'MEDIA', 'MEDYA'), icon: 'musical-notes', appIds: ['radio', 'synth', 'wallpapers'] },
      { id: 'network', label: pickLang(os.lang, 'NETWORK', 'AG'), icon: 'globe', appIds: ['wap', 'ai', 'sms', 'contacts', 'phone'] },
      { id: 'tools', label: pickLang(os.lang, 'EXTRAS', 'EKSTRALAR'), icon: 'briefcase', appIds: ['notes', 'paint', 'calc', 'weather', 'clock', 'profiles'] },
    ];

    const currentApp = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
    let activeCatIdx = XMB_CATEGORIES.findIndex((cat) => cat.appIds.includes(currentApp.id));
    if (activeCatIdx === -1) activeCatIdx = 1; // default to Games
    const activeCat = XMB_CATEGORIES[activeCatIdx];
    const catApps = activeCat.appIds.map((id) => DESKTOP_ICONS.find((icon) => icon.id === id)!).filter(Boolean);
    let itemIdxInCat = catApps.findIndex((item) => item.id === currentApp.id);
    if (itemIdxInCat === -1) itemIdxInCat = 0;

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', justifyContent: 'space-between', paddingHorizontal: 0, paddingVertical: 4 }]}>
        {renderWallBackdrop()}

        {/* Dynamic PSP/PS3 Ambient Wave Ribbons */}
        {!activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: 0, bottom: 0, backgroundColor: '#0A0E1A', overflow: 'hidden' }}>
            {/* Wave 1 */}
            <View
              style={{
                position: 'absolute',
                top: 40,
                left: -30,
                width: 380,
                height: 120,
                borderRadius: 90,
                borderWidth: 2.5,
                borderColor: 'rgba(56, 189, 248, 0.28)',
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
                borderWidth: 2,
                borderColor: 'rgba(168, 85, 247, 0.22)',
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
                backgroundColor: 'rgba(14, 165, 233, 0.08)',
                transform: [{ rotate: '-5deg' }],
              }}
            />
          </View>
        )}

        {/* Top PSP Info Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="hardware-chip-outline" size={10} color={activeWall ? fg : '#38BDF8'} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: activeWall ? fg : '#F8FAFC', letterSpacing: 0.8 }}>
              PSP-3000
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wifi" size={9} color={activeWall ? fg : '#94A3B8'} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '700', color: activeWall ? fg : '#F8FAFC' }}>
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
            backgroundColor: activeWall ? hexWithAlpha(bg, 0.72) : 'rgba(15, 23, 42, 0.65)',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: activeWall ? hexWithAlpha(fg, 0.2) : 'rgba(255, 255, 255, 0.12)',
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
                    backgroundColor: isCatActive ? '#38BDF8' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#38BDF8',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isCatActive ? 0.9 : 0,
                    shadowRadius: 6,
                  }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={isCatActive ? 16 : 13}
                    color={isCatActive ? '#0F172A' : activeWall ? fg : 'rgba(255, 255, 255, 0.6)'}
                  />
                </View>
                {isCatActive && (
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 6.8,
                      fontWeight: '900',
                      color: activeWall ? fg : '#38BDF8',
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
          const windowSize = Math.min(3, totalItems);
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
                  <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: activeWall ? fg : 'rgba(255,255,255,0.45)' }}>
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
                      backgroundColor: isItemSel
                        ? activeWall
                          ? fg
                          : 'rgba(56, 189, 248, 0.28)'
                        : 'transparent',
                      borderWidth: isItemSel ? 1 : 0,
                      borderColor: activeWall ? fg : '#38BDF8',
                      opacity: isItemSel ? 1 : 0.45,
                      transform: isItemSel ? [{ scale: 1.03 }] : [{ scale: 0.95 }],
                    }}
                  >
                    <View
                      style={{
                        width: isItemSel ? 22 : 18,
                        height: isItemSel ? 22 : 18,
                        borderRadius: 4,
                        backgroundColor: isItemSel ? (activeWall ? bg : '#38BDF8') : 'rgba(255, 255, 255, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isItemSel ? 13 : 11}
                        color={isItemSel ? (activeWall ? fg : '#0F172A') : activeWall ? fg : '#FFFFFF'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: monoFont,
                          fontSize: isItemSel ? 9 : 7.8,
                          fontWeight: isItemSel ? '900' : '600',
                          color: isItemSel
                            ? activeWall
                              ? bg
                              : '#FFFFFF'
                            : activeWall
                            ? fg
                            : 'rgba(255, 255, 255, 0.75)',
                        }}
                        numberOfLines={1}
                      >
                        {getDesktopLabel(item.id, item.label, os.lang)}
                      </Text>
                    </View>
                    {isItemSel && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '900', color: activeWall ? bg : '#38BDF8' }}>
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
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: activeWall ? fg : 'rgba(255,255,255,0.45)' }}>
            ◀ ▶ CATEGORY • ▲ ▼ SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: activeWall ? fg : '#38BDF8' }}>
            SONY XMB™
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 7: Xbox 360 Blades Dashboard (2005 Original Dashboard)
  if (os.menuStyle === 'xbox_blades') {
    // 4 Classic Xbox 360 Blades: Marketplace/Games, Media, System, Live
    const XBOX_BLADES: { id: string; label: string; color: string; appIds: string[] }[] = [
      { id: 'games', label: 'GAMES', color: '#107C10', appIds: ['arcade', 'synth'] },
      { id: 'media', label: 'MEDIA', color: '#0078D7', appIds: ['radio', 'wallpapers', 'paint'] },
      { id: 'system', label: 'SYSTEM', color: '#5C2D91', appIds: ['setup', 'stats', 'term', 'format', 'clock'] },
      { id: 'live', label: 'XBOX LIVE', color: '#FF8C00', appIds: ['wap', 'ai', 'sms', 'contacts', 'phone', 'weather', 'notes', 'calc', 'profiles'] },
    ];

    const currentApp = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
    let activeBladeIdx = XBOX_BLADES.findIndex((blade) => blade.appIds.includes(currentApp.id));
    if (activeBladeIdx === -1) activeBladeIdx = 0;
    const activeBlade = XBOX_BLADES[activeBladeIdx];
    const bladeApps = activeBlade.appIds.map((id) => DESKTOP_ICONS.find((icon) => icon.id === id)!).filter(Boolean);
    let itemIdxInBlade = bladeApps.findIndex((item) => item.id === currentApp.id);
    if (itemIdxInBlade === -1) itemIdxInBlade = 0;

    return (
      <View style={[styles.deskGrid, { position: 'relative', overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0 }]}>
        {renderWallBackdrop()}

        {/* Xbox 360 Industrial Curved Gradient Backdrop */}
        {!activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#1A1C1E' }}>
            {/* Subtle silver curved sphere gradient */}
            <View
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
            {/* Top green Xbox glow highlight */}
            <View style={{ height: 3, backgroundColor: activeBlade.color }} />
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
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: activeBlade.color }} />
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '900', color: '#FFFFFF' }}>
              RETRO_PLAYER_360
            </Text>
          </View>
          <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '700', color: '#107C10' }}>
            ● 100 G
          </Text>
        </View>

        {/* Center Canvas: Horizontal Blade Tabs + Active Blade App List */}
        <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
          {/* Blade Spine Tabs on the Left */}
          <View style={{ width: 34, justifyContent: 'space-around', paddingVertical: 4, paddingLeft: 2 }}>
            {XBOX_BLADES.map((blade, idx) => {
              const isBladeActive = idx === activeBladeIdx;
              return (
                <View
                  key={blade.id}
                  style={{
                    height: 24,
                    width: isBladeActive ? 32 : 24,
                    backgroundColor: blade.color,
                    borderTopRightRadius: 6,
                    borderBottomRightRadius: 6,
                    justifyContent: 'center',
                    paddingLeft: 4,
                    borderWidth: 1,
                    borderColor: isBladeActive ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                    shadowColor: blade.color,
                    shadowOffset: { width: 1, height: 0 },
                    shadowOpacity: isBladeActive ? 0.8 : 0.2,
                    shadowRadius: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 6,
                      fontWeight: '900',
                      color: '#FFFFFF',
                    }}
                    numberOfLines={1}
                  >
                    {blade.label.slice(0, 4)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Active Blade Card and App Options */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              marginVertical: 4,
              marginRight: 6,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: activeBlade.color,
              padding: 6,
            }}
          >
            {/* Active Blade Title Header */}
            <View
              style={{
                backgroundColor: activeBlade.color,
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
              <Text style={{ fontFamily: monoFont, fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.85)' }}>
                {itemIdxInBlade + 1}/{bladeApps.length}
              </Text>
            </View>

            {/* List of Apps in Active Blade */}
            <View style={{ flex: 1, justifyContent: 'space-around' }}>
              {bladeApps.slice(0, 4).map((item, idx) => {
                const isSelected = idx === itemIdxInBlade;
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 3,
                      paddingHorizontal: 6,
                      borderRadius: 3,
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                      borderLeftWidth: isSelected ? 3 : 0,
                      borderLeftColor: activeBlade.color,
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={12}
                      color={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontFamily: monoFont,
                        fontSize: 8,
                        fontWeight: isSelected ? '900' : '600',
                        color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {getDesktopLabel(item.id, item.label, os.lang)}
                    </Text>
                    {isSelected && (
                      <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '900', color: activeBlade.color }}>
                        ▶
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Footer Blade Navigation Bar */}
        <View
          style={{
            height: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }}
        >
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
            ◀ ▶ SLIDE BLADE • ▲ ▼ SELECT
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '900', color: '#107C10' }}>
            [A] LAUNCH
          </Text>
        </View>
      </View>
    );
  }

  // STYLE 8: Cyberpunk / Linux Tiling Window Manager (i3 / bspwm / sway style)
  if (os.menuStyle === 'cyberpunk') {
    const total = DESKTOP_ICONS.length;
    const curItem = DESKTOP_ICONS[os.deskIdx] || DESKTOP_ICONS[0];
    const workspaces = ['1:SYS', '2:NET', '3:MEDIA', '4:EXTRA'];
    const activeWsIdx = Math.min(3, Math.floor(os.deskIdx / 5));

    // Visible terminal list window (5 items)
    const listPage = Math.floor(os.deskIdx / 5);
    const visibleApps = DESKTOP_ICONS.slice(listPage * 5, listPage * 5 + 5);

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
                PKGS: 19 (pacman)
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
                $ dmenu_run ({os.deskIdx + 1}/{total})
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

  // STYLE 4: Big 3x2 Cards (6 large cards per page — ideal for showcasing wallpapers!)
  if (os.menuStyle === 'cards') {
    const cardCols = 3;
    const cardRows = 2;
    const cardPageSize = cardCols * cardRows;
    const cardTotalPages = Math.max(1, Math.ceil(DESKTOP_ICONS.length / cardPageSize));
    const cardCurPage = Math.min(cardTotalPages - 1, Math.floor(os.deskIdx / cardPageSize));
    const cardStart = cardCurPage * cardPageSize;

    return (
      <View style={[styles.deskGrid, { position: 'relative' }]}>
        {renderWallBackdrop()}

        {Array.from({ length: cardRows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cardCols }, (_, c) => {
              const idx = cardStart + r * cardCols + c;
              const item = DESKTOP_ICONS[idx];
              if (!item) {
                return <View key={`sp-c-${c}`} style={styles.deskTileSpacer} />;
              }
              const sel = idx === os.deskIdx;
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
  const carts = os.cb.getCartridges();
  const scores = os.cb.getHighScores();
  const isPro = os.cb.getIsPro?.() ?? false;
  const activeWall = os.getActiveWallpaper();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

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

  // STYLE 2: Nokia 3310 Single-Cartridge Carousel
  if (os.menuStyle === 'nokia') {
    const total = carts.length;
    const cur = carts[os.gameIdx] || carts[0];
    const prev = carts[(os.gameIdx + total - 1) % total];
    const next = carts[(os.gameIdx + 1) % total];
    const hs = cur ? scores[cur.id] || 0 : 0;
    const locked = cur ? isCartridgeProLocked(cur.id, isPro) : false;

    return (
      <View style={[styles.deskGrid, { position: 'relative', justifyContent: 'space-between' }]}>
        {renderWallBackdrop()}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, 'CARTRIDGE', 'KARTUS')}
          </Text>
          <View style={{ backgroundColor: fg, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 8.5, fontWeight: '900', color: bg }}>
              {String(os.gameIdx + 1).padStart(3, '0')}/{total}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingHorizontal: 2 }}>
          <View style={{ alignItems: 'center', opacity: 0.45, width: 34 }}>
            <Ionicons name="game-controller" size={14} color={fg} />
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              ◀ {prev?.title}
            </Text>
          </View>

          <View
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
                backgroundColor: fg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={locked ? 'lock-closed' : 'game-controller'} size={22} color={bg} />
            </View>
            <Text
              style={{ fontFamily: monoFont, fontSize: 11, fontWeight: '900', color: fg, textAlign: 'center' }}
              numberOfLines={1}
            >
              {cur?.title}
            </Text>
            <Text style={{ fontFamily: monoFont, fontSize: 8, fontWeight: '800', color: fg, opacity: 0.85 }} numberOfLines={1}>
              {locked ? '[PRO REQUIRED]' : hs > 0 ? `HI-SCORE: ${hs}` : cur?.genre}
            </Text>
          </View>

          <View style={{ alignItems: 'center', opacity: 0.45, width: 34 }}>
            <Ionicons name="game-controller" size={14} color={fg} />
            <Text style={{ fontFamily: monoFont, fontSize: 6.5, fontWeight: '800', color: fg }} numberOfLines={1}>
              {next?.title} ▶
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
    const totalPages = Math.max(1, Math.ceil(carts.length / pageSize));
    const curPage = Math.min(totalPages - 1, Math.floor(os.gameIdx / pageSize));
    const pageStart = curPage * pageSize;

    return (
      <View style={[styles.deskGrid, { position: 'relative' }]}>
        {renderWallBackdrop()}

        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cols }, (_, c) => {
              const idx = pageStart + r * cols + c;
              const cart = carts[idx];
              if (!cart) {
                return <View key={`sp-g-${c}`} style={styles.deskTileSpacer} />;
              }
              const sel = idx === os.gameIdx;
              const locked = isCartridgeProLocked(cart.id, isPro);
              const hs = scores[cart.id] || 0;
              const ink = sel ? bg : fg;
              return (
                <View
                  key={cart.id}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons
                      name={locked ? 'lock-closed' : 'game-controller'}
                      size={isCards ? 16 : 12}
                      color={ink}
                    />
                    <Text style={{ fontFamily: monoFont, fontSize: isCards ? 8 : 7, fontWeight: '900', color: ink }}>
                      {String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.deskLbl,
                      { color: ink, fontSize: isCards ? 8.5 : 7.2, marginTop: isCards ? 3 : 1.5, textAlign: 'center' },
                    ]}
                    numberOfLines={1}
                  >
                    {cart.title}
                  </Text>
                  {isCards && (
                    <Text
                      style={{ fontFamily: monoFont, fontSize: 6.8, fontWeight: '800', color: ink, opacity: 0.8, marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {locked ? '[PRO]' : hs > 0 ? `HI:${hs}` : cart.genre.slice(0, 7)}
                    </Text>
                  )}
                </View>
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
              `PAGE ${curPage + 1}/${totalPages} (${os.gameIdx + 1}/${carts.length})`,
              `SAYFA ${curPage + 1}/${totalPages} (${os.gameIdx + 1}/${carts.length})`
            )}
          </Text>
          <Text style={{ fontFamily: monoFont, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {pickLang(os.lang, '[A] PLAY ▶', '[A] OYNA ▶')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // STYLE 3: Classic 7-Row Retro List
  const visibleCount = 7;
  const start = Math.max(0, Math.min(carts.length - visibleCount, os.gameIdx - 3));
  const slice = carts.slice(start, start + visibleCount);

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
        {tOs('arcadeHeader', { cur: os.gameIdx + 1, total: carts.length }, os.lang)}
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
  const L = os.lang;
  const activeWall = os.getActiveWallpaper();
  const menuStyleLabelMap = {
    grid: tOs('menuStyleGrid', L),
    nokia: tOs('menuStyleNokia', L),
    list: tOs('menuStyleList', L),
    cards: tOs('menuStyleCards', L),
    windows: tOs('menuStyleWindows', L),
    macos: tOs('menuStyleMacos', L),
    psp_xmb: tOs('menuStylePsp', L),
    xbox_blades: tOs('menuStyleXbox', L),
    cyberpunk: tOs('menuStyleCyberpunk', L),
  };
  const items = [
    isPro ? tOs('setupProActive', L) : tOs('setupProUpgrade', L),
    `${tOs('setupPalette', L)}: ${os.cb.getPaletteName()}`,
    `${tOs('setupWallpaper', L)}: ${activeWall ? activeWall.title : tOs('off', L)}`,
    `${tOs('setupMenuStyle', L)}: ${menuStyleLabelMap[os.menuStyle]}`,
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
  const isNone = os.wallpaperIdx === 0;
  const previewCard = isNone ? null : REAL_POSTCARDS[os.wallpaperIdx - 1] || REAL_POSTCARDS[0];
  const currentActiveId = os.wallpaperId || 'none';
  const isApplied = isNone
    ? currentActiveId === 'none'
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
    const totalEntries = totalScenes + 1; // 0 = OFF, 1..N = scenes
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
                const card = idx === 0 ? null : REAL_POSTCARDS[idx - 1];
                const sel = idx === os.wallpaperIdx;
                const activeItem = card ? card.id === currentActiveId : currentActiveId === 'none';

                return (
                  <Pressable
                    key={card ? card.id : '__none__'}
                    onPress={() => {
                      os.wallpaperIdx = idx;
                      os.setWallpaperById(card ? card.id : 'none');
                      os.smsBanner = card ? `[WP] ${card.title}` : `[WP] ${tOs('off', L)}`;
                      os.smsBannerTimer = 2.0;
                      os.cb.onPlaySound?.('powerup');
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
                    {card ? (
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
                          {card ? card.title : 'OFF'}
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
              {isApplied && previewCard
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
