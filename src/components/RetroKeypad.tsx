import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

export type ArcadeButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

export interface GamepadButtonLabels {
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  a?: string;
  b?: string;
  upLabel?: string;
  downLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
  aLabel?: string;
  bLabel?: string;
}

interface RetroKeypadProps {
  labels?: GamepadButtonLabels;
  accentColor: string;
  buttonBg?: string;
  buttonBorder?: string;
  centerBg?: string;
  onButtonChange: (btn: ArcadeButton, pressed: boolean) => void;
}

/** Minimum press duration (ms) so rapid taps register cleanly */
const MIN_LATCH_MS = 30;
const BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/** Helper to extract letter and sublabel from button label strings (e.g. "A (FIRE)" -> { letter: "A", sub: "FIRE" }) */
function parseActionLabel(
  defaultLetter: string,
  fullLabel?: string,
  fallbackSub?: string
): { letter: string; sub: string } {
  if (!fullLabel) {
    return { letter: defaultLetter, sub: fallbackSub || '' };
  }
  const match = fullLabel.match(/^([A-Za-z0-9]+)\s*\((.+)\)$/);
  if (match) {
    return { letter: match[1], sub: match[2] };
  }
  if (fullLabel.length <= 2) {
    return {
      letter: fullLabel,
      sub: fallbackSub && fallbackSub !== fullLabel ? fallbackSub : '',
    };
  }
  return { letter: defaultLetter, sub: fullLabel };
}

/** Extracts directional arrow and short action sublabel for 50x50 D-pad caps so text never clips */
function parseDpadLabel(
  defaultArrow: string,
  fullLabel?: string,
  fallback?: string
): { arrow: string; sub: string } {
  const raw = (fullLabel || fallback || defaultArrow).trim();
  if (!raw || raw === defaultArrow) {
    return { arrow: defaultArrow, sub: '' };
  }
  const parenMatch = raw.match(/^([▲▼◀▶])\s*\((.+)\)$/);
  if (parenMatch) {
    return { arrow: parenMatch[1], sub: parenMatch[2].trim() };
  }
  const trailingArrow = raw.match(/^(.+?)\s+([▲▼◀▶])$/);
  if (trailingArrow) {
    return { arrow: trailingArrow[2], sub: trailingArrow[1].trim() };
  }
  if (/^[▲▼◀▶]$/.test(raw)) {
    return { arrow: raw, sub: '' };
  }
  return { arrow: defaultArrow, sub: raw };
}

