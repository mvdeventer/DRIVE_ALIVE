/**
 * RoadReady Theme System
 *
 * Provides centralized design tokens, light/dark mode switching,
 * and a React Context for consuming the active theme.
 *
 * Usage:
 *   import { useTheme } from '../theme/ThemeContext';
 *   const { colors, isDark, toggle } = useTheme();
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Design Tokens ──────────────────────────────────────────

export const palette = {
  // Primary – Deep Teal
  teal50: '#F0FDFA',
  teal100: '#CCFBF1',
  teal200: '#99F6E4',
  teal300: '#5EEAD4',
  teal400: '#2DD4BF',
  teal500: '#14B8A6',
  teal600: '#0D9488',
  teal700: '#0F766E',
  teal800: '#115E59',
  teal900: '#134E4A',
  teal950: '#042F2E',

  // Accent – Amber
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',

  // Neutral
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  gray950: '#0A0A0A',
  black: '#000000',

  // Semantic
  green500: '#22C55E',
  green600: '#16A34A',
  // Dark enough to use as TEXT on a light surface (4.6:1 on #FAFAFA);
  // green500/600 measure 2.18 / 3.1 and fail AA.
  green700: '#15803D',
  red500: '#EF4444',
  red600: '#DC2626',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  sky400: '#38BDF8',
  sky500: '#0EA5E9',
  // Dark enough to sit behind white text (5.93:1); sky500 measures 2.77:1.
  sky700: '#0369A1',
  yellow500: '#F59E0B',
  yellow600: '#D97706',
} as const;

export type ThemeColors = {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;

  // Backgrounds
  background: string;
  backgroundSecondary: string;
  card: string;
  cardElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderFocus: string;
  divider: string;

  // Semantic
  success: string;
  danger: string;
  warning: string;
  info: string;
  successBg: string;
  dangerBg: string;
  warningBg: string;
  infoBg: string;

  // Interactive
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  buttonDanger: string;
  buttonDangerText: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  // Role badges
  roleAdmin: string;
  roleInstructor: string;
  roleStudent: string;

  // Header / Navigation
  headerBackground: string;
  headerText: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Shadows (as rgba strings)
  shadowColor: string;
};

// ── Light Theme ────────────────────────────────────────────

export const lightColors: ThemeColors = {
  // teal700, not teal600: `primary` is used BOTH as text on white (3.74:1) and
  // as a button background behind white text (3.74:1). teal700 gives 5.47:1
  // in both directions.
  primary: palette.teal700,
  primaryLight: palette.teal500,
  primaryDark: palette.teal700,
  accent: palette.amber500,
  accentLight: palette.amber400,
  accentDark: palette.amber600,

  background: palette.white,
  backgroundSecondary: palette.gray50,
  card: palette.white,
  cardElevated: palette.white,

  text: palette.gray900,
  textSecondary: palette.gray600,
  // gray400 on white measures 2.52:1 — unreadable as body text. gray500 = 4.74:1.
  textTertiary: palette.gray500,
  textInverse: palette.white,

  border: palette.gray200,
  borderFocus: palette.teal600,
  divider: palette.gray200,

  // green500 as TEXT on a light surface measures 2.18:1. green700 gives 4.6:1.
  success: palette.green700,
  danger: palette.red500,
  // amber700, not yellow500: this renders as TEXT on light surfaces, where
  // #F59E0B measures 2.15:1. amber700 = 5.02:1.
  warning: palette.amber700,
  info: palette.blue600,
  successBg: '#F0FDF4',
  dangerBg: '#FEF2F2',
  warningBg: '#FFFBEB',
  infoBg: '#EFF6FF',

  buttonPrimary: palette.teal700,
  buttonPrimaryText: palette.white,
  buttonSecondary: palette.white,
  buttonSecondaryText: palette.teal700,
  // red600, not red500: white on red500 measures 3.76:1. red600 = 4.83:1.
  buttonDanger: palette.red600,
  buttonDangerText: palette.white,
  inputBackground: palette.white,
  inputBorder: palette.gray300,
  inputText: palette.gray900,
  inputPlaceholder: palette.gray400,

  // Role colours are used as full-bleed backgrounds behind white text in
  // GlobalTopBar, so they must clear 4.5:1 against #FFF.
  // red500 3.76 -> red600 4.83 · teal600 3.74 -> teal700 5.47
  roleAdmin: palette.red600,
  roleInstructor: palette.teal700,
  roleStudent: palette.sky700,

  headerBackground: palette.teal600,
  headerText: palette.white,
  tabBarBackground: palette.white,
  // teal600 on white measures 3.74:1 for the active tab label. teal700 gives 5.47:1.
  tabBarActive: palette.teal700,
  // gray400 on white measured 2.52:1 — below AA. gray500 gives 4.74:1.
  tabBarInactive: palette.gray500,

  shadowColor: 'rgba(0, 0, 0, 0.08)',
};

// ── Dark Theme ─────────────────────────────────────────────

export const darkColors: ThemeColors = {
  primary: palette.teal500,
  primaryLight: palette.teal400,
  primaryDark: palette.teal600,
  accent: palette.amber400,
  accentLight: palette.amber300,
  accentDark: palette.amber500,

  background: palette.gray950,
  backgroundSecondary: palette.gray900,
  card: palette.gray800,
  cardElevated: palette.gray700,

  text: palette.gray50,
  // Shifted one step lighter each: gray500 tertiary measured 3.19:1 on the
  // gray800 card. gray400 gives 6.0:1, so secondary moves to gray300 (10.2:1)
  // to keep the visual hierarchy intact.
  textSecondary: palette.gray300,
  textTertiary: palette.gray400,
  textInverse: palette.gray900,

  border: palette.gray700,
  borderFocus: palette.teal500,
  divider: palette.gray700,

  success: palette.green500,
  danger: palette.red500,
  warning: palette.yellow500,
  info: palette.blue500,
  successBg: '#052E16',
  dangerBg: '#450A0A',
  warningBg: '#451A03',
  infoBg: '#172554',

  buttonPrimary: palette.teal500,
  buttonPrimaryText: palette.gray950,
  buttonSecondary: palette.gray800,
  buttonSecondaryText: palette.teal400,
  buttonDanger: palette.red600,
  buttonDangerText: palette.white,
  inputBackground: palette.gray800,
  inputBorder: palette.gray600,
  inputText: palette.gray50,
  inputPlaceholder: palette.gray500,

  roleAdmin: palette.red600,
  roleInstructor: palette.teal700,
  roleStudent: palette.sky700,

  headerBackground: palette.gray900,
  headerText: palette.gray50,
  tabBarBackground: palette.gray900,
  tabBarActive: palette.teal500,
  // gray500 on gray900 measured 3.78:1 — below AA. gray400 gives 7.11:1.
  tabBarInactive: palette.gray400,

  shadowColor: 'rgba(0, 0, 0, 0.4)',
};

// ── Spacing & Radius Tokens ────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// ── Breakpoints ────────────────────────────────────────────

/**
 * Viewport breakpoints, in dp. These are the ONLY widths the app should
 * branch on. `md` must stay equal to SIDEBAR_BREAKPOINT in
 * hooks/useResponsiveTabBar.ts so the nav rail and the content layout
 * switch at the same width.
 *
 * Consume via useBreakpoint() — never read Dimensions.get() directly, and
 * never put a width-derived value inside StyleSheet.create (it is evaluated
 * once at module load and will not update on resize or rotation).
 */
