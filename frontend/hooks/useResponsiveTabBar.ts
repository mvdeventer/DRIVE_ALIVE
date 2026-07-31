/**
 * useResponsiveTabBar — switches between bottom tabs (mobile / narrow web)
 * and a left-side sidebar (wide web ≥ 768px) using the v7
 * `tabBarPosition` prop on BottomTabNavigator.
 *
 *   const { tabBarPosition, tabBarStyle } = useResponsiveTabBar(colors);
 *   <Tab.Navigator screenOptions={{ tabBarPosition, tabBarStyle, ... }}>
 */
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { breakpoints } from '../theme/ThemeContext';
import { useBreakpoint } from './useBreakpoint';

/**
 * Width at which the bottom tab bar becomes a left nav rail.
 * Aliased to the shared `md` token so the rail and the content layout
 * (ScreenContainer, grid columns) always switch at the same width.
 */
export const SIDEBAR_BREAKPOINT = breakpoints.md;

export interface ResponsiveTabBar {
  isSidebar: boolean;
  tabBarPosition: 'bottom' | 'left';
  tabBarStyle: Record<string, unknown>;
}

interface ThemeColors {
  tabBarBackground: string;
  border: string;
}

export function useResponsiveTabBar(colors: ThemeColors): ResponsiveTabBar {
  const { up } = useBreakpoint();
  // Native keeps the bottom tab bar at every size; the rail is web-only.
  const isSidebar = Platform.OS === 'web' && up('md');

  return useMemo<ResponsiveTabBar>(() => {
    if (isSidebar) {
      return {
        isSidebar: true,
        tabBarPosition: 'left',
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderRightColor: colors.border,
          borderRightWidth: 1,
          width: 220,
          paddingTop: 16,
        },
      };
    }
    return {
      isSidebar: false,
      tabBarPosition: 'bottom',
      tabBarStyle: {
        backgroundColor: colors.tabBarBackground,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: Platform.OS === 'web' ? 56 : undefined,
        paddingBottom: Platform.OS === 'web' ? 4 : undefined,
      },
    };
  }, [isSidebar, colors.tabBarBackground, colors.border]);
}
