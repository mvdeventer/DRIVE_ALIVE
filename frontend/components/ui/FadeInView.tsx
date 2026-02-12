/**
 * RoadReady FadeInView Component
 *
 * Wraps children with a fade-in + slide-up entrance animation on mount.
 * Uses react-native-reanimated for performant native-driven animations.
 *
 * Usage:
 *   <FadeInView>
 *     <Card>Content</Card>
 *   </FadeInView>
 *
 *   <FadeInView delay={200} slideDistance={30}>
 *     <Text>Staggered content</Text>
 *   </FadeInView>
 */

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  /** Delay before animation starts (ms). Default 0 */
  delay?: number;
  /** Duration of animation (ms). Default 400 */
  duration?: number;
  /** Pixels to slide up from. Default 16 */
  slideDistance?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FadeInView({
  children,
  delay = 0,
  duration = 400,
  slideDistance = 16,
  style,
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideDistance);

  useEffect(() => {
    const timingConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    opacity.value = withDelay(delay, withTiming(1, timingConfig));
    translateY.value = withDelay(delay, withTiming(0, timingConfig));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
