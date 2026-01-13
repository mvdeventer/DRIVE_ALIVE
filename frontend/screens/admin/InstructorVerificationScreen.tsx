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
      <WebNavigationHeader
        title="Instructor Verification"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Instructors</Text>
        <View style={{ width: 150 }} />
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  instructorEmail: {
    fontSize: 12,
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
});
