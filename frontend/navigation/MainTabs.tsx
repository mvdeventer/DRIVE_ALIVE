/**
 * Role-based tab navigator switcher.
 * Reads the current user role from AuthContext and renders the
 * appropriate bottom-tab navigator.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthActions } from './AuthContext';
import AdminTabs from './AdminTabs';
import CompanyAdminTabs from './CompanyAdminTabs';
import InstructorTabs from './InstructorTabs';
import StudentTabs from './StudentTabs';

function UnknownRoleGuard({ role, onLogout }: { role: string | null; onLogout: () => void }) {
  useEffect(() => {
    console.error(`[RoleGuard] Unsupported user role detected: ${role ?? 'null'}`);
  }, [role]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unsupported account role</Text>
      <Text style={styles.message}>
        Your session includes an unknown role and was blocked for safety.
      </Text>
      <Text style={styles.roleLabel}>Role: {role ?? 'none'}</Text>
      <Pressable onPress={onLogout} style={styles.button}>
        <Text style={styles.buttonText}>Return to login</Text>
      </Pressable>
    </View>
  );
}

export default function MainTabs() {
  const { userRole, onLogout } = useAuthActions();

  if (userRole === 'admin') return <AdminTabs />;
  if (userRole === 'company_admin') return <CompanyAdminTabs />;
  if (userRole === 'instructor') return <InstructorTabs />;
  if (userRole === 'student') return <StudentTabs />;
  return <UnknownRoleGuard role={userRole} onLogout={onLogout} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 10,
    maxWidth: 420,
  },
  roleLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
