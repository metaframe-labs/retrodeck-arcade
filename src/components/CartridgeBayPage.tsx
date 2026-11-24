import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArcadeCartridgeDef } from '../arcade/types';
import { getAccentInk } from '../theme/palettes';

const FAV_CARTS_STORAGE_KEY = '@retrodeck8_fav_carts_v1';

interface CartridgeBayPageProps {
  cartridges: ArcadeCartridgeDef[];
  activeCartridgeId: string;
  accentColor: string;
  highScores?: Record<string, number>;
  onSelectCartridge: (cartridge: ArcadeCartridgeDef) => void;
  onOpenDevCart?: () => void;
  onBack: () => void;
}

type FilterCategory = 'ALL' | 'FAVS' | 'NOKIA' | 'ARCADE';

interface CartridgeCardProps {
  cart: ArcadeCartridgeDef;
  isInserted: boolean;
  isFav: boolean;
  accentColor: string;
  accentInk: string;
  bestScore: number;
  onSelect: (cartridge: ArcadeCartridgeDef) => void;
  onToggleFav: (id: string) => void;
}

const CartridgeCard = React.memo<CartridgeCardProps>(
  ({ cart, isInserted, isFav, accentColor, accentInk, bestScore, onSelect, onToggleFav }) => (
    <Pressable
      onPress={() => onSelect(cart)}
      style={[
        styles.cartCard,
        isInserted && {
          borderColor: accentColor,
          backgroundColor: `${accentColor}12`,
        },
      ]}
    >
      {/* Cartridge Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.cartIndicator,
              { backgroundColor: isInserted ? accentColor : '#334155' },
            ]}
          />
          <Text style={styles.cartTitle}>{cart.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.genreTag, { borderColor: `${accentColor}44` }]}>
            <Text style={[styles.genreTagText, { color: accentColor }]}>{cart.genre}</Text>
          </View>
          <Text style={styles.yearText}>{cart.year}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => onToggleFav(cart.id)}
            style={styles.favBtn}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={15}
              color={isFav ? '#FBBF24' : '#64748B'}
            />
          </Pressable>
        </View>
      </View>

      {/* Subtitle / Description */}
      <Text style={styles.cardSubtitle}>{cart.subtitle}</Text>

      {/* Controls Hint */}
      <View style={styles.hintWrap}>
        <Ionicons name="game-controller-outline" size={13} color="#94A3B8" />
        <Text style={styles.hintText}>{cart.controlsHint}</Text>
      </View>

      {/* Card Footer Status */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeftBadges}>
          <View style={styles.techBadge}>
            <Ionicons name="flash" size={11} color="#10B981" />
            <Text style={styles.techText}>60 FPS</Text>
          </View>
          <View style={[styles.bestScorePill, { borderColor: `${accentColor}44` }]}>
            <Ionicons name="trophy-outline" size={10} color="#FFD700" />
            <Text style={styles.bestScoreText}>
              BEST: {bestScore.toString().padStart(6, '0')}
            </Text>
          </View>
        </View>

        {isInserted ? (
          <View style={[styles.activePill, { backgroundColor: accentColor }]}>
            <View style={[styles.activeDot, { backgroundColor: accentInk }]} />
            <Text style={[styles.activePillText, { color: accentInk }]}>
              INSERTED (ACTIVE)
            </Text>
          </View>
        ) : (
          <View style={styles.loadAction}>
            <Text style={[styles.loadActionText, { color: accentColor }]}>
              TAP TO LOAD
            </Text>
            <Ionicons name="arrow-forward" size={12} color={accentColor} />
          </View>
        )}
      </View>
    </Pressable>
  )
);

