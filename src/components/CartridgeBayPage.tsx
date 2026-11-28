import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
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
import { isCartridgeProLocked } from '../arcade/cartridges';
import type { SavedJ2meGame } from '../os/retroOsData';
import { RetroPalette, getAccentInk, isLightBackground } from '../theme/palettes';
import { tUi, useTranslation } from '../i18n/retroI18n';

const FAV_CARTS_STORAGE_KEY = '@retrodeck8_fav_carts_v1';

interface CartridgeBayPageProps {
  cartridges: ArcadeCartridgeDef[];
  jarGames?: SavedJ2meGame[];
  activeCartridgeId: string;
  accentColor: string;
  palette: RetroPalette;
  highScores?: Record<string, number>;
  isPro?: boolean;
  onSelectCartridge: (cartridge: ArcadeCartridgeDef) => void;
  onSelectJarGame?: (appPath: string) => void;
  onOpenDevCart?: () => void;
  onBack: () => void;
}

type FilterCategory = 'ALL' | 'JARS' | 'FAVS' | 'NOKIA' | 'ARCADE';

interface CartridgeCardProps {
  cart: ArcadeCartridgeDef;
  isInserted: boolean;
  isFav: boolean;
  isLocked: boolean;
  accentColor: string;
  accentFill: string;
  accentText: string;
  accentInk: string;
  palette: RetroPalette;
  cardInk: string;
  cardMutedInk: string;
  bestScore: number;
  onSelect: (cartridge: ArcadeCartridgeDef) => void;
  onToggleFav: (id: string) => void;
}

const CartridgeCard = React.memo<CartridgeCardProps>(
  ({ cart, isInserted, isFav, isLocked, accentColor, accentFill, accentText, accentInk, palette, cardInk, cardMutedInk, bestScore, onSelect, onToggleFav }) => (
    <Pressable
      onPress={() => onSelect(cart)}
      style={[
        styles.cartCard,
        {
          backgroundColor: palette.deckBg,
          borderColor: palette.surfaceBorder,
        },
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
              { backgroundColor: isInserted ? accentColor : palette.textMuted },
            ]}
          />
          <Text style={[styles.cartTitle, { color: cardInk }]}>{cart.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.genreTag, { backgroundColor: palette.buttonBg, borderColor: palette.buttonBorder }]}>
            <Text style={[styles.genreTagText, { color: accentText }]}>{cart.genre}</Text>
          </View>
          <Text style={[styles.yearText, { color: cardMutedInk }]}>{cart.year}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => onToggleFav(cart.id)}
            style={styles.favBtn}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={15}
              color={isFav ? (isLightBackground(palette.deckBg) ? '#B45309' : '#FBBF24') : cardMutedInk}
            />
          </Pressable>
        </View>
      </View>

      {/* Subtitle / Description */}
      <Text style={[styles.cardSubtitle, { color: cardInk }]}>{cart.subtitle}</Text>

      {/* Controls Hint */}
      <View style={[styles.hintWrap, { backgroundColor: palette.surfaceBg, borderColor: palette.surfaceBorder }]}>
        <Ionicons name="game-controller-outline" size={13} color={cardMutedInk} />
        <Text style={[styles.hintText, { color: cardMutedInk }]}>{cart.controlsHint}</Text>
      </View>

      {/* Card Footer Status */}
      <View style={[styles.cardFooter, { borderTopColor: palette.surfaceBorder }]}>
        <View style={styles.footerLeftBadges}>
          <View style={styles.techBadge}>
            <Ionicons name="flash" size={11} color={isLightBackground(palette.deckBg) ? '#047857' : '#10B981'} />
            <Text style={[styles.techText, isLightBackground(palette.deckBg) && { color: '#047857' }]}>60 FPS</Text>
          </View>
          <View style={[styles.bestScorePill, { backgroundColor: palette.buttonBg, borderColor: palette.buttonBorder }]}>
            <Ionicons name="trophy-outline" size={10} color={isLightBackground(palette.deckBg) ? '#9A6700' : '#FFD700'} />
            <Text style={[styles.bestScoreText, { color: cardInk }]}>
              {tUi('vaultBest', { score: bestScore.toString().padStart(6, '0') })}
            </Text>
          </View>
        </View>

        {isInserted ? (
          <View style={[styles.activePill, { backgroundColor: accentFill }]}>
            <View style={[styles.activeDot, { backgroundColor: accentInk }]} />
            <Text style={[styles.activePillText, { color: accentInk }]}>
              {tUi('vaultInserted')}
            </Text>
          </View>
        ) : isLocked ? (
          <View style={[styles.loadAction, { borderColor: '#F59E0B', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: isLightBackground(palette.deckBg) ? '#FEF3C7' : '#F59E0B18' }]}>
            <Text style={[styles.loadActionText, { color: isLightBackground(palette.deckBg) ? '#92400E' : '#F59E0B' }]}>
              {tUi('vaultProReq')}
            </Text>
          </View>
        ) : (
          <View style={styles.loadAction}>
            <Text style={[styles.loadActionText, { color: accentText }]}>
              {tUi('vaultTapLoad')}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={accentText} />
          </View>
        )}
      </View>
    </Pressable>
  )
);

