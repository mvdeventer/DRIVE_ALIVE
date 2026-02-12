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
  icon?: string;
  value: string | number;
  label: string;
  variant?: StatVariant;
  onPress?: () => void;
  style?: any;
}

export default function StatCard({
  icon,
  value,
  label,
  variant = 'default',
  onPress,
  style,
}: StatCardProps) {
  const { colors, isDark } = useTheme();

  const variantColors: Record<StatVariant, { bg: string; accent: string }> = {
    default: { bg: colors.card, accent: colors.primary },
    primary: { bg: colors.primary + '12', accent: colors.primary },
    accent: { bg: colors.accent + '15', accent: colors.accent },
    success: { bg: colors.success + '12', accent: colors.success },
    danger: { bg: colors.danger + '12', accent: colors.danger },
    warning: { bg: colors.warning + '15', accent: colors.warning },
    info: { bg: colors.info + '12', accent: colors.info },
  };

  const v = variantColors[variant];

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.card,
        {
          backgroundColor: v.bg,
          borderColor: isDark ? colors.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
          ...(Platform.OS === 'web'
            ? { boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)' }
            : !isDark
              ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
              : {}),
        },
        pressed && onPress ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
        style,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        style={[
          styles.value,
          { color: v.accent },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          { color: colors.textSecondary },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
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
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 17 : 15,
  },
});
