/**
 * Instructor Company Verification Screen
 * Accessed by a driving school owner via a deep link sent by the backend.
 * Lets the owner approve or reject a new instructor's membership request.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

export default function InstructorCompanyVerifyScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const token: string | null = route?.params?.token ?? null;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDecision = async (approve: boolean) => {
    if (!token) {
      setErrorMsg('Invalid link — no verification token provided.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.post('/verify/instructor/company', { token, approve });
      setResult(approve ? 'approved' : 'rejected');
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? err.message ?? 'An error occurred.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Login');
    }
  };

  // ── No token ──────────────────────────────────────────────
  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>❌</Text>
          <Text style={[styles.title, { color: colors.danger }]}>Invalid Link</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This verification link is missing a token. Please use the exact link sent to you.
          </Text>
          <Button label="Go to Login" onPress={goHome} variant="outline" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  // ── Result view ───────────────────────────────────────────
  if (result) {
    const approved = result === 'approved';
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{approved ? '✅' : '❌'}</Text>
          <Text style={[styles.title, { color: approved ? colors.success : colors.danger }]}>
            {approved ? 'Instructor Approved' : 'Instructor Rejected'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {approved
              ? 'The instructor has been approved to join your school. They will now go through final admin verification before they can accept bookings.'
              : 'The instructor has been declined. They have been notified.'}
          </Text>
          <Button label="Done" onPress={goHome} variant="primary" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  // ── Decision view ─────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.icon}>🏫</Text>
          <Text style={[styles.title, { color: colors.text }]}>New Instructor Request</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            An instructor has applied to join your driving school. Please review and approve or
            reject their membership request.
          </Text>

          {errorMsg && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.dangerBg, borderColor: colors.danger },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 32 }}
            />
          ) : (
            <View style={styles.buttons}>
              <Button
                label="✅ Approve"
                onPress={() => handleDecision(true)}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginBottom: 12 }}
              />
              <Button
                label="❌ Reject"
                onPress={() => handleDecision(false)}
                variant="danger"
                size="lg"
                fullWidth
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 60 : 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  icon: { fontSize: 72, marginBottom: 20 },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  buttons: { marginTop: 32, width: '100%' },
});
