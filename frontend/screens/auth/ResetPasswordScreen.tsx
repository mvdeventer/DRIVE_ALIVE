/**
 * Reset Password Screen - Set new password with token
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import ApiService from '../../services/api';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🔑 Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below.</Text>

        {successMessage && <InlineMessage type="success" message={successMessage} />}
        {errorMessage && <InlineMessage type="error" message={errorMessage} />}

        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            key={`password-${showPassword}`}
            style={styles.input}
            placeholder="Enter new password (min. 6 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            key={`confirm-password-${showPassword}`}
            style={styles.input}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.showPasswordText}>
            {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login' as never)}
        >
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  showPasswordButton: {
    marginBottom: 20,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
});
