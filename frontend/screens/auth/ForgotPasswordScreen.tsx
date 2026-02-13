/**
 * Forgot Password Screen — Request password reset
 */
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import { Button, Card, Input } from '../../components/ui';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setFieldError('Email address is required');
      setErrorMessage('Please enter your email address');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    if (!email.includes('@')) {
      setFieldError('Please enter a valid email address');
      setErrorMessage('Please enter a valid email address');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    setFieldError('');

    try {
      setLoading(true);
      setErrorMessage('');
      await ApiService.post('/auth/forgot-password', { email: email.trim() });
      setSuccessMessage(
        'Password reset link sent! Check your email inbox (and spam folder) for instructions.'
      );
      setEmail('');
      setTimeout(() => { navigation.goBack(); }, 5000);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setErrorMessage(
        error.response?.data?.detail || 'Failed to send reset email. Please try again.'
      );
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Card variant="elevated" padding="lg" style={styles.card}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        {successMessage && <InlineMessage type="success" message={successMessage} />}
        {errorMessage && <InlineMessage type="error" message={errorMessage} />}

        <Input
          label="Email Address"
          placeholder="your.email@example.com"
          value={email}
          onChangeText={(text) => { setEmail(text); setFieldError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={fieldError}
        />

        <Button
          label="Send Reset Link"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back to Login</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Platform.OS === 'web' ? 40 : 20,
    justifyContent: 'center',
  },
  card: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 26 : 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  backLink: {
    marginTop: 20,
    padding: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
