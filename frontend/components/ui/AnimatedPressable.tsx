/**
 * RoadReady AnimatedPressable Component
 *
 * Pressable wrapper with smooth spring scale animation on press
 * using react-native-reanimated. Drop-in replacement for Pressable
 * when you want tactile press feedback.
 *
 * Usage:
 *   <AnimatedPressable onPress={handle} scaleValue={0.96}>
 *     <Text>Tap me</Text>
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** Scale value when pressed (0–1). Default 0.96 */
  scaleValue?: number;
  /** Spring damping. Higher = less bouncy. Default 15 */
  damping?: number;
  /** Spring stiffness. Default 150 */
  stiffness?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedPressable({
  scaleValue = 0.96,
  damping = 15,
  stiffness = 150,
  onPressIn,
  onPressOut,
  children,
  style,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleValue, { damping, stiffness });
      onPressIn?.(e);
    },
    [scaleValue, damping, stiffness, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping, stiffness });
      onPressOut?.(e);
    },
    [damping, stiffness, onPressOut]
  );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
