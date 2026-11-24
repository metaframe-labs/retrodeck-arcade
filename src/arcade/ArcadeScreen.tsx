import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArcadeGameInstance, ArcadeStats } from './types';
import { RetroPalette } from '../theme/palettes';
import { useTranslation } from '../i18n/retroI18n';

interface ArcadeScreenProps {
  game: ArcadeGameInstance;
  stats: ArcadeStats;
  palette: RetroPalette;
  scanlines: boolean;
  isPaused: boolean;
  isBeeping: boolean;
  cartridgeTitle: string;
  isOsMode?: boolean;
  cartCount?: number;
  onRestartGame?: () => void;
  onReturnToOS?: () => void;
  gameOverMenuSelection?: number; // 0: RESTART, 1: OS DESKTOP
  cartridgeReady?: boolean;
  onStartCartridge?: () => void;
}

export const ArcadeScreen: React.FC<ArcadeScreenProps> = ({
  game,
  stats,
  palette,
  scanlines,
  isPaused,
  isBeeping,
  cartridgeTitle,
  isOsMode = false,
  cartCount = 100,
  onRestartGame,
  onReturnToOS,
  gameOverMenuSelection = 0,
  cartridgeReady = false,
  onStartCartridge,
}) => {
  const { tUi } = useTranslation();
  const [size, setSize] = useState({ w: 320, h: 240 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      // 4:3 Aspect Ratio (Retro Arcade Standard)
      setSize({ w: width, h: Math.round(width * 0.75) });
    }
  };

  const scanlineCount = 48;
  const scanlineRows = useMemo(() => {
    if (!scanlines) return null;
    const lines: React.ReactNode[] = [];
    const step = size.h / scanlineCount;
    for (let i = 0; i < scanlineCount; i++) {
      lines.push(
        <View
          key={i}
          style={[
            styles.scanline,
            {
              top: i * step,
              height: Math.max(1, step * 0.28),
              backgroundColor: palette.scanlineColor,
            },
          ]}
        />
      );
    }
    return lines;
  }, [scanlines, size.h, palette.scanlineColor]);

  return (
    <View
      style={[
        styles.bezel,
        {
          backgroundColor: palette.bezelBg,
          borderColor: `${palette.bezelAccent}55`,
        },
      ]}
    >
      {/* Top Bezel Status Strip */}
      <View style={styles.bezelHeader}>
        <View style={styles.ledRow}>
          <View
            style={[
              styles.ledDot,
              {
                backgroundColor: isPaused ? '#FF9F0A' : (palette.ledColor || palette.bezelAccent),
                shadowColor: isPaused ? '#FF9F0A' : (palette.ledColor || palette.bezelAccent),
              },
            ]}
          />
          <Text style={styles.bezelLabel} numberOfLines={1} ellipsizeMode="tail">
            {cartridgeTitle}
          </Text>
        </View>

        <View style={styles.hudStats}>
          {isBeeping && (
            <View style={[styles.beepPill, { borderColor: palette.bezelAccent }]}>
              <Text style={[styles.beepText, { color: palette.bezelAccent }]}>FX</Text>
            </View>
          )}

          {isOsMode ? (
            <View style={styles.statBadgePill}>
              <Text style={[styles.statLevelText, { color: palette.bezelAccent }]}>
                {cartCount} ROMS
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statBadgePill}>
                <Text style={[styles.statLevelText, { color: palette.bezelAccent }]}>
                  LVL {stats.level}
                </Text>
              </View>

              <View
                style={[
                  styles.statBadgePill,
                  palette.isLightLcd && {
                    backgroundColor: 'rgba(23, 38, 22, 0.12)',
                    borderColor: `${palette.bezelAccent}55`,
                  },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={12}
                  color={
                    palette.isLightLcd || palette.id === 'thinkpad' || palette.id === 'oled'
                      ? palette.bezelAccent
                      : '#FF2A6D'
                  }
                />
                <Text
                  style={[
                    styles.statLivesText,
                    (palette.isLightLcd || palette.id === 'thinkpad' || palette.id === 'oled') && {
                      color: palette.bezelAccent,
                    },
                  ]}
                >
                  {stats.lives}
                </Text>
              </View>

              <View
                style={[
                  styles.scorePillWrap,
                  {
                    borderColor: `${palette.bezelAccent}55`,
                    backgroundColor: 'rgba(5, 10, 18, 0.7)',
                  },
                ]}
              >
                <Text style={[styles.scoreLabelTag, { color: palette.bezelAccent }]}>
                  {tUi('pts')}
                </Text>
                <Text
                  style={[
                    styles.scoreBadge,
                    {
                      color: palette.isLightLcd ? palette.bezelAccent : palette.pixelOn,
                      textShadowColor: palette.isLightLcd ? undefined : palette.pixelGlow,
                    },
                  ]}
                >
                  {stats.score.toString().padStart(6, '0')}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 4:3 Arcade Viewport */}
      <View
        onLayout={handleLayout}
        style={[
          styles.screen,
          {
            height: size.h,
            backgroundColor: palette.screenBg,
            borderColor: `${palette.bezelAccent}33`,
          },
        ]}
      >
        {/* Render Live Game Entities */}
        {game.renderEntities(palette)}

        {/* Main Menu / Title Screen Overlay (Unified across all 100 carts) */}
        {!isOsMode && !isPaused && !stats.gameOver && (stats.isMenu || cartridgeReady) && (
          <View
            style={[
              styles.titleOverlay,
              {
                backgroundColor: palette.isLightLcd
                  ? `${palette.screenBg}F0`
                  : 'rgba(2, 6, 12, 0.84)',
              },
            ]}
          >
            <View
              style={[
                styles.titleBadge,
                {
                  borderColor: palette.isLightLcd ? palette.pixelOn : `${palette.bezelAccent}66`,
                  backgroundColor: palette.isLightLcd ? palette.screenBg : 'rgba(5, 10, 18, 0.92)',
                },
              ]}
            >
              <Text
                style={[
                  styles.titleEyebrow,
                  {
                    color: palette.isLightLcd ? palette.pixelOn : palette.bezelAccent,
                  },
                ]}
              >
                {tUi('cartReady')}
              </Text>
              <Text
                style={[
                  styles.titleGameName,
                  { color: palette.isLightLcd ? palette.pixelOn : '#FFFFFF' },
                ]}
                numberOfLines={1}
              >
                {cartridgeTitle}
              </Text>
            </View>

            <View style={styles.titleActionWrap}>
              <Pressable
                onPress={onStartCartridge}
                style={[
                  styles.startPill,
                  {
                    backgroundColor: palette.pixelOn,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.startPillText,
                    {
                      color: palette.isLightLcd ? palette.screenBg : '#000000',
                    },
                  ]}
                >
                  {tUi('pressAStart')}
                </Text>
              </Pressable>
              {stats.subMessage && (
                <Text
                  style={[
                    styles.titleSubMessage,
                    {
                      color: palette.isLightLcd ? palette.pixelOn : palette.textMuted,
                    },
                  ]}
                >
                  {stats.subMessage}
                </Text>
              )}
            </View>

            <View style={styles.titleHighScoreWrap}>
              <Text
                style={[
                  styles.titleHighScore,
                  {
                    color: palette.isLightLcd ? palette.pixelOn : palette.bezelAccent,
                  },
                ]}
              >
                {tUi('highScoreBanner', { score: stats.highScore.toString().padStart(6, '0') })}
              </Text>
            </View>
          </View>
        )}

        {/* Scanlines Filter */}
        {scanlineRows}

        {/* Pause Overlay */}
        {isPaused && (
          <View
            style={[
              styles.overlay,
              palette.isLightLcd && {
                backgroundColor: `${palette.screenBg}F0`,
              },
            ]}
          >
            <Text style={[styles.overlayTitle, { color: palette.pixelOn }]}>
              {tUi('paused')}
            </Text>
            <Text
              style={[
                styles.overlaySub,
                palette.isLightLcd && { color: palette.textMuted },
              ]}
            >
              {tUi('touchResume')}
            </Text>
          </View>
        )}

        {/* Game Over / Victory Overlay */}
        {(stats.gameOver || stats.message?.includes('VICTORY')) && stats.message && !isPaused && (
          <View
            style={[
              styles.overlay,
              palette.isLightLcd && {
                backgroundColor: `${palette.screenBg}F0`,
              },
            ]}
          >
            <View
              style={[
                styles.nokiaGameOverFrame,
                palette.isLightLcd && {
                  borderColor: palette.pixelOn,
                  backgroundColor: palette.screenBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.overlayTitle,
                  {
                    color: palette.isLightLcd
                      ? palette.pixelOn
                      : stats.message.includes('OVER')
                      ? '#FF0055'
                      : '#FFD700',
                  },
                ]}
              >
                {stats.message}
              </Text>
              {stats.subMessage && (
                <Text
                  style={[
                    styles.overlaySub,
                    palette.isLightLcd && { color: palette.pixelOn },
                  ]}
                >
                  {stats.subMessage}
                </Text>
              )}
              <View
                style={[
                  styles.gameOverScorePill,
                  palette.isLightLcd && {
                    backgroundColor: `${palette.pixelOn}18`,
                    borderColor: palette.pixelOn,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.overlayFinalScoreLabel,
                    palette.isLightLcd && { color: palette.textMuted },
                  ]}
                >
                  {tUi('finalScore')}
                </Text>
                <Text
                  style={[
                    styles.overlayFinalScoreValue,
                    {
                      color: palette.pixelOn,
                    },
                  ]}
                >
                  {stats.score.toString().padStart(6, '0')}
                </Text>
                {stats.highScore > 0 && (
                  <Text
                    style={[
                      styles.overlayHighScoreLabel,
                      palette.isLightLcd && { color: palette.pixelOn },
                    ]}
                  >
                    ★ {tUi('bestScore', { score: stats.highScore.toString().padStart(6, '0') })} ★
                  </Text>
                )}
              </View>

              {/* Game Over Navigation Menu: [A] RESTART or [B] OS MENU */}
              {!isOsMode && (
                <View style={styles.gameOverActionRow}>
                  <Pressable
                    onPress={onRestartGame}
                    style={[
                      styles.gameOverActionBtn,
                      gameOverMenuSelection === 0
                        ? {
                            backgroundColor: palette.pixelOn,
                            borderColor: palette.pixelOn,
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: `${palette.pixelOn}55`,
                          },
                    ]}
                  >
                    <Ionicons
                      name="refresh"
                      size={12}
                      color={gameOverMenuSelection === 0 ? palette.screenBg : palette.pixelOn}
                    />
                    <Text
                      style={[
                        styles.gameOverActionText,
                        {
                          color: gameOverMenuSelection === 0 ? palette.screenBg : palette.pixelOn,
                        },
                      ]}
                    >
                      [A] {tUi('menuRestart')}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={onReturnToOS}
                    style={[
                      styles.gameOverActionBtn,
                      gameOverMenuSelection === 1
                        ? {
                            backgroundColor: palette.pixelOn,
                            borderColor: palette.pixelOn,
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: `${palette.pixelOn}55`,
                          },
                    ]}
                  >
                    <Ionicons
                      name="desktop-outline"
                      size={12}
                      color={gameOverMenuSelection === 1 ? palette.screenBg : palette.pixelOn}
                    />
                    <Text
                      style={[
                        styles.gameOverActionText,
                        {
                          color: gameOverMenuSelection === 1 ? palette.screenBg : palette.pixelOn,
                        },
                      ]}
                    >
                      [B] {tUi('menuExitOs')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom In-Game Hint if available */}
        {stats.subMessage && !stats.message && !stats.isMenu && !isPaused && (
          <View style={styles.bottomHintBar}>
            <Text style={[styles.bottomHintText, { color: palette.bezelAccent }]}>
              {stats.subMessage}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bezel: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    backgroundColor: '#090D14',
    borderWidth: 1.5,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  bezelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  ledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  ledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  bezelLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  hudStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  beepPill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  beepText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  statBadge: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  statBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statLevelText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  statHeartIcon: {
    color: '#94B07C',
    fontSize: 11,
    fontWeight: '900',
  },
  statLivesText: {
    color: '#94B07C',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  scorePillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  scoreLabelTag: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
    opacity: 0.85,
  },
  scoreBadge: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  screen: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 10,
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  titleBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(5, 10, 16, 0.85)',
  },
  titleEyebrow: {
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  titleGameName: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  titleActionWrap: {
    alignItems: 'center',
    gap: 8,
  },
  startPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  startPillText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  titleSubMessage: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    textAlign: 'center',
  },
  titleHighScoreWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  titleHighScore: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 6,
  },
  overlaySub: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  nokiaGameOverFrame: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    maxWidth: '90%',
  },
  gameOverScorePill: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  overlayFinalScoreLabel: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 2,
  },
  overlayFinalScoreValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  overlayHighScoreLabel: {
    color: '#FFD700',
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  overlayFinalScore: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  bottomHintBar: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  bottomHintText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  gameOverActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  gameOverActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  gameOverActionText: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});
