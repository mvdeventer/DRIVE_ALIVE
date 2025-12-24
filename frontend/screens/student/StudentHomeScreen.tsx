/**
 * Student Dashboard - Main hub for students to manage their driving lessons
 */
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import ApiService from '../../services/api';

interface Booking {
  id: number;
  instructor_name: string;
  instructor_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_registration?: string;
  instructor_city?: string;
  instructor_suburb?: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  total_price: number;
  pickup_location?: string;
  review_rating?: number;
}

interface StudentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export default function StudentHomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<{ [key: number]: number }>({});
  const [showThankYou, setShowThankYou] = useState<{ [key: number]: boolean }>({});
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload data when screen comes into focus (e.g., after booking lessons)
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Load student profile and bookings
      const [profileRes, bookingsRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/bookings/my-bookings'),
      ]);

      setProfile(profileRes.data);

      // Debug: Log the bookings data
      console.log('📊 Raw bookings data:', JSON.stringify(bookingsRes.data, null, 2));
      if (bookingsRes.data.length > 0) {
        console.log('🔍 First booking sample:', bookingsRes.data[0]);
      }

      // Split bookings into upcoming and past (exclude cancelled bookings)
      const now = new Date();
      const upcoming = bookingsRes.data
        .filter(
          (b: Booking) =>
            new Date(b.scheduled_time) >= now && b.status.toLowerCase() !== 'cancelled'
        )
        .sort(
          (a: Booking, b: Booking) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
        );
      const past = bookingsRes.data
        .filter(
          (b: Booking) => new Date(b.scheduled_time) < now && b.status.toLowerCase() !== 'cancelled'
        )
        .sort(
          (a: Booking, b: Booking) =>
            new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
        );

      console.log(`✅ Loaded ${upcoming.length} upcoming and ${past.length} past bookings`);

      setUpcomingBookings(upcoming);
      setPastBookings(past);

      // Load existing ratings into selectedRatings state
      const existingRatings: { [key: number]: number } = {};
      past.forEach((booking: Booking) => {
        if (booking.review_rating) {
          existingRatings[booking.id] = booking.review_rating;
        }
      });
      setSelectedRatings(prev => ({ ...prev, ...existingRatings }));
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMsg = error.response?.data?.detail || 'Failed to load dashboard data';
      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.reload();
      } else {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user_role');
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewProfile = () => {
    navigation.navigate('EditStudentProfile' as never);
  };

  const handleDeleteBooking = async (booking: Booking) => {
    // If booking is already cancelled, just remove it from the list
    if (booking.status.toLowerCase() === 'cancelled') {
      const confirmMsg = `Remove this cancelled lesson from your list?\n\nInstructor: ${
        booking.instructor_name
      }\nDate: ${formatDate(booking.scheduled_time)}`;

      const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : false;

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Remove Lesson',
          confirmMsg,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Remove',
              style: 'destructive',
              onPress: () => {
                setUpcomingBookings(prev => prev.filter(b => b.id !== booking.id));
                setMessage({ type: 'success', text: '✅ Lesson removed from list' });
                setTimeout(() => setMessage(null), 3000);
              },
            },
          ],
          { cancelable: true }
        );
      } else if (confirmed) {
        setUpcomingBookings(prev => prev.filter(b => b.id !== booking.id));
        setMessage({ type: 'success', text: '✅ Lesson removed from list' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    const lessonTime = new Date(booking.scheduled_time);
    const now = new Date();
    const hoursUntilLesson = (lessonTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check if lesson is in the past
    if (hoursUntilLesson < 0) {
      setMessage({ type: 'error', text: 'Cannot delete a lesson that has already passed' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Calculate cancellation fee
    const cancellationFee = hoursUntilLesson < 6 ? booking.total_price * 0.5 : 0;
    const feeMessage =
      cancellationFee > 0
        ? `\n\n⚠️ Cancellation within 6 hours: 50% fee (R${cancellationFee.toFixed(2)}) will apply.`
        : '';

    const confirmMsg = `Delete this lesson?\n\nInstructor: ${
      booking.instructor_name
    }\nDate: ${formatDate(
      booking.scheduled_time
    )}${feeMessage}\n\nThis will cancel the booking and remove it from your list.`;

    const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : false;

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Delete Booking',
        confirmMsg,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Delete',
            style: 'destructive',
            onPress: async () => {
              await performDeletion(booking.id);
            },
          },
        ],
        { cancelable: true }
      );
    } else if (confirmed) {
      await performDeletion(booking.id);
    }
  };

  const performDeletion = async (bookingId: number) => {
    try {
      // Cancel the booking via API
      await ApiService.post(`/bookings/${bookingId}/cancel`, {
        cancellation_reason: 'Student requested cancellation',
      });

      // Remove from local state immediately (optimistic update)
      setUpcomingBookings(prev => prev.filter(b => b.id !== bookingId));

      setMessage({ type: 'success', text: '✅ Booking deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete booking';
      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSelectRating = async (bookingId: number, rating: number) => {
    // Update selected rating
    setSelectedRatings(prev => ({ ...prev, [bookingId]: rating }));

    // Automatically submit the rating
    try {
      await ApiService.post('/bookings/reviews', {
        booking_id: bookingId,
        rating: rating,
      });

      // Show thank you message
      setShowThankYou(prev => ({ ...prev, [bookingId]: true }));

      // Hide thank you message after 3 seconds
      setTimeout(() => {
        setShowThankYou(prev => {
          const newState = { ...prev };
          delete newState[bookingId];
          return newState;
        });
      }, 3000);

      // Reload bookings silently to update any other data
      loadDashboardData();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to submit rating';
      setMessage({ type: 'error', text: errorMsg });
      // Show error for 5 seconds for better visibility
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getRatingEmoji = (rating?: number) => {
    if (!rating) return '';
    if (rating <= 2) return '😞'; // Sad for 1-2 stars
    if (rating === 3) return '😐'; // Neutral for 3 stars
    return '😊'; // Happy for 4-5 stars
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'cancelled':
        return '#dc3545';
      case 'completed':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{profile?.first_name || 'Student'}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingBookings.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pastBookings.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {upcomingBookings.reduce((sum, b) => sum + b.duration_minutes, 0)}
          </Text>
          <Text style={styles.statLabel}>Minutes Booked</Text>
        </View>
      </View>

      {/* Inline Message Display */}
      {message && (
        <View style={{ marginHorizontal: 16 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('InstructorList')}
        >
          <Text style={styles.actionButtonText}>📚 Book a Lesson</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleViewProfile}
        >
          <Text style={styles.actionButtonText}>👤 View My Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Bookings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
        {upcomingBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming lessons</Text>
            <Text style={styles.emptyStateSubtext}>Book your first lesson to get started!</Text>
          </View>
        ) : (
          <View style={styles.bookingsGrid}>
            {upcomingBookings.map(booking => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.instructorName}>{booking.instructor_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(booking.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.bookingDetail}>👤 Instructor: {booking.instructor_name}</Text>
                <Text style={styles.bookingTime}>🕒 {formatDate(booking.scheduled_time)}</Text>
                <Text style={styles.bookingDuration}>⏱️ {booking.duration_minutes} minutes</Text>
                <Text style={styles.bookingDetail}>
                  🚗 {booking.vehicle_make || 'N/A'} {booking.vehicle_model || ''} (
                  {booking.vehicle_registration || 'N/A'})
                </Text>
                <Text style={styles.bookingDetail}>
                  📍 {booking.instructor_suburb ? `${booking.instructor_suburb}, ` : ''}
                  {booking.instructor_city || 'N/A'}
                </Text>
                <Text style={styles.bookingDetail}>
                  📌 Pickup: {booking.pickup_location || 'Not specified'}
                </Text>
                <Text style={styles.bookingDetail}>📞 {booking.instructor_phone || 'N/A'}</Text>
                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingPrice}>R{booking.total_price.toFixed(2)}</Text>
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteBooking(booking)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Lessons */}
      {pastBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Lessons</Text>
          <View style={styles.bookingsGrid}>
            {pastBookings.map(booking => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.instructorName}>{booking.instructor_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#28a745' }]}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                </View>
                <Text style={styles.bookingDetail}>👤 Instructor: {booking.instructor_name}</Text>
                <Text style={styles.bookingTime}>🕒 {formatDate(booking.scheduled_time)}</Text>
                <Text style={styles.bookingDuration}>⏱️ {booking.duration_minutes} minutes</Text>
                {booking.vehicle_make && (
                  <Text style={styles.bookingDetail}>
                    🚗 {booking.vehicle_make} {booking.vehicle_model} (
                    {booking.vehicle_registration})
                  </Text>
                )}
                {booking.instructor_city && (
                  <Text style={styles.bookingDetail}>
                    📍 {booking.instructor_suburb ? `${booking.instructor_suburb}, ` : ''}
                    {booking.instructor_city}
                  </Text>
                )}
                {booking.pickup_location && (
                  <Text style={styles.bookingDetail}>📌 Pickup: {booking.pickup_location}</Text>
                )}
                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingPrice}>R{booking.total_price.toFixed(2)}</Text>
                </View>
                <View style={styles.ratingSection}>
                  <View style={styles.ratingRow}>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleSelectRating(booking.id, star)}
                          style={styles.starButton}
                        >
                          <Text
                            style={[
                              styles.starText,
                              {
                                opacity:
                                  selectedRatings[booking.id] && selectedRatings[booking.id] >= star
                                    ? 1
                                    : 0.3,
                              },
                            ]}
                          >
                            ⭐
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {selectedRatings[booking.id] && (
                      <Text style={styles.ratingEmoji}>
                        {getRatingEmoji(selectedRatings[booking.id])}
                      </Text>
                    )}
                  </View>
                  {showThankYou[booking.id] && (
                    <Text style={styles.thankYouText}>✓ Thanks for rating!</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bookingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minWidth: Platform.OS === 'web' ? 'calc(33.33% - 12px)' : '100%',
    maxWidth: Platform.OS === 'web' ? 'calc(33.33% - 12px)' : '100%',
    flex: Platform.OS === 'web' ? undefined : 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  bookingDuration: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  bookingDetail: {
    fontSize: 10,
    color: '#555',
    marginBottom: 2,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  starRating: {
    flexDirection: 'row',
    gap: 3,
  },
  starButton: {
    padding: 3,
  },
  starText: {
    fontSize: 20,
  },
  ratingSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingEmoji: {
    fontSize: 28,
  },
  thankYouText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 6,
  },
  rateButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  rateButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
});
