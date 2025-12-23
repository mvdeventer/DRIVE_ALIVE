/**
 * Booking Oversight Screen
 * View and manage all bookings across the system
 */
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import apiService from '../../services/api';

interface Booking {
  id: number;
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

export default function BookingOversightScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const loadBookings = async () => {
    try {
      setError('');
      const data = await apiService.getAllBookingsAdmin(statusFilter);
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
    }, [statusFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleLogout = async () => {
    await apiService.logout();
    navigation.replace('Login');
  };

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel booking for ${booking.student_name} with ${booking.instructor_name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setError('');
              await apiService.cancelBookingAdmin(booking.id);
              setSuccess('Booking cancelled successfully');
              setTimeout(() => setSuccess(''), 5000);
              loadBookings();
            } catch (err: any) {
              setError(err.response?.data?.detail || 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  // Filter bookings based on search query
  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.id.toString().includes(query) ||
      booking.student_name.toLowerCase().includes(query) ||
      booking.instructor_name.toLowerCase().includes(query) ||
      booking.student_id_number.toLowerCase().includes(query) ||
      booking.instructor_id_number.toLowerCase().includes(query)
    );
  });

  const copyBookingDetails = (booking: Booking) => {
    const details = `
════════════════════════════════════════
           BOOKING DETAILS
════════════════════════════════════════

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
          <Text style={styles.bookingId}>ID: #{item.id}</Text>
          <Text style={styles.studentName}>👤 {item.student_name}</Text>
          <Text style={styles.idNumber}> ID: {item.student_id_number}</Text>
          <Text style={styles.instructorName}>🚗 {item.instructor_name}</Text>
          <Text style={styles.idNumber}> ID: {item.instructor_id_number}</Text>
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
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyBookingDetails(item)}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <Text style={styles.copyButtonText}>📋 Copy Details</Text>
        </TouchableOpacity>
        {item.status.toLowerCase() !== 'cancelled' && item.status.toLowerCase() !== 'completed' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(item)}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Booking Oversight</Text>
            <Text style={styles.headerSubtitle}>
              {filteredBookings.length} of {bookings.length} bookings
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, booking ID, or ID number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Status:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={statusFilter}
            onValueChange={value => setStatusFilter(value)}
            style={styles.picker}
          >
            <Picker.Item label="All Statuses" value="" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Confirmed" value="confirmed" />
            <Picker.Item label="Completed" value="completed" />
            <Picker.Item label="Cancelled" value="cancelled" />
          </Picker>
        </View>
      </View>

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id.toString()}
        numColumns={3}
        key="grid"
        columnWrapperStyle={styles.row}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    backgroundColor: '#0066CC',
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
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
    padding: 10,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    margin: 5,
    flex: 1,
    maxWidth: '32%',
    minWidth: 280,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 3,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  instructorName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  idNumber: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 9,
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
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
  },
  detailValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    boxShadow: '0px 4px 15px rgba(0,0,0,0.3)',
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
});
