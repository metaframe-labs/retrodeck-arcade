import { useCallback, useEffect, useState } from 'react';
import { i18nService } from './I18nService';
import type { LocaleBundle } from './locales/en';
import type { RetroLang, TemplateVars } from './types';

/**
 * Reactive React hook bound to `i18nService` so any UI component re-renders
 * immediately whenever OS language switches (Setup menu, Terminal, or AI).
 */
export function useTranslation() {
  const [lang, setLangState] = useState<RetroLang>(() => i18nService.getLang());

  useEffect(() => {
    return i18nService.subscribe((next) => {
      setLangState(next);
    });
  }, []);

  const tUi = useCallback(
    (key: keyof LocaleBundle['ui'], vars?: TemplateVars) =>
      i18nService.translateUi(key, vars, lang),
    [lang]
  );

  const tOs = useCallback(
    (key: keyof LocaleBundle['os'], vars?: TemplateVars) =>
      i18nService.translateOs(key, vars, lang),
    [lang]
  );

  const setLang = useCallback((next: RetroLang) => {
    i18nService.setLang(next);
  }, []);

  const toggleLang = useCallback(() => {
    return i18nService.toggleLang();
  }, []);

  return { lang, tUi, tOs, setLang, toggleLang };
}
