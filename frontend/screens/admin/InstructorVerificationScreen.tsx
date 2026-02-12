/**
 * Instructor Verification Screen
 * Allow admins to verify or reject pending instructor registrations
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import apiService from '../../services/api';

interface PendingInstructor {
  id: number;
  user_id: number;
  email: string;
  phone: string;
  full_name: string;
  license_number: string;
  license_types: string;
  id_number: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  is_verified: boolean;
  created_at: string;
}

export default function InstructorVerificationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [instructors, setInstructors] = useState<PendingInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    instructor: PendingInstructor;
    approve: boolean;
  } | null>(null);

  const loadPendingInstructors = async () => {
    try {
      setError('');
      const data = await apiService.getPendingInstructors();
      setInstructors(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load pending instructors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPendingInstructors();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingInstructors();
  };

  const handleVerify = (instructor: PendingInstructor, approve: boolean) => {
    setConfirmAction({ instructor, approve });
  };

  const confirmVerification = async () => {
    if (!confirmAction) return;

    const { instructor, approve } = confirmAction;
    const action = approve ? 'verify' : 'reject';

    try {
      setError('');
      setConfirmAction(null);
      await apiService.verifyInstructor(instructor.id, approve, !approve);
      setSuccess(`Successfully ${approve ? 'verified' : 'rejected'} ${instructor.full_name}`);
      setTimeout(() => setSuccess(''), 5000);
      loadPendingInstructors();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action} instructor`);
    }
  };

  const renderInstructor = ({ item }: { item: PendingInstructor }) => (
    <Card variant="elevated" style={{ marginBottom: 10 }}>
      <View style={[styles.instructorHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.instructorName, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.instructorEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          <Text style={[styles.instructorPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        </View>
        <Text style={[styles.registrationDate, { color: colors.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>License Number:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.license_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>License Types:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.license_types}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ID Number:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.id_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vehicle:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.vehicle_make} {item.vehicle_model} ({item.vehicle_year})
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Registration:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.vehicle_registration}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button variant="primary" style={{ flex: 1, backgroundColor: colors.success }} onPress={() => handleVerify(item, true)}>
          ✓ Verify
        </Button>
        <Button variant="danger" style={{ flex: 1 }} onPress={() => handleVerify(item, false)}>
          ✗ Reject
        </Button>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading pending instructors...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Instructor Verification"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {instructors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.success }]}>✓ All instructors verified!</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>No pending verifications at this time.</Text>
        </View>
      ) : (
        <FlatList
          data={instructors}
          renderItem={renderInstructor}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Confirmation Modal */}
      <ThemedModal
        visible={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`${confirmAction?.approve ? '✅ Verify' : '❌ Reject'} Instructor`}
        size="sm"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.approve ? 'primary' : 'danger'}
              style={confirmAction?.approve ? { flex: 1, backgroundColor: colors.success } : { flex: 1 }}
              onPress={confirmVerification}
            >
              {confirmAction?.approve ? 'Verify' : 'Reject'}
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
          Are you sure you want to {confirmAction?.approve ? 'verify' : 'reject'}{' '}
          {confirmAction?.instructor.full_name}?
        </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  listContainer: {
    padding: 15,
  },
  instructorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  instructorEmail: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  instructorPhone: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  registrationDate: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  detailsSection: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
