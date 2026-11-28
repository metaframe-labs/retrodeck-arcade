import React from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickLang, tOs } from '../../i18n/retroI18n';
import { hexWithAlpha, NOKIA_OPERATORS, NOKIA_PROFILES } from '../retroOsData';
import { styles } from '../retroOsStyles';
import { renderAnalogDial, renderStatusLeft, renderStatusRight } from './renderCoreApps';
import { getWinVariant, isWinUiActive, WinVariant } from './winChromeHelper';
import type { RetroDeckOS } from '../RetroDeckOS';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

type LockScreenKind =
  | 'nexus'
  | 'win7'
  | 'win8'
  | 'winxp'
  | 'win10'
  | 'win11'
  | 'win95'
  | 'macos'
  | 'cyberpunk'
  | 'pipboy'
  | 'console'
  | 'nokia';

interface LockClockInfo {
  hh: string;
  mm: string;
  ss: string;
  dateStr: string;
  weekdayStr: string;
}

function getLockClockInfo(os: RetroDeckOS): LockClockInfo {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const tr = os.lang === 'tr';
  const days = tr
    ? ['PAZAR', 'PAZARTESI', 'SALI', 'CARSAMBA', 'PERSEMBE', 'CUMA', 'CUMARTESI']
    : ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = tr
    ? ['OCA', 'SUB', 'MAR', 'NIS', 'MAY', 'HAZ', 'TEM', 'AGU', 'EYL', 'EKI', 'KAS', 'ARA']
    : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const weekdayStr = days[d.getDay()];
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  return { hh, mm, ss, dateStr, weekdayStr };
}

function resolveLockKind(os: RetroDeckOS): LockScreenKind {
  const pal = os.cb.getPaletteId?.() ?? '';
  if (os.menuStyle === 'nexus_os' || pal === 'nexus_holo') return 'nexus';
  if (isWinUiActive(os) || pal.startsWith('windows_')) return getWinVariant(os);
  if (
    os.menuStyle === 'macos' ||
    pal === 'macos_classic' ||
    pal === 'macos_aqua' ||
    pal === 'macos_sequoia' ||
    pal === 'macos_sonoma' ||
    pal === 'macintosh'
  ) {
    return 'macos';
  }
  if (os.menuStyle === 'cyberpunk' || pal === 'cyberpunk' || pal === 'synthwave') return 'cyberpunk';
  if (os.menuStyle === 'pipboy' || pal === 'pipboy') return 'pipboy';
  if (
    os.menuStyle === 'psp_xmb' ||
    os.menuStyle === 'xbox_blades' ||
    os.menuStyle === 'wii_channels' ||
    os.menuStyle === 'ipod_classic'
  ) {
    return 'console';
  }
  return 'nokia';
}

function handleLockInteraction(os: RetroDeckOS) {
  os.idleTimer = 0;
  if (!os.unlockStage) {
    os.unlockStage = true;
    os.unlockHintTimer = 3.0;
    os.cb.onPlaySound?.('hit');
  } else {
    os.keyLocked = false;
    os.unlockStage = false;
    os.idleTimer = 0;
    os.cb.onPlaySound?.('powerup');
  }
}

function renderLockWallpaper(
  os: RetroDeckOS,
  bg: string,
  minDim: number,
  top = 0,
  bottom = 0
): React.ReactNode {
  const lockWall = os.getActiveWallpaper();
  if (!lockWall) return null;
  return (
    <>
      <Image
        source={lockWall.image}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          bottom,
          width: undefined,
          height: undefined,
        }}
        resizeMode="cover"
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          bottom,
          backgroundColor: bg,
          opacity: Math.max(minDim, os.getWallpaperDimOpacity()),
        }}
      />
    </>
  );
}

