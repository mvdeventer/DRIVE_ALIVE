/**
 * Global Top Bar Component
 * Displays user role and name with logout button
 * Fixed at the top of all web pages
 */
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GlobalTopBarProps {
  userName: string;
  userRole: string | null;
  onLogout: () => void;
}

export default function GlobalTopBar({ userName, userRole, onLogout }: GlobalTopBarProps) {
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
        return '#FF6B6B'; // Red
      case 'instructor':
        return '#4ECDC4'; // Teal
      case 'student':
        return '#45B7D1'; // Blue
      default:
        return '#6C757D'; // Gray
    }
  };

  // Apply fixed positioning via inline style for web
  const webStyles =
    Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }
      : {};

  return (
    <View style={[styles.container, { backgroundColor: getRoleColor(userRole) }, webStyles]}>
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRole}>{getRoleDisplay(userRole)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
