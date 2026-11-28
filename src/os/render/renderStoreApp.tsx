import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickLang } from '../../i18n/retroI18n';
import { STORE_CATALOG, hexWithAlpha } from '../retroOsData';
import {
  cancelStoreDownload,
  getStoreFreeMbText,
  getStorePhaseLabel,
  getStoreVisibleItems,
  startStoreDownload,
  uninstallStoreApp,
} from '../engine/storeSimEngine';
import {
  getWinExplorerPalette,
  getWinVariant,
  isWinUiActive,
  renderWinAppIconTile,
} from './winChromeHelper';
import type { RetroDeckOS } from '../RetroDeckOS';
import { styles } from '../retroOsStyles';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export function renderStoreApp(os: RetroDeckOS, fg: string, bg: string): React.ReactNode {
  const L = os.lang;
  const items = getStoreVisibleItems(os);
  const safeIdx = items.length > 0 ? Math.max(0, Math.min(os.storeIdx, items.length - 1)) : 0;
  const selected = items[safeIdx] || null;
  const dl = os.storeDownload;

  const installedCount = os.installedStoreApps.length;
  const freeMb = getStoreFreeMbText(os);

  const handleRowAction = (itemId: (typeof STORE_CATALOG)[number]['id']) => {
    const isInstalled = os.installedStoreApps.includes(itemId);
    if (dl && dl.appId === itemId) {
      cancelStoreDownload(os);
      os.cb.onPlaySound?.('die');
      return;
    }
    if (os.storeTab === 'browse') {
      if (isInstalled) {
        os.launchDesktopApp(itemId);
        os.cb.onPlaySound?.('score');
      } else {
        const s = startStoreDownload(os, itemId);
        if (s) os.cb.onPlaySound?.(s);
      }
      return;
    }
    // 'installed' tab -> confirm uninstall
    if (!os.storeRemoveConfirm) {
      os.storeRemoveConfirm = true;
      os.cb.onPlaySound?.('hit');
    } else {
      uninstallStoreApp(os, itemId);
      os.cb.onPlaySound?.('explode');
    }
  };

  const dlMeta = dl ? STORE_CATALOG.find((c) => c.id === dl.appId) : null;
  const dlPct = dl ? Math.min(100, Math.round(dl.progress)) : 0;

  // WINDOWS SOFTWARE CENTER / STORE WINDOW (when a Windows desktop style is active)
  if (isWinUiActive(os)) {
    const variant = getWinVariant(os);
    const exp = getWinExplorerPalette(variant);
    const WIN_PAGE_SIZE = 4; // 2x2 windowed cards
    const curPage = Math.floor(safeIdx / WIN_PAGE_SIZE);
    const pageStart = curPage * WIN_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(items.length / WIN_PAGE_SIZE));
    const pageCards = items.slice(pageStart, pageStart + WIN_PAGE_SIZE);

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: exp.paneBg,
          borderWidth: 1.5,
          borderColor: exp.frameBorder,
          borderRadius: exp.radius,
          overflow: 'hidden',
          justifyContent: 'space-between',
        }}
      >
        {/* Explorer-style Store Toolbar & Tabs */}
        <View
          style={{
            backgroundColor: exp.toolbarBg,
            borderBottomWidth: 1,
            borderBottomColor: exp.toolbarBorder,
            paddingHorizontal: 5,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 3, flex: 1 }}>
            <Pressable
              onPress={() => {
                os.storeTab = 'browse';
                os.storeIdx = 0;
                os.storeRemoveConfirm = false;
                os.cb.onPlaySound?.('hit');
              }}
              style={{
                flex: 1,
                paddingVertical: 2,
                paddingHorizontal: 4,
                borderRadius: Math.min(3, exp.radius),
                borderWidth: 1,
                borderColor: os.storeTab === 'browse' ? exp.accent : exp.addressBorder,
                backgroundColor: os.storeTab === 'browse' ? exp.accent : exp.cardBg,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 7,
                  fontWeight: '900',
                  color: os.storeTab === 'browse' ? '#FFFFFF' : exp.text,
                }}
                numberOfLines={1}
              >
                {pickLang(L, `STORE (${STORE_CATALOG.length})`, `MAGAZA (${STORE_CATALOG.length})`)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                os.storeTab = 'installed';
                os.storeIdx = 0;
                os.storeRemoveConfirm = false;
                os.cb.onPlaySound?.('hit');
              }}
              style={{
                flex: 1,
                paddingVertical: 2,
                paddingHorizontal: 4,
                borderRadius: Math.min(3, exp.radius),
                borderWidth: 1,
                borderColor: os.storeTab === 'installed' ? exp.accent : exp.addressBorder,
                backgroundColor: os.storeTab === 'installed' ? exp.accent : exp.cardBg,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 7,
                  fontWeight: '900',
                  color: os.storeTab === 'installed' ? '#FFFFFF' : exp.text,
                }}
                numberOfLines={1}
              >
                {pickLang(L, `PROGRAMS (${installedCount})`, `YUKLU (${installedCount})`)}
              </Text>
            </Pressable>
          </View>

          <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '800', color: exp.subText }}>
            {freeMb} {totalPages > 1 ? `• ${curPage + 1}/${totalPages}` : ''}
          </Text>
        </View>

        {/* Windowed 2x2 Package Cards */}
        <View style={{ flex: 1, padding: 5, justifyContent: items.length === 0 ? 'center' : 'space-around', gap: 4 }}>
          {items.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: exp.addressBorder,
                borderRadius: exp.radius,
                padding: 10,
                alignItems: 'center',
                gap: 4,
                backgroundColor: exp.cardBg,
              }}
            >
              <Ionicons name="folder-open-outline" size={20} color={exp.accent} />
              <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: exp.text, textAlign: 'center' }}>
                {pickLang(L, 'NO INSTALLED STORE PROGRAMS', 'HENUZ YUKLU PROGRAM YOK')}
              </Text>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7, color: exp.subText, textAlign: 'center' }}>
                {pickLang(L, 'SWITCH TO [STORE] WITH ◀/▶ TO INSTALL.', 'YUKLEMEK ICIN [◀/▶] ILE MAGAZAYA GEC.')}
              </Text>
            </View>
          ) : (
            [0, 1].map((row) => (
              <View key={row} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                {[0, 1].map((col) => {
                  const localIdx = row * 2 + col;
                  const item = pageCards[localIdx];
                  if (!item) return <View key={`sp-${col}`} style={{ flex: 1 }} />;
                  const actualIdx = pageStart + localIdx;
                  const sel = actualIdx === safeIdx;
                  const isInstalled = os.installedStoreApps.includes(item.id);
                  const isDownloading = dl?.appId === item.id;

                  let pillText = pickLang(L, 'GET', 'KUR');
                  let pillBg = exp.accent;
                  if (isDownloading && dl) {
                    pillText = `${Math.round(dl.progress)}%`;
                    pillBg = '#0284C7';
                  } else if (isInstalled) {
                    if (os.storeTab === 'installed') {
                      pillText = sel && os.storeRemoveConfirm ? pickLang(L, 'DEL?', 'SIL?') : pickLang(L, 'DEL', 'KALDIR');
                      pillBg = '#DC2626';
                    } else {
                      pillText = pickLang(L, 'OPEN', 'AC');
                      pillBg = '#16A34A';
                    }
                  }

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        if (os.storeIdx !== actualIdx) {
                          os.storeIdx = actualIdx;
                          os.storeRemoveConfirm = false;
                          os.cb.onPlaySound?.('hit');
                        } else {
                          handleRowAction(item.id);
                        }
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        padding: 5,
                        borderRadius: exp.radius,
                        borderWidth: sel ? 1.5 : 1,
                        borderColor: sel ? exp.selBorder : exp.cardBorder,
                        backgroundColor: sel ? exp.selBg : exp.cardBg,
                      }}
                    >
                      {renderWinAppIconTile(item.id, item.icon, sel, variant, 22)}
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text
                          style={{
                            fontFamily: MONO_FONT,
                            fontSize: 7.4,
                            fontWeight: '900',
                            color: sel ? exp.selText : exp.text,
                          }}
                          numberOfLines={1}
                        >
                          {pickLang(L, item.titleEn, item.titleTr)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text
                            style={{
                              fontFamily: MONO_FONT,
                              fontSize: 6.4,
                              fontWeight: '700',
                              color: sel ? exp.selText : exp.subText,
                              opacity: 0.85,
                            }}
                          >
                            {item.sizeKb}KB
                          </Text>
                          <View
                            style={{
                              backgroundColor: pillBg,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                              borderRadius: Math.min(3, exp.radius),
                            }}
                          >
                            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.4, fontWeight: '900', color: '#FFFFFF' }}>
                              {pillText}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* Bottom Windows Install Progress Box OR Status Details Bar */}
        {dl ? (
          <View
            style={{
              backgroundColor: exp.statusBg,
              borderTopWidth: 1,
              borderTopColor: exp.statusBorder,
              paddingHorizontal: 6,
              paddingVertical: 3.5,
              gap: 2,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: exp.text }} numberOfLines={1}>
                {getStorePhaseLabel(dl.phase, L)} ({dl.downloadedKb}/{dl.totalKb}KB)
              </Text>
              <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: exp.accent }}>
                {dlPct}% {dl.speedKbps > 0 ? `• ${dl.speedKbps}KB/s` : ''}
              </Text>
            </View>
            <View
              style={{
                height: 7,
                borderWidth: 1,
                borderColor: exp.addressBorder,
                backgroundColor: exp.addressBg,
                borderRadius: Math.min(2, exp.radius),
                overflow: 'hidden',
              }}
            >
              <View style={{ width: `${dlPct}%`, height: '100%', backgroundColor: '#16A34A' }} />
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: exp.statusBg,
              borderTopWidth: 1,
              borderTopColor: exp.statusBorder,
              paddingHorizontal: 6,
              paddingVertical: 2.5,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '700', color: exp.subText, flex: 1 }} numberOfLines={1}>
              {selected ? pickLang(L, selected.descEn, selected.descTr) : ''}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '900', color: exp.accent }}>
              {selected
                ? os.storeTab === 'installed'
                  ? os.storeRemoveConfirm
                    ? pickLang(L, '[A] CONFIRM', '[A] ONAYLA')
                    : pickLang(L, '[A] REMOVE', '[A] KALDIR')
                  : os.installedStoreApps.includes(selected.id)
                  ? pickLang(L, '[A] OPEN', '[A] AC')
                  : pickLang(L, '[A] INSTALL', '[A] YUKLE')
                : ''}
            </Text>
          </View>
        )}
      </View>
    );
  }

  const PAGE_SIZE = 4;
  const maxStart = Math.max(0, items.length - PAGE_SIZE);
  const startIdx = Math.max(0, Math.min(safeIdx - 1, maxStart));
  const visibleRows = items.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <View style={[styles.listWrap, { justifyContent: 'space-between', gap: 3 }]}>
      {/* Top Store Header & Storage Telemetry */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: fg,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="storefront" size={10} color={bg} />
          <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: bg }}>
            {pickLang(L, 'RD APP STORE', 'RD MAGAZA')}
          </Text>
        </View>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: bg }}>
          {pickLang(L, `FREE ${freeMb}`, `BOS ${freeMb}`)}
        </Text>
      </View>

      {/* Tabs: 1.CATALOG | 2.INSTALLED */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Pressable
          onPress={() => {
            os.storeTab = 'browse';
            os.storeIdx = 0;
            os.storeRemoveConfirm = false;
            os.cb.onPlaySound?.('hit');
          }}
          style={[
            styles.aiTabPill,
            {
              borderColor: fg,
              backgroundColor: os.storeTab === 'browse' ? fg : 'transparent',
              paddingVertical: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.aiTabTxt,
              { fontSize: 7.8, color: os.storeTab === 'browse' ? bg : fg },
            ]}
          >
            {pickLang(L, `1.CATALOG (${STORE_CATALOG.length})`, `1.KATALOG (${STORE_CATALOG.length})`)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            os.storeTab = 'installed';
            os.storeIdx = 0;
            os.storeRemoveConfirm = false;
            os.cb.onPlaySound?.('hit');
          }}
          style={[
            styles.aiTabPill,
            {
              borderColor: fg,
              backgroundColor: os.storeTab === 'installed' ? fg : 'transparent',
              paddingVertical: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.aiTabTxt,
              { fontSize: 7.8, color: os.storeTab === 'installed' ? bg : fg },
            ]}
          >
            {pickLang(L, `2.INSTALLED (${installedCount})`, `2.YUKLU (${installedCount})`)}
          </Text>
        </Pressable>
      </View>

      {/* Package List */}
      <View style={{ flex: 1, justifyContent: items.length === 0 ? 'center' : 'flex-start', gap: 2.5 }}>
        {items.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: hexWithAlpha(fg, 0.55),
              padding: 8,
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Ionicons name="cloud-download-outline" size={18} color={fg} />
            <Text style={{ fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: '900', color: fg, textAlign: 'center' }}>
              {pickLang(L, 'NO EXTRA PACKAGES INSTALLED', 'HENUZ EKSTRA UYGULAMA YOK')}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.2, color: fg, opacity: 0.78, textAlign: 'center' }}>
              {pickLang(
                L,
                'PRESS [◀] FOR CATALOG TO INSTALL APPS.',
                'YUKLEMEK ICIN [◀] ILE KALOGA GEC.'
              )}
            </Text>
          </View>
        ) : (
          visibleRows.map((item, i) => {
            const actualIdx = startIdx + i;
            const sel = actualIdx === safeIdx;
            const isInstalled = os.installedStoreApps.includes(item.id);
            const isDownloading = dl?.appId === item.id;
            const rowInk = sel ? bg : fg;

            let badgeText = pickLang(L, 'GET', 'YUKLE');
            if (isDownloading && dl) {
              badgeText = `${Math.round(dl.progress)}%`;
            } else if (isInstalled) {
              badgeText =
                os.storeTab === 'installed'
                  ? sel && os.storeRemoveConfirm
                    ? pickLang(L, 'DEL?', 'SIL?')
                    : pickLang(L, 'DEL', 'KALDIR')
                  : pickLang(L, 'OPEN', 'AC');
            }

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (os.storeIdx !== actualIdx) {
                    os.storeIdx = actualIdx;
                    os.storeRemoveConfirm = false;
                    os.cb.onPlaySound?.('hit');
                  } else {
                    handleRowAction(item.id);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 5,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: fg,
                  backgroundColor: sel ? fg : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 4 }}>
                  <Text style={{ fontFamily: MONO_FONT, fontSize: 8, fontWeight: '900', color: rowInk }}>
                    {sel ? '▶' : ' '}
                  </Text>
                  <Ionicons name={item.icon} size={11} color={rowInk} />
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 8.5,
                      fontWeight: '900',
                      color: rowInk,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {pickLang(L, item.titleEn, item.titleTr)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 7,
                      fontWeight: '800',
                      color: rowInk,
                      opacity: 0.8,
                    }}
                  >
                    {item.sizeKb}K
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: rowInk,
                      backgroundColor: isInstalled || isDownloading ? rowInk : 'transparent',
                      paddingHorizontal: 4,
                      paddingVertical: 0.5,
                      minWidth: 34,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: 7,
                        fontWeight: '900',
                        color: isInstalled || isDownloading ? (sel ? fg : bg) : rowInk,
                      }}
                    >
                      {badgeText}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Bottom Live Download Simulation Panel OR Selected Package Details */}
      {dl ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: fg,
            backgroundColor: hexWithAlpha(fg, 0.08),
            paddingHorizontal: 6,
            paddingVertical: 4,
            gap: 2.5,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: fg }} numberOfLines={1}>
              {dlMeta ? pickLang(L, dlMeta.titleEn, dlMeta.titleTr) : dl.appId.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.5, fontWeight: '900', color: fg }}>
              {dlPct}% {dl.speedKbps > 0 ? `• ${dl.speedKbps}KB/s` : ''}
            </Text>
          </View>

          <View
            style={{
              height: 8,
              borderWidth: 1,
              borderColor: fg,
              backgroundColor: bg,
              padding: 1,
            }}
          >
            <View
              style={{
                width: `${dlPct}%`,
                height: '100%',
                backgroundColor: fg,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '800', color: fg }} numberOfLines={1}>
              {getStorePhaseLabel(dl.phase, L)} ({dl.downloadedKb}/{dl.totalKb}KB)
            </Text>
            {selected?.id === dl.appId && (
              <Text style={{ fontFamily: MONO_FONT, fontSize: 6.8, fontWeight: '900', color: fg }}>
                {pickLang(L, '[A] CANCEL', '[A] IPTAL')}
              </Text>
            )}
          </View>
        </View>
      ) : selected ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: fg,
            paddingHorizontal: 5,
            paddingVertical: 3.5,
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.2, fontWeight: '900', color: fg }}>
              [{pickLang(L, selected.categoryEn, selected.categoryTr)}] {selected.version} • {selected.sizeKb} KB
            </Text>
            <Text style={{ fontFamily: MONO_FONT, fontSize: 7.2, fontWeight: '900', color: fg }}>
              {os.storeTab === 'installed'
                ? os.storeRemoveConfirm
                  ? pickLang(L, '[A] CONFIRM REMOVE!', '[A] SILMEYI ONAYLA!')
                  : pickLang(L, '[A] REMOVE FROM MENU', '[A] MENUDEN KALDIR')
                : os.installedStoreApps.includes(selected.id)
                ? pickLang(L, '[A] LAUNCH APP', '[A] BASLAT')
                : pickLang(L, '[A] DOWNLOAD & INSTALL', '[A] INDIR & KUR')}
            </Text>
          </View>
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7.2, color: fg, opacity: 0.88 }} numberOfLines={1}>
            {pickLang(L, selected.descEn, selected.descTr)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
