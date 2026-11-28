import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArcadeSound } from '../../arcade/types';
import { getDesktopLabel, pickLang } from '../../i18n/retroI18n';
import {
  INSTALLED_APPS_STORAGE_KEY,
  OsAppId,
  STORE_APP_IDS,
  STORE_CATALOG,
  StoreCatalogItem,
} from '../retroOsData';
import type { RetroDeckOS } from '../RetroDeckOS';

export type StoreDownloadPhase = 'connecting' | 'downloading' | 'unpacking' | 'registering';

export interface StoreDownloadState {
  appId: OsAppId;
  progress: number; // 0..100
  phase: StoreDownloadPhase;
  totalKb: number;
  downloadedKb: number;
  speedKbps: number;
  elapsed: number;
  lastBeepPct: number;
}

export function saveInstalledStoreApps(apps: OsAppId[]) {
  AsyncStorage.setItem(INSTALLED_APPS_STORAGE_KEY, JSON.stringify(apps)).catch(() => {});
}

export function getStoreCatalogItem(appId: OsAppId): StoreCatalogItem | undefined {
  return STORE_CATALOG.find((item) => item.id === appId);
}

export function getStoreVisibleItems(os: RetroDeckOS): StoreCatalogItem[] {
  if (os.storeTab === 'installed') {
    return STORE_CATALOG.filter((item) => os.installedStoreApps.includes(item.id));
  }
  return STORE_CATALOG;
}

export function getStoreFreeMbText(os: RetroDeckOS): string {
  const usedOptionalKb = STORE_CATALOG.reduce(
    (acc, item) => (os.installedStoreApps.includes(item.id) ? acc + item.sizeKb : acc),
    0
  );
  const freeKb = Math.max(256, 16384 - 1280 - usedOptionalKb);
  return `${(freeKb / 1024).toFixed(1)}MB`;
}

export function getStorePhaseLabel(phase: StoreDownloadPhase, lang: 'en' | 'tr'): string {
  switch (phase) {
    case 'connecting':
      return pickLang(lang, 'CONNECTING RD-NET...', 'RD-NET BAGLANIYOR...');
    case 'downloading':
      return pickLang(lang, 'DOWNLOADING PKG...', 'PAKET INDIRILIYOR...');
    case 'unpacking':
      return pickLang(lang, 'UNPACKING FILES...', 'DOSYALAR ACILIYOR...');
    case 'registering':
      return pickLang(lang, 'ADDING TO MENU...', 'MENUYE EKLENIYOR...');
  }
}

export function startStoreDownload(os: RetroDeckOS, appId: OsAppId): ArcadeSound | null {
  if (!STORE_APP_IDS.includes(appId)) return null;
  if (os.installedStoreApps.includes(appId)) return null;
  if (os.storeDownload) {
    if (os.storeDownload.appId === appId) {
      cancelStoreDownload(os);
      return 'die';
    }
    const activeItem = getStoreCatalogItem(os.storeDownload.appId);
    const activeName = activeItem
      ? pickLang(os.lang, activeItem.titleEn, activeItem.titleTr)
      : os.storeDownload.appId.toUpperCase();
    os.smsBanner = pickLang(
      os.lang,
      `WAIT: ${activeName} LOADING...`,
      `BEKLE: ${activeName} YUKLENIYOR...`
    );
    os.smsBannerTimer = 2.0;
    return 'hit';
  }

  const meta = getStoreCatalogItem(appId);
  const totalKb = meta?.sizeKb ?? 160;
  os.storeRemoveConfirm = false;
  os.storeDownload = {
    appId,
    progress: 0,
    phase: 'connecting',
    totalKb,
    downloadedKb: 0,
    speedKbps: 28.8,
    elapsed: 0,
    lastBeepPct: 0,
  };
  return 'score';
}

export function cancelStoreDownload(os: RetroDeckOS) {
  if (!os.storeDownload) return;
  os.storeDownload = null;
  os.smsBanner = pickLang(os.lang, '[X] DOWNLOAD CANCELLED', '[X] YUKLEME IPTAL EDILDI');
  os.smsBannerTimer = 2.0;
}