export const breakpoints = {
  xs: 0, // phones, portrait
  sm: 480, // large phones / small phones landscape
  md: 768, // tablets — nav rail appears here
  lg: 1024, // laptops
  xl: 1440, // large desktop
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Max content width per breakpoint, used by ScreenContainer's `width` prop. */
export const contentWidths = {
  /** Single-column forms: login, verify, payment result. */
  form: 480,
  /** Standard reading/dashboard width. */
  content: 960,
  /** Dense tables and multi-column dashboards. */
  wide: 1280,
  /** No cap — full bleed. */
  full: undefined,
} as const;

export type ContentWidth = keyof typeof contentWidths;

// ── Elevation ──────────────────────────────────────────────

export type ElevationLevel = 'sm' | 'md' | 'lg';

const elevationSpecs: Record<ElevationLevel, { y: number; blur: number; light: number; dark: number; native: number }> = {
  sm: { y: 1, blur: 4, light: 0.06, dark: 0.3, native: 2 },
  md: { y: 2, blur: 8, light: 0.08, dark: 0.4, native: 3 },
  lg: { y: 6, blur: 20, light: 0.12, dark: 0.5, native: 8 },
};

/**
 * Cross-platform shadow. Returns a `boxShadow` string on web, and the
 * `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`/`elevation`
 * quintet on native, with opacity tuned per theme.
 *
 *   <View style={[styles.card, elevation('md', isDark)]} />
 */
export const elevation = (level: ElevationLevel, isDark: boolean): Record<string, unknown> => {
  const spec = elevationSpecs[level];
  const opacity = isDark ? spec.dark : spec.light;

  if (Platform.OS === 'web') {
    return { boxShadow: `0 ${spec.y}px ${spec.blur}px rgba(0, 0, 0, ${opacity})` };
  }

  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: spec.y },
    shadowOpacity: opacity,
    shadowRadius: spec.blur / 2,
    elevation: spec.native,
  };
};

