/**
 * Payment Screen - Displays payment summary and redirects to PayFast
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

interface RouteParams {
  instructor: any;
  bookings: any[];
  total_amount: number;
  booking_fee: number;
  lesson_amount: number;
}

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;

  const { instructor, bookings, total_amount, booking_fee, lesson_amount } = params;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const bookingsData = bookings.map(booking => ({
        lesson_date: `${booking.date}T${booking.time}:00`,
        duration_minutes: 60,
        pickup_address: booking.pickup_address || '',
        pickup_latitude: booking.pickup_latitude || -33.9249,
        pickup_longitude: booking.pickup_longitude || 18.4241,
        student_notes: booking.notes || null,
      }));

      const response = await ApiService.initiatePayment({
        instructor_id: instructor.instructor_id,
        bookings: bookingsData,
        payment_gateway: 'stripe', // Using Stripe instead of PayFast
      });

      if (Platform.OS === 'web') {
        localStorage.setItem('payment_session_id', response.payment_session_id);

        // Check if it's a mock payment URL (development mode)
        if (response.payment_url.includes('/payment/mock')) {
          // Navigate to mock payment screen using React Navigation
          navigation.navigate(
            'PaymentMock' as never,
            { session_id: response.payment_session_id } as never
          );
        } else {
          // For real payment gateways, use full redirect
          window.location.href = response.payment_url;
        }
      } else {
        await Linking.openURL(response.payment_url);
        navigation.navigate(
          'PaymentStatus' as never,
          {
            payment_session_id: response.payment_session_id,
          } as never
        );
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to initiate payment',
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {message && (
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      )}

      <WebNavigationHeader
        title="Confirm Payment"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Instructor</Text>
          <Text style={styles.instructorName}>
            {instructor.first_name} {instructor.last_name}
            {instructor.is_verified && ' ✅'}
          </Text>
          <Text style={styles.instructorDetail}>
            🚗 {instructor.vehicle_make} {instructor.vehicle_model}
          </Text>
          <Text style={styles.instructorDetail}>
            📍 {instructor.city}
            {instructor.suburb && `, ${instructor.suburb}`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          {bookings.map((booking, index) => (
            <View key={index} style={styles.bookingItem}>
              <Text style={styles.bookingDate}>
                📅 {booking.date} at {booking.time}
              </Text>
              <Text style={styles.bookingDuration}>⏱ 60 minutes</Text>
              <Text style={styles.bookingAddress}>📍 {booking.pickup_address}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R{total_amount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.paymentMethod}>💳 PayFast</Text>
          <Text style={styles.paymentInfo}>Secure payment via:</Text>
          <Text style={styles.paymentOption}>• Instant EFT</Text>
          <Text style={styles.paymentOption}>• Credit/Debit Cards</Text>
          <Text style={styles.secureText}>🔒 Powered by PayFast</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay R{total_amount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  sectionTitle: { fontSize: Platform.OS === 'web' ? 18 : 16, fontWeight: 'bold', color: '#333', marginBottom: Platform.OS === 'web' ? 12 : 10 },
  instructorName: { fontSize: Platform.OS === 'web' ? 16 : 14, fontWeight: '600', color: '#007AFF', marginBottom: Platform.OS === 'web' ? 8 : 6 },
  instructorDetail: { fontSize: 14, color: '#666', marginBottom: 4 },
  bookingItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  bookingDate: { fontSize: Platform.OS === 'web' ? 16 : 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  bookingDuration: { fontSize: 14, color: '#666', marginBottom: 4 },
  bookingAddress: { fontSize: 14, color: '#666' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceLabel: { fontSize: 14, color: '#666' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontSize: Platform.OS === 'web' ? 18 : 16, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: Platform.OS === 'web' ? 18 : 16, fontWeight: 'bold', color: '#007AFF' },
  paymentMethod: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  paymentInfo: { fontSize: 14, color: '#666', marginBottom: 8 },
  paymentOption: { fontSize: 14, color: '#666', marginLeft: 8, marginBottom: 4 },
  secureText: { fontSize: 12, color: '#28a745', marginTop: 8, fontStyle: 'italic' },
  payButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  payButtonDisabled: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
});
