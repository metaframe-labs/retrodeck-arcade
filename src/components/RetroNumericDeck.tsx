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
  targetLabel?: string;
  onPressKey: (key: string) => void;
  onNav: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onSoftLeft?: () => void;
  onSoftRight?: () => void;
  onSwitchMode: () => void;
  onKeySound?: () => void;
}

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

export const RetroNumericDeck: React.FC<RetroNumericDeckProps> = ({
  accentColor,
  buttonBg = '#121A26',
  buttonBorder = '#26374D',
  onPressKey,
  onNav,
  onSoftLeft,
  onSoftRight,
  onSwitchMode,
  onKeySound,
}) => {
  const { tUi } = useTranslation();
  const isLightBtn = isLightBackground(buttonBg);
  const defIconColor = isLightBtn ? '#1E293B' : '#E2E8F0';
  const defDigitColor = isLightBtn ? '#0F172A' : '#F8FAFC';
  const defSubColor = isLightBtn ? '#64748B' : '#94A3B8';
  const defTxtColor = isLightBtn ? '#334155' : '#CBD5E1';

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

  const handleOk = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onKeySound?.();
    onPressKey('OK');
  };

  return (
    <View style={styles.wrap}>
      {/* Left: Top Nokia Navi-Row + 3x4 Numeric Matrix */}
      <View style={styles.grid}>
        <View style={styles.softRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Left soft key"
            onPress={() => { tapHaptic(); onSoftLeft?.(); }}
            style={({ pressed }) => [
              styles.softBtn,
              { backgroundColor: buttonBg, borderColor: buttonBorder },
              pressed && { borderColor: accentColor, backgroundColor: `${accentColor}28` },
            ]}
          >
            <Text style={[styles.softMainTxt, { color: defTxtColor }]}>L</Text>
            <Text style={[styles.softSubTxt, { color: defSubColor }]}>SOFT</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tUi('btnOk')}
            onPress={handleOk}
            style={({ pressed }) => [
              styles.softBtn,
              styles.softConfirmBtn,
              { backgroundColor: `${accentColor}22`, borderColor: accentColor },
              pressed && { backgroundColor: `${accentColor}44` },
            ]}
          >
            <Ionicons name="checkmark" size={13} color={accentColor} />
            <Text style={[styles.softMainTxt, { color: accentColor }]}>OK</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Right soft key"
            onPress={() => { tapHaptic(); onSoftRight?.(); }}
            style={({ pressed }) => [
              styles.softBtn,
              { backgroundColor: buttonBg, borderColor: buttonBorder },
              pressed && { borderColor: accentColor, backgroundColor: `${accentColor}28` },
            ]}
          >
            <Text style={[styles.softMainTxt, { color: defTxtColor }]}>R</Text>
            <Text style={[styles.softSubTxt, { color: defSubColor }]}>SOFT</Text>
          </Pressable>
        </View>
        <View style={styles.navRow}>
          {(['left', 'up', 'down', 'right'] as const).map((dir) => {
            const label = dir === 'left' ? '◀' : dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▶';
            return (
              <Pressable
                key={dir}
                onPress={() => handleNav(dir)}
                style={({ pressed }) => [
                  styles.navBtn,
                  { backgroundColor: buttonBg, borderColor: buttonBorder },
                  pressed && {
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}28`,
                    transform: [{ scale: 0.95 }],
                  },
                ]}
              >
                <Text style={[styles.navTxt, { color: defIconColor }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {NUM_ROWS.map((row, rIdx) => (
          <View key={rIdx} style={styles.row}>
            {row.map((k) => (
              <Pressable
                key={k.digit}
                onPress={() => handleDigit(k.digit)}
                style={({ pressed }) => [
                  styles.numKey,
                  { backgroundColor: buttonBg, borderColor: buttonBorder },
                  pressed && {
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}28`,
                    transform: [{ scale: 0.96 }],
                  },
                ]}
              >
                <Text style={[styles.digitTxt, { color: defDigitColor }]}>{k.digit}</Text>
                <Text style={[styles.subTxt, { color: defSubColor }]}>{k.sub}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Right: 4-Row Aligned Action & Mode Column */}
      <View style={styles.sideCol}>
        <Pressable
          onPress={handleBackspace}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            pressed && { borderColor: accentColor },
          ]}
        >
          <Ionicons name="backspace-outline" size={15} color={defIconColor} />
          <Text style={[styles.sideTxt, { color: defTxtColor }]}>{tUi('numDel')}</Text>
        </Pressable>

        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            pressed && { borderColor: accentColor },
          ]}
        >
          <Ionicons name="return-down-back-outline" size={15} color={defIconColor} />
          <Text style={[styles.sideTxt, { color: defTxtColor }]}>{tUi('numBack')}</Text>
        </Pressable>

        <Pressable
          onPress={handleOk}
          style={({ pressed }) => [
            styles.sideBtn,
            {
              backgroundColor: `${accentColor}22`,
              borderColor: accentColor,
            },
            pressed && { backgroundColor: `${accentColor}44` },
          ]}
        >
          <Text style={[styles.okTxt, { color: accentColor }]}>{tUi('btnOk')}</Text>
        </Pressable>

        <Pressable
          onPress={onSwitchMode}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            pressed && { borderColor: accentColor },
          ]}
        >
          <Ionicons name="keypad-outline" size={14} color={accentColor} />
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
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  grid: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 5,
  },
  navRow: {
    height: 30,
    flexDirection: 'row',
    gap: 5,
  },
  softRow: {
    height: 27,
    flexDirection: 'row',
    gap: 5,
  },
  softBtn: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  softConfirmBtn: {
    borderWidth: 1.5,
  },
  softMainTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  softSubTxt: {
    fontSize: 6,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  navBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTxt: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  numKey: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  digitTxt: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  subTxt: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  sideCol: {
    width: 68,
    justifyContent: 'space-between',
    gap: 6,
  },
  targetBadge: {
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  targetTxt: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  sideBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sideTxt: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  okTxt: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
