import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { pickLang } from '../../i18n/retroI18n';
import {
  FORMAT_PRESET_IDS,
  getFormatPresets,
  getInstallCdKeySlice,
  getInstallDriverChecklist,
  getInstallEtaJoke,
  getWipeLogLines,
} from '../engine/formatSimEngine';
import type { RetroDeckOS } from '../RetroDeckOS';
import { styles } from '../retroOsStyles';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export function renderFormatApp(os: RetroDeckOS, fg: string, bg: string): React.ReactNode {
  const st = os.formatSim;
  const L = os.lang;
  const presets = getFormatPresets(L);
  const activePreset = presets[st.presetIdx] || presets[0];
  const presetId = FORMAT_PRESET_IDS[st.presetIdx] || 'win98_cd';

  const shakeX =
    st.shakeTimer > 0 ? Math.round(Math.sin(os.uptime * 75) * 3.5) : 0;
  const shakeY =
    st.shakeTimer > 0 ? Math.round(Math.cos(os.uptime * 60) * 2.0) : 0;

  // STAGE 1: BIOS / FORMAT MEDIA WIZARD
  if (st.phase === 'select') {
    return (
      <View
        style={[
          styles.listWrap,
          { justifyContent: 'space-between', transform: [{ translateX: shakeX }, { translateY: shakeY }] },
        ]}
      >
        {/* Top BIOS Header + Simulation Disclaimer */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: fg,
              paddingHorizontal: 5,
              paddingVertical: 2,
              marginBottom: 3,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: bg }}>
              {pickLang(L, 'BIOS // FORMAT UTILITY', 'BIOS // FORMAT ARACI')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: bg }}>
              [SIM-ONLY]
            </Text>
          </View>

          {presets.map((p, idx) => {
            const sel = idx === st.presetIdx;
            return (
              <View
                key={p.id}
                style={{
                  borderWidth: 1.5,
                  borderColor: fg,
                  backgroundColor: sel ? fg : 'transparent',
                  paddingHorizontal: 5,
                  paddingVertical: 3,
                  marginBottom: 3,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1, marginRight: 4 }}>
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 9,
                      fontWeight: '900',
                      color: sel ? bg : fg,
                    }}
                    numberOfLines={1}
                  >
                    {sel ? '▶ ' : '  '}
                    {p.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 7.5,
                      fontWeight: '700',
                      color: sel ? bg : fg,
                      opacity: 0.88,
                    }}
                    numberOfLines={1}
                  >
                    {'   '}
                    {p.subtitle}
                  </Text>
                </View>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: sel ? bg : fg,
                    paddingHorizontal: 3,
                    paddingVertical: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 7.5,
                      fontWeight: '900',
                      color: sel ? bg : fg,
                    }}
                  >
                    {p.badge}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Option: Backup "ODEVLER / HOMEWORK" toggle + Safe Sim Notice */}
        <View>
          <View
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: fg,
              paddingHorizontal: 5,
              paddingVertical: 2.5,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: fg }}>
              {pickLang(L, '◀/▶ SAVE "HOMEWORK_8GB":', '◀/▶ "ODEVLER_8GB" YEDEK:')}
            </Text>
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 8,
                fontWeight: '900',
                color: bg,
                backgroundColor: fg,
                paddingHorizontal: 4,
              }}
            >
              {st.backupHomework
                ? pickLang(L, 'D:\\ SAFE', 'D:\\ KORU')
                : pickLang(L, 'WIPE!', 'SIL!')}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 7.2,
              fontWeight: '900',
              color: fg,
              textAlign: 'center',
              opacity: 0.85,
            }}
            numberOfLines={1}
          >
            {pickLang(
              L,
              '[SIMULATION • NO REAL SCORES/DATA ERASED]',
              '[SIMULASYON • GERCEK VERILERINIZ SILINMEZ]'
            )}
          </Text>
        </View>
      </View>
    );
  }

  // STAGE 2: SCARY PARTITION / NOKIA 12345 CONFIRMATION
  if (st.phase === 'confirm') {
    const blink = Math.floor(os.uptime * 3) % 2 === 0;
    return (
      <View
        style={[
          styles.listWrap,
          { justifyContent: 'space-between', transform: [{ translateX: shakeX }, { translateY: shakeY }] },
        ]}
      >
        <View
          style={{
            backgroundColor: blink ? fg : 'transparent',
            borderWidth: 1.5,
            borderColor: fg,
            paddingVertical: 3,
            paddingHorizontal: 5,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: '900',
              color: blink ? bg : fg,
            }}
            numberOfLines={1}
          >
            {pickLang(L, '⚠ WARNING: FORMAT C:\\ DRIVE? ⚠', '⚠ DIKKAT: C:\\ SURUCUSU FORMATLANSIN MI? ⚠')}
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1.5,
            borderColor: fg,
            paddingHorizontal: 6,
            paddingVertical: 5,
            gap: 3,
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: fg }}>
            {pickLang(L, 'MODE:', 'MOD:')} {activePreset.title}
          </Text>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '800', color: fg }}>
            C:\ SYSTEM  [FAT32]  64KB {'->'} {pickLang(L, 'FORMAT', 'FORMATLA')}
          </Text>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '800', color: fg }}>
            D:\ {pickLang(L, 'HOMEWRK', 'ODEVLER')} [8.0GB] {'->'}{' '}
            {st.backupHomework
              ? pickLang(L, 'KEEP SAFE ✓', 'KORUNACAK ✓')
              : pickLang(L, 'DELETE ALL ✗', 'TUMUNU SIL ✗')}
          </Text>
          {presetId === 'nokia_7370' && (
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 8,
                fontWeight: '900',
                color: bg,
                backgroundColor: fg,
                paddingHorizontal: 4,
                marginTop: 1,
              }}
            >
              {pickLang(L, 'NOKIA SECURITY CODE: [ 1 2 3 4 5 ] ✓', '3310 GUVENLIK KODU: [ 1 2 3 4 5 ] ✓')}
            </Text>
          )}
        </View>

        <View style={{ gap: 3 }}>
          <View
            style={{
              backgroundColor: fg,
              paddingVertical: 3.5,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: bg }}>
              {pickLang(L, '[A] START FORMAT   •   [B] CHICKEN OUT', '[A] FORMATI BASLAT  •  [B] VAZGEC')}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 7.2,
              fontWeight: '900',
              color: fg,
              textAlign: 'center',
            }}
          >
            {pickLang(
              L,
              '100% SAFE PRANK SIM • REAL DATA UNTOUCHED',
              '%100 GUVENLI SIMULASYON • VERILERINIZ DURUYOR'
            )}
          </Text>
        </View>
      </View>
    );
  }

  // STAGE 3: CLUSTER SURFACE MAP + BAD SECTOR "SMACK CASE" GAG
  if (st.phase === 'wiping') {
    const pctInt = Math.min(100, Math.floor(st.wipePct));
    const totalBlocks = 32; // 2 rows x 16 cols
    const wipedBlocks = Math.floor((pctInt / 100) * totalBlocks);
    const badBlockIdx = 21; // ~68%
    const logs = getWipeLogLines(st, L);

    return (
      <View
        style={[
          styles.listWrap,
          { justifyContent: 'space-between', transform: [{ translateX: shakeX }, { translateY: shakeY }] },
        ]}
      >
        {/* Top Progress Header */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: fg }}>
              {pickLang(L, 'FORMATTING C:\\ CLUSTERS...', 'C:\\ SEKTORLER FORMATLANIYOR...')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: fg }}>
              {pctInt}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={{ height: 9, borderWidth: 1.5, borderColor: fg, padding: 1, marginBottom: 4 }}>
            <View style={{ width: `${pctInt}%`, height: '100%', backgroundColor: fg }} />
          </View>

          {/* 2x16 Disk Cluster Surface Map */}
          <View
            style={{
              borderWidth: 1,
              borderColor: fg,
              padding: 3,
              gap: 2,
            }}
          >
            {[0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {Array.from({ length: 16 }).map((_, col) => {
                  const idx = row * 16 + col;
                  const isBadStall = st.stalledAtBadSector && idx === badBlockIdx;
                  const isRecoveredBad = st.badSectorFixed && idx === badBlockIdx;
                  const isDone = idx < wipedBlocks;
                  const isHead = idx === wipedBlocks && !st.stalledAtBadSector;
                  const ch = isBadStall
                    ? '!'
                    : isRecoveredBad
                    ? '★'
                    : isHead
                    ? '▣'
                    : isDone
                    ? '·'
                    : '■';
                  return (
                    <View
                      key={col}
                      style={{
                        width: 14,
                        height: 13,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isBadStall || isHead ? fg : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 9,
                          fontWeight: '900',
                          color: isBadStall || isHead ? bg : fg,
                        }}
                      >
                        {ch}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Live DOS / EEPROM Wipe Log */}
        <View
          style={{
            borderWidth: 1,
            borderColor: fg,
            paddingHorizontal: 5,
            paddingVertical: 3,
            minHeight: 42,
            justifyContent: 'center',
          }}
        >
          {logs.map((line, i) => (
            <Text
              key={`${i}-${line}`}
              style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '800', color: fg, lineHeight: 11.5 }}
              numberOfLines={1}
            >
              {'> '}
              {line}
            </Text>
          ))}
        </View>

        {/* Bottom Interactive Status: Bad Sector Stall OR Abort Warning OR Turbo Hint */}
        {st.abortWarnTimer > 0 ? (
          <View style={{ backgroundColor: fg, paddingVertical: 2.5, alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: bg }}>
              {pickLang(
                L,
                '⚠ DO NOT UNPLUG! ([B] AGAIN TO ABORT)',
                '⚠ FISI CEKMEYIN! (CIKMAK ICIN TEKRAR [B])'
              )}
            </Text>
          </View>
        ) : st.stalledAtBadSector ? (
          <View style={{ backgroundColor: fg, paddingVertical: 2.5, alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: bg }}>
              {pickLang(
                L,
                '⚠ STUCK AT 68%! PRESS [A] TO SMACK CASE!',
                '⚠ %68 TAKILDI! KASAYA VURMAK ICIN [A] BAS!'
              )}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 7.5,
              fontWeight: '900',
              color: fg,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {pickLang(
              L,
              `■ USED  · FREE  ★ FIXED  •  [A] SMACK TURBO (${st.smackCount})`,
              `■ DOLU  · BOS  ★ ONARILDI  •  [A] KASA TOKADI (${st.smackCount})`
            )}
          </Text>
        )}
      </View>
    );
  }

  // STAGE 4: OS & DRIVER REINSTALLATION ("39 MINUTES REMAINING" GAG)
  if (st.phase === 'installing') {
    const pctInt = Math.min(100, Math.floor(st.installPct));
    const eta = getInstallEtaJoke(pctInt, L);
    const keySlice = getInstallCdKeySlice(pctInt);
    const checklist = getInstallDriverChecklist(pctInt, L, activePreset.winStyle);

    return (
      <View
        style={[
          styles.listWrap,
          { justifyContent: 'space-between', transform: [{ translateX: shakeX }, { translateY: shakeY }] },
        ]}
      >
        {/* Installer Top Banner + Wild ETA */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              backgroundColor: fg,
              paddingHorizontal: 5,
              paddingVertical: 2,
              marginBottom: 3,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: bg }}>
              {pickLang(L, 'SETUP // INSTALLING RD-OS', 'KURULUM // SISTEM YUKLENIYOR')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: bg }}>
              {pickLang(L, 'ETA:', 'KALAN:')} {eta}
            </Text>
          </View>

          <View style={{ height: 9, borderWidth: 1.5, borderColor: fg, padding: 1, marginBottom: 4 }}>
            <View style={{ width: `${pctInt}%`, height: '100%', backgroundColor: fg }} />
          </View>

          {/* Driver Checklist */}
          <View style={{ borderWidth: 1, borderColor: fg, paddingHorizontal: 5, paddingVertical: 3, gap: 2 }}>
            {checklist.map((item, idx) => (
              <Text
                key={idx}
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 8,
                  fontWeight: item.active || item.done ? '900' : '700',
                  color: fg,
                  opacity: item.done || item.active ? 1 : 0.5,
                }}
                numberOfLines={1}
              >
                {item.done ? '[✓] ' : item.active ? '[▶] ' : '[ ] '}
                {item.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Auto-Typing Serial Key Box */}
        <View
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: fg,
            paddingHorizontal: 5,
            paddingVertical: 2.5,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: fg }}>
            KEY: {keySlice}
            {pctInt < 75 ? '_' : ' ✓'}
          </Text>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: fg }}>
            {pctInt}%
          </Text>
        </View>

        {st.abortWarnTimer > 0 ? (
          <View style={{ backgroundColor: fg, paddingVertical: 2.5, alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: bg }}>
              {pickLang(
                L,
                '⚠ INSTALLING DRIVERS! ([B] AGAIN = EXIT)',
                '⚠ DRIVER KURULUYOR! (CIKIS ICIN TEKRAR [B])'
              )}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 7.5,
              fontWeight: '900',
              color: fg,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {pickLang(
              L,
              'PRESS [A] FOR TURBO CD-ROM 52X SPEED!',
              '52X TURBO CD-ROM HIZI ICIN [A] BAS!'
            )}
          </Text>
        )}
      </View>
    );
  }

  // STAGE 5: FORMAT COMPLETE SUMMARY
  return (
    <View style={[styles.listWrap, { justifyContent: 'space-between' }]}>
      <View
        style={{
          backgroundColor: fg,
          paddingVertical: 3,
          paddingHorizontal: 5,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: MONO_FONT, fontSize: 9, fontWeight: '900', color: bg }}>
          {pickLang(L, '★ FORMAT COMPLETE! [SIM] ★', '★ FORMAT TAMAMLANDI! [SIM] ★')}
        </Text>
      </View>

      <View
        style={{
          borderWidth: 1.5,
          borderColor: fg,
          paddingHorizontal: 6,
          paddingVertical: 5,
          gap: 3,
        }}
      >
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: fg }}>
          ✓{' '}
          {activePreset.winStyle === 'winxp'
            ? pickLang(L, 'THEME: WIN XP LUNA (45s TRIAL)', 'TEMA: WIN XP LUNA (45sn DENEME)')
            : pickLang(L, 'THEME: WIN 98 TEAL (45s TRIAL)', 'TEMA: WIN 98 KLASIK (45sn DENEME)')}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: fg }}>
          ✓ {pickLang(L, 'INSTALLED: DIRECTX 9c + WINAMP', 'KURULAN: DIRECTX 9c + WINAMP + CRACK')}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: fg }}>
          ✓{' '}
          {st.backupHomework
            ? pickLang(L, 'D:\\HOMEWORK_8GB: 100% SAFE!', 'D:\\ODEVLER_8GB: KURTARILDI!')
            : pickLang(L, 'C:\\HOMEWORK_8GB: WIPED (RIP)', 'C:\\ODEVLER_8GB: UCTU (RIP)')}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8.2, fontWeight: '900', color: fg }}>
          •{' '}
          {pickLang(
            L,
            `LEFTOVER CASE SCREWS: ${st.extraScrews} PCS`,
            `KASADAN ARTAN VIDA SAYISI: ${st.extraScrews} ADET`
          )}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <View style={{ backgroundColor: fg, paddingVertical: 3.5, alignItems: 'center' }}>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: bg }}>
            {pickLang(L, '[A] REBOOT TO FRESH DESKTOP', '[A] TERTEMIZ MASAUSTUNU BASLAT')}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 7.2,
            fontWeight: '900',
            color: fg,
            textAlign: 'center',
          }}
        >
          {pickLang(
            L,
            '[SIMULATION ONLY • ALL REAL DATA INTACT]',
            '[SIMULASYON • GERCEK SKOR VE NOTLARINIZ KORUNDU]'
          )}
        </Text>
      </View>
    </View>
  );
}

