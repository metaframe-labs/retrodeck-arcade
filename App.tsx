import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PALETTE_STORAGE_KEY = '@retrodeck8_palette_v1';
const SCANLINES_STORAGE_KEY = '@retrodeck8_scanlines_v1';

import { ArcadeButton, RetroKeypad } from './src/components/RetroKeypad';
import { RetroKeyboardDeck } from './src/components/RetroKeyboardDeck';
import { ArcadeScreen } from './src/arcade/ArcadeScreen';
import { CartridgeBayPage } from './src/components/CartridgeBayPage';
import { DevCartModal } from './src/components/DevCartModal';
import { ThemePickerModal } from './src/components/ThemePickerModal';
import { ARCADE_CARTRIDGES } from './src/arcade/cartridges';
import {
  ArcadeCartridgeDef,
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
} from './src/arcade/types';
import {
  PALETTE_ORDER,
  RETRO_PALETTES,
  RetroPaletteId,
  getAccentInk,
} from './src/theme/palettes';
import { RetroAudioEngine } from './src/audio/RetroAudioEngine';
import { HighScoreService } from './src/arcade/HighScoreService';
import { RetroDeckOS } from './src/os/RetroDeckOS';

const OS_GAMEPAD_LABELS = {
  left: '◀',
  right: '▶',
  up: '▲',
  down: '▼',
  a: 'OK',
  b: 'BACK',
  leftLabel: '◀',
  rightLabel: '▶',
  upLabel: '▲',
  downLabel: '▼',
  aLabel: 'A (OK)',
  bLabel: 'B (BACK)',
};

