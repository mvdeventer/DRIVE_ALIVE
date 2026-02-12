/**
 * Mock Payment Screen - Simulates payment for development
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

export default function MockPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const params = route.params as any;
  const queryParams = new URLSearchParams(Platform.OS === 'web' ? window.location.search : '');
  const sessionId = params?.session_id || queryParams.get('session_id');

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log('MockPaymentScreen - Session ID:', sessionId);
    console.log('MockPaymentScreen - Route params:', params);
    if (!sessionId) {
      setMessage('Error: No payment session ID provided');
    }
  }, [sessionId]);

  const handleMockPayment = async (success: boolean) => {
    try {
      console.log('Mock payment clicked, success:', success, 'sessionId:', sessionId);
      setProcessing(true);
      setMessage(''); // Clear any previous error

      if (success) {
        console.log('Calling completeMockPayment with sessionId:', sessionId);
        // Trigger webhook manually for mock payment
        await ApiService.completeMockPayment(sessionId);

        setMessage('✅ Payment successful! Redirecting...');

        setTimeout(() => {
          navigation.navigate('PaymentSuccess' as never, { session_id: sessionId } as never);
        }, 1500);
      } else {
        setMessage('❌ Payment cancelled');
        setTimeout(() => {
          navigation.navigate('PaymentCancel' as never);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Mock payment error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setMessage('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === 'web' && <WebNavigationHeader />}

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <Text style={[styles.title, { color: colors.warning }]}>⚠️ Mock Payment Mode</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Development mode - No real payment will be processed</Text>

          {message ? (
            <View style={[styles.messageBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.messageText, { color: colors.primary }]}>{message}</Text>
            </View>
          ) : null}

          {!processing && !message && (
            <>
              <Text style={[styles.infoText, { color: colors.text }]}>
                This is a simulated payment screen for development.{'\n\n'}
                Click "Pay Now" to simulate a successful payment, or "Cancel" to simulate a failed
                payment.
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  variant="primary"
                  onPress={() => handleMockPayment(true)}
                  disabled={processing}
                  fullWidth
                  style={{ backgroundColor: colors.success }}
                >
                  ✅ Pay Now (Mock)
                </Button>

                <Button
                  variant="danger"
                  onPress={() => handleMockPayment(false)}
                  disabled={processing}
                  fullWidth
                >
                  ❌ Cancel Payment
                </Button>
              </View>

              <View style={[styles.noteBox, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.warning }]}>
                <Text style={[styles.noteTitle, { color: colors.warning }]}>📝 For Production:</Text>
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  Set STRIPE_SECRET_KEY in backend/.env to use real Stripe payments
                </Text>
              </View>
            </>
          )}

          {processing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Processing...</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  card: {
    maxWidth: 500,
    width: '100%',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: Platform.OS === 'web' ? 24 : 20,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  messageBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  noteBox: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
