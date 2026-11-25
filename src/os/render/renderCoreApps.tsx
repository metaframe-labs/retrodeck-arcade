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

    // Authentic, Professional Windows Desktop Icon Renderer
    const renderWinDesktopIcon = (itemId: string, sel: boolean) => {
      const activeColor = sel ? '#FFFFFF' : undefined;

      switch (itemId) {
        // 1. ARCADE / GAMES: Authentic Win32 Game Controller / Arcade Cabinet
        case 'arcade':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 20,
                  height: 14,
                  backgroundColor: sel ? '#2563EB' : '#3B82F6',
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#1D4ED8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 2,
                }}
              >
                {/* D-Pad cross */}
                <View style={{ width: 6, height: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', width: 2, height: 6, backgroundColor: '#FFFFFF' }} />
                  <View style={{ position: 'absolute', width: 6, height: 2, backgroundColor: '#FFFFFF' }} />
                </View>
                {/* 2 AB Buttons */}
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#EF4444' }} />
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FBBF24' }} />
                </View>
              </View>
            </View>
          );

        // 2. WAP / INTERNET: Classic Blue Internet Explorer "e" / World Globe
        case 'wap':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: sel ? '#FFFFFF' : '#0284C7',
                  backgroundColor: sel ? '#0284C7' : '#E0F2FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: monoFont, fontSize: 11, fontWeight: '900', color: sel ? '#FFFFFF' : '#0369A1', fontStyle: 'italic', marginTop: -2 }}>
                  e
                </Text>
                {/* Golden Orbit Ring */}
                <View
                  style={{
                    position: 'absolute',
                    width: 22,
                    height: 8,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                    transform: [{ rotate: '-25deg' }],
                  }}
                />
              </View>
            </View>
          );

        // 3. RADIO / MEDIA PLAYER: Windows Media Player CD with Jewel Case
        case 'radio':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#64748B',
                  backgroundColor: sel ? '#475569' : '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Hologram track circle */}
                <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#38BDF8', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#0F172A' }} />
                </View>
                <View style={{ position: 'absolute', right: 1, bottom: 1, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="play" size={5} color="#FFFFFF" />
                </View>
              </View>
            </View>
          );

        // 4. CHAT / AI: Microsoft Outlook / Messenger Two Connected People
        case 'ai':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 19,
                  height: 15,
                  backgroundColor: sel ? '#0369A1' : '#0284C7',
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#0C4A6E',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#38BDF8' }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F8FAFC' }} />
                </View>
                <View style={{ width: 11, height: 2, backgroundColor: '#BAE6FD', borderRadius: 1, marginTop: 2 }} />
              </View>
            </View>
          );

        // 5. NOTES: Classic Windows Notepad yellow legal pad with blue lines
        case 'notes':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 16,
                  height: 19,
                  backgroundColor: '#FEF08A',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#CA8A04',
                  borderRadius: 1,
                  paddingHorizontal: 2,
                  paddingVertical: 2,
                  gap: 2,
                }}
              >
                <View style={{ width: '100%', height: 1.5, backgroundColor: '#EF4444' }} />
                <View style={{ width: '80%', height: 1, backgroundColor: '#3B82F6' }} />
                <View style={{ width: '90%', height: 1, backgroundColor: '#3B82F6' }} />
                <View style={{ width: '60%', height: 1, backgroundColor: '#3B82F6' }} />
              </View>
            </View>
          );

        // 6. PAINT: Windows Paintbrush & Artist Palette
        case 'paint':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 16,
                  backgroundColor: '#E2E8F0',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#64748B',
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  paddingHorizontal: 1,
                }}
              >
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#EF4444' }} />
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10B981' }} />
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3B82F6' }} />
              </View>
              {/* Slanted wooden brush */}
              <View
                style={{
                  position: 'absolute',
                  width: 3,
                  height: 18,
                  backgroundColor: '#B45309',
                  borderRadius: 1,
                  borderTopWidth: 4,
                  borderTopColor: '#1E293B',
                  transform: [{ rotate: '40deg' }],
                }}
              />
            </View>
          );

        // 7. CALC: Windows Calculator with grid buttons
        case 'calc':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 16,
                  height: 19,
                  backgroundColor: sel ? '#1E293B' : '#334155',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#0F172A',
                  borderRadius: 2,
                  padding: 1.5,
                  gap: 1.5,
                }}
              >
                {/* LCD Screen */}
                <View style={{ width: '100%', height: 4, backgroundColor: '#86EFAC', borderRadius: 1, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 1 }}>
                  <Text style={{ fontSize: 3.5, fontWeight: '900', color: '#064E3B' }}>0.</Text>
                </View>
                {/* Number Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={{ width: 3.5, height: 3, backgroundColor: i === 5 ? '#F59E0B' : '#E2E8F0', borderRadius: 0.5 }} />
                  ))}
                </View>
              </View>
            </View>
          );

        // 8. CLOCK: Windows Clock / Timed Task
        case 'clock':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: sel ? '#1E3A8A' : '#EFF6FF',
                  borderWidth: 1.5,
                  borderColor: sel ? '#FFFFFF' : '#1D4ED8',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Clock Hands */}
                <View style={{ position: 'absolute', width: 1.5, height: 5, backgroundColor: sel ? '#FFFFFF' : '#0F172A', top: 3.5 }} />
                <View style={{ position: 'absolute', width: 5, height: 1.5, backgroundColor: sel ? '#FFFFFF' : '#0F172A', left: 8 }} />
                <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: '#EF4444' }} />
              </View>
            </View>
          );

        // 9. SHELL / TERM: Windows Command Prompt (MS-DOS C:\>)
        case 'term':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 19,
                  height: 16,
                  backgroundColor: '#000000',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#64748B',
                  borderRadius: 1,
                  padding: 1.5,
                }}
              >
                {/* Titlebar */}
                <View style={{ height: 2.5, backgroundColor: '#1E293B', marginBottom: 1 }} />
                <Text style={{ fontFamily: monoFont, fontSize: 5, fontWeight: '900', color: '#4ADE80', lineHeight: 6 }}>
                  {`C:\\>_`}
                </Text>
              </View>
            </View>
          );

        // 10. SETUP: Windows Control Panel (Gears & Wrench)
        case 'setup':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  backgroundColor: sel ? '#475569' : '#94A3B8',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#334155',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="settings" size={12} color="#FFFFFF" />
              </View>
            </View>
          );

        // 11. WALLPAPERS: My Pictures / Picture Frame
        case 'wallpapers':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 19,
                  height: 16,
                  backgroundColor: '#FEF9C3',
                  borderWidth: 1.5,
                  borderColor: sel ? '#FFFFFF' : '#B45309',
                  borderRadius: 1,
                  overflow: 'hidden',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Sun and Mountain */}
                <View style={{ position: 'absolute', top: 2, right: 3, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                <View style={{ width: 14, height: 7, backgroundColor: '#15803D', transform: [{ rotate: '45deg' }], left: -3, bottom: -4 }} />
                <View style={{ width: 12, height: 6, backgroundColor: '#166534', transform: [{ rotate: '-40deg' }], right: -2, bottom: -4 }} />
              </View>
            </View>
          );

        // 12. FORMAT: 3.5" Floppy Disk (A:) / Hard Disk (C:)
        case 'format':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 17,
                  height: 18,
                  backgroundColor: sel ? '#1E293B' : '#0284C7',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#0369A1',
                  borderRadius: 1.5,
                  alignItems: 'center',
                  paddingTop: 1,
                }}
              >
                {/* Silver Metal Slider */}
                <View style={{ width: 10, height: 6, backgroundColor: '#E2E8F0', borderRadius: 0.5, borderBottomWidth: 1, borderColor: '#94A3B8' }} />
                {/* Paper Label */}
                <View style={{ width: 12, height: 7, backgroundColor: '#FFFFFF', marginTop: 1.5, borderRadius: 0.5, padding: 0.5 }}>
                  <View style={{ width: '70%', height: 1, backgroundColor: '#EF4444' }} />
                  <View style={{ width: '90%', height: 1, backgroundColor: '#3B82F6', marginTop: 1 }} />
                </View>
              </View>
            </View>
          );

        // 13. SYNTH / MUSIC: Windows Media Audio Wave
        case 'synth':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: sel ? '#581C87' : '#9333EA',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#6B21A8',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="musical-notes" size={11} color="#FFFFFF" />
              </View>
            </View>
          );

        // 14. CONTACTS: Windows Address Book (Rolodex)
        case 'contacts':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 17,
                  height: 18,
                  backgroundColor: '#B45309',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#78350F',
                  borderRadius: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 12, height: 12, backgroundColor: '#FEF3C7', borderRadius: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={7} color="#92400E" />
                </View>
              </View>
            </View>
          );

        // 15. SMS / MAIL: Classic Outlook Express Stamped Envelope
        case 'sms':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 19,
                  height: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#64748B',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {/* Blue flap diagonal lines */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, borderBottomWidth: 1, borderColor: '#0284C7' }} />
                <View style={{ position: 'absolute', bottom: 1, right: 2, width: 4, height: 3, backgroundColor: '#EF4444' }} />
              </View>
            </View>
          );

        // 16. PHONE: Dial-Up Modem / Phone Handset
        case 'phone':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: sel ? '#15803D' : '#22C55E',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#166534',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="call" size={10} color="#FFFFFF" />
              </View>
            </View>
          );

        // 17. STATS: System Performance Monitor (CPU & Memory Graph)
        case 'stats':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 19,
                  height: 16,
                  backgroundColor: '#0F172A',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#475569',
                  borderRadius: 1,
                  padding: 1.5,
                  justifyContent: 'flex-end',
                }}
              >
                {/* Bar chart columns */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 10 }}>
                  <View style={{ width: 2.5, height: 4, backgroundColor: '#22C55E' }} />
                  <View style={{ width: 2.5, height: 8, backgroundColor: '#EAB308' }} />
                  <View style={{ width: 2.5, height: 6, backgroundColor: '#22C55E' }} />
                  <View style={{ width: 2.5, height: 10, backgroundColor: '#EF4444' }} />
                </View>
              </View>
            </View>
          );

        // 18. WEATHER: Windows Weather Forecast Radar
        case 'weather':
          return (
            <View style={{ width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: sel ? '#0284C7' : '#38BDF8',
                  borderWidth: 1,
                  borderColor: sel ? '#FFFFFF' : '#0369A1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FBBF24', position: 'absolute', top: 3, left: 3 }} />
                <View style={{ width: 11, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', position: 'absolute', bottom: 3, right: 3 }} />
              </View>
            </View>
          );

        // Default Fallback
        default:
          return (
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 2,
                backgroundColor: '#3B82F6',
                borderWidth: 1,
                borderColor: '#1D4ED8',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="folder" size={11} color="#FFFFFF" />
            </View>
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

        {/* 4) Windows 11: Frosted Mika Bloom Petal Abstract Ambient Glow */}
        {isWin11 && !activeWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -6, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: 150, height: 110, borderRadius: 55, backgroundColor: 'rgba(0, 103, 192, 0.28)' }} />
            <View style={{ position: 'absolute', width: 100, height: 130, borderRadius: 50, backgroundColor: 'rgba(96, 165, 250, 0.20)', transform: [{ rotate: '35deg' }] }} />
            <View style={{ position: 'absolute', width: 110, height: 80, borderRadius: 40, backgroundColor: 'rgba(192, 132, 252, 0.16)', transform: [{ rotate: '-25deg' }] }} />
          </View>
        )}

        {/* Desktop Icons Grid */}
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.deskRow}>
            {Array.from({ length: cols }, (_, c) => {
              const idx = pageStart + r * cols + c;
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
                      backgroundColor: sel ? selHighlight : isXp ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.55)',
                      paddingHorizontal: 3,
                      paddingVertical: 0.5,
                      borderRadius: isWin11 ? 2 : isWin8 ? 0 : 1,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={[
                        styles.deskLbl,
                        {
                          color: '#FFFFFF',
                          fontSize: 7.5,
                          fontWeight: sel ? '900' : '700',
                          textShadowColor: sel ? 'transparent' : 'rgba(0,0,0,0.9)',
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
