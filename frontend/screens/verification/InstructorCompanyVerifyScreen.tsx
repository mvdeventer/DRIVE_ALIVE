/**
 * Instructor Company Verification Screen
 * Accessed by a driving school owner via a deep link sent by the backend.
 * Lets the owner approve or reject a new instructor's membership request.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';
import { useExitToLoginRef } from '../../utils/exitToLogin';

// The owner is finished with the app once they have answered; hold the outcome
// on screen long enough to read, then hand them the login screen.
const AUTO_EXIT_SECONDS = 5;

export default function InstructorCompanyVerifyScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const token: string | null = route?.params?.token ?? null;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_EXIT_SECONDS);

  const handleDecision = async (approve: boolean) => {
    if (!token) {
      setErrorMsg(t('companyVerify.noToken'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.post('/verify/instructor/company', { token, approve });
      setResult(approve ? 'approved' : 'rejected');
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? err.message ?? t('common.error');
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const exitRef = useExitToLoginRef(navigation);

  // Count down out loud, so the redirect is expected rather than startling.
  useEffect(() => {
    if (!result) { return; }
    setSecondsLeft(AUTO_EXIT_SECONDS);
    const tick = setInterval(() => setSecondsLeft(n => Math.max(0, n - 1)), 1000);
    const exit = setTimeout(() => exitRef.current(), AUTO_EXIT_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(exit);
    };
    // `exitRef` is a ref and `AUTO_EXIT_SECONDS` a constant, so the outcome is
    // the only thing that should ever restart the countdown.
  }, [result]);

  const goToLogin = () => exitRef.current();

  // ── No token ──────────────────────────────────────────────
  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>❌</Text>
          <Text style={[styles.title, { color: colors.danger }]}>
            {t('companyVerify.invalidTitle')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('companyVerify.invalidBody')}
          </Text>
          <Button
            label={t('companyVerify.goToLogin')}
            onPress={goToLogin}
            variant="outline"
            style={{ marginTop: 24 }}
          />
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
            {approved ? t('companyVerify.approvedTitle') : t('companyVerify.rejectedTitle')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {approved ? t('companyVerify.approvedBody') : t('companyVerify.rejectedBody')}
          </Text>
          <Button
            label={t('misc.done')}
            onPress={goToLogin}
            variant="primary"
            style={{ marginTop: 24 }}
          />
          <Text style={[styles.countdown, { color: colors.textTertiary }]}>
            {t('companyVerify.returningIn', { seconds: secondsLeft })}
          </Text>
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
          <Text style={[styles.title, { color: colors.text }]}>
            {t('companyVerify.requestTitle')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('companyVerify.requestBody')}
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
                label={t('companyVerify.approve')}
                onPress={() => handleDecision(true)}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginBottom: 12 }}
              />
              <Button
                label={t('companyVerify.reject')}
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
  countdown: { fontSize: 13, marginTop: 14, textAlign: 'center' },
  buttons: { marginTop: 32, width: '100%' },
});
