/**
 * Web Navigation Header Component
 * Displays page title and back button for web screens
 */
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface WebNavigationHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function WebNavigationHeader({
  title,
  onBack,
  showBackButton = true,
}: WebNavigationHeaderProps) {
  const { colors } = useTheme();

  // Only show on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      style={{
        height: 56,
        backgroundColor: colors.headerBackground,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        boxShadow: `0 2px 4px ${colors.shadowColor}`,
      }}
    >
      {showBackButton && onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            borderRadius: 8,
            marginRight: 12,
          })}
        >
          <Ionicons name="arrow-back" size={18} color={colors.headerText} style={{ marginRight: 4 }} />
          <Text style={{ color: colors.headerText, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            Back
          </Text>
        </Pressable>
      )}
      <Text
        style={{
          color: colors.headerText,
          fontSize: 18,
          fontFamily: 'Inter_700Bold',
          flex: 1,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
