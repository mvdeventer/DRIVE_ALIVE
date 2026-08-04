import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { useT } from '../../i18n';
import { API_BASE_URL } from '../../config';

/** How often to ask the server whether the account has been verified. */
const POLL_INTERVAL_MS = 5000;
/** Pause before moving to Login, so the user sees why the screen changed. */
const REDIRECT_DELAY_MS = 1800;

type Props = NativeStackScreenProps<any, 'VerificationPending'>;

export default function VerificationPendingScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const scrollViewRef = useRef<ScrollView>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [verified, setVerified] = useState(false);

  const {
    email,
    phone,
    firstName,
    emailSent = false,
    whatsappSent = false,
    expiryMinutes = 30,
  } = route.params || {};

  /**
   * Watch for the account being verified elsewhere.
   *
   * The link is usually opened on another device — the WhatsApp message lands
   * on the user's phone while this browser sits here — so there is no local
   * event to listen for. Polling the server is the only way this screen can
   * know, and without it the user is left staring at "check your email" after
   * they have already verified.
   *
   * Polling stops on success, on unmount, and once the link would have expired,
   * so a tab left open overnight does not keep hitting the API forever.
   */
  useEffect(() => {
    if (!email) return;

    let cancelled = false;
    const deadline = Date.now() + expiryMinutes * 60_000;

    const check = async () => {
      if (cancelled || Date.now() > deadline) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/verify/status?email=${encodeURIComponent(email)}`,
        );
        if (!res.ok) return;               // transient failure — try again next tick
        const data = await res.json();
        if (data?.verified && !cancelled) {
          setVerified(true);
          setTimeout(() => {
            if (!cancelled) navigation.replace('Login');
          }, REDIRECT_DELAY_MS);
        }
      } catch {
        // Offline or server restarting; the next tick retries.
      }
    };

    check();
    const id = setInterval(() => {
      if (Date.now() > deadline) {
        clearInterval(id);
        return;
      }
      check();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [email, expiryMinutes, navigation]);

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage('❌ Email not available');
      return;
    }

    setResendingEmail(true);
    setResendMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/verify/resend?email=` + encodeURIComponent(email), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResendMessage('✅ Verification links resent! Check your email and WhatsApp.');
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        const error = await response.json();
        setResendMessage(`❌ Failed: ${error.detail || 'Could not resend verification'}`);
      }
    } catch (error) {
      setResendMessage('❌ Network error. Please check your connection.');
      console.error('Resend error:', error);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.headerEmoji}>📧</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Verify Your Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Complete registration to start using the app
        </Text>
      </View>

      {/* Main Status — swaps to a success state the moment the link is used,
          which may happen on a different device. */}
      {verified ? (
        <View
          accessibilityRole="alert"
          style={[styles.statusBanner, { backgroundColor: colors.successBg, borderLeftColor: colors.success }]}
        >
          <Text style={[styles.statusText, { color: colors.success }]}>
            {t('verification.verifiedTitle')}
          </Text>
          <Text style={[styles.statusEmphasis, { color: colors.text }]}>
            {t('verification.redirecting')}
          </Text>
        </View>
      ) : (
        <View style={[styles.statusBanner, { backgroundColor: colors.infoBg, borderLeftColor: colors.primary }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            Registration successful! We've sent verification links to confirm it's really you.
          </Text>
          <Text style={[styles.statusEmphasis, { color: colors.text }]}>
            Please check your email and WhatsApp then click the verification link.
          </Text>
        </View>
      )}

      {/* Channels Card */}
      <Card variant="elevated" padding="md" style={styles.channelsCard}>
        <View style={styles.channelRow}>
          <Text style={styles.channelIcon}>✉️</Text>
          <View style={styles.channelContent}>
            <Text style={[styles.channelLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>{email}</Text>
            <Text style={{ fontSize: 12, color: emailSent ? colors.success : colors.warning, fontWeight: '500' }}>
              {emailSent ? '✅ Sent' : '⚠️ Not sent (check admin settings)'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.channelRow}>
          <Text style={styles.channelIcon}>💬</Text>
          <View style={styles.channelContent}>
            <Text style={[styles.channelLabel, { color: colors.textSecondary }]}>WhatsApp</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>{phone}</Text>
            <Text style={{ fontSize: 12, color: whatsappSent ? colors.success : colors.warning, fontWeight: '500' }}>
              {whatsappSent ? '✅ Sent' : '⚠️ Not sent (sandbox may require opt-in)'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Timer Warning */}
      <View style={[styles.warningBox, { backgroundColor: colors.warningBg, borderLeftColor: colors.warning }]}>
        <Text style={[styles.warningTitle, { color: colors.text }]}>⏰ Expires in {expiryMinutes} minutes</Text>
        <Text style={[styles.warningText, { color: colors.textSecondary }]}>
          After expiry, your account will be deleted and you'll need to register again.
        </Text>
      </View>

      {/* Steps */}
      <Card variant="outlined" padding="md" style={styles.stepsCard}>
        <Text style={[styles.stepsTitle, { color: colors.text }]}>What to do next:</Text>
        {[
          { num: '1', title: 'Check your email', desc: 'Look for a verification email' },
          { num: '2', title: 'Check WhatsApp', desc: `Message sent to ${phone}` },
          { num: '3', title: 'Click the link', desc: 'From either email or WhatsApp' },
          { num: '4', title: 'Log in', desc: 'After verification, log in to the app' },
        ].map((step) => (
          <View key={step.num} style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNum}>{step.num}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Resend feedback */}
      {resendMessage ? (
        <View
          style={[
            styles.resendFeedback,
            {
              backgroundColor: resendMessage.includes('✅') ? colors.successBg : colors.dangerBg,
              borderLeftColor: resendMessage.includes('✅') ? colors.success : colors.danger,
            },
          ]}
        >
          <Text style={[styles.resendFeedbackText, { color: colors.text }]}>{resendMessage}</Text>
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttons}>
        <Button
          label={resendingEmail ? 'Resending…' : 'Resend Verification'}
          onPress={handleResendVerification}
          loading={resendingEmail}
          disabled={resendingEmail}
          variant="accent"
          fullWidth
        />
        <Button
          label="← Back to Login"
          onPress={() => navigation.replace('Login')}
          variant="outline"
          fullWidth
        />
      </View>

      {/* Footer Notes */}
      <View style={[styles.footer, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.textTertiary }]}>
        <Text style={[styles.footerTitle, { color: colors.text }]}>Important Notes:</Text>
        <Text style={[styles.footerItem, { color: colors.textSecondary }]}>
          • You cannot log in until your account is verified
        </Text>
        <Text style={[styles.footerItem, { color: colors.textSecondary }]}>
          • Links are valid for {expiryMinutes} minutes only
        </Text>
        <Text style={[styles.footerItem, { color: colors.textSecondary }]}>
          • Check spam/junk folder if you don't see the email
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    padding: Platform.OS === 'web' ? 40 : 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerEmoji: { fontSize: 36 },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
  },
  statusBanner: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontWeight: '500',
    lineHeight: 21,
  },
  statusEmphasis: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    marginTop: 6,
  },
  channelsCard: { marginBottom: 20 },
  channelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelIcon: { fontSize: 24, marginTop: 2 },
  channelContent: { flex: 1 },
  channelLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  channelValue: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  divider: { height: 1, marginVertical: 12 },
  warningBox: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  warningText: { fontSize: 13, lineHeight: 19 },
  stepsCard: { marginBottom: 20 },
  stepsTitle: { fontSize: 15, fontWeight: '600', marginBottom: 14 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, justifyContent: 'center' },
  stepTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  stepDesc: { fontSize: 12, lineHeight: 17 },
  resendFeedback: {
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  resendFeedbackText: { fontSize: 13, fontWeight: '500' },
  buttons: { gap: 10, marginBottom: 24 },
  footer: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  footerTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  footerItem: { fontSize: 12, lineHeight: 19, marginBottom: 3 },
});
