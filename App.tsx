import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PALETTE_STORAGE_KEY = '@retrodeck8_palette_v1';
const SCANLINES_STORAGE_KEY = '@retrodeck8_scanlines_v1';

import { ArcadeButton, RetroKeypad } from './src/components/RetroKeypad';
import { RetroKeyboardDeck } from './src/components/RetroKeyboardDeck';
import { RetroNumericDeck } from './src/components/RetroNumericDeck';
import { ArcadeScreen } from './src/arcade/ArcadeScreen';
import { CartridgeBayPage } from './src/components/CartridgeBayPage';
import { DevCartModal } from './src/components/DevCartModal';
import { ThemePickerModal } from './src/components/ThemePickerModal';
import { ARCADE_CARTRIDGES, isCartridgeProLocked } from './src/arcade/cartridges';
import {
  ArcadeCartridgeDef,
  ArcadeGameInstance,
  ArcadeInput,
  ArcadeSound,
  ArcadeStats,
} from './src/arcade/types';
import {
  FREE_PALETTE_ORDER,
  PALETTE_ORDER,
  RETRO_PALETTES,
  RetroPalette,
  RetroPaletteId,
  getAccentInk,
  isLightBackground,
  isPaletteProLocked,
} from './src/theme/palettes';
import { RetroAudioEngine } from './src/audio/RetroAudioEngine';
import { HighScoreService } from './src/arcade/HighScoreService';
import { RetroDeckOS } from './src/os/RetroDeckOS';
import { revenueCatService, SubscriptionStatus } from './src/services/revenueCatService';
import { simNotificationService } from './src/services/simNotificationService';
import { useTranslation } from './src/i18n/retroI18n';

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
  const { lang, tUi } = useTranslation();
  const osGamepadLabels = {
    ...OS_GAMEPAD_LABELS,
    a: tUi('btnOk'),
    b: tUi('numBack'),
    aLabel: `A (${tUi('btnOk')})`,
    bLabel: `B (${tUi('numBack')})`,
  };
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
  const [tempPaletteOverride, setTempPaletteOverride] = useState<RetroPalette | null>(null);
  const tempPaletteRef = useRef<RetroPalette | null>(null);
  tempPaletteRef.current = tempPaletteOverride;
  const [scanlines, setScanlines] = useState(false);
  const [isPro, setIsPro] = useState(() => revenueCatService.getStatus().isPro);
  const isProRef = useRef(isPro);
  isProRef.current = isPro;
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => RetroAudioEngine.getMuted());
  const [isBeeping, setIsBeeping] = useState(false);
  const [deckMode, setDeckMode] = useState<'pad' | 'num' | 'kbd'>('pad');
  const [, setKbdTick] = useState(0);
  const [bayVisible, setBayVisible] = useState(false);
  const [devCartVisible, setDevCartVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = bayVisible || devCartVisible || themeModalVisible;
  const appActiveRef = useRef(AppState.currentState === 'active');
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [gameOverMenuSelection, setGameOverMenuSelection] = useState<number>(0);
  const gameOverMenuSelectionRef = useRef<number>(0);
  gameOverMenuSelectionRef.current = gameOverMenuSelection;
  const [cartridgeReady, setCartridgeReady] = useState<boolean>(true);
  const [j2meJarPath, setJ2meJarPath] = useState<string | undefined>(undefined);
  const j2meKeyboardValueRef = useRef('');
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

  const palette = tempPaletteOverride || RETRO_PALETTES[paletteId];

  useEffect(() => {
    osRef.current.lang = lang;
  }, [lang]);

  useEffect(() => {
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
    };
    osRef.current.setNumericDeckActive?.(deckMode === 'num');
  }, [deckMode]);

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
    revenueCatService.initialize().then(() => {
      revenueCatService.getPackages().catch(() => {});
    }).catch(() => {});
    const unsubscribeRC = revenueCatService.subscribe((status: SubscriptionStatus) => {
      setIsPro(status.isPro);
    });

    const unsubscribeHS = HighScoreService.subscribe((scores) => {
      console.log('HIGH_SCORES_UPDATED:', JSON.stringify(scores));
      setHighScores(scores);
      const hs = scores[activeCart.id] || 0;
      if (hs > 0) {
        osRef.current.recordMajorSimEvent?.('HIGH_SCORE', `${activeCart.title}: ${hs} PTS`);
      }
      if (hs > 0 && gameRef.current.setHighScore) {
        gameRef.current.setHighScore(hs);
        setStats(gameRef.current.getStats());
      }
    });

    let inBackground = AppState.currentState !== 'active';
    appActiveRef.current = !inBackground;
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if ((nextState === 'background' || nextState === 'inactive') && !inBackground) {
        inBackground = true;
        appActiveRef.current = false;
        osRef.current.onAppBackgrounded?.();
      } else if (nextState === 'active' && inBackground) {
        inBackground = false;
        appActiveRef.current = true;
        osRef.current.onAppForegrounded?.();
      }
    });

    const unsubscribeNotifTap = simNotificationService.subscribeToNotificationTaps((queueId) => {
      setBayVisible(false);
      setDevCartVisible(false);
      setThemeModalVisible(false);
      setIsPaused(false);
      setOsMode(true);
      osRef.current.openFromSimNotificationTap?.(queueId);
    });

    return () => {
      unsubscribeRC();
      unsubscribeHS();
      appStateSub.remove();
      unsubscribeNotifTap();
    };
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

      // Keep post-format 45s Windows trial wall-clock timer synced even inside Arcade games & modals!
      if (!osMode || modalOpenRef.current || isPaused) {
        osRef.current.syncWinTrialTimer(Date.now(), appActiveRef.current);
      }

      if (modalOpenRef.current) {
        accumulator = 0;
      } else if (osMode) {
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
              gameOverMenuSelectionRef.current = 0;
              setGameOverMenuSelection(0);
              handleSoundEvent('hit');
            } else if ((input.right && !prev.right) || (input.down && !prev.down)) {
              gameOverMenuSelectionRef.current = 1;
              setGameOverMenuSelection(1);
              handleSoundEvent('hit');
            }

            // [A] / [OK] Button executes the highlighted option (0: Restart, 1: Exit OS)
            if (input.a && !prev.a) {
              if (gameOverMenuSelectionRef.current === 1) {
                handleGoHomeOS();
              } else {
                handleReset();
                handleSoundEvent('powerup');
              }
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

  // Route all controls to the embedded MIDlet while a JAR is open.
  const sendJ2meTap = useCallback((key: string) => {
    NativeModules.J2meModule?.sendKeyEvent(key, true);
    setTimeout(() => NativeModules.J2meModule?.sendKeyEvent(key, false), 55);
  }, []);

  // Handle Keypad input
  const handleButtonChange = useCallback((btn: ArcadeButton, pressed: boolean) => {
    if (j2meJarPath) {
      const { NativeModules } = require('react-native');
      NativeModules.J2meModule?.sendKeyEvent(btn, pressed);
      return;
    }
    if (
      !osMode &&
      btn === 'b' &&
      activeCart.gamepadLabels.b?.toUpperCase().includes('PAUSE')
    ) {
      if (pressed) setIsPaused((current) => !current);
      return;
    }
    inputRef.current[btn] = pressed;
  }, [activeCart.gamepadLabels.b, j2meJarPath, osMode]);

  const handleNumericSoftKey = useCallback((dir: 'left' | 'right') => {
    if (j2meJarPath) {
      setKbdTick((t) => (t + 1) % 100000);
      return;
    }
    if (osMode) {
      osRef.current.pressNavDir?.(dir);
    } else {
      handleButtonChange(dir, true);
      setTimeout(() => handleButtonChange(dir, false), 65);
    }
    setKbdTick((t) => (t + 1) % 100000);
  }, [handleButtonChange, j2meJarPath, osMode]);

  // Cartridge Swap (preserve user's active OS theme)
  const handleSelectCartridge = useCallback((cart: ArcadeCartridgeDef) => {
    if (isCartridgeProLocked(cart.id, isProRef.current)) {
      setBayVisible(false);
      osRef.current.openProScreen('PRO REQUIRED FOR THIS GAME!');
      setOsMode(true);
      setIsPaused(false);
      handleSoundEvent('die');
      return;
    }
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
    setDeckMode('pad');
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

  const handleOpenDevCart = useCallback(() => {
    if (!isProRef.current) {
      setBayVisible(false);
      osRef.current.openProScreen('DEV STUDIO REQUIRES PRO!');
      setOsMode(true);
      setIsPaused(false);
      handleSoundEvent('die');
      return;
    }
    setBayVisible(false);
    setDevCartVisible(true);
  }, [handleSoundEvent]);

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
    setDeckMode('pad');
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
    if (isPaletteProLocked(next, isProRef.current)) {
      setThemeModalVisible(false);
      osRef.current.openProScreen('PRO REQUIRED FOR THIS THEME!');
      setOsMode(true);
      setIsPaused(false);
      handleSoundEvent('die');
      return;
    }
    setTempPaletteOverride(null);
    osRef.current.clearPostFormatWinTheme?.();
    setPaletteId(next);
    AsyncStorage.setItem(PALETTE_STORAGE_KEY, next).catch(() => {});
    handleSoundEvent('score');
  }, [handleSoundEvent]);

  const handleCyclePalette = useCallback(() => {
    setTempPaletteOverride(null);
    osRef.current.clearPostFormatWinTheme?.();
    setPaletteId((prev) => {
      const pool = isProRef.current ? PALETTE_ORDER : FREE_PALETTE_ORDER;
      const idx = pool.indexOf(prev);
      const next = pool[(idx + 1) % pool.length];
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
      onLaunchJ2me: async () => {
        try {
          const { NativeModules, Alert } = require('react-native');
          if (!NativeModules.J2meModule) {
            Alert.alert('J2ME', 'J2meModule bulunamadi (APK eski olabilir)');
            return;
          }
          const pickedPath: string | null = await NativeModules.J2meModule.pickJarFile();
          if (pickedPath) {
            j2meKeyboardValueRef.current = '';
            setJ2meJarPath(pickedPath);
            setOsMode(false);
            setIsPaused(false);
            setDeckMode('pad');
          }
        } catch (e: any) {
          console.warn('J2ME pickJarFile error:', e);
        }
      },
      onOpenCartVault: () => setBayVisible(true),
      onCyclePalette: () => handleCyclePalette(),
      onSelectPalette: (id) => handleSelectPalette(id),
      onSetTemporaryPalette: (temp) => setTempPaletteOverride(temp),
      onWinTrialExpired: () => {
        setBayVisible(false);
        setDevCartVisible(false);
        setThemeModalVisible(false);
        setIsPaused(true);
        setOsMode(true);
        setDeckMode('pad');
      },
      getPaletteId: () => paletteIdRef.current,
      onToggleScanlines: () => handleToggleScanlines(),
      getPaletteName: () => tempPaletteRef.current?.name || RETRO_PALETTES[paletteIdRef.current].name,
      getScanlines: () => scanlinesRef.current,
      onRequestKeyboard: (open) => {
        inputRef.current = {
          up: false,
          down: false,
          left: false,
          right: false,
          a: false,
          b: false,
        };
        setDeckMode(open ? 'kbd' : 'pad');
      },
      onPlaySound: (s) => handleSoundEvent(s),
      getIsPro: () => isProRef.current,
      onOpenPaywall: () => {
        revenueCatService.presentPaywall();
      },
      onOpenCustomerCenter: () => {
        revenueCatService.presentCustomerCenter();
      },
      onPurchasePackage: (type) => revenueCatService.purchasePackageByType(type),
      onRestorePurchases: async () => {
        const status = await revenueCatService.restorePurchases();
        return status.isPro;
      },
      onResetProDebug: async () => {
        await revenueCatService.resetProDebug();
      },
      getProPackages: () => revenueCatService.getCachedPackages(),
      getProExpirationDate: () => revenueCatService.getStatus().expirationDate,
    })
  );

  const kbdBinding = osRef.current.getKeyboardBinding();

  const handleGoHomeOS = () => {
    if (j2meJarPath) {
      NativeModules.J2meModule?.stopGame();
      setJ2meJarPath(undefined);
    }
    osRef.current.goDesktop();
    gameOverMenuSelectionRef.current = 0;
    setGameOverMenuSelection(0);
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
    gameOverMenuSelectionRef.current = 0;
    setGameOverMenuSelection(0);
    setIsPaused(false);
  };

  const handleToggleMute = useCallback(() => {
    const next = !RetroAudioEngine.getMuted();
    RetroAudioEngine.setMuted(next);
    setIsMuted(next);
  }, []);

  const handleSelectPress = useCallback(() => {
    if (j2meJarPath) {
      sendJ2meTap('softleft');
      handleSoundEvent('hit');
      return;
    }
    if (osRef.current.postFormatWinActivationScreen) {
      osRef.current.dismissWinActivation();
      return;
    }
    if (osMode) {
      setDeckMode((m) => (m === 'pad' ? 'num' : m === 'num' ? 'kbd' : 'pad'));
      handleSoundEvent('hit');
    } else {
      setBayVisible(true);
      handleSoundEvent('hit');
    }
  }, [j2meJarPath, sendJ2meTap, osMode, handleSoundEvent]);

  const handleStartPress = useCallback(() => {
    if (j2meJarPath) {
      sendJ2meTap('softright');
      return;
    }
    if (osRef.current.postFormatWinActivationScreen) {
      osRef.current.dismissWinActivation();
      return;
    }
    if (osMode) {
      handleButtonChange('a', true);
      setTimeout(() => handleButtonChange('a', false), 65);
      handleSoundEvent('hit');
      return;
    }
    if (cartridgeReadyRef.current) {
      cartridgeReadyRef.current = false;
      setCartridgeReady(false);
      handleSoundEvent('hit');
      if (gameRef.current.getStats().isMenu) {
        gameRef.current.update({ ...inputRef.current, a: true }, 1 / 60);
      }
      return;
    }
    const curStats = gameRef.current.getStats();
    if (curStats.gameOver) {
      if (gameOverMenuSelectionRef.current === 1) {
        handleGoHomeOS();
      } else {
        handleReset();
        handleSoundEvent('powerup');
      }
      return;
    }
    if (curStats.isMenu) {
      handleButtonChange('a', true);
      setTimeout(() => handleButtonChange('a', false), 65);
      return;
    }
    setIsPaused((p) => !p);
    handleSoundEvent('hit');
  }, [j2meJarPath, sendJ2meTap, osMode, handleButtonChange, handleSoundEvent]);

  const handleHomePress = useCallback(() => {
    if (j2meJarPath) {
      NativeModules.J2meModule?.stopGame();
      setJ2meJarPath(undefined);
      osRef.current.goDesktop();
      setOsMode(true);
      setIsPaused(false);
      handleSoundEvent('hit');
      return;
    }
    if (osRef.current.postFormatWinActivationScreen) {
      osRef.current.dismissWinActivation();
      return;
    }
    if (osMode) {
      setOsMode(false);
      setIsPaused(false);
      handleSoundEvent('powerup');
    } else {
      osRef.current.goDesktop();
      setOsMode(true);
      setIsPaused(false);
      handleSoundEvent('hit');
    }
  }, [j2meJarPath, osMode, handleSoundEvent]);

  const isLightChassis = isLightBackground(palette.chassisBg);
  const isLightDeck = isLightBackground(palette.deckBg);
  const chassisTextColor = isLightChassis ? '#0F172A' : '#F8FAFC';
  const chassisMutedColor = isLightChassis ? '#475569' : '#64748B';
  const toolTextColor = isLightChassis ? '#1E293B' : '#CBD5E1';

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
      <StatusBar style={isLightChassis ? "dark" : "light"} />
      <View style={styles.mainContainer}>
        {/* Top Hardware Console Header */}
        <View style={styles.topBar}>
          <View style={styles.brandCluster}>
            <Text style={[styles.brandTag, { color: palette.bezelAccent }]}>
              METAFRAME // {palette.name}
            </Text>
            <Text style={[styles.brandTitle, { color: chassisTextColor }]}>RETRODECK OS</Text>
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
              <View
                style={[
                  styles.paletteDot,
                  {
                    backgroundColor: palette.screenBg,
                    borderColor: palette.bezelAccent,
                  },
                ]}
              >
                <View style={[styles.paletteDotCore, { backgroundColor: palette.pixelOn }]} />
              </View>
            </Pressable>

            <Pressable
              onPress={handleOpenDevCart}
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
                {tUi('carts')}
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
          cartridgeTitle={j2meJarPath ? 'J2ME GAME' : osMode ? osRef.current.getCurrentTitle() : activeCart.title}
          isOsMode={osMode}
          cartCount={ARCADE_CARTRIDGES.length}
          onRestartGame={handleReset}
          onReturnToOS={handleGoHomeOS}
          gameOverMenuSelection={gameOverMenuSelection}
          cartridgeReady={cartridgeReady}
          j2meJarPath={j2meJarPath}
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
          <Text style={[styles.hintText, { color: chassisMutedColor }]} numberOfLines={1}>
            {j2meJarPath
              ? 'D-PAD: MOVE • A: ACTION • B: BACK • NUM: KEYPAD'
              : osMode
              ? osRef.current.getControlsHint()
              : activeCart.controlsHint}
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
              color={osMode ? palette.bezelAccent : toolTextColor}
            />
            <Text style={[styles.toolText, { color: osMode ? palette.bezelAccent : toolTextColor }]}>
              {tUi('osBtn')}
            </Text>
          </Pressable>

          {osMode || j2meJarPath ? (
            <Pressable
              onPress={() => {
                setDeckMode((m) => (m === 'pad' ? 'num' : m === 'num' ? 'kbd' : 'pad'));
                handleSoundEvent('hit');
              }}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: palette.surfaceBg,
                  borderColor: palette.surfaceBorder,
                },
                deckMode !== 'pad' && {
                  borderColor: palette.bezelAccent,
                  backgroundColor: `${palette.bezelAccent}22`,
                },
              ]}
            >
              <Ionicons
                name={
                  deckMode === 'pad'
                    ? 'apps-outline'
                    : deckMode === 'num'
                    ? 'keypad-outline'
                    : 'game-controller-outline'
                }
                size={14}
                color={deckMode !== 'pad' ? palette.bezelAccent : toolTextColor}
              />
              <Text style={[styles.toolText, { color: deckMode !== 'pad' ? palette.bezelAccent : toolTextColor }]}>
                {deckMode === 'pad' ? 'NUM' : deckMode === 'num' ? tUi('numKbd') : tUi('kbdPad')}
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
                color={isPaused ? '#FF9F0A' : toolTextColor}
              />
              <Text style={[styles.toolText, { color: isPaused ? '#FF9F0A' : toolTextColor }]}>
                {isPaused ? tUi('resume') : tUi('pause')}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              if (j2meJarPath) {
                const nextPaused = !isPaused;
                setIsPaused(nextPaused);
                NativeModules.J2meModule?.setPaused(nextPaused);
                handleSoundEvent('hit');
              } else {
                handleReset();
              }
            }}
            style={[
              styles.toolBtn,
              {
                backgroundColor: palette.surfaceBg,
                borderColor: palette.surfaceBorder,
              },
            ]}
          >
            <Ionicons
              name={j2meJarPath ? (isPaused ? 'play' : 'pause') : 'refresh'}
              size={14}
              color={j2meJarPath && isPaused ? '#FF9F0A' : toolTextColor}
            />
            <Text style={[styles.toolText, { color: j2meJarPath && isPaused ? '#FF9F0A' : toolTextColor }]}>
              {j2meJarPath ? (isPaused ? tUi('resume') : tUi('pause')) : osMode ? tUi('reboot') : tUi('reset')}
            </Text>
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
              color={scanlines ? palette.bezelAccent : toolTextColor}
            />
            <Text style={[styles.toolText, { color: scanlines ? palette.bezelAccent : toolTextColor }]}>
              {tUi('crt')}
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
            <Text style={[styles.toolText, { color: palette.bezelAccent }]}>{tUi('carts')}</Text>
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
                setDeckMode((m) => (m === 'pad' ? 'num' : m === 'num' ? 'kbd' : 'pad'));
                handleSoundEvent('hit');
              }}
              style={styles.chassisBadgeContainer}
            >
              <View
                style={[
                  styles.statusLed,
                  { backgroundColor: palette.ledColor || palette.bezelAccent },
                ]}
              />
              <Text style={[styles.chassisBadgeText, { color: isLightDeck ? '#334155' : `${palette.bezelAccent}CC` }]}>
                {deckMode === 'kbd'
                  ? tUi('deckKbd')
                  : deckMode === 'num'
                  ? tUi('deckNum')
                  : tUi('deckPad')}
              </Text>
            </Pressable>
            <View style={styles.speakerGrille}>
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
              <View style={[styles.speakerSlot, { backgroundColor: palette.surfaceBorder }]} />
            </View>
          </View>

          {/* Keypad, Numeric 3310 Pad, or QWERTY Keyboard Controls Area */}
          <View style={styles.keypadContainer}>
            {deckMode === 'kbd' ? (
              <RetroKeyboardDeck
                accentColor={palette.bezelAccent}
                accentTextColor={palette.pixelOn}
                buttonBg={palette.buttonBg}
                buttonBorder={palette.buttonBorder}
                value={j2meJarPath ? j2meKeyboardValueRef.current : kbdBinding.value}
                placeholder={kbdBinding.placeholder}
                targetLabel={kbdBinding.targetLabel}
                secure={kbdBinding.secure}
                onChangeText={(next) => {
                  if (j2meJarPath) {
                    const previousChars = Array.from(j2meKeyboardValueRef.current);
                    const nextChars = Array.from(next);
                    if (nextChars.length > previousChars.length) {
                      nextChars.slice(previousChars.length).forEach((ch) => NativeModules.J2meModule?.sendCharacter(ch));
                    } else if (nextChars.length < previousChars.length) {
                      for (let i = nextChars.length; i < previousChars.length; i++) sendJ2meTap('del');
                    }
                    j2meKeyboardValueRef.current = next;
                    setKbdTick((t) => (t + 1) % 100000);
                    return;
                  }
                  osRef.current.setKeyboardText(next);
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onSubmit={() => {
                  if (j2meJarPath) {
                    sendJ2meTap('a');
                    return;
                  }
                  osRef.current.submitKeyboard();
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onSwitchToGamepad={() => setDeckMode('pad')}
              />
            ) : deckMode === 'num' ? (
              <RetroNumericDeck
                accentColor={palette.keypadAccent || palette.bezelAccent}
                buttonBg={palette.buttonBg}
                buttonBorder={palette.buttonBorder}
                onControlChange={(key, pressed) => {
                  if (!j2meJarPath) return;
                  const mappedKey = key === 'OK'
                    ? 'a'
                    : key === 'BACK'
                    ? 'b'
                    : key === 'DEL'
                    ? 'del'
                    : key;
                  NativeModules.J2meModule?.sendKeyEvent(mappedKey, pressed);
                }}
                onPressKey={(k) => {
                  if (j2meJarPath) {
                    setKbdTick((t) => (t + 1) % 100000);
                    return;
                  }
                  osRef.current.pressNumericKey?.(k);
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onNav={(dir) => {
                  if (j2meJarPath) {
                    setKbdTick((t) => (t + 1) % 100000);
                    return;
                  }
                  osRef.current.pressNavDir?.(dir);
                  setKbdTick((t) => (t + 1) % 100000);
                }}
                onSoftLeft={() => handleNumericSoftKey('left')}
                onSoftRight={() => handleNumericSoftKey('right')}
                onSwitchMode={() => setDeckMode('kbd')}
              />
            ) : (
              <RetroKeypad
                labels={j2meJarPath ? osGamepadLabels : osMode ? osGamepadLabels : activeCart.gamepadLabels}
                accentColor={palette.keypadAccent || palette.bezelAccent}
                buttonBg={palette.buttonBg}
                buttonBorder={palette.buttonBorder}
                centerBg={palette.bezelBg}
                osMode={osMode}
                isPaused={j2meJarPath ? false : isPaused}
                isMuted={isMuted || RetroAudioEngine.getMuted()}
                onButtonChange={handleButtonChange}
                onSelectPress={handleSelectPress}
                onStartPress={handleStartPress}
                onHomePress={handleHomePress}
                onToggleMute={handleToggleMute}
              />
            )}
          </View>
        </View>
      </View>

      {/* Full-Page Cartridge Vault Modal (smooth slide transition, keeps console mounted) */}
      <Modal
        visible={bayVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setBayVisible(false)}
      >
        <View style={[styles.root, { backgroundColor: palette.chassisBg }]}>
          <CartridgeBayPage
            cartridges={ARCADE_CARTRIDGES}
            activeCartridgeId={activeCart.id}
            accentColor={palette.bezelAccent}
            palette={palette}
            highScores={highScores}
            isPro={isPro}
            onSelectCartridge={(cart) => {
              handleSelectCartridge(cart);
              setBayVisible(false);
            }}
            onOpenDevCart={handleOpenDevCart}
            onBack={() => setBayVisible(false)}
          />
        </View>
      </Modal>

      {/* In-App Dev Cart Compiler Modal */}
      <DevCartModal
        visible={devCartVisible}
        accentColor={palette.bezelAccent}
        palette={palette}
        onClose={() => setDevCartVisible(false)}
        onLoadCustomCartridge={handleBurnCustomCartridge}
      />

      {/* Visual Hardware & LCD Theme Studio Modal */}
      <ThemePickerModal
        visible={themeModalVisible}
        activePaletteId={paletteId}
        activePalette={palette}
        isPro={isPro}
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
    gap: 6,
    flexShrink: 0,
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  proBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
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
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteDotCore: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
    paddingTop: 8,
    paddingBottom: 10,
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