/** Post-format temporary Windows 98 / XP Boot Splash Screen */
export function renderWinPostFormatBoot(os: RetroDeckOS): React.ReactNode {
  const isXp = os.postFormatWinStyle === 'winxp';
  const L = os.lang;

  if (isXp) {
    // Classic pitch-black Windows XP boot screen with sliding 3-brick track
    const slotCount = 12;
    const head = Math.floor(os.bootTimer * 10) % (slotCount + 3);
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        {/* 4-color retro flag squares */}
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
          <View style={{ width: 11, height: 11, backgroundColor: '#F25022', borderRadius: 1 }} />
          <View style={{ width: 11, height: 11, backgroundColor: '#7FBA00', borderRadius: 1 }} />
          <View style={{ width: 11, height: 11, backgroundColor: '#00A4EF', borderRadius: 1 }} />
          <View style={{ width: 11, height: 11, backgroundColor: '#FFB900', borderRadius: 1 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 20,
              fontWeight: '900',
              color: '#FFFFFF',
              letterSpacing: 1,
            }}
          >
            RetroDeck
          </Text>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: '900',
              color: '#FF6C1A',
              marginLeft: 3,
              marginTop: -1,
            }}
          >
            xp
          </Text>
        </View>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 8.5,
            fontWeight: '800',
            color: '#9DBCEB',
            marginBottom: 16,
            letterSpacing: 1.5,
          }}
        >
          PROFESSIONAL • SP3 [SIM]
        </Text>

        {/* Rounded XP loading bar with 3 sliding blue bricks */}
        <View
          style={{
            width: 146,
            height: 13,
            borderWidth: 1.5,
            borderColor: '#8E9AA8',
            borderRadius: 4,
            paddingHorizontal: 3,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#070B12',
          }}
        >
          {Array.from({ length: slotCount }).map((_, idx) => {
            const lit = idx === head || idx === head - 1 || idx === head - 2;
            return (
              <View
                key={idx}
                style={{
                  width: 8,
                  height: 7,
                  borderRadius: 1,
                  backgroundColor: lit ? '#3B82F6' : 'transparent',
                }}
              />
            );
          })}
        </View>

        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 7.5,
            fontWeight: '800',
            color: '#64748B',
            marginTop: 14,
          }}
        >
          {pickLang(L, 'Applying Luna Theme (45s Trial)...', 'Katilimsiz XP Masaustu Hazirlaniyor...')}
        </Text>
      </View>
    );
  }

  // Windows 98 Second Edition Sky/Teal Splash Screen
  const sweepIdx = Math.floor(os.bootTimer * 12) % 16;
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: '#005A8C', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28 },
      ]}
    >
      <View
        style={{
          backgroundColor: '#C0C0C0',
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderTopColor: '#FFFFFF',
          borderLeftColor: '#FFFFFF',
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderRightColor: '#222222',
          borderBottomColor: '#222222',
          paddingHorizontal: 18,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
          <View style={{ width: 9, height: 9, backgroundColor: '#E03131' }} />
          <View style={{ width: 9, height: 9, backgroundColor: '#2F9E44' }} />
          <View style={{ width: 9, height: 9, backgroundColor: '#1971C2' }} />
          <View style={{ width: 9, height: 9, backgroundColor: '#F08C00' }} />
        </View>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 18,
            fontWeight: '900',
            color: '#000080',
            letterSpacing: 1,
          }}
        >
          RD-Windows 98
        </Text>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize: 9,
            fontWeight: '900',
            color: '#333333',
            marginTop: 2,
          }}
        >
          Second Edition [SIM]
        </Text>
      </View>

      <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#E0F7FA' }}>
        {pickLang(L, 'Starting Windows 98 Desktop...', 'Windows 98 Masaustu Baslatiliyor...')}
      </Text>

      {/* Bottom sweeping Win98 gradient ribbon */}
      <View style={{ width: '100%', height: 12, flexDirection: 'row', backgroundColor: '#002B4D' }}>
        {Array.from({ length: 16 }).map((_, idx) => {
          const dist = Math.min(Math.abs(idx - sweepIdx), 16 - Math.abs(idx - sweepIdx));
          const bgSeg =
            dist === 0 ? '#FFFFFF' : dist === 1 ? '#38BDF8' : dist <= 3 ? '#0284C7' : '#00355E';
          return <View key={idx} style={{ flex: 1, height: '100%', backgroundColor: bgSeg }} />;
        })}
      </View>
    </View>
  );
}

