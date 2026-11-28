import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDesktopLabel, pickLang } from '../../i18n/retroI18n';
import { somaRadioService } from '../../services/somaRadioService';
import { hexWithAlpha, NOKIA_OPERATORS, OsAppId } from '../retroOsData';
import type { RetroDeckOS } from '../RetroDeckOS';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

function getModuleTagline(os: RetroDeckOS, id: OsAppId): string {
  const tr = os.lang === 'tr';
  switch (id) {
    case 'arcade':
      return tr ? `${os.cb.getCartridges().length} OYUN • 60FPS` : `${os.cb.getCartridges().length} CARTS • 60FPS`;
    case 'store':
      return tr ? `${os.installedStoreApps.length}/10 KURULU` : `${os.installedStoreApps.length}/10 INSTALLED`;
    case 'ai':
      return tr ? 'NORAL AI ASISTAN' : 'NEURAL AI CORE';
    case 'radio':
      return somaRadioService.getIsPlaying()
        ? `FM ${somaRadioService.getChannel().freq}`
        : tr
        ? 'CANLI RADYO'
        : 'FM STREAM';
    case 'sms':
      return os.unreadSmsCount > 0
        ? tr
          ? `${os.unreadSmsCount} YENI MESAJ`
          : `${os.unreadSmsCount} UNREAD`
        : tr
        ? 'OTONOM SIM-SMS'
        : 'AUTONOMOUS SMS';
    case 'phone':
      return '3310 DIALER';
    case 'contacts':
      return `${os.getAllContacts().length} ${tr ? 'KISI' : 'ENTRIES'}`;
    case 'wallpapers':
      return tr ? '51 SAHNE + GALERI' : '51 SCENES + PHOTO';
    case 'setup':
      return tr ? 'SISTEM KONTROL' : 'SYSTEM CONFIG';
    case 'clock':
      return os.formatClock();
    case 'calc':
      return 'ALU ENGINE';
    case 'profiles':
      return tr ? 'SES & TUS KILIDI' : 'AUDIO & LOCK';
    default:
      return tr ? 'MODUL HAZIR' : 'MODULE READY';
  }
}

/**
 * NEXUS HOLO-OS: Futuristic 60-FPS animated orbital HUD desktop with cover-flow
 * carousel, counter-rotating holo rings, radar scanner, and live telemetry.
 */
