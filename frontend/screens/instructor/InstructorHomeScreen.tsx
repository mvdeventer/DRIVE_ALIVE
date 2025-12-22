/**
 * Instructor Dashboard - Main hub for instructors to manage their lessons and availability
 */
import { CommonActions, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

interface Booking {
  id: number;
  student_id?: number;
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
}

interface InstructorProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_type: string;
  hourly_rate: number;
  is_available: boolean;
  total_earnings: number;
}

export default function InstructorHomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [upcomingLessons, setUpcomingLessons] = useState<Booking[]>([]);
  const [todayLessons, setTodayLessons] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [uniqueStudents, setUniqueStudents] = useState<Booking[]>([]);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState({
    hourly_rate: '',
    is_available: true,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load instructor profile and bookings
      const [profileRes, bookingsRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/bookings/my-bookings'),
      ]);

      console.log('Raw bookings response:', bookingsRes.data);
      console.log('First booking detail:', JSON.stringify(bookingsRes.data[0], null, 2));
      setProfile(profileRes.data);

      // Filter bookings for today and upcoming, sorted in ascending order
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Sort all bookings by scheduled_time in ascending order
      const sortedBookings = (bookingsRes.data || []).sort(
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

      console.log('Sample booking data:', todayBookings[0] || upcomingBookings[0]);
      console.log(
        'Sample booking JSON:',
        JSON.stringify(todayBookings[0] || upcomingBookings[0], null, 2)
      );
      setTodayLessons(todayBookings);
      setUpcomingLessons(upcomingBookings);

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
      setUniqueStudents(students);
      console.log('Unique students:', students.length, students);
      console.log('First student detail:', JSON.stringify(students[0], null, 2));
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      if (Platform.OS === 'web') {
        alert('Failed to load dashboard data');
      } else {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
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
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Availability Updated', message);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update availability');
      } else {
        Alert.alert('Error', 'Failed to update availability');
      }
    }
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
    } catch (error) {
      console.error('Error updating profile:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update profile');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    }
  };

  const handleViewEarnings = () => {
    const details = `Total Earnings: R${
      profile?.total_earnings?.toFixed(2) || '0.00'
    }\nHourly Rate: R${profile?.hourly_rate || 0}\nToday's Lessons: ${
      todayLessons.length
    }\nUpcoming Lessons: ${upcomingLessons.length}\n\n(Detailed earnings report coming soon!)`;
    if (Platform.OS === 'web') {
      alert(`💰 Earnings Report\n\n${details}`);
    } else {
      Alert.alert('💰 Earnings Report', details);
    }
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

  const filterBookings = (bookings: Booking[]) => {
    if (!searchQuery.trim()) return bookings;
    return bookings.filter(booking =>
      booking.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const openRescheduleModal = async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRescheduleModal(true);
    // Load available time slots for the current date
    const currentDate = new Date(booking.scheduled_time);
    const dateStr = currentDate.toISOString().split('T')[0];
    setRescheduleDate(dateStr);
    await loadAvailableSlots(dateStr);
  };

  const loadAvailableSlots = async (date: string) => {
    if (!selectedBooking || !profile) return;
    try {
      const response = await ApiService.get(`/availability/instructor/${profile.id}/slots`, {
        params: {
          date,
          duration: selectedBooking.duration_minutes,
        },
      });
      // Extract available slots from the response
      const slots = response.data.available_slots || [];
      setAvailableSlots(slots.map((slot: any) => slot.start_time));
    } catch (error) {
      console.error('Error loading time slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      if (Platform.OS === 'web') {
        alert('Please select a date and time');
      } else {
        Alert.alert('Error', 'Please select a date and time');
      }
      return;
    }

    try {
      const newDateTime = `${rescheduleDate}T${rescheduleTime}`;
      await ApiService.patch(`/bookings/${selectedBooking.id}/reschedule`, {
        new_datetime: newDateTime,
      });

      if (Platform.OS === 'web') {
        alert('✅ Booking rescheduled successfully!');
      } else {
        Alert.alert('Success', 'Booking rescheduled successfully!');
      }

      setShowRescheduleModal(false);
      setSelectedBooking(null);
      setRescheduleDate('');
      setRescheduleTime('');
      loadDashboardData();
    } catch (error: any) {
      console.error('Error rescheduling booking:', error);
      const message = error.response?.data?.detail || 'Failed to reschedule booking';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
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
          <Text style={styles.greeting}>Instructor Dashboard</Text>
          <Text style={styles.name}>
            {profile?.first_name} {profile?.last_name}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityInfo}>
          <Text style={styles.availabilityLabel}>Availability Status</Text>
          <Text
            style={[
              styles.availabilityStatus,
              { color: profile?.is_available ? '#28a745' : '#dc3545' },
            ]}
          >
            {profile?.is_available ? '🟢 Available' : '🔴 Unavailable'}
          </Text>
        </View>
        <Switch
          value={profile?.is_available || false}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#ccc', true: '#28a745' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        />
      </View>

      {/* Manage Schedule Button */}
      <TouchableOpacity
        style={styles.manageScheduleButton}
        onPress={() => (navigation as any).navigate('ManageAvailability')}
      >
        <Text style={styles.manageScheduleButtonText}>📅 Manage My Schedule & Hours</Text>
        <Text style={styles.manageScheduleButtonSubtext}>
          Set your weekly availability and time off
        </Text>
      </TouchableOpacity>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by student name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setShowSearchDropdown(true)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setShowSearchDropdown(false);
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {/* Student Dropdown */}
        {showSearchDropdown && uniqueStudents.length > 0 && (
          <View style={styles.searchDropdown}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Students ({uniqueStudents.length})</Text>
              <TouchableOpacity onPress={() => setShowSearchDropdown(false)}>
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
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
                    <TouchableOpacity
                      key={student.student_id || index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSearchQuery(student.student_name);
                        setShowSearchDropdown(false);
                      }}
                    >
                      <View style={styles.dropdownItemLeft}>
                        <Text style={styles.dropdownItemText}>👤 {student.student_name}</Text>
                        <View style={styles.dropdownItemDetails}>
                          {student.student_id && (
                            <Text style={styles.dropdownItemSubtext}>ID: {student.student_id}</Text>
                          )}
                          {student.student_phone && (
                            <Text style={styles.dropdownItemSubtext}>
                              📞 {student.student_phone}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.dropdownItemCount}>
                        {bookingCount} booking{bookingCount !== 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              {uniqueStudents.filter(
                student =>
                  !searchQuery ||
                  student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && <Text style={styles.noResultsText}>No students found</Text>}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Earnings & Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>R{profile?.total_earnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{todayLessons.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingLessons.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Rate Info */}
      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>Hourly Rate</Text>
        <Text style={styles.rateAmount}>R{profile?.hourly_rate || 0}/hour</Text>
        <Text style={styles.licenseType}>License: {profile?.license_type}</Text>
      </View>

      {/* Today's Lessons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Today's Lessons {searchQuery && `(${filterBookings(todayLessons).length} results)`}
        </Text>
        {filterBookings(todayLessons).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No lessons found' : 'No lessons scheduled for today'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search' : 'Enjoy your free time! 🎉'}
            </Text>
          </View>
        ) : (
          filterBookings(todayLessons).map(lesson => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>👤 {lesson.student_name}</Text>
                  {lesson.student_id && (
                    <Text style={styles.studentId}>🆔 Student ID: {lesson.student_id}</Text>
                  )}
                  <Text style={styles.lessonTime}>🕒 {formatTime(lesson.scheduled_time)}</Text>
                  <Text style={styles.lessonDuration}>⏱️ {lesson.duration_minutes} minutes</Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}
                >
                  <Text style={styles.statusText}>{lesson.status}</Text>
                </View>
              </View>

              {/* Student Contact Info */}
              {lesson.student_phone && (
                <Text style={styles.lessonDetail}>📞 {lesson.student_phone}</Text>
              )}
              {lesson.student_email && (
                <Text style={styles.lessonDetail}>✉️ {lesson.student_email}</Text>
              )}

              {/* Student Location */}
              {(lesson.student_city || lesson.student_suburb) && (
                <Text style={styles.lessonDetail}>
                  🗺️ {lesson.student_suburb ? `${lesson.student_suburb}, ` : ''}
                  {lesson.student_city || ''}
                </Text>
              )}

              {/* Pickup Location */}
              {lesson.pickup_location && (
                <Text style={styles.lessonDetail}>📌 Pickup: {lesson.pickup_location}</Text>
              )}

              {/* Student Comments */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>💬 Student Comments:</Text>
                <Text style={styles.notesText}>
                  {lesson.student_notes || 'No special requests'}
                </Text>
              </View>

              <View style={styles.lessonFooter}>
                <Text style={styles.lessonPrice}>R{lesson.total_price.toFixed(2)}</Text>
                {lesson.status.toLowerCase() === 'pending' && (
                  <TouchableOpacity
                    style={styles.rescheduleButton}
                    onPress={() => openRescheduleModal(lesson)}
                  >
                    <Text style={styles.rescheduleButtonText}>🔄 Reschedule</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Lessons */}
      {filterBookings(upcomingLessons).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upcoming Lessons {searchQuery && `(${filterBookings(upcomingLessons).length} results)`}
          </Text>
          {filterBookings(upcomingLessons)
            .slice(0, 5)
            .map(lesson => (
              <View key={lesson.id} style={styles.lessonCard}>
                <View style={styles.lessonHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>👤 {lesson.student_name}</Text>
                    {lesson.student_id && (
                      <Text style={styles.studentId}>🆔 Student ID: {lesson.student_id}</Text>
                    )}
                    <Text style={styles.lessonDate}>
                      📅 {formatDate(lesson.scheduled_time)} at {formatTime(lesson.scheduled_time)}
                    </Text>
                    <Text style={styles.lessonDuration}>⏱️ {lesson.duration_minutes} minutes</Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}
                  >
                    <Text style={styles.statusText}>{lesson.status}</Text>
                  </View>
                </View>

                {/* Student Contact Info */}
                {lesson.student_phone && (
                  <Text style={styles.lessonDetail}>📞 {lesson.student_phone}</Text>
                )}

                {/* Student Location */}
                {(lesson.student_city || lesson.student_suburb) && (
                  <Text style={styles.lessonDetail}>
                    🗺️ {lesson.student_suburb ? `${lesson.student_suburb}, ` : ''}
                    {lesson.student_city || ''}
                  </Text>
                )}

                {/* Pickup Location */}
                {lesson.pickup_location && (
                  <Text style={styles.lessonDetail}>📌 Pickup: {lesson.pickup_location}</Text>
                )}

                {/* Student Comments */}
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>💬 Student Comments:</Text>
                  <Text style={styles.notesText}>
                    {lesson.student_notes || 'No special requests'}
                  </Text>
                </View>

                <View style={styles.lessonFooter}>
                  <Text style={styles.lessonPrice}>R{lesson.total_price.toFixed(2)}</Text>
                  {lesson.status.toLowerCase() === 'pending' && (
                    <TouchableOpacity
                      style={styles.rescheduleButton}
                      onPress={() => openRescheduleModal(lesson)}
                    >
                      <Text style={styles.rescheduleButtonText}>🔄 Reschedule</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleManageAvailability}>
          <Text style={styles.actionButtonText}>📅 Manage Availability</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleEditProfile}
        >
          <Text style={styles.actionButtonText}>👤 Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleViewEarnings}
        >
          <Text style={styles.actionButtonText}>💰 View Earnings Report</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>Name:</Text>
              <Text style={styles.profileInfoValue}>
                {profile?.first_name} {profile?.last_name}
              </Text>
            </View>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>Email:</Text>
              <Text style={styles.profileInfoValue}>{profile?.email}</Text>
            </View>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>Phone:</Text>
              <Text style={styles.profileInfoValue}>{profile?.phone}</Text>
            </View>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>License:</Text>
              <Text style={styles.profileInfoValue}>{profile?.license_type}</Text>
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>
                Hourly Rate (ZAR) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.hourly_rate}
                onChangeText={value => setEditFormData(prev => ({ ...prev, hourly_rate: value }))}
                keyboardType="decimal-pad"
                placeholder="e.g., 350"
              />
            </View>

            <View style={styles.modalFormGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.modalLabel}>Available for Bookings</Text>
                <Switch
                  value={editFormData.is_available}
                  onValueChange={value =>
                    setEditFormData(prev => ({ ...prev, is_available: value }))
                  }
                  trackColor={{ false: '#ccc', true: '#28a745' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowEditProfileModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Manage Availability</Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.availabilityStatusCard}>
              <Text style={styles.availabilityCurrentLabel}>Current Status</Text>
              <Text
                style={[
                  styles.availabilityCurrentStatus,
                  { color: profile?.is_available ? '#28a745' : '#dc3545' },
                ]}
              >
                {profile?.is_available ? '🟢 Available' : '🔴 Unavailable'}
              </Text>
            </View>

            <View style={styles.modalFormGroup}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Available for New Bookings</Text>
                  <Text style={styles.modalHint}>
                    Toggle this to control whether students can book lessons with you
                  </Text>
                </View>
                <Switch
                  value={editFormData.is_available}
                  onValueChange={value =>
                    setEditFormData(prev => ({ ...prev, is_available: value }))
                  }
                  trackColor={{ false: '#ccc', true: '#28a745' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                />
              </View>
            </View>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoText}>
                💡 Tip: You can quickly toggle your availability using the switch on the main
                dashboard
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowAvailabilityModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={async () => {
                  await toggleAvailability(editFormData.is_available);
                  setShowAvailabilityModal(false);
                }}
              >
                <Text style={styles.modalSaveButtonText}>Update Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Lesson</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.bookingInfoCard}>
                <Text style={styles.bookingInfoText}>
                  👤 Student: {selectedBooking.student_name}
                </Text>
                <Text style={styles.bookingInfoText}>
                  📅 Current Time: {formatDate(selectedBooking.scheduled_time)} at{' '}
                  {formatTime(selectedBooking.scheduled_time)}
                </Text>
                <Text style={styles.bookingInfoText}>
                  ⏱️ Duration: {selectedBooking.duration_minutes} minutes
                </Text>
              </View>
            )}

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Select New Date</Text>
              <TextInput
                style={styles.modalInput}
                value={rescheduleDate}
                onChangeText={async value => {
                  setRescheduleDate(value);
                  if (value.length === 10) {
                    await loadAvailableSlots(value);
                  }
                }}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Available Time Slots</Text>
              <ScrollView style={styles.timeSlotsContainer}>
                {availableSlots.length === 0 ? (
                  <Text style={styles.noSlotsText}>
                    {rescheduleDate
                      ? 'No available slots for this date'
                      : 'Select a date to see available slots'}
                  </Text>
                ) : (
                  availableSlots.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        rescheduleTime === slot && styles.timeSlotButtonSelected,
                      ]}
                      onPress={() => setRescheduleTime(slot)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          rescheduleTime === slot && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRescheduleModal(false);
                  setSelectedBooking(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleReschedule}
              >
                <Text style={styles.modalSaveButtonText}>Confirm Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  availabilityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 20,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  availabilityStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  rateCard: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#007bff',
    borderRadius: 12,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  rateAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  licenseType: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 20,
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
  lessonCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 14,
    color: '#666',
  },
  lessonDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  lessonDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pickupLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lessonPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  viewButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  lessonDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
    fontWeight: 'bold',
    padding: 4,
  },
  profileInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  profileInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalFormGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#dc3545',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  modalCancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#007bff',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilityStatusCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  availabilityCurrentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  availabilityCurrentStatus: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalInfoBox: {
    backgroundColor: '#e7f3ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#0056b3',
    lineHeight: 18,
  },
  manageScheduleButton: {
    backgroundColor: '#007bff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manageScheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  manageScheduleButtonSubtext: {
    color: '#e3f2fd',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    zIndex: 1001,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dropdownClose: {
    fontSize: 18,
    color: '#999',
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
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  dropdownItemDetails: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#666',
  },
  dropdownItemCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  rescheduleButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rescheduleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  bookingInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  timeSlotsContainer: {
    maxHeight: 200,
  },
  timeSlotButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timeSlotTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});
