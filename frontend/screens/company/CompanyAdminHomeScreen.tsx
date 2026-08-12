/**
 * Company administrator landing screen.
 *
 * Placeholder for the Phase 1 role plumbing. The management surfaces
 * (instructor roster, per-instructor pricing, billing statement) land in the
 * later phases; this exists so a company admin who logs in reaches a coherent
 * screen rather than the unknown-role guard.
 */
import React from 'react';
import { Text, View } from 'react-native';

import { Card, ScreenContainer } from '../../components/ui';
import { useT } from '../../i18n';
import { useAuthActions } from '../../navigation/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

export default function CompanyAdminHomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const t = useT();
  const { userName } = useAuthActions();

  return (
    <ScreenContainer width="content">
      <View style={{ marginBottom: spacing.lg }}>
        <Text accessibilityRole="header" style={[typography.h2, { color: colors.text }]}>
          {t('companyAdmin.home.title')}
        </Text>
        {!!userName && (
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.xs },
            ]}
          >
            {userName}
          </Text>
        )}
      </View>

      <Card variant="outlined" padding="lg">
        <Text style={[typography.h3, { color: colors.text }]}>
          {t('companyAdmin.home.settingUpTitle')}
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.sm },
          ]}
        >
          {t('companyAdmin.home.settingUpBody')}
        </Text>
      </Card>
    </ScreenContainer>
  );
}
