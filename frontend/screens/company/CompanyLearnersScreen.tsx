/**
 * The learners this school signed up itself.
 *
 * Its one action is a fallback: send a learner their account verification link
 * again. A learner enrolled at the counter who never received the email would
 * otherwise have to reach the platform operator to get anywhere. This resends
 * the link — it never marks an account verified, because an address nobody has
 * confirmed must not become an active account on a school's say-so.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import InlineMessage from '../../components/InlineMessage';
import { Button, Card, ScreenContainer } from '../../components/ui';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

interface Learner {
  student_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
}

export default function CompanyLearnersScreen() {
  const { colors, spacing, typography } = useTheme();
  const t = useT();

  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingId, setSendingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setError('');
      const { data } = await ApiService.get<{ students: Learner[] }>('/company/students');
      setLearners(data.students ?? []);
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || t('companyLearners.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const resend = async (learner: Learner) => {
    setError('');
    setSuccess('');
    setSendingId(learner.student_id);
    try {
      await ApiService.post(`/company/students/${learner.student_id}/resend-verification`);
      setSuccess(t('companyLearners.resent', { name: learner.name || '' }));
      load();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail?.message || detail || t('companyLearners.resendFailed'));
    } finally {
      setSendingId(null);
    }
  };

  // The list is one unpaged call, so filtering here searches all of it.
  const term = query.trim().toLowerCase();
  const filtered = term
    ? learners.filter(l =>
        `${l.name ?? ''} ${l.email ?? ''} ${l.phone ?? ''}`.toLowerCase().includes(term)
      )
    : learners;

  const unverified = learners.filter(l => l.status !== 'active').length;

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer width="content">
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {error ? <InlineMessage message={error} type="error" /> : null}
        {success ? <InlineMessage message={success} type="success" /> : null}

        <Text style={[typography.h3, { color: colors.text }]}>
          {t('companyLearners.title')}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {unverified > 0
            ? t('companyLearners.unverifiedHint', { count: unverified })
            : t('companyLearners.allVerified')}
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('companyLearners.searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('companyLearners.searchPlaceholder')}
          style={[
            styles.search,
            { borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
          ]}
        />

        {filtered.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            {t('companyLearners.none')}
          </Text>
        ) : (
          filtered.map(learner => {
            const isActive = learner.status === 'active';
            return (
              <Card key={learner.student_id} variant="outlined" padding="md" style={{ marginTop: spacing.sm }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {learner.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {learner.email}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {learner.phone}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: isActive ? colors.successBg : colors.warningBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isActive ? colors.success : colors.warning },
                      ]}
                    >
                      {isActive
                        ? t('companyLearners.badge.verified')
                        : t('companyLearners.badge.unverified')}
                    </Text>
                  </View>
                </View>

                {!isActive && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={sendingId === learner.student_id}
                      onPress={() => resend(learner)}
                    >
                      {sendingId === learner.student_id
                        ? t('common.loading')
                        : t('companyLearners.resend')}
                    </Button>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  search: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    fontSize: 14,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
