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
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
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

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return styles.statusPending;
      case 'confirmed':
        return styles.statusConfirmed;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => showBookingDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingId}>
            ID: #{item.id} • {item.booking_reference}
          </Text>
          <Text style={styles.studentName}>👤 {item.student_name}</Text>
          <Text style={styles.idNumber}>ID: {item.student_id_number}</Text>
          <Text style={styles.instructorName}>🚗 {item.instructor_name}</Text>
          <Text style={styles.idNumber}>ID: {item.instructor_id_number}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>� Type:</Text>
          <Text style={styles.detailValue}>{item.lesson_type.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Date:</Text>
          <Text style={styles.detailValue}>{new Date(item.lesson_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🕐 Time:</Text>
          <Text style={styles.detailValue}>
            {new Date(item.lesson_date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏱️ Duration:</Text>
          <Text style={styles.detailValue}>{item.duration_minutes} min</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Pickup:</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {item.pickup_address}
          </Text>
        </View>
        {item.dropoff_address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📍 Dropoff:</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {item.dropoff_address}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💰 Amount:</Text>
          <Text style={styles.amountText}>R{item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📝 Created:</Text>
          <Text style={styles.detailValue}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.copyButton} onPress={() => copyBookingDetails(item)}>
          <Text style={styles.copyButtonText}>📋 Copy Details</Text>
        </TouchableOpacity>
        {item.status.toLowerCase() !== 'cancelled' && item.status.toLowerCase() !== 'completed' && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(item)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Booking Oversight"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All ({bookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({bookings.filter(b => b.status.toLowerCase() === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed ({bookings.filter(b => b.status.toLowerCase() === 'completed').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>
            Cancelled ({bookings.filter(b => b.status.toLowerCase() === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, booking reference, student/instructor ID, or date (e.g., BK4251308E, 2025-12-26)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
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

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Booking Reference:</Text>
                  <Text style={styles.modalValue}>{selectedBooking.booking_reference}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Booking ID:</Text>
                  <Text style={styles.modalValue}>#{selectedBooking.id}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <View style={[styles.modalStatusBadge, getStatusStyle(selectedBooking.status)]}>
                    <Text style={styles.modalStatusText}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Lesson Type:</Text>
                  <Text style={styles.modalValue}>{selectedBooking.lesson_type.toUpperCase()}</Text>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>👤 Student</Text>
                  <Text style={styles.modalValue}>{selectedBooking.student_name}</Text>
                  <Text style={styles.modalSubvalue}>ID: {selectedBooking.student_id_number}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🚗 Instructor</Text>
                  <Text style={styles.modalValue}>{selectedBooking.instructor_name}</Text>
                  <Text style={styles.modalSubvalue}>
                    ID: {selectedBooking.instructor_id_number}
                  </Text>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>📅 Date:</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedBooking.lesson_date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>🕐 Time:</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedBooking.lesson_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>⏱️ Duration:</Text>
                  <Text style={styles.modalValue}>{selectedBooking.duration_minutes} minutes</Text>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>📍 Pickup:</Text>
                  <Text style={styles.modalValue}>{selectedBooking.pickup_address}</Text>
                </View>

                {selectedBooking.dropoff_address && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>📍 Dropoff:</Text>
                    <Text style={styles.modalValue}>{selectedBooking.dropoff_address}</Text>
                  </View>
                )}

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>💰 Amount:</Text>
                  <Text style={styles.modalAmount}>R{selectedBooking.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>📝 Created:</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedBooking.created_at).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCopyButton} onPress={copyAndCloseModal}>
                <Text style={styles.modalCopyButtonText}>📋 Copy Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!confirmCancel}
        onRequestClose={() => setConfirmCancel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ Cancel Booking</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.confirmText}>Are you sure you want to cancel this booking?</Text>

              {confirmCancel && (
                <View style={styles.confirmDetails}>
                  <Text style={styles.confirmDetailText}>
                    <Text style={styles.boldText}>Student: </Text>
                    <Text>{confirmCancel.student_name}</Text>
                  </Text>
                  <Text style={styles.confirmDetailText}>
                    <Text style={styles.boldText}>Instructor: </Text>
                    <Text>{confirmCancel.instructor_name}</Text>
                  </Text>
                  <Text style={styles.confirmDetailText}>
                    <Text style={styles.boldText}>Date: </Text>
                    <Text>{new Date(confirmCancel.lesson_date).toLocaleString()}</Text>
                  </Text>
                </View>
              )}

              <Text style={styles.warningText}>⚠️ This action cannot be undone.</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setConfirmCancel(null)}
              >
                <Text style={styles.cancelModalButtonText}>No, Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmCancelButton} onPress={confirmCancelBooking}>
                <Text style={styles.confirmCancelButtonText}>Yes, Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 17,
    fontWeight: 'bold',
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 15 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0066CC',
    backgroundColor: '#F0F7FF',
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 11,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    padding: Platform.OS === 'web' ? 15 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    height: Platform.OS === 'web' ? 40 : 36,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 15 : 10,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    backgroundColor: '#FFF',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    padding: Platform.OS === 'web' ? 15 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: Platform.OS === 'web' ? 5 : 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  picker: {
    height: 40,
  },
  listContainer: {
    padding: Platform.OS === 'web' ? 10 : 6,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: Platform.OS === 'web' ? 5 : 2,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: Dimensions.get('window').width < 768 ? '100%' : '30%',
    minWidth: Dimensions.get('window').width < 768 ? '100%' : (Platform.OS === 'web' ? 280 : 200),
    maxWidth: '100%',
    flexGrow: 1,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 2,
  },
  studentName: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#666',
    marginBottom: 2,
  },
  idNumber: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 6 : 5,
    paddingVertical: Platform.OS === 'web' ? 3 : 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statusPending: {
    backgroundColor: '#FFC107',
  },
  statusConfirmed: {
    backgroundColor: '#0066CC',
  },
  statusCompleted: {
    backgroundColor: '#28A745',
  },
  statusCancelled: {
    backgroundColor: '#DC3545',
  },
  statusDefault: {
    backgroundColor: '#6C757D',
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
    color: '#666',
  },
  detailValue: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#333',
    fontWeight: '500',
  },
  amountText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#28A745',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 6 : 4,
    marginTop: Platform.OS === 'web' ? 6 : 4,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: Platform.OS === 'web' ? 8 : 6,
    borderRadius: 5,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: Platform.OS === 'web' ? 8 : 6,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: Platform.OS === 'web' ? '50%' : '92%',
    maxWidth: 650,
    maxHeight: '85%',
    boxShadow: '0px 4px 15px #0000004D',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  modalSubvalue: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalAmount: {
    fontSize: 18,
    color: '#28A745',
    fontWeight: 'bold',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCopyButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCopyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
  },
  modalBody: {
    padding: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  confirmDetails: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  confirmDetailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0066CC',
  },
  warningText: {
    fontSize: 14,
    color: '#DC3545',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
