/**
 * LanguageSwitcher
 *
 * Cross-platform language picker. Renders a row of pill buttons
 * (works inside any screen / settings card).
 *
 * Scope matters:
 *  - `account` (default) — the signed-in user's own language. Applied in
 *    memory and saved to their account, so it follows them to any device and
 *    never leaks to the next person using a shared browser.
 *  - `device` — used at registration, where no account exists yet. The caller
 *    receives the code via `onChange` and submits it with the sign-up payload.
 *
 * Selection is exposed through accessibilityState with role="radio"; the
 * earlier version conveyed the active language with a background fill only,
 * which a screen reader cannot perceive.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LocaleCode, useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import ApiService from '../services/api';

interface Props {
  compact?: boolean;
  scope?: 'account' | 'device';
  onChange?: (code: LocaleCode) => void;
  disabled?: boolean;
}

export default function LanguageSwitcher({
  compact = false,
  scope = 'account',
  onChange,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const { locale, setLocale, setAccountLocale, supported, t } = useI18n();
  const styles = useStyles(colors);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const select = async (code: LocaleCode) => {
    if (disabled || saving || code === locale) return;
    setError('');

    if (scope === 'device') {
      setLocale(code);
      onChange?.(code);
      return;
    }

    // Switch immediately so the UI responds to the tap, then persist. If the
    // save fails the language stays switched for this session and we say so,
    // rather than silently snapping back under the user's finger.
    setAccountLocale(code);
    onChange?.(code);
    setSaving(true);
    try {
      await ApiService.put('/auth/me', { preferred_language: code });
    } catch {
      setError(t('language.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {!compact ? <Text style={styles.label}>{t('common.language')}</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {supported.map((opt) => {
          const active = locale === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => select(opt.code)}
              disabled={disabled || saving}
              accessibilityRole="radio"
              // Both are required, same as components/ui/TabBar: RNW 0.21 does
              // not emit an ARIA attribute from accessibilityState alone, so
              // without the explicit aria-checked a screen reader cannot tell
              // which language is active (verified absent in the DOM).
              accessibilityState={{ checked: active, disabled: disabled || saving }}
              {...({ 'aria-checked': active } as any)}
              accessibilityLabel={opt.nativeName}
              hitSlop={8}
              style={[
                styles.btn,
                {
                  // `colors.surface` does not exist on ThemeColors — the old
                  // value resolved to undefined, leaving inactive pills
                  // transparent against the card behind them.
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {opt.nativeName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function useStyles(colors: any) {
  return StyleSheet.create({
    container: { marginVertical: 4 },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: 'center',
    },
    error: { color: colors.danger, fontSize: 12, marginTop: 6 },
  });
}