export const CartridgeBayPage: React.FC<CartridgeBayPageProps> = ({
  cartridges,
  activeCartridgeId,
  accentColor,
  highScores = {},
  onSelectCartridge,
  onOpenDevCart,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [favIds, setFavIds] = useState<string[]>([]);
  const accentInk = useMemo(() => getAccentInk(accentColor), [accentColor]);

  useEffect(() => {
    AsyncStorage.getItem(FAV_CARTS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFavIds(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const toggleFav = useCallback((id: string) => {
    setFavIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(FAV_CARTS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const nokiaCount = useMemo(
    () => cartridges.filter((c) => c.genre.includes('NOKIA')).length,
    [cartridges]
  );
  const arcadeCount = cartridges.length - nokiaCount;

  const filteredCartridges = useMemo(() => {
    if (filter === 'FAVS') return cartridges.filter((cart) => favSet.has(cart.id));
    if (filter === 'NOKIA') return cartridges.filter((cart) => cart.genre.includes('NOKIA'));
    if (filter === 'ARCADE') return cartridges.filter((cart) => !cart.genre.includes('NOKIA'));
    return cartridges;
  }, [cartridges, filter, favSet]);

  const renderItem: ListRenderItem<ArcadeCartridgeDef> = useCallback(
    ({ item }) => (
      <CartridgeCard
        cart={item}
        isInserted={item.id === activeCartridgeId}
        isFav={favSet.has(item.id)}
        accentColor={accentColor}
        accentInk={accentInk}
        bestScore={highScores[item.id] || 0}
        onSelect={onSelectCartridge}
        onToggleFav={toggleFav}
      />
    ),
    [activeCartridgeId, favSet, accentColor, accentInk, highScores, onSelectCartridge, toggleFav]
  );

  const keyExtractor = useCallback((item: ArcadeCartridgeDef) => item.id, []);

  const listHeader = useMemo(() => {
    if (!onOpenDevCart) return null;
    return (
      <Pressable
        onPress={onOpenDevCart}
        style={[styles.studioCard, { borderColor: accentColor }]}
      >
        <View style={styles.studioCardLeft}>
          <View style={[styles.studioIconWrap, { backgroundColor: `${accentColor}22` }]}>
            <Ionicons name="game-controller" size={24} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.studioTagRow}>
              <Text style={[styles.studioTitle, { color: accentColor }]}>
                CUSTOM GAME STUDIO
              </Text>
              <View style={styles.studioBadge}>
                <Text style={styles.studioBadgeText}>CREATOR</Text>
              </View>
            </View>
            <Text style={styles.studioSub}>
              Pick a template or build your own custom retro game and play instantly
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={accentColor} />
      </Pressable>
    );
  }, [accentColor, onOpenDevCart]);

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#F8FAFC" />
          <Text style={styles.backBtnText}>CONSOLE</Text>
        </Pressable>

        <View style={styles.titleCluster}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>
            RETRO ARCADE // 60 FPS
          </Text>
          <Text style={styles.title}>Cartridge Vault</Text>
        </View>

        <View style={[styles.countBadge, { borderColor: `${accentColor}55` }]}>
          <Text style={[styles.countText, { color: accentColor }]}>
            {cartridges.length} CARTS
          </Text>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {(['ALL', 'FAVS', 'NOKIA', 'ARCADE'] as FilterCategory[]).map((cat) => {
            const isSelected = filter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setFilter(cat)}
                style={[
                  styles.filterChip,
                  isSelected && {
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}18`,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, isSelected && { color: accentColor }]}>
                  {cat === 'ALL'
                    ? `ALL (${cartridges.length})`
                    : cat === 'FAVS'
                    ? `★ FAVS (${favIds.length})`
                    : cat === 'NOKIA'
                    ? `NOKIA (${nokiaCount})`
                    : `ARCADE (${arcadeCount})`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Virtualized Cartridge Shelf (60 FPS smooth even with 100+ cartridges) */}
      <FlatList
        data={filteredCartridges}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader || undefined}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="star-outline" size={28} color="#64748B" />
            <Text style={styles.emptyTitle}>NO FAVORITE GAMES YET</Text>
            <Text style={styles.emptySub}>
              Tap the ★ icon on any cartridge to save it here.
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 20) + 16 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#04070C',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162232',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#121D2C',
    borderWidth: 1,
    borderColor: '#243447',
  },
  backBtnText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  titleCluster: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#0E1724',
  },
  countText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  filterWrap: {
    height: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#121D2C',
    backgroundColor: '#060B12',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1D2D40',
    backgroundColor: '#0D1522',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 13,
    includeFontPadding: false,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  list: {
    padding: 16,
    gap: 14,
  },
  studioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#0B1422',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  studioCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  studioIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  studioTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  studioBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 255, 170, 0.15)',
    borderWidth: 0.8,
    borderColor: '#00FFAA',
  },
  studioBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#00FFAA',
    fontFamily: 'monospace',
  },
  studioSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  cartCard: {
    backgroundColor: '#0A111D',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#182436',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  cartIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cartTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genreTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#121E2E',
    borderWidth: 0.8,
  },
  genreTagText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  yearText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cardSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#060B12',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#162232',
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#142030',
  },
  footerLeftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bestScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.8,
    backgroundColor: '#0F172A',
  },
  bestScoreText: {
    color: '#E2E8F0',
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  techBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  techText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#000000',
  },
  activePillText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  loadAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadActionText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  favBtn: {
    padding: 3,
    marginLeft: 2,
  },
  emptyWrap: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
