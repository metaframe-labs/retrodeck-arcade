import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RetroDeckOS } from '../RetroDeckOS';

export type WinVariant = 'win95' | 'winxp' | 'win7' | 'win8' | 'win10' | 'win11';

/** True whenever any Windows desktop style or format-sim Windows mode is active. */
export function isWinUiActive(os: RetroDeckOS): boolean {
  return (
    Boolean(os.postFormatWinStyle) ||
    os.menuStyle === 'windows' ||
    os.menuStyle === 'windows_7' ||
    os.menuStyle === 'windows_8'
  );
}

/** Resolves the active Windows era variant from format-sim, menu style, or palette. */
export function getWinVariant(os: RetroDeckOS): WinVariant {
  if (os.postFormatWinStyle === 'winxp') return 'winxp';
  if (os.postFormatWinStyle === 'win98') return 'win95';
  if (os.menuStyle === 'windows_7') return 'win7';
  if (os.menuStyle === 'windows_8') return 'win8';
  const pal = os.cb.getPaletteId?.() ?? '';
  if (pal === 'windows_xp') return 'winxp';
  if (pal === 'windows_7') return 'win7';
  if (pal === 'windows_8') return 'win8';
  if (pal === 'windows_10') return 'win10';
  if (pal === 'windows_11') return 'win11';
  return 'win95';
}

export interface WinExplorerPalette {
  frameBg: string;
  frameBorder: string;
  toolbarBg: string;
  toolbarBorder: string;
  toolbarInk: string;
  addressBg: string;
  addressBorder: string;
  paneBg: string;
  paneBorder: string;
  text: string;
  subText: string;
  selBg: string;
  selBorder: string;
  selText: string;
  cardBg: string;
  cardBorder: string;
  statusBg: string;
  statusBorder: string;
  accent: string;
  radius: number;
}

export function getWinExplorerPalette(variant: WinVariant): WinExplorerPalette {
  switch (variant) {
    case 'win7':
      return {
        frameBg: 'rgba(20, 72, 126, 0.92)',
        frameBorder: 'rgba(186, 230, 253, 0.65)',
        toolbarBg: '#DCEBFA',
        toolbarBorder: '#9EC5EB',
        toolbarInk: '#0F2942',
        addressBg: '#FFFFFF',
        addressBorder: '#8EB6DC',
        paneBg: '#F6FAFF',
        paneBorder: '#A9CBEB',
        text: '#0F172A',
        subText: '#475569',
        selBg: '#CDE8FF',
        selBorder: '#3898EC',
        selText: '#0B2544',
        cardBg: '#FFFFFF',
        cardBorder: '#D5E5F5',
        statusBg: '#E6F1FC',
        statusBorder: '#B3D1EE',
        accent: '#1E7AD9',
        radius: 4,
      };
    case 'winxp':
      return {
        frameBg: '#0055EA',
        frameBorder: '#4B94FF',
        toolbarBg: '#ECE9D8',
        toolbarBorder: '#ACA899',
        toolbarInk: '#1F2937',
        addressBg: '#FFFFFF',
        addressBorder: '#7F9DB9',
        paneBg: '#FFFFFF',
        paneBorder: '#7F9DB9',
        text: '#111827',
        subText: '#4B5563',
        selBg: '#316AC5',
        selBorder: '#1D4ED8',
        selText: '#FFFFFF',
        cardBg: '#F9FAFB',
        cardBorder: '#D1D5DB',
        statusBg: '#ECE9D8',
        statusBorder: '#ACA899',
        accent: '#245EDC',
        radius: 2,
      };
    case 'win10':
      return {
        frameBg: '#1F1F1F',
        frameBorder: '#383838',
        toolbarBg: '#252526',
        toolbarBorder: '#383838',
        toolbarInk: '#F3F4F6',
        addressBg: '#141414',
        addressBorder: '#3F3F46',
        paneBg: '#171717',
        paneBorder: '#2D2D30',
        text: '#F8FAFC',
        subText: '#9CA3AF',
        selBg: '#0078D7',
        selBorder: '#38BDF8',
        selText: '#FFFFFF',
        cardBg: '#222226',
        cardBorder: '#333338',
        statusBg: '#1F1F23',
        statusBorder: '#333338',
        accent: '#0078D7',
        radius: 1,
      };
    case 'win11':
      return {
        frameBg: '#E8EEF5',
        frameBorder: '#CBD5E1',
        toolbarBg: '#F1F5F9',
        toolbarBorder: '#E2E8F0',
        toolbarInk: '#0F172A',
        addressBg: '#FFFFFF',
        addressBorder: '#CBD5E1',
        paneBg: '#FFFFFF',
        paneBorder: '#E2E8F0',
        text: '#0F172A',
        subText: '#64748B',
        selBg: '#E0F2FE',
        selBorder: '#0067C0',
        selText: '#0C4A6E',
        cardBg: '#F8FAFC',
        cardBorder: '#E2E8F0',
        statusBg: '#F1F5F9',
        statusBorder: '#E2E8F0',
        accent: '#0067C0',
        radius: 6,
      };
    case 'win8':
      return {
        frameBg: '#0078D7',
        frameBorder: '#005A9E',
        toolbarBg: '#F3F4F6',
        toolbarBorder: '#D1D5DB',
        toolbarInk: '#111827',
        addressBg: '#FFFFFF',
        addressBorder: '#9CA3AF',
        paneBg: '#FFFFFF',
        paneBorder: '#D1D5DB',
        text: '#111827',
        subText: '#4B5563',
        selBg: '#0078D7',
        selBorder: '#005A9E',
        selText: '#FFFFFF',
        cardBg: '#F9FAFB',
        cardBorder: '#E5E7EB',
        statusBg: '#F3F4F6',
        statusBorder: '#D1D5DB',
        accent: '#0078D7',
        radius: 0,
      };
    default: // win95 / win98
      return {
        frameBg: '#C0C0C0',
        frameBorder: '#808080',
        toolbarBg: '#C0C0C0',
        toolbarBorder: '#808080',
        toolbarInk: '#000000',
        addressBg: '#FFFFFF',
        addressBorder: '#808080',
        paneBg: '#FFFFFF',
        paneBorder: '#808080',
        text: '#000000',
        subText: '#4B5563',
        selBg: '#000080',
        selBorder: '#000080',
        selText: '#FFFFFF',
        cardBg: '#F3F4F6',
        cardBorder: '#C0C0C0',
        statusBg: '#C0C0C0',
        statusBorder: '#808080',
        accent: '#000080',
        radius: 0,
      };
  }
}

