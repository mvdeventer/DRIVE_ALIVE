/**
 * Student Dashboard - Main hub for students to manage their driving lessons
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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

interface Booking {
  id: number;
  instructor_name: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  total_price: number;
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load student profile and bookings
      const [profileRes, bookingsRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/bookings/my-bookings'),
      ]);

      setProfile(profileRes.data);

      // Split bookings into upcoming and past
      const now = new Date();
      const upcoming = bookingsRes.data.filter((b: Booking) => new Date(b.scheduled_time) >= now);
      const past = bookingsRes.data.filter((b: Booking) => new Date(b.scheduled_time) < now);

      setUpcomingBookings(upcoming);
      setPastBookings(past);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      if (Platform.OS === 'web') {
        const errorMsg = error.response?.data?.detail || 'Failed to load dashboard data';
        alert(`Failed to load dashboard data\n\n${errorMsg}`);
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('InstructorList')}
        >
          <Text style={styles.actionButtonText}>📚 Book a Lesson</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => {}}>
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
          upcomingBookings.map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.instructorName}>{booking.instructor_name}</Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}
                >
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingTime}>🕒 {formatDate(booking.scheduled_time)}</Text>
              <Text style={styles.bookingDuration}>⏱️ {booking.duration_minutes} minutes</Text>
              <View style={styles.bookingFooter}>
                <Text style={styles.bookingPrice}>R{booking.total_price.toFixed(2)}</Text>
                <View style={styles.bookingActions}>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Lessons */}
      {pastBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Lessons</Text>
          {pastBookings.slice(0, 3).map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.instructorName}>{booking.instructor_name}</Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}
                >
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingTime}>🕒 {formatDate(booking.scheduled_time)}</Text>
              <Text style={styles.bookingDuration}>⏱️ {booking.duration_minutes} minutes</Text>
            </View>
          ))}
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
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  bookingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookingDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
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
});
