export type RetroLang = 'en' | 'tr';

export interface I18nStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type I18nListener = (lang: RetroLang) => void;

export type TemplateVars = Record<string, string | number>;