/** Shared Windows Fluent / Win32 app icon renderer used across Desktop, Programs folder, and Store. */
export function renderWinAppIconTile(
  itemId: string,
  itemIcon: keyof typeof Ionicons.glyphMap,
  sel: boolean,
  variant: WinVariant,
  size = 24
): React.ReactNode {
  const borderRadius = variant === 'win11' ? 6 : variant === 'win8' || variant === 'win95' ? 0 : 4;
  const iconSize = Math.max(10, Math.round(size * 0.54));

  const renderFluentTile = (
    iconName: keyof typeof Ionicons.glyphMap,
    tileBg: string,
    tileBorder: string,
    glyphColor: string = '#FFFFFF',
    accentBadge?: React.ReactNode
  ) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: sel ? '#0284C7' : tileBg,
        borderWidth: 1,
        borderColor: sel ? '#FFFFFF' : tileBorder,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.35,
        shadowRadius: 2,
        elevation: 3,
      }}
    >
      <Ionicons name={iconName} size={iconSize} color={sel ? '#FFFFFF' : glyphColor} />
      {accentBadge}
    </View>
  );

  switch (itemId) {
    case 'format':
      return renderFluentTile(
        'desktop',
        '#0284C7',
        '#0369A1',
        '#FFFFFF',
        <View style={{ position: 'absolute', bottom: 1, right: 1, width: 6, height: 4, backgroundColor: '#38BDF8', borderRadius: 1 }} />
      );
    case 'wap':
      return renderFluentTile('globe', '#0284C7', '#0369A1', '#E0F2FE');
    case 'arcade':
      return renderFluentTile('game-controller', '#107C10', '#0E6B0E', '#FFFFFF');
    case 'store':
      return renderFluentTile('storefront', '#0284C7', '#0369A1', '#FFFFFF');
    case 'programs':
      return renderFluentTile('folder-open', '#F59E0B', '#B45309', '#FEF3C7');
    case 'notes':
      return renderFluentTile('document-text', '#0284C7', '#0369A1', '#FEF08A');
    case 'paint':
      return renderFluentTile('color-palette', '#E11D48', '#BE123C', '#FFFFFF');
    case 'calc':
      return renderFluentTile('calculator', '#475569', '#334155', '#38BDF8');
    case 'term':
      return renderFluentTile('terminal', '#0F172A', '#334155', '#4ADE80');
    case 'setup':
      return renderFluentTile('settings', '#475569', '#334155', '#F1F5F9');
    case 'wallpapers':
      return renderFluentTile('images', '#0D9488', '#0F766E', '#FFFFFF');
    case 'radio':
      return renderFluentTile('play-circle', '#EA580C', '#C2410C', '#FFFFFF');
    case 'synth':
      return renderFluentTile('musical-notes', '#7C3AED', '#6D28D9', '#FFFFFF');
    case 'ai':
      return renderFluentTile('chatbubbles', '#4F46E5', '#4338CA', '#FFFFFF');
    case 'sms':
      return renderFluentTile('mail', '#0284C7', '#0369A1', '#FFFFFF');
    case 'contacts':
      return renderFluentTile('people', '#D97706', '#B45309', '#FFFFFF');
    case 'phone':
      return renderFluentTile('call', '#16A34A', '#15803D', '#FFFFFF');
    case 'weather':
      return renderFluentTile('partly-sunny', '#0284C7', '#0369A1', '#FDE047');
    case 'clock':
      return renderFluentTile('time', '#2563EB', '#1D4ED8', '#FFFFFF');
    case 'stats':
      return renderFluentTile('stats-chart', '#059669', '#047857', '#6EE7B7');
    case 'j2me':
      return renderFluentTile('cube', '#EA580C', '#C2410C', '#FEF3C7');
    case 'device':
      return renderFluentTile('hardware-chip-outline', '#0891B2', '#0E7490', '#E0F2FE');
    case 'profiles':
      return renderFluentTile('notifications', '#6D28D9', '#5B21B6', '#FDE68A');
    default:
      return renderFluentTile(itemIcon, '#0284C7', '#0369A1', '#FFFFFF');
  }
}
