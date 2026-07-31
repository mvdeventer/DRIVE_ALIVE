/**
 * RoadReady TabBar Component
 *
 * Horizontal scrollable tabs with animated underline indicator.
 * Uses react-native-reanimated for smooth spring transitions.
 *
 * Usage:
 *   const tabs = ['Overview', 'Bookings', 'Earnings'];
 *   <TabBar tabs={tabs} activeTab={active} onTabPress={setActive} />
 */

import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';

interface TabBarProps {
  tabs: string[];
  activeTab: number;
  onTabPress: (index: number) => void;
  /** Stretch tabs to fill width (use for ≤4 tabs) */
  fullWidth?: boolean;
  /** Accessible name for the tab list, e.g. "Earnings sections". */
  accessibilityLabel?: string;
  style?: any;
}

export default function TabBar({
  tabs,
  activeTab,
  onTabPress,
  fullWidth = false,
  accessibilityLabel,
  style,
}: TabBarProps) {
  const { colors, isDark, fontFamilies } = useTheme();
  const activeIndex = useSharedValue(activeTab);

  useEffect(() => {
    activeIndex.value = withSpring(activeTab, {
      damping: 18,
      stiffness: 120,
    });
  }, [activeTab]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: isDark ? colors.backgroundSecondary : colors.background,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fullWidth ? styles.fullWidthContainer : styles.scrollContainer}
        accessibilityRole={Platform.OS === 'web' ? ('tablist' as any) : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => onTabPress(index)}
              accessibilityRole="tab"
              accessibilityLabel={tab}
              accessibilityState={{ selected: isActive }}
              {...({ 'aria-selected': isActive } as any)}
              style={({ pressed }) => [
                styles.tab,
                fullWidth && styles.tabFullWidth,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontFamily: isActive ? fontFamilies.semibold : fontFamilies.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {tab}
              </Text>
              {/* Underline indicator */}
              <View
                style={[
                  styles.indicator,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  scrollContainer: {
    paddingHorizontal: 4,
    gap: Platform.OS === 'web' ? 8 : 4,
  },
  fullWidthContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  tab: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 10,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabFullWidth: {
    flex: 1,
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    letterSpacing: 0.2,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: Platform.OS === 'web' ? 12 : 8,
    right: Platform.OS === 'web' ? 12 : 8,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
