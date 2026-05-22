/**
 * PressableScale — Pressable with spring scale + haptic feedback.
 *
 * Drop-in replacement for TouchableOpacity / Pressable:
 *   <PressableScale onPress={book} className="bg-brand p-4 rounded-xl">
 *     <Text className="text-white">Book lesson</Text>
 *   </PressableScale>
 *
 * - Mobile: spring scale + haptic tap
 * - Web: spring scale only (haptics silently no-op)
 */
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type HapticStrength = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export interface PressableScaleProps extends PressableProps {
  /** Haptic feedback style. Set to undefined to disable. */
  haptic?: HapticStrength;
  /** Target scale on press. Default 0.96. */
  scaleTo?: number;
}

function triggerHaptic(strength: HapticStrength) {
  if (Platform.OS === 'web') return;
  switch (strength) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export default function PressableScale({
  haptic = 'light',
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...rest}
        android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
        onPressIn={(e) => {
          scale.value = withSpring(scaleTo, { damping: 15, stiffness: 250 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 15, stiffness: 250 });
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic) triggerHaptic(haptic);
          onPress?.(e);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
