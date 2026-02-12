/**
 * RoadReady SectionHeader Component
 *
 * Consistent typography for section titles with optional action button.
 *
 * Usage:
 *   <SectionHeader title="Upcoming Lessons" />
 *   <SectionHeader title="Statistics" subtitle="Last 30 days" action="View All" onAction={handleViewAll} />
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned link/button */
  action?: string;
  onAction?: () => void;
  style?: any;
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} style={{ padding: 8 }}>
          <Text style={[styles.action, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: 20,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    marginTop: 2,
  },
  action: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
