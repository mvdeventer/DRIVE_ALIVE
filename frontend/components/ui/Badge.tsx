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
import { useBreakpoint } from '../../hooks/useBreakpoint';

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
  /**
   * Accessible name. Badge text is rendered uppercase via CSS, so screen
   * readers may spell it out letter by letter — pass the sentence-case
   * wording here when the badge text is an acronym or all-caps status.
   */
  accessibilityLabel?: string;
  testID?: string;
  style?: any;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  accessibilityLabel,
  testID,
  style,
}: BadgeProps) {
  const { colors, radii, withAlpha, fontFamilies } = useTheme();
  const { select } = useBreakpoint();

  const bgMap: Record<BadgeVariant, string> = {
    primary: withAlpha(colors.primary, 0.125),
    accent: withAlpha(colors.accent, 0.125),
    success: colors.successBg,
    danger: colors.dangerBg,
    warning: colors.warningBg,
    info: colors.infoBg,
    neutral: colors.backgroundSecondary,
    'role-admin': withAlpha(colors.roleAdmin, 0.125),
    'role-instructor': withAlpha(colors.roleInstructor, 0.125),
    'role-student': withAlpha(colors.roleStudent, 0.125),
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
    sm: { py: 2, px: 8, fontSize: select({ xs: 9, md: 10 })! },
    md: { py: 4, px: 10, fontSize: select({ xs: 11, md: 12 })! },
  };

  const sc = sizeConfig[size];
  const resolvedLabel =
    accessibilityLabel ?? (typeof children === 'string' ? children : undefined);

  return (
    <View
      accessible
      accessibilityLabel={resolvedLabel}
      testID={testID}
      style={[
        styles.base,
        {
          borderRadius: radii.full,
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
            fontFamily: fontFamilies.semibold,
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
    alignSelf: 'flex-start',
  },
  text: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
