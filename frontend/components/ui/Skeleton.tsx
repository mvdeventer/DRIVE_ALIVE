/**
 * RoadReady Skeleton Component
 *
 * Shimmer/pulse loading placeholder using react-native-reanimated.
 * Use while data is loading to prevent layout shift and show progress.
 *
 * Usage:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton width="100%" height={120} radius={12} />
 *   <Skeleton circle size={48} />
 *
 * Presets:
 *   <Skeleton.Text lines={3} />
 *   <Skeleton.Card />
 *   <Skeleton.Avatar />
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';

interface SkeletonProps {
  /** Width in pixels or percentage string. Default '100%' */
  width?: number | string;
  /** Height in pixels. Default 16 */
  height?: number;
  /** Border radius. Default 6 */
  radius?: number;
  /** Render as circle (overrides width/height/radius) */
  circle?: boolean;
  /** Circle diameter when circle=true. Default 40 */
  size?: number;
  /** Additional margin bottom. Default 8 */
  spacing?: number;
  style?: any;
}

function SkeletonBase({
  width = '100%',
  height = 16,
  radius = 6,
  circle = false,
  size = 40,
  spacing = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.4, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // infinite
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseColor = isDark ? colors.border : colors.backgroundSecondary;

  if (circle) {
    return (
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: baseColor,
            marginBottom: spacing,
          },
          animatedStyle,
          style,
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: baseColor,
          marginBottom: spacing,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ── Presets ──

/** Multiple text line skeletons */
function SkeletonText({ lines = 3, spacing = 8 }: { lines?: number; spacing?: number }) {
  return (
    <View>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
          spacing={spacing}
        />
      ))}
    </View>
  );
}

/** Card-shaped skeleton placeholder */
function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <SkeletonBase width="40%" height={18} spacing={12} />
      <SkeletonText lines={2} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <SkeletonBase width={80} height={32} radius={8} spacing={0} />
        <SkeletonBase width={80} height={32} radius={8} spacing={0} />
      </View>
    </View>
  );
}

/** Circular avatar skeleton */
function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <SkeletonBase circle size={size} />;
}

/** Row with avatar + text */
function SkeletonRow() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <SkeletonAvatar size={44} />
      <View style={{ flex: 1 }}>
        <SkeletonBase width="70%" height={14} spacing={6} />
        <SkeletonBase width="45%" height={12} spacing={0} />
      </View>
    </View>
  );
}

/** Stat card grid skeleton */
function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            minWidth: 120,
          }}
        >
          <SkeletonBase height={80} radius={12} spacing={0} />
        </View>
      ))}
    </View>
  );
}

// Attach presets as static properties
const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Card: SkeletonCard,
  Avatar: SkeletonAvatar,
  Row: SkeletonRow,
  StatGrid: SkeletonStatGrid,
});

export default Skeleton;
