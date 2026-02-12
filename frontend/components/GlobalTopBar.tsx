/**
 * Global Top Bar Component
 * Displays user role, name, dark-mode toggle, and logout button.
 * Fixed at the top on web; hidden on native (native uses header).
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface GlobalTopBarProps {
  userName: string;
  userRole: string | null;
  onLogout: () => void;
}

export default function GlobalTopBar({ userName, userRole, onLogout }: GlobalTopBarProps) {
  const { colors, isDark, toggle } = useTheme();

  // Only show on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const getRoleDisplay = (role: string | null) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleColor = (role: string | null) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return colors.roleAdmin;
      case 'instructor':
        return colors.roleInstructor;
      case 'student':
        return colors.roleStudent;
      default:
        return colors.textSecondary;
    }
  };

  // Fixed positioning for web
  const webStyles = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  };

  return (
    <View style={[styles.container, { backgroundColor: getRoleColor(userRole) }, webStyles]}>
      {/* Left: user info */}
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRole}>{getRoleDisplay(userRole)}</Text>
        </View>
      </View>

      {/* Right: actions */}
      <View style={styles.actions}>
        {/* Dark-mode toggle */}
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          accessibilityRole="button"
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color="#fff"
          />
        </Pressable>

        {/* Logout */}
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          accessibilityLabel="Logout"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.20)',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  userDetails: {
    justifyContent: 'center' as const,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    letterSpacing: 0.2,
  },
  userRole: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});
