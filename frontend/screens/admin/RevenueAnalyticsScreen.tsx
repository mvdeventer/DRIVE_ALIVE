/**
 * Revenue Analytics Screen
 * View revenue statistics and top performing instructors
 */
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
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

interface InstructorOption {
  instructor_id: number;
  instructor_name: string;
  email?: string;
  phone?: string;
}

export default function RevenueAnalyticsScreen({ navigation }: any) {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRevenueStats = async (instructorId?: number | null) => {
    try {
      setError('');
      const data = await apiService.getRevenueStats(instructorId || undefined);
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load revenue statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const response = await apiService.get('/admin/instructors/earnings-summary');
      const instructorList = response.data.instructors || [];
      // Sort alphabetically by instructor name
      const sortedInstructors = instructorList.sort((a: any, b: any) =>
        a.instructor_name.localeCompare(b.instructor_name)
      );
      setInstructors(sortedInstructors);
    } catch (err: any) {
      console.error('Failed to load instructors:', err);
    }
  };

  // Filter instructors based on search query
  const filteredInstructors = useMemo(() => {
    if (!searchQuery.trim()) return instructors;

    const query = searchQuery.toLowerCase();
    return instructors.filter(
      instructor =>
        instructor.instructor_name.toLowerCase().includes(query) ||
        instructor.instructor_id.toString().includes(query) ||
        instructor.email?.toLowerCase().includes(query) ||
        instructor.phone?.includes(query)
    );
  }, [instructors, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadInstructors();
      loadRevenueStats(selectedInstructorId);
    }, [selectedInstructorId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRevenueStats(selectedInstructorId);
  };

  const handleInstructorChange = (value: string) => {
    const instructorId = value === 'all' ? null : parseInt(value, 10);
    setSelectedInstructorId(instructorId);
    setLoading(true);
    loadRevenueStats(instructorId);
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
      <WebNavigationHeader
        title="Revenue Analytics"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Instructor Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Instructor:</Text>

        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        {/* Dropdown Picker */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedInstructorId?.toString() || 'all'}
            onValueChange={handleInstructorChange}
            style={styles.picker}
          >
            <Picker.Item label="All Instructors" value="all" />
            {filteredInstructors.map(instructor => (
              <Picker.Item
                key={instructor.instructor_id}
                label={`${instructor.instructor_name} (ID: ${instructor.instructor_id})`}
                value={instructor.instructor_id.toString()}
              />
            ))}
          </Picker>
        </View>
      </View>

      {error && <InlineMessage message={error} type="error" />}

      {stats && (
        <>
          {/* Main Revenue Stats - Responsive Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>Total Revenue</Text>
                <Text style={[styles.statCardValue, styles.statCardSuccess]}>
                  R{stats.total_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>Pending Revenue</Text>
                <Text style={[styles.statCardValue, styles.statCardWarning]}>
                  R{stats.pending_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>Completed Bookings</Text>
                <Text style={styles.statCardValue}>{stats.completed_bookings}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>Average Booking Value</Text>
                <Text style={styles.statCardValue}>R{stats.avg_booking_value.toFixed(2)}</Text>
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
                    ? (stats.total_revenue / stats.completed_bookings).toFixed(2)
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
  header: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 20,
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
  revenueCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
  },
  revenueItem: {
    paddingVertical: 8,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 20,
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
    marginVertical: 4,
  },
  instructorCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  rankBadge: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  instructorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  instructorStat: {
    fontSize: 10,
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
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
  filterSection: {
    backgroundColor: '#FFF',
    padding: 15,
    marginTop: 0,
    marginHorizontal: 15,
    borderRadius: 10,
    boxShadow: '0px 2px 4px #0000001A',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  searchInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  // Responsive grid for stats cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    margin: 6,
    flexBasis: '30%',
    minWidth: 170,
    maxWidth: '48%',
    flexGrow: 1,
    alignItems: 'center',
    boxShadow: '0px 1px 3px #00000015',
  },
  statCardLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statCardSuccess: {
    color: '#28A745',
  },
  statCardWarning: {
    color: '#FFC107',
  },
});
