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
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useTheme } from '../../theme/ThemeContext';
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

interface BookingSummary {
  active_bookings: number;
  total_bookings: number;
}

export default function UserManagementScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
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
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    user: User;
    newStatus: string;
  } | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState<User | null>(null);
  const [confirmDeleteInstructor, setConfirmDeleteInstructor] = useState<User | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<User | null>(null);
  const [instructorBookingSummary, setInstructorBookingSummary] = useState<BookingSummary | null>(null);
  const [studentBookingSummary, setStudentBookingSummary] = useState<BookingSummary | null>(null);
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

  const loadCurrentUser = async () => {
    try {
      const currentUser = await apiService.getCurrentUser();
      setCurrentUserId(currentUser.id);
    } catch (err: any) {
      console.error('Failed to load current user:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
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
      const statusMatch = !statusFilter || user.status === statusFilter;

      if (!searchQuery) return statusMatch;

      const query = searchQuery.toLowerCase();
      const normalizedQuery = normalizePhone(searchQuery);
      const userPhone = normalizePhone(user.phone);
      
      // Remove # prefix if present for ID search (e.g., "#1" or "#2")
      const idSearchQuery = searchQuery.replace(/^#/, '');

      const searchMatch =
        user.id.toString() === idSearchQuery || // Exact ID match (e.g., "1" or "#1")
        user.id.toString().includes(searchQuery) || // Partial ID match
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        userPhone.includes(normalizedQuery) ||
        (user.id_number && user.id_number.includes(searchQuery));

      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      // Special sorting for admins: original admin first, then alphabetical
      if (activeTab === 'admin') {
        const adminUsers = users.filter(u => u.role === 'admin');
        const firstAdminId = adminUsers.length > 0 ? Math.min(...adminUsers.map(u => u.id)) : null;
        
        // If 'a' is the original admin, it comes first
        if (a.id === firstAdminId) return -1;
        // If 'b' is the original admin, it comes first
        if (b.id === firstAdminId) return 1;
        // Otherwise, sort alphabetically
        return a.full_name.localeCompare(b.full_name);
      }
      // For non-admin tabs, just sort alphabetically
      return a.full_name.localeCompare(b.full_name);
    });

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
      
      // FRONTEND PROTECTION: Prevent current admin from suspending their own admin profile
      const adminUsers = users.filter(u => u.role === 'admin');
      const firstAdminId = adminUsers.length > 0 ? Math.min(...adminUsers.map(u => u.id)) : null;
      
      if (user.id === currentUserId && user.role === 'admin' && user.id === firstAdminId) {
        showMessage(
          setError,
          'You cannot suspend your own admin profile. Use Database Interface to manage your other profiles.',
          SCREEN_NAME,
          'statusChange',
          'error'
        );
        setConfirmAction(null);
        return;
      }
      
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

  const handleDeleteAdmin = (user: User) => {
    setConfirmDeleteAdmin(user);
  };

  const confirmDeleteAdminAction = async () => {
    if (!confirmDeleteAdmin) return;

    try {
      setError('');
      await apiService.deleteAdmin(confirmDeleteAdmin.id);

      setConfirmDeleteAdmin(null);

      showMessage(
        setSuccess,
        `Admin ${confirmDeleteAdmin.full_name} deleted successfully`,
        SCREEN_NAME,
        'adminDelete',
        'success'
      );

      await loadUsers();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to delete admin',
        SCREEN_NAME,
        'adminDelete',
        'error'
      );
    }
  };

  const handleDeleteInstructor = async (user: User) => {
    setConfirmDeleteInstructor(null);
    setInstructorBookingSummary(null);

    try {
      const summary = await apiService.getInstructorBookingSummary(user.id);
      setInstructorBookingSummary(summary);
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to load instructor booking summary',
        SCREEN_NAME,
        'instructorDelete',
        'error'
      );
    }

    setConfirmDeleteInstructor(user);
  };

  const confirmDeleteInstructorAction = async () => {
    if (!confirmDeleteInstructor) return;

    try {
      setError('');
      await apiService.deleteInstructor(confirmDeleteInstructor.id);

      setConfirmDeleteInstructor(null);
      setInstructorBookingSummary(null);

      showMessage(
        setSuccess,
        `Instructor profile for ${confirmDeleteInstructor.full_name} deleted successfully. User can re-register as instructor.`,
        SCREEN_NAME,
        'instructorDelete',
        'success'
      );

      await loadUsers();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to delete instructor',
        SCREEN_NAME,
        'instructorDelete',
        'error'
      );
    }
  };

  const handleDeleteStudent = async (user: User) => {
    setConfirmDeleteStudent(null);
    setStudentBookingSummary(null);

    try {
      const summary = await apiService.getStudentBookingSummary(user.id);
      setStudentBookingSummary(summary);
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to load student booking summary',
        SCREEN_NAME,
        'studentDelete',
        'error'
      );
    }

    setConfirmDeleteStudent(user);
  };

  const confirmDeleteStudentAction = async () => {
    if (!confirmDeleteStudent) return;

    try {
      setError('');
      await apiService.deleteStudent(confirmDeleteStudent.id);

      setConfirmDeleteStudent(null);
      setStudentBookingSummary(null);

      showMessage(
        setSuccess,
        `Student profile for ${confirmDeleteStudent.full_name} deleted successfully. User can re-register as student.`,
        SCREEN_NAME,
        'studentDelete',
        'success'
      );

      await loadUsers();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || 'Failed to delete student',
        SCREEN_NAME,
        'studentDelete',
        'error'
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'inactive': return colors.textMuted;
      case 'suspended': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.danger;
      case 'instructor': return colors.primary;
      case 'student': return colors.success;
      default: return colors.textMuted;
    }
  };

  const handleEditUser = (user: User) => {
    // Open inline edit modal for all user roles
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
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

  const renderUser = ({ item }: { item: User }) => {
    const isAdminTab = activeTab === 'admin';
    const isInstructorTab = activeTab === 'instructor';
    const isStudentTab = activeTab === 'student';

    // Check if this is the original admin (only relevant on admin tab)
    const adminUsers = users.filter(u => u.role === 'admin');
    const firstAdminId = adminUsers.length > 0 ? Math.min(...adminUsers.map(u => u.id)) : null;
    const isOriginalAdmin = isAdminTab && item.role === 'admin' && item.id === firstAdminId;

    return (
      <Card variant="elevated" style={{ width: '100%' }}>
        <View style={[styles.userIdBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.userIdText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>User ID: #{item.id}</Text>
        </View>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>{item.full_name}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.email}</Text>
            <Text style={[styles.userPhone, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.phone}</Text>
            {item.id_number && <Text style={[styles.userIdNumber, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>SA ID: {item.id_number}</Text>}
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getRoleColor(item.role) }]}>
              <Text style={[styles.badgeText, { fontFamily: 'Inter_700Bold' }]}>{item.role.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={[styles.badgeText, { fontFamily: 'Inter_700Bold' }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

      <View style={[styles.userDetails, { borderTopColor: colors.border }]}>
        <Text style={[styles.userDetailText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.last_login && (
          <Text style={[styles.userDetailText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Last Login: {new Date(item.last_login).toLocaleDateString()}
          </Text>
        )}
        {isInstructorTab && item.booking_fee !== undefined && item.booking_fee !== null && (
          <Text style={[styles.userDetailText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Booking Fee: R{item.booking_fee.toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        {isOriginalAdmin && (
          <View style={[styles.originalAdminActionBadge, { backgroundColor: colors.warning, borderColor: colors.accent }]}>
            <Text style={[styles.originalAdminActionBadgeText, { fontFamily: 'Inter_700Bold' }]} numberOfLines={1} ellipsizeMode="tail">
              ORIGINAL ADMIN - PROTECTED
            </Text>
          </View>
        )}
        {(() => {
          if (isAdminTab) {
            const adminUsers2 = users.filter(u => u.role === 'admin');
            if (adminUsers2.length > 0) {
              const firstId = Math.min(...adminUsers2.map(u => u.id));
              const isCurrentUserOriginalAdmin = currentUserId === firstId;
              if (item.id === firstId && !isCurrentUserOriginalAdmin) {
                return null;
              }
            }
          }
          return (
            <Button variant="primary" size="sm" onPress={() => handleEditUser(item)}>Edit</Button>
          );
        })()}
        <Button variant="secondary" size="sm" onPress={() => handleOpenResetPassword(item)}>Reset PW</Button>
        {isAdminTab && (() => {
          const adminUsers2 = users.filter(u => u.role === 'admin');
          if (adminUsers2.length === 0) return null;
          const firstId = Math.min(...adminUsers2.map(u => u.id));
          if (item.id === firstId) return null;
          return (
            <Button variant="danger" size="sm" onPress={() => handleDeleteAdmin(item)}>Delete</Button>
          );
        })()}
        {isInstructorTab && (
          <>
            <Button variant="outline" size="sm" onPress={() => handleViewSchedule(item)}>Schedule</Button>
            <Button variant="accent" size="sm" onPress={() => handleOpenEditBookingFee(item)}>Manage Fee</Button>
            <Button variant="danger" size="sm" onPress={() => handleDeleteInstructor(item)}>Delete</Button>
          </>
        )}
        {isStudentTab && (
          <Button variant="danger" size="sm" onPress={() => handleDeleteStudent(item)}>Delete</Button>
        )}
        {item.status === 'suspended' ? (
          <Button variant="primary" size="sm" style={{ backgroundColor: colors.success }} onPress={() => handleStatusChange(item, 'active')}>Unsuspend</Button>
        ) : item.status === 'inactive' ? (
          <Button variant="primary" size="sm" style={{ backgroundColor: colors.success }} onPress={() => handleStatusChange(item, 'active')}>Activate</Button>
        ) : null}
        {item.status === 'active' && !isOriginalAdmin && (
          <>
            <Button variant="danger" size="sm" onPress={() => handleStatusChange(item, 'inactive')}>Deactivate</Button>
            <Button variant="danger" size="sm" onPress={() => handleStatusChange(item, 'suspended')}>Suspend</Button>
          </>
        )}
      </View>
    </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="User Management"
        onBack={() => navigation.goBack()}
        showBackButton={navigation.canGoBack()}
      />

      {error && <InlineMessage message={error} type="error" />}
      {success && <InlineMessage message={success} type="success" />}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['admin', 'instructor', 'student'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }, activeTab === tab && { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {tab === 'admin' ? 'Admins' : tab === 'instructor' ? 'Instructors' : 'Students'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text, fontFamily: 'Inter_400Regular' }]}
          placeholder={`Search ${activeTab}s by name, ID, phone, or email...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textMuted}
        />
        {searchQuery.length > 0 && (
          <Pressable style={[styles.clearSearchButton, { backgroundColor: colors.danger }]} onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearSearchText, { fontFamily: 'Inter_700Bold' }]}>X</Text>
          </Pressable>
        )}
      </View>

      {/* Status Filter */}
      <View style={[styles.filters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Filter by Status:</Text>
          <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={value => setStatusFilter(value)}
              style={[styles.picker, { color: colors.text }]}
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
      <ThemedModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title={`Edit User: ${selectedUser?.full_name || ''}`}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => setEditModalVisible(false)}>Cancel</Button>
            <Button variant="primary" onPress={handleSaveUserEdit}>Save Changes</Button>
          </View>
        }
      >
        <ScrollView>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>First Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              value={editFormData.first_name}
              onChangeText={text => setEditFormData({ ...editFormData, first_name: text })}
              placeholder="Enter first name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Last Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              value={editFormData.last_name}
              onChangeText={text => setEditFormData({ ...editFormData, last_name: text })}
              placeholder="Enter last name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              value={editFormData.phone}
              onChangeText={text => setEditFormData({ ...editFormData, phone: text })}
              placeholder="+27..."
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Email: {selectedUser?.email}</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Role: {selectedUser?.role.toUpperCase()}</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Status: {selectedUser?.status.toUpperCase()}</Text>
          </View>
        </ScrollView>
      </ThemedModal>

      {/* Reset Password Modal */}
      <ThemedModal
        visible={resetPasswordModalVisible}
        onClose={() => setResetPasswordModalVisible(false)}
        title={`Reset Password: ${selectedUser?.full_name || ''}`}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => setResetPasswordModalVisible(false)}>Cancel</Button>
            <Button variant="primary" onPress={handleResetPassword}>Reset Password</Button>
          </View>
        }
      >
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>New Password *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
          />
        </View>

        <Pressable
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showPassword ? 'Hide Password' : 'Show Password'}
          </Text>
        </Pressable>

        <Text style={[styles.infoText, { color: colors.textSecondary }]}>Password must be at least 6 characters long</Text>
      </ThemedModal>

      {/* Confirmation Modal */}
      <ThemedModal
        visible={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.newStatus.toUpperCase() === 'ACTIVE'
            ? 'Confirm Activation'
            : confirmAction?.newStatus.toUpperCase() === 'INACTIVE'
              ? 'Confirm Deactivation'
              : 'Confirm Suspension'
        }
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant={confirmAction?.newStatus === 'ACTIVE' ? 'primary' : 'danger'}
              onPress={confirmStatusChange}
              style={confirmAction?.newStatus === 'ACTIVE' ? { backgroundColor: colors.success } : undefined}
            >
              Confirm
            </Button>
          </View>
        }
      >
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to change{'\n'}
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{confirmAction?.user?.full_name}'s</Text>
          {'\n'}status to{' '}
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{confirmAction?.newStatus.toUpperCase()}</Text>?
        </Text>

        {confirmAction?.newStatus.toUpperCase() === 'INACTIVE' && (
          <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
            User will not be able to log in until reactivated.
          </Text>
        )}

        {confirmAction?.newStatus.toUpperCase() === 'SUSPENDED' && (
          <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
            This will set the user status to SUSPENDED. The record will remain in the database.
          </Text>
        )}
      </ThemedModal>

      {/* Delete Admin Confirmation Modal */}
      <ThemedModal
        visible={!!confirmDeleteAdmin}
        onClose={() => setConfirmDeleteAdmin(null)}
        title="Confirm Admin Deletion"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => setConfirmDeleteAdmin(null)}>Cancel</Button>
            <Button variant="danger" onPress={confirmDeleteAdminAction}>Delete</Button>
          </View>
        }
      >
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to delete{'\n'}
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{confirmDeleteAdmin?.full_name}</Text>?
        </Text>
        <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
          This permanently removes the admin account.
        </Text>
      </ThemedModal>

      {/* Delete Instructor Confirmation Modal */}
      <ThemedModal
        visible={!!confirmDeleteInstructor}
        onClose={() => { setConfirmDeleteInstructor(null); setInstructorBookingSummary(null); }}
        title="Confirm Instructor Deletion"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => { setConfirmDeleteInstructor(null); setInstructorBookingSummary(null); }}>Cancel</Button>
            <Button variant="danger" onPress={confirmDeleteInstructorAction}>Delete Profile</Button>
          </View>
        }
      >
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to delete the instructor profile for{'\n'}
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{confirmDeleteInstructor?.full_name}</Text>?
        </Text>
        {instructorBookingSummary && instructorBookingSummary.active_bookings > 0 && (
          <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
            This instructor has {instructorBookingSummary.active_bookings} active
            booking{instructorBookingSummary.active_bookings === 1 ? '' : 's'}. Deleting
            will cancel and remove them.
          </Text>
        )}
        {instructorBookingSummary && (
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, fontFamily: 'Inter_400Regular' }}>
            Total bookings on record: {instructorBookingSummary.total_bookings}
          </Text>
        )}
        <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
          This removes the instructor profile and all related bookings. The user account
          remains intact and they can re-register as an instructor later.
        </Text>
      </ThemedModal>

      {/* Delete Student Confirmation Modal */}
      <ThemedModal
        visible={!!confirmDeleteStudent}
        onClose={() => { setConfirmDeleteStudent(null); setStudentBookingSummary(null); }}
        title="Confirm Student Deletion"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => { setConfirmDeleteStudent(null); setStudentBookingSummary(null); }}>Cancel</Button>
            <Button variant="danger" onPress={confirmDeleteStudentAction}>Delete Profile</Button>
          </View>
        }
      >
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to delete the student profile for{'\n'}
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{confirmDeleteStudent?.full_name}</Text>?
        </Text>
        {studentBookingSummary && studentBookingSummary.active_bookings > 0 && (
          <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
            This student has {studentBookingSummary.active_bookings} active
            booking{studentBookingSummary.active_bookings === 1 ? '' : 's'}. Deleting
            will cancel and remove them.
          </Text>
        )}
        {studentBookingSummary && (
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, fontFamily: 'Inter_400Regular' }}>
            Total bookings on record: {studentBookingSummary.total_bookings}
          </Text>
        )}
        <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 15, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
          This removes the student profile and all related bookings. The user account
          remains intact and they can re-register as a student later.
        </Text>
      </ThemedModal>

      {/* View Schedule Modal */}
      <ThemedModal
        visible={scheduleModalVisible}
        onClose={closeScheduleModal}
        title={`${selectedUser?.full_name || ''}'s Schedule`}
        size="lg"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              variant="primary"
              size="sm"
              style={{ backgroundColor: colors.success }}
              onPress={refreshScheduleData}
              disabled={loadingSchedule}
            >
              Refresh
            </Button>
            <Button variant="secondary" onPress={closeScheduleModal}>Close</Button>
          </View>
        }
      >
        <ScrollView>
          {loadingSchedule ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading schedule...</Text>
            </View>
          ) : instructorSchedule ? (
            <>
              {/* Weekly Schedule */}
              <View style={[styles.scheduleSection, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.scheduleSectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Weekly Schedule</Text>
                {instructorSchedule.schedule && instructorSchedule.schedule.length > 0 ? (
                  instructorSchedule.schedule.map((day: any) => (
                    <View key={day.day_of_week} style={[styles.scheduleItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.scheduleDay, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {day.day_of_week.charAt(0).toUpperCase() + day.day_of_week.slice(1)}
                      </Text>
                      <Text style={[styles.scheduleTime, { color: day.is_active ? colors.success : colors.textMuted, fontFamily: 'Inter_400Regular' }]}>
                        {day.is_active ? `${day.start_time} - ${day.end_time}` : 'Unavailable'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No weekly schedule set</Text>
                )}
              </View>

              {/* Time Off */}
              <View style={[styles.scheduleSection, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.scheduleSectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Time Off (All Dates)</Text>
                {instructorSchedule.timeOff && instructorSchedule.timeOff.length > 0 ? (
                  instructorSchedule.timeOff.map((timeOff: any, index: number) => (
                    <View key={index} style={[styles.timeOffItem, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.timeOffDates, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {timeOff.start_date} to {timeOff.end_date}
                      </Text>
                      {timeOff.reason && (
                        <Text style={[styles.timeOffReason, { color: colors.textSecondary }]}>{timeOff.reason}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No time off scheduled</Text>
                )}
              </View>

              {/* Recent Bookings */}
              <View style={[styles.scheduleSection, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.scheduleSectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Recent Bookings</Text>
                {instructorSchedule.bookings && instructorSchedule.bookings.length > 0 ? (
                  instructorSchedule.bookings
                    .sort((a: any, b: any) => {
                      const dateA = a.lesson_date ? new Date(a.lesson_date).getTime() : 0;
                      const dateB = b.lesson_date ? new Date(b.lesson_date).getTime() : 0;
                      return dateA - dateB;
                    })
                    .slice(0, 10)
                    .map((booking: any) => {
                      const lessonDate = booking.lesson_date ? new Date(booking.lesson_date) : null;
                      const dateStr = lessonDate && !isNaN(lessonDate.getTime())
                        ? lessonDate.toLocaleDateString() : 'Invalid Date';
                      const timeStr = lessonDate && !isNaN(lessonDate.getTime())
                        ? lessonDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid Time';

                      const status = booking.status ? booking.status.toUpperCase() : 'UNKNOWN';
                      let statusColor = colors.textMuted;
                      if (status === 'COMPLETED') statusColor = colors.success;
                      else if (status === 'PENDING' || status === 'CONFIRMED') statusColor = colors.warning;
                      else if (status === 'CANCELLED' || status === 'NO_SHOW') statusColor = colors.danger;
                      else if (status === 'IN_PROGRESS') statusColor = colors.primary;

                      return (
                        <View key={booking.id} style={[styles.bookingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                          <View style={styles.bookingHeader}>
                            <Text style={[styles.bookingDate, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                              {dateStr} at {timeStr}
                            </Text>
                            <Text style={[styles.bookingStatus, { backgroundColor: statusColor }]}>{status}</Text>
                          </View>
                          <View style={styles.bookingDetails}>
                            <Text style={[styles.bookingStudent, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                              {booking.student_name || 'Unknown'}
                            </Text>
                            {booking.student_phone && (
                              <Text style={[styles.bookingPhone, { color: colors.textSecondary }]}>{booking.student_phone}</Text>
                            )}
                            {booking.student_id_number && (
                              <Text style={[styles.bookingIdNumber, { color: colors.textSecondary }]}>{booking.student_id_number}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bookings found</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Failed to load schedule</Text>
          )}
        </ScrollView>
      </ThemedModal>

      {/* Edit Booking Fee Modal */}
      <ThemedModal
        visible={editBookingFeeModalVisible}
        onClose={() => setEditBookingFeeModalVisible(false)}
        title="Manage Booking Fee"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" onPress={() => setEditBookingFeeModalVisible(false)}>Cancel</Button>
            <Button variant="primary" onPress={handleSaveBookingFee}>Save Fee</Button>
          </View>
        }
      >
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>Instructor: {selectedUser?.full_name}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20, fontFamily: 'Inter_400Regular' }}>
          This fee is added to the instructor's rate when students book lessons.
        </Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Booking Fee (ZAR) *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={bookingFeeValue}
            onChangeText={setBookingFeeValue}
            placeholder="20.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Students will pay: Instructor Rate + R{bookingFeeValue || '0.00'}
          </Text>
        </View>
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
  filters: {
    padding: 10,
    borderBottomWidth: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {},
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  activeTabText: {
    fontFamily: 'Inter_700Bold',
  },
  filterGroup: {
    width: '100%',
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  searchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
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
  userIdBadge: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  originalAdminActionBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: Platform.OS === 'web' ? 6 : 4,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 6,
    marginRight: Platform.OS === 'web' ? 8 : 6,
    marginBottom: Platform.OS === 'web' ? 0 : 6,
    alignSelf: 'center',
    flexShrink: 1,
    maxWidth: '100%',
  },
  originalAdminActionBadgeText: {
    fontSize: Platform.OS === 'web' ? 11 : 9,
    fontFamily: 'Inter_700Bold',
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
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
  },
  userIdNumber: {
    fontSize: 12,
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
    color: '#FFF',
  },
  userDetails: {
    paddingTop: 6,
    borderTopWidth: 1,
    marginBottom: 6,
  },
  userDetailText: {
    fontSize: 11,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
  scheduleSection: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
  },
  scheduleSectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scheduleDay: {
    fontSize: 16,
  },
  scheduleTime: {
    fontSize: 16,
  },
  timeOffItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timeOffDates: {
    fontSize: 16,
    marginBottom: 4,
  },
  timeOffReason: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
  bookingItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
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
  },
  bookingStatus: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bookingDetails: {
    marginTop: 4,
  },
  bookingStudent: {
    fontSize: 14,
    marginBottom: 4,
  },
  bookingPhone: {
    fontSize: 13,
    marginBottom: 2,
  },
  bookingIdNumber: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
