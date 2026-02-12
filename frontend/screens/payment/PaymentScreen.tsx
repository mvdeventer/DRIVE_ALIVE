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
  View,
} from 'react-native';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors } = useTheme();
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
          'PaymentSuccess' as never,
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructor</Text>
          <Text style={[styles.instructorName, { color: colors.primary }]}>
            {instructor.first_name} {instructor.last_name}
            {instructor.is_verified && ' ✅'}
          </Text>
          <Text style={[styles.instructorDetail, { color: colors.textSecondary }]}>
            🚗 {instructor.vehicle_make} {instructor.vehicle_model}
          </Text>
          <Text style={[styles.instructorDetail, { color: colors.textSecondary }]}>
            📍 {instructor.city}
            {instructor.suburb && `, ${instructor.suburb}`}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Summary</Text>
          {bookings.map((booking, index) => (
            <View key={index} style={[styles.bookingItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.bookingDate, { color: colors.text }]}>
                📅 {booking.date} at {booking.time}
              </Text>
              <Text style={[styles.bookingDuration, { color: colors.textSecondary }]}>⏱ 60 minutes</Text>
              <Text style={[styles.bookingDuration, { color: colors.textSecondary }]}>📍 {booking.pickup_address}</Text>
            </View>
          ))}
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Summary</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>R{total_amount.toFixed(2)}</Text>
          </View>
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          <Text style={[styles.paymentMethod, { color: colors.text }]}>💳 PayFast</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>Secure payment via:</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>• Instant EFT</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>• Credit/Debit Cards</Text>
          <Text style={[styles.secureText, { color: colors.success }]}>🔒 Powered by PayFast</Text>
        </Card>

        <Button
          variant="primary"
          onPress={handlePayment}
          disabled={loading}
          loading={loading}
          fullWidth
          style={{ marginTop: 8 }}
        >
          Pay R{total_amount.toFixed(2)}
        </Button>

        <Button
          variant="outline"
          onPress={() => navigation.goBack()}
          disabled={loading}
          fullWidth
          style={{ marginTop: 12 }}
        >
          Cancel
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  cardSpacing: { marginBottom: 16 },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  instructorDetail: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  bookingItem: { paddingVertical: 12, borderBottomWidth: 1 },
  bookingDate: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  bookingDuration: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontSize: Platform.OS === 'web' ? 18 : 16, fontFamily: 'Inter_700Bold' },
  totalValue: { fontSize: Platform.OS === 'web' ? 18 : 16, fontFamily: 'Inter_700Bold' },
  paymentMethod: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  paymentInfo: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  secureText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, fontStyle: 'italic' },
});