function renderLockSmsBadge(
  os: RetroDeckOS,
  badgeBg: string,
  badgeInk: string,
  borderColor?: string
): React.ReactNode {
  if (os.unreadSmsCount <= 0 && os.smsBannerTimer <= 0) return null;
  const text =
    os.smsBannerTimer > 0
      ? os.smsBanner.replace('✉ ', '')
      : `${os.unreadSmsCount} ${tOs(os.unreadSmsCount > 1 ? 'newMsgPlural' : 'newMsgSingle', os.lang)}`;
  return (
    <View
      style={{
        backgroundColor: badgeBg,
        borderWidth: borderColor ? 1 : 0,
        borderColor: borderColor || 'transparent',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Ionicons name="mail" size={10} color={badgeInk} />
      <Text
        style={{
          color: badgeInk,
          fontFamily: MONO_FONT,
          fontSize: 8,
          fontWeight: '900',
        }}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

/** 1. NEXUS HOLO-OS: Biometric Fingerprint Scanner Ring Lock Screen */
function renderNexusLock(
  os: RetroDeckOS,
  fg: string,
  bg: string,
  clk: LockClockInfo
): React.ReactNode {
  const lockWall = os.getActiveWallpaper();
  const palId = os.cb.getPaletteId?.() ?? '';
  const isHolo = palId === 'nexus_holo' || palId === 'oled' || palId === 'tokyo_night';
  const accent2 = isHolo ? '#A855F7' : fg;
  const ringAngleA = `${Math.round((os.uptime * 36) % 360)}deg`;
  const ringAngleB = `${Math.round((360 - ((os.uptime * 54) % 360)) % 360)}deg`;
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(os.uptime * 4.2));
  const scanOffset = Math.round(Math.sin(os.uptime * 4.5) * 18);
  const stage = os.unlockStage;
  const ringMain = stage ? accent2 : fg;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: lockWall ? bg : isHolo ? '#030712' : bg,
          paddingHorizontal: 8,
          paddingVertical: 6,
          justifyContent: 'space-between',
          overflow: 'hidden',
        },
      ]}
    >
      {renderLockWallpaper(os, bg, 0.45)}

      {!lockWall && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <View
            style={{
              position: 'absolute',
              top: -30,
              left: -20,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: hexWithAlpha(fg, 0.11),
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -36,
              right: -18,
              width: 155,
              height: 155,
              borderRadius: 77,
              backgroundColor: hexWithAlpha(accent2, 0.13),
            }}
          />
        </View>
      )}

      {/* Top Biometric Telemetry Strip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: hexWithAlpha(bg, 0.78),
          borderWidth: 1,
          borderColor: hexWithAlpha(ringMain, 0.5),
          borderRadius: 4,
          paddingHorizontal: 7,
          paddingVertical: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ringMain, opacity: pulse }} />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: fg, letterSpacing: 0.7 }}>
            NEXUS // {stage ? pickLang(os.lang, 'BIO VERIFIED', 'BIYO DOGRULANDI') : pickLang(os.lang, 'BIOMETRIC LOCK', 'BIYOMETRIK KILIT')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {os.batteryPct !== null && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '800', color: hexWithAlpha(fg, 0.85) }}>
              {os.batteryPct}%
            </Text>
          )}
          <Ionicons name={stage ? 'lock-open' : 'lock-closed'} size={10} color={ringMain} />
        </View>
      </View>

      {/* Main Split Lock Stage: Clock + Fingerprint Scanner */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 }}>
        {/* Left: Holographic Clock & Status */}
        <View style={{ flex: 1.15, justifyContent: 'center', gap: 3, paddingLeft: 4 }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '800', color: accent2, letterSpacing: 1 }}>
            {clk.weekdayStr} • {clk.dateStr}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 30, fontWeight: '900', color: fg, letterSpacing: 1.2 }}>
              {clk.hh}:{clk.mm}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: '800', color: hexWithAlpha(fg, 0.72) }}>
              :{clk.ss}
            </Text>
          </View>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.2, fontWeight: '700', color: hexWithAlpha(fg, 0.72) }}>
            {NOKIA_OPERATORS[os.operatorIdx]} • {NOKIA_PROFILES[os.profileIdx]}
          </Text>
          <View style={{ marginTop: 2, alignSelf: 'flex-start' }}>
            {renderLockSmsBadge(os, fg, bg)}
          </View>
        </View>

        {/* Right: Interactive Fingerprint Scanner Ring */}
        <Pressable
          onPress={() => handleLockInteraction(os)}
          style={{
            flex: 0.95,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hexWithAlpha(bg, 0.74),
            borderWidth: 1,
            borderColor: hexWithAlpha(ringMain, stage ? 0.9 : 0.42),
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 6,
            gap: 5,
          }}
        >
          <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 1.8,
                borderStyle: 'dashed',
                borderColor: stage ? accent2 : hexWithAlpha(fg, 0.78),
                transform: [{ rotate: ringAngleA }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 47,
                height: 47,
                borderRadius: 23.5,
                borderWidth: 1.5,
                borderStyle: 'dotted',
                borderColor: stage ? fg : accent2,
                transform: [{ rotate: ringAngleB }],
              }}
            />
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: stage ? hexWithAlpha(accent2, 0.25) : hexWithAlpha(fg, 0.12),
                borderWidth: 1,
                borderColor: ringMain,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="finger-print" size={22} color={stage ? accent2 : fg} />
            </View>
            {/* Moving Horizontal Biometric Laser */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 44,
                height: 1.8,
                borderRadius: 1,
                backgroundColor: stage ? '#38BDF8' : accent2,
                opacity: 0.85,
                transform: [{ translateY: scanOffset }],
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 6.5,
              fontWeight: '900',
              color: stage ? accent2 : fg,
              textAlign: 'center',
              letterSpacing: 0.4,
            }}
            numberOfLines={1}
          >
            {stage
              ? pickLang(os.lang, 'TAP OR [A] UNLOCK', 'DOKUN / [A] KILIT AC')
              : pickLang(os.lang, 'TAP / [A] SCAN', 'DOKUN / [A] TARA')}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Command Hint */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '800', color: stage ? accent2 : hexWithAlpha(fg, 0.78) }}>
          {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 6.5, fontWeight: '900', color: hexWithAlpha(fg, 0.7) }}>
          RD-BIO v4
        </Text>
      </View>
    </View>
  );
}

