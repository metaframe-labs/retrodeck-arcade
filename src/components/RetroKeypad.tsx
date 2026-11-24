import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../i18n/retroI18n';

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
  osMode?: boolean;
  isPaused?: boolean;
  isMuted?: boolean;
  onButtonChange: (btn: ArcadeButton, pressed: boolean) => void;
  onSelectPress?: () => void;
  onStartPress?: () => void;
  onHomePress?: () => void;
  onToggleMute?: () => void;
}

/** Minimum press duration (ms) so rapid taps register cleanly */
const MIN_LATCH_MS = 30;
const BUTTON_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

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
  osMode = false,
  isPaused = false,
  isMuted = false,
  onButtonChange,
  onSelectPress,
  onStartPress,
  onHomePress,
  onToggleMute,
}) => {
  const { tUi } = useTranslation();
  const [pressed, setPressed] = useState<Record<ArcadeButton, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
  });
  const [turboActive, setTurboActive] = useState(false);

  const pressStartTime = useRef<Record<string, number>>({});
  const releaseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const turboIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      Object.values(releaseTimers.current).forEach((t) => clearTimeout(t));
      if (turboIntervalRef.current) {
        clearInterval(turboIntervalRef.current);
      }
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

  const handleTurboIn = () => {
    if (turboIntervalRef.current) clearInterval(turboIntervalRef.current);
    triggerHaptic();
    setTurboActive(true);
    let firing = true;
    onButtonChange('a', true);
    turboIntervalRef.current = setInterval(() => {
      firing = !firing;
      onButtonChange('a', firing);
    }, 85);
  };

  const handleTurboOut = () => {
    if (turboIntervalRef.current) {
      clearInterval(turboIntervalRef.current);
      turboIntervalRef.current = null;
    }
    setTurboActive(false);
    onButtonChange('a', false);
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
  ) => {
    const isHorizontal = dir === 'left' || dir === 'right';
    return (
      <Pressable
        hitSlop={BUTTON_HIT_SLOP}
        onPressIn={() => handlePressIn(dir)}
        onPressOut={() => handlePressOut(dir)}
        style={[
          styles.dpadBtn,
          isHorizontal ? styles.dpadBtnH : styles.dpadBtnV,
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
  };

  const systemButtons: Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    active?: boolean;
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
  }> = [
    {
      key: 'select',
      label: osMode ? tUi('btnDeck') : tUi('btnSelect'),
      icon: osMode ? 'keypad-outline' : 'albums-outline',
      onPress: () => {
        triggerHaptic();
        onSelectPress?.();
      },
    },
    {
      key: 'ok',
      label: tUi('btnOk'),
      icon: 'checkmark-circle-outline',
      active: pressed.a,
      onPressIn: () => handlePressIn('a'),
      onPressOut: () => handlePressOut('a'),
    },
    {
      key: 'start',
      label: !osMode && isPaused ? tUi('resume') : tUi('btnStart'),
      icon: !osMode && isPaused ? 'play' : 'play-skip-forward-outline',
      active: !osMode && isPaused,
      onPress: () => {
        triggerHaptic();
        onStartPress?.();
      },
    },
    {
      key: 'home',
      label: osMode ? tUi('btnGame') : tUi('btnHome'),
      icon: osMode ? 'game-controller-outline' : 'home-outline',
      onPress: () => {
        triggerHaptic();
        onHomePress?.();
      },
    },
  ];

  return (
    <View style={styles.deckShell}>
      {/* Top Shoulder Bumpers: L (Sound/Mute) & R (Turbo Auto-A) */}
      <View style={styles.shoulderRow}>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onToggleMute?.();
          }}
          style={[
            styles.shoulderBtn,
            styles.shoulderLeft,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            isMuted && { borderColor: accentColor, backgroundColor: `${accentColor}26` },
          ]}
        >
          <Text style={[styles.shoulderTag, isMuted && { color: accentColor }]}>L</Text>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high-outline'}
            size={12}
            color={isMuted ? accentColor : '#94A3B8'}
          />
          <Text style={[styles.shoulderTxt, isMuted && { color: accentColor }]}>
            {isMuted ? tUi('btnMuted') : tUi('btnSfx')}
          </Text>
        </Pressable>

        <View style={styles.deckModelStamp}>
          <View style={[styles.modelDash, { backgroundColor: buttonBorder }]} />
          <Text style={styles.modelTxt}>RD-CON</Text>
          <View style={[styles.modelDash, { backgroundColor: buttonBorder }]} />
        </View>

        <Pressable
          onPressIn={handleTurboIn}
          onPressOut={handleTurboOut}
          style={[
            styles.shoulderBtn,
            styles.shoulderRight,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
            turboActive && { borderColor: accentColor, backgroundColor: `${accentColor}33` },
          ]}
        >
          <Ionicons
            name="flash"
            size={11}
            color={turboActive ? accentColor : '#94A3B8'}
          />
          <Text style={[styles.shoulderTxt, turboActive && { color: accentColor }]}>
            {tUi('btnTurbo')}
          </Text>
          <Text style={[styles.shoulderTag, turboActive && { color: accentColor }]}>R</Text>
        </Pressable>
      </View>

      {/* Main Thumb Cluster: Wide Cross D-Pad + Circular A/B */}
      <View style={styles.gamepadRow}>
        <View style={styles.dpadBox}>
          <View style={styles.dpadTopRow}>
            {renderDpadButton('up', upInfo)}
          </View>

          <View style={styles.dpadMidRow}>
            {renderDpadButton('left', leftInfo)}
            <View style={[styles.dpadCenter, { backgroundColor: centerBg, borderColor: buttonBorder }]}>
              <View style={[styles.dpadPivot, { borderColor: buttonBorder }]} />
            </View>
            {renderDpadButton('right', rightInfo)}
          </View>

          <View style={styles.dpadTopRow}>
            {renderDpadButton('down', downInfo)}
          </View>
        </View>

        {/* Right: Full 360-Degree Circular Action Buttons (A & B) */}
        <View style={styles.abCluster}>
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

      {/* Bottom Handheld Utility Bar: SELECT | OK (Confirm) | START | HOME */}
      <View style={styles.systemBar}>
        {systemButtons.map((btn) => (
          <Pressable
            key={btn.key}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            onPress={btn.onPress}
            onPressIn={btn.onPressIn}
            onPressOut={btn.onPressOut}
            style={({ pressed: isDown }) => [
              styles.sysPill,
              { backgroundColor: buttonBg, borderColor: buttonBorder },
              btn.key === 'ok' && { borderColor: `${accentColor}66` },
              (btn.active || isDown) && {
                borderColor: accentColor,
                backgroundColor: `${accentColor}2A`,
                transform: [{ scale: 0.96 }],
              },
            ]}
          >
            <Ionicons
              name={btn.icon}
              size={12}
              color={btn.active || btn.key === 'ok' ? accentColor : '#94A3B8'}
            />
            <Text
              style={[
                styles.sysPillTxt,
                (btn.active || btn.key === 'ok') && { color: accentColor },
              ]}
            >
              {btn.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  deckShell: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  shoulderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  shoulderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 27,
    paddingHorizontal: 10,
    borderWidth: 1.5,
  },
  shoulderLeft: {
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
  },
  shoulderRight: {
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  shoulderTag: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  shoulderTxt: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  deckModelStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    opacity: 0.65,
  },
  modelDash: {
    width: 12,
    height: 1.5,
    borderRadius: 1,
  },
  modelTxt: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1.4,
  },
  gamepadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    backgroundColor: '#121A26',
    borderWidth: 2,
    borderColor: '#26374D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  dpadBtnV: {
    width: 52,
    height: 50,
    borderRadius: 13,
  },
  dpadBtnH: {
    width: 58,
    height: 52,
    borderRadius: 13,
  },
  dpadBtnPressed: {
    transform: [{ scale: 0.94 }],
    elevation: 1,
  },
  dpadCenter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#090D14',
    borderWidth: 1.5,
    borderColor: '#182433',
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadPivot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.6,
  },
  dpadArrow: {
    color: '#E2E8F0',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dpadArrowCompact: {
    fontSize: 16,
    lineHeight: 18,
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
    gap: 10,
    paddingRight: 4,
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
    width: 66,
    height: 66,
    borderRadius: 33,
    marginTop: 22,
    borderColor: '#364D6B',
  },
  btnA: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 22,
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
  systemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 6,
  },
  sysPill: {
    flex: 1,
    height: 31,
    borderRadius: 15.5,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sysPillTxt: {
    color: '#CBD5E1',
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
});
