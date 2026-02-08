/**
 * Instructor Verification Landing Screen
 * Accessed when admin clicks verification link in email or WhatsApp
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

export default function InstructorVerifyScreen({ route, navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  // Extract token from route params (React Navigation)
  const token = route?.params?.token || null;

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      setLoading(false);
      return;
    }

    // Verify instructor using token
    verifyInstructor();
  }, [token]);

  const verifyInstructor = async () => {
    try {
      setLoading(true);

      // Call backend verification endpoint
      const response = await ApiService.get(`/verify/instructor?token=${token}`);

      if (response.data.status === 'success') {
        setStatus('success');
        setMessage(response.data.message || 'Instructor verified successfully!');

        // Auto-redirect to login after 4 seconds
        setTimeout(() => {
          navigation.replace('Login');
        }, 4000);
      } else {
        setStatus('error');
        setMessage('Verification failed. Please try again or verify from the admin dashboard.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);

      let errorMessage = 'Verification failed.';

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setStatus('error');
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Verifying instructor...</Text>
            </View>
          )}

          {/* Success State */}
          {!loading && status === 'success' && (
            <View style={styles.messageContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Instructor Verified!</Text>
              <Text style={styles.successMessage}>{message}</Text>
              <Text style={styles.successSubtext}>
                The instructor can now receive bookings from students.
              </Text>
              <Text style={styles.redirectText}>Redirecting to login in 4 seconds...</Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.buttonText}>Go to Login Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error State */}
          {!loading && status === 'error' && (
            <View style={styles.messageContainer}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorTitle}>Verification Failed</Text>
              <Text style={styles.errorMessage}>{message}</Text>

              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Possible Reasons:</Text>
                <Text style={styles.errorDetailItem}>• Link has expired (links are valid for 60 minutes)</Text>
                <Text style={styles.errorDetailItem}>• Link has already been used</Text>
                <Text style={styles.errorDetailItem}>• Invalid token</Text>
              </View>

              <Text style={styles.alternativeText}>
                You can still verify this instructor manually from the Admin Dashboard.
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.buttonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 60 : 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#666',
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 40 : 30,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  successIcon: {
    fontSize: Platform.OS === 'web' ? 80 : 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 15,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  successSubtext: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  redirectText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  errorIcon: {
    fontSize: Platform.OS === 'web' ? 80 : 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: 25,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  errorDetailItem: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  alternativeText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 32,
    borderRadius: 8,
    minWidth: Platform.OS === 'web' ? 200 : 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
  },
});