/** 2. WINDOWS LOCK SCREENS: Win7 Aero Glass, Win8 Metro Curtain, XP Luna, Win10/11, Win95 */
function renderWinLock(
  os: RetroDeckOS,
  bg: string,
  variant: WinVariant,
  clk: LockClockInfo
): React.ReactNode {
  const lockWall = os.getActiveWallpaper();
  const stage = os.unlockStage;
  const userName = 'RetroDeck';

  if (variant === 'win7') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: '#0A2E5C',
            justifyContent: 'space-between',
            padding: 8,
            overflow: 'hidden',
          },
        ]}
      >
        {renderLockWallpaper(os, '#08264D', 0.22)}
        {!lockWall && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <View style={{ position: 'absolute', top: -45, left: -30, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(56, 189, 248, 0.22)' }} />
            <View style={{ position: 'absolute', bottom: -50, right: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(14, 165, 233, 0.20)' }} />
            <View style={{ position: 'absolute', top: 38, left: 0, right: 0, height: 2, backgroundColor: 'rgba(186, 230, 253, 0.14)' }} />
          </View>
        )}

        {/* Top subtle branding + SMS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="logo-windows" size={12} color="#BAE6FD" />
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: '#E0F2FE' }}>
              Windows 7 Aero
            </Text>
          </View>
          {renderLockSmsBadge(os, 'rgba(14, 116, 144, 0.85)', '#FFFFFF', '#7DD3FC')}
        </View>

        {/* Center Aero Frosted Glass Card */}
        <View
          style={{
            alignSelf: 'center',
            width: '88%',
            maxWidth: 270,
            backgroundColor: 'rgba(13, 55, 107, 0.80)',
            borderWidth: 1.5,
            borderColor: 'rgba(186, 230, 253, 0.72)',
            borderRadius: 9,
            padding: 10,
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {/* Top glossy Aero reflection strip */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 16,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Framed User Avatar Tile */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                backgroundColor: '#1E64B5',
                borderWidth: 2,
                borderColor: '#E0F2FE',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={24} color="#F0F9FF" />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>
                {userName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Pressable
                  onPress={() => handleLockInteraction(os)}
                  style={{
                    flex: 1,
                    backgroundColor: stage ? '#ECFDF5' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: stage ? '#34D399' : '#60A5FA',
                    borderRadius: 3,
                    paddingHorizontal: 7,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 8.5,
                      fontWeight: '800',
                      color: stage ? '#047857' : '#334155',
                    }}
                    numberOfLines={1}
                  >
                    {stage
                      ? pickLang(os.lang, 'Welcome • Ready!', 'Hos Geldiniz!')
                      : '••••••••'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleLockInteraction(os)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: stage ? '#10B981' : '#2563EB',
                    borderWidth: 1.5,
                    borderColor: '#BAE6FD',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={stage ? 'checkmark' : 'arrow-forward'} size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Aero Clock & Unlock Hint */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '800', color: stage ? '#6EE7B7' : '#BAE6FD' }}>
            {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>
              {clk.hh}:{clk.mm}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.5, fontWeight: '700', color: '#BAE6FD' }}>
              {clk.dateStr}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'win8') {
    const bounce = Math.round(Math.sin(os.uptime * 4) * 3);
    return (
      <Pressable
        onPress={() => handleLockInteraction(os)}
        style={[
          styles.container,
          {
            backgroundColor: '#180053',
            justifyContent: 'space-between',
            padding: 10,
            overflow: 'hidden',
          },
        ]}
      >
        {renderLockWallpaper(os, '#180053', 0.25)}
        {!lockWall && (
          <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, backgroundColor: '#008299', opacity: 0.35 }} />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#E2E8F0' }}>
            {stage ? pickLang(os.lang, 'METRO SIGN-IN', 'METRO OTURUM ACMA') : 'WINDOWS 8 METRO'}
          </Text>
          {renderLockSmsBadge(os, '#00A300', '#FFFFFF')}
        </View>

        {stage ? (
          <View style={{ alignSelf: 'center', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15, 23, 42, 0.82)', paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#38BDF8' }}>
            <View style={{ width: 34, height: 34, backgroundColor: '#00A4EF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: '900', color: '#FFFFFF' }}>
              {userName}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#38BDF8' }}>
              {tOs('unlockNow', os.lang)}
            </Text>
          </View>
        ) : (
          <View style={{ alignSelf: 'center', transform: [{ translateY: bounce }] }}>
            <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.65)" />
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 32, fontWeight: '900', color: '#FFFFFF', lineHeight: 34 }}>
              {clk.hh}:{clk.mm}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '700', color: '#E2E8F0' }}>
              {clk.weekdayStr}, {clk.dateStr}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            {os.batteryPct !== null && (
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#FFFFFF' }}>
                {os.batteryPct}%
              </Text>
            )}
            <Ionicons name="wifi" size={13} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'winxp') {
    return (
      <View style={[styles.container, { backgroundColor: '#5A7EDC', justifyContent: 'space-between' }]}>
        <View style={{ height: 26, backgroundColor: '#00309C', borderBottomWidth: 2, borderBottomColor: '#FF8A00', justifyContent: 'center', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 9, fontWeight: '900', color: '#FFFFFF', flex: 1 }}>
            Windows XP Professional
          </Text>
          {renderLockSmsBadge(os, '#3C9B28', '#FFFFFF')}
        </View>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 10 }}>
          <View style={{ alignItems: 'flex-end', flex: 1, paddingRight: 10 }}>
            <Ionicons name="logo-windows" size={24} color="#FFFFFF" />
            <Text style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}>
              {pickLang(os.lang, 'welcome', 'hos geldiniz')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '700', color: '#DCE7FF' }}>
              {clk.hh}:{clk.mm}:{clk.ss}
            </Text>
          </View>
          <View style={{ width: 1.5, height: '65%', backgroundColor: 'rgba(255,255,255,0.45)' }} />
          <Pressable
            onPress={() => handleLockInteraction(os)}
            style={{
              flex: 1.2,
              marginLeft: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: stage ? '#1E40AF' : 'rgba(0, 48, 156, 0.55)',
              borderWidth: 1.5,
              borderColor: stage ? '#FACC15' : '#93C5FD',
              borderRadius: 6,
              padding: 7,
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 9.5, fontWeight: '900', color: '#FFFFFF' }}>
                {userName}
              </Text>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '700', color: stage ? '#FDE047' : '#BFDBFE' }}>
                {stage ? pickLang(os.lang, 'Click / [A] Enter', 'Dokun / [A] Giris') : pickLang(os.lang, 'Password locked', 'Kilitli')}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 22, backgroundColor: '#00309C', borderTopWidth: 2, borderTopColor: '#FF8A00', justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: stage ? '#FDE047' : '#FFFFFF' }}>
            {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'win95') {
    return (
      <View style={[styles.container, { backgroundColor: '#008080', justifyContent: 'center', alignItems: 'center', padding: 10 }]}>
        {renderLockWallpaper(os, '#008080', 0.25)}
        <View style={{ width: '88%', maxWidth: 260, backgroundColor: '#C0C0C0', borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderRightColor: '#404040', borderBottomColor: '#404040', padding: 3 }}>
          <View style={{ backgroundColor: '#000080', paddingHorizontal: 6, paddingVertical: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}>
              {pickLang(os.lang, 'Enter Network Password', 'Ag Parolasi Girin')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: '#FFFFFF' }}>
              {clk.hh}:{clk.mm}
            </Text>
          </View>
          <View style={{ padding: 9, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="key" size={22} color="#808000" />
              <Text style={{ flex: 1, fontFamily: MONO_FONT, fontSize: 8, fontWeight: '700', color: '#111827' }}>
                {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#808080', paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 8, color: '#111827' }}>{userName}</Text>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 8, color: '#111827' }}>{stage ? 'OK!' : '******'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {renderLockSmsBadge(os, '#000080', '#FFFFFF') || <View />}
              <Pressable
                onPress={() => handleLockInteraction(os)}
                style={{ backgroundColor: '#C0C0C0', borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderRightColor: '#404040', borderBottomColor: '#404040', paddingHorizontal: 14, paddingVertical: 3 }}
              >
                <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#000000' }}>
                  {stage ? pickLang(os.lang, 'UNLOCK', 'AC') : 'OK'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Win10 / Win11 Fluent Lock Screen
  return (
    <View style={[styles.container, { backgroundColor: '#0F172A', justifyContent: 'space-between', padding: 10, overflow: 'hidden' }]}>
      {renderLockWallpaper(os, bg, 0.30)}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#93C5FD' }}>
          {variant === 'win11' ? 'WINDOWS 11 FLUENT' : 'WINDOWS 10'}
        </Text>
        {renderLockSmsBadge(os, '#2563EB', '#FFFFFF')}
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 28, fontWeight: '900', color: '#FFFFFF' }}>
          {clk.hh}:{clk.mm}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '700', color: '#CBD5E1' }}>
          {clk.weekdayStr}, {clk.dateStr}
        </Text>
        <Pressable
          onPress={() => handleLockInteraction(os)}
          style={{
            marginTop: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: stage ? 'rgba(37, 99, 235, 0.85)' : 'rgba(255, 255, 255, 0.16)',
            borderWidth: 1,
            borderColor: stage ? '#93C5FD' : 'rgba(255, 255, 255, 0.35)',
            borderRadius: variant === 'win11' ? 14 : 4,
            paddingHorizontal: 14,
            paddingVertical: 5,
          }}
        >
          <Ionicons name={stage ? 'lock-open' : 'person'} size={13} color="#FFFFFF" />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}>
            {stage ? pickLang(os.lang, 'Sign In • [A]', 'Oturum Ac • [A]') : userName}
          </Text>
        </Pressable>
      </View>

      <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '800', color: '#93C5FD', textAlign: 'center' }}>
        {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
      </Text>
    </View>
  );
}

