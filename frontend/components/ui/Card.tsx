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
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
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
  /** Accessible name — required when the card is pressable. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: any;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  animate = false,
  delay = 0,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: CardProps) {
  const { colors, radii, elevation } = useTheme();
  const { select } = useBreakpoint();

  const paddingValues: Record<CardPadding, number> = {
    none: 0,
    sm: select({ xs: 10, md: 12 })!,
    md: select({ xs: 14, md: 16 })!,
    lg: select({ xs: 18, md: 24 })!,
  };

  const shadow =
    variant === 'elevated' ? elevation('md') : variant === 'default' ? elevation('sm') : null;

  const cardStyle = [
    styles.base,
    {
      borderRadius: radii.lg,
      backgroundColor:
        variant === 'filled' ? colors.backgroundSecondary : colors.card,
      padding: paddingValues[padding],
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: colors.border,
      ...(shadow ?? {}),
    },
    style,
  ];

  let content: React.ReactNode;

  if (onPress) {
    content = (
      <Pressable
        onPress={onPress}
        testID={testID}
        // Only claim the button role when the caller names the card as a single
        // actionable unit. react-native-web renders accessibilityRole="button"
        // as a real <button>, so an unconditional role nests <button> inside
        // <button> for any card that contains its own action buttons — invalid
        // HTML and a broken tab order.
        accessibilityRole={accessibilityLabel ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          ...cardStyle,
          { opacity: pressed ? 0.92 : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  } else {
    content = (
      <View style={cardStyle} testID={testID} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  if (animate) {
    return <FadeInView delay={delay}>{content}</FadeInView>;
  }

  return content as React.ReactElement;
}

const styles = StyleSheet.create({
  // borderRadius and the shadow come from theme tokens at render time.
  base: {
    overflow: 'hidden',
  },
});
