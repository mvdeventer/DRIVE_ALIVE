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
import { useBreakpoint } from '../../hooks/useBreakpoint';
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
  /**
   * Decorative emoji or icon character. Hidden from assistive tech — screen
   * readers would otherwise announce it literally ("bar chart", "rocket").
   * If the icon carries the button's only meaning, pass `accessibilityLabel`.
   */
  icon?: string;
  /** Overrides the label announced to screen readers. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: any;
  textStyle?: any;
}

/** Best-effort readable label from children when none is given explicitly. */
function deriveLabel(children: React.ReactNode, label?: string): string | undefined {
  if (label) return label;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    const text = children.filter((c) => typeof c === 'string' || typeof c === 'number').join(' ');
    return text.trim() || undefined;
  }
  return undefined;
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
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, radii, fontFamilies } = useTheme();
  const { select } = useBreakpoint();

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
  // Sized by viewport, not platform: a phone-width browser window gets the
  // compact treatment, a tablet gets the roomy one.
  const sizeConfig: Record<ButtonSize, { py: number; px: number; fontSize: number }> = {
    sm: {
      py: select({ xs: 6, md: 8 })!,
      px: select({ xs: 12, md: 14 })!,
      fontSize: select({ xs: 12, md: 13 })!,
    },
    md: {
      py: select({ xs: 12, md: 14 })!,
      px: select({ xs: 18, md: 24 })!,
      fontSize: select({ xs: 15, md: 16 })!,
    },
    lg: {
      py: select({ xs: 16, md: 18 })!,
      px: select({ xs: 24, md: 32 })!,
      fontSize: select({ xs: 16, md: 18 })!,
    },
  };

  const sc = sizeConfig[size];
  const bg = bgColors[variant];
  const fg = textColors[variant];
  const resolvedLabel = accessibilityLabel ?? deriveLabel(children, label);

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      scaleValue={0.96}
      // Expands the touch target to the 44dp minimum without changing the
      // visual size — `sm` buttons are only ~30dp tall.
      hitSlop={MIN_TARGET_SLOP}
      style={[
        styles.base,
        {
          borderRadius: radii.md,
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
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={fg}
            style={styles.loader}
          />
        ) : icon ? (
          <Text
            style={[styles.icon, { fontSize: sc.fontSize }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
            // react-native-web maps this to aria-hidden
            {...({ 'aria-hidden': true } as any)}
          >
            {icon}
          </Text>
        ) : null}
        <Text
          style={[
            styles.text,
            {
              fontFamily: fontFamilies.semibold,
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

/** Extra touch area applied to every button so small variants stay reachable. */
const MIN_TARGET_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

const styles = StyleSheet.create({
  base: {
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
  // fontFamily comes from the theme's `fontFamilies` token at render time.
  text: {},
  icon: {
    marginRight: 2,
  },
  loader: {
    marginRight: 6,
  },
});
