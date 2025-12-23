/**
 * User Management Screen
 * Allow admins to view and manage all users (activate/deactivate/suspend)
 */
import { Picker } from '@react-native-picker/picker';
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    navigation.replace('Login');
  };

  const handleStatusChange = (user: User, newStatus: string) => {
    Alert.alert('Change User Status', `Change ${user.full_name}'s status to ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            setError('');
            await apiService.updateUserStatus(user.id, newStatus);
            setSuccess(`Successfully updated ${user.full_name}'s status`);
            setTimeout(() => setSuccess(''), 5000);
            loadUsers();
          } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update user status');
          }
        },
      },
    ]);
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
          {item.status !== 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={() => handleStatusChange(item, 'active')}
            >
              <Text style={styles.actionButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'inactive' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deactivateButton]}
              onPress={() => handleStatusChange(item, 'inactive')}
            >
              <Text style={styles.actionButtonText}>Deactivate</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'suspended' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => handleStatusChange(item, 'suspended')}
            >
              <Text style={styles.actionButtonText}>Suspend</Text>
            </TouchableOpacity>
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
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activateButton: {
    backgroundColor: '#28A745',
  },
  deactivateButton: {
    backgroundColor: '#6C757D',
  },
  suspendButton: {
    backgroundColor: '#FFC107',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
