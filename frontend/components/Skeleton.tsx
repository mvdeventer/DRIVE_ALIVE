/**
 * Skeleton — shimmering placeholder block.
 *
 * Use while loading data instead of a spinner. Reduces perceived latency.
 *
 *   {isLoading ? <Skeleton className="h-20 w-full" /> : <Card data={data} />}
 */
import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  /** NativeWind classes (e.g. "h-20 w-full rounded-md"). */
  className?: string;
  style?: ViewStyle;
}

export default function Skeleton({ className = '', style }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        className={`bg-neutral-300 dark:bg-neutral-700 rounded-md ${className}`}
        style={style}
      />
    </Animated.View>
  );
}
