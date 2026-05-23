/**
 * LanguageSwitcher
 *
 * Cross-platform language picker. Renders a row of pill buttons
 * (works inside any screen / settings card).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { colors } = useTheme();
  const { locale, setLocale, supported, t } = useI18n();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      {!compact ? <Text style={styles.label}>{t('common.language')}</Text> : null}
      <View style={styles.row}>
        {supported.map((opt) => {
          const active = locale === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => setLocale(opt.code)}
              accessibilityRole="button"
              accessibilityLabel={`Select language: ${opt.nativeName}`}
              style={[
                styles.btn,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: colors.border,
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
    },
  });
}
