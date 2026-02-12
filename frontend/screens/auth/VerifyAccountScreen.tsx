import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card } from '../../components/ui';
import apiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<any, 'VerifyAccount'>;

export default function VerifyAccountScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Get token from route params or query string (for web)
  const getToken = () => {
    if (route.params?.token) {
      return route.params.token;
    }
    // For web, check query string
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }
    return null;
  };

  const token = getToken();

  useEffect(() => {
    if (token) {
      verifyAccount(token);
    } else {
      setVerifying(false);
      setErrorMessage('Invalid verification link. No token provided.');
    }
  }, [token]);

  const verifyAccount = async (verificationToken: string) => {
    try {
      const data = await apiService.verifyAccount(verificationToken);
      setSuccess(true);
      setUserName(data.user_name || 'User');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigation.replace('Login');
      }, 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Verification failed. Please try again.';
      setErrorMessage(errorMsg);
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = () => {
    navigation.replace('Login');
    // User can use "Forgot Password" flow to resend verification
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Card variant="elevated" padding="lg" style={styles.card}>
        {verifying ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              Verifying your account…
            </Text>
            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              Please wait a moment
            </Text>
          </View>
        ) : success ? (
          <View style={styles.centerContent}>
            <View style={[styles.bigIconCircle, { backgroundColor: colors.success + '15' }]}>
              <Text style={styles.bigIcon}>✅</Text>
            </View>
            <Text style={[styles.statusTitle, { color: colors.success }]}>
              Account Verified!
            </Text>
            <Text style={[styles.statusMessage, { color: colors.text }]}>
              Welcome, {userName}! Your account has been successfully verified.
            </Text>
            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              You can now log in and start using the app.
            </Text>
            <View style={styles.redirectRow}>
              <ActivityIndicator size="small" color={colors.success} />
              <Text style={[styles.redirectText, { color: colors.success }]}>
                Redirecting to login…
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <View style={[styles.bigIconCircle, { backgroundColor: colors.danger + '15' }]}>
              <Text style={styles.bigIcon}>❌</Text>
            </View>
            <Text style={[styles.statusTitle, { color: colors.danger }]}>
              Verification Failed
            </Text>
            <Text style={[styles.statusMessage, { color: colors.danger }]}>
              {errorMessage}
            </Text>

            <View style={[styles.helpBox, { backgroundColor: colors.warningBg, borderLeftColor: colors.warning }]}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>Common reasons:</Text>
              <Text style={[styles.helpItem, { color: colors.textSecondary }]}>
                • Verification link has expired (30 minutes)
              </Text>
              <Text style={[styles.helpItem, { color: colors.textSecondary }]}>
                • Link has already been used
              </Text>
              <Text style={[styles.helpItem, { color: colors.textSecondary }]}>
                • Account has been deleted
              </Text>
            </View>

            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              Please register again or contact support if the problem persists.
            </Text>

            <Button
              label="← Back to Login"
              onPress={handleResendVerification}
              size="lg"
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  card: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIconCircle: {
    width: Platform.OS === 'web' ? 96 : 80,
    height: Platform.OS === 'web' ? 96 : 80,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bigIcon: {
    fontSize: Platform.OS === 'web' ? 48 : 40,
  },
  statusTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statusMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 420,
    lineHeight: 22,
  },
  statusSub: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  redirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  redirectText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  helpBox: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 18 : 14,
    borderRadius: 8,
    marginVertical: 16,
    maxWidth: 420,
    width: '100%',
  },
  helpTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  helpItem: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    marginBottom: 3,
    lineHeight: 19,
  },
});