export const RetroKeypad: React.FC<RetroKeypadProps> = ({
  labels,
  accentColor,
  buttonBg = '#121A26',
  buttonBorder = '#26374D',
  centerBg = '#090D14',
  onButtonChange,
}) => {
  const [pressed, setPressed] = useState<Record<ArcadeButton, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
  });

  const pressStartTime = useRef<Record<string, number>>({});
  const releaseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(releaseTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePressIn = (btn: ArcadeButton) => {
    if (releaseTimers.current[btn]) {
      clearTimeout(releaseTimers.current[btn]);
      delete releaseTimers.current[btn];
    }
    pressStartTime.current[btn] = Date.now();
    triggerHaptic();
    setPressed((prev) => ({ ...prev, [btn]: true }));
    onButtonChange(btn, true);
  };

  const handlePressOut = (btn: ArcadeButton) => {
    if (releaseTimers.current[btn]) {
      clearTimeout(releaseTimers.current[btn]);
    }
    const started = pressStartTime.current[btn] || 0;
    const elapsed = Date.now() - started;
    const remaining = Math.max(0, MIN_LATCH_MS - elapsed);

    if (remaining > 0) {
      releaseTimers.current[btn] = setTimeout(() => {
        setPressed((prev) => ({ ...prev, [btn]: false }));
        onButtonChange(btn, false);
        delete releaseTimers.current[btn];
      }, remaining);
    } else {
      setPressed((prev) => ({ ...prev, [btn]: false }));
      onButtonChange(btn, false);
    }
  };

  const btnAInfo = parseActionLabel('A', labels?.aLabel, labels?.a);
  const btnBInfo = parseActionLabel('B', labels?.bLabel, labels?.b);
  const upInfo = parseDpadLabel('▲', labels?.upLabel, labels?.up);
  const downInfo = parseDpadLabel('▼', labels?.downLabel, labels?.down);
  const leftInfo = parseDpadLabel('◀', labels?.leftLabel, labels?.left);
  const rightInfo = parseDpadLabel('▶', labels?.rightLabel, labels?.right);

  const renderDpadButton = (
    dir: 'up' | 'down' | 'left' | 'right',
    info: { arrow: string; sub: string }
  ) => (
    <Pressable
      hitSlop={BUTTON_HIT_SLOP}
      onPressIn={() => handlePressIn(dir)}
      onPressOut={() => handlePressOut(dir)}
      style={[
        styles.dpadBtn,
        { backgroundColor: buttonBg, borderColor: buttonBorder },
        pressed[dir] && [
          styles.dpadBtnPressed,
          {
            borderColor: accentColor,
            backgroundColor: `${accentColor}33`,
          },
        ],
      ]}
    >
      <Text
        style={[
          styles.dpadArrow,
          info.sub ? styles.dpadArrowCompact : null,
          pressed[dir] && { color: accentColor },
        ]}
      >
        {info.arrow}
      </Text>
      {info.sub ? (
        <Text
          style={[styles.dpadSub, pressed[dir] && { color: accentColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {info.sub}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.gamepadRow}>
      {/* Left: Complete 360-Degree Bordered D-Pad */}
      <View style={styles.dpadBox}>
        {/* UP */}
        <View style={styles.dpadTopRow}>
          {renderDpadButton('up', upInfo)}
        </View>

        {/* LEFT / CENTER / RIGHT */}
        <View style={styles.dpadMidRow}>
          {renderDpadButton('left', leftInfo)}
          <View style={[styles.dpadCenter, { backgroundColor: centerBg, borderColor: buttonBorder }]} />
          {renderDpadButton('right', rightInfo)}
        </View>

        {/* DOWN */}
        <View style={styles.dpadTopRow}>
          {renderDpadButton('down', downInfo)}
        </View>
      </View>

      {/* Right: Full 360-Degree Circular Action Buttons (A & B) */}
      <View style={styles.abCluster}>
        {/* BUTTON B */}
        <View style={styles.actionBtnWrapper}>
          <Pressable
            hitSlop={BUTTON_HIT_SLOP}
            onPressIn={() => handlePressIn('b')}
            onPressOut={() => handlePressOut('b')}
            style={[
              styles.actionBtn,
              styles.btnB,
              { backgroundColor: buttonBg, borderColor: buttonBorder },
              pressed.b && [
                styles.actionBtnPressed,
                {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}38`,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.actionLetter,
                { color: '#CBD5E1' },
                pressed.b && { color: accentColor },
              ]}
            >
              {btnBInfo.letter}
            </Text>
            {btnBInfo.sub ? (
              <Text
                style={[
                  styles.actionSub,
                  { color: '#94A3B8' },
                  pressed.b && { color: accentColor },
                ]}
                numberOfLines={1}
              >
                {btnBInfo.sub}
              </Text>
            ) : null}
          </Pressable>
        </View>

        {/* BUTTON A (Primary Action - 360° Closed Neon Ring) */}
        <View style={styles.actionBtnWrapper}>
          <Pressable
            hitSlop={BUTTON_HIT_SLOP}
            onPressIn={() => handlePressIn('a')}
            onPressOut={() => handlePressOut('a')}
            style={[
              styles.actionBtn,
              styles.btnA,
              { backgroundColor: buttonBg, borderColor: `${accentColor}AA` },
              pressed.a && [
                styles.actionBtnPressed,
                {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}44`,
                },
              ],
            ]}
          >
            <Text style={[styles.actionLetter, { color: accentColor }]}>
              {btnAInfo.letter}
            </Text>
            {btnAInfo.sub ? (
              <Text style={[styles.actionSub, { color: accentColor }]} numberOfLines={1}>
                {btnAInfo.sub}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gamepadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dpadBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadTopRow: {
    alignItems: 'center',
  },
  dpadMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadBtn: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: '#121A26',
    borderWidth: 2,
    borderColor: '#26374D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  dpadBtnPressed: {
    transform: [{ scale: 0.94 }],
    elevation: 1,
  },
  dpadCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#090D14',
    borderWidth: 1.5,
    borderColor: '#182433',
    margin: 2,
  },
  dpadArrow: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dpadArrowCompact: {
    fontSize: 15,
    lineHeight: 17,
  },
  dpadSub: {
    color: '#94A3B8',
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
    paddingHorizontal: 2,
  },
  abCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 6,
  },
  actionBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131B27',
    borderWidth: 2.5,
    borderColor: '#344964',
    elevation: 4,
  },
  btnB: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginTop: 24,
    borderColor: '#364D6B',
  },
  btnA: {
    width: 78,
    height: 78,
    borderRadius: 39,
    marginBottom: 24,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.93 }],
    elevation: 1,
  },
  actionLetter: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 28,
  },
  actionSub: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    marginTop: 1,
  },
});
