/**
 * Revenue Analytics Screen
 * View revenue statistics and top performing instructors
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import apiService from '../../services/api';

interface RevenueStats {
  total_revenue: number;
  pending_revenue: number;
  completed_bookings: number;
  avg_booking_value: number;
  top_instructors: Array<{
    instructor_id: number;
    name: string;
    total_earnings: number;
    booking_count: number;
  }>;
}

export default function RevenueAnalyticsScreen() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRevenueStats = async () => {
    try {
      setError('');
      const data = await apiService.getRevenueStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load revenue statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRevenueStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRevenueStats();
  };

  const renderTopInstructor = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.instructorCard}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.instructorInfo}>
        <Text style={styles.instructorName}>{item.name}</Text>
        <View style={styles.instructorStats}>
          <Text style={styles.instructorStat}>💰 R{item.total_earnings.toFixed(2)}</Text>
          <Text style={styles.instructorStat}>📚 {item.booking_count} lessons</Text>
          <Text style={styles.instructorStat}>
            📊 R{(item.total_earnings / item.booking_count).toFixed(2)}/lesson
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading revenue analytics...</Text>
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Revenue Analytics</Text>
            <Text style={styles.headerSubtitle}>Financial Overview</Text>
          </View>
        </View>
      </View>

      {error && <InlineMessage message={error} type="error" />}

      {stats && (
        <>
          {/* Main Revenue Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Summary</Text>
            <View style={styles.revenueCard}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={[styles.revenueValue, styles.revenueSuccess]}>
                  R{stats.total_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Pending Revenue</Text>
                <Text style={[styles.revenueValue, styles.revenueWarning]}>
                  R{stats.pending_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Completed Bookings</Text>
                <Text style={styles.revenueValue}>{stats.completed_bookings}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Average Booking Value</Text>
                <Text style={styles.revenueValue}>R{stats.avg_booking_value.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Top Instructors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Earning Instructors</Text>
            {stats.top_instructors.length > 0 ? (
              <FlatList
                data={stats.top_instructors}
                renderItem={renderTopInstructor}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No instructor data available</Text>
              </View>
            )}
          </View>

          {/* Additional Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {stats.completed_bookings > 0
                    ? ((stats.total_revenue / stats.completed_bookings) * 1.0).toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={styles.metricLabel}>Revenue per Booking</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {stats.top_instructors.length > 0
                    ? (
                        stats.total_revenue /
                        stats.top_instructors.reduce((sum, i) => sum + i.booking_count, 0)
                      ).toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={styles.metricLabel}>Avg Instructor Revenue</Text>
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
  section: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  revenueCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  revenueItem: {
    paddingVertical: 10,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  revenueSuccess: {
    color: '#28A745',
  },
  revenueWarning: {
    color: '#FFC107',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 5,
  },
  instructorCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  instructorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  instructorStat: {
    fontSize: 12,
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
