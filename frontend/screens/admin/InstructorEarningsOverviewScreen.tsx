/**
 * Instructor Earnings Overview Screen (Admin)
 * Comprehensive view of all instructor earnings with detailed reports
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { showMessage } from '../../utils/messageConfig';

const SCREEN_NAME = 'InstructorEarningsOverviewScreen';

interface InstructorSummary {
  instructor_id: number;
  user_id: number;
  instructor_name: string;
  email: string;
  phone: string;
  total_earnings: number;
  completed_lessons: number;
  hourly_rate: number;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  total_reviews: number;
}

interface DetailedEarnings {
  instructor_id: number;
  instructor_name: string;
  total_earnings: number;
  hourly_rate: number;
  completed_lessons: number;
  pending_lessons: number;
  cancelled_lessons: number;
  total_lessons: number;
  earnings_by_month: { month: string; earnings: number; lessons: number }[];
  recent_earnings: {
    id: number;
    student_name: string;
    lesson_date: string;
    duration_minutes: number;
    amount: number;
    status: string;
  }[];
}

export default function InstructorEarningsOverviewScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [instructors, setInstructors] = useState<InstructorSummary[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<DetailedEarnings | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/admin/instructors/earnings-summary');
      setInstructors(response.data.instructors);
    } catch (error: any) {
      console.error('Error loading instructors:', error);
      showMessage(
        setErrorMessage,
        `Failed to load instructors: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetailedReport = async (instructorId: number) => {
    try {
      setLoadingDetail(true);
      const response = await ApiService.get(`/admin/instructors/${instructorId}/earnings-report`);
      setSelectedInstructor(response.data);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('Error loading detailed report:', error);
      showMessage(
        setErrorMessage,
        `Failed to load earnings report: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInstructors();
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderInstructorCard = ({ item }: { item: InstructorSummary }) => (
    <TouchableOpacity
      style={styles.instructorCard}
      onPress={() => loadDetailedReport(item.instructor_id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.instructorInfo}>
          <Text style={styles.instructorName}>{item.instructor_name}</Text>
          <View style={styles.badgeContainer}>
            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.badgeText}>✓ Verified</Text>
              </View>
            )}
            {item.is_available && (
              <View style={styles.availableBadge}>
                <Text style={styles.badgeText}>Available</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.totalEarnings}>{formatCurrency(item.total_earnings)}</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lessons</Text>
          <Text style={styles.statValue}>{item.completed_lessons}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Hourly Rate</Text>
          <Text style={styles.statValue}>{formatCurrency(item.hourly_rate)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rating</Text>
          <Text style={styles.statValue}>
            ⭐ {item.rating.toFixed(1)} ({item.total_reviews})
          </Text>
        </View>
      </View>

      <Text style={styles.viewDetailsLink}>Tap to view detailed report →</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading instructor earnings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {successMessage ? <InlineMessage type="success" message={successMessage} /> : null}
      {errorMessage ? <InlineMessage type="error" message={errorMessage} /> : null}

      <FlatList
        data={instructors}
        renderItem={renderInstructorCard}
        keyExtractor={item => item.instructor_id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>💰 Instructor Earnings Overview</Text>
            <Text style={styles.headerSubtitle}>
              {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} • Total Revenue:{' '}
              {formatCurrency(instructors.reduce((sum, i) => sum + i.total_earnings, 0))}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No instructors found</Text>
          </View>
        }
      />

      {/* Detailed Earnings Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent={Platform.OS !== 'web'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingDetail ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.modalLoadingText}>Loading detailed report...</Text>
              </View>
            ) : selectedInstructor ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    📊 Earnings Report: {selectedInstructor.instructor_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summarySection}>
                  <View style={[styles.summaryCard, styles.primaryCard]}>
                    <Text style={styles.summaryLabel}>Total Earnings</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedInstructor.total_earnings)}
                    </Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Completed</Text>
                    <Text style={styles.summaryValue}>{selectedInstructor.completed_lessons}</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Hourly Rate</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedInstructor.hourly_rate)}
                    </Text>
                  </View>
                </View>

                {/* Statistics */}
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>Lesson Statistics</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBadge}>
                      <Text style={styles.statBadgeLabel}>✅ Completed</Text>
                      <Text style={styles.statBadgeValue}>
                        {selectedInstructor.completed_lessons}
                      </Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Text style={styles.statBadgeLabel}>⏳ Pending</Text>
                      <Text style={styles.statBadgeValue}>
                        {selectedInstructor.pending_lessons}
                      </Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Text style={styles.statBadgeLabel}>❌ Cancelled</Text>
                      <Text style={styles.statBadgeValue}>
                        {selectedInstructor.cancelled_lessons}
                      </Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Text style={styles.statBadgeLabel}>📊 Total</Text>
                      <Text style={styles.statBadgeValue}>{selectedInstructor.total_lessons}</Text>
                    </View>
                  </View>
                </View>

                {/* Monthly Breakdown */}
                {selectedInstructor.earnings_by_month.length > 0 && (
                  <View style={styles.monthlySection}>
                    <Text style={styles.sectionTitle}>Monthly Earnings</Text>
                    {selectedInstructor.earnings_by_month.map((month, index) => (
                      <View key={index} style={styles.monthCard}>
                        <Text style={styles.monthName}>{month.month}</Text>
                        <View style={styles.monthStats}>
                          <Text style={styles.monthEarnings}>{formatCurrency(month.earnings)}</Text>
                          <Text style={styles.monthLessons}>{month.lessons} lessons</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Earnings */}
                {selectedInstructor.recent_earnings.length > 0 && (
                  <View style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>Recent Earnings</Text>
                    {selectedInstructor.recent_earnings.map(earning => (
                      <View key={earning.id} style={styles.earningCard}>
                        <View style={styles.earningHeader}>
                          <Text style={styles.studentName}>{earning.student_name}</Text>
                          <Text style={styles.earningAmount}>{formatCurrency(earning.amount)}</Text>
                        </View>
                        <Text style={styles.earningDate}>
                          {formatDate(earning.lesson_date)} at {formatTime(earning.lesson_date)}
                        </Text>
                        <Text style={styles.earningDuration}>
                          Duration: {earning.duration_minutes} minutes
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  instructorCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  verifiedBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  availableBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  totalEarnings: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  viewDetailsLink: {
    fontSize: 13,
    color: '#007bff',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: Platform.OS === 'web' ? '80%' : '95%',
    maxWidth: 800,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
    }),
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalScroll: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  summarySection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#e7f5ff',
    borderColor: '#007bff',
    borderWidth: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBadge: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statBadgeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statBadgeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlySection: {
    marginBottom: 20,
  },
  monthCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  monthStats: {
    alignItems: 'flex-end',
  },
  monthEarnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  monthLessons: {
    fontSize: 12,
    color: '#666',
  },
  recentSection: {
    marginBottom: 20,
  },
  earningCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  earningDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  earningDuration: {
    fontSize: 12,
    color: '#666',
  },
  closeModalButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
