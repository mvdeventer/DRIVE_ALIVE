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
  red500: '#EF4444',
  red600: '#DC2626',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  sky400: '#38BDF8',
  sky500: '#0EA5E9',
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
  primary: palette.teal600,
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
  textTertiary: palette.gray400,
  textInverse: palette.white,

  border: palette.gray200,
  borderFocus: palette.teal600,
  divider: palette.gray200,

  success: palette.green500,
  danger: palette.red500,
  warning: palette.yellow500,
  info: palette.blue500,
  successBg: '#F0FDF4',
  dangerBg: '#FEF2F2',
  warningBg: '#FFFBEB',
  infoBg: '#EFF6FF',

  buttonPrimary: palette.teal600,
  buttonPrimaryText: palette.white,
  buttonSecondary: palette.white,
  buttonSecondaryText: palette.teal600,
  buttonDanger: palette.red500,
  buttonDangerText: palette.white,
  inputBackground: palette.white,
  inputBorder: palette.gray300,
  inputText: palette.gray900,
  inputPlaceholder: palette.gray400,

  roleAdmin: palette.red500,
  roleInstructor: palette.teal600,
  roleStudent: palette.sky500,

  headerBackground: palette.teal600,
  headerText: palette.white,
  tabBarBackground: palette.white,
  tabBarActive: palette.teal600,
  tabBarInactive: palette.gray400,

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
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
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

  roleAdmin: palette.red500,
  roleInstructor: palette.teal500,
  roleStudent: palette.sky400,

  headerBackground: palette.gray900,
  headerText: palette.gray50,
  tabBarBackground: palette.gray900,
  tabBarActive: palette.teal500,
  tabBarInactive: palette.gray500,

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

// ── Platform-responsive helper ─────────────────────────────

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
  /** Platform-responsive helper */
  responsive: typeof responsive;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optionally force a default mode (for testing) */
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  // Resolve whether dark is active
  const isDark = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark';
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      if (prev === 'system') return isDark ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [isDark]);

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
      responsive,
    }),
    [colors, isDark, mode, toggle],
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
