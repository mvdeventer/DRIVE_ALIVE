/**
 * A driving school's instructor roster and its pending invitations.
 *
 * Invite by email — the recipient need not have an account, the link carries
 * them through registration. Instructors who asked to join appear here as
 * requests to approve.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';

import InlineMessage from '../../components/InlineMessage';
import { Button, Card, ScreenContainer, ThemedModal } from '../../components/ui';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

interface Invite {
  id: number;
  direction: 'invite' | 'request';
  email: string;
  status: string;
  markup_type: 'percent' | 'amount' | null;
  markup_value: number;
}

type MarkupType = 'percent' | 'amount' | 'none';

interface RosterMember {
  instructor_id: number;
  full_name: string | null;
  email: string | null;
  verification_status: string | null;
  pricing: { instructor_base: number; student_pays: number; company_net: number };
}

export default function CompanyRosterScreen() {
  const { colors, spacing, typography } = useTheme();
  const t = useT();
  const navigation = useNavigation();

  const [members, setMembers] = useState<RosterMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(
    null
  );

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [markupType, setMarkupType] = useState<MarkupType>('percent');
  const [markupValue, setMarkupValue] = useState('20');
  const [saving, setSaving] = useState(false);
  // Fraction of the instructor's rate below which the school loses money on
  // every platform-sourced booking. Published by the pricing endpoint.
  const [breakEvenRatio, setBreakEvenRatio] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pricing, inviteList] = await Promise.all([
        ApiService.getCompanyPricing(),
        ApiService.getCompanyInvites(),
      ]);
      setMembers(pricing.instructors ?? []);
      setBreakEvenRatio(pricing.break_even_markup_ratio ?? 0);
      setInvites(inviteList.invites ?? []);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('companyRoster.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sendInvite = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await ApiService.createCompanyInvite({
        email: email.trim(),
        markup_type: markupType,
        markup_value: markupType === 'none' ? 0 : parseFloat(markupValue) || 0,
      });
      setInviting(false);
      setEmail('');
      setMarkupValue('20');
      setMarkupType('percent');
      // The API reports a failed send rather than throwing, so surface it.
      setMessage(
        result.email_sent
          ? { type: 'success', text: t('companyRoster.inviteSent') }
          : { type: 'info', text: t('companyRoster.inviteLinkOnly', { link: result.invite_link }) }
      );
      await load();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('companyRoster.inviteFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, successKey: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'success', text: t(successKey) });
      await load();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('companyRoster.actionFailed'),
      });
    }
  };

  if (loading) {
    return (
      <ScreenContainer width="content">
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const openInvites = invites.filter(i => i.status === 'pending');

  /**
   * Warn before the school commits to a losing markup.
   *
   * A percentage break-even is the same for every instructor, so it can be
   * checked here even for an invitee who has no account yet. A rand-per-hour
   * markup depends on the instructor's own rate, which we do not know until
   * they exist — the server enforces that case.
   */
  const minimumPercent = breakEvenRatio * 100;
  const markupWarning = (() => {
    if (markupType === 'none') {
      return t('companyRoster.markupNoneWarning', {
        percent: minimumPercent.toFixed(1),
      });
    }
    if (markupType === 'percent') {
      const value = parseFloat(markupValue);
      if (Number.isFinite(value) && value <= minimumPercent) {
        return t('companyRoster.markupBelowWarning', {
          percent: minimumPercent.toFixed(1),
        });
      }
    }
    return null;
  })();

  return (
    <ScreenContainer width="content">
      <ScrollView>
        <Text accessibilityRole="header" style={[typography.h2, { color: colors.text }]}>
          {t('companyRoster.title')}
        </Text>

        {message && (
          <View style={{ marginTop: spacing.md }}>
            <InlineMessage type={message.type} message={message.text} />
          </View>
        )}

        <View style={{ marginTop: spacing.md }}>
          <Button onPress={() => setInviting(true)} fullWidth>
            {t('companyRoster.invite')}
          </Button>
        </View>

        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
          {t('companyRoster.instructors')}
        </Text>
        {members.length === 0 && (
          <Card variant="outlined" padding="lg" style={{ marginTop: spacing.sm }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('companyRoster.noInstructors')}
            </Text>
          </Card>
        )}
        {members.map(member => (
          <Card
            key={member.instructor_id}
            variant="outlined"
            padding="lg"
            style={{ marginTop: spacing.sm }}
          >
            <Text style={[typography.label, { color: colors.text }]}>
              {member.full_name || member.email}
            </Text>
            <Text style={[typography.bodySm, { color: colors.textSecondary }]}>
              {t('companyRoster.memberRates', {
                base: member.pricing.instructor_base.toFixed(2),
                student: member.pricing.student_pays.toFixed(2),
              })}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button
                variant="secondary"
                onPress={() =>
                  act(
                    () => ApiService.removeCompanyInstructor(member.instructor_id),
                    'companyRoster.removed'
                  )
                }
                fullWidth
              >
                {t('companyRoster.remove')}
              </Button>
            </View>
          </Card>
        ))}

        {/* Learners the school signed up itself. Their lessons are the
            school's own trade, so no platform commission is charged on them —
            which is why enrolling them has to be recorded, not assumed. */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
          {t('companyRoster.ownLearners')}
        </Text>
        <Text
          style={[typography.bodySm, { color: colors.textSecondary, marginTop: spacing.xs }]}
        >
          {t('companyRoster.ownLearnersHint')}
        </Text>
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <Button
            variant="secondary"
            onPress={() => (navigation as any).navigate('EnrolLearner')}
            fullWidth
          >
            {t('companyRoster.enrolLearner')}
          </Button>
          <Button
            variant="secondary"
            onPress={() => (navigation as any).navigate('CompanyLearners')}
            fullWidth
          >
            {t('companyRoster.viewLearners')}
          </Button>
        </View>

        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg }]}>
          {t('companyRoster.pending')}
        </Text>
        {openInvites.length === 0 && (
          <Card variant="outlined" padding="lg" style={{ marginTop: spacing.sm }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('companyRoster.noPending')}
            </Text>
          </Card>
        )}
        {openInvites.map(invite => (
          <Card key={invite.id} variant="outlined" padding="lg" style={{ marginTop: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>{invite.email}</Text>
            <Text style={[typography.bodySm, { color: colors.textSecondary }]}>
              {invite.direction === 'request'
                ? t('companyRoster.wantsToJoin')
                : t('companyRoster.invited')}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              {invite.direction === 'request' ? (
                <Button
                  onPress={() =>
                    act(() => ApiService.approveJoinRequest(invite.id), 'companyRoster.approved')
                  }
                  fullWidth
                >
                  {t('companyRoster.approve')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onPress={() =>
                    act(() => ApiService.revokeCompanyInvite(invite.id), 'companyRoster.revoked')
                  }
                  fullWidth
                >
                  {t('companyRoster.revoke')}
                </Button>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>

      <ThemedModal
        visible={inviting}
        onClose={() => setInviting(false)}
        title={t('companyRoster.invite')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onPress={() => setInviting(false)}>
              {t('common.cancel')}
            </Button>
            <Button onPress={sendInvite} loading={saving} disabled={saving || !email.trim()}>
              {t('companyRoster.send')}
            </Button>
          </>
        }
      >
        <Text style={[typography.bodySm, { color: colors.textSecondary }]}>
          {t('companyRoster.inviteHint')}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('companyRoster.emailPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel={t('companyRoster.emailLabel')}
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary,
            color: colors.text,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
          }}
        />

        <Text style={[typography.label, { color: colors.text, marginTop: 16 }]}>
          {t('companyRoster.markupLabel')}
        </Text>
        <Text style={[typography.bodySm, { color: colors.textSecondary, marginBottom: 8 }]}>
          {t('companyRoster.markupHint')}
        </Text>
        <View style={styles.typeRow}>
          {(['percent', 'amount', 'none'] as MarkupType[]).map(option => (
            <Pressable
              key={option}
              onPress={() => setMarkupType(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: markupType === option }}
              {...({ 'aria-selected': markupType === option } as any)}
              accessibilityLabel={t(`companyPricing.type.${option}`)}
              hitSlop={6}
              style={[
                styles.typeChip,
                { borderColor: colors.border },
                markupType === option && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: markupType === option ? colors.primary : colors.textSecondary },
                ]}
              >
                {t(`companyPricing.type.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {markupType !== 'none' && (
          <TextInput
            value={markupValue}
            onChangeText={setMarkupValue}
            keyboardType="numeric"
            accessibilityLabel={t('companyRoster.markupLabel')}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
            }}
          />
        )}

        {markupWarning && (
          <View style={{ marginTop: 10 }}>
            <InlineMessage type="warning" message={markupWarning} />
          </View>
        )}
      </ThemedModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centred: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
});
