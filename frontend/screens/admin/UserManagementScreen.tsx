/**
 * User Management Screen
 * Allow admins to view and manage all users (activate/deactivate/suspend)
 */
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import apiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

const SCREEN_NAME = 'UserManagementScreen';

interface User {
  id: number;
  email: string;
  phone: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
}

export default function UserManagementScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    user: User;
    newStatus: string;
  } | null>(null);

  const loadUsers = async () => {
    try {
      setError('');
      const data = await apiService.getAllUsers(roleFilter, statusFilter);
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [roleFilter, statusFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleLogout = async () => {
    await apiService.logout();
    (navigation as any).replace('Login');
  };

  const handleStatusChange = (user: User, newStatus: string) => {
    console.log('handleStatusChange called:', user.full_name, newStatus);
    setConfirmAction({ user, newStatus });
  };

  const confirmStatusChange = async () => {
    if (!confirmAction) return;

    const { user, newStatus } = confirmAction;

    try {
      console.log('Calling updateUserStatus API:', user.id, newStatus);
      setError('');
      await apiService.updateUserStatus(user.id, newStatus);
      console.log('Status updated successfully');

      setConfirmAction(null);

      showMessage(
        setSuccess,
        `Successfully updated ${user.full_name}'s status to ${newStatus}`,
        SCREEN_NAME,
        'statusChange',
        'success'
      );

      await loadUsers();
    } catch (err: any) {
      console.error('Error updating status:', err);
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to update user status',
        SCREEN_NAME,
        'statusChange',
        'error'
      );
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'inactive':
        return styles.statusInactive;
      case 'suspended':
        return styles.statusSuspended;
      default:
        return styles.statusDefault;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return styles.roleAdmin;
      case 'instructor':
        return styles.roleInstructor;
      case 'student':
        return styles.roleStudent;
      default:
        return styles.roleDefault;
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    const names = user.full_name.split(' ');
    setEditFormData({
      first_name: names[0] || '',
      last_name: names.slice(1).join(' ') || '',
      phone: user.phone,
    });
    setEditModalVisible(true);
  };

  const handleSaveUserEdit = async () => {
    if (!selectedUser) return;

    if (!editFormData.first_name || !editFormData.last_name || !editFormData.phone) {
      showMessage(setError, 'Please fill in all fields', SCREEN_NAME, 'userEdit', 'error');
      return;
    }

    try {
      await apiService.updateUserDetails(selectedUser.id, editFormData);
      showMessage(
        setSuccess,
        'User details updated successfully',
        SCREEN_NAME,
        'userEdit',
        'success'
      );
      setEditModalVisible(false);
      loadUsers();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to update user',
        SCREEN_NAME,
        'userEdit',
        'error'
      );
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordModalVisible(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!newPassword || !confirmPassword) {
      showMessage(
        setError,
        'Please enter and confirm the new password',
        SCREEN_NAME,
        'passwordReset',
        'error'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(setError, 'Passwords do not match', SCREEN_NAME, 'passwordReset', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showMessage(
        setError,
        'Password must be at least 6 characters long',
        SCREEN_NAME,
        'passwordReset',
        'error'
      );
      return;
    }

    try {
      await apiService.resetUserPassword(selectedUser.id, newPassword);
      showMessage(
        setSuccess,
        `Password reset successfully for ${selectedUser.full_name}`,
        SCREEN_NAME,
        'passwordReset',
        'success'
      );
      setResetPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to reset password',
        SCREEN_NAME,
        'passwordReset',
        'error'
      );
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, getRoleBadgeStyle(item.role)]}>
            <Text style={styles.badgeText}>{item.role.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.userDetails}>
        <Text style={styles.userDetailText}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.last_login && (
          <Text style={styles.userDetailText}>
            Last Login: {new Date(item.last_login).toLocaleDateString()}
          </Text>
        )}
      </View>

      {item.role !== 'admin' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditUser(item)}
          >
            <Text style={styles.actionButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.passwordButton]}
            onPress={() => handleOpenResetPassword(item)}
          >
            <Text style={styles.actionButtonText}>🔑 Reset PW</Text>
          </TouchableOpacity>
          {item.status === 'suspended' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={() => handleStatusChange(item, 'active')}
            >
              <Text style={styles.actionButtonText}>✅ Unsuspend</Text>
            </TouchableOpacity>
          ) : item.status === 'inactive' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={() => handleStatusChange(item, 'active')}
            >
              <Text style={styles.actionButtonText}>✅ Activate</Text>
            </TouchableOpacity>
          ) : null}
          {item.status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.deactivateButton]}
                onPress={() => handleStatusChange(item, 'inactive')}
              >
                <Text style={styles.actionButtonText}>❌ Deactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.suspendButton]}
                onPress={() => handleStatusChange(item, 'suspended')}
              >
                <Text style={styles.actionButtonText}>🚫 Suspend</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>{users.length} users</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Role:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={roleFilter}
              onValueChange={value => setRoleFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="All Roles" value="" />
              <Picker.Item label="Admin" value="admin" />
              <Picker.Item label="Instructor" value="instructor" />
              <Picker.Item label="Student" value="student" />
            </Picker>
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={value => setStatusFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value="" />
              <Picker.Item label="Active" value="active" />
              <Picker.Item label="Inactive" value="inactive" />
              <Picker.Item label="Suspended" value="suspended" />
            </Picker>
          </View>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User: {selectedUser?.full_name}</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.first_name}
                  onChangeText={text => setEditFormData({ ...editFormData, first_name: text })}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.last_name}
                  onChangeText={text => setEditFormData({ ...editFormData, last_name: text })}
                  placeholder="Enter last name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.phone}
                  onChangeText={text => setEditFormData({ ...editFormData, phone: text })}
                  placeholder="+27..."
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.infoText}>Email: {selectedUser?.email}</Text>
                <Text style={styles.infoText}>Role: {selectedUser?.role.toUpperCase()}</Text>
                <Text style={styles.infoText}>Status: {selectedUser?.status.toUpperCase()}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveUserEdit}>
                <Text style={styles.saveModalButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={resetPasswordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResetPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password: {selectedUser?.full_name}</Text>
              <TouchableOpacity
                onPress={() => setResetPasswordModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                />
              </View>

              <Text style={styles.infoText}>Password must be at least 6 characters long</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setResetPasswordModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleResetPassword}>
                <Text style={styles.saveModalButtonText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!confirmAction}
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {confirmAction?.newStatus.toUpperCase() === 'ACTIVE'
                  ? '✅ Confirm Activation'
                  : confirmAction?.newStatus.toUpperCase() === 'INACTIVE'
                  ? '⚠️ Confirm Deactivation'
                  : '⚠️ Confirm Suspension'}
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.confirmText}>
                Are you sure you want to change{'\n'}
                <Text style={styles.boldText}>{confirmAction?.user?.full_name}'s</Text>
                {'\n'}status to{' '}
                <Text style={styles.boldText}>{confirmAction?.newStatus.toUpperCase()}</Text>?
              </Text>

              {confirmAction?.newStatus.toUpperCase() === 'INACTIVE' && (
                <Text style={styles.warningText}>
                  ⚠️ User will not be able to log in until reactivated.
                </Text>
              )}

              {confirmAction?.newStatus.toUpperCase() === 'SUSPENDED' && (
                <Text style={styles.warningText}>
                  ⚠️ User will be blocked from all access until unsuspended.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setConfirmAction(null)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveModalButton,
                  confirmAction?.newStatus === 'ACTIVE'
                    ? styles.activateButton
                    : styles.deactivateButton,
                ]}
                onPress={confirmStatusChange}
              >
                <Text style={styles.saveModalButtonText}>
                  {confirmAction?.newStatus === 'ACTIVE' ? 'Confirm' : 'Confirm'}
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
  filters: {
    backgroundColor: '#FFF',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  picker: {
    height: 40,
  },
  listContainer: {
    padding: 15,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
  badges: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  roleAdmin: {
    backgroundColor: '#DC3545',
  },
  roleInstructor: {
    backgroundColor: '#0066CC',
  },
  roleStudent: {
    backgroundColor: '#28A745',
  },
  roleDefault: {
    backgroundColor: '#6C757D',
  },
  statusActive: {
    backgroundColor: '#28A745',
  },
  statusInactive: {
    backgroundColor: '#6C757D',
  },
  statusSuspended: {
    backgroundColor: '#FFC107',
  },
  statusDefault: {
    backgroundColor: '#6C757D',
  },
  userDetails: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 10,
  },
  userDetailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#17A2B8',
  },
  passwordButton: {
    backgroundColor: '#6610F2',
  },
  activateButton: {
    backgroundColor: '#28A745',
  },
  deactivateButton: {
    backgroundColor: '#DC3545',
  },
  suspendButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveModalButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0066CC',
  },
  warningText: {
    fontSize: 14,
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});
