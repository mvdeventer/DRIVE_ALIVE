/**
 * Payment Screen - Displays payment summary, credits, cancellation policy and redirects to Stripe
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreditBanner from '../../components/CreditBanner';
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
  reschedule_booking_id?: number;
}

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const params = route.params as RouteParams;

  const { instructor, bookings, total_amount, booking_fee, lesson_amount, reschedule_booking_id } = params;

  const [loading, setLoading] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{
    total_available_credit: number;
    credits: any[];
  } | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Fetch available credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const data = await ApiService.getAvailableCredits();
        setCreditInfo(data);
      } catch {
        // Credits endpoint may not exist yet — ignore
        setCreditInfo({ total_available_credit: 0, credits: [] });
      } finally {
        setLoadingCredits(false);
      }
    };
    fetchCredits();
  }, []);

  const creditApplied = Math.min(creditInfo?.total_available_credit || 0, total_amount);
  const finalAmount = Math.max(total_amount - creditApplied, 0);

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
        payment_gateway: 'stripe',
        ...(reschedule_booking_id ? { reschedule_booking_id } : {}),
      });

      if (Platform.OS === 'web') {
        localStorage.setItem('payment_session_id', response.payment_session_id);

        if (response.payment_url.includes('/payment/mock')) {
          navigation.navigate(
            'PaymentMock' as never,
            { session_id: response.payment_session_id } as never
          );
        } else {
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
        <CreditBanner />

        {/* Reschedule notice */}
        {reschedule_booking_id && (
          <Card variant="elevated" style={[styles.cardSpacing, { borderLeftWidth: 4, borderLeftColor: colors.warning }]}>
            <Text style={[styles.sectionTitle, { color: colors.warning }]}>📅 Reschedule Payment</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Your original booking will be marked as rescheduled and a new booking reference will be issued once payment is confirmed.
            </Text>
          </Card>
        )}

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

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Lesson Fee</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>R{lesson_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Booking Fee</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>R{booking_fee.toFixed(2)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>R{total_amount.toFixed(2)}</Text>
          </View>

          {!loadingCredits && creditApplied > 0 && (
            <>
              <View style={[styles.creditRow, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.creditLabel, { color: colors.success }]}>🎉 Credit Applied</Text>
                <Text style={[styles.creditValue, { color: colors.success }]}>-R{creditApplied.toFixed(2)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              {creditApplied > 0 ? 'You Pay' : 'Total'}
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>R{finalAmount.toFixed(2)}</Text>
          </View>

          {loadingCredits && (
            <View style={styles.creditLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.creditLoadingText, { color: colors.textSecondary }]}>Checking available credits...</Text>
            </View>
          )}
        </Card>

        {/* Cancellation Policy Card */}
        <Card variant="elevated" style={[styles.cardSpacing, { borderLeftWidth: 4, borderLeftColor: colors.warning }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Cancellation Policy</Text>
          <View style={styles.policyItem}>
            <Text style={[styles.policyBullet, { color: colors.success }]}>●</Text>
            <Text style={[styles.policyText, { color: colors.text }]}>
              <Text style={styles.policyBold}>24+ hours before lesson:</Text> 90% credit on your next booking
            </Text>
          </View>
          <View style={styles.policyItem}>
            <Text style={[styles.policyBullet, { color: colors.warning }]}>●</Text>
            <Text style={[styles.policyText, { color: colors.text }]}>
              <Text style={styles.policyBold}>Less than 24 hours:</Text> 50% credit on your next booking
            </Text>
          </View>
          <View style={styles.policyItem}>
            <Text style={[styles.policyBullet, { color: colors.primary }]}>●</Text>
            <Text style={[styles.policyText, { color: colors.text }]}>
              <Text style={styles.policyBold}>Admin cancellation:</Text> 100% credit refunded
            </Text>
          </View>
          <Text style={[styles.policyNote, { color: colors.textSecondary }]}>
            Credits are automatically applied to your next booking payment. To cancel, you must first book a new lesson.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          <Text style={[styles.paymentMethod, { color: colors.text }]}>💳 Secure Payment</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>Pay securely via:</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>• Instant EFT</Text>
          <Text style={[styles.paymentInfo, { color: colors.textSecondary }]}>• Credit/Debit Cards</Text>
          <Text style={[styles.secureText, { color: colors.success }]}>🔒 Secure Payment Gateway</Text>
        </Card>

        <Button
          variant="primary"
          onPress={handlePayment}
          disabled={loading}
          loading={loading}
          fullWidth
          style={{ marginTop: 8 }}
        >
          {creditApplied > 0
            ? `Pay R${finalAmount.toFixed(2)} (R${creditApplied.toFixed(2)} credit applied)`
            : `Pay R${total_amount.toFixed(2)}`
          }
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  divider: { height: 1, marginVertical: 8 },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  creditLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  creditValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  creditLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  creditLoadingText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontSize: Platform.OS === 'web' ? 18 : 16, fontFamily: 'Inter_700Bold' },
  totalValue: { fontSize: Platform.OS === 'web' ? 18 : 16, fontFamily: 'Inter_700Bold' },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  policyBullet: { fontSize: 10, marginTop: 4 },
  policyText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  policyBold: { fontFamily: 'Inter_600SemiBold' },
  policyNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  paymentMethod: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  paymentInfo: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  secureText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, fontStyle: 'italic' },
});
