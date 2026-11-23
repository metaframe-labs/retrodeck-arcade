import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { DISPLAY_HEIGHT, DISPLAY_WIDTH, PixelRun } from '../core/Chip8CPU';
import { RetroPalette } from '../theme/palettes';

interface RetroDisplayProps {
  runs: PixelRun[];
  palette: RetroPalette;
  scanlines: boolean;
  isPaused: boolean;
  isBeeping: boolean;
  cartridgeTitle: string;
}

/**
 * Pure React Native <View> 64x32 Pixel Matrix Display.
 * Renders run-length encoded horizontal pixel spans for smooth 60FPS performance
 * without needing WebView or native canvas dependencies.
 */
export const RetroDisplay: React.FC<RetroDisplayProps> = ({
  runs,
  palette,
  scanlines,
  isPaused,
  isBeeping,
  cartridgeTitle,
}) => {
  const [size, setSize] = useState({ w: 320, h: 160 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setSize({ w: width, h: width / 2 });
    }
  };

  const pixelW = size.w / DISPLAY_WIDTH;
  const pixelH = size.h / DISPLAY_HEIGHT;
  const gap = pixelW >= 4.5 ? 0.5 : 0;

  const scanlineRows = useMemo(() => {
    if (!scanlines) return null;
    const lines: React.ReactNode[] = [];
    for (let i = 0; i < DISPLAY_HEIGHT; i++) {
      lines.push(
        <View
          key={i}
          style={[
            styles.scanline,
            {
              top: i * pixelH,
              height: Math.max(1, pixelH * 0.28),
              backgroundColor: palette.scanlineColor,
            },
          ]}
        />
      );
    }
    return lines;
  }, [scanlines, pixelH, palette.scanlineColor]);

  return (
    <View style={[styles.bezel, { borderColor: `${palette.bezelAccent}44` }]}>
      {/* Bezel Status Strip */}
      <View style={styles.bezelHeader}>
        <View style={styles.ledRow}>
          <View
            style={[
              styles.ledDot,
              {
                backgroundColor: isPaused ? '#FF9F0A' : palette.bezelAccent,
                shadowColor: isPaused ? '#FF9F0A' : palette.bezelAccent,
              },
            ]}
          />
          <Text style={styles.bezelLabel} numberOfLines={1}>
            {cartridgeTitle}
          </Text>
        </View>
        <View style={styles.ledRow}>
          {isBeeping && (
            <View style={[styles.beepPill, { borderColor: palette.bezelAccent }]}>
              <Text style={[styles.beepText, { color: palette.bezelAccent }]}>SND</Text>
            </View>
          )}
          <Text style={styles.resLabel}>64×32 CRT</Text>
        </View>
      </View>

      {/* 64x32 Pixel Matrix Viewport */}
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
        {runs.map((run) => {
          const left = Math.round(run.col * pixelW);
          const top = Math.round(run.row * pixelH);
          const width = Math.round((run.col + run.len) * pixelW) - left;
          const height = Math.round((run.row + 1) * pixelH) - top;
          return (
            <View
              key={`${run.row}_${run.col}`}
              style={{
                position: 'absolute',
                left,
                top,
                width: Math.max(1, width - gap),
                height: Math.max(1, height - gap),
                backgroundColor: palette.pixelOn,
                borderRadius: palette.isLightLcd ? 0.5 : 1,
              }}
            />
          );
        })}

        {/* CRT Scanlines */}
        {scanlineRows}

        {/* Paused Overlay */}
        {isPaused && (
          <View style={styles.pauseOverlay}>
            <View style={[styles.pauseBadge, { borderColor: palette.bezelAccent }]}>
              <Text style={[styles.pauseText, { color: palette.bezelAccent }]}>
                CPU HALTED // PAUSED
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bezel: {
    backgroundColor: '#0B0F14',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  bezelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  ledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  bezelLabel: {
    color: '#D7E3F0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
  },
  resLabel: {
    color: '#5D6E82',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  beepPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  beepText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
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
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadge: {
    backgroundColor: 'rgba(8, 12, 18, 0.9)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pauseText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
  },
});
