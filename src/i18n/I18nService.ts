import AsyncStorage from '@react-native-async-storage/async-storage';
import { enLocale, type LocaleBundle } from './locales/en';
import { trLocale } from './locales/tr';
import type {
  I18nListener,
  I18nStorageAdapter,
  RetroLang,
  TemplateVars,
} from './types';

export const LANG_STORAGE_KEY = '@retrodeck8_lang_v1';

/**
 * OCP Registry: adding a new language requires only creating a `LocaleBundle`
 * file and adding its entry here — zero changes in UI or OS logic.
 */
const LOCALES: Record<RetroLang, LocaleBundle> = {
  en: enLocale,
  tr: trLocale,
};

function interpolate(template: string, vars?: TemplateVars): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    vars[key] !== undefined ? String(vars[key]) : match
  );
}

/**
 * SRP + DIP: Isolated localization service managing active locale state,
 * storage persistence via an injectable storage adapter, and change listeners.
 */
export class I18nService {
  private lang: RetroLang = 'en';
  private listeners = new Set<I18nListener>();
  private storage: I18nStorageAdapter;

  constructor(storage: I18nStorageAdapter = AsyncStorage) {
    this.storage = storage;
  }

  public getLang(): RetroLang {
    return this.lang;
  }

  public getAvailableLangs(): RetroLang[] {
    return Object.keys(LOCALES) as RetroLang[];
  }

  public getBundle(lang: RetroLang = this.lang): LocaleBundle {
    return LOCALES[lang] ?? LOCALES.en;
  }

  public setLang(next: RetroLang, persist = true) {
    const resolved: RetroLang = next in LOCALES ? next : 'en';
    if (this.lang === resolved) return;
    this.lang = resolved;
    if (persist) {
      this.storage.setItem(LANG_STORAGE_KEY, resolved).catch(() => {});
    }
    this.listeners.forEach((fn) => fn(resolved));
  }

  public toggleLang(): RetroLang {
    const list = this.getAvailableLangs();
    const curIdx = list.indexOf(this.lang);
    const next = list[(curIdx + 1) % list.length] || 'en';
    this.setLang(next, true);
    return next;
  }

  public async hydrate(): Promise<RetroLang> {
    try {
      const saved = await this.storage.getItem(LANG_STORAGE_KEY);
      if (saved && saved in LOCALES) {
        this.setLang(saved as RetroLang, false);
      }
    } catch {
      // Ignore storage errors and keep English default
    }
    return this.lang;
  }

  public subscribe(listener: I18nListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public translateOs(
    key: keyof LocaleBundle['os'],
    vars?: TemplateVars,
    lang: RetroLang = this.lang
  ): string {
    const raw = this.getBundle(lang).os[key] ?? LOCALES.en.os[key];
    return typeof raw === 'string' ? interpolate(raw, vars) : String(raw);
  }

  public translateKbd(
    key: keyof LocaleBundle['keyboard'],
    vars?: TemplateVars,
    lang: RetroLang = this.lang
  ): string {
    const raw = this.getBundle(lang).keyboard[key] ?? LOCALES.en.keyboard[key];
    return interpolate(raw, vars);
  }

  public translateUi(
    key: keyof LocaleBundle['ui'],
    vars?: TemplateVars,
    lang: RetroLang = this.lang
  ): string {
    const raw = this.getBundle(lang).ui[key] ?? LOCALES.en.ui[key];
    return interpolate(raw, vars);
  }

  public getDesktopLabel(
    appId: string,
    fallback: string,
    lang: RetroLang = this.lang
  ): string {
    const dict = this.getBundle(lang).desktop as Record<string, string>;
    return dict[appId] ?? (LOCALES.en.desktop as Record<string, string>)[appId] ?? fallback;
  }
}

export const i18nService = new I18nService();
