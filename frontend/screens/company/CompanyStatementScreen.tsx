/**
 * What this driving school owes the platform this month.
 *
 * Two lines: commission on bookings the marketplace brought, and the monthly
 * per-instructor subscription. Commission is charged on the full price the
 * student paid, which is why the school's own markup has to clear break-even.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import InlineMessage from '../../components/InlineMessage';
import { Card, ScreenContainer } from '../../components/ui';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

interface Statement {
  company_name: string;
  period: string;
  commission: { booking_count: number; gross_billed_on: number; total: number };
  subscription: { instructor_count: number; price_per_instructor: number; total: number };
  total_due: number;
}

const money = (value: number) => `R${(value ?? 0).toFixed(2)}`;

export default function CompanyStatementScreen() {
  const { colors, spacing, typography } = useTheme();
  const t = useT();

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatement(await ApiService.getCompanyStatement());
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message || t('companyStatement.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <ScreenContainer width="content">
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="content">
      <ScrollView>
        <Text accessibilityRole="header" style={[typography.h2, { color: colors.text }]}>
          {t('companyStatement.title')}
        </Text>
        {statement && (
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {t('companyStatement.period', { period: statement.period })}
          </Text>
        )}

        {error && (
          <View style={{ marginTop: spacing.md }}>
            <InlineMessage type="error" message={error} />
          </View>
        )}

        {statement && (
          <>
            <Card variant="outlined" padding="lg" style={{ marginTop: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text }]}>
                {t('companyStatement.commission')}
              </Text>
              <Text
                style={[typography.bodySm, { color: colors.textSecondary, marginTop: spacing.xs }]}
              >
                {t('companyStatement.commissionNote', {
                  count: String(statement.commission.booking_count),
                  gross: money(statement.commission.gross_billed_on),
                })}
              </Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
                {money(statement.commission.total)}
              </Text>
            </Card>

            <Card variant="outlined" padding="lg" style={{ marginTop: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text }]}>
                {t('companyStatement.subscription')}
              </Text>
              <Text
                style={[typography.bodySm, { color: colors.textSecondary, marginTop: spacing.xs }]}
              >
                {statement.subscription.price_per_instructor > 0
                  ? t('companyStatement.subscriptionNote', {
                      count: String(statement.subscription.instructor_count),
                      price: money(statement.subscription.price_per_instructor),
                    })
                  : t('companyStatement.subscriptionNone')}
              </Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
                {money(statement.subscription.total)}
              </Text>
            </Card>

            <Card variant="outlined" padding="lg" style={{ marginTop: spacing.md }}>
              <View style={styles.totalRow}>
                <Text style={[typography.h3, { color: colors.text }]}>
                  {t('companyStatement.totalDue')}
                </Text>
                <Text style={[typography.h2, { color: colors.primary }]}>
                  {money(statement.total_due)}
                </Text>
              </View>
              <Text
                style={[typography.bodySm, { color: colors.textSecondary, marginTop: spacing.xs }]}
              >
                {t('companyStatement.settlementNote')}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centred: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