export function uninstallStoreApp(os: RetroDeckOS, appId: OsAppId) {
  if (!os.installedStoreApps.includes(appId)) return;
  os.installedStoreApps = os.installedStoreApps.filter((id) => id !== appId);
  os.storeRemoveConfirm = false;
  saveInstalledStoreApps(os.installedStoreApps);
  os.clampDeskIdx();

  const visible = getStoreVisibleItems(os);
  if (visible.length === 0) {
    os.storeIdx = 0;
  } else if (os.storeIdx >= visible.length) {
    os.storeIdx = visible.length - 1;
  }

  const label = getDesktopLabel(appId, appId.toUpperCase(), os.lang);
  os.smsBanner = pickLang(os.lang, `[-] ${label} REMOVED`, `[-] ${label} KALDIRILDI`);
  os.smsBannerTimer = 2.4;
}

/** Advances the active Store download/install simulation frame-by-frame. */
export function tickStoreDownload(os: RetroDeckOS, dt: number) {
  const dl = os.storeDownload;
  if (!dl) return;

  dl.elapsed += dt;

  // Duration scales mildly with package size (~2.3s for 64KB, ~3.8s for 512KB)
  const totalSec = 2.1 + (dl.totalKb / 512) * 1.8;
  // Slightly slower handshake at start and unpack at end, brisk burst in middle
  let rateMultiplier = 1.0;
  if (dl.progress < 14) rateMultiplier = 0.72;
  else if (dl.progress < 78) rateMultiplier = 1.24 + Math.sin(dl.elapsed * 9) * 0.25;
  else if (dl.progress < 93) rateMultiplier = 0.85;
  else rateMultiplier = 0.95;

  const deltaPct = (dt / totalSec) * 100 * rateMultiplier;
  dl.progress = Math.min(100, dl.progress + deltaPct);

  if (dl.progress < 14) {
    dl.phase = 'connecting';
    dl.downloadedKb = 0;
    dl.speedKbps = 14.4;
  } else if (dl.progress < 78) {
    dl.phase = 'downloading';
    const dlRatio = (dl.progress - 14) / (78 - 14);
    dl.downloadedKb = Math.min(dl.totalKb, Math.round(dlRatio * dl.totalKb));
    dl.speedKbps = Number((44 + Math.sin(dl.elapsed * 11) * 16 + (dl.totalKb / 512) * 28).toFixed(1));
  } else if (dl.progress < 94) {
    dl.phase = 'unpacking';
    dl.downloadedKb = dl.totalKb;
    dl.speedKbps = 0;
  } else {
    dl.phase = 'registering';
    dl.downloadedKb = dl.totalKb;
    dl.speedKbps = 0;
  }

  // Subtle retro progress ticks every 25%
  const quarterStep = Math.floor(dl.progress / 25) * 25;
  if (quarterStep > dl.lastBeepPct && quarterStep < 100) {
    dl.lastBeepPct = quarterStep;
    os.cb.onPlaySound?.('hit');
  }

  if (dl.progress >= 100) {
    const installedId = dl.appId;
    os.storeDownload = null;
    if (!os.installedStoreApps.includes(installedId)) {
      os.installedStoreApps = [...os.installedStoreApps, installedId];
      saveInstalledStoreApps(os.installedStoreApps);
    }
    const label = getDesktopLabel(installedId, installedId.toUpperCase(), os.lang);
    os.smsBanner = pickLang(
      os.lang,
      `✓ ${label} ADDED TO MENU!`,
      `✓ ${label} MENUYE EKLENDI!`
    );
    os.smsBannerTimer = 3.2;
    os.cb.onPlaySound?.('powerup');
  }
}

export function focusStoreOnApp(os: RetroDeckOS, appId: OsAppId) {
  const idx = STORE_CATALOG.findIndex((item) => item.id === appId);
  os.app = 'store';
  os.storeTab = 'browse';
  os.storeRemoveConfirm = false;
  os.storeIdx = idx >= 0 ? idx : 0;
}
