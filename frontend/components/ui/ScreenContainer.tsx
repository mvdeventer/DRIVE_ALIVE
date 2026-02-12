/**
 * RoadReady ScreenContainer Component
 *
 * Standard screen wrapper with safe area, scroll, pull-to-refresh,
 * and themed background. Use this as the root of every screen.
 *
 * Usage:
 *   <ScreenContainer title="Dashboard" onRefresh={loadData} refreshing={loading}>
 *     {content}
 *   </ScreenContainer>
 */

import React, { useRef } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Enable pull-to-refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Scroll to top ref */
  scrollViewRef?: React.RefObject<ScrollView>;
  /** Extra padding at bottom for tab bars */
  bottomPadding?: number;
  style?: any;
  contentContainerStyle?: any;
}

export default function ScreenContainer({
  children,
  onRefresh,
  refreshing = false,
  scrollViewRef,
  bottomPadding = 0,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { colors } = useTheme();
  const internalRef = useRef<ScrollView>(null);
  const ref = scrollViewRef || internalRef;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <ScrollView
        ref={ref}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 20 },
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
        {children}
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
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingTop: 16,
  },
});
