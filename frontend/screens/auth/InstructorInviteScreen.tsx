/**
 * Landing page for a driving school's invitation link.
 *
 * Reachable without signing in, because the recipient may not have an account
 * yet: they see who is inviting them and on what terms, then either sign in to
 * accept or register — in which case registration carries the invite token
 * through and joins them to the school on the way out.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useRoute } from '@react-navigation/native';

import InlineMessage from '../../components/InlineMessage';
import { Button, Card, ScreenContainer } from '../../components/ui';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { useExitToLogin } from '../../utils/exitToLogin';

interface Offer {
  company_id: number;
  company_name: string | null;
  markup_type: 'percent' | 'amount' | null;
  markup_value: number;
  status: string;
  is_open: boolean;
}

export default function InstructorInviteScreen({ navigation }: any) {
  // `Login` is not mounted while a session is live — see utils/exitToLogin.
  const goToLogin = useExitToLogin(navigation);
  const { colors, spacing, typography } = useTheme();
  const t = useT();
  const route = useRoute();
  const token = (route.params as any)?.token as string | undefined;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const load = useCallback(async () => {
    if (!token) {
      setMessage({ type: 'error', text: t('instructorInvite.missingToken') });
      setLoading(false);
      return;
    }
    try {
      setOffer(await ApiService.previewInvite(token));
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.detail?.message || t('instructorInvite.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (accept: boolean) => {
    if (!token) return;
    setWorking(true);
    setMessage(null);
    try {
      if (accept) {
        await ApiService.acceptInvite(token);
        setMessage({ type: 'success', text: t('instructorInvite.accepted') });
      } else {
        await ApiService.declineInvite(token);
        setMessage({ type: 'success', text: t('instructorInvite.declined') });
      }
      await load();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      // A 401 here means they are not signed in yet — the common case for
      // someone arriving straight from the email.
      if (error?.response?.status === 401) {
        setMessage({ type: 'error', text: t('instructorInvite.signInFirst') });
      } else {
        setMessage({
          type: 'error',
          text: detail?.message || t('instructorInvite.actionFailed'),
        });
      }
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer width="form">
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const terms = () => {
    if (!offer || !offer.markup_type) return t('instructorInvite.termsNone');
    return offer.markup_type === 'percent'
      ? t('instructorInvite.termsPercent', { value: String(offer.markup_value) })
      : t('instructorInvite.termsAmount', { value: offer.markup_value.toFixed(2) });
  };

  return (
    <ScreenContainer width="form">
      <Text accessibilityRole="header" style={[typography.h2, { color: colors.text }]}>
        {t('instructorInvite.title')}
      </Text>

      {message && (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage type={message.type} message={message.text} />
        </View>
      )}

      {offer && (
        <Card variant="outlined" padding="lg" style={{ marginTop: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text }]}>
            {offer.company_name}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.sm },
            ]}
          >
            {t('instructorInvite.body', { company: offer.company_name || '' })}
          </Text>
          <Text
            style={[typography.bodySm, { color: colors.textSecondary, marginTop: spacing.sm }]}
          >
            {terms()}
          </Text>

          {offer.is_open ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button onPress={() => respond(true)} loading={working} disabled={working} fullWidth>
                {t('instructorInvite.accept')}
              </Button>
              <Button
                variant="secondary"
                onPress={() => respond(false)}
                disabled={working}
                fullWidth
              >
                {t('instructorInvite.decline')}
              </Button>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <InlineMessage type="info" message={t('instructorInvite.closed')} />
            </View>
          )}
        </Card>
      )}

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Button variant="secondary" onPress={goToLogin} fullWidth>
          {t('instructorInvite.signIn')}
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            navigation.navigate('RegisterInstructor', {
              presetCompanyChoice: 'join',
              presetCompanyId: offer?.company_id,
              inviteToken: token,
            })
          }
          fullWidth
        >
          {t('instructorInvite.register')}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centred: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});
