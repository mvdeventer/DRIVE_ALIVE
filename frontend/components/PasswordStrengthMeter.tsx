/**
 * PasswordStrengthMeter — live feedback while a password is being typed.
 *
 * Two jobs, deliberately separated:
 *   1. The CHECKLIST is the truth: every rule the password must satisfy, each
 *      ticking green the moment it passes. This is what decides acceptance.
 *   2. The STRENGTH BAR is advice: an entropy estimate that says "this is
 *      accepted, but it is still guessable".
 *
 * Accessibility: strength is never conveyed by colour alone — the level is
 * spelled out in text, each rule carries a met/unmet word, and the block is a
 * polite live region so a screen-reader user hears progress as they type.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n';
import {
  PASSWORD_RULES,
  checkPassword,
  passwordStrength,
  type PasswordStrength,
} from '../utils/passwordPolicy';

interface Props {
  password: string;
  /** Hide until the user has typed something. Default true. */
  hideWhenEmpty?: boolean;
  /** Show the per-rule checklist. Default true. */
  showChecklist?: boolean;
}

export default function PasswordStrengthMeter({
  password,
  hideWhenEmpty = true,
  showChecklist = true,
}: Props) {
  const { colors, radii, fontFamilies, withAlpha } = useTheme();
  const t = useT();

  const strength: PasswordStrength = useMemo(() => passwordStrength(password), [password]);
  const check = useMemo(() => checkPassword(password), [password]);

  if (hideWhenEmpty && !password) return null;

  // danger → warning → success as the score climbs.
  const barColor =
    strength.score <= 1 ? colors.danger : strength.score === 2 ? colors.warning : colors.success;

  const levelLabel = t(strength.labelKey);
  const a11y = check.ok
    ? `${t('password.a11yMeetsAll')} ${t('password.strengthIs')} ${levelLabel}.`
    : `${t('password.a11yMissing')} ${check.failed.map((r) => t(r.labelKey)).join(', ')}.`;

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11y}
    >
      {/* Strength bar — 4 segments, filled to the score */}
      <View style={styles.barRow} accessibilityElementsHidden importantForAccessibility="no">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                borderRadius: radii.sm,
                backgroundColor: i < strength.score ? barColor : withAlpha(colors.text, 0.12),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.level, { color: barColor, fontFamily: fontFamilies.semibold }]}>
          {levelLabel}
        </Text>
        {password ? (
          <Text style={[styles.bits, { color: colors.textTertiary }]}>
            {t('password.bits', { bits: String(strength.bits) })}
          </Text>
        ) : null}
      </View>

      {/* Why it scored low — only when there is something actionable */}
      {strength.penaltyKeys.length > 0 ? (
        <Text style={[styles.penalty, { color: colors.textSecondary }]}>
          {strength.penaltyKeys.map((k) => t(k)).join(' · ')}
        </Text>
      ) : null}

      {/* The checklist — this is what actually gates submission */}
      {showChecklist ? (
        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <Text
                key={rule.id}
                style={[
                  styles.rule,
                  { color: met ? colors.success : colors.textSecondary },
                ]}
              >
                {met ? '✓' : '○'} {t(rule.labelKey)}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 8, marginBottom: 4 },
  barRow: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 5 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  level: { fontSize: 12 },
  bits: { fontSize: 11 },
  penalty: { fontSize: 11, marginTop: 2 },
  rules: { marginTop: 6, gap: 2 },
  rule: { fontSize: 11.5 },
});