export const CartridgeBayPage: React.FC<CartridgeBayPageProps> = ({
  cartridges,
  jarGames = [],
  activeCartridgeId,
  accentColor,
  palette,
  highScores = {},
  isPro = false,
  onSelectCartridge,
  onSelectJarGame,
  onOpenDevCart,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { lang, tUi: translateUi } = useTranslation();
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [favIds, setFavIds] = useState<string[]>([]);
  const cardInk = useMemo(
    () => (isLightBackground(palette.deckBg) ? '#1F2937' : '#F8FAFC'),
    [palette.deckBg]
  );
  const cardMutedInk = useMemo(
    () => (isLightBackground(palette.deckBg) ? '#526176' : '#A8B3C3'),
    [palette.deckBg]
  );
  const pageInk = isLightBackground(palette.chassisBg) ? '#1F2937' : '#F8FAFC';
  const pageMutedInk = isLightBackground(palette.chassisBg) ? '#526176' : '#A8B3C3';
  const accentText = isLightBackground(palette.surfaceBg) ? palette.pixelOn : accentColor;
  const accentFill = accentText;
  const accentInk = useMemo(() => getAccentInk(accentFill), [accentFill]);

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
    if (filter === 'JARS') return [];
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
        isLocked={isCartridgeProLocked(item.id, isPro)}
        accentColor={accentColor}
        accentFill={accentFill}
        accentText={accentText}
        accentInk={accentInk}
        palette={palette}
        cardInk={cardInk}
        cardMutedInk={cardMutedInk}
        bestScore={highScores[item.id] || 0}
        onSelect={onSelectCartridge}
        onToggleFav={toggleFav}
      />
    ),
    [activeCartridgeId, favSet, isPro, accentColor, accentFill, accentText, accentInk, palette, cardInk, cardMutedInk, highScores, onSelectCartridge, toggleFav]
  );

  const keyExtractor = useCallback((item: ArcadeCartridgeDef) => item.id, []);

  const listHeader = useMemo(() => {
    const showJars = jarGames.length > 0 && (filter === 'ALL' || filter === 'JARS') && onSelectJarGame;
    if (!onOpenDevCart && !showJars) return null;
    return (
      <View style={{ gap: 10 }}>
        {onOpenDevCart && (
          <Pressable
            onPress={onOpenDevCart}
            style={[styles.studioCard, { backgroundColor: palette.deckBg, borderColor: accentColor }]}
          >
            <View style={styles.studioCardLeft}>
              <View style={[styles.studioIconWrap, { backgroundColor: `${accentColor}22` }]}>
                <Ionicons name="game-controller" size={24} color={accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.studioTagRow}>
                  <Text style={[styles.studioTitle, { color: accentText }]}>
                    {translateUi('vaultStudioTitle')}
                  </Text>
                  <View style={[styles.studioBadge, isLightBackground(palette.deckBg) && { backgroundColor: '#D1FAE5', borderColor: '#059669' }]}>
                    <Text style={[styles.studioBadgeText, isLightBackground(palette.deckBg) && { color: '#047857' }]}>
                      {isPro ? translateUi('vaultStudioCreator') : translateUi('vaultStudioPro')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.studioSub, { color: cardMutedInk }]}>
                  {translateUi('vaultStudioSub')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={accentText} />
          </Pressable>
        )}

        {showJars && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: '900', color: accentText, letterSpacing: 1 }}>
              J2ME JAR ({jarGames.length})
            </Text>
            {jarGames.map((jar) => (
              <Pressable
                key={jar.appPath}
                onPress={() => onSelectJarGame(jar.appPath)}
                style={[
                  styles.cartCard,
                  {
                    backgroundColor: palette.deckBg,
                    borderColor: accentColor,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  },
                ]}
              >
                {jar.iconUri ? (
                  <Image source={{ uri: jar.iconUri }} style={{ width: 42, height: 42, borderRadius: 8 }} resizeMode="contain" />
                ) : (
                  <View style={[styles.studioIconWrap, { backgroundColor: `${accentColor}22` }]}>
                    <Ionicons name="phone-portrait-outline" size={22} color={accentText} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.cartTitle, { color: cardInk }]} numberOfLines={1}>
                      {jar.name}
                    </Text>
                    {jar.hasSave && (
                      <View style={[styles.genreTag, { backgroundColor: `${accentColor}22`, borderColor: accentColor }]}>
                        <Text style={[styles.genreTagText, { color: accentText }]}>SAVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardSubtitle, { color: cardMutedInk, marginBottom: 0 }]} numberOfLines={1}>
                    {(jar.vendor || 'J2ME')} • v{jar.version}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={24} color={accentText} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }, [accentColor, accentText, cardInk, cardMutedInk, filter, isPro, jarGames, onOpenDevCart, onSelectJarGame, palette.deckBg, translateUi]);

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 14) + 6, backgroundColor: palette.chassisBg }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { borderBottomColor: palette.surfaceBorder, backgroundColor: palette.deckBg }]}>
        <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: palette.buttonBg, borderColor: palette.buttonBorder }]}>
          <Ionicons name="arrow-back" size={18} color={pageInk} />
          <Text style={[styles.backBtnText, { color: pageInk }]}>{translateUi('vaultBack')}</Text>
        </Pressable>

        <View style={styles.titleCluster}>
          <Text style={[styles.eyebrow, { color: accentText }]}>
            {translateUi('vaultEyebrow')}
          </Text>
          <Text style={[styles.title, { color: pageInk }]}>{translateUi('vaultTitle')}</Text>
        </View>

        <View style={[styles.countBadge, { borderColor: palette.surfaceBorder, backgroundColor: palette.surfaceBg }]}>
          <Text style={[styles.countText, { color: accentText }]}>
            {translateUi('vaultCount', { count: cartridges.length })}
          </Text>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={[styles.filterWrap, { borderBottomColor: palette.surfaceBorder, backgroundColor: palette.surfaceBg }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {(['ALL', ...(jarGames.length > 0 ? (['JARS'] as FilterCategory[]) : []), 'FAVS', 'NOKIA', 'ARCADE'] as FilterCategory[]).map((cat) => {
            const isSelected = filter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setFilter(cat)}
                style={[
                  styles.filterChip,
                  { borderColor: palette.buttonBorder, backgroundColor: palette.buttonBg },
                  isSelected && {
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}18`,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: pageMutedInk }, isSelected && { color: accentText }]}>
                  {cat === 'ALL'
                    ? translateUi('vaultCatAll', { count: cartridges.length + jarGames.length })
                    : cat === 'JARS'
                    ? `J2ME JAR (${jarGames.length})`
                    : cat === 'FAVS'
                    ? translateUi('vaultCatFavs', { count: favIds.length })
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
        extraData={lang}
        ListHeaderComponent={listHeader || undefined}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          filter === 'JARS' ? undefined : (
          <View style={styles.emptyWrap}>
            <Ionicons name="star-outline" size={28} color={pageMutedInk} />
            <Text style={[styles.emptyTitle, { color: pageInk }]}>{translateUi('vaultEmptyTitle')}</Text>
            <Text style={[styles.emptySub, { color: pageMutedInk }]}>
              {translateUi('vaultEmptySub')}
            </Text>
          </View>
          )
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