/** Post-format Windows 98 / XP / 8 / 10 / 11 Top Window Titlebar ([_][□][X]) */
export function renderWinPostFormatTopBar(os: RetroDeckOS): React.ReactNode {
  const pal = os.cb.getPaletteId?.() ?? '';
  const isXp = os.postFormatWinStyle === 'winxp' || (!os.postFormatWinStyle && pal === 'windows_xp');
  const isWin8 = !os.postFormatWinStyle && pal === 'windows_8';
  const isWin10 = !os.postFormatWinStyle && pal === 'windows_10';
  const isWin11 = !os.postFormatWinStyle && pal === 'windows_11';
  const isFormatSim = Boolean(os.postFormatWinStyle);
  const secsLeft = Math.max(1, Math.ceil(os.postFormatWinTimer));
  const defaultTitle = isXp
    ? '⊞ My RetroDeck XP'
    : isWin8
    ? '⊞ Windows 8'
    : isWin10
    ? '⊞ Windows 10'
    : isWin11
    ? '⊞ Windows 11'
    : '▣ My RetroDeck (C:)';
  const winTitle =
    os.app === 'desktop'
      ? defaultTitle
      : `▣ ${os.app.toUpperCase()}.EXE`;

  if (isWin11) {
    return (
      <View
        style={{
          height: 20,
          backgroundColor: '#202020',
          borderBottomWidth: 1,
          borderBottomColor: '#2B2B2B',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 6,
        }}
      >
        <Text
          style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '700', color: '#E4E4E7' }}
          numberOfLines={1}
        >
          {winTitle}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {isFormatSim && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: '#60A5FA' }}>
              [{secsLeft}s]
            </Text>
          )}
          {['_', '□', '✕'].map((sym) => (
            <View
              key={sym}
              style={{
                width: 14,
                height: 12,
                borderRadius: 2,
                backgroundColor: sym === '✕' ? '#E81123' : '#2D2D2D',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: MONO_FONT, fontSize: 6.5, fontWeight: '700', color: '#FFFFFF' }}>
                {sym}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isWin8 || isWin10) {
    const barBg = isWin8 ? '#0078D7' : '#1F1F1F';
    return (
      <View
        style={{
          height: 20,
          backgroundColor: barBg,
          borderBottomWidth: 1,
          borderBottomColor: isWin8 ? '#005A9E' : '#2D2D2D',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 6,
        }}
      >
        <Text
          style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '700', color: '#FFFFFF' }}
          numberOfLines={1}
        >
          {winTitle}
        </Text>
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
          {isFormatSim && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#93C5FD' }}>
              [{secsLeft}s]
            </Text>
          )}
          {['_', '□', '✕'].map((sym) => (
            <View
              key={sym}
              style={{
                width: 13,
                height: 13,
                backgroundColor: sym === '✕' ? '#E81123' : 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: '#FFFFFF' }}>
                {sym}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isXp) {
    return (
      <View
        style={{
          height: 20,
          backgroundColor: '#0055EA',
          borderTopWidth: 1.5,
          borderTopColor: '#4B94FF',
          borderBottomWidth: 1,
          borderBottomColor: '#002F87',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 5,
        }}
      >
        <Text
          style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}
          numberOfLines={1}
        >
          {winTitle}
        </Text>
        {isFormatSim ? (
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#BFDBFE' }}>
            [XP•{secsLeft}s]
          </Text>
        ) : (
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: '#BFDBFE' }}>
            Windows XP
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
          {['_', '□'].map((sym) => (
            <View
              key={sym}
              style={{
                width: 13,
                height: 13,
                borderRadius: 2,
                backgroundColor: '#1E6FFF',
                borderWidth: 1,
                borderColor: '#93C5FD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#FFFFFF' }}>
                {sym}
              </Text>
            </View>
          ))}
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 2,
              backgroundColor: '#E0432E',
              borderWidth: 1,
              borderColor: '#FCA5A5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#FFFFFF' }}>
              X
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Windows 98 / 95 Classic Navy Titlebar with 3D gray [_][□][X] buttons
  return (
    <View
      style={{
        height: 20,
        backgroundColor: '#000080',
        borderBottomWidth: 1,
        borderBottomColor: '#DFDFDF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 5,
      }}
    >
      <Text
        style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}
        numberOfLines={1}
      >
        {winTitle}
      </Text>
      {isFormatSim ? (
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#7DD3FC' }}>
          [W98•{secsLeft}s]
        </Text>
      ) : (
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: '#93C5FD' }}>
          Windows 95/98
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
        {['_', '□', 'X'].map((sym) => (
          <View
            key={sym}
            style={{
              width: 12,
              height: 12,
              backgroundColor: '#C0C0C0',
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderTopColor: '#FFFFFF',
              borderLeftColor: '#FFFFFF',
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderRightColor: '#222222',
              borderBottomColor: '#222222',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#000000' }}>
              {sym}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Post-format Windows 98 / XP / 8 / 10 / 11 Taskbar with [Start / Başlat] Button & System Tray */
export function renderWinPostFormatTaskbar(os: RetroDeckOS): React.ReactNode {
  const pal = os.cb.getPaletteId?.() ?? '';
  const isXp = os.postFormatWinStyle === 'winxp' || (!os.postFormatWinStyle && pal === 'windows_xp');
  const isWin8 = !os.postFormatWinStyle && pal === 'windows_8';
  const isWin10 = !os.postFormatWinStyle && pal === 'windows_10';
  const isWin11 = !os.postFormatWinStyle && pal === 'windows_11';
  const startLabel = pickLang(os.lang, 'Start', 'Baslat');
  const activeTab =
    os.app === 'desktop'
      ? pickLang(os.lang, 'Desktop', 'Masaustu')
      : os.app.toUpperCase();

  // Windows 11 Modern Taskbar with Centered Start & App Pill, Sleek System Tray
  if (isWin11) {
    return (
      <View
        style={{
          height: 22,
          backgroundColor: '#1C1C1C',
          borderTopWidth: 1,
          borderTopColor: '#2B2B2B',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Win 11 4-square logo icon */}
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 3,
              backgroundColor: '#0067C0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: '#FFFFFF' }}>
              ⊞
            </Text>
          </View>

          {/* Active Tab */}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 3,
              backgroundColor: '#2D2D2D',
              borderBottomWidth: 1.5,
              borderBottomColor: '#60A5FA',
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '700', color: '#FFFFFF' }}>
              {activeTab}
            </Text>
          </View>
        </View>

        {/* Windows 11 Tray */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {os.unreadSmsCount > 0 && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '700', color: '#FDE047' }}>
              ✉{os.unreadSmsCount}
            </Text>
          )}
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '600', color: '#A1A1AA' }}>
            {os.formatClock()}
          </Text>
        </View>
      </View>
    );
  }

  // Windows 8 / 10 Modern Metro Flat Dark Taskbar
  if (isWin8 || isWin10) {
    return (
      <View
        style={{
          height: 20,
          backgroundColor: '#101010',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 2,
        }}
      >
        <View
          style={{
            height: '100%',
            backgroundColor: isWin8 ? '#0078D7' : 'transparent',
            paddingHorizontal: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}>
            ⊞
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            marginHorizontal: 4,
            height: 16,
            backgroundColor: '#262626',
            borderBottomWidth: 2,
            borderBottomColor: '#0078D7',
            paddingHorizontal: 6,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '700', color: '#FFFFFF' }}
            numberOfLines={1}
          >
            ▣ {activeTab}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {os.unreadSmsCount > 0 && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#FEF08A' }}>
              ✉{os.unreadSmsCount}
            </Text>
          )}
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '700', color: '#D4D4D8' }}>
            {os.formatClock()}
          </Text>
        </View>
      </View>
    );
  }

  if (isXp) {
    return (
      <View
        style={{
          height: 20,
          backgroundColor: '#245EDC',
          borderTopWidth: 1.5,
          borderTopColor: '#4C8BF5',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: 0,
        }}
      >
        {/* Olive/Emerald Green XP Start Pill */}
        <View
          style={{
            height: '100%',
            backgroundColor: '#399E28',
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
            borderRightWidth: 1.5,
            borderRightColor: '#236B16',
            paddingHorizontal: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' }}>
            ⊞ {startLabel.toLowerCase()}
          </Text>
        </View>

        {/* Active Window Task Pill */}
        <View
          style={{
            flex: 1,
            marginHorizontal: 5,
            height: 14,
            backgroundColor: '#1941A5',
            borderRadius: 2,
            borderWidth: 1,
            borderColor: '#3B73EE',
            paddingHorizontal: 5,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '800', color: '#FFFFFF' }}
            numberOfLines={1}
          >
            ▣ {activeTab}
          </Text>
        </View>

        {/* Sky-Blue XP System Tray */}
        <View
          style={{
            height: '100%',
            backgroundColor: '#0F8AEE',
            borderLeftWidth: 1,
            borderLeftColor: '#1357B8',
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {os.unreadSmsCount > 0 && (
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#FEF08A' }}>
              ✉{os.unreadSmsCount}
            </Text>
          )}
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: '#FFFFFF' }}>
            {os.formatClock()}
          </Text>
        </View>
      </View>
    );
  }

  // Windows 98 Classic Silver #C0C0C0 Taskbar with 3D Beveled [Start] & Sunken Tray
  return (
    <View
      style={{
        height: 20,
        backgroundColor: '#C0C0C0',
        borderTopWidth: 1.5,
        borderTopColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
      }}
    >
      {/* 3D Raised [⊞ Start] Button */}
      <View
        style={{
          height: 15,
          backgroundColor: '#C0C0C0',
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderTopColor: '#FFFFFF',
          borderLeftColor: '#FFFFFF',
          borderRightWidth: 1.5,
          borderBottomWidth: 1.5,
          borderRightColor: '#222222',
          borderBottomColor: '#222222',
          paddingHorizontal: 5,
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: '#000000' }}>
          ⊞ {startLabel}
        </Text>
      </View>

      {/* Sunken Active Window Tab */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 4,
          height: 15,
          backgroundColor: '#DFDFDF',
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderTopColor: '#555555',
          borderLeftColor: '#555555',
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderRightColor: '#FFFFFF',
          borderBottomColor: '#FFFFFF',
          paddingHorizontal: 5,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#000000' }}
          numberOfLines={1}
        >
          ▣ {activeTab}
        </Text>
      </View>

      {/* Sunken System Tray Clock */}
      <View
        style={{
          height: 15,
          backgroundColor: '#B8B8B8',
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderTopColor: '#555555',
          borderLeftColor: '#555555',
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderRightColor: '#FFFFFF',
          borderBottomColor: '#FFFFFF',
          paddingHorizontal: 5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {os.unreadSmsCount > 0 && (
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: '#000080' }}>
            ✉{os.unreadSmsCount}
          </Text>
        )}
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.8, fontWeight: '900', color: '#000000' }}>
          {os.formatClock()}
        </Text>
      </View>
    </View>
  );
}

