/**
 * User Management Screen
 * Allow admins to view and manage all users (activate/deactivate/suspend)
 */
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
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
  id_number?: string;
  booking_fee?: number; // Only for instructors
  created_at: string;
  last_login: string | null;
}

export default function UserManagementScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'admin' | 'instructor' | 'student'>('instructor');
  const [roleFilter, setRoleFilter] = useState('instructor');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [instructorSchedule, setInstructorSchedule] = useState<any>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [editBookingFeeModalVisible, setEditBookingFeeModalVisible] = useState(false);
  const [bookingFeeValue, setBookingFeeValue] = useState('20.00');

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

  const handleTabChange = (tab: 'admin' | 'instructor' | 'student') => {
    setActiveTab(tab);
    setRoleFilter(tab);
    setSearchQuery('');
  };

  const normalizePhone = (phone: string) => {
    // Remove spaces, dashes, and convert +27 to 0
    return phone.replace(/[\s-]/g, '').replace(/^\+27/, '0');
  };

  const filteredUsers = users
    .filter(user => {
      const roleMatch = user.role === activeTab;
      const statusMatch = !statusFilter || user.status === statusFilter;

      if (!searchQuery) return roleMatch && statusMatch;

      const query = searchQuery.toLowerCase();
      const normalizedQuery = normalizePhone(searchQuery);
      const userPhone = normalizePhone(user.phone);

      const searchMatch =
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        userPhone.includes(normalizedQuery) ||
        (user.id_number && user.id_number.includes(searchQuery));

      return roleMatch && statusMatch && searchMatch;
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

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
    // Navigate to the appropriate profile edit screen based on user role
    if (user.role === 'instructor') {
      (navigation as any).navigate('EditInstructorProfile', { userId: user.id });
    } else if (user.role === 'student') {
      (navigation as any).navigate('EditStudentProfile', { userId: user.id });
    } else if (user.role === 'admin') {
      (navigation as any).navigate('EditAdminProfile', { userId: user.id });
    }
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

  const handleViewSchedule = async (user: User) => {
    setSelectedUser(user);
    setInstructorSchedule(null); // Clear previous schedule data
    setScheduleModalVisible(true);
    setLoadingSchedule(true);

    try {
      // First, get the instructor record to find the instructor_id
      const instructorRes = await apiService.get(`/instructors/by-user/${user.id}`);
      const instructorId = instructorRes.data.instructor_id;

      console.log('👤 User ID:', user.id);
      console.log('👨‍🏫 Instructor ID:', instructorId);

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();

      // Fetch instructor's schedule and time off using the instructor_id
      const [scheduleRes, timeOffRes, bookingsRes] = await Promise.all([
        apiService.get(`/admin/instructors/${instructorId}/schedule?t=${timestamp}`),
        apiService.get(`/admin/instructors/${instructorId}/time-off?t=${timestamp}`),
        apiService.get(`/admin/bookings?instructor_id=${instructorId}&t=${timestamp}`),
      ]);

      console.log('📅 Schedule data:', scheduleRes.data);
      console.log('🚫 Time off data:', timeOffRes.data);
      console.log('📚 Bookings data:', bookingsRes.data);
      console.log('📚 Number of bookings received:', bookingsRes.data?.length);
      console.log('📚 First booking:', bookingsRes.data?.[0]);

      // DEBUG: Log status breakdown
      if (bookingsRes.data && bookingsRes.data.length > 0) {
        const statusCounts: any = {};
        bookingsRes.data.forEach((b: any) => {
          const status = b.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('📊 Status breakdown:', statusCounts);
        console.log('📚 Sample bookings (first 5):');
        bookingsRes.data.slice(0, 5).forEach((b: any, idx: number) => {
          console.log(
            `  [${idx}] Status: "${b.status}", Date: ${b.lesson_date}, Student: ${b.student_name}`
          );
        });
      }

      setInstructorSchedule({
        schedule: scheduleRes.data || [],
        timeOff: timeOffRes.data || [],
        bookings: bookingsRes.data || [],
      });
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to load instructor schedule',
        SCREEN_NAME,
        'scheduleLoad',
        'error'
      );
    } finally {
      setLoadingSchedule(false);
    }
  };

  const refreshScheduleData = async () => {
    if (!selectedUser) return;

    setLoadingSchedule(true);

    try {
      const instructorRes = await apiService.get(`/instructors/by-user/${selectedUser.id}`);
      const instructorId = instructorRes.data.instructor_id;
      const timestamp = new Date().getTime();

      const [scheduleRes, timeOffRes, bookingsRes] = await Promise.all([
        apiService.get(`/admin/instructors/${instructorId}/schedule?t=${timestamp}`),
        apiService.get(`/admin/instructors/${instructorId}/time-off?t=${timestamp}`),
        apiService.get(`/admin/bookings?instructor_id=${instructorId}&t=${timestamp}`),
      ]);

      setInstructorSchedule({
        schedule: scheduleRes.data || [],
        timeOff: timeOffRes.data || [],
        bookings: bookingsRes.data || [],
      });

      showMessage(
        setSuccess,
        'Schedule refreshed successfully',
        SCREEN_NAME,
        'scheduleRefresh',
        'success'
      );
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to refresh schedule',
        SCREEN_NAME,
        'scheduleRefresh',
        'error'
      );
    } finally {
      setLoadingSchedule(false);
    }
  };

  const closeScheduleModal = () => {
    setScheduleModalVisible(false);
    setSelectedUser(null);
    setInstructorSchedule(null);
  };

  const handleOpenEditBookingFee = (user: User) => {
    setSelectedUser(user);
    setBookingFeeValue((user.booking_fee || 20).toFixed(2));
    setEditBookingFeeModalVisible(true);
  };

  const handleSaveBookingFee = async () => {
    if (!selectedUser) return;

    const fee = parseFloat(bookingFeeValue);
    if (isNaN(fee) || fee < 0) {
      showMessage(
        setError,
        'Please enter a valid booking fee (minimum R0)',
        SCREEN_NAME,
        'bookingFee',
        'error'
      );
      return;
    }

    try {
      const instructorId = selectedUser.id; // In context, this is the instructor profile ID
      await apiService.updateInstructorBookingFee(instructorId, fee);
      showMessage(
        setSuccess,
        `Booking fee updated to R${fee.toFixed(2)} for ${selectedUser.full_name}`,
        SCREEN_NAME,
        'bookingFee',
        'success'
      );
      setEditBookingFeeModalVisible(false);
      loadUsers();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to update booking fee',
        SCREEN_NAME,
        'bookingFee',
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
          {item.id_number && <Text style={styles.userIdNumber}>ID: {item.id_number}</Text>}
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
        {item.role === 'instructor' && item.booking_fee !== undefined && (
          <Text style={styles.userDetailText}>Booking Fee: R{item.booking_fee.toFixed(2)}</Text>
        )}
      </View>

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
        {item.role === 'instructor' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.scheduleButton]}
              onPress={() => handleViewSchedule(item)}
            >
              <Text style={styles.scheduleButtonLabel}>Schedule</Text>
              <Text style={styles.scheduleButtonText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.feeButton]}
              onPress={() => handleOpenEditBookingFee(item)}
            >
              <Text style={styles.actionButtonText}>💰 Manage Fee</Text>
            </TouchableOpacity>
          </>
        )}
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
      <WebNavigationHeader
        title="User Management"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
          onPress={() => handleTabChange('admin')}
        >
          <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>
            👤 Admins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instructor' && styles.activeTab]}
          onPress={() => handleTabChange('instructor')}
        >
          <Text style={[styles.tabText, activeTab === 'instructor' && styles.activeTabText]}>
            🚗 Instructors
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'student' && styles.activeTab]}
          onPress={() => handleTabChange('student')}
        >
          <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>
            📚 Students
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}s by name, ID, phone, or email...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Filter by Status:</Text>
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

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.gridContainer}>
          {filteredUsers.map(item => (
            <View key={item.id.toString()} style={styles.cardWrapper}>
              {renderUser({ item })}
            </View>
          ))}
        </View>
      </ScrollView>

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

      {/* View Schedule Modal */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeScheduleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 {selectedUser?.full_name}'s Schedule</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  onPress={refreshScheduleData}
                  style={styles.refreshButton}
                  disabled={loadingSchedule}
                >
                  <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeScheduleModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              {loadingSchedule ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0066CC" />
                  <Text style={styles.loadingText}>Loading schedule...</Text>
                </View>
              ) : instructorSchedule ? (
                <>
                  {/* Weekly Schedule */}
                  <View style={styles.scheduleSection}>
                    <Text style={styles.scheduleSectionTitle}>📅 Weekly Schedule</Text>
                    {instructorSchedule.schedule && instructorSchedule.schedule.length > 0 ? (
                      instructorSchedule.schedule.map((day: any) => (
                        <View key={day.day_of_week} style={styles.scheduleItem}>
                          <Text style={styles.scheduleDay}>
                            {day.day_of_week.charAt(0).toUpperCase() + day.day_of_week.slice(1)}
                          </Text>
                          <Text style={styles.scheduleTime}>
                            {day.is_active ? `${day.start_time} - ${day.end_time}` : 'Unavailable'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No weekly schedule set</Text>
                    )}
                  </View>

                  {/* Time Off */}
                  <View style={styles.scheduleSection}>
                    <Text style={styles.scheduleSectionTitle}>🚫 Time Off (All Dates)</Text>
                    {instructorSchedule.timeOff && instructorSchedule.timeOff.length > 0 ? (
                      instructorSchedule.timeOff.map((timeOff: any, index: number) => (
                        <View key={index} style={styles.timeOffItem}>
                          <Text style={styles.timeOffDates}>
                            {timeOff.start_date} to {timeOff.end_date}
                          </Text>
                          {timeOff.reason && (
                            <Text style={styles.timeOffReason}>{timeOff.reason}</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No time off scheduled</Text>
                    )}
                  </View>

                  {/* Recent Bookings */}
                  <View style={styles.scheduleSection}>
                    <Text style={styles.scheduleSectionTitle}>📚 Recent Bookings</Text>
                    {instructorSchedule.bookings && instructorSchedule.bookings.length > 0 ? (
                      instructorSchedule.bookings
                        .sort((a: any, b: any) => {
                          // Sort by lesson_date from earliest to latest
                          const dateA = a.lesson_date ? new Date(a.lesson_date).getTime() : 0;
                          const dateB = b.lesson_date ? new Date(b.lesson_date).getTime() : 0;
                          return dateA - dateB;
                        })
                        .slice(0, 10)
                        .map((booking: any) => {
                          // Parse the lesson_date field
                          const lessonDate = booking.lesson_date
                            ? new Date(booking.lesson_date)
                            : null;

                          const dateStr =
                            lessonDate && !isNaN(lessonDate.getTime())
                              ? lessonDate.toLocaleDateString()
                              : 'Invalid Date';
                          const timeStr =
                            lessonDate && !isNaN(lessonDate.getTime())
                              ? lessonDate.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Invalid Time';

                          // Determine status color
                          const status = booking.status ? booking.status.toUpperCase() : 'UNKNOWN';
                          let statusColor = '#6c757d'; // Default gray

                          if (status === 'COMPLETED') {
                            statusColor = '#28a745'; // Green
                          } else if (status === 'PENDING' || status === 'CONFIRMED') {
                            statusColor = '#ffc107'; // Yellow/Orange
                          } else if (status === 'CANCELLED' || status === 'NO_SHOW') {
                            statusColor = '#dc3545'; // Red
                          } else if (status === 'IN_PROGRESS') {
                            statusColor = '#007bff'; // Blue
                          }

                          return (
                            <View key={booking.id} style={styles.bookingItem}>
                              <View style={styles.bookingHeader}>
                                <Text style={styles.bookingDate}>
                                  📅 {dateStr} at {timeStr}
                                </Text>
                                <Text
                                  style={[styles.bookingStatus, { backgroundColor: statusColor }]}
                                >
                                  {status}
                                </Text>
                              </View>
                              <View style={styles.bookingDetails}>
                                <Text style={styles.bookingStudent}>
                                  👤 {booking.student_name || 'Unknown'}
                                </Text>
                                {booking.student_phone && (
                                  <Text style={styles.bookingPhone}>
                                    📞 {booking.student_phone}
                                  </Text>
                                )}
                                {booking.student_id_number && (
                                  <Text style={styles.bookingIdNumber}>
                                    🆔 {booking.student_id_number}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })
                    ) : (
                      <Text style={styles.emptyText}>No bookings found</Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>Failed to load schedule</Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={closeScheduleModal}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Booking Fee Modal */}
      <Modal
        visible={editBookingFeeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditBookingFeeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Manage Booking Fee</Text>
              <TouchableOpacity
                onPress={() => setEditBookingFeeModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.infoText}>Instructor: {selectedUser?.full_name}</Text>
              <Text style={styles.infoText} style={{ marginBottom: 20 }}>
                This fee is added to the instructor's rate when students book lessons.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Booking Fee (ZAR) *</Text>
                <TextInput
                  style={styles.input}
                  value={bookingFeeValue}
                  onChangeText={setBookingFeeValue}
                  placeholder="20.00"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>
                  Students will pay: Instructor Rate + R{bookingFeeValue || '0.00'}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setEditBookingFeeModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveBookingFee}>
                <Text style={styles.saveModalButtonText}>Save Fee</Text>
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
  logoutButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filters: {
    backgroundColor: '#FFF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0066CC',
    backgroundColor: '#F0F8FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  filterGroup: {
    width: '100%',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 6,
    backgroundColor: '#DC3545',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  cardWrapper: {
    margin: 5,
    flexBasis: Platform.OS === 'web' ? '30%' : '100%',
    minWidth: Platform.OS === 'web' ? 280 : '100%',
    maxWidth: Platform.OS === 'web' ? '48%' : '100%',
    flexGrow: 1,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#666',
  },
  userIdNumber: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 3,
  },
  badges: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 3,
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
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 6,
  },
  userDetailText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 5,
    minWidth: 65,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#17A2B8',
  },
  passwordButton: {
    backgroundColor: '#6610F2',
  },
  scheduleButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'column',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 70,
    borderWidth: 1.5,
    borderColor: '#FF8C5A',
  },
  scheduleButtonText: {
    fontSize: 24,
    marginBottom: 2,
  },
  scheduleButtonLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  feeButton: {
    backgroundColor: '#FFC107',
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
    fontSize: 12,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
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
  scheduleSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  scheduleSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scheduleTime: {
    fontSize: 16,
    color: '#666',
  },
  timeOffItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timeOffDates: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timeOffReason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  bookingItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    marginBottom: 8,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bookingStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bookingDetails: {
    marginTop: 4,
  },
  bookingStudent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
  },
  bookingPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  bookingIdNumber: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