// ── Typography ─────────────────────────────────────────────

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/**
 * Text roles. Prefer these over hand-picking fontSize + fontFamily, so
 * line-height stays proportional and headings read consistently.
 */
export const typography: Record<
  'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'label' | 'caption',
  TextStyleToken
> = {
  h1: { fontFamily: fontFamilies.bold, fontSize: fontSizes['3xl'], lineHeight: 38, letterSpacing: -0.5 },
  h2: { fontFamily: fontFamilies.bold, fontSize: fontSizes['2xl'], lineHeight: 32, letterSpacing: -0.3 },
  h3: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.lg, lineHeight: 26 },
  body: { fontFamily: fontFamilies.regular, fontSize: fontSizes.md, lineHeight: 24 },
  bodySm: { fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, lineHeight: 20 },
  label: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, lineHeight: 16 },
};

// ── Colour helpers ─────────────────────────────────────────

/**
 * Apply alpha to a theme colour. Handles #RGB, #RRGGBB, #RRGGBBAA and
 * rgb()/rgba() inputs, unlike hex string concatenation (`colors.primary + '12'`),
 * which silently produces an invalid colour for any non-6-digit value.
 *
 * @param color any CSS colour understood by React Native
 * @param alpha 0–1
 */
export const withAlpha = (color: string, alpha: number): string => {
  const a = Math.max(0, Math.min(1, alpha));

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return color;

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const rgbMatch = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`;
  }

  return color;
};

// ── Platform-responsive helper ─────────────────────────────

/**
 * @deprecated Branches on *platform*, not viewport — a 1920px desktop and a
 * 390px mobile browser both receive the `web` value. Use
 * `useBreakpoint().select({ xs, md, lg })` instead. Kept as an export so
 * existing call sites keep compiling while they are migrated.
 */
export const responsive = (web: number, mobile: number): number =>
  Platform.OS === 'web' ? web : mobile;

// ── Context ────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** Current resolved colors */
  colors: ThemeColors;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Current mode setting */
  mode: ThemeMode;
  /** Set mode to light, dark, or system */
  setMode: (mode: ThemeMode) => void;
  /** Quick toggle between light and dark */
  toggle: () => void;
  /** Spacing tokens */
  spacing: typeof spacing;
  /** Border radius tokens */
  radii: typeof radii;
  /** Font size tokens */
  fontSizes: typeof fontSizes;
  /** Viewport breakpoint tokens (dp) */
  breakpoints: typeof breakpoints;
  /** Max content widths for ScreenContainer */
  contentWidths: typeof contentWidths;
  /** Text role tokens */
  typography: typeof typography;
  /** Inter font family names */
  fontFamilies: typeof fontFamilies;
  /** Cross-platform shadow, pre-bound to the active light/dark mode */
  elevation: (level: ElevationLevel) => Record<string, unknown>;
  /** Apply alpha to any colour */
  withAlpha: typeof withAlpha;
  /** True once the persisted mode has been read from storage */
  isThemeReady: boolean;
  /** @deprecated platform-based, not viewport-based — use useBreakpoint().select() */
  responsive: typeof responsive;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optionally force a default mode (for testing) */
  defaultMode?: ThemeMode;
}

const THEME_MODE_STORAGE_KEY = '@roadready/theme-mode';

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Restore the persisted choice once on mount. Until it resolves we render
  // with `defaultMode`, so there is no blocking splash.
  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {
        /* storage unavailable — fall back to defaultMode */
      })
      .finally(() => {
        if (!cancelled) setIsThemeReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: ThemeMode) => {
    AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, next).catch(() => {
      /* non-fatal: the choice just won't survive a reload */
    });
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      persist(next);
    },
    [persist],
  );

  // Resolve whether dark is active
  const isDark = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark';
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'system' ? (isDark ? 'light' : 'dark') : prev === 'dark' ? 'light' : 'dark';
      persist(next);
      return next;
    });
  }, [isDark, persist]);

  const boundElevation = useCallback(
    (level: ElevationLevel) => elevation(level, isDark),
    [isDark],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
      toggle,
      spacing,
      radii,
      fontSizes,
      breakpoints,
      contentWidths,
      typography,
      fontFamilies,
      elevation: boundElevation,
      withAlpha,
      isThemeReady,
      responsive,
    }),
    [colors, isDark, mode, setMode, toggle, boundElevation, isThemeReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;
