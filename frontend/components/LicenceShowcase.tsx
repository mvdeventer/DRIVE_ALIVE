/**
 * LicenceShowcase — cycles through the SA licence codes RoadReady teaches.
 *
 * For each code it states the code boldly, swaps the vehicle, and drives that
 * vehicle in from the left. Built for the login hero, where the goal is to tell
 * an anonymous visitor what the product covers within a couple of seconds.
 *
 * Motion follows the "purposeful motion" line rather than constant movement:
 * one element moves at a time, on a slow cycle, and everything stops when the
 * viewer has asked for reduced motion (OS setting on native,
 * `prefers-reduced-motion` on web) — in which case the codes still rotate, they
 * just cross-fade instead of driving.
 *
 * Accessibility: the whole block is one live region announcing
 * "Code B — Light motor vehicle"; the emoji is decorative and hidden.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n';

/** Codes in the order the SA licence ladder is usually explained. */
export const SHOWCASE_LICENCES = [
  { code: 'A1', vehicle: '🛵' },
  { code: 'A', vehicle: '🏍️' },
  { code: 'B', vehicle: '🚗' },
  { code: 'EB', vehicle: '🚙' },
  { code: 'C1', vehicle: '🚐' },
  { code: 'EC1', vehicle: '🚚' },
  { code: 'C', vehicle: '🚌' },
  { code: 'EC', vehicle: '🚛' },
] as const;

/** Trailer codes get a hitch glyph so EB/EC1/EC read differently from B/C1/C. */
const TRAILER_CODES = new Set(['EB', 'EC1', 'EC']);

const CYCLE_MS = 3200;

interface Props {
  /** Colour for the code text; defaults to the theme's inverse text. */
  color?: string;
  /** Muted colour for the descriptor line. */
  mutedColor?: string;
  /** Compact sizing, for short heroes. Default true. */
  compact?: boolean;
}

export default function LicenceShowcase({ color, mutedColor, compact = true }: Props) {
  const { colors, fontFamilies, radii, withAlpha } = useTheme();
  const t = useT();
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const driveX = useSharedValue(0);
  const fade = useSharedValue(1);

  // Respect the viewer's motion preference on both platforms.
  useEffect(() => {
    let alive = true;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals -- guarded to web
      const mq = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
      if (mq) {
        setReduceMotion(mq.matches);
        const onChange = (e: MediaQueryListEvent) => alive && setReduceMotion(e.matches);
        mq.addEventListener('change', onChange);
        return () => { alive = false; mq.removeEventListener('change', onChange); };
      }
      return () => { alive = false; };
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      alive && setReduceMotion(v),
    );
    return () => { alive = false; sub?.remove?.(); };
  }, []);

  // Advance the cycle, animating the swap unless motion is reduced.
  useEffect(() => {
    const timer = setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % SHOWCASE_LICENCES.length);
        return;
      }
      // Drive out to the right, swap, then drive back in from the left.
      fade.value = withTiming(0, { duration: 260 });
      driveX.value = withTiming(140, { duration: 300 });
      setTimeout(() => {
        setIndex((i) => (i + 1) % SHOWCASE_LICENCES.length);
        driveX.value = -140;
        fade.value = withDelay(40, withTiming(1, { duration: 300 }));
        driveX.value = withDelay(40, withSpring(0, { damping: 14, stiffness: 110 }));
      }, 300);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, driveX, fade]);

  // A gentle idle bob so the vehicle reads as "running" between swaps.
  const idle = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) { idle.value = 0; return; }
    idle.value = withSequence(
      withTiming(-2, { duration: 700 }),
      withTiming(0, { duration: 700 }),
    );
  }, [index, reduceMotion, idle]);

  const vehicleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: driveX.value }, { translateY: idle.value }],
    opacity: fade.value,
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const current = SHOWCASE_LICENCES[index];
  const descriptor = t(`licences.${current.code}`);
  const codeColor = color ?? colors.textInverse;
  // Solid, not alpha-muted: 0.85 alpha composited to #dbece9 over the hero
  // teal and measured 3.68:1, below the AA 4.5:1 floor.
  const subColor = mutedColor ?? colors.textInverse;

  // One announcement for the whole block rather than three fragments.
  const a11yLabel = useMemo(
    () => `${t('licences.heading')}. Code ${current.code} — ${descriptor}`,
    [t, current.code, descriptor],
  );

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11yLabel}
    >
      <Animated.View style={[styles.vehicleRow, vehicleStyle]}>
        <Text
          style={[styles.vehicle, compact && styles.vehicleCompact]}
          accessibilityElementsHidden
          importantForAccessibility="no"
          {...({ 'aria-hidden': true } as any)}
        >
          {current.vehicle}
          {TRAILER_CODES.has(current.code) ? '🛻' : ''}
        </Text>
      </Animated.View>

      <Animated.View style={textStyle}>
        <View
          style={[
            styles.codePill,
            compact && styles.codePillCompact,
            // Darkening tint. A white 0.16 overlay lifted the pill to #339987,
            // and at the compact 16px size the code counts as normal text
            // (needs 4.5:1, measured 3.47). The hero is a fixed teal scene, so
            // this tint is scene-relative rather than theme-relative.
            { backgroundColor: 'rgba(0, 0, 0, 0.28)', borderRadius: radii.full },
          ]}
        >
          <Text
            style={[
              styles.code,
              compact && styles.codeCompact,
              { color: codeColor, fontFamily: fontFamilies.bold },
            ]}
          >
            CODE {current.code}
          </Text>
        </View>
        <Text
          style={[
            styles.descriptor,
            compact && styles.descriptorCompact,
            { color: subColor, fontFamily: fontFamilies.medium },
          ]}
          numberOfLines={1}
        >
          {descriptor}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  vehicle: {
    fontSize: 46,
    lineHeight: 54,
  },
  codePill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 2,
  },
  code: {
    fontSize: 26,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  descriptor: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Compact variant, for half-height heroes ──
  vehicleCompact: {
    fontSize: 26,
    lineHeight: 30,
  },
  codePillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 1,
    marginTop: 0,
  },
  codeCompact: {
    fontSize: 16,
    letterSpacing: 1.1,
  },
  descriptorCompact: {
    fontSize: 10,
    marginTop: 1,
  },
});
