import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface RetroKeyboardDeckProps {
  accentColor: string;
  value: string;
  placeholder?: string;
  targetLabel?: string;
  secure?: boolean;
  onChangeText: (next: string) => void;
  onSubmit: () => void;
  onSwitchToGamepad: () => void;
}

const ROW_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
const ROW_SYM = ['-', '_', '.', '/', ':', '@', '?', '!'];

export const RetroKeyboardDeck: React.FC<RetroKeyboardDeckProps> = ({
  accentColor,
  value,
  placeholder = 'TYPE OR PASTE HERE...',
  targetLabel = 'BUFFER',
  secure = false,
  onChangeText,
  onSubmit,
  onSwitchToGamepad,
}) => {
  const [shift, setShift] = useState(false);
  const [symMode, setSymMode] = useState(false);

  const tapHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleKey = (ch: string) => {
    tapHaptic();
    const out = shift ? ch.toUpperCase() : ch;
    onChangeText(value + out);
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

  const handleEnter = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onSubmit();
  };

  return (
    <View style={styles.deckWrap}>
      {/* Top Buffer Bar with Native Paste Support */}
      <View style={[styles.bufferBar, { borderColor: `${accentColor}66` }]}>
        <View style={[styles.targetTag, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[styles.targetTagTxt, { color: accentColor }]}>{targetLabel}</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.bufferInput, { color: '#F8FAFC' }]}
          onSubmitEditing={handleEnter}
        />
        {value.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clrMiniBtn}>
            <Text style={styles.clrMiniTxt}>CLR</Text>
          </Pressable>
        )}
      </View>

      {/* Number / Symbol Row */}
      <View style={styles.keyRow}>
        {(symMode ? [...ROW_SYM, '+', '='] : ROW_NUMS).map((k) => (
          <Pressable
            key={k}
            onPress={() => handleKey(k)}
            style={({ pressed }) => [
              styles.keyCap,
              styles.numKeyCap,
              pressed && { borderColor: accentColor, backgroundColor: '#1E293B' },
            ]}
          >
            <Text style={[styles.keyTxt, { color: accentColor }]}>{k}</Text>
          </Pressable>
        ))}
      </View>

      {/* QWERTY Row 1 */}
      <View style={styles.keyRow}>
        {ROW_1.map((k) => {
          const disp = shift ? k.toUpperCase() : k;
          return (
            <Pressable
              key={k}
              onPress={() => handleKey(k)}
              style={({ pressed }) => [
                styles.keyCap,
                pressed && { borderColor: accentColor, backgroundColor: '#1E293B' },
              ]}
            >
              <Text style={styles.keyTxt}>{disp}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ASDF Row 2 */}
      <View style={[styles.keyRow, { paddingHorizontal: 10 }]}>
        {ROW_2.map((k) => {
          const disp = shift ? k.toUpperCase() : k;
          return (
            <Pressable
              key={k}
              onPress={() => handleKey(k)}
              style={({ pressed }) => [
                styles.keyCap,
                pressed && { borderColor: accentColor, backgroundColor: '#1E293B' },
              ]}
            >
              <Text style={styles.keyTxt}>{disp}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ZXCV Row 3 + Shift + Backspace */}
      <View style={styles.keyRow}>
        <Pressable
          onPress={() => {
            tapHaptic();
            setShift((s) => !s);
          }}
          style={[
            styles.keyCap,
            styles.wideKey,
            shift && { borderColor: accentColor, backgroundColor: `${accentColor}28` },
          ]}
        >
          <Text style={[styles.keyTxt, shift && { color: accentColor }]}>SHIFT</Text>
        </Pressable>

        {ROW_3.map((k) => {
          const disp = shift ? k.toUpperCase() : k;
          return (
            <Pressable
              key={k}
              onPress={() => handleKey(k)}
              style={({ pressed }) => [
                styles.keyCap,
                pressed && { borderColor: accentColor, backgroundColor: '#1E293B' },
              ]}
            >
              <Text style={styles.keyTxt}>{disp}</Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleBackspace}
          style={({ pressed }) => [
            styles.keyCap,
            styles.wideKey,
            pressed && { borderColor: '#F43F5E', backgroundColor: '#1E293B' },
          ]}
        >
          <Ionicons name="backspace-outline" size={15} color="#FDA4AF" />
        </Pressable>
      </View>

      {/* Bottom Function Row: PAD | SYM | SPACE | SEND */}
      <View style={styles.keyRow}>
        <Pressable
          onPress={() => {
            tapHaptic();
            onSwitchToGamepad();
          }}
          style={[styles.keyCap, styles.fnKey, { borderColor: `${accentColor}66` }]}
        >
          <Ionicons name="game-controller-outline" size={13} color={accentColor} />
          <Text style={[styles.fnKeyTxt, { color: accentColor }]}>PAD</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            tapHaptic();
            setSymMode((s) => !s);
          }}
          style={[
            styles.keyCap,
            styles.fnKey,
            symMode && { borderColor: accentColor, backgroundColor: `${accentColor}22` },
          ]}
        >
          <Text style={[styles.fnKeyTxt, symMode && { color: accentColor }]}>SYM</Text>
        </Pressable>

        <Pressable
          onPress={() => handleKey(' ')}
          style={({ pressed }) => [
            styles.keyCap,
            styles.spaceKey,
            pressed && { borderColor: accentColor, backgroundColor: '#1E293B' },
          ]}
        >
          <Text style={styles.spaceTxt}>RETRODECK SPACE</Text>
        </Pressable>

        <Pressable
          onPress={handleEnter}
          style={[styles.keyCap, styles.sendKey, { backgroundColor: accentColor }]}
        >
          <Text style={styles.sendKeyTxt}>SEND</Text>
          <Ionicons name="return-down-back" size={13} color="#04100C" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  deckWrap: {
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 5,
    justifyContent: 'center',
  },
  bufferBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050911',
    borderWidth: 1.5,
    borderRadius: 8,
    height: 34,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  targetTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 6,
  },
  targetTagTxt: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  bufferInput: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    paddingVertical: 0,
  },
  clrMiniBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    marginLeft: 4,
  },
  clrMiniTxt: {
    color: '#FDA4AF',
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3.5,
  },
  keyCap: {
    flex: 1,
    height: 31,
    backgroundColor: '#111927',
    borderWidth: 1,
    borderBottomWidth: 2.5,
    borderColor: '#263449',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numKeyCap: {
    height: 26,
    backgroundColor: '#0B111C',
  },
  wideKey: {
    flex: 1.45,
    backgroundColor: '#162032',
  },
  fnKey: {
    flex: 1.3,
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#162032',
  },
  spaceKey: {
    flex: 3.6,
    backgroundColor: '#141E2E',
  },
  sendKey: {
    flex: 1.65,
    flexDirection: 'row',
    gap: 4,
    borderColor: 'transparent',
  },
  keyTxt: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  fnKeyTxt: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  spaceTxt: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  sendKeyTxt: {
    color: '#04100C',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
