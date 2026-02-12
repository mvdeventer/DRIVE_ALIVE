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
  View,
} from 'react-native';
import { Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

export default function PaymentSuccessScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
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
        Platform.OS === 'web' ? sessionStorage.getItem('payment_session_id') : null; // Changed from localStorage

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
    // Navigate to the Main tabs — React Navigation will resolve to the
    // user's role-specific home tab automatically.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading || status === 'checking' ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.checkingText, { color: colors.text }]}>Confirming payment...</Text>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>Please wait while we verify your transaction</Text>
          </>
        ) : status === 'success' ? (
          <>
            <Text style={styles.statusIcon}>✅</Text>
            <Text style={[styles.statusTitle, { color: colors.success }]}>Payment Successful!</Text>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {bookingsCount > 0
                ? `Your ${bookingsCount} lesson${bookingsCount > 1 ? 's have' : ' has'} been booked successfully.`
                : 'Your lesson has been booked successfully.'}
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              WhatsApp confirmations have been sent to you and your instructor.
            </Text>
            <Button variant="primary" onPress={handleGoHome}>
              Go to My Bookings
            </Button>
          </>
        ) : (
          <>
            <Text style={styles.statusIcon}>⚠️</Text>
            <Text style={[styles.statusTitle, { color: colors.warning }]}>Payment Status Unknown</Text>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              We couldn't verify your payment at this time. Please check your bookings or contact
              support if you were charged.
            </Text>
            <Button variant="primary" onPress={handleGoHome}>
              Go to My Bookings
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  checkingText: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 24,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  statusIcon: { fontSize: 80, marginBottom: 16 },
  statusTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 32,
  },
});
