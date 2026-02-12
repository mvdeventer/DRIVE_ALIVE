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
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors } = useTheme();
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
      const sortedInstructors = instructorList.sort((a: any, b: any) =>
        a.instructor_name.localeCompare(b.instructor_name)
      );
      setInstructors(sortedInstructors);
    } catch (err: any) {
      console.error('Failed to load instructors:', err);
    }
  };

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
    <View style={[styles.instructorCard, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.rankBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.instructorInfo}>
        <Text style={[styles.instructorName, { color: colors.text }]}>{item.name}</Text>
        <View style={styles.instructorStats}>
          <Text style={[styles.instructorStat, { color: colors.textSecondary }]}>R{item.total_earnings.toFixed(2)}</Text>
          <Text style={[styles.instructorStat, { color: colors.textSecondary }]}>{item.booking_count} lessons</Text>
          <Text style={[styles.instructorStat, { color: colors.textSecondary }]}>
            R{(item.total_earnings / item.booking_count).toFixed(2)}/lesson
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading revenue analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Revenue Analytics"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <ScrollView
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

      {/* Instructor Filter */}
      <Card variant="elevated" style={{ marginTop: 0, marginHorizontal: 15 }}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Filter by Instructor:</Text>

        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
          placeholder="Search by name, ID, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textMuted}
        />

        <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Picker
            selectedValue={selectedInstructorId?.toString() || 'all'}
            onValueChange={handleInstructorChange}
            style={[styles.picker, { color: colors.text }]}
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
      </Card>

      {error && <InlineMessage message={error} type="error" />}

      {stats && (
        <>
          {/* Main Revenue Stats */}
          <Card variant="elevated" style={{ marginTop: 15, marginHorizontal: 15 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Summary</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
                <Text style={[styles.statCardValue, { color: colors.success }]}>
                  R{stats.total_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Pending Revenue</Text>
                <Text style={[styles.statCardValue, { color: colors.warning }]}>
                  R{stats.pending_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Completed Bookings</Text>
                <Text style={[styles.statCardValue, { color: colors.text }]}>{stats.completed_bookings}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Average Booking Value</Text>
                <Text style={[styles.statCardValue, { color: colors.text }]}>R{stats.avg_booking_value.toFixed(2)}</Text>
              </View>
            </View>
          </Card>

          {/* Top Instructors */}
          <Card variant="elevated" style={{ marginTop: 15, marginHorizontal: 15 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Earning Instructors</Text>
            {stats.top_instructors.length > 0 ? (
              <FlatList
                data={stats.top_instructors}
                renderItem={renderTopInstructor}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No instructor data available</Text>
              </View>
            )}
          </Card>

          {/* Performance Metrics */}
          <Card variant="elevated" style={{ marginTop: 15, marginHorizontal: 15, marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {stats.completed_bookings > 0
                    ? (stats.total_revenue / stats.completed_bookings).toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Revenue per Booking</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {stats.top_instructors.length > 0
                    ? (
                        stats.total_revenue /
                        stats.top_instructors.reduce((sum, i) => sum + i.booking_count, 0)
                      ).toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg Instructor Revenue</Text>
              </View>
            </View>
          </Card>
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 15,
  },
  instructorCard: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  rankBadge: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  instructorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  instructorStat: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  metricsGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
    borderRadius: 6,
    padding: 10,
    marginHorizontal: Platform.OS === 'web' ? 4 : 0,
    marginVertical: Platform.OS === 'web' ? 0 : 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  searchInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: Platform.OS === 'web' ? '30%' : '47%',
    minWidth: Platform.OS === 'web' ? 140 : 100,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
    textAlign: 'center',
  },
  statCardValue: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