/**
 * Full-screen Easter Egg after the 45-second cracked Windows 98 / XP trial expires!
 * Pitch-black "non-genuine desktop" + classic Windows Activation dialog box.
 */
export function renderWinActivationScreen(os: RetroDeckOS): React.ReactNode {
  const isXp = os.postFormatWinStyle === 'winxp';
  const blink = Math.floor(os.uptime * 2.6) % 2 === 0;

  const headerBg = isXp ? '#0055EA' : '#000080';
  const cardBg = isXp ? '#ECE9D8' : '#C0C0C0';

  return (
    <Pressable
      onPress={() => os.dismissWinActivation(true)}
      style={[
        styles.container,
        {
          backgroundColor: '#000000',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 14,
        },
      ]}
    >
      {/* Classic Windows Activation Dialog Window */}
      <View
        style={{
          width: '100%',
          backgroundColor: cardBg,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderTopColor: isXp ? '#3C8CF6' : '#FFFFFF',
          borderLeftColor: isXp ? '#0055EA' : '#FFFFFF',
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderRightColor: isXp ? '#003087' : '#222222',
          borderBottomColor: isXp ? '#003087' : '#222222',
          borderRadius: isXp ? 4 : 0,
          overflow: 'hidden',
        }}
      >
        {/* Dialog Titlebar */}
        <View
          style={{
            height: 20,
            backgroundColor: headerBg,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: '900',
              color: '#FFFFFF',
              letterSpacing: 0.6,
            }}
          >
            🔑 WINDOWS ACTIVATION
          </Text>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: isXp ? 2 : 0,
              backgroundColor: isXp ? '#E0432E' : '#C0C0C0',
              borderWidth: 1,
              borderColor: isXp ? '#FCA5A5' : '#222222',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 7.5,
                fontWeight: '900',
                color: isXp ? '#FFFFFF' : '#000000',
              }}
            >
              X
            </Text>
          </View>
        </View>

        {/* Dialog Body */}
        <View style={{ paddingHorizontal: 10, paddingVertical: 9, gap: 5 }}>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9.5,
              fontWeight: '900',
              color: '#991B1B',
            }}
          >
            Your trial period has expired.
          </Text>

          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: '900',
              color: '#111111',
            }}
          >
            This copy of Windows is not genuine.
          </Text>

          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 8.5,
              fontWeight: '800',
              color: '#334155',
              marginTop: 2,
            }}
          >
            Returning to RetroDeck OS...
          </Text>

          {/* Classic 3D OK / Press Any Key Button */}
          <View
            style={{
              marginTop: 4,
              alignSelf: 'center',
              backgroundColor: blink ? '#000080' : cardBg,
              borderTopWidth: 1.5,
              borderLeftWidth: 1.5,
              borderTopColor: blink ? '#000080' : '#FFFFFF',
              borderLeftColor: blink ? '#000080' : '#FFFFFF',
              borderRightWidth: 1.5,
              borderBottomWidth: 1.5,
              borderRightColor: '#111111',
              borderBottomColor: '#111111',
              paddingHorizontal: 12,
              paddingVertical: 3.5,
            }}
          >
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 8.5,
                fontWeight: '900',
                color: blink ? '#FFFFFF' : '#000000',
              }}
            >
              Press any key to continue.
            </Text>
          </View>
        </View>
      </View>

      {/* Classic Bottom-Right WGA Desktop Watermark */}
      <Text
        style={{
          position: 'absolute',
          right: 8,
          bottom: 5,
          fontFamily: MONO_FONT,
          fontSize: 7,
          fontWeight: '800',
          color: 'rgba(255, 255, 255, 0.48)',
        }}
      >
        {isXp ? 'Build 2600.xpsp3 • WGA' : 'Build 4.10.2222 • Not Genuine'}
      </Text>
    </Pressable>
  );
}
