/**
 * Instructor Verification Screen
 * Allow admins to verify or reject pending instructor registrations
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
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

  const handleLogout = async () => {
    await apiService.logout();
    navigation.replace('Login');
  };

  const handleVerify = async (instructor: PendingInstructor, approve: boolean) => {
    const action = approve ? 'verify' : 'reject';

    Alert.alert(
      `${approve ? 'Verify' : 'Reject'} Instructor`,
      `Are you sure you want to ${action} ${instructor.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Verify' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setError('');
              await apiService.verifyInstructor(instructor.id, approve, !approve);
              setSuccess(
                `Successfully ${approve ? 'verified' : 'rejected'} ${instructor.full_name}`
              );
              setTimeout(() => setSuccess(''), 5000);
              loadPendingInstructors();
            } catch (err: any) {
              setError(err.response?.data?.detail || `Failed to ${action} instructor`);
            }
          },
        },
      ]
    );
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Instructor Verification</Text>
            <Text style={styles.headerSubtitle}>{instructors.length} pending</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    </View>
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
    backgroundColor: '#DC3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  instructorCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  instructorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  instructorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  instructorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  instructorPhone: {
    fontSize: 14,
    color: '#666',
  },
  registrationDate: {
    fontSize: 12,
    color: '#999',
  },
  detailsSection: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
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
    fontSize: 16,
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
});
