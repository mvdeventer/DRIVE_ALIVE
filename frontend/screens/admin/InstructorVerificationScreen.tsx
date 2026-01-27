/**
 * Instructor Verification Screen
 * Allow admins to verify or reject pending instructor registrations
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
    <View style={styles.instructorCard}>
      <View style={styles.instructorHeader}>
        <View>
          <Text style={styles.instructorName}>{item.full_name}</Text>
          <Text style={styles.instructorEmail}>{item.email}</Text>
          <Text style={styles.instructorPhone}>{item.phone}</Text>
        </View>
        <Text style={styles.registrationDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>License Number:</Text>
          <Text style={styles.detailValue}>{item.license_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>License Types:</Text>
          <Text style={styles.detailValue}>{item.license_types}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ID Number:</Text>
          <Text style={styles.detailValue}>{item.id_number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>
            {item.vehicle_make} {item.vehicle_model} ({item.vehicle_year})
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Registration:</Text>
          <Text style={styles.detailValue}>{item.vehicle_registration}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleVerify(item, true)}
        >
          <Text style={styles.actionButtonText}>✓ Verify</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleVerify(item, false)}
        >
          <Text style={styles.actionButtonText}>✗ Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading pending instructors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Instructor Verification"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {instructors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>✓ All instructors verified!</Text>
          <Text style={styles.emptySubtext}>No pending verifications at this time.</Text>
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
      <Modal
        visible={!!confirmAction}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {confirmAction?.approve ? '✅ Verify' : '❌ Reject'} Instructor
            </Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to {confirmAction?.approve ? 'verify' : 'reject'}{' '}
              {confirmAction?.instructor.full_name}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setConfirmAction(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  confirmAction?.approve ? styles.modalConfirmButton : styles.modalRejectButton,
                ]}
                onPress={confirmVerification}
              >
                <Text style={styles.modalConfirmText}>
                  {confirmAction?.approve ? 'Verify' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 150,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
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
  listContainer: {
    padding: 15,
  },
  instructorCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  instructorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  instructorEmail: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#666',
    marginBottom: 2,
  },
  instructorPhone: {
    fontSize: 12,
    color: '#666',
  },
  registrationDate: {
    fontSize: 10,
    color: '#999',
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
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28A745',
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#E0E0E0',
  },
  modalConfirmButton: {
    backgroundColor: '#28A745',
  },
  modalRejectButton: {
    backgroundColor: '#DC3545',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
