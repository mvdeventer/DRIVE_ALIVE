/**
 * Payment Success Screen - Shows after successful PayFast payment
 */
import { CommonActions, useNavigation } from '@react-navigation/native';
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

export default function PaymentSuccessScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [bookingsCount, setBookingsCount] = useState(0);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      // Get payment session ID from storage
      const paymentSessionId =
        Platform.OS === 'web' ? localStorage.getItem('payment_session_id') : null; // Handle mobile storage if needed

      if (!paymentSessionId) {
        setStatus('failed');
        setLoading(false);
        return;
      }

      // Poll for payment completion (max 10 attempts, 2s interval)
      let attempts = 0;
      const maxAttempts = 10;

      const poll = async () => {
        try {
          const response = await ApiService.getPaymentSession(paymentSessionId);

          if (response.status === 'completed') {
            setStatus('success');
            setBookingsCount(JSON.parse(response.bookings_data || '[]').length);
            setLoading(false);

            // Clear payment session ID
            if (Platform.OS === 'web') {
              localStorage.removeItem('payment_session_id');
            }
          } else if (attempts >= maxAttempts) {
            // Timeout - payment may still be processing
            setStatus('failed');
            setLoading(false);
          } else {
            // Continue polling
            attempts++;
            setTimeout(poll, 2000);
          }
        } catch (error) {
          console.error('Error checking payment:', error);
          if (attempts >= maxAttempts) {
            setStatus('failed');
            setLoading(false);
          } else {
            attempts++;
            setTimeout(poll, 2000);
          }
        }
      };

      poll();
    } catch (error) {
      console.error('Payment status check error:', error);
      setStatus('failed');
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'StudentHome' }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading || status === 'checking' ? (
          <>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.checkingText}>Confirming payment...</Text>
            <Text style={styles.subText}>Please wait while we verify your transaction</Text>
          </>
        ) : status === 'success' ? (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successText}>
              {bookingsCount > 0
                ? `Your ${bookingsCount} lesson${bookingsCount > 1 ? 's have' : ' has'} been booked successfully.`
                : 'Your lesson has been booked successfully.'}
            </Text>
            <Text style={styles.infoText}>
              WhatsApp confirmations have been sent to you and your instructor.
            </Text>
            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Go to My Bookings</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Payment Status Unknown</Text>
            <Text style={styles.errorText}>
              We couldn't verify your payment at this time. Please check your bookings or contact
              support if you were charged.
            </Text>
            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Go to My Bookings</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  checkingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  successIcon: { fontSize: 80, marginBottom: 16 },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorIcon: { fontSize: 80, marginBottom: 16 },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  homeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
