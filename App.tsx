import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ArcadeButton, RetroKeypad } from './src/components/RetroKeypad';
import { ArcadeScreen } from './src/arcade/ArcadeScreen';
import { CartridgeBayPage } from './src/components/CartridgeBayPage';
import { DevCartModal } from './src/components/DevCartModal';
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
} from './src/theme/palettes';
import { RetroAudioEngine } from './src/audio/RetroAudioEngine';
import { HighScoreService } from './src/arcade/HighScoreService';

function RetroDeckConsole() {
  const insets = useSafeAreaInsets();
  const initialCart = ARCADE_CARTRIDGES.find((c) => c.id === 'bounce-retro') || ARCADE_CARTRIDGES[0];
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
  const [paletteId, setPaletteId] = useState<RetroPaletteId>('nokia');
  const [scanlines, setScanlines] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isBeeping, setIsBeeping] = useState(false);
  const [bayVisible, setBayVisible] = useState(false);
  const [devCartVisible, setDevCartVisible] = useState(false);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const beepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = RETRO_PALETTES[paletteId];

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

      if (!isPaused) {
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
      } else {
        accumulator = 0;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused, handleSoundEvent, activeCart.id]);

  // Handle Keypad input
  const handleButtonChange = useCallback((btn: ArcadeButton, pressed: boolean) => {
    inputRef.current[btn] = pressed;
  }, []);

  // Cartridge Swap
  const handleSelectCartridge = useCallback((cart: ArcadeCartridgeDef) => {
    const savedHighScore = HighScoreService.getHighScore(cart.id);
    gameRef.current = cart.createGame(savedHighScore);
    setActiveCart(cart);
    setPaletteId(cart.defaultPalette);
    setStats(gameRef.current.getStats());
    setIsPaused(false);
  }, []);

  // Burn & Load Custom Sucrase Dev Cartridge
  const handleBurnCustomCartridge = useCallback((cart: ArcadeCartridgeDef) => {
    const savedHighScore = HighScoreService.getHighScore(cart.id);
    gameRef.current = cart.createGame(savedHighScore);
    setActiveCart(cart);
    setPaletteId(cart.defaultPalette);
    setStats(gameRef.current.getStats());
    setIsPaused(false);
    handleSoundEvent('powerup');
  }, [handleSoundEvent]);

  const handleReset = () => {
    const savedHighScore = HighScoreService.getHighScore(activeCart.id);
    if (gameRef.current.setHighScore) {
      gameRef.current.setHighScore(savedHighScore);
    }
    gameRef.current.reset();
    setStats(gameRef.current.getStats());
    setIsPaused(false);
  };

  const handleCyclePalette = () => {
    const idx = PALETTE_ORDER.indexOf(paletteId);
    setPaletteId(PALETTE_ORDER[(idx + 1) % PALETTE_ORDER.length]);
  };

  // Full-Page Cartridge Vault Screen
  if (bayVisible) {
    return (
      <View style={styles.root}>
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
              METAFRAME // ARCADE
            </Text>
            <Text style={styles.brandTitle}>RETRODECK-8</Text>
          </View>

          <View style={styles.topActions}>
            <Pressable
              onPress={handleCyclePalette}
              style={[styles.paletteBtn, { borderColor: `${palette.bezelAccent}55` }]}
            >
              <Ionicons name="color-palette-outline" size={15} color={palette.bezelAccent} />
              <View style={[styles.paletteDot, { backgroundColor: palette.pixelOn }]} />
            </Pressable>

            <Pressable
              onPress={() => setDevCartVisible(true)}
              style={[styles.paletteBtn, { borderColor: `${palette.bezelAccent}55` }]}
            >
              <Ionicons name="game-controller-outline" size={15} color={palette.bezelAccent} />
            </Pressable>

            <Pressable
              onPress={() => setBayVisible(true)}
              style={[styles.cartBtn, { backgroundColor: palette.bezelAccent }]}
            >
              <Ionicons name="albums" size={14} color="#04100C" />
              <Text style={styles.cartBtnText}>CARTS</Text>
            </Pressable>
          </View>
        </View>

        {/* 4:3 Retro Arcade Viewport */}
        <ArcadeScreen
          game={gameRef.current}
          stats={stats}
          palette={palette}
          scanlines={scanlines}
          isPaused={isPaused}
          isBeeping={isBeeping}
          cartridgeTitle={activeCart.title}
        />

        {/* Controls Hint Strip */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText} numberOfLines={1}>
            {activeCart.controlsHint}
          </Text>
        </View>

        {/* Console Utility Toolbar */}
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => setIsPaused((p) => !p)}
            style={[
              styles.toolBtn,
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

          <Pressable onPress={handleReset} style={styles.toolBtn}>
            <Ionicons name="refresh" size={14} color="#CBD5E1" />
            <Text style={styles.toolText}>RESTART</Text>
          </Pressable>

          <Pressable
            onPress={() => setScanlines((s) => !s)}
            style={[styles.toolBtn, scanlines && { borderColor: `${palette.bezelAccent}77` }]}
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
            style={[styles.toolBtn, { borderColor: `${palette.bezelAccent}55` }]}
          >
            <Ionicons name="albums-outline" size={14} color={palette.bezelAccent} />
            <Text style={[styles.toolText, { color: palette.bezelAccent }]}>CARTS</Text>
          </Pressable>
        </View>

        {/* Integrated Handheld Controller Chassis */}
        <View style={styles.controllerDeck}>
          {/* Chassis Top Accent Strip with Speaker Grilles & Badge */}
          <View style={styles.chassisHeader}>
            <View style={styles.speakerGrille}>
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
            </View>
            <View style={styles.chassisBadgeContainer}>
              <View style={[styles.statusLed, { backgroundColor: palette.bezelAccent }]} />
              <Text style={[styles.chassisBadgeText, { color: `${palette.bezelAccent}CC` }]}>
                ARCADE CONTROLLER DECK
              </Text>
            </View>
            <View style={styles.speakerGrille}>
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
              <View style={styles.speakerSlot} />
            </View>
          </View>

          {/* Keypad Controls Area */}
          <View style={styles.keypadContainer}>
            <RetroKeypad
              labels={activeCart.gamepadLabels}
              accentColor={palette.bezelAccent}
              onButtonChange={handleButtonChange}
            />
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
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0E1520',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  toolText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
