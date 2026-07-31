/**
 * useBreakpoint — the app's single source of viewport-derived layout values.
 *
 * Built on useWindowDimensions() so it re-renders on browser resize, window
 * snapping, and device rotation. This is the fix for the two classes of bug
 * this codebase had:
 *
 *   1. `responsive(web, mobile)` from the theme branches on *platform*, so a
 *      1920px desktop and a 390px mobile browser received identical values.
 *   2. `Dimensions.get('window').width` read at module scope or inside
 *      StyleSheet.create() is evaluated once at import and freezes the layout
 *      at whatever width the app happened to load at.
 *
 * Usage:
 *   const { isDesktop, select } = useBreakpoint();
 *   const columns = select({ xs: 1, md: 2, lg: 3 });
 *
 * Rule: never put a value derived from this hook inside StyleSheet.create.
 * Pass it as an inline style: `style={[styles.grid, { gap }]}`.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { breakpoints, type Breakpoint } from '../theme/ThemeContext';

/** Ascending order — must match the numeric order of `breakpoints`. */
export const BREAKPOINT_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export interface BreakpointInfo {
  width: number;
  height: number;
  /** The largest breakpoint whose min-width the viewport satisfies. */
  bp: Breakpoint;
  /** < 768dp — phones. Bottom tab bar, single column. */
  isPhone: boolean;
  /** 768–1023dp — tablets and split-screen windows. */
  isTablet: boolean;
  /** >= 1024dp — laptops and desktops. */
  isDesktop: boolean;
  isLandscape: boolean;
  /**
   * Pick the value for the current width from a partial breakpoint map,
   * cascading downwards like CSS min-width media queries.
   *
   *   select({ xs: 1, md: 2, lg: 3 })  // 800dp wide → 2
   */
  select: <T>(values: Partial<Record<Breakpoint, T>>) => T | undefined;
  /** True when the viewport is at least `bp` wide. */
  up: (bp: Breakpoint) => boolean;
  /** True when the viewport is narrower than `bp`. */
  down: (bp: Breakpoint) => boolean;
}

/** Resolve a width in dp to its breakpoint name. Exported for tests. */
export function resolveBreakpoint(width: number): Breakpoint {
  let match: Breakpoint = 'xs';
  for (const name of BREAKPOINT_ORDER) {
    if (width >= breakpoints[name]) match = name;
  }
  return match;
}

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  return useMemo<BreakpointInfo>(() => {
    const bp = resolveBreakpoint(width);
    const currentIndex = BREAKPOINT_ORDER.indexOf(bp);

    const select = <T,>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
      // Walk down from the current breakpoint to the first defined value.
      for (let i = currentIndex; i >= 0; i--) {
        const candidate = values[BREAKPOINT_ORDER[i]];
        if (candidate !== undefined) return candidate;
      }
      // Nothing at or below the current width — fall back to the smallest
      // value that was defined, so a caller passing only { lg: x } still
      // gets something on a phone.
      for (let i = currentIndex + 1; i < BREAKPOINT_ORDER.length; i++) {
        const candidate = values[BREAKPOINT_ORDER[i]];
        if (candidate !== undefined) return candidate;
      }
      return undefined;
    };

    return {
      width,
      height,
      bp,
      isPhone: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
      isLandscape: width > height,
      select,
      up: (target: Breakpoint) => width >= breakpoints[target],
      down: (target: Breakpoint) => width < breakpoints[target],
    };
  }, [width, height]);
}

export default useBreakpoint;
