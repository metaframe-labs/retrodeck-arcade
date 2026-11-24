import { i18nService, LANG_STORAGE_KEY } from './I18nService';
import type { LocaleBundle } from './locales/en';
import type { RetroLang, TemplateVars } from './types';

export { i18nService, LANG_STORAGE_KEY };
export { useTranslation } from './useTranslation';
export type { RetroLang, TemplateVars, LocaleBundle };

export type OsStringKey = keyof LocaleBundle['os'];
export type KeyboardStringKey = keyof LocaleBundle['keyboard'];
export type UiStringKey = keyof LocaleBundle['ui'];

export function getRetroLang(): RetroLang {
  return i18nService.getLang();
}

export function setRetroLang(lang: RetroLang) {
  i18nService.setLang(lang, false);
}

/** Inline bilingual picker for non-string data (e.g. AI prompt arrays) */
export function pickLang<T>(lang: RetroLang, en: T, tr: T): T {
  return lang === 'tr' ? tr : en;
}

export function tOs(
  key: OsStringKey,
  langOrVars?: RetroLang | TemplateVars,
  maybeLang?: RetroLang
): string {
  const vars = typeof langOrVars === 'object' ? langOrVars : undefined;
  const lang = typeof langOrVars === 'string' ? langOrVars : maybeLang;
  return i18nService.translateOs(key, vars, lang);
}

export function tKbd(
  key: KeyboardStringKey,
  langOrVars?: RetroLang | TemplateVars,
  maybeLang?: RetroLang
): string {
  const vars = typeof langOrVars === 'object' ? langOrVars : undefined;
  const lang = typeof langOrVars === 'string' ? langOrVars : maybeLang;
  return i18nService.translateKbd(key, vars, lang);
}

export function tUi(
  key: UiStringKey,
  langOrVars?: RetroLang | TemplateVars,
  maybeLang?: RetroLang
): string {
  const vars = typeof langOrVars === 'object' ? langOrVars : undefined;
  const lang = typeof langOrVars === 'string' ? langOrVars : maybeLang;
  return i18nService.translateUi(key, vars, lang);
}

export function getDesktopLabel(
  appId: string,
  fallback: string,
  lang: RetroLang = i18nService.getLang()
): string {
  return i18nService.getDesktopLabel(appId, fallback, lang);
}

export function getOsBundle(lang: RetroLang = i18nService.getLang()): LocaleBundle['os'] {
  return i18nService.getBundle(lang).os;
}
