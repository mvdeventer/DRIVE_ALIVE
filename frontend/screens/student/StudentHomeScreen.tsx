/**
 * Student Dashboard - Main hub for students to manage their driving lessons
 */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import { Button, Card, StatCard, Badge, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

interface Booking {
  id: number;
  booking_reference?: string;
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
  const { colors } = useTheme();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [hiddenBookingIds, setHiddenBookingIds] = useState<Set<number>>(new Set());
  const [showUnhideModal, setShowUnhideModal] = useState(false);
  const [selectedUnhideIds, setSelectedUnhideIds] = useState<Set<number>>(new Set());
  const [selectedRatings, setSelectedRatings] = useState<{ [key: number]: number }>({});
  const [showThankYou, setShowThankYou] = useState<{ [key: number]: boolean }>({});
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Load hidden bookings from storage on mount
  useEffect(() => {
    loadHiddenBookings();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload data when screen comes into focus (e.g., after booking lessons)
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadHiddenBookings = async () => {
    try {
      const storage = Platform.OS === 'web' ? sessionStorage : SecureStore; // Changed from localStorage
      const stored =
        Platform.OS === 'web'
          ? storage.getItem('hidden_bookings')
          : await storage.getItemAsync('hidden_bookings');

      if (stored) {
        const ids = JSON.parse(stored);
        setHiddenBookingIds(new Set(ids));
        console.log(`📦 Loaded ${ids.length} hidden bookings from storage`);
      }
    } catch (error) {
      console.error('Error loading hidden bookings:', error);
    }
  };

  const saveHiddenBookings = async (ids: Set<number>) => {
    try {
      const storage = Platform.OS === 'web' ? sessionStorage : SecureStore; // Changed from localStorage
      const idsArray = Array.from(ids);
      const jsonString = JSON.stringify(idsArray);

      if (Platform.OS === 'web') {
        storage.setItem('hidden_bookings', jsonString);
      } else {
        await storage.setItemAsync('hidden_bookings', jsonString);
      }
      console.log(`💾 Saved ${idsArray.length} hidden bookings to storage`);
    } catch (error) {
      console.error('Error saving hidden bookings:', error);
    }
  };

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
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
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
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

  const handleViewProfile = () => {
    navigation.navigate('ProfileTab' as never);
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
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                setMessage({ type: 'success', text: '✅ Lesson removed from list' });
                setTimeout(() => setMessage(null), 3000);
              },
            },
          ],
          { cancelable: true }
        );
      } else if (confirmed) {
        setUpcomingBookings(prev => prev.filter(b => b.id !== booking.id));
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setMessage({ type: 'success', text: '✅ Booking deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete booking';
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

  const handleHideCompletedLesson = (booking: Booking) => {
    // Check if lesson has a rating - MUST rate before hiding
    if (!booking.review_rating && !selectedRatings[booking.id]) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setMessage({
        type: 'error',
        text: '⚠️ Please rate this lesson before hiding it. Select 1-5 stars above.',
      });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    // Lesson has been rated, allow hiding
    const newHiddenIds = new Set([...hiddenBookingIds, booking.id]);
    setHiddenBookingIds(newHiddenIds);
    saveHiddenBookings(newHiddenIds);
    setMessage({
      type: 'success',
      text: '✅ Lesson hidden from view (not deleted from system)',
    });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleToggleUnhideSelection = (bookingId: number) => {
    setSelectedUnhideIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleSelectAllUnhide = () => {
    if (selectedUnhideIds.size === hiddenBookingIds.size) {
      setSelectedUnhideIds(new Set());
    } else {
      setSelectedUnhideIds(new Set(hiddenBookingIds));
    }
  };

  const handleUnhideLessons = () => {
    if (selectedUnhideIds.size === 0) {
      setMessage({
        type: 'error',
        text: '⚠️ Please select at least one lesson to unhide',
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const newHiddenIds = new Set(hiddenBookingIds);
    selectedUnhideIds.forEach(id => newHiddenIds.delete(id));
    setHiddenBookingIds(newHiddenIds);
    saveHiddenBookings(newHiddenIds);

    const count = selectedUnhideIds.size;
    setSelectedUnhideIds(new Set());
    setShowUnhideModal(false);
    setMessage({
      type: 'success',
      text: `✅ ${count} lesson${count > 1 ? 's' : ''} unhidden successfully`,
    });
    setTimeout(() => setMessage(null), 4000);
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
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.danger;
      case 'completed':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.first_name || 'Student'}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="📅"
          value={upcomingBookings.length}
          label="Upcoming"
          variant="primary"
        />
        <StatCard
          icon="✅"
          value={pastBookings.length}
          label="Completed"
          variant="success"
        />
        <StatCard
          icon="⏱️"
          value={upcomingBookings.reduce((sum, b) => sum + b.duration_minutes, 0)}
          label="Minutes Booked"
          variant="info"
        />
      </View>

      {/* Inline Message Display */}
      {message ? (
        <View style={{ marginHorizontal: 16 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      ) : null}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <Button
          label="📚 Book a Lesson"
          onPress={() => (navigation as any).navigate('FindTab')}
          fullWidth
          style={{ marginBottom: 12 }}
        />
        <Button
          label="👤 View My Profile"
          onPress={handleViewProfile}
          variant="secondary"
          fullWidth
        />
      </View>

      {/* Upcoming Bookings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Lessons</Text>
        {upcomingBookings.length === 0 ? (
          <Card variant="outlined" padding="lg" style={{ alignItems: 'center' }}>
            <Text style={[styles.emptyStateText, { color: colors.text }]}>No upcoming lessons</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              Book your first lesson to get started!
            </Text>
          </Card>
        ) : (
          <View style={styles.bookingsGrid}>
            {upcomingBookings.map(booking => (
              <Card key={booking.id} variant="elevated" padding="md" style={styles.bookingCardWrap}>
                <View style={styles.bookingHeader}>
                  <Text style={[styles.instructorName, { color: colors.text }]}>{booking.instructor_name}</Text>
                  <Badge
                    label={booking.status}
                    variant={
                      booking.status.toLowerCase() === 'confirmed'
                        ? 'success'
                        : booking.status.toLowerCase() === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                    size="sm"
                  />
                </View>
                {booking.booking_reference ? (
                  <Text style={[styles.bookingReference, { color: colors.primary }]}>🎫 {booking.booking_reference}</Text>
                ) : null}
                <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>👤 Instructor: {booking.instructor_name}</Text>
                <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>🕒 {formatDate(booking.scheduled_time)}</Text>
                <Text style={[styles.bookingDuration, { color: colors.textSecondary }]}>⏱️ {booking.duration_minutes} minutes</Text>
                <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>
                  🚗 {booking.vehicle_make || 'N/A'} {booking.vehicle_model || ''} ({booking.vehicle_registration || 'N/A'})
                </Text>
                <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>
                  📍 {booking.instructor_suburb ? `${booking.instructor_suburb}, ` : ''}{booking.instructor_city || 'N/A'}
                </Text>
                <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>
                  📌 Pickup: {booking.pickup_location || 'Not specified'}
                </Text>
                <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>📞 {booking.instructor_phone || 'N/A'}</Text>
                <View style={[styles.bookingFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.bookingPrice, { color: colors.success }]}>R{booking.total_price.toFixed(2)}</Text>
                  <Button
                    label="🗑️ Delete"
                    onPress={() => handleDeleteBooking(booking)}
                    variant="danger"
                    size="sm"
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* Recent Lessons */}
      {pastBookings.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recent Lessons</Text>
            <Pressable
              style={[
                styles.unhideButton,
                { backgroundColor: hiddenBookingIds.size > 0 ? colors.primary : colors.border },
              ]}
              onPress={() => hiddenBookingIds.size > 0 && setShowUnhideModal(true)}
              disabled={hiddenBookingIds.size === 0}
            >
              <Text
                style={[
                  styles.unhideButtonText,
                  { color: hiddenBookingIds.size > 0 ? '#fff' : colors.textMuted },
                ]}
              >
                👁️ Unhide ({hiddenBookingIds.size})
              </Text>
            </Pressable>
          </View>
          {pastBookings.filter(b => !hiddenBookingIds.has(b.id)).length > 0 ? (
            <View style={styles.bookingsGrid}>
              {pastBookings
                .filter(b => !hiddenBookingIds.has(b.id))
                .map(booking => (
                  <Card key={booking.id} variant="elevated" padding="md" style={styles.bookingCardWrap}>
                    <View style={styles.bookingHeader}>
                      <Text style={[styles.instructorName, { color: colors.text }]}>{booking.instructor_name}</Text>
                      <Badge label="Completed" variant="success" size="sm" />
                    </View>
                    {booking.booking_reference ? (
                      <Text style={[styles.bookingReference, { color: colors.primary }]}>🎫 {booking.booking_reference}</Text>
                    ) : null}
                    <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>👤 Instructor: {booking.instructor_name}</Text>
                    <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>🕒 {formatDate(booking.scheduled_time)}</Text>
                    <Text style={[styles.bookingDuration, { color: colors.textSecondary }]}>⏱️ {booking.duration_minutes} minutes</Text>
                    {booking.vehicle_make ? (
                      <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>
                        🚗 {booking.vehicle_make} {booking.vehicle_model} ({booking.vehicle_registration})
                      </Text>
                    ) : null}
                    {booking.instructor_city ? (
                      <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>
                        📍 {booking.instructor_suburb ? `${booking.instructor_suburb}, ` : ''}{booking.instructor_city}
                      </Text>
                    ) : null}
                    {booking.pickup_location ? (
                      <Text style={[styles.bookingDetail, { color: colors.textSecondary }]}>📌 Pickup: {booking.pickup_location}</Text>
                    ) : null}
                    <View style={[styles.bookingFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.bookingPrice, { color: colors.success }]}>R{booking.total_price.toFixed(2)}</Text>
                      <Pressable
                        style={[styles.hideButton, { backgroundColor: colors.textMuted }]}
                        onPress={() => handleHideCompletedLesson(booking)}
                      >
                        <Text style={styles.hideButtonText}>👁️ Hide</Text>
                      </Pressable>
                    </View>
                    <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
                      <View style={styles.ratingRow}>
                        <View style={styles.starRating}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Pressable
                              key={star}
                              onPress={() => handleSelectRating(booking.id, star)}
                              style={styles.starButton}
                            >
                              <Text
                                style={[
                                  styles.starText,
                                  {
                                    opacity:
                                      selectedRatings[booking.id] &&
                                      selectedRatings[booking.id] >= star
                                        ? 1
                                        : 0.3,
                                  },
                                ]}
                              >
                                ⭐
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        {selectedRatings[booking.id] ? (
                          <Text style={styles.ratingEmoji}>
                            {getRatingEmoji(selectedRatings[booking.id])}
                          </Text>
                        ) : null}
                      </View>
                      {showThankYou[booking.id] ? (
                        <Text style={[styles.thankYouText, { color: colors.success }]}>✓ Thanks for rating!</Text>
                      ) : null}
                    </View>
                  </Card>
                ))}
            </View>
          ) : (
            <Card variant="outlined" padding="lg" style={{ alignItems: 'center' }}>
              <Text style={[styles.emptyStateText, { color: colors.text }]}>All recent lessons are hidden</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Use the "Unhide Lessons" button above to restore them
              </Text>
            </Card>
          )}
        </View>
      ) : null}

      <View style={{ height: 40 }} />

      {/* Unhide Modal */}
      <ThemedModal
        visible={showUnhideModal}
        onClose={() => {
          setShowUnhideModal(false);
          setSelectedUnhideIds(new Set());
        }}
        title="Unhide Completed Lessons"
        size="md"
        footer={
          <View style={styles.modalFooter}>
            <Button
              label="Cancel"
              onPress={() => {
                setShowUnhideModal(false);
                setSelectedUnhideIds(new Set());
              }}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              label={`Unhide Selected (${selectedUnhideIds.size})`}
              onPress={handleUnhideLessons}
              disabled={selectedUnhideIds.size === 0}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        {/* Select All Checkbox */}
        <Pressable style={[styles.checkboxContainer, { borderBottomColor: colors.border }]} onPress={handleSelectAllUnhide}>
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.primary },
              selectedUnhideIds.size === hiddenBookingIds.size && hiddenBookingIds.size > 0
                ? { backgroundColor: colors.primary }
                : {},
            ]}
          >
            {selectedUnhideIds.size === hiddenBookingIds.size &&
              hiddenBookingIds.size > 0 && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Select All</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Hidden Lessons List */}
        {pastBookings
          .filter(b => hiddenBookingIds.has(b.id))
          .map(booking => (
            <Pressable
              key={booking.id}
              style={[styles.checkboxContainer, { borderBottomColor: colors.border }]}
              onPress={() => handleToggleUnhideSelection(booking.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.primary },
                  selectedUnhideIds.has(booking.id) ? { backgroundColor: colors.primary } : {},
                ]}
              >
                {selectedUnhideIds.has(booking.id) && (
                  <Text style={styles.checkboxCheck}>✓</Text>
                )}
              </View>
              <View style={styles.checkboxLessonInfo}>
                <Text style={[styles.checkboxLessonTitle, { color: colors.text }]}>{booking.instructor_name}</Text>
                <Text style={[styles.checkboxLessonDetail, { color: colors.textSecondary }]}>
                  {formatDate(booking.scheduled_time)} • {booking.duration_minutes} min
                </Text>
                <Text style={[styles.checkboxLessonPrice, { color: colors.success }]}>
                  R{booking.total_price.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          ))}
      </ThemedModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 14 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  section: {
    padding: Platform.OS === 'web' ? 20 : 12,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 17,
    fontWeight: '700',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  bookingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  bookingCardWrap: {
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: Platform.OS === 'web' ? '30%' : '100%',
    minWidth: Platform.OS === 'web' ? 280 : '100%',
    maxWidth: '100%',
    flexGrow: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructorName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  bookingTime: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  bookingDuration: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  bookingDetail: {
    fontSize: 10,
    marginBottom: 2,
  },
  bookingReference: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  hideButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  hideButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  starRating: {
    flexDirection: 'row',
    gap: 3,
  },
  starButton: { padding: 8 },
  starText: { fontSize: 20 },
  ratingSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingEmoji: { fontSize: 28 },
  thankYouText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unhideButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unhideButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxLessonInfo: { flex: 1 },
  checkboxLessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  checkboxLessonDetail: {
    fontSize: 13,
    marginBottom: 2,
  },
  checkboxLessonPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
