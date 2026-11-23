import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PALETTE_ORDER,
  RETRO_PALETTES,
  RetroPalette,
  RetroPaletteId,
  RetroThemeCategory,
  getAccentInk,
} from '../theme/palettes';

interface ThemePickerModalProps {
  visible: boolean;
  activePaletteId: RetroPaletteId;
  activePalette: RetroPalette;
  onSelectPalette: (id: RetroPaletteId) => void;
  onCyclePalette: () => void;
  onClose: () => void;
}

const CATEGORIES: ('ALL' | RetroThemeCategory)[] = [
  'ALL',
  'HANDHELD',
  'CRT',
  'NEON',
  'STUDIO',
  'PAPER',
];

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  visible,
  activePaletteId,
  activePalette,
  onSelectPalette,
  onCyclePalette,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<'ALL' | RetroThemeCategory>('ALL');

  const items = useMemo(() => {
    const all = PALETTE_ORDER.map((id) => RETRO_PALETTES[id]);
    if (category === 'ALL') return all;
    return all.filter((p) => p.category === category);
  }, [category]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: activePalette.chassisBg,
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: activePalette.surfaceBorder }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.eyebrow, { color: activePalette.bezelAccent }]}>
              HARDWARE + LCD STUDIO
            </Text>
            <Text style={styles.title}>THEMES ({PALETTE_ORDER.length})</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={onCyclePalette}
              style={[
                styles.cycleBtn,
                {
                  backgroundColor: activePalette.surfaceBg,
                  borderColor: activePalette.bezelAccent,
                },
              ]}
            >
              <Ionicons name="shuffle-outline" size={14} color={activePalette.bezelAccent} />
              <Text style={[styles.cycleTxt, { color: activePalette.bezelAccent }]}>NEXT</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: activePalette.bezelAccent }]}
            >
              <Ionicons
                name="checkmark"
                size={16}
                color={getAccentInk(activePalette.bezelAccent)}
              />
              <Text
                style={[
                  styles.closeTxt,
                  { color: getAccentInk(activePalette.bezelAccent) },
                ]}
              >
                DONE
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          style={styles.catScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: active
                      ? activePalette.bezelAccent
                      : activePalette.surfaceBg,
                    borderColor: active
                      ? activePalette.bezelAccent
                      : activePalette.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catTxt,
                    {
                      color: active
                        ? getAccentInk(activePalette.bezelAccent)
                        : '#CBD5E1',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Theme Grid */}
        <ScrollView contentContainerStyle={styles.grid}>
          {items.map((theme) => {
            const isSelected = theme.id === activePaletteId;
            return (
              <Pressable
                key={theme.id}
                onPress={() => onSelectPalette(theme.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.deckBg,
                    borderColor: isSelected ? theme.bezelAccent : theme.surfaceBorder,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                {/* Mini Handheld Bezel Header */}
                <View style={styles.cardTop}>
                  <View style={styles.ledGroup}>
                    <View
                      style={[
                        styles.miniLed,
                        { backgroundColor: theme.bezelAccent },
                      ]}
                    />
                    <Text style={styles.catBadge}>{theme.category}</Text>
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.activeTag,
                        { backgroundColor: theme.bezelAccent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeTagTxt,
                          { color: getAccentInk(theme.bezelAccent) },
                        ]}
                      >
                        ACTIVE
                      </Text>
                    </View>
                  )}
                </View>

                {/* Live Mini LCD Screen Preview */}
                <View
                  style={[
                    styles.previewScreen,
                    {
                      backgroundColor: theme.screenBg,
                      borderColor: `${theme.bezelAccent}66`,
                    },
                  ]}
                >
                  <View style={styles.pixelSpriteRow}>
                    <View style={[styles.pxBlock, { backgroundColor: theme.pixelOn }]} />
                    <View style={[styles.pxBlockWide, { backgroundColor: theme.pixelOn }]} />
                    <View style={[styles.pxBlock, { backgroundColor: theme.pixelOn }]} />
                  </View>
                  <Text
                    style={[
                      styles.previewLcdTxt,
                      {
                        color: theme.pixelOn,
                        textShadowColor: theme.pixelGlow,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    84x48 OS
                  </Text>
                  <View style={styles.swatchBar}>
                    <View style={[styles.swatchChip, { backgroundColor: theme.chassisBg }]} />
                    <View style={[styles.swatchChip, { backgroundColor: theme.bezelAccent }]} />
                    <View style={[styles.swatchChip, { backgroundColor: theme.pixelOn }]} />
                  </View>
                </View>

                {/* Theme Name & Tagline */}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {theme.name}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {theme.tagline}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexShrink: 1,
    marginRight: 8,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  cycleTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  closeTxt: {
    color: '#06080A',
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  catScroll: {
    maxHeight: 46,
  },
  catRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  catPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  catTxt: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  grid: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '48.3%',
    borderRadius: 14,
    padding: 9,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ledGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catBadge: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  activeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  activeTagTxt: {
    color: '#050709',
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  previewScreen: {
    height: 54,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  pixelSpriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pxBlock: {
    width: 7,
    height: 7,
    borderRadius: 1,
  },
  pxBlockWide: {
    width: 24,
    height: 7,
    borderRadius: 1,
  },
  previewLcdTxt: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  swatchBar: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-end',
  },
  swatchChip: {
    width: 10,
    height: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.4,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontFamily: 'monospace',
    marginTop: 1,
  },
});