function RetroDeckConsole() {
  const insets = useSafeAreaInsets();
  const initialCart = ARCADE_CARTRIDGES.find((c) => c.id === 'bounce-retro') || ARCADE_CARTRIDGES[0];
  const [osMode, setOsMode] = useState(true);
  const [activeCart, setActiveCart] = useState<ArcadeCartridgeDef>(initialCart);
  const gameRef = useRef<ArcadeGameInstance>(initialCart.createGame(HighScoreService.getHighScore(initialCart.id)));
  const inputRef = useRef<ArcadeInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
  });

  const [stats, setStats] = useState<ArcadeStats>(() => gameRef.current.getStats());
  const [paletteId, setPaletteId] = useState<RetroPaletteId>('gameboy');
  const [scanlines, setScanlines] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBeeping, setIsBeeping] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [, setKbdTick] = useState(0);
  const [bayVisible, setBayVisible] = useState(false);
  const [devCartVisible, setDevCartVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [gameOverMenuSelection, setGameOverMenuSelection] = useState<number>(0);
  const [cartridgeReady, setCartridgeReady] = useState<boolean>(true);
  const cartridgeReadyRef = useRef<boolean>(true);
  cartridgeReadyRef.current = cartridgeReady;
  const beepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paletteIdRef = useRef<RetroPaletteId>(paletteId);
  const scanlinesRef = useRef<boolean>(scanlines);
  const highScoresRef = useRef<Record<string, number>>(highScores);
  const prevInputRef = useRef<ArcadeInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
  });
  paletteIdRef.current = paletteId;
  scanlinesRef.current = scanlines;
  highScoresRef.current = highScores;

  const palette = RETRO_PALETTES[paletteId];

  // Load persisted OS theme & CRT scanlines setting on boot
  useEffect(() => {
    AsyncStorage.getItem(PALETTE_STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in RETRO_PALETTES) {
          setPaletteId(saved as RetroPaletteId);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(SCANLINES_STORAGE_KEY)
      .then((saved) => {
        if (saved === '0' || saved === '1') {
          setScanlines(saved === '1');
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Retro Synthesizer & Subscribe to High Scores
  useEffect(() => {
    RetroAudioEngine.init().catch(() => {});
    return HighScoreService.subscribe((scores) => {
      console.log('HIGH_SCORES_UPDATED:', JSON.stringify(scores));
      setHighScores(scores);
      const hs = scores[activeCart.id] || 0;
      if (hs > 0 && gameRef.current.setHighScore) {
        gameRef.current.setHighScore(hs);
        setStats(gameRef.current.getStats());
      }
    });
  }, [activeCart.id]);

  // Sound & Haptic dispatch
  const handleSoundEvent = useCallback((sound: ArcadeSound) => {
    console.log('[RetroDeck] Sound event:', sound);
    setIsBeeping(true);
    if (beepTimeoutRef.current) clearTimeout(beepTimeoutRef.current);
    beepTimeoutRef.current = setTimeout(() => setIsBeeping(false), 90);

    // Play 8-bit synthesized retro sound
    RetroAudioEngine.play(sound);

    if (Platform.OS !== 'web') {
      switch (sound) {
        case 'hit':
        case 'shoot':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          break;
        case 'score':
        case 'powerup':
        case 'levelclear':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          break;
        case 'explode':
        case 'bomb':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          break;
        case 'die':
        case 'gameover':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          break;
      }
    }
  }, []);

  // 60 FPS Fixed-Timestep Engine Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const FIXED_STEP = 1 / 60; // 16.666 ms
    const MAX_ACCUM = 0.1; // 100ms clamp

    const loop = (now: number) => {
      let delta = (now - lastTime) / 1000;
      lastTime = now;

      if (delta > MAX_ACCUM) delta = MAX_ACCUM;
      accumulator += delta;

      if (osMode) {
        let playedSound: ArcadeSound | null = null;
        while (accumulator >= FIXED_STEP) {
          accumulator -= FIXED_STEP;
          const s = osRef.current.update(inputRef.current, FIXED_STEP);
          if (s) playedSound = s;
        }
        if (playedSound) handleSoundEvent(playedSound);
        setStats(osRef.current.getStats());
      } else if (!isPaused) {
        // If cartridge ready overlay is active, wait for [A] press or tap before starting
        if (cartridgeReadyRef.current) {
          const input = inputRef.current;
          if (input.a || input.b) {
            cartridgeReadyRef.current = false;
            setCartridgeReady(false);
            handleSoundEvent('hit');
            // If the active game also has an internal isMenu, kick-start it
            if (gameRef.current.getStats().isMenu) {
              gameRef.current.update({ ...input, a: true }, FIXED_STEP);
            }
          }
          accumulator = 0;
          prevInputRef.current = { ...inputRef.current };
        } else {
          let playedSound: ArcadeSound | null = null;
          while (accumulator >= FIXED_STEP) {
            accumulator -= FIXED_STEP;
            const s = gameRef.current.update(inputRef.current, FIXED_STEP);
            if (s) playedSound = s;
          }

          if (playedSound) {
            handleSoundEvent(playedSound);
          }
          const currentStats = gameRef.current.getStats();
          setStats(currentStats);

          // Record high score immediately if score increased
          if (currentStats.score > 0) {
            HighScoreService.recordScore(activeCart.id, currentStats.score);
          }

          // Game Over Global Controls: Navigate [A] RESTART or [B] EXIT OS
          if (currentStats.gameOver && !isPaused) {
            const input = inputRef.current;
            const prev = prevInputRef.current;

            // Toggle selection with Left/Right/Up/Down
            if ((input.left && !prev.left) || (input.up && !prev.up)) {
              setGameOverMenuSelection(0);
              handleSoundEvent('hit');
            } else if ((input.right && !prev.right) || (input.down && !prev.down)) {
              setGameOverMenuSelection(1);
              handleSoundEvent('hit');
            }

            // [A] Button confirms Restart (or active selection)
            if (input.a && !prev.a) {
              handleReset();
              handleSoundEvent('powerup');
            }
            // [B] Button confirms Exit to OS Desktop
            else if (input.b && !prev.b) {
              handleGoHomeOS();
            }
          }

          prevInputRef.current = { ...inputRef.current };
        }
      } else {
        accumulator = 0;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused, osMode, handleSoundEvent, activeCart.id]);

  // Handle Keypad input
  const handleButtonChange = useCallback((btn: ArcadeButton, pressed: boolean) => {
    inputRef.current[btn] = pressed;
  }, []);

  // Cartridge Swap (preserve user's active OS theme)
  const handleSelectCartridge = useCallback((cart: ArcadeCartridgeDef) => {
    const savedHighScore = HighScoreService.getHighScore(cart.id);
    const nextGame = cart.createGame(savedHighScore);
    nextGame.init();
    if (nextGame.setHighScore) nextGame.setHighScore(savedHighScore);
    gameRef.current = nextGame;
    setActiveCart(cart);
    setStats(gameRef.current.getStats());
    cartridgeReadyRef.current = true;
    setCartridgeReady(true);
    setGameOverMenuSelection(0);
    setIsPaused(false);
    setOsMode(false);
    setKeyboardMode(false);
    // Clear button inputs so the [A] press that launched the game from OS/Bay doesn't bleed through
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
    };
    prevInputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
    };
  }, []);

  // Burn & Load Custom Sucrase Dev Cartridge (preserve user's active OS theme)
  const handleBurnCustomCartridge = useCallback((cart: ArcadeCartridgeDef) => {
    const savedHighScore = HighScoreService.getHighScore(cart.id);
    const nextGame = cart.createGame(savedHighScore);
    nextGame.init();
    if (nextGame.setHighScore) nextGame.setHighScore(savedHighScore);
    gameRef.current = nextGame;
    setActiveCart(cart);
    setStats(gameRef.current.getStats());
    cartridgeReadyRef.current = true;
    setCartridgeReady(true);
    setGameOverMenuSelection(0);
    setIsPaused(false);
    setOsMode(false);
    setKeyboardMode(false);
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
    };
    prevInputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
    };
    handleSoundEvent('powerup');
  }, [handleSoundEvent]);

  const handleSelectPalette = useCallback((next: RetroPaletteId) => {
    setPaletteId(next);
    AsyncStorage.setItem(PALETTE_STORAGE_KEY, next).catch(() => {});
    handleSoundEvent('score');
  }, [handleSoundEvent]);

  const handleCyclePalette = useCallback(() => {
    setPaletteId((prev) => {
      const idx = PALETTE_ORDER.indexOf(prev);
      const next = PALETTE_ORDER[(idx + 1) % PALETTE_ORDER.length];
      AsyncStorage.setItem(PALETTE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const handleToggleScanlines = useCallback(() => {
    setScanlines((prev) => {
      const next = !prev;
      AsyncStorage.setItem(SCANLINES_STORAGE_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const osRef = useRef<RetroDeckOS>(
    new RetroDeckOS({
      getCartridges: () => ARCADE_CARTRIDGES,
      getHighScores: () => highScoresRef.current,
      onLaunchGame: (cart) => handleSelectCartridge(cart),
      onOpenCartVault: () => setBayVisible(true),
      onCyclePalette: () => handleCyclePalette(),
      onToggleScanlines: () => handleToggleScanlines(),
      getPaletteName: () => RETRO_PALETTES[paletteIdRef.current].name,
      getScanlines: () => scanlinesRef.current,
      onRequestKeyboard: (open) => setKeyboardMode(open),
      onPlaySound: (s) => handleSoundEvent(s),
    })
  );

  const kbdBinding = osRef.current.getKeyboardBinding();

  const handleGoHomeOS = () => {
    osRef.current.goDesktop();
    setOsMode(true);
    setIsPaused(false);
    handleSoundEvent('hit');
  };

  const handleReset = () => {
    if (osMode) {
      osRef.current.reset();
      return;
    }
    const savedHighScore = HighScoreService.getHighScore(activeCart.id);
    if (gameRef.current.setHighScore) {
      gameRef.current.setHighScore(savedHighScore);
    }
    gameRef.current.reset();
    setStats(gameRef.current.getStats());
    setCartridgeReady(true);
    setGameOverMenuSelection(0);
    setIsPaused(false);
  };

  // Full-Page Cartridge Vault Screen
  if (bayVisible) {
    return (
      <View style={[styles.root, { backgroundColor: palette.chassisBg }]}>
        <StatusBar style="light" />
        <CartridgeBayPage
          cartridges={ARCADE_CARTRIDGES}
          activeCartridgeId={activeCart.id}
          accentColor={palette.bezelAccent}
          highScores={highScores}
          onSelectCartridge={(cart) => {
            handleSelectCartridge(cart);
            setBayVisible(false);
          }}
          onOpenDevCart={() => {
            setBayVisible(false);
            setDevCartVisible(true);
          }}
          onBack={() => setBayVisible(false)}
        />
        <DevCartModal
          visible={devCartVisible}
          accentColor={palette.bezelAccent}
          onClose={() => setDevCartVisible(false)}
          onLoadCustomCartridge={handleBurnCustomCartridge}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: palette.chassisBg,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.mainContainer}>
        {/* Top Hardware Console Header */}
        <View style={styles.topBar}>
          <View style={styles.brandCluster}>
            <Text style={[styles.brandTag, { color: palette.bezelAccent }]}>
              METAFRAME // {palette.name}
            </Text>
            <Text style={styles.brandTitle}>RETRODECK OS</Text>
          </View>

          <View style={styles.topActions}>
            <Pressable
              onPress={() => {
                setThemeModalVisible(true);
                handleSoundEvent('hit');
              }}
              onLongPress={() => {
                handleCyclePalette();
                handleSoundEvent('score');
              }}
              style={[
                styles.paletteBtn,
                {
                  backgroundColor: palette.surfaceBg,
                  borderColor: `${palette.bezelAccent}66`,
                },
              ]}
            >
              <Ionicons name="color-palette-outline" size={15} color={palette.bezelAccent} />
              <View style={[styles.paletteDot, { backgroundColor: palette.pixelOn }]} />
            </Pressable>

            <Pressable
              onPress={() => setDevCartVisible(true)}
              style={[
                styles.paletteBtn,
                {
                  backgroundColor: palette.surfaceBg,
                  borderColor: `${palette.bezelAccent}66`,
                },
              ]}
            >
              <Ionicons name="game-controller-outline" size={15} color={palette.bezelAccent} />
            </Pressable>

            <Pressable
              onPress={() => setBayVisible(true)}
              style={[styles.cartBtn, { backgroundColor: palette.bezelAccent }]}
            >
              <Ionicons name="albums" size={14} color={getAccentInk(palette.bezelAccent)} />
              <Text style={[styles.cartBtnText, { color: getAccentInk(palette.bezelAccent) }]}>
                CARTS
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4:3 Retro Arcade / OS Viewport */}
        <ArcadeScreen
          game={osMode ? osRef.current : gameRef.current}
          stats={stats}
          palette={palette}
          scanlines={scanlines}
          isPaused={osMode ? false : isPaused}
          isBeeping={isBeeping}
          cartridgeTitle={osMode ? osRef.current.getCurrentTitle() : activeCart.title}
          isOsMode={osMode}
          cartCount={ARCADE_CARTRIDGES.length}
          onRestartGame={handleReset}
          onReturnToOS={handleGoHomeOS}
          gameOverMenuSelection={gameOverMenuSelection}
          cartridgeReady={cartridgeReady}
          onStartCartridge={() => {
            cartridgeReadyRef.current = false;
            setCartridgeReady(false);
            handleSoundEvent('hit');
            if (gameRef.current.getStats().isMenu) {
              gameRef.current.update(
                { up: false, down: false, left: false, right: false, a: true, b: false },
                1 / 60
              );
            }
          }}
        />

        {/* Controls Hint Strip */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText} numberOfLines={1}>
            {osMode ? osRef.current.getControlsHint() : activeCart.controlsHint}
          </Text>
        </View>

        {/* Console Utility Toolbar */}
        <View style={styles.toolbar}>
          <Pressable
            onPress={handleGoHomeOS}
            style={[
              styles.toolBtn,
              {
                backgroundColor: palette.surfaceBg,
                borderColor: palette.surfaceBorder,
              },
              osMode && { borderColor: palette.bezelAccent, backgroundColor: `${palette.bezelAccent}22` },
            ]}
          >
            <Ionicons
              name="desktop-outline"
              size={14}
              color={osMode ? palette.bezelAccent : '#CBD5E1'}
            />
            <Text style={[styles.toolText, osMode && { color: palette.bezelAccent }]}>
              OS
            </Text>
          </Pressable>

          {osMode ? (
            <Pressable
              onPress={() => {
                setKeyboardMode((k) => !k);
                handleSoundEvent('hit');
              }}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: palette.surfaceBg,
                  borderColor: palette.surfaceBorder,
                },
                keyboardMode && {
                  borderColor: palette.bezelAccent,
                  backgroundColor: `${palette.bezelAccent}22`,
                },
              ]}
            >
              <Ionicons
                name={keyboardMode ? 'game-controller-outline' : 'keypad-outline'}
                size={14}
                color={keyboardMode ? palette.bezelAccent : '#CBD5E1'}
              />
              <Text style={[styles.toolText, keyboardMode && { color: palette.bezelAccent }]}>
                {keyboardMode ? 'PAD' : 'KBD'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setIsPaused((p) => !p)}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: palette.surfaceBg,
                  borderColor: palette.surfaceBorder,
                },
                isPaused && { borderColor: '#FF9F0A', backgroundColor: 'rgba(255,159,10,0.14)' },
              ]}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={14}
                color={isPaused ? '#FF9F0A' : '#CBD5E1'}
              />
              <Text style={[styles.toolText, isPaused && { color: '#FF9F0A' }]}>
                {isPaused ? 'RESUME' : 'PAUSE'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleReset}
            style={[
              styles.toolBtn,
              {
                backgroundColor: palette.surfaceBg,
                borderColor: palette.surfaceBorder,
              },
            ]}
          >
            <Ionicons name="refresh" size={14} color="#CBD5E1" />
            <Text style={styles.toolText}>{osMode ? 'REBOOT' : 'RESET'}</Text>
          </Pressable>

          <Pressable
            onPress={handleToggleScanlines}
            style={[
              styles.toolBtn,
              {
                backgroundColor: palette.surfaceBg,
                borderColor: palette.surfaceBorder,
              },
              scanlines && { borderColor: `${palette.bezelAccent}88` },
            ]}
          >
            <Ionicons
              name="tv-outline"
              size={14}
              color={scanlines ? palette.bezelAccent : '#CBD5E1'}
            />
            <Text style={[styles.toolText, scanlines && { color: palette.bezelAccent }]}>
              CRT
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBayVisible(true)}
            style={[
              styles.toolBtn,
              {
                backgroundColor: palette.surfaceBg,
                borderColor: `${palette.bezelAccent}66`,
              },
            ]}
          >
            <Ionicons name="albums-outline" size={14} color={palette.bezelAccent} />
            <Text style={[styles.toolText, { color: palette.bezelAccent }]}>CARTS</Text>
          </Pressable>
        </View>

        {/* Integrated Handheld Controller Chassis */}
        <View
          style={[
            styles.controllerDeck,
            {
              backgroundColor: palette.deckBg,
              borderTopColor: palette.surfaceBorder,
              borderLeftColor: palette.surfaceBorder,
              borderRightColor: palette.surfaceBorder,
            },
          ]}
        >
          {/* Chassis Top Accent Strip with Speaker Grilles & Badge */}
          <View style={styles.chassisHeader}>
            <View style={styles.speakerGrille}>
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
            </View>
            <Pressable
              onPress={() => {
                if (!osMode) setOsMode(true);
                setKeyboardMode((k) => !k);
                handleSoundEvent('hit');
              }}
              style={styles.chassisBadgeContainer}
            >
              <View
                style={[
                  styles.statusLed,
                  { backgroundColor: palette.actionAccent || palette.bezelAccent },
                ]}
              />
              <Text style={[styles.chassisBadgeText, { color: `${palette.bezelAccent}CC` }]}>
                {keyboardMode ? 'QWERTY COMMUNICATOR DECK [TAP FOR PAD]' : 'ARCADE CONTROLLER DECK [TAP FOR KBD]'}
              </Text>
            </Pressable>
            <View style={styles.speakerGrille}>
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
            </View>
          </View>

          {/* Keypad or QWERTY Keyboard Controls Area */}
          <View style={styles.keypadContainer}>
            {keyboardMode ? (
              <RetroKeyboardDeck
                accentColor={palette.bezelAccent}
                value={kbdBinding.value}
                placeholder={kbdBinding.placeholder}
                targetLabel={kbdBinding.targetLabel}
                secure={kbdBinding.secure}
                onChangeText={(next) => {
                  osRef.current.setKeyboardText(next);
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onSubmit={() => {
                  osRef.current.submitKeyboard();
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onSwitchToGamepad={() => setKeyboardMode(false)}
              />
            ) : (
              <RetroKeypad
                labels={osMode ? OS_GAMEPAD_LABELS : activeCart.gamepadLabels}
                accentColor={palette.actionAccent || palette.bezelAccent}
                buttonBg={palette.buttonBg}
                buttonBorder={palette.buttonBorder}
                centerBg={palette.bezelBg}
                onButtonChange={handleButtonChange}
              />
            )}
          </View>
        </View>
      </View>

      {/* In-App Dev Cart Compiler Modal */}
      <DevCartModal
        visible={devCartVisible}
        accentColor={palette.bezelAccent}
        onClose={() => setDevCartVisible(false)}
        onLoadCustomCartridge={handleBurnCustomCartridge}
      />

      {/* Visual Hardware & LCD Theme Studio Modal */}
      <ThemePickerModal
        visible={themeModalVisible}
        activePaletteId={paletteId}
        activePalette={palette}
        onSelectPalette={handleSelectPalette}
        onCyclePalette={() => {
          handleCyclePalette();
          handleSoundEvent('hit');
        }}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={styles.provider}>
      <RetroDeckConsole />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: '#05080D',
  },
  root: {
    flex: 1,
    backgroundColor: '#05080D',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  brandCluster: {
    flexShrink: 1,
    marginRight: 8,
  },
  brandTag: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  paletteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F1622',
    borderWidth: 1,
  },
  paletteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cartBtnText: {
    color: '#04100C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  hintBar: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  hintText: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: 2,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0E1520',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  toolText: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  controllerDeck: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: -12,
    backgroundColor: '#080D16',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderTopColor: '#1B283A',
    borderLeftWidth: 1,
    borderLeftColor: '#131D2A',
    borderRightWidth: 1,
    borderRightColor: '#131D2A',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  chassisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  speakerGrille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  speakerSlot: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: '#162232',
  },
  chassisBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusLed: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  chassisBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
