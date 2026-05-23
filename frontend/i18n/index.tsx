/**
 * Lightweight i18n provider — zero external dependencies.
 *
 * - Supports en / af / zu / xh.
 * - Detects device locale on first launch (best-effort via Platform).
 * - Persists the user's choice in storage so it survives restart.
 * - `t('common.save')` style key lookup with `{{var}}` interpolation.
 * - Works on iOS, Android and Web (uses RN primitives only).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NativeModules, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { en } from './locales/en';
import { af } from './locales/af';
import { zu } from './locales/zu';
import { xh } from './locales/xh';

export type LocaleCode = 'en' | 'af' | 'zu' | 'xh';

export const SUPPORTED_LOCALES: Array<{ code: LocaleCode; name: string; nativeName: string }> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
];

const DICTIONARIES: Record<LocaleCode, typeof en> = { en, af, zu, xh };
const STORAGE_KEY = 'app_locale';

// ─── Device locale detection ───────────────────────────────

function detectDeviceLocale(): LocaleCode {
  try {
    let raw: string | undefined;
    if (Platform.OS === 'ios') {
      raw =
        NativeModules?.SettingsManager?.settings?.AppleLocale ||
        NativeModules?.SettingsManager?.settings?.AppleLanguages?.[0];
    } else if (Platform.OS === 'android') {
      raw = NativeModules?.I18nManager?.localeIdentifier;
    } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      raw = navigator.language;
    }
    const code = (raw || 'en').slice(0, 2).toLowerCase();
    if (code === 'af' || code === 'zu' || code === 'xh') {
      return code;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

// ─── Storage (web in-memory fallback) ──────────────────────

let webLocaleCache: string | null = null;
const localeStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return webLocaleCache;
    try {
      return await SecureStore.getItemAsync(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      webLocaleCache = value;
      return;
    }
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  },
};

// ─── Key lookup with {{var}} interpolation ─────────────────

function lookup(dict: any, key: string): string | undefined {
  const parts = key.split('.');
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}

// ─── Context ───────────────────────────────────────────────

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  supported: typeof SUPPORTED_LOCALES;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => detectDeviceLocale());

  // Load persisted locale on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await localeStorage.get();
      if (active && stored && (stored === 'en' || stored === 'af' || stored === 'zu' || stored === 'xh')) {
        setLocaleState(stored);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    void localeStorage.set(code);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale] || en;
      const value = lookup(dict, key) ?? lookup(en, key) ?? key;
      return interpolate(value, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, supported: SUPPORTED_LOCALES }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

/** Convenience hook: returns just the `t` function. */
export function useT() {
  return useI18n().t;
}
