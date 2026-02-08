import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import apiService from '../../services/api';

type Props = NativeStackScreenProps<any, 'VerifyAccount'>;

export default function VerifyAccountScreen({ route, navigation }: Props) {
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
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {verifying ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Verifying your account...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      ) : success ? (
        <View style={styles.centerContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Account Verified!</Text>
          <Text style={styles.successMessage}>
            Welcome, {userName}! Your account has been successfully verified.
          </Text>
          <Text style={styles.successSubtext}>
            You can now log in and start using the app.
          </Text>
          <View style={styles.redirectInfo}>
            <ActivityIndicator size="small" color="#28a745" />
            <Text style={styles.redirectText}>Redirecting to login...</Text>
          </View>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Common reasons:</Text>
            <Text style={styles.helpItem}>• Verification link has expired (30 minutes)</Text>
            <Text style={styles.helpItem}>• Link has already been used</Text>
            <Text style={styles.helpItem}>• Account has been deleted</Text>
          </View>

          <Text style={styles.solutionText}>
            Please register again or contact support if the problem persists.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleResendVerification}
          >
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
  },
  successIcon: {
    fontSize: Platform.OS === 'web' ? 100 : 80,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 500,
  },
  successSubtext: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  redirectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  redirectText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#28a745',
    fontStyle: 'italic',
  },
  errorIcon: {
    fontSize: Platform.OS === 'web' ? 100 : 80,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 500,
    paddingHorizontal: 20,
  },
  helpSection: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    marginBottom: 20,
    maxWidth: 500,
    width: '100%',
  },
  helpTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  helpItem: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 20,
  },
  solutionText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 500,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
});
