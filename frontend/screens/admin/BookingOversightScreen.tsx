/**
 * Booking Oversight Screen
 * View and manage all bookings across the system
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useTheme } from '../../theme/ThemeContext';
import apiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

const SCREEN_NAME = 'BookingOversightScreen';

interface Booking {
  id: number;
  booking_reference: string;
  student_id: number;
  student_name: string;
  student_id_number: string;
  instructor_id: number;
  instructor_name: string;
  instructor_id_number: string;
  lesson_date: string;
  duration_minutes: number;
  lesson_type: string;
  pickup_address: string;
  dropoff_address?: string;
  status: string;
  amount: number;
  created_at: string;
}

export default function BookingOversightScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'cancelled' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);

  const loadBookings = async () => {
    try {
      setError('');
      const data = await apiService.getAllBookingsAdmin(''); // Load all bookings
      // Sort by lesson_date (earliest first)
      const sorted = data.sort(
        (a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
      );
      setBookings(sorted);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (booking: Booking) => {
    setConfirmCancel(booking);
  };

  const confirmCancelBooking = async () => {
    if (!confirmCancel) return;

    try {
      setError('');
      await apiService.cancelBookingAdmin(confirmCancel.id);
      showMessage(
        setSuccess,
        'Booking cancelled successfully',
        SCREEN_NAME,
        'bookingCancel',
        'success'
      );
      setConfirmCancel(null);
      loadBookings();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to cancel booking',
        SCREEN_NAME,
        'error',
        'error'
      );
      setConfirmCancel(null);
    }
  };

  // Filter bookings based on active tab and search query
  const filteredBookings = bookings
    .filter(booking => {
      // Tab filter
      if (activeTab !== 'all') {
        if (booking.status.toLowerCase() !== activeTab) return false;
      }

      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase().trim();

      // Format lesson date for searching (multiple formats)
      const lessonDate = new Date(booking.lesson_date);
      const dateStr = lessonDate.toLocaleDateString(); // e.g., "12/26/2025"
      const dateStrShort = lessonDate.toLocaleDateString('en-ZA'); // e.g., "2025/12/26"
      const dateStrLong = lessonDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }); // e.g., "December 26, 2025"
      const dateStrISO = booking.lesson_date.split('T')[0]; // e.g., "2025-12-26"

      // Search by booking reference, booking ID, student/instructor name, ID numbers, or date
      return (
        (booking.booking_reference || '').toLowerCase().includes(query) ||
        booking.id.toString().includes(query) ||
        (booking.student_name || '').toLowerCase().includes(query) ||
        (booking.instructor_name || '').toLowerCase().includes(query) ||
        (booking.student_id_number || '').toString().toLowerCase().includes(query) ||
        (booking.instructor_id_number || '').toString().toLowerCase().includes(query) ||
        booking.student_id.toString().includes(query) ||
        booking.instructor_id.toString().includes(query) ||
        dateStr.toLowerCase().includes(query) ||
        dateStrShort.toLowerCase().includes(query) ||
        dateStrLong.toLowerCase().includes(query) ||
        dateStrISO.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime());

  const copyBookingDetails = (booking: Booking) => {
    const details = `
════════════════════════════════════════
           BOOKING DETAILS
════════════════════════════════════════

Booking Ref:    ${booking.booking_reference}
Booking ID:     #${booking.id}
Status:         ${booking.status.toUpperCase()}
Lesson Type:    ${booking.lesson_type.toUpperCase()}

👤 Student:     ${booking.student_name}
   ID Number:   ${booking.student_id_number}

🚗 Instructor:  ${booking.instructor_name}
   ID Number:   ${booking.instructor_id_number}

📅 Date:        ${new Date(booking.lesson_date).toLocaleDateString()}
🕐 Time:        ${new Date(booking.lesson_date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}
⏱️  Duration:    ${booking.duration_minutes} minutes

📍 Pickup:      ${booking.pickup_address}${
      booking.dropoff_address
        ? `
📍 Dropoff:     ${booking.dropoff_address}`
        : ''
    }

💰 Amount:      R${booking.amount.toFixed(2)}

📝 Created:     ${new Date(booking.created_at).toLocaleString()}

════════════════════════════════════════
`.trim();

    Clipboard.setString(details);
    setSuccess('Booking details copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  const copyAndCloseModal = () => {
    if (selectedBooking) {
      copyBookingDetails(selectedBooking);
      closeModal();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <Card
      variant="elevated"
      style={[styles.bookingCard]}
      onPress={() => showBookingDetails(item)}
    >
      <View style={[styles.bookingHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.bookingInfo}>
          <Text style={[styles.bookingId, { color: colors.primary }]}>
            ID: #{item.id} {item.booking_reference}
          </Text>
          <Text style={[styles.studentName, { color: colors.text }]}>{item.student_name}</Text>
          <Text style={[styles.idNumber, { color: colors.textMuted }]}>ID: {item.student_id_number}</Text>
          <Text style={[styles.instructorName, { color: colors.textSecondary }]}>{item.instructor_name}</Text>
          <Text style={[styles.idNumber, { color: colors.textMuted }]}>ID: {item.instructor_id_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.lesson_type.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(item.lesson_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Time:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {new Date(item.lesson_date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.duration_minutes} min</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Pickup:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
            {item.pickup_address}
          </Text>
        </View>
        {item.dropoff_address && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dropoff:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
              {item.dropoff_address}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount:</Text>
          <Text style={[styles.amountText, { color: colors.success }]}>R{item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button variant="primary" size="sm" style={{ flex: 1 }} onPress={() => copyBookingDetails(item)}>
          Copy Details
        </Button>
        {item.status.toLowerCase() !== 'cancelled' && item.status.toLowerCase() !== 'completed' && (
          <Button variant="danger" size="sm" style={{ flex: 1 }} onPress={() => handleCancelBooking(item)}>
            Cancel
          </Button>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Booking Oversight"
        onBack={() => navigation.goBack()}
        showBackButton={navigation.canGoBack()}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((tab) => {
          const count = tab === 'all' ? bookings.length : bookings.filter(b => b.status.toLowerCase() === tab).length;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, backgroundColor: colors.primaryLight }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                {label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
          placeholder="Search by name, booking reference, student/instructor ID, or date..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id.toString()}
        numColumns={Dimensions.get('window').width < 768 ? 1 : 3}
        key={Dimensions.get('window').width < 768 ? 'list' : 'grid'}
        columnWrapperStyle={Dimensions.get('window').width < 768 ? undefined : styles.row}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <ThemedModal
        visible={modalVisible}
        onClose={closeModal}
        title="Booking Details"
        size="lg"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="primary" style={{ flex: 1 }} onPress={copyAndCloseModal}>
              Copy Details
            </Button>
            <Button variant="secondary" style={{ flex: 1 }} onPress={closeModal}>
              Close
            </Button>
          </View>
        }
      >
            {selectedBooking && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Booking Reference:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.booking_reference}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Booking ID:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>#{selectedBooking.id}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status:</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                    <Text style={styles.modalStatusText}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Lesson Type:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.lesson_type.toUpperCase()}</Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Student</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.student_name}</Text>
                  <Text style={[styles.modalSubvalue, { color: colors.textMuted }]}>ID: {selectedBooking.student_id_number}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Instructor</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.instructor_name}</Text>
                  <Text style={[styles.modalSubvalue, { color: colors.textMuted }]}>
                    ID: {selectedBooking.instructor_id_number}
                  </Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.lesson_date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Time:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.lesson_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Duration:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.duration_minutes} minutes</Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pickup:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.pickup_address}</Text>
                </View>

                {selectedBooking.dropoff_address && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Dropoff:</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.dropoff_address}</Text>
                  </View>
                )}

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Amount:</Text>
                  <Text style={[styles.modalAmount, { color: colors.success }]}>R{selectedBooking.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Created:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.created_at).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}
      </ThemedModal>

      {/* Confirmation Modal */}
      <ThemedModal
        visible={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title="Cancel Booking"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmCancel(null)}>
              No, Keep It
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={confirmCancelBooking}>
              Yes, Cancel Booking
            </Button>
          </View>
        }
      >
            <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: 15, fontFamily: 'Inter_400Regular' }}>
              Are you sure you want to cancel this booking?
            </Text>

              {confirmCancel && (
                <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>Student: </Text>
                    <Text>{confirmCancel.student_name}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>Instructor: </Text>
                    <Text>{confirmCancel.instructor_name}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>Date: </Text>
                    <Text>{new Date(confirmCancel.lesson_date).toLocaleString()}</Text>
                  </Text>
                </View>
              )}

            <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
              This action cannot be undone.
            </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 15 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 11,
    fontFamily: 'Inter_600SemiBold',
  },
  searchContainer: {
    padding: Platform.OS === 'web' ? 15 : 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: Platform.OS === 'web' ? 40 : 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 15 : 10,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    padding: Platform.OS === 'web' ? 10 : 6,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: Platform.OS === 'web' ? 5 : 2,
  },
  bookingCard: {
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: Dimensions.get('window').width < 768 ? '100%' : '30%',
    minWidth: Dimensions.get('window').width < 768 ? '100%' : (Platform.OS === 'web' ? 280 : 200),
    maxWidth: '100%',
    flexGrow: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  studentName: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  idNumber: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  bookingDetails: {
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'web' ? 5 : 4,
  },
  detailLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
  },
  detailValue: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_500Medium',
  },
  amountText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_700Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
    marginTop: Platform.OS === 'web' ? 6 : 4,
  },
  // Modal styles
  modalSection: {
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  modalSubvalue: {
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  modalDivider: {
    height: 1,
    marginVertical: 15,
  },
  confirmDetails: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
});