export function renderNexusDesktop(
  os: RetroDeckOS,
  fg: string,
  bg: string,
  renderWallBackdrop: () => React.ReactNode
): React.ReactNode {
  const visibleIcons = os.getVisibleDesktopIcons();
  const total = visibleIcons.length;
  const safeIdx = Math.max(0, Math.min(os.deskIdx, Math.max(0, total - 1)));
  const activeItem = visibleIcons[safeIdx] || visibleIcons[0];
  const activeWall = os.getActiveWallpaper();

  const palId = os.cb.getPaletteId?.() ?? '';
  const isHoloTheme = palId === 'nexus_holo' || palId === 'oled' || palId === 'cyberpunk' || palId === 'tokyo_night';
  const accent2 = isHoloTheme ? '#A855F7' : fg;
  const surfaceBg = activeWall
    ? hexWithAlpha(bg, 0.80)
    : isHoloTheme
    ? 'rgba(7, 14, 28, 0.88)'
    : hexWithAlpha(fg, 0.08);
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(os.uptime * 4.5));
  const ringAngleA = `${Math.round((os.uptime * 28) % 360)}deg`;
  const ringAngleB = `${Math.round((360 - ((os.uptime * 46) % 360)) % 360)}deg`;
  const radarAngle = `${Math.round((os.uptime * 110) % 360)}deg`;

  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  // 5-slot centered Cover-Flow Carousel indices: [idx-2, idx-1, idx, idx+1, idx+2]
  const carouselOffsets = [-2, -1, 0, 1, 2];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: activeWall ? 'transparent' : bg,
        position: 'relative',
        overflow: 'hidden',
        paddingHorizontal: 6,
        paddingVertical: 4,
        justifyContent: 'space-between',
      }}
    >
      {renderWallBackdrop()}

      {/* Deep Holo Grid Horizon & Dual Ambient Auras */}
      {!activeWall && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <View
            style={{
              position: 'absolute',
              top: -36,
              left: -24,
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: hexWithAlpha(fg, 0.11),
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -44,
              right: -24,
              width: 165,
              height: 165,
              borderRadius: 82,
              backgroundColor: hexWithAlpha(accent2, 0.12),
            }}
          />
          {/* Subtle Holo Horizon Scan Grid */}
          {[0.58, 0.69, 0.80, 0.91].map((topRatio, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${Math.round(topRatio * 100)}%`,
                height: 1,
                backgroundColor: hexWithAlpha(fg, 0.12 + i * 0.03),
              }}
            />
          ))}
        </View>
      )}

      {/* 1. TOP TACTICAL TELEMETRY HUD BAR */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: surfaceBg,
          borderWidth: 1,
          borderColor: hexWithAlpha(fg, 0.45),
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2.5,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: fg,
              opacity: pulse,
            }}
          />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: fg, letterSpacing: 0.7 }}>
            NEXUS // OS
          </Text>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 6.5, fontWeight: '700', color: hexWithAlpha(fg, 0.7) }}>
            {NOKIA_OPERATORS[os.operatorIdx]}
          </Text>
        </View>

        {/* Live 5-Bar Quantum Waveform */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const h = 3 + Math.abs(Math.sin(os.uptime * 5.2 + i * 1.15)) * 7;
            return (
              <View
                key={i}
                style={{
                  width: 2.2,
                  height: h,
                  backgroundColor: i % 2 === 0 ? fg : accent2,
                  borderRadius: 1,
                }}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {os.batteryPct !== null && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '800', color: fg }}>
              {os.batteryPct}%
            </Text>
          )}
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: fg }}>
            {hh}:{mm}:{ss}
          </Text>
        </View>
      </View>

      {/* 2. DUAL-STAGE HOLOGRAPHIC CENTERPIECE */}
      <View style={{ flex: 1, flexDirection: 'row', gap: 5, marginVertical: 4 }}>
        {/* Left/Main Hero Card with Counter-Rotating Orbital Rings & Corner Brackets */}
        <Pressable
          onPress={() => {
            if (activeItem) {
              const s = os.launchDesktopApp(activeItem.id);
              os.cb.onPlaySound?.(s);
            }
          }}
          style={{
            flex: 1.55,
            backgroundColor: surfaceBg,
            borderWidth: 1,
            borderColor: hexWithAlpha(fg, 0.45),
            borderRadius: 6,
            padding: 6,
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Corner Targeting Brackets */}
          <View style={{ position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderTopWidth: 2, borderLeftWidth: 2, borderColor: fg }} />
          <View style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderTopWidth: 2, borderRightWidth: 2, borderColor: fg }} />
          <View style={{ position: 'absolute', bottom: 3, left: 3, width: 7, height: 7, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: accent2 }} />
          <View style={{ position: 'absolute', bottom: 3, right: 3, width: 7, height: 7, borderBottomWidth: 2, borderRightWidth: 2, borderColor: accent2 }} />

          <Text style={{ fontFamily: MONO_FONT, fontSize: 6.2, fontWeight: '800', color: hexWithAlpha(fg, 0.72), letterSpacing: 1 }}>
            {pickLang(os.lang, 'ACTIVE MODULE', 'AKTIF MODUL')} // {String(safeIdx + 1).padStart(2, '0')}
          </Text>

          {/* Animated Double Orbital Ring + Core Icon */}
          <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: 50,
                height: 50,
                borderRadius: 25,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: hexWithAlpha(fg, 0.7),
                transform: [{ rotate: ringAngleA }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 39,
                height: 39,
                borderRadius: 19.5,
                borderWidth: 1.5,
                borderStyle: 'dotted',
                borderColor: accent2,
                transform: [{ rotate: ringAngleB }],
              }}
            />
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: fg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={activeItem?.icon || 'apps'} size={16} color={bg} />
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: 1 }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 10.5, fontWeight: '900', color: fg, letterSpacing: 0.8 }} numberOfLines={1}>
              {activeItem ? getDesktopLabel(activeItem.id, activeItem.label, os.lang) : 'NEXUS'}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.4, fontWeight: '800', color: hexWithAlpha(fg, 0.75) }} numberOfLines={1}>
              {activeItem ? getModuleTagline(os, activeItem.id) : ''}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: fg,
              paddingHorizontal: 8,
              paddingVertical: 1.5,
              borderRadius: 3,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '900', color: bg }}>
              ▶ [A] {pickLang(os.lang, 'LAUNCH', 'BASLAT')}
            </Text>
          </View>
        </Pressable>

        {/* Right Telemetry & Mini Orbital Radar Scope */}
        <View
          style={{
            flex: 1,
            backgroundColor: surfaceBg,
            borderWidth: 1,
            borderColor: hexWithAlpha(accent2, 0.45),
            borderRadius: 6,
            padding: 5,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.4, fontWeight: '900', color: fg }}>
              TELEMETRY
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.2, fontWeight: '800', color: accent2 }}>
              60HZ
            </Text>
          </View>

          {/* Rotating Holo Radar Scope */}
          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: hexWithAlpha(fg, 0.6),
                backgroundColor: hexWithAlpha(fg, 0.06),
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'absolute', width: 34, height: 1, backgroundColor: hexWithAlpha(fg, 0.22) }} />
              <View style={{ position: 'absolute', width: 1, height: 34, backgroundColor: hexWithAlpha(fg, 0.22) }} />
              <View style={{ position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 0.8, borderColor: hexWithAlpha(fg, 0.3) }} />
              {/* Rotating Sweep Line */}
              <View
                style={{
                  position: 'absolute',
                  width: 34,
                  height: 1.5,
                  transform: [{ rotate: radarAngle }],
                  flexDirection: 'row',
                }}
              >
                <View style={{ flex: 1 }} />
                <View style={{ flex: 1, backgroundColor: fg }} />
              </View>
              {/* Blip */}
              <View
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 9,
                  width: 3.5,
                  height: 3.5,
                  borderRadius: 2,
                  backgroundColor: accent2,
                  opacity: pulse,
                }}
              />
            </View>
          </View>

          {/* Compact System Bars */}
          <View style={{ gap: 2.5 }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: MONO_FONT, fontSize: 5.8, fontWeight: '800', color: hexWithAlpha(fg, 0.8) }}>
                  CORE
                </Text>
                <Text style={{ fontFamily: MONO_FONT, fontSize: 5.8, fontWeight: '900', color: fg }}>
                  {Math.round(38 + Math.sin(os.uptime * 2) * 14)}%
                </Text>
              </View>
              <View style={{ height: 3, borderWidth: 0.5, borderColor: hexWithAlpha(fg, 0.5), borderRadius: 1.5, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(38 + Math.sin(os.uptime * 2) * 14)}%`, height: '100%', backgroundColor: fg }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 6, fontWeight: '800', color: hexWithAlpha(fg, 0.78) }}>
                PKG:{os.installedStoreApps.length}
              </Text>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 6, fontWeight: '900', color: os.unreadSmsCount > 0 ? accent2 : fg }}>
                SMS:{os.unreadSmsCount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. 3D COVER-FLOW HOLO APP CAROUSEL */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          height: 40,
        }}
      >
        {carouselOffsets.map((offset) => {
          const targetIdx = (safeIdx + offset + total * 2) % total;
          const item = visibleIcons[targetIdx];
          if (!item) return null;
          const isCenter = offset === 0;
          const isNear = Math.abs(offset) === 1;
          const boxSize = isCenter ? 36 : isNear ? 28 : 22;

          return (
            <Pressable
              key={`${offset}-${item.id}`}
              onPress={() => {
                if (isCenter) {
                  const s = os.launchDesktopApp(item.id);
                  os.cb.onPlaySound?.(s);
                } else {
                  os.deskIdx = targetIdx;
                  os.cb.onPlaySound?.('hit');
                }
              }}
              style={{
                width: boxSize,
                height: boxSize,
                borderRadius: isCenter ? 7 : 5,
                backgroundColor: isCenter ? fg : surfaceBg,
                borderWidth: isCenter ? 2 : 1,
                borderColor: isCenter ? fg : hexWithAlpha(fg, isNear ? 0.55 : 0.28),
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isCenter ? 1 : isNear ? 0.8 : 0.48,
                transform: isCenter ? [{ translateY: -2 }] : [],
              }}
            >
              <Ionicons
                name={item.icon}
                size={isCenter ? 19 : isNear ? 14 : 11}
                color={isCenter ? bg : fg}
              />
            </Pressable>
          );
        })}
      </View>

      {/* 4. BOTTOM HOLOGRAPHIC COMMAND BAR */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 4,
          paddingTop: 1,
        }}
      >
        <Text style={{ fontFamily: MONO_FONT, fontSize: 6.2, fontWeight: '800', color: hexWithAlpha(fg, 0.72) }}>
          {pickLang(os.lang, '◀/▶ ORBIT • ▲/▼ ±3 • [A] EXEC', '◀/▶ GEZ • ▲/▼ ±3 • [A] AC')}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 6.4, fontWeight: '900', color: fg }}>
          {String(safeIdx + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}
