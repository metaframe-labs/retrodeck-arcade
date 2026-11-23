import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface RetroNumericDeckProps {
  accentColor: string;
  buttonBg?: string;
  buttonBorder?: string;
  value: string;
  targetLabel?: string;
  onChangeText: (next: string) => void;
  onSubmit: () => void;
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
  value,
  targetLabel = 'NUM',
  onChangeText,
  onSubmit,
  onSwitchMode,
  onKeySound,
}) => {
  const tapHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onKeySound?.();
  };

  const handleDigit = (d: string) => {
    tapHaptic();
    onChangeText(value + d);
  };

  const handleBackspace = () => {
    tapHaptic();
    if (value.length > 0) {
      onChangeText(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    tapHaptic();
    onChangeText('');
  };

  const handleOk = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onKeySound?.();
    onSubmit();
  };

  return (
    <View style={styles.wrap}>
      {/* Left: Classic Nokia 3310 3x4 Numeric Matrix */}
      <View style={styles.grid}>
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
                <Text style={styles.digitTxt}>{k.digit}</Text>
                <Text style={styles.subTxt}>{k.sub}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Right: Action & Mode Column */}
      <View style={styles.sideCol}>
        <View style={[styles.targetBadge, { borderColor: `${accentColor}55` }]}>
          <Text style={[styles.targetTxt, { color: accentColor }]} numberOfLines={1}>
            {targetLabel}
          </Text>
        </View>

        <Pressable
          onPress={handleBackspace}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            pressed && { borderColor: accentColor },
          ]}
        >
          <Ionicons name="backspace-outline" size={16} color="#E2E8F0" />
          <Text style={styles.sideTxt}>DEL</Text>
        </Pressable>

        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.sideBtn,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            pressed && { borderColor: accentColor },
          ]}
        >
          <Text style={styles.sideTxt}>CLR</Text>
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
          <Text style={[styles.okTxt, { color: accentColor }]}>OK</Text>
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
          <Text style={[styles.sideTxt, { color: accentColor }]}>KBD</Text>
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
    gap: 6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
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
