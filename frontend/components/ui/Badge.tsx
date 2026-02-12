/**
 * RoadReady UI Badge Component
 *
 * Small pill-shaped label for status, roles, counts.
 *
 * Usage:
 *   <Badge variant="success">Active</Badge>
 *   <Badge variant="warning" size="sm">Pending</Badge>
 *   <Badge variant="role-admin">Admin</Badge>
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type BadgeVariant =
  | 'primary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'role-admin'
  | 'role-instructor'
  | 'role-student';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: any;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  style,
}: BadgeProps) {
  const { colors, responsive } = useTheme();

  const bgMap: Record<BadgeVariant, string> = {
    primary: colors.primary + '20',
    accent: colors.accent + '20',
    success: colors.successBg,
    danger: colors.dangerBg,
    warning: colors.warningBg,
    info: colors.infoBg,
    neutral: colors.backgroundSecondary,
    'role-admin': colors.roleAdmin + '20',
    'role-instructor': colors.roleInstructor + '20',
    'role-student': colors.roleStudent + '20',
  };

  const fgMap: Record<BadgeVariant, string> = {
    primary: colors.primary,
    accent: colors.accentDark,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
    neutral: colors.textSecondary,
    'role-admin': colors.roleAdmin,
    'role-instructor': colors.roleInstructor,
    'role-student': colors.roleStudent,
  };

  const sizeConfig = {
    sm: { py: 2, px: 8, fontSize: responsive(10, 9) },
    md: { py: 4, px: 10, fontSize: responsive(12, 11) },
  };

  const sc = sizeConfig[size];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          paddingVertical: sc.py,
          paddingHorizontal: sc.px,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: fgMap[variant],
            fontSize: sc.fontSize,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
