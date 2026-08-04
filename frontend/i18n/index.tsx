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

export type LocaleCode = 'en' | 'af';

export const SUPPORTED_LOCALES: Array<{ code: LocaleCode; name: string; nativeName: string }> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
];

const DICTIONARIES: Record<LocaleCode, typeof en> = { en, af };
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
    return code === 'af' ? 'af' : 'en';
  } catch {
    return 'en';
  }
}

// ─── Storage ───────────────────────────────────────────────

// Web previously kept the locale in a module-level variable, which meant the
// choice was lost on every page reload — the picker worked, but the language
// silently reverted to the device default. localStorage is read through
// globalThis and guarded, so a non-browser or storage-disabled environment
// (private mode, SSR) degrades to "not persisted" rather than throwing.
// SecureStore is retained on native so existing installs keep their choice.
let webLocaleCache: string | null = null;

function webStorage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

const localeStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return webStorage()?.getItem(STORAGE_KEY) ?? webLocaleCache;
      } catch {
        return webLocaleCache;
      }
    }
    try {
      return await SecureStore.getItemAsync(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Cache regardless, so the choice still holds for this session even
      // when localStorage is unavailable.
      webLocaleCache = value;
      try {
        webStorage()?.setItem(STORAGE_KEY, value);
      } catch {
        /* storage full or blocked — session-only is the best we can do */
      }
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

function isLocaleCode(value: unknown): value is LocaleCode {
  return value === 'en' || value === 'af';
}

interface I18nContextValue {
  locale: LocaleCode;
  /** Device-level choice. Used before anyone is signed in. */
  setLocale: (code: LocaleCode) => void;
  /**
   * Apply the signed-in account's language. Held in memory only — it must NOT
   * be written to device storage, or the next person to use this browser would
   * inherit the previous user's language.
   */
  setAccountLocale: (code: LocaleCode | null | undefined) => void;
  /** Drop the account language on logout, falling back to the device choice. */
  clearAccountLocale: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  supported: typeof SUPPORTED_LOCALES;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [deviceLocale, setDeviceLocale] = useState<LocaleCode>(() => detectDeviceLocale());
  const [accountLocale, setAccountLocaleState] = useState<LocaleCode | null>(null);

  // The signed-in user's preference wins; otherwise fall back to the device.
  const locale = accountLocale ?? deviceLocale;

  // Load persisted device locale on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await localeStorage.get();
      if (active && isLocaleCode(stored)) {
        setDeviceLocale(stored);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setDeviceLocale(code);
    void localeStorage.set(code);
  }, []);

  const setAccountLocale = useCallback((code: LocaleCode | null | undefined) => {
    setAccountLocaleState(isLocaleCode(code) ? code : null);
  }, []);

  const clearAccountLocale = useCallback(() => setAccountLocaleState(null), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale] || en;
      const value = lookup(dict, key) ?? lookup(en, key) ?? key;
      return interpolate(value, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      setAccountLocale,
      clearAccountLocale,
      t,
      supported: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, setAccountLocale, clearAccountLocale, t],
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

/**
 * Render a subtree in a fixed locale, ignoring the user's choice.
 *
 * Used for the screens shown before anyone is authenticated — login and the
 * first-run setup wizard. No user is known there, so there is no per-account
 * language to honour, and a half-translated sign-in page is worse than a
 * consistently English one. `setLocale` still writes through to the real
 * provider, so a picker rendered inside an override keeps working.
 */
export function LocaleOverride({
  locale,
  children,
}: {
  locale: LocaleCode;
  children: React.ReactNode;
}) {
  const parent = useI18n();

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale] || en;
    return {
      locale,
      setLocale: parent.setLocale,
      setAccountLocale: parent.setAccountLocale,
      clearAccountLocale: parent.clearAccountLocale,
      supported: SUPPORTED_LOCALES,
      t: (key: string, vars?: Record<string, string | number>) =>
        interpolate(lookup(dict, key) ?? lookup(en, key) ?? key, vars),
    };
  }, [locale, parent.setLocale, parent.setAccountLocale, parent.clearAccountLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Convenience hook: returns just the `t` function. */
export function useT() {
  return useI18n().t;
}
