/**
 * RoadReady UI Button Component
 *
 * Modern, accessible button with variants, sizes, loading state,
 * and smooth spring press animation via react-native-reanimated.
 *
 * Usage:
 *   <Button variant="primary" onPress={handlePress}>Save</Button>
 *   <Button variant="outline" size="sm" loading>Loading...</Button>
 *   <Button variant="danger" icon="trash">Delete</Button>
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import AnimatedPressable from './AnimatedPressable';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: string; // Emoji or icon character
  style?: any;
  textStyle?: any;
}

export default function Button({
  children,
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, responsive } = useTheme();

  const isDisabled = disabled || loading;

  // ── Background Colors ──
  const bgColors: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimary,
    secondary: colors.backgroundSecondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.buttonDanger,
    accent: colors.accent,
  };

  // ── Text Colors ──
  const textColors: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimaryText,
    secondary: colors.text,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.buttonDangerText,
    accent: colors.textInverse,
  };

  // ── Size Config ──
  const sizeConfig: Record<ButtonSize, { py: number; px: number; fontSize: number }> = {
    sm: { py: responsive(8, 6), px: responsive(14, 12), fontSize: responsive(13, 12) },
    md: { py: responsive(14, 12), px: responsive(24, 18), fontSize: responsive(16, 15) },
    lg: { py: responsive(18, 16), px: responsive(32, 24), fontSize: responsive(18, 16) },
  };

  const sc = sizeConfig[size];
  const bg = bgColors[variant];
  const fg = textColors[variant];

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      scaleValue={0.96}
      style={[
        styles.base,
        {
          backgroundColor: isDisabled ? colors.border : bg,
          paddingVertical: sc.py,
          paddingHorizontal: sc.px,
          opacity: isDisabled ? 0.6 : 1,
          borderWidth: variant === 'outline' ? 2 : 0,
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={fg}
            style={styles.loader}
          />
        ) : icon ? (
          <Text style={[styles.icon, { fontSize: sc.fontSize }]}>{icon}</Text>
        ) : null}
        <Text
          style={[
            styles.text,
            {
              color: isDisabled ? colors.textTertiary : fg,
              fontSize: sc.fontSize,
            },
            textStyle,
          ]}
        >
          {children || label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
  },
  icon: {
    marginRight: 2,
  },
  loader: {
    marginRight: 6,
  },
});
