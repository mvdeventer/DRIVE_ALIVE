/**
 * Instructor Dashboard - Main hub for instructors to manage their lessons and availability
 */
import { CommonActions, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

interface Booking {
  id: number;
  student_name: string;
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load instructor profile and bookings
      const [profileRes, bookingsRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/instructors/my-bookings'),
      ]);

      setProfile(profileRes.data);

      // Filter bookings for today and upcoming
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayBookings = bookingsRes.data.filter((b: Booking) => {
        const lessonDate = new Date(b.scheduled_time);
        return lessonDate >= today && lessonDate < tomorrow;
      });

      const upcomingBookings = bookingsRes.data.filter((b: Booking) => {
        const lessonDate = new Date(b.scheduled_time);
        return lessonDate >= tomorrow;
      });

      setTodayLessons(todayBookings);
      setUpcomingLessons(upcomingBookings);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.sectionTitle}>Today's Lessons</Text>
        {todayLessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No lessons scheduled for today</Text>
            <Text style={styles.emptyStateSubtext}>Enjoy your free time! 🎉</Text>
          </View>
        ) : (
          todayLessons.map(lesson => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View>
                  <Text style={styles.studentName}>👤 {lesson.student_name}</Text>
                  <Text style={styles.lessonTime}>🕒 {formatTime(lesson.scheduled_time)}</Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}
                >
                  <Text style={styles.statusText}>{lesson.status}</Text>
                </View>
              </View>
              <Text style={styles.lessonDuration}>⏱️ {lesson.duration_minutes} minutes</Text>
              {lesson.pickup_location && (
                <Text style={styles.pickupLocation}>📍 {lesson.pickup_location}</Text>
              )}
              <View style={styles.lessonFooter}>
                <Text style={styles.lessonPrice}>R{lesson.total_price.toFixed(2)}</Text>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Lessons */}
      {upcomingLessons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
          {upcomingLessons.slice(0, 5).map(lesson => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View>
                  <Text style={styles.studentName}>👤 {lesson.student_name}</Text>
                  <Text style={styles.lessonDate}>
                    📅 {formatDate(lesson.scheduled_time)} at {formatTime(lesson.scheduled_time)}
                  </Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}
                >
                  <Text style={styles.statusText}>{lesson.status}</Text>
                </View>
              </View>
              <Text style={styles.lessonDuration}>⏱️ {lesson.duration_minutes} minutes</Text>
              <View style={styles.lessonFooter}>
                <Text style={styles.lessonPrice}>R{lesson.total_price.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <Text style={styles.actionButtonText}>📅 Manage Availability</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => {}}>
          <Text style={styles.actionButtonText}>👤 Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => {}}>
          <Text style={styles.actionButtonText}>💰 View Earnings Report</Text>
        </TouchableOpacity>
      </View>

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
});
