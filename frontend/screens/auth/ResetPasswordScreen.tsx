/**
 * Reset Password Screen — Set new password with token
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Get token from URL parameters (web) or navigation params (mobile)
    const params = route.params as any;
    if (params?.token) {
      setToken(params.token);
    } else if (Platform.OS === 'web') {
      // Parse token from URL query string
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [route]);

  const handleSubmit = async () => {
    // Validate inputs
    if (!token) {
      setErrorMessage('Invalid reset link. Please request a new password reset.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      await ApiService.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      setSuccessMessage('✅ Password reset successfully! Redirecting to login...');
      setNewPassword('');
      setConfirmPassword('');

      // Navigate to login after 2 seconds
      setTimeout(() => {
        navigation.navigate('Login' as never);
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message =
        error.response?.data?.detail || 'Failed to reset password. The link may have expired.';
      setErrorMessage(message);
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
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.icon}>🔑</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your new password below.
        </Text>

        {successMessage && <InlineMessage type="success" message={successMessage} />}
        {errorMessage && <InlineMessage type="error" message={errorMessage} />}

        <View style={styles.passwordRow}>
          <Input
            label="New Password"
            placeholder="Enter new password (min. 6 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.togglePassword}
            hitSlop={8}
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        <Input
          label="Confirm Password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Button
          label="Reset Password"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
          size="lg"
          style={{ marginTop: 12 }}
        />

        <Pressable
          style={styles.backLink}
          onPress={() => navigation.navigate('Login' as never)}
        >
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
  },
  passwordRow: {
    position: 'relative',
    width: '100%',
  },
  togglePassword: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
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
