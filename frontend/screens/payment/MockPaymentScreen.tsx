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
  TouchableOpacity,
  View,
} from 'react-native';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

export default function MockPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
    <View style={styles.container}>
      {Platform.OS === 'web' && <WebNavigationHeader />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>⚠️ Mock Payment Mode</Text>
          <Text style={styles.subtitle}>Development mode - No real payment will be processed</Text>

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {!processing && !message && (
            <>
              <Text style={styles.infoText}>
                This is a simulated payment screen for development.{'\n\n'}
                Click "Pay Now" to simulate a successful payment, or "Cancel" to simulate a failed
                payment.
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.successButton]}
                  onPress={() => handleMockPayment(true)}
                  disabled={processing}
                >
                  <Text style={styles.buttonText}>✅ Pay Now (Mock)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => handleMockPayment(false)}
                  disabled={processing}
                >
                  <Text style={styles.buttonText}>❌ Cancel Payment</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>📝 For Production:</Text>
                <Text style={styles.noteText}>
                  Set STRIPE_SECRET_KEY in backend/.env to use real Stripe payments
                </Text>
              </View>
            </>
          )}

          {processing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={styles.loadingText}>Processing...</Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: '#4caf50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    color: '#1976d2',
    textAlign: 'center',
  },
  noteBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
