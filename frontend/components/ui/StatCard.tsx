/**
 * RoadReady StatCard Component
 *
 * Compact metric card for dashboards — icon, big number, and label.
 * Used on admin/instructor/student home screens.
 *
 * Usage:
 *   <StatCard icon="📊" value="142" label="Total Bookings" />
 *   <StatCard icon="💰" value="R12,400" label="Revenue" variant="accent" />
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type StatVariant = 'default' | 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'info';

interface StatCardProps {
  /** Decorative emoji — hidden from screen readers; `label` carries the meaning. */
  icon?: string;
  value: string | number;
  label: string;
  variant?: StatVariant;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
  style?: any;
}

export default function StatCard({
  icon,
  value,
  label,
  variant = 'default',
  onPress,
  accessibilityHint,
  testID,
  style,
}: StatCardProps) {
  const { colors, isDark, radii, elevation, withAlpha, fontFamilies } = useTheme();

  const variantColors: Record<StatVariant, { bg: string; accent: string }> = {
    default: { bg: colors.card, accent: colors.primary },
    primary: { bg: withAlpha(colors.primary, 0.07), accent: colors.primary },
    accent: { bg: withAlpha(colors.accent, 0.08), accent: colors.accent },
    success: { bg: withAlpha(colors.success, 0.07), accent: colors.success },
    danger: { bg: withAlpha(colors.danger, 0.07), accent: colors.danger },
    warning: { bg: withAlpha(colors.warning, 0.08), accent: colors.warning },
    info: { bg: withAlpha(colors.info, 0.07), accent: colors.info },
  };

  const v = variantColors[variant];

  const Wrapper = onPress ? Pressable : View;

  // Announce the tile as one unit: "142, Total Bookings" rather than the
  // emoji, the number and the label as three separate nodes.
  const a11yProps = {
    accessible: true,
    accessibilityLabel: `${value}, ${label}`,
    accessibilityHint,
    ...(onPress ? { accessibilityRole: 'button' as const } : {}),
  };

  return (
    <Wrapper
      onPress={onPress}
      testID={testID}
      {...a11yProps}
      style={({ pressed }: any) => [
        styles.card,
        !isDark ? elevation('sm') : null,
        {
          borderRadius: radii.lg,
          backgroundColor: v.bg,
          borderColor: isDark ? colors.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        pressed && onPress ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
        style,
      ]}
    >
      {icon ? (
        <Text
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no"
          {...({ 'aria-hidden': true } as any)}
        >
          {icon}
        </Text>
      ) : null}
      <Text
        style={[styles.value, { fontFamily: fontFamilies.bold, color: v.accent }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[styles.label, { fontFamily: fontFamilies.medium, color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Platform.OS === 'web' ? 18 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Platform.OS === 'web' ? 140 : 105,
    flexBasis: '30%',
    flexGrow: 1,
    maxWidth: '100%',
  },
  icon: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    marginBottom: 6,
  },
  value: {
    fontSize: Platform.OS === 'web' ? 26 : 22,
    marginBottom: 4,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 17 : 15,
  },
});
