/**
 * Instructor Verification Landing Screen
 * Accessed when admin clicks the verification link in email or WhatsApp.
 * Shows instructor details derived from the token and lets the admin
 * approve or reject the registration before any state changes.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenState = 'decision' | 'loading' | 'success' | 'error';
type OutcomeType = 'verified' | 'pending_company' | 'rejected' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveOutcome(data: any, approve: boolean): OutcomeType {
  if (data.outcome === 'verified') { return 'verified'; }
  if (data.outcome === 'pending_company') { return 'pending_company'; }
  if (data.outcome === 'rejected') { return 'rejected'; }
  return approve ? 'verified' : 'rejected';
}

function resolveMessage(data: any, approve: boolean): string {
  if (data.message) { return data.message; }
  return approve ? 'Decision recorded.' : 'Instructor rejected.';
}

function parseDecisionResponse(raw: any, approve: boolean) {
  let data: any = {};
  if (raw && raw.data) {
    data = raw.data;
  } else if (raw) {
    data = raw;
  }
  return { outcome: resolveOutcome(data, approve), message: resolveMessage(data, approve) };
}

function parseErrorMessage(err: unknown): string {
  const e = err as any;
  if (e && e.response && e.response.data) {
    return e.response.data.detail || 'Something went wrong.';
  }
  if (e && e.message) { return e.message; }
  return 'Something went wrong. Please try again.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Wrapper({
  colors,
  children,
}: {
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

function InvalidLinkCard({ colors, onDashboard }: { colors: any; onDashboard: () => void }) {
  return (
    <Wrapper colors={colors}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.danger }]}>Invalid Link</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        No verification token was found. Please use the full link from the email or WhatsApp
        message.
      </Text>
      <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={onDashboard}>
        <Text style={[styles.btnText, { color: colors.textInverse }]}>Go to Dashboard</Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

function LoadingCard({ colors }: { colors: any }) {
  return (
    <Wrapper colors={colors}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Submitting decision…
      </Text>
    </Wrapper>
  );
}

function DecisionCard({
  colors,
  onApprove,
  onReject,
  onDashboard,
}: {
  colors: any;
  onApprove: () => void;
  onReject: () => void;
  onDashboard: () => void;
}) {
  return (
    <Wrapper colors={colors}>
      <Text style={styles.icon}>🪪</Text>
      <Text style={[styles.title, { color: colors.text }]}>Instructor Verification</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        A driving instructor has registered and is awaiting your decision.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
        <Text style={[styles.infoText, { color: colors.text }]}>
          💡 Approving grants the instructor access to receive lesson bookings.
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          ✋ Rejecting prevents them from operating until re-reviewed.
        </Text>
      </View>

      <View style={styles.decisionRow}>
        <TouchableOpacity
          style={[styles.btnReject, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
          onPress={onReject}
        >
          <Text style={[styles.btnRejectText, { color: colors.danger }]}>✗  Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={onApprove}
        >
          <Text style={[styles.btnText, { color: colors.textInverse }]}>✓  Approve</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onDashboard}>
        <Text style={[styles.linkText, { color: colors.primary }]}>
          Go to Admin Dashboard instead
        </Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

function SuccessCard({
  colors,
  outcome,
  message,
  onDashboard,
}: {
  colors: any;
  outcome: OutcomeType;
  message: string;
  onDashboard: () => void;
}) {
  const isApproved = outcome !== 'rejected';
  const isPendingCompany = outcome === 'pending_company';
  const titleText = isPendingCompany
    ? 'Approved — Awaiting Company'
    : isApproved
    ? 'Instructor Approved!'
    : 'Instructor Rejected';

  return (
    <Wrapper colors={colors}>
      <Text style={styles.icon}>{isApproved ? '✅' : '🚫'}</Text>
      <Text style={[styles.title, { color: isApproved ? colors.success : colors.danger }]}>
        {titleText}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>

      {isPendingCompany && (
        <View style={[styles.infoBox, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            The company owner still needs to confirm before the instructor can accept bookings.
          </Text>
        </View>
      )}

      <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={onDashboard}>
        <Text style={[styles.btnText, { color: colors.textInverse }]}>Go to Dashboard</Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

function ErrorCard({
  colors,
  message,
  onDashboard,
}: {
  colors: any;
  message: string;
  onDashboard: () => void;
}) {
  return (
    <Wrapper colors={colors}>
      <Text style={styles.icon}>❌</Text>
      <Text style={[styles.title, { color: colors.danger }]}>Verification Failed</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>

      <View style={[styles.infoBox, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • The link has already been used{'\n'}
          • The link has expired (72-hour validity){'\n'}
          • The token was invalid or tampered with
        </Text>
      </View>

      <Text style={[styles.altText, { color: colors.textSecondary }]}>
        You can still manage this instructor from the Admin Dashboard.
      </Text>

      <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={onDashboard}>
        <Text style={[styles.btnText, { color: colors.textInverse }]}>Go to Dashboard</Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InstructorVerifyScreen({ route, navigation }: any) {
  const { colors } = useTheme();

  const [screenState, setScreenState] = useState<ScreenState>('decision');
  const [outcome, setOutcome] = useState<OutcomeType>(null);
  const [message, setMessage] = useState('');

  // Token is passed via deep-link route params
  const token: string | null = route?.params?.token ?? null;

  const goToDashboard = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main');

  const handleDecision = async (approve: boolean) => {
    setScreenState('loading');
    try {
      const raw = await ApiService.post('/verify/instructor/admin', { token, approve });
      const { outcome: o, message: m } = parseDecisionResponse(raw, approve);
      setOutcome(o);
      setMessage(m);
      setScreenState('success');
    } catch (err) {
      setMessage(parseErrorMessage(err));
      setScreenState('error');
    }
  };

  if (!token) {
    return <InvalidLinkCard colors={colors} onDashboard={goToDashboard} />;
  }
  if (screenState === 'loading') {
    return <LoadingCard colors={colors} />;
  }
  if (screenState === 'decision') {
    return <DecisionCard colors={colors} onApprove={() => handleDecision(true)} onReject={() => handleDecision(false)} onDashboard={goToDashboard} />;
  }
  if (screenState === 'success') {
    return <SuccessCard colors={colors} outcome={outcome} message={message} onDashboard={goToDashboard} />;
  }
  return <ErrorCard colors={colors} message={message} onDashboard={goToDashboard} />;
}

const IS_WEB = Platform.OS === 'web';

// Pre-compute platform-specific values outside StyleSheet to keep it simple
const SZ = IS_WEB
  ? { pad: 40, cardPad: 40, icon: 72, title: 28, body: 16, info: 18, infoTxt: 14, gap: 16, btnPadV: 14, btnPadH: 36, btnMinW: 160, btnTxt: 16, link: 14 }
  : { pad: 20, cardPad: 28, icon: 56, title: 22, body: 14, info: 14, infoTxt: 13, gap: 12, btnPadV: 12, btnPadH: 28, btnMinW: 140, btnTxt: 15, link: 13 };

const CARD_SHADOW = Platform.select({
  web: { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' } as any,
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SZ.pad },
  card: { maxWidth: 560, width: '100%', alignSelf: 'center', borderRadius: 16, padding: SZ.cardPad, alignItems: 'center', ...CARD_SHADOW },
  icon: { fontSize: SZ.icon, marginBottom: 16 },
  title: { fontSize: SZ.title, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: SZ.body, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  loadingText: { marginTop: 20, fontSize: SZ.body },
  infoBox: { width: '100%', borderWidth: 1, borderRadius: 10, padding: SZ.info, marginBottom: 24 },
  infoText: { fontSize: SZ.infoTxt, lineHeight: 22, marginBottom: 4 },
  decisionRow: { flexDirection: 'row', gap: SZ.gap, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: { paddingVertical: SZ.btnPadV, paddingHorizontal: SZ.btnPadH, borderRadius: 10, alignItems: 'center', minWidth: SZ.btnMinW, marginBottom: 12 },
  btnReject: { paddingVertical: SZ.btnPadV, paddingHorizontal: SZ.btnPadH, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', minWidth: SZ.btnMinW },
  btnText: { fontSize: SZ.btnTxt, fontWeight: '700' },
  btnRejectText: { fontSize: SZ.btnTxt, fontWeight: '700' },
  linkText: { fontSize: SZ.link, textDecorationLine: 'underline', textAlign: 'center' },
  altText: { fontSize: SZ.link, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
});
