/**
 * Admin Dashboard Home Screen
 * Main dashboard with system statistics and quick actions
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import apiService from '../../services/api';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_instructors: number;
  total_students: number;
  verified_instructors: number;
  pending_verification: number;
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
}

export default function AdminDashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setError('');
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>System Overview & Management</Text>
          </View>
        </View>
      </View>

      {error && <InlineMessage message={error} type="error" />}

      {stats && (
        <>
          {/* Quick Action Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionPrimary]}
                onPress={() => navigation.navigate('InstructorVerification')}
              >
                <Text style={styles.actionBadge}>{stats.pending_verification}</Text>
                <Text style={styles.actionTitle}>Verify Instructors</Text>
                <Text style={styles.actionSubtitle}>Pending</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionSecondary]}
                onPress={() => navigation.navigate('UserManagement')}
              >
                <Text style={styles.actionBadge}>{stats.total_users}</Text>
                <Text style={styles.actionTitle}>Manage Users</Text>
                <Text style={styles.actionSubtitle}>Total</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionSuccess]}
                onPress={() => navigation.navigate('BookingOversight')}
              >
                <Text style={styles.actionBadge}>{stats.total_bookings}</Text>
                <Text style={styles.actionTitle}>View Bookings</Text>
                <Text style={styles.actionSubtitle}>All Time</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionWarning]}
                onPress={() => navigation.navigate('RevenueAnalytics')}
              >
                <Text style={styles.actionBadge}>R{stats.total_revenue.toFixed(0)}</Text>
                <Text style={styles.actionTitle}>Revenue</Text>
                <Text style={styles.actionSubtitle}>Total Earned</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionInfo]}
                onPress={() => navigation.navigate('InstructorEarningsOverview')}
              >
                <Text style={styles.actionBadge}>{stats.verified_instructors}</Text>
                <Text style={styles.actionTitle}>Instructor Earnings</Text>
                <Text style={styles.actionSubtitle}>Detailed Reports</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_users}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statSuccess]}>{stats.active_users}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_instructors}</Text>
                <Text style={styles.statLabel}>Instructors</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_students}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          </View>

          {/* Instructor Verification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructor Verification</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statSuccess]}>
                  {stats.verified_instructors}
                </Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statWarning]}>
                  {stats.pending_verification}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Booking Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_bookings}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statWarning]}>{stats.pending_bookings}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statSuccess]}>
                  {stats.completed_bookings}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statDanger]}>
                  {stats.cancelled_bookings}
                </Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          </View>

          {/* Revenue Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={styles.revenueCard}>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={[styles.revenueValue, styles.statSuccess]}>
                  R{stats.total_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Average Booking</Text>
                <Text style={styles.revenueValue}>R{stats.avg_booking_value.toFixed(2)}</Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Completed Lessons</Text>
                <Text style={styles.revenueValue}>{stats.completed_bookings}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    boxShadow: '0px 2px 4px #0000001A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionPrimary: {
    backgroundColor: '#0066CC',
  },
  actionSecondary: {
    backgroundColor: '#6C757D',
  },
  actionSuccess: {
    backgroundColor: '#28A745',
  },
  actionWarning: {
    backgroundColor: '#FFC107',
  },
  actionInfo: {
    backgroundColor: '#17A2B8',
  },
  actionBadge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#E0E0E0',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statSuccess: {
    color: '#28A745',
  },
  statWarning: {
    color: '#FFC107',
  },
  statDanger: {
    color: '#DC3545',
  },
  revenueCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  revenueLabel: {
    fontSize: 16,
    color: '#666',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
