import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDesktopLabel, pickLang } from '../../i18n/retroI18n';
import type { RetroDeckOS } from '../RetroDeckOS';
import {
  getWinExplorerPalette,
  getWinVariant,
  renderWinAppIconTile,
} from './winChromeHelper';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

/** Windows File Explorer window holding Store-installed programs + Profiles. */
export function renderProgramsFolder(os: RetroDeckOS, _fg: string, _bg: string): React.ReactNode {
  const L = os.lang;
  const variant = getWinVariant(os);
  const exp = getWinExplorerPalette(variant);
  const items = os.getProgramsFolderItems();

  const cols = 4;
  const rows = 2;
  const pageSize = cols * rows;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeIdx = Math.max(0, Math.min(os.programsIdx, Math.max(0, items.length - 1)));
  const curPage = Math.min(totalPages - 1, Math.floor(safeIdx / pageSize));
  const pageStart = curPage * pageSize;
  const activeItem = items[safeIdx] || items[0];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: exp.paneBg,
        borderWidth: 1.5,
        borderColor: exp.frameBorder,
        borderRadius: exp.radius,
        overflow: 'hidden',
      }}
    >
      {/* Explorer Address / Breadcrumb Toolbar */}
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
        <View
          style={{
            flex: 1,
            backgroundColor: exp.addressBg,
            borderWidth: 1,
            borderColor: exp.addressBorder,
            borderRadius: Math.min(3, exp.radius),
            paddingHorizontal: 5,
            paddingVertical: 1.5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="folder-open" size={9} color="#D97706" />
          <Text
            style={{ fontFamily: MONO_FONT, fontSize: 7.2, fontWeight: '800', color: exp.text, flex: 1 }}
            numberOfLines={1}
          >
            {pickLang(L, 'Computer > C: > Programs', 'Bilgisayar > C: > Programlar')}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            const nextPage = (curPage + 1) % totalPages;
            os.programsIdx = nextPage * pageSize;
            os.cb.onPlaySound?.('hit');
          }}
          style={{
            backgroundColor: exp.cardBg,
            borderWidth: 1,
            borderColor: exp.addressBorder,
            borderRadius: Math.min(3, exp.radius),
            paddingHorizontal: 5,
            paddingVertical: 1.5,
          }}
        >
          <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: exp.text }}>
            {items.length} {pickLang(L, 'ITEMS', 'OGE')} {totalPages > 1 ? `(${curPage + 1}/${totalPages})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Folder Icon Grid (4x2) */}
      <View style={{ flex: 1, padding: 5, justifyContent: 'space-around', gap: 4 }}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: cols }, (_, c) => {
              const idx = pageStart + r * cols + c;
              const item = items[idx];
              if (!item) {
                return <View key={`empty-${c}`} style={{ flex: 1 }} />;
              }
              const sel = idx === safeIdx;
              const isStoreShortcut = item.id === 'store';
              const label = isStoreShortcut
                ? pickLang(L, '+ STORE', '+ MAGAZA')
                : getDesktopLabel(item.id, item.label, L);

              return (
                <Pressable
                  key={`${item.id}-${idx}`}
                  onPress={() => {
                    if (os.programsIdx !== idx) {
                      os.programsIdx = idx;
                      os.cb.onPlaySound?.('hit');
                    } else {
                      const s = os.launchDesktopApp(item.id);
                      os.cb.onPlaySound?.(s);
                    }
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: exp.radius,
                    borderWidth: sel ? 1 : 1,
                    borderColor: sel ? exp.selBorder : 'transparent',
                    backgroundColor: sel ? exp.selBg : 'transparent',
                    paddingHorizontal: 2,
                    paddingVertical: 3,
                  }}
                >
                  {renderWinAppIconTile(item.id, item.icon, sel, variant, 24)}
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 7.2,
                      fontWeight: sel ? '900' : '700',
                      color: sel ? exp.selText : exp.text,
                      marginTop: 3,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Explorer Bottom Status Bar */}
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
        }}
      >
        <Text
          style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '800', color: exp.subText, flex: 1 }}
          numberOfLines={1}
        >
          {activeItem
            ? `${getDesktopLabel(activeItem.id, activeItem.label, L)} • ${
                os.installedStoreApps.includes(activeItem.id)
                  ? pickLang(L, 'Installed App', 'Yuklu Uygulama')
                  : activeItem.id === 'store'
                  ? pickLang(L, 'Get More Apps', 'Yeni Uygulama Yukle')
                  : pickLang(L, 'System Tool', 'Sistem Araci')
              }`
            : ''}
        </Text>
        <Text style={{ fontFamily: MONO_FONT, fontSize: 7, fontWeight: '900', color: exp.accent }}>
          {pickLang(L, '[A] OPEN  [B] CLOSE', '[A] AC  [B] KAPAT')}
        </Text>
      </View>
    </View>
  );
}
