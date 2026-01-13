/**
 * Web Navigation Header Component
 * Displays page title and back button for web screens
 */
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  // Only show on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      {showBackButton && onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
});
