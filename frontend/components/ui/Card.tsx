/**
 * RoadReady UI Card Component
 *
 * Elevated container with rounded corners, optional press behavior,
 * and optional fade-in entrance animation.
 * Adapts to light/dark mode via theme context.
 *
 * Usage:
 *   <Card>Content here</Card>
 *   <Card variant="elevated" onPress={handle}>Tappable card</Card>
 *   <Card variant="outlined" padding="lg">Outlined card</Card>
 *   <Card animate delay={100}>Animated entrance</Card>
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import FadeInView from './FadeInView';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  /** Enable fade-in + slide-up entrance animation */
  animate?: boolean;
  /** Animation delay in ms (for staggered lists) */
  delay?: number;
  style?: any;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  animate = false,
  delay = 0,
  style,
}: CardProps) {
  const { colors, responsive, isDark } = useTheme();

  const paddingValues: Record<CardPadding, number> = {
    none: 0,
    sm: responsive(12, 10),
    md: responsive(16, 14),
    lg: responsive(24, 18),
  };

  const cardStyle = [
    styles.base,
    {
      backgroundColor:
        variant === 'filled' ? colors.backgroundSecondary : colors.card,
      padding: paddingValues[padding],
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: colors.border,
      ...(variant === 'elevated' && Platform.OS === 'web'
        ? { boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)' }
        : {}),
      ...(variant === 'elevated' && Platform.OS !== 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 6,
            elevation: 3,
          }
        : {}),
      ...(variant === 'default' && Platform.OS === 'web'
        ? { boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }
        : {}),
      ...(variant === 'default' && Platform.OS !== 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 3,
            elevation: 1,
          }
        : {}),
    },
    style,
  ];

  let content: React.ReactNode;

  if (onPress) {
    content = (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          { opacity: pressed ? 0.92 : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  } else {
    content = <View style={cardStyle}>{children}</View>;
  }

  if (animate) {
    return <FadeInView delay={delay}>{content}</FadeInView>;
  }

  return content as React.ReactElement;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
