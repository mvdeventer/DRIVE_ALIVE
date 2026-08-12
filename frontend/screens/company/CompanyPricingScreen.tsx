/**
 * Per-instructor pricing for a driving school.
 *
 * The school sets a markup on top of each instructor's rate. That markup is
 * the school's entire margin, so the screen always shows what it nets after
 * the platform's commission — which is charged on the full price the student
 * pays, not on the margin. A markup below break-even therefore costs the
 * school money on every booking the marketplace brings; the server refuses to
 * save one and this screen warns before you try.
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

import { useFocusEffect } from '@react-navigation/native';

import InlineMessage from '../../components/InlineMessage';
import { Button, Card, ScreenContainer, ThemedModal } from '../../components/ui';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

type MarkupType = 'percent' | 'amount' | 'none';

interface Pricing {
  instructor_base: number;
  company_markup: number;
  student_pays: number;
  platform_charge: number;
  company_net: number;
}

interface InstructorPricing {
  instructor_id: number;
  full_name: string | null;
  email: string | null;
  verification_status: string | null;
  markup_type: MarkupType | null;
  markup_value: number;
  pricing: Pricing;
}

interface PricingResponse {
  company_name: string;
  commission_percent: number;
  is_platform_host: boolean;
  break_even_markup_ratio: number;
  instructors: InstructorPricing[];
}

const money = (value: number) => `R${(value ?? 0).toFixed(2)}`;

export default function CompanyPricingScreen() {
  const { colors, spacing, typography } = useTheme();
  const t = useT();

  const [data, setData] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [editing, setEditing] = useState<InstructorPricing | null>(null);
  const [draftType, setDraftType] = useState<MarkupType>('percent');
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await ApiService.getCompanyPricing());
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('companyPricing.loadFailed'),
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

  const openEditor = (row: InstructorPricing) => {
    setMessage(null);
    setEditing(row);
    setDraftType(row.markup_type ?? 'percent');
    setDraftValue(row.markup_value ? String(row.markup_value) : '');
  };

  /**
   * What the school would net per hour at the drafted markup. Mirrors the
   * server so the warning appears before saving; the server decides.
   */
  const previewNet = (): { markup: number; charge: number; net: number } | null => {
    if (!editing || !data || draftType === 'none') return null;
    const base = editing.pricing.instructor_base;
    const value = parseFloat(draftValue);
    if (!Number.isFinite(value)) return null;

    const markup = draftType === 'percent' ? base * (value / 100) : value;
    const charge = data.is_platform_host
      ? 0
      : (base + markup) * (data.commission_percent / 100);
    return { markup, charge, net: markup - charge };
  };

  const preview = previewNet();
  const belowBreakEven = preview !== null && preview.net < 0;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      await ApiService.setInstructorMarkup(editing.instructor_id, {
        markup_type: draftType,
        markup_value: draftType === 'none' ? 0 : parseFloat(draftValue) || 0,
      });
      setEditing(null);
      setMessage({ type: 'success', text: t('companyPricing.saved') });
      await load();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('companyPricing.saveFailed'),
      });
    } finally {
      setSaving(false);
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

  const minimumPerHour = (base: number) =>
    base * (data?.break_even_markup_ratio ?? 0);

  return (
    <ScreenContainer width="content">
      <ScrollView>
        <Text accessibilityRole="header" style={[typography.h2, { color: colors.text }]}>
          {t('companyPricing.title')}
        </Text>
        <Text
          style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}
        >
          {data?.is_platform_host
            ? t('companyPricing.subtitleHost')
            : t('companyPricing.subtitle', {
                percent: String(data?.commission_percent ?? 0),
              })}
        </Text>

        {message && (
          <View style={{ marginTop: spacing.md }}>
            <InlineMessage type={message.type} message={message.text} />
          </View>
        )}

        {(data?.instructors ?? []).length === 0 && (
          <Card variant="outlined" padding="lg" style={{ marginTop: spacing.md }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('companyPricing.empty')}
            </Text>
          </Card>
        )}

        {(data?.instructors ?? []).map(row => (
          <Card
            key={row.instructor_id}
            variant="outlined"
            padding="lg"
            style={{ marginTop: spacing.md }}
          >
            <Text style={[typography.h3, { color: colors.text }]}>
              {row.full_name || row.email}
            </Text>

            <View style={{ marginTop: spacing.sm }}>
              <Row label={t('companyPricing.row.base')} value={money(row.pricing.instructor_base)} />
              <Row
                label={t('companyPricing.row.markup')}
                value={money(row.pricing.company_markup)}
              />
              <Row
                label={t('companyPricing.row.studentPays')}
                value={money(row.pricing.student_pays)}
                emphasis
              />
              <Row
                label={t('companyPricing.row.platformCharge')}
                value={`-${money(row.pricing.platform_charge)}`}
              />
              <Row
                label={t('companyPricing.row.youKeep')}
                value={money(row.pricing.company_net)}
                emphasis
                tone={row.pricing.company_net < 0 ? 'danger' : 'success'}
              />
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Button variant="secondary" onPress={() => openEditor(row)} fullWidth>
                {t('companyPricing.edit')}
              </Button>
            </View>
          </Card>
        ))}
      </ScrollView>

      <ThemedModal
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={t('companyPricing.modal.title')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onPress={save} loading={saving} disabled={saving || belowBreakEven}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <View style={styles.typeRow}>
          {(['percent', 'amount', 'none'] as MarkupType[]).map(option => (
            <Pressable
              key={option}
              onPress={() => setDraftType(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: draftType === option }}
              {...({ 'aria-selected': draftType === option } as any)}
              accessibilityLabel={t(`companyPricing.type.${option}`)}
              hitSlop={6}
              style={[
                styles.typeChip,
                { borderColor: colors.border },
                draftType === option && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: draftType === option ? colors.primary : colors.textSecondary },
                ]}
              >
                {t(`companyPricing.type.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {draftType !== 'none' && (
          <TextField
            colors={colors}
            typography={typography}
            label={
              draftType === 'percent'
                ? t('companyPricing.modal.percentLabel')
                : t('companyPricing.modal.amountLabel')
            }
            value={draftValue}
            onChangeText={setDraftValue}
          />
        )}

        {editing && draftType !== 'none' && (
          <Text
            style={[
              typography.bodySm,
              { color: colors.textSecondary, marginTop: 12 },
            ]}
          >
            {t('companyPricing.modal.minimum', {
              amount: money(minimumPerHour(editing.pricing.instructor_base)),
            })}
          </Text>
        )}

        {preview && (
          <View style={{ marginTop: 12 }}>
            <Row label={t('companyPricing.row.markup')} value={money(preview.markup)} />
            <Row
              label={t('companyPricing.row.platformCharge')}
              value={`-${money(preview.charge)}`}
            />
            <Row
              label={t('companyPricing.row.youKeep')}
              value={money(preview.net)}
              emphasis
              tone={preview.net < 0 ? 'danger' : 'success'}
            />
          </View>
        )}

        {belowBreakEven && (
          <View style={{ marginTop: 12 }}>
            <InlineMessage type="error" message={t('companyPricing.modal.belowBreakEven')} />
          </View>
        )}
      </ThemedModal>
    </ScreenContainer>
  );
}

// ── Small presentational helpers ───────────────────────────────────────────

function Row({
  label,
  value,
  emphasis = false,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'success' | 'danger';
}) {
  const { colors, typography } = useTheme();
  const colour =
    tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.text;
  return (
    <View style={styles.row}>
      <Text style={[typography.bodySm, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          emphasis ? typography.label : typography.bodySm,
          { color: colour },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function TextField({
  colors,
  typography,
  label,
  value,
  onChangeText,
}: {
  colors: any;
  typography: any;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[typography.label, { color: colors.text, marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        accessibilityLabel={label}
        style={{
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
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
