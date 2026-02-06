import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  deleteUser,
  deleteInstructor,
  deleteStudent,
  deleteBooking,
  handleApiError,
} from '../services/database-interface';

interface DatabaseDeleteConfirmProps {
  visible: boolean;
  tableType: 'users' | 'instructors' | 'students' | 'bookings';
  record: Record<string, any>;
  etag: string;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}

const DatabaseDeleteConfirm: React.FC<DatabaseDeleteConfirmProps> = ({
  visible,
  tableType,
  record,
  etag,
  onClose,
  onDeleted,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const deleteLabel = useMemo(() => {
    switch (tableType) {
      case 'users':
        return 'Suspend User';
      case 'instructors':
        return 'Disable Instructor Verification';
      case 'students':
        return 'Deactivate Student';
      case 'bookings':
        return 'Delete Booking';
      default:
        return 'Delete Record';
    }
  }, [tableType]);

  const confirmButtonText = useMemo(() => {
    switch (tableType) {
      case 'users':
        return 'Suspend';
      case 'instructors':
        return 'Disable';
      case 'students':
        return 'Deactivate';
      case 'bookings':
        return 'Delete';
      default:
        return 'Confirm';
    }
  }, [tableType]);

  const deleteDescription = useMemo(() => {
    switch (tableType) {
      case 'users':
        return 'This will set the user status to SUSPENDED. The record will remain in the database.';
      case 'instructors':
        return 'This will set instructor verification to false. The record will remain in the database.';
      case 'students':
        return 'This will set the user status to INACTIVE. The record will remain in the database.';
      case 'bookings':
        return 'This will permanently delete the booking record. This action cannot be undone.';
      default:
        return 'This action will update or remove the record.';
    }
  }, [tableType]);

  const handleDelete = async () => {
    try {
      setLoading(true);

      switch (tableType) {
        case 'users':
          // Pass row_type to determine which profile/role to delete
          await deleteUser(record.id, etag, record.row_type);
          onDeleted('User suspended successfully');
          break;
        case 'instructors':
          await deleteInstructor(record.id, etag);
          onDeleted('Instructor verification disabled');
          break;
        case 'students':
          await deleteStudent(record.id, etag);
          onDeleted('Student deactivated successfully');
          break;
        case 'bookings':
          await deleteBooking(record.id, etag, reason.trim() || undefined);
          onDeleted('Booking deleted successfully');
          break;
        default:
          onError('Unsupported table type');
      }
    } catch (error: any) {
      onError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>⚠️ Confirm Action</Text>
          <Text style={styles.modalSubtitle}>{deleteLabel}</Text>

          <View style={styles.confirmDetails}>
            <Text style={styles.confirmLabel}>Record ID</Text>
            <Text style={styles.confirmValue}>{record.id}</Text>

            {record.first_name && record.last_name && (
              <>
                <Text style={styles.confirmLabel}>Name</Text>
                <Text style={styles.confirmValue}>{record.first_name} {record.last_name}</Text>
              </>
            )}

            {record.email && (
              <>
                <Text style={styles.confirmLabel}>Email</Text>
                <Text style={styles.confirmValue}>{record.email}</Text>
              </>
            )}

            <Text style={styles.confirmLabel}>Impact</Text>
            <Text style={styles.confirmValue}>{deleteDescription}</Text>
          </View>

          {tableType === 'bookings' && (
            <View style={styles.reasonSection}>
              <Text style={styles.confirmLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Provide a reason for deletion"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary, loading && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>{loading ? 'Processing...' : confirmButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 24 : 18,
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  confirmValue: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 14 : 12,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#333',
    minHeight: Platform.OS === 'web' ? 80 : 70,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#28a745',
  },
  modalButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#dc3545',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
});

export default DatabaseDeleteConfirm;
