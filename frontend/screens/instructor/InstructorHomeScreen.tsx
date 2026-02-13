/**
 * Instructor Dashboard - Main hub for instructors to manage their lessons and availability
 */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { Badge, Button, Card, Input, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

interface Booking {
  id: number;
  booking_reference?: string;
  student_id?: number;
  student_id_number?: string;
  instructor_id?: number;
  student_name: string;
  student_phone?: string;
  student_email?: string;
  student_city?: string;
  student_suburb?: string;
  student_notes?: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  total_price: number;
  pickup_location?: string;
  rebooking_count?: number;
  cancellation_fee?: number;
  original_lesson_date?: string;
}

interface InstructorProfile {
  instructor_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_type: string;
  hourly_rate: number;
  booking_fee?: number; // Per-instructor booking fee
  is_available: boolean;
  total_earnings: number;
}

export default function InstructorHomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [upcomingLessons, setUpcomingLessons] = useState<Booking[]>([]);
  const [todayLessons, setTodayLessons] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [uniqueStudents, setUniqueStudents] = useState<Booking[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Booking | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    hourly_rate: '',
    is_available: true,
  });
  const [activeTab, setActiveTab] = useState<
    'pending' | 'completed' | 'cancelled' | 'all' | 'profile'
  >('pending');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const SCREEN_NAME = 'InstructorHomeScreen';

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload data when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Load instructor profile, bookings, and earnings
      const [profileRes, bookingsRes, earningsRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/bookings/my-bookings'),
        ApiService.get('/instructors/earnings-report'),
      ]);

      console.log('🔍 API Response - First Booking:', JSON.stringify(bookingsRes.data[0], null, 2));
      console.log(
        '🔍 FRONTEND - student_id_number in response:',
        bookingsRes.data[0]?.student_id_number
      );
      console.log(
        '🔍 FRONTEND - All keys in first booking:',
        Object.keys(bookingsRes.data[0] || {})
      );

      // Merge earnings data into profile
      const profileWithEarnings = {
        ...profileRes.data,
        total_earnings: earningsRes.data.total_earnings || 0,
      };
      setProfile(profileWithEarnings);

      // Filter bookings for today and upcoming, sorted in ascending order
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Sort all bookings by scheduled_time in ascending order (exclude cancelled and rescheduled bookings)
      const excludedStatuses = ['cancelled', 'rescheduled'];
      const sortedBookings = (bookingsRes.data || [])
        .filter((b: Booking) => !excludedStatuses.includes(b.status.toLowerCase()))
        .sort(
          (a: Booking, b: Booking) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
        );
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayBookings = sortedBookings.filter((b: Booking) => {
        const lessonDate = new Date(b.scheduled_time);
        return lessonDate >= today && lessonDate < tomorrow;
      });

      const upcomingBookings = sortedBookings.filter((b: Booking) => {
        const lessonDate = new Date(b.scheduled_time);
        return lessonDate >= tomorrow;
      });

      setTodayLessons(todayBookings);
      setUpcomingLessons(upcomingBookings);

      // Store ALL bookings (including cancelled and completed) sorted by date
      const allBookingsSorted = (bookingsRes.data || []).sort(
        (a: Booking, b: Booking) =>
          new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );
      setAllBookings(allBookingsSorted);

      // Extract unique students by student_id (to handle students with same name)
      const allBookings = [...todayBookings, ...upcomingBookings];
      const studentMap = new Map<string, Booking>();
      allBookings.forEach(booking => {
        // Use student_id if available, otherwise use student_name as fallback
        const key = booking.student_id
          ? `id_${booking.student_id}`
          : `name_${booking.student_name}`;
        if (!studentMap.has(key)) {
          studentMap.set(key, booking);
        }
      });
      const students = Array.from(studentMap.values()).sort((a, b) =>
        a.student_name.localeCompare(b.student_name)
      );
      console.log('🔍 FRONTEND - Unique students:', students);
      console.log(
        '🔍 FRONTEND - First student has student_id_number?:',
        students[0]?.student_id_number
      );
      setUniqueStudents(students);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showMessage(setErrorMessage, error.response?.data?.detail || 'Failed to load dashboard data', SCREEN_NAME, 'loadDashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleAvailability = async (value: boolean) => {
    try {
      await ApiService.put('/instructors/availability', { is_available: value });
      setProfile(prev => (prev ? { ...prev, is_available: value } : null));
      const message = value ? 'You are now available for bookings' : 'You are now unavailable';
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showMessage(setSuccessMessage, message, SCREEN_NAME, 'toggleAvailability', 'success');
    } catch (error) {
      console.error('Error toggling availability:', error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showMessage(setErrorMessage, 'Failed to update availability', SCREEN_NAME, 'error', 'error');
    }
  };

  const handleManageAvailability = () => {
    setEditFormData({
      hourly_rate: profile?.hourly_rate?.toString() || '',
      is_available: profile?.is_available || false,
    });
    setShowAvailabilityModal(true);
  };

  const handleEditProfile = () => {
    navigation.navigate('EditInstructorProfile' as never);
  };

  const handleSaveProfile = async () => {
    try {
      const hourlyRate = parseFloat(editFormData.hourly_rate);
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        if (Platform.OS === 'web') {
          alert('Please enter a valid hourly rate');
        } else {
          Alert.alert('Validation Error', 'Please enter a valid hourly rate');
        }
        return;
      }

      await ApiService.put('/instructors/me', {
        hourly_rate: hourlyRate,
        is_available: editFormData.is_available,
      });

      setProfile(prev =>
        prev ? { ...prev, hourly_rate: hourlyRate, is_available: editFormData.is_available } : null
      );
      setShowEditProfileModal(false);

      if (Platform.OS === 'web') {
        alert('✅ Profile updated successfully!');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showMessage(setErrorMessage, error.response?.data?.detail || 'Failed to update profile', SCREEN_NAME, 'updateProfile', 'error');
    }
  };

  const handleViewEarnings = () => {
    navigation.navigate('EarningsReport' as never);
  };

  const handleViewLessonDetails = (lesson: Booking) => {
    const details = `Student: ${lesson.student_name}\nTime: ${formatDate(
      lesson.scheduled_time
    )} at ${formatTime(lesson.scheduled_time)}\nDuration: ${
      lesson.duration_minutes
    } minutes\nPrice: R${lesson.total_price.toFixed(2)}\nStatus: ${lesson.status}${
      lesson.pickup_location ? `\nPickup: ${lesson.pickup_location}` : ''
    }`;
    if (Platform.OS === 'web') {
      alert(`📖 Lesson Details\n\n${details}`);
    } else {
      Alert.alert('📖 Lesson Details', details);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteLesson = async (lesson: Booking) => {
    // If booking is already cancelled, just remove it from the list
    if (lesson.status.toLowerCase() === 'cancelled') {
      const confirmMsg = `Remove this cancelled lesson from your list?\n\nStudent: ${
        lesson.student_name
      }\nDate: ${formatDate(lesson.scheduled_time)} at ${formatTime(lesson.scheduled_time)}`;

      const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : false;

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Remove Lesson',
          confirmMsg,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                setUpcomingLessons(prev => prev.filter(b => b.id !== lesson.id));
                setTodayLessons(prev => prev.filter(b => b.id !== lesson.id));
                if (Platform.OS === 'web') {
                  alert('✅ Lesson removed from list');
                } else {
                  Alert.alert('Success', 'Lesson removed from list');
                }
              },
            },
          ],
          { cancelable: true }
        );
      } else if (confirmed) {
        setUpcomingLessons(prev => prev.filter(b => b.id !== lesson.id));
        setTodayLessons(prev => prev.filter(b => b.id !== lesson.id));
        alert('✅ Lesson removed from list');
      }
      return;
    }

    const lessonTime = new Date(lesson.scheduled_time);
    const now = new Date();
    const hoursUntilLesson = (lessonTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check if lesson is in the past
    if (hoursUntilLesson < 0) {
      if (Platform.OS === 'web') {
        alert('❌ Cannot delete a lesson that has already passed');
      } else {
        Alert.alert('Error', 'Cannot delete a lesson that has already passed');
      }
      return;
    }

    // Calculate cancellation credit (instructor = 100%, no penalty)
    const isPaid = lesson.payment_status?.toLowerCase() === 'paid';
    let feeMessage = '';

    if (isPaid) {
      const creditAmount = lesson.total_price;
      feeMessage = `\n\n💰 Full credit of R${creditAmount.toFixed(2)} (100%) will be issued to the student. No penalty applies when the instructor cancels.\n\nThe credit will be applied when the student books and pays for their next lesson.`;
    }

    const confirmMsg = `Delete this lesson?\n\nStudent: ${lesson.student_name}\nDate: ${formatDate(
      lesson.scheduled_time
    )} at ${formatTime(
      lesson.scheduled_time
    )}${feeMessage}\n\nThis will cancel the booking${isPaid ? ' — the student will receive full credit for a future booking' : ''}.`;

    const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : false;

    if (Platform.OS !== 'web') {
      Alert.alert('Delete Lesson', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            await performDeletion(lesson.id);
          },
        },
      ]);
    } else if (confirmed) {
      await performDeletion(lesson.id);
    }
  };

  const performDeletion = async (bookingId: number) => {
    try {
      // Cancel the booking via API
      await ApiService.post(`/bookings/${bookingId}/cancel`, {
        cancellation_reason: 'Instructor cancelled booking',
      });

      // Remove from local state immediately (optimistic update)
      setUpcomingLessons(prev => prev.filter(b => b.id !== bookingId));
      setTodayLessons(prev => prev.filter(b => b.id !== bookingId));

      if (Platform.OS === 'web') {
        alert('✅ Booking cancelled. The student has been notified and received full credit for a future booking.');
      } else {
        Alert.alert('Success', 'Booking cancelled. The student has been notified and received full credit for a future booking.');
      }

      // Reload dashboard data to reflect changes
      loadDashboardData();
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete lesson';
      if (Platform.OS === 'web') {
        alert(`❌ Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const filterBookings = (bookings: Booking[]) => {
    // If a student is selected, filter by their ID number
    if (selectedStudent && selectedStudent.student_id_number) {
      return bookings.filter(
        booking => booking.student_id_number === selectedStudent.student_id_number
      );
    }
    // Otherwise, filter by search query
    if (!searchQuery.trim()) return bookings;
    return bookings.filter(booking =>
      booking.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleOpenReschedule = async (booking: Booking) => {
    const isPaid = booking.payment_status?.toLowerCase() === 'paid';
    let policyMessage = '';
    if (isPaid) {
      policyMessage = `\n\n📋 Reschedule Policy: No penalty applies when the instructor reschedules. Full credit (R${booking.total_price.toFixed(2)}) will be applied to the new booking. The student will not need to pay again.`;
    }

    const confirmMsg = `Reschedule this lesson?\n\nStudent: ${booking.student_name}\nDate: ${formatDate(booking.scheduled_time)} at ${formatTime(booking.scheduled_time)}${policyMessage}\n\nYou will be taken to the booking screen to select a new date and time.`;

    const proceedWithReschedule = async () => {
      try {
        const instructorId = booking.instructor_id || profile?.instructor_id;
        if (!instructorId) {
          if (Platform.OS === 'web') {
            alert('❌ Could not determine instructor details');
          } else {
            Alert.alert('Error', 'Could not determine instructor details');
          }
          return;
        }

        const response = await ApiService.get(`/instructors/${instructorId}`);
        const instructor = response.data;

        (navigation as any).navigate('Booking', {
          instructor,
          rescheduleBookingId: booking.id,
          reschedulePickupAddress: booking.pickup_location || '',
          isInstructorReschedule: true,
        });
      } catch (error: any) {
        console.error('Error fetching instructor for reschedule:', error);
        if (Platform.OS === 'web') {
          alert('❌ Failed to load instructor details for reschedule');
        } else {
          Alert.alert('Error', 'Failed to load instructor details for reschedule');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await proceedWithReschedule();
      }
    } else {
      Alert.alert('Reschedule Lesson', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Reschedule', onPress: () => proceedWithReschedule() },
      ]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Instructor Dashboard"
        onBack={() => navigation.goBack()}
        showBackButton={false}
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Inline Messages */}
        {successMessage && <InlineMessage message={successMessage} type="success" />}
        {errorMessage && <InlineMessage message={errorMessage} type="error" />}

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Instructor Dashboard</Text>
            <Text style={[styles.name, { color: colors.text }]}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          </View>
          <View style={[styles.headerRate, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.headerRateLabel, { color: colors.primary }]}>Hourly Rate</Text>
            <Text style={[styles.headerRateAmount, { color: colors.primary }]}>R{profile?.hourly_rate || 0}/hour</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
          {(['pending', 'completed', 'cancelled', 'all', 'profile'] as const).map(tab => {
            const icons = { pending: '⏳', completed: '✅', cancelled: '❌', all: '📋', profile: '👤' };
            const labels = { pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled', all: 'All', profile: 'Profile' };
            return (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: '#fff' }]}>
                  {icons[tab]} {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab !== 'profile' ? (
          <>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="🔍 Search by student name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={text => {
                  setSearchQuery(text);
                  setSelectedStudent(null);
                  setShowAllBookings(false);
                  if (text.length > 0) {
                    setShowSearchDropdown(true);
                  }
                }}
                onFocus={() => setShowSearchDropdown(true)}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                    setSelectedStudent(null);
                    setShowAllBookings(false);
                  }}
                  style={styles.clearButton}
                >
                  <Text style={[styles.clearButtonText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              )}

              {/* Student Dropdown */}
              {showSearchDropdown && uniqueStudents.length > 0 && (
                <View style={[styles.searchDropdown, { backgroundColor: colors.card }]}>
                  <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.dropdownTitle, { color: colors.text }]}>Students ({uniqueStudents.length})</Text>
                    <Pressable onPress={() => setShowSearchDropdown(false)} style={{ padding: 8 }}>
                      <Text style={[styles.dropdownClose, { color: colors.textMuted }]}>✕</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                    {uniqueStudents
                      .filter(
                        student =>
                          !searchQuery ||
                          student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((student, index) => {
                        const bookingCount = [...todayLessons, ...upcomingLessons].filter(
                          b => b.student_id === student.student_id
                        ).length;
                        return (
                          <Pressable
                            key={student.student_id || index}
                            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                              setSelectedStudent(student);
                              const displayText = student.student_id_number
                                ? `${student.student_name} (ID: ${student.student_id_number})`
                                : student.student_name;
                              setSearchQuery(displayText);
                              setShowSearchDropdown(false);
                            }}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <Text style={[styles.dropdownItemText, { color: colors.text }]}>👤 {student.student_name}</Text>
                              <View style={styles.dropdownItemDetails}>
                                {student.student_id_number && (
                                  <Text style={[styles.dropdownItemSubtext, { color: colors.textSecondary }]}>
                                    🆔 ID: {student.student_id_number}
                                  </Text>
                                )}
                                {student.student_phone && (
                                  <Text style={[styles.dropdownItemSubtext, { color: colors.textSecondary }]}>
                                    📞 {student.student_phone}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.dropdownItemCount, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]}>
                              {bookingCount} booking{bookingCount !== 1 ? 's' : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    {uniqueStudents.filter(
                      student =>
                        !searchQuery ||
                        student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && <Text style={[styles.noResultsText, { color: colors.textMuted }]}>No students found</Text>}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Bookings by Status */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {activeTab === 'pending' && 'Pending Bookings'}
                {activeTab === 'completed' && 'Completed Bookings'}
                {activeTab === 'cancelled' && 'Cancelled Bookings'}
                {activeTab === 'all' && 'All Bookings'} (
                {
                  filterBookings(
                    activeTab === 'pending'
                      ? allBookings.filter(b => b.status.toLowerCase() === 'pending')
                      : activeTab === 'completed'
                        ? allBookings.filter(b => b.status.toLowerCase() === 'completed')
                        : activeTab === 'cancelled'
                          ? allBookings.filter(b => b.status.toLowerCase() === 'cancelled')
                          : allBookings
                  ).length
                }
                )
              </Text>
              {filterBookings(
                activeTab === 'pending'
                  ? allBookings.filter(b => b.status.toLowerCase() === 'pending')
                  : activeTab === 'completed'
                    ? allBookings.filter(b => b.status.toLowerCase() === 'completed')
                    : activeTab === 'cancelled'
                      ? allBookings.filter(b => b.status.toLowerCase() === 'cancelled')
                      : allBookings
              ).length === 0 ? (
                <Card variant="default" style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={[styles.emptyStateText, { color: colors.text }]}>
                    {activeTab === 'pending' && 'No pending bookings'}
                    {activeTab === 'completed' && 'No completed bookings'}
                    {activeTab === 'cancelled' && 'No cancelled bookings'}
                    {activeTab === 'all' && 'No bookings'}
                  </Text>
                </Card>
              ) : (
                <View style={styles.lessonsGrid}>
                  {filterBookings(
                    activeTab === 'pending'
                      ? allBookings.filter(b => b.status.toLowerCase() === 'pending')
                      : activeTab === 'completed'
                        ? allBookings.filter(b => b.status.toLowerCase() === 'completed')
                        : activeTab === 'cancelled'
                          ? allBookings.filter(b => b.status.toLowerCase() === 'cancelled')
                          : allBookings
                  ).map(lesson => (
                    <Card key={lesson.id} variant="default" style={styles.lessonCard}>
                      <View style={styles.lessonHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.studentName, { color: colors.text }]}>👤 {lesson.student_name}</Text>
                          {lesson.booking_reference && (
                            <Text style={[styles.bookingReference, { color: colors.primary }]}>
                              🎫 {lesson.booking_reference}
                            </Text>
                          )}
                          {lesson.student_id_number && (
                            <Text style={[styles.studentId, { color: colors.primary }]}>
                              🆔 ID Number: {lesson.student_id_number}
                            </Text>
                          )}
                          <Text style={[styles.lessonDate, { color: colors.textSecondary }]}>
                            📅 {formatDate(lesson.scheduled_time)}
                          </Text>
                          <Text style={[styles.lessonTime, { color: colors.textSecondary }]}>
                            🕒 {formatTime(lesson.scheduled_time)}
                          </Text>
                          <Text style={[styles.lessonDuration, { color: colors.textSecondary }]}>
                            ⏱️ {lesson.duration_minutes} minutes
                          </Text>
                          {lesson.rebooking_count > 0 && (
                            <Text style={[styles.rebookingBadge, { color: colors.warning }]}>
                              🔄 Rescheduled {lesson.rebooking_count}x
                            </Text>
                          )}
                          {lesson.cancellation_fee > 0 && (
                            <Text style={[styles.cancellationFee, { color: colors.danger }]}>
                              ⚠️ Fee: R{lesson.cancellation_fee.toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <Badge variant={
                          lesson.status.toLowerCase() === 'confirmed' ? 'success' :
                          lesson.status.toLowerCase() === 'pending' ? 'warning' :
                          lesson.status.toLowerCase() === 'cancelled' ? 'danger' :
                          lesson.status.toLowerCase() === 'completed' ? 'info' : 'default'
                        } size="sm">
                          {lesson.status}
                        </Badge>
                      </View>

                      {/* Student Contact Info */}
                      {lesson.student_phone && (
                        <Text style={[styles.lessonDetail, { color: colors.textSecondary }]}>📞 {lesson.student_phone}</Text>
                      )}
                      {lesson.student_email && (
                        <Text style={[styles.lessonDetail, { color: colors.textSecondary }]}>✉️ {lesson.student_email}</Text>
                      )}

                      {/* Student Location */}
                      {(lesson.student_city || lesson.student_suburb) && (
                        <Text style={[styles.lessonDetail, { color: colors.textSecondary }]}>
                          🗺️ {lesson.student_suburb ? `${lesson.student_suburb}, ` : ''}
                          {lesson.student_city || ''}
                        </Text>
                      )}

                      {/* Pickup Location */}
                      {lesson.pickup_location && (
                        <Text style={[styles.lessonDetail, { color: colors.textSecondary }]}>📌 Pickup: {lesson.pickup_location}</Text>
                      )}

                      {/* Student Comments */}
                      <View style={[styles.notesContainer, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
                        <Text style={[styles.notesLabel, { color: colors.text }]}>💬 Student Comments:</Text>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                          {lesson.student_notes || 'No special requests'}
                        </Text>
                      </View>

                      <View style={[styles.lessonFooter, { borderTopColor: colors.border }]}>
                        <Text style={[styles.lessonPrice, { color: colors.success }]}>R{lesson.total_price.toFixed(2)}</Text>
                        <View style={styles.lessonActions}>
                          {lesson.status.toLowerCase() === 'pending' && (
                            <Button variant="accent" size="sm" label="🔄 Reschedule" onPress={() => handleOpenReschedule(lesson)} />
                          )}
                          <Button variant="danger" size="sm" onPress={() => handleDeleteLesson(lesson)}>
                            🗑️ Delete
                          </Button>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* My Profile Tab Content */}
            {/* Availability Toggle */}
            <Card variant="default" style={styles.availabilityCard}>
              <Text style={[styles.availabilityLabel, { color: colors.textSecondary }]}>Availability Status</Text>
              <Switch
                value={profile?.is_available || false}
                onValueChange={toggleAvailability}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </Card>

            {/* Booking Fee Display */}
            {profile?.booking_fee !== undefined && (
              <Card variant="outlined" style={[styles.bookingFeeCard, { borderColor: colors.accent }]}>
                <Text style={[styles.bookingFeeLabel, { color: colors.accent }]}>💰 Your Booking Fee</Text>
                <Text style={[styles.bookingFeeValue, { color: colors.accent }]}>R{profile.booking_fee.toFixed(2)}</Text>
                <Text style={[styles.bookingFeeNote, { color: colors.textSecondary }]}>
                  This fee is added to your hourly rate when students book lessons.
                </Text>
                <Text style={[styles.bookingFeeExample, { color: colors.text, borderTopColor: colors.accent }]}>
                  Students pay: R{profile.hourly_rate.toFixed(2)} + R
                  {profile.booking_fee.toFixed(2)} = R
                  {(profile.hourly_rate + profile.booking_fee).toFixed(2)}/hr
                </Text>
              </Card>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <Button
                variant="primary"
                fullWidth
                onPress={() => (navigation as any).navigate('ManageAvailability')}
                icon="📅"
                style={{ marginBottom: 12 }}
              >
                Schedule
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onPress={handleEditProfile}
                icon="👤"
                style={{ marginBottom: 12 }}
              >
                Edit Profile
              </Button>
              <Pressable
                style={[styles.earningsButton, { backgroundColor: colors.success }]}
                onPress={handleViewEarnings}
              >
                <View style={styles.earningsButtonContent}>
                  <Text style={styles.earningsButtonText}>💰 View Earnings Report</Text>
                  <Text style={styles.earningsAmount}>
                    R{profile?.total_earnings?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />

        {/* Edit Profile Modal */}
        <ThemedModal
          visible={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          title="👤 Edit Profile"
          size="md"
          footer={
            <View style={styles.modalButtons}>
              <Button variant="outline" onPress={() => setShowEditProfileModal(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSaveProfile} style={{ flex: 1 }}>
                Save Changes
              </Button>
            </View>
          }
        >
          <View style={[styles.profileInfoCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>Name:</Text>
            <Text style={[styles.profileInfoValue, { color: colors.text }]}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          </View>
          <View style={[styles.profileInfoCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>Email:</Text>
            <Text style={[styles.profileInfoValue, { color: colors.text }]}>{profile?.email}</Text>
          </View>
          <View style={[styles.profileInfoCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>Phone:</Text>
            <Text style={[styles.profileInfoValue, { color: colors.text }]}>{profile?.phone}</Text>
          </View>
          <View style={[styles.profileInfoCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>License:</Text>
            <Text style={[styles.profileInfoValue, { color: colors.text }]}>{profile?.license_type}</Text>
          </View>
          <Input
            label="Hourly Rate (ZAR)"
            value={editFormData.hourly_rate}
            onChangeText={value => setEditFormData(prev => ({ ...prev, hourly_rate: value }))}
            keyboardType="decimal-pad"
            placeholder="e.g., 350"
          />
          <View style={styles.switchRow}>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Available for Bookings</Text>
            <Switch
              value={editFormData.is_available}
              onValueChange={value => setEditFormData(prev => ({ ...prev, is_available: value }))}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
        </ThemedModal>

        {/* Manage Availability Modal */}
        <ThemedModal
          visible={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          title="📅 Manage Availability"
          size="sm"
          footer={
            <View style={styles.modalButtons}>
              <Button variant="outline" onPress={() => setShowAvailabilityModal(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={async () => {
                  await toggleAvailability(editFormData.is_available);
                  setShowAvailabilityModal(false);
                }}
                style={{ flex: 1 }}
              >
                Update Status
              </Button>
            </View>
          }
        >
          <View style={[styles.availabilityStatusCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.availabilityCurrentLabel, { color: colors.textSecondary }]}>Current Status</Text>
            <Text
              style={[
                styles.availabilityCurrentStatus,
                { color: profile?.is_available ? colors.success : colors.danger },
              ]}
            >
              {profile?.is_available ? '🟢 Available' : '🔴 Unavailable'}
            </Text>
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Available for New Bookings</Text>
              <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                Toggle this to control whether students can book lessons with you
              </Text>
            </View>
            <Switch
              value={editFormData.is_available}
              onValueChange={value => setEditFormData(prev => ({ ...prev, is_available: value }))}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
          <View style={[styles.modalInfoBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.modalInfoText, { color: colors.primary }]}>
              💡 Tip: You can quickly toggle your availability using the switch on the main dashboard
            </Text>
          </View>
        </ThemedModal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 12,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_400Regular',
  },
  name: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Platform.OS === 'web' ? 20 : 8,
    marginTop: Platform.OS === 'web' ? 16 : 8,
    marginBottom: Platform.OS === 'web' ? 16 : 8,
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 4 : 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_600SemiBold',
  },
  availabilityLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  section: {
    padding: Platform.OS === 'web' ? 20 : 12,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    marginTop: Platform.OS === 'web' ? 20 : 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  lessonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  lessonCard: {
    padding: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: Platform.OS === 'web' ? 6 : 4,
    flexBasis: Platform.OS === 'web' ? '30%' : '100%',
    minWidth: Platform.OS === 'web' ? 200 : '100%',
    maxWidth: '100%',
    flexGrow: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  studentName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  lessonTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  lessonDate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  lessonDuration: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  lessonPrice: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  lessonActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  earningsButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  earningsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  earningsAmount: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  lessonDetail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  notesContainer: {
    marginTop: 5,
    padding: 6,
    borderRadius: 5,
    borderLeftWidth: 2,
  },
  notesLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 14,
  },
  // Modal-related styles (used inside ThemedModal)
  profileInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileInfoLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  profileInfoValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  modalHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  availabilityStatusCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  availabilityCurrentLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  availabilityCurrentStatus: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  modalInfoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
    maxHeight: 300,
    zIndex: 1001,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  dropdownClose: {
    fontSize: 18,
    padding: 4,
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  dropdownItemDetails: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dropdownItemCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    padding: 20,
  },
  bookingReference: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  rebookingBadge: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  cancellationFee: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
});