/** 3. macOS AQUA / SONOMA LOCK SCREEN: Large Glass Clock + User Avatar Capsule */
function renderMacOsLock(
  os: RetroDeckOS,
  bg: string,
  clk: LockClockInfo
): React.ReactNode {
  const lockWall = os.getActiveWallpaper();
  const stage = os.unlockStage;
  const pulse = 0.65 + 0.35 * Math.sin(os.uptime * 3.0);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#0D1B3E',
          justifyContent: 'space-between',
          overflow: 'hidden',
        },
      ]}
    >
      {renderLockWallpaper(os, '#0A1430', 0.24)}
      {!lockWall && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <View style={{ position: 'absolute', top: -40, left: -20, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(56, 189, 248, 0.24)' }} />
          <View style={{ position: 'absolute', bottom: -50, right: -30, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(139, 92, 246, 0.24)' }} />
        </View>
      )}

      {/* Translucent macOS Menu Bar */}
      <View
        style={{
          height: 18,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(255, 255, 255, 0.18)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="logo-apple" size={10} color="#FFFFFF" />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#FFFFFF' }}>
            macOS Sonoma
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="wifi" size={9.5} color="#FFFFFF" />
          {os.batteryPct !== null && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '700', color: '#FFFFFF' }}>
              {os.batteryPct}%
            </Text>
          )}
        </View>
      </View>

      {/* Sonoma Translucent Hero Clock & Date */}
      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '800', color: 'rgba(255,255,255,0.84)', letterSpacing: 1 }}>
          {clk.weekdayStr}, {clk.dateStr}
        </Text>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 36,
            fontWeight: '900',
            color: 'rgba(255, 255, 255, 0.90)',
            letterSpacing: 1.5,
            lineHeight: 40,
          }}
        >
          {clk.hh}:{clk.mm}
        </Text>
        {renderLockSmsBadge(os, 'rgba(255, 255, 255, 0.88)', '#0F172A')}
      </View>

      {/* Aqua / Sonoma User Avatar & Glass Unlock Capsule */}
      <Pressable
        onPress={() => handleLockInteraction(os)}
        style={{ alignItems: 'center', gap: 4, paddingBottom: 8 }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            borderWidth: 1.8,
            borderColor: stage ? '#38BDF8' : `rgba(255, 255, 255, ${pulse.toFixed(2)})`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </View>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>
          RetroDeck
        </Text>
        <View
          style={{
            backgroundColor: stage ? '#FFFFFF' : 'rgba(255, 255, 255, 0.20)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.42)',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: stage ? '#0F172A' : '#FFFFFF' }}>
            {stage ? tOs('unlockNow', os.lang) : pickLang(os.lang, 'Enter Password • 2x [A]', 'Parola • 2x [A]')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/** 4. CYBERPUNK ICE-LOCK & PIP-BOY TERMINAL LOCK */
function renderSciFiLock(
  os: RetroDeckOS,
  fg: string,
  bg: string,
  kind: 'cyberpunk' | 'pipboy',
  clk: LockClockInfo
): React.ReactNode {
  const isCyber = kind === 'cyberpunk';
  const stage = os.unlockStage;
  const accent2 = isCyber ? '#F43F5E' : fg;
  const scanTop = Math.round(((os.uptime * 70) % 100));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          padding: 8,
          justifyContent: 'space-between',
          overflow: 'hidden',
        },
      ]}
    >
      {renderLockWallpaper(os, bg, 0.42)}
      {/* Moving CRT / Netrunner Scan Beam */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${scanTop}%`,
          height: 2,
          backgroundColor: hexWithAlpha(fg, 0.24),
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: hexWithAlpha(fg, 0.5), paddingBottom: 3 }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: fg }}>
          {isCyber ? 'ICE_BARRIER // SEC-04' : 'ROBCO VAULT-TEC // LOCKED'}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: stage ? accent2 : fg }}>
          {stage ? 'ACCESS OK' : 'LOCKED'}
        </Text>
      </View>

      <Pressable
        onPress={() => handleLockInteraction(os)}
        style={{
          alignSelf: 'center',
          width: '90%',
          backgroundColor: hexWithAlpha(bg, 0.85),
          borderWidth: 1.5,
          borderColor: stage ? accent2 : fg,
          paddingVertical: 10,
          paddingHorizontal: 14,
          alignItems: 'center',
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={isCyber ? 'shield-half' : 'nuclear'} size={15} color={stage ? accent2 : fg} />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: fg }}>
            {clk.weekdayStr} • {clk.dateStr}
          </Text>
        </View>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 28, fontWeight: '900', color: fg, letterSpacing: 1.5 }}>
          {clk.hh}:{clk.mm}:{clk.ss}
        </Text>
        {renderLockSmsBadge(os, fg, bg)}
      </Pressable>

      <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: stage ? accent2 : fg, textAlign: 'center' }}>
        {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
      </Text>
    </View>
  );
}

/** 5. CONSOLE STANDBY LOCK (PSP XMB / Xbox Blades / Wii Channels / iPod Classic) */
function renderConsoleLock(
  os: RetroDeckOS,
  fg: string,
  bg: string,
  clk: LockClockInfo
): React.ReactNode {
  const stage = os.unlockStage;
  const label =
    os.menuStyle === 'psp_xmb'
      ? 'XMB STANDBY'
      : os.menuStyle === 'xbox_blades'
      ? 'XBOX 360 GUIDE LOCK'
      : os.menuStyle === 'wii_channels'
      ? 'WII CONSOLE HOLD'
      : 'IPOD HOLD';
  const iconName =
    os.menuStyle === 'ipod_classic'
      ? 'musical-notes'
      : os.menuStyle === 'xbox_blades'
      ? 'disc'
      : 'game-controller';

  return (
    <View style={[styles.container, { backgroundColor: bg, justifyContent: 'space-between', padding: 8 }]}>
      {renderLockWallpaper(os, bg, 0.35)}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: fg }}>{label}</Text>
        {os.batteryPct !== null && (
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: fg }}>{os.batteryPct}%</Text>
        )}
      </View>

      <Pressable
        onPress={() => handleLockInteraction(os)}
        style={{
          alignSelf: 'center',
          alignItems: 'center',
          backgroundColor: hexWithAlpha(bg, 0.82),
          borderWidth: 1.5,
          borderColor: fg,
          borderRadius: os.menuStyle === 'wii_channels' ? 14 : 6,
          paddingHorizontal: 22,
          paddingVertical: 10,
          gap: 3,
        }}
      >
        <Ionicons name={iconName} size={18} color={fg} />
        <Text style={{ fontFamily: MONO_FONT, fontSize: 27, fontWeight: '900', color: fg }}>
          {clk.hh}:{clk.mm}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: hexWithAlpha(fg, 0.8) }}>
          {clk.weekdayStr} • {clk.dateStr}
        </Text>
        {renderLockSmsBadge(os, fg, bg)}
      </Pressable>

      <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: fg, textAlign: 'center' }}>
        {stage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
      </Text>
    </View>
  );
}

/** 6. CLASSIC NOKIA 3310 KEYGUARD & FLOATING CLOCK SCREENSAVER */
function renderNokiaLock(
  os: RetroDeckOS,
  fg: string,
  bg: string,
  clk: LockClockInfo
): React.ReactNode {
  const lockWall = os.getActiveWallpaper();
  const driftY = Math.round(Math.sin(os.uptime * 1.1) * 14);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {renderLockWallpaper(os, bg, 0.32, 20, 18)}
      <View style={[styles.osBar, { borderBottomColor: fg, backgroundColor: fg }]}>
        {renderStatusLeft(os, bg)}
        <Text style={[styles.osBarTxt, { color: bg }]}>[KEYGUARD]</Text>
        {renderStatusRight(os, bg)}
      </View>

      <Pressable
        onPress={() => handleLockInteraction(os)}
        style={[styles.centerBox, { transform: [{ translateY: driftY }] }]}
      >
        {os.clockFace === 'analog' ? (
          <View
            style={[
              styles.swBox,
              {
                borderColor: fg,
                backgroundColor: lockWall ? hexWithAlpha(bg, 0.82) : 'transparent',
                paddingHorizontal: 18,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              },
            ]}
          >
            {renderAnalogDial(fg, 76)}
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={[styles.swLbl, { color: fg }]}>
                {NOKIA_OPERATORS[os.operatorIdx]} // RD-OS
              </Text>
              <Text style={[styles.swTime, { color: fg, fontSize: 16, marginVertical: 2 }]}>
                {clk.hh}:{clk.mm}:{clk.ss}
              </Text>
              <Text style={[styles.swLap, { color: fg }]}>
                KEYGUARD ({NOKIA_PROFILES[os.profileIdx]})
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.swBox,
              {
                borderColor: fg,
                backgroundColor: lockWall ? hexWithAlpha(bg, 0.82) : 'transparent',
                paddingHorizontal: 22,
                paddingVertical: 10,
              },
            ]}
          >
            <Text style={[styles.swLbl, { color: fg }]}>
              {NOKIA_OPERATORS[os.operatorIdx]} // RD-OS
            </Text>
            <Text style={[styles.clockBig, { color: fg }]}>
              {clk.hh}:{clk.mm}:{clk.ss}
            </Text>
            <Text style={[styles.swLap, { color: fg }]}>
              KEYGUARD LOCKED ({NOKIA_PROFILES[os.profileIdx]})
            </Text>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          {renderLockSmsBadge(os, fg, bg)}
        </View>
      </Pressable>

      <View style={[styles.osFooter, { borderTopColor: fg, backgroundColor: os.unlockStage ? fg : 'transparent' }]}>
        <Text style={[styles.footerTxt, { color: os.unlockStage ? bg : fg }]}>
          {os.unlockStage ? tOs('unlockNow', os.lang) : tOs('unlockPrompt', os.lang)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Renders the lock screen dynamically adapted to the active theme / menu style.
 */
export function renderLockScreen(os: RetroDeckOS, fg: string, bg: string): React.ReactNode {
  const kind = resolveLockKind(os);
  const clk = getLockClockInfo(os);

  if (kind === 'nexus') return renderNexusLock(os, fg, bg, clk);
  if (kind === 'macos') return renderMacOsLock(os, bg, clk);
  if (kind === 'cyberpunk' || kind === 'pipboy') return renderSciFiLock(os, fg, bg, kind, clk);
  if (kind === 'console') return renderConsoleLock(os, fg, bg, clk);
  if (
    kind === 'win7' ||
    kind === 'win8' ||
    kind === 'winxp' ||
    kind === 'win10' ||
    kind === 'win11' ||
    kind === 'win95'
  ) {
    return renderWinLock(os, bg, kind, clk);
  }
  return renderNokiaLock(os, fg, bg, clk);
}
