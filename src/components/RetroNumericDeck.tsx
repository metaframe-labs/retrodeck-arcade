import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/retroI18n';
import { isLightBackground } from '../theme/palettes';

interface RetroNumericDeckProps {
  accentColor: string;
  buttonBg?: string;
  buttonBorder?: string;
  paletteId?: string;
  menuStyle?: string;
  targetLabel?: string;
  onPressKey: (key: string) => void;
  onControlChange?: (key: string, pressed: boolean) => void;
  onNav: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onSoftLeft?: () => void;
  onSoftRight?: () => void;
  onSwitchMode: () => void;
  onKeySound?: () => void;
}

type KeypadSkin = 'nokia' | 'holo' | 'aero' | 'retro';

interface NumKeyDef {
  digit: string;
  sub: string;
}

const NUM_ROWS: NumKeyDef[][] = [
  [
    { digit: '1', sub: '.,!' },
    { digit: '2', sub: 'ABC' },
    { digit: '3', sub: 'DEF' },
  ],
  [
    { digit: '4', sub: 'GHI' },
    { digit: '5', sub: 'JKL' },
    { digit: '6', sub: 'MNO' },
  ],
  [
    { digit: '7', sub: 'PQRS' },
    { digit: '8', sub: 'TUV' },
    { digit: '9', sub: 'WXYZ' },
  ],
  [
    { digit: '*', sub: '+' },
    { digit: '0', sub: '_' },
    { digit: '#', sub: '⇧' },
  ],
];

function resolveKeypadSkin(paletteId?: string, menuStyle?: string): KeypadSkin {
  if (
    paletteId === 'nexus_holo' ||
    paletteId === 'cyberpunk' ||
    paletteId === 'synthwave' ||
    paletteId === 'tokyo_night' ||
    menuStyle === 'nexus_os' ||
    menuStyle === 'cyberpunk'
  ) {
    return 'holo';
  }
  if (
    paletteId?.startsWith('windows_') ||
    paletteId?.startsWith('macos_') ||
    menuStyle === 'windows' ||
    menuStyle === 'windows_7' ||
    menuStyle === 'windows_8' ||
    menuStyle === 'macos'
  ) {
    return 'aero';
  }
  if (
    paletteId === 'gameboy' ||
    paletteId === 'gameboy_pocket' ||
    paletteId === 'famicom' ||
    paletteId === 'pipboy' ||
    menuStyle === 'pipboy'
  ) {
    return 'retro';
  }
  return 'nokia';
}

