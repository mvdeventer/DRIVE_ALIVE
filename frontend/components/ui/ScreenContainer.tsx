/**
 * RoadReady ScreenContainer Component
 *
 * Standard screen wrapper with safe area, scroll, pull-to-refresh, themed
 * background, and — via the `width` prop — a breakpoint-aware content cap so
 * layouts don't stretch edge-to-edge on a wide monitor. Use this as the root
 * of every screen instead of hand-rolling a `maxWidth` per screen.
 *
 * Usage:
 *   <ScreenContainer title="Dashboard" onRefresh={loadData} refreshing={loading}>
 *     {content}
 *   </ScreenContainer>
 *
 *   <ScreenContainer width="form">   // login, verify, payment result
 *   <ScreenContainer width="wide">   // dense tables, multi-column dashboards
 *   <ScreenContainer width="full">   // opt out of the cap entirely
 */

import React, { useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme, type ContentWidth } from '../../theme/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Enable pull-to-refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Scroll to top ref */
  scrollViewRef?: React.RefObject<ScrollView>;
  /** Extra padding at bottom for tab bars */
  bottomPadding?: number;
  /**
   * Max content width. Defaults to 'content' (960dp).
   * 'form' 480 · 'content' 960 · 'wide' 1280 · 'full' uncapped.
   */
  width?: ContentWidth;
  style?: any;
  contentContainerStyle?: any;
}

export default function ScreenContainer({
  children,
  onRefresh,
  refreshing = false,
  scrollViewRef,
  bottomPadding = 0,
  width = 'content',
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { colors, contentWidths } = useTheme();
  const { select } = useBreakpoint();
  const internalRef = useRef<ScrollView>(null);
  const ref = scrollViewRef || internalRef;

  const maxWidth = contentWidths[width];

  // Gutters grow with the viewport rather than only branching on platform.
  const paddingHorizontal = select({ xs: 16, md: 24, lg: 32 }) ?? 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <ScrollView
        ref={ref}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal, paddingBottom: bottomPadding + 20 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          ) : undefined
        }
      >
        <View style={[styles.inner, maxWidth !== undefined && { maxWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
});