export const RetroNumericDeck: React.FC<RetroNumericDeckProps> = ({
  accentColor,
  buttonBg = '#121A26',
  buttonBorder = '#26374D',
  paletteId,
  menuStyle,
  onPressKey,
  onControlChange,
  onNav,
  onSoftLeft,
  onSoftRight,
  onSwitchMode,
  onKeySound,
}) => {
  const { tUi } = useTranslation();
  const skin = resolveKeypadSkin(paletteId, menuStyle);
  const isLightBtn = isLightBackground(buttonBg);

  const defIconColor = isLightBtn ? '#1E293B' : '#E2E8F0';
  const defDigitColor = isLightBtn ? '#0F172A' : '#F8FAFC';
  const defSubColor = isLightBtn ? '#64748B' : '#94A3B8';
  const defTxtColor = isLightBtn ? '#334155' : '#CBD5E1';

  // Skin-specific hardware surface treatments
  const isHolo = skin === 'holo';
  const isAero = skin === 'aero';
  const isRetro = skin === 'retro';
  const callTint = '#22C55E';
  const endTint = '#EF4444';

  const keyBaseBg = isHolo
    ? `${buttonBg}EE`
    : isAero
    ? isLightBtn
      ? '#F1F5F9'
      : '#1B283C'
    : buttonBg;
  const keyBorder = isHolo ? `${accentColor}55` : buttonBorder;
  const topHighlight = isLightBtn ? 'rgba(255,255,255,0.75)' : isAero ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)';
  const naviRingBg = isLightBtn ? 'rgba(15,23,42,0.06)' : 'rgba(2,6,23,0.45)';
  const naviRingBorder = isHolo ? `${accentColor}88` : isAero ? 'rgba(186,230,253,0.45)' : buttonBorder;

  const tapHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onKeySound?.();
  };

  const handleNav = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onNav(dir);
  };

  const handleDigit = (d: string) => {
    tapHaptic();
    onPressKey(d);
  };

  const handleBackspace = () => {
    tapHaptic();
    onPressKey('DEL');
  };

  const handleBack = () => {
    tapHaptic();
    onPressKey('BACK');
  };

  const handleEnd = () => {
    tapHaptic();
    onPressKey('END');
  };

  const handleOk = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onKeySound?.();
    onPressKey('OK');
  };

  const handleCall = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onKeySound?.();
    onPressKey('CALL');
  };

  const getKeyRadiusStyle = (rIdx: number, cIdx: number) => {
    if (isRetro) return { borderRadius: 5 };
    if (isHolo) return { borderRadius: 7 };
    if (isAero) {
      return {
        borderTopLeftRadius: rIdx === 0 && cIdx === 0 ? 10 : 4,
        borderTopRightRadius: rIdx === 0 && cIdx === 2 ? 10 : 4,
        borderBottomLeftRadius: rIdx === 3 && cIdx === 0 ? 12 : 4,
        borderBottomRightRadius: rIdx === 3 && cIdx === 2 ? 12 : 4,
      };
    }
    // Nokia sculpted candybar pillow curves
    return {
      borderTopLeftRadius: rIdx === 0 && cIdx === 0 ? 14 : 8,
      borderTopRightRadius: rIdx === 0 && cIdx === 2 ? 14 : 8,
      borderBottomLeftRadius: rIdx === 3 && cIdx === 0 ? 16 : 9,
      borderBottomRightRadius: rIdx === 3 && cIdx === 2 ? 16 : 9,
    };
  };

  const renderNaviArrow = (dir: 'up' | 'down' | 'left' | 'right', label: string, isVertical: boolean) => (
    <Pressable
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      onPressIn={() => onControlChange?.(dir, true)}
      onPressOut={() => onControlChange?.(dir, false)}
      onPress={() => handleNav(dir)}
      style={({ pressed }) => [
        isVertical ? styles.naviArmV : styles.naviArmH,
        pressed && {
          backgroundColor: `${accentColor}30`,
        },
      ]}
    >
      <Text style={[styles.naviArrowTxt, { color: defIconColor }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {/* Left: Sculpted Candybar Phone Faceplate (Navi Head + 3x4 Pillow Matrix) */}
      <View style={styles.phonePlate}>
        {/* Top Integrated Phone Head: [L-Soft / Call] + [5-Way Navi Ring] + [R-Soft / Back] */}
        <View style={styles.headRow}>
          {/* Left Soft & Green Call Column */}
          <View style={styles.wingCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Left soft key"
              onPressIn={() => onControlChange?.('softleft', true)}
              onPressOut={() => onControlChange?.('softleft', false)}
              onPress={() => {
                tapHaptic();
                onSoftLeft?.();
              }}
              style={({ pressed }) => [
                styles.wingKey,
                styles.softCapL,
                { backgroundColor: keyBaseBg, borderColor: keyBorder },
                pressed && { borderColor: accentColor, backgroundColor: `${accentColor}26`, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View style={[styles.softDash, { backgroundColor: accentColor }]} />
              <Text style={[styles.wingSub, { color: defTxtColor }]}>L</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call / Contacts"
              onPressIn={() => onControlChange?.('OK', true)}
              onPressOut={() => onControlChange?.('OK', false)}
              onPress={handleCall}
              style={({ pressed }) => [
                styles.wingKey,
                {
                  backgroundColor: `${callTint}18`,
                  borderColor: `${callTint}88`,
                  borderRadius: isRetro ? 5 : 9,
                },
                pressed && { backgroundColor: `${callTint}38`, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Ionicons name="call" size={12} color={callTint} />
            </Pressable>
          </View>

          {/* Center 5-Way Ergonomic Navi-Ring with Glowing OK Jewel */}
          <View
            style={[
              styles.naviHousing,
              {
                backgroundColor: naviRingBg,
                borderColor: naviRingBorder,
                borderRadius: isRetro ? 10 : isHolo ? 16 : 22,
              },
            ]}
          >
            {renderNaviArrow('up', '▲', true)}
            <View style={styles.naviMidRow}>
              {renderNaviArrow('left', '◀', false)}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tUi('btnOk')}
                onPressIn={() => onControlChange?.('OK', true)}
                onPressOut={() => onControlChange?.('OK', false)}
                onPress={handleOk}
                style={({ pressed }) => [
                  styles.naviOkJewel,
                  {
                    backgroundColor: isHolo ? `${accentColor}30` : `${accentColor}26`,
                    borderColor: accentColor,
                    borderRadius: isRetro ? 6 : 12,
                  },
                  pressed && { backgroundColor: accentColor, transform: [{ scale: 0.93 }] },
                ]}
              >
                {({ pressed }) => (
                  <Text style={[styles.naviOkTxt, { color: pressed ? (isLightBtn ? '#FFFFFF' : '#020617') : accentColor }]}>
                    OK
                  </Text>
                )}
              </Pressable>
              {renderNaviArrow('right', '▶', false)}
            </View>
            {renderNaviArrow('down', '▼', true)}
          </View>

          {/* Right Soft & Red Hangup/Back Column */}
          <View style={styles.wingCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Right soft key"
              onPressIn={() => onControlChange?.('softright', true)}
              onPressOut={() => onControlChange?.('softright', false)}
              onPress={() => {
                tapHaptic();
                onSoftRight?.();
              }}
              style={({ pressed }) => [
                styles.wingKey,
                styles.softCapR,
                { backgroundColor: keyBaseBg, borderColor: keyBorder },
                pressed && { borderColor: accentColor, backgroundColor: `${accentColor}26`, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text style={[styles.wingSub, { color: defTxtColor }]}>R</Text>
              <View style={[styles.softDash, { backgroundColor: accentColor }]} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End / Exit"
              onPress={handleEnd}
              style={({ pressed }) => [
                styles.wingKey,
                {
                  backgroundColor: `${endTint}16`,
                  borderColor: `${endTint}80`,
                  borderRadius: isRetro ? 5 : 9,
                },
                pressed && { backgroundColor: `${endTint}36`, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Ionicons name="call" size={12} color={endTint} style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
          </View>
        </View>

        {/* Backlit Hairline Divider Between Control Head & Numeric Matrix */}
        <View style={[styles.seamGlow, { backgroundColor: `${accentColor}44` }]} />

        {/* 3x4 Tactile Beveled Numeric Keypad Matrix */}
        <View style={styles.matrix}>
          {NUM_ROWS.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((k, cIdx) => {
                const isHomeKey = k.digit === '5';
                const radiusStyle = getKeyRadiusStyle(rIdx, cIdx);
                return (
                  <Pressable
                    key={k.digit}
                    onPressIn={() => onControlChange?.(k.digit, true)}
                    onPressOut={() => onControlChange?.(k.digit, false)}
                    onPress={() => handleDigit(k.digit)}
                    style={({ pressed }) => [
                      styles.numKey,
                      radiusStyle,
                      {
                        backgroundColor: keyBaseBg,
                        borderColor: keyBorder,
                        borderBottomWidth: pressed ? 1.5 : 3,
                      },
                      pressed && {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}28`,
                        transform: [{ translateY: 1 }, { scale: 0.97 }],
                      },
                    ]}
                  >
                    {/* Top Gloss / Keycap Bevel Highlight */}
                    <View
                      pointerEvents="none"
                      style={[styles.keyGloss, { backgroundColor: topHighlight }]}
                    />
                    <View style={styles.keyLabelRow}>
                      <Text
                        style={[
                          styles.digitTxt,
                          { color: k.digit === '*' || k.digit === '#' ? accentColor : defDigitColor },
                        ]}
                      >
                        {k.digit}
                      </Text>
                      <Text style={[styles.subTxt, { color: defSubColor }]}>{k.sub}</Text>
                    </View>
                    {/* Tactile Homing Pip on Key 5 (like real Nokia 3310) */}
                    {isHomeKey && (
                      <View
                        pointerEvents="none"
                        style={[styles.homingPip, { backgroundColor: accentColor }]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Right: Sculpted Hardware Utility Rail (DEL / BACK / OK / QWERTY) */}
      <View style={styles.sideCol}>
        <Pressable
          onPressIn={() => onControlChange?.('DEL', true)}
          onPressOut={() => onControlChange?.('DEL', false)}
          onPress={handleBackspace}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: keyBaseBg, borderColor: keyBorder },
            pressed && { borderColor: accentColor, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="backspace-outline" size={14} color={defIconColor} />
          <Text style={[styles.sideTxt, { color: defTxtColor }]}>{tUi('numDel')}</Text>
        </Pressable>

        <Pressable
          onPressIn={() => onControlChange?.('BACK', true)}
          onPressOut={() => onControlChange?.('BACK', false)}
          onPress={handleBack}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: keyBaseBg, borderColor: `${endTint}55` },
            pressed && { borderColor: endTint, backgroundColor: `${endTint}20`, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="return-down-back-outline" size={14} color={endTint} />
          <Text style={[styles.sideTxt, { color: defTxtColor }]}>{tUi('numBack')}</Text>
        </Pressable>

        <Pressable
          onPressIn={() => onControlChange?.('OK', true)}
          onPressOut={() => onControlChange?.('OK', false)}
          onPress={handleOk}
          style={({ pressed }) => [
            styles.sideBtn,
            {
              backgroundColor: `${accentColor}24`,
              borderColor: accentColor,
            },
            pressed && { backgroundColor: `${accentColor}48`, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={accentColor} />
          <Text style={[styles.okTxt, { color: accentColor }]}>{tUi('btnOk')}</Text>
        </Pressable>

        <Pressable
          onPress={onSwitchMode}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: keyBaseBg, borderColor: `${accentColor}55` },
            pressed && { borderColor: accentColor, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="keypad-outline" size={13} color={accentColor} />
          <Text style={[styles.sideTxt, { color: accentColor }]}>{tUi('numKbd')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  phonePlate: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 5,
  },
  headRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
  },
  wingCol: {
    flex: 0.72,
    justifyContent: 'space-between',
    gap: 4,
  },
  wingKey: {
    flex: 1,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  softCapL: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  softCapR: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  softDash: {
    width: 12,
    height: 2.5,
    borderRadius: 1.5,
  },
  wingSub: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  naviHousing: {
    width: 118,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  naviArmV: {
    width: '68%',
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naviMidRow: {
    width: '100%',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  naviArmH: {
    flex: 1,
    height: '100%',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naviArrowTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  naviOkJewel: {
    width: 40,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naviOkTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  seamGlow: {
    height: 1.5,
    borderRadius: 1,
    marginHorizontal: 6,
  },
  matrix: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 4.5,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  numKey: {
    flex: 1,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 3,
  },
  keyGloss: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 1.5,
    borderRadius: 1,
  },
  keyLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  digitTxt: {
    fontSize: 16.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  subTxt: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  homingPip: {
    position: 'absolute',
    bottom: 2.5,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  sideCol: {
    width: 62,
    justifyContent: 'space-between',
    gap: 5,
  },
  sideBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sideTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  okTxt: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
