/**
 * Admin Dashboard Home Screen
 * Main dashboard with system statistics and quick actions
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import apiService from '../../services/api';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_instructors: number;
  total_students: number;
  verified_instructors: number;
  pending_verification: number;
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
}

export default function AdminDashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showRestoreOptions, setShowRestoreOptions] = useState(false);
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [showBackupConfig, setShowBackupConfig] = useState(false);
  const [backupConfig, setBackupConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbAction, setDbAction] = useState<'backup' | 'reset' | 'restore' | null>(null);

  const loadStats = async () => {
    try {
      setError('');
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleBackupDatabase = async () => {
    try {
      setDbAction('backup');
      setError('');
      
      const response = await apiService.backupDatabase();
      
      if (Platform.OS === 'web') {
        // Web: Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `drive_alive_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert('✅ Database backup downloaded successfully!');
      } else {
        // Mobile: Save to device storage
        const fileUri = FileSystem.documentDirectory + `drive_alive_backup_${new Date().toISOString().split('T')[0]}.json`;
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(response.data));
        alert(`✅ Database backed up to: ${fileUri}`);
      }
      
      setShowDbModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Backup failed');
    } finally {
      setDbAction(null);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setDbAction('reset');
      setError('');
      
      // STEP 1: Backup and download database BEFORE resetting
      try {
        const backupResponse = await apiService.backupDatabase();
        
        if (Platform.OS === 'web') {
          // Web: Create download link
          const url = window.URL.createObjectURL(new Blob([backupResponse.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `drive_alive_backup_before_reset_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          // Mobile: Save to device storage
          const fileUri = FileSystem.documentDirectory + `drive_alive_backup_before_reset_${new Date().toISOString().split('T')[0]}.json`;
          await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupResponse.data));
        }
      } catch (backupErr) {
        console.error('Backup before reset failed:', backupErr);
        alert('⚠️ Warning: Backup failed. Do you still want to reset the database? This action cannot be undone.');
        // If backup fails, abort reset for safety
        setDbAction(null);
        return;
      }
      
      // STEP 2: Reset the database
      await apiService.resetDatabase();
      
      // STEP 3: Clear authentication tokens and force full logout
      const storage = Platform.OS === 'web' ? localStorage : SecureStore;
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('access_token'); // Changed from storage
        sessionStorage.removeItem('user_role');
      } else {
        await storage.deleteItemAsync('access_token');
        await storage.deleteItemAsync('user_role');
      }
      
      setShowDbModal(false);
      
      alert('✅ Database reset successfully! Backup downloaded to your computer. Please create a new admin account.');
      
      // STEP 4: Force complete logout (reload page on web, reset navigation on mobile)
      if (Platform.OS === 'web') {
        // Force full page reload to clear all app state
        window.location.href = '/';
      } else {
        // Navigate to Setup screen and reset navigation stack
        navigation.reset({
          index: 0,
          routes: [{ name: 'Setup' }],
        });
      }
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed');
    } finally {
      setDbAction(null);
    }
  };

  const handleRestoreDatabase = async () => {
    // Open restore options modal and fetch both regular and archived backups
    setShowRestoreOptions(true);
    setBackupsLoading(true);
    try {
      const data = await apiService.getAllBackups();
      setServerBackups(data.regular || []);
      // Also include archived backups in the list
      const archived = data.archived || [];
      if (archived.length > 0) {
        setServerBackups([...data.regular, ...archived]);
      }
    } catch (err: any) {
      console.error('Failed to load server backups:', err);
      setServerBackups([]);
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleLoadBackupConfig = async () => {
    setShowBackupConfig(true);
    setConfigLoading(true);
    try {
      const config = await apiService.getBackupConfig();
      setBackupConfig(config);
    } catch (err: any) {
      console.error('Failed to load backup config:', err);
      setError(err.response?.data?.detail || 'Failed to load backup settings');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveBackupConfig = async () => {
    try {
      setConfigLoading(true);
      await apiService.updateBackupConfig(backupConfig);
      alert('✅ Backup configuration updated successfully!');
      setShowBackupConfig(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save backup settings');
    } finally {
      setConfigLoading(false);
    }
  };

  const restoreFromLocalFile = async () => {
    try {
      setDbAction('restore');
      setError('');
      
      if (Platform.OS === 'web') {
        // Web: File input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            try {
              await apiService.restoreDatabase(file);
              alert('✅ Database restored successfully from local file!');
              setShowDbModal(false);
              setShowRestoreOptions(false);
              loadStats();
            } catch (err: any) {
              setError(err.response?.data?.detail || 'Restore failed');
            } finally {
              setDbAction(null);
            }
          }
        };
        input.click();
      } else {
        // Mobile: Document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
        });
        
        if (result.type === 'success') {
          const fileContent = await FileSystem.readAsStringAsync(result.uri);
          const blob = new Blob([fileContent], { type: 'application/json' });
          await apiService.restoreDatabase(blob);
          alert('✅ Database restored successfully from local file!');
          setShowDbModal(false);
          setShowRestoreOptions(false);
          loadStats();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Restore from local file failed');
    } finally {
      setDbAction(null);
    }
  };

  const restoreFromServerBackup = async (backup: any) => {
    try {
      setDbAction('restore');
      setError('');
      
      let backupData;
      
      if (backup.type === 'archived') {
        // Extract from archive first
        const extracted = await apiService.extractFromArchive(backup.filename, backup.backup_filename);
        backupData = extracted.data;
      } else {
        // Download regular backup
        const response = await apiService.downloadBackupFromServer(backup.filename);
        backupData = response;
      }
      
      await apiService.restoreDatabase(backupData);
      
      alert('✅ Database restored successfully from server backup!');
      setShowDbModal(false);
      setShowRestoreOptions(false);
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Restore from server backup failed');
    } finally {
      setDbAction(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Admin Dashboard"
        onBack={() => navigation.goBack()}
        showBackButton={false}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>System Overview & Management</Text>
            </View>
            <TouchableOpacity
              style={styles.dbButton}
              onPress={() => setShowDbModal(true)}
            >
              <Text style={styles.dbButtonText}>💾 Database</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <InlineMessage message={error} type="error" />}

        {stats && (
          <>
            {/* Quick Action Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.actionCard, styles.actionPrimary]}
                  onPress={() => navigation.navigate('InstructorVerification')}
                >
                  <Text style={styles.actionIcon}>✅</Text>
                  <Text style={styles.actionTitle}>Verify Instructors</Text>
                  {stats.pending_verification > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{stats.pending_verification}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionSuccess]}
                  onPress={() => navigation.navigate('UserManagement')}
                >
                  <Text style={styles.actionIcon}>👥</Text>
                  <Text style={styles.actionTitle}>User Management</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionInfo]}
                  onPress={() => navigation.navigate('BookingOversight')}
                >
                  <Text style={styles.actionIcon}>📅</Text>
                  <Text style={styles.actionTitle}>Booking Oversight</Text>
                  {stats.pending_bookings > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{stats.pending_bookings}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionWarning]}
                  onPress={() => navigation.navigate('RevenueAnalytics')}
                >
                  <Text style={styles.actionIcon}>💰</Text>
                  <Text style={styles.actionTitle}>Revenue Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionSecondary]}
                  onPress={() => navigation.navigate('InstructorEarningsOverview')}
                >
                  <Text style={styles.actionIcon}>💵</Text>
                  <Text style={styles.actionTitle}>Instructor Earnings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionSettings]}
                  onPress={() => navigation.navigate('AdminSettings')}
                >
                  <Text style={styles.actionIcon}>⚙️</Text>
                  <Text style={styles.actionTitle}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionCreateAdmin]}
                  onPress={() => navigation.navigate('CreateAdmin')}
                >
                  <Text style={styles.actionIcon}>👤</Text>
                  <Text style={styles.actionTitle}>Create Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* User Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total_users}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statSuccess]}>{stats.active_users}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total_instructors}</Text>
                  <Text style={styles.statLabel}>Instructors</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total_students}</Text>
                  <Text style={styles.statLabel}>Students</Text>
                </View>
              </View>
            </View>

            {/* Instructor Verification */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructor Verification</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statSuccess]}>
                    {stats.verified_instructors}
                  </Text>
                  <Text style={styles.statLabel}>Verified</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statWarning]}>
                    {stats.pending_verification}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </View>

            {/* Booking Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total_bookings}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statWarning]}>
                    {stats.pending_bookings}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statSuccess]}>
                    {stats.completed_bookings}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statDanger]}>
                    {stats.cancelled_bookings}
                  </Text>
                  <Text style={styles.statLabel}>Cancelled</Text>
                </View>
              </View>
            </View>

            {/* Revenue Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.statSuccess]}>
                    R{stats.total_revenue.toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>R{stats.avg_booking_value.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Avg Booking</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Database Management Modal */}
      <Modal
        visible={showDbModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDbModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💾 Database Management</Text>
            <Text style={styles.modalSubtitle}>
              Backup, restore, or reset your database
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleBackupDatabase}
                disabled={!!dbAction}
              >
                {dbAction === 'backup' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>📥 Backup to PC</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSuccess]}
                onPress={handleRestoreDatabase}
                disabled={!!dbAction}
              >
                {dbAction === 'restore' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>📤 Restore from Backup</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (confirm('⚠️ This will DELETE ALL DATA! Are you absolutely sure?')) {
                      handleResetDatabase();
                    }
                  } else {
                    Alert.alert(
                      'Reset Database',
                      '⚠️ This will DELETE ALL DATA! Are you absolutely sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reset', style: 'destructive', onPress: handleResetDatabase },
                      ]
                    );
                  }
                }}
                disabled={!!dbAction}
              >
                {dbAction === 'reset' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>🗑️ Reset Database</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowDbModal(false)}
                disabled={!!dbAction}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restore Options Modal */}
      <Modal
        visible={showRestoreOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestoreOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📥 Restore Database</Text>
            <Text style={styles.modalSubtitle}>
              Choose where to restore from
            </Text>

            {backupsLoading ? (
              <ActivityIndicator size="large" color="#0066CC" style={{ marginVertical: 20 }} />
            ) : (
              <>
                {/* Server Backups Section */}
                {serverBackups.length > 0 && (
                  <>
                    <Text style={styles.restoreSectionTitle}>📁 Server Backups ({serverBackups.length})</Text>
                    <ScrollView style={styles.backupsList} nestedScrollEnabled={true}>
                      {serverBackups.map((backup: any) => (
                        <TouchableOpacity
                          key={`${backup.type}-${backup.filename}`}
                          style={styles.backupItem}
                          onPress={() => {
                            const desc = backup.type === 'archived' ? `📦 Archive: ${backup.filename}` : `${backup.filename}`;
                            if (confirm(`🔄 Restore from ${desc}?\n\n⚠️ This will replace all current data!`)) {
                              restoreFromServerBackup(backup);
                            }
                          }}
                          disabled={!!dbAction}
                        >
                          <View style={styles.backupInfo}>
                            <Text style={styles.backupFilename}>
                              {backup.type === 'archived' ? '📦' : '📄'} {backup.filename}
                            </Text>
                            <Text style={styles.backupMeta}>
                              Size: {backup.size_mb}MB • Created: {new Date(backup.created_at).toLocaleDateString()}
                              {backup.type === 'archived' && ` • Files: ${backup.file_count}`}
                            </Text>
                          </View>
                          {dbAction === 'restore' && (
                            <ActivityIndicator color="#0066CC" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={styles.divider} />
                  </>
                )}

                {/* Backup Settings Button */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonInfo]}
                  onPress={handleLoadBackupConfig}
                  disabled={!!dbAction}
                >
                  <Text style={styles.modalButtonText}>⚙️ Backup Settings</Text>
                </TouchableOpacity>

                {/* Local File Option */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={restoreFromLocalFile}
                  disabled={!!dbAction}
                >
                  {dbAction === 'restore' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>📂 Browse Local File</Text>
                  )}
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowRestoreOptions(false)}
                  disabled={!!dbAction}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Backup Configuration Modal */}
      <Modal
        visible={showBackupConfig}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackupConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Backup Configuration</Text>
            <Text style={styles.modalSubtitle}>
              Manage automatic backup settings
            </Text>

            {configLoading || !backupConfig ? (
              <ActivityIndicator size="large" color="#0066CC" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Retention Period (Days):</Text>
                  <Text style={styles.configValue}>{backupConfig.retention_days} days</Text>
                  <Text style={styles.configDescription}>
                    Backups older than this will be automatically deleted
                  </Text>
                </View>

                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Auto-Archive After (Days):</Text>
                  <Text style={styles.configValue}>{backupConfig.auto_archive_after_days} days</Text>
                  <Text style={styles.configDescription}>
                    Backups older than this will be compressed into ZIP files
                  </Text>
                </View>

                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Backup Interval (Minutes):</Text>
                  <Text style={styles.configValue}>{backupConfig.backup_interval_minutes} minutes</Text>
                  <Text style={styles.configDescription}>
                    Automatic backups are created at this interval
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonInfo]}
                  onPress={() => {
                    // In a full implementation, would show input fields to edit these values
                    alert('Note: Configuration editing requires a dedicated settings screen.\nContact admin to modify these settings via backend API.');
                  }}
                >
                  <Text style={styles.modalButtonText}>📝 Edit Settings (Admin API)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowBackupConfig(false)}
                  disabled={configLoading}
                >
                  <Text style={styles.modalButtonTextSecondary}>Close</Text>
                </TouchableOpacity>
              </>
            )}
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
  scrollView: {
    flex: 1,
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
    padding: Platform.OS === 'web' ? 20 : 15,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dbButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  dbButtonText: {
    color: '#FFF',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 13,
    color: '#E0E0E0',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#FFF',
    padding: Platform.OS === 'web' ? 15 : 10,
    marginTop: Platform.OS === 'web' ? 15 : 10,
    marginHorizontal: Platform.OS === 'web' ? 15 : 8,
    borderRadius: 10,
    boxShadow: '0px 2px 4px #0000001A',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Platform.OS === 'web' ? 15 : 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  actionCard: {
    padding: Platform.OS === 'web' ? 20 : 12,
    borderRadius: 10,
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: '30%',
    minWidth: Platform.OS === 'web' ? 140 : 100,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
    boxShadow: '0px 1px 3px #00000015',
    elevation: 2,
  },
  actionPrimary: {
    backgroundColor: '#0066CC',
  },
  actionSecondary: {
    backgroundColor: '#6C757D',
  },
  actionSuccess: {
    backgroundColor: '#28A745',
  },
  actionWarning: {
    backgroundColor: '#FFC107',
  },
  actionInfo: {
    backgroundColor: '#17A2B8',
  },
  actionSettings: {
    backgroundColor: '#6F42C1',
  },
  actionCreateAdmin: {
    backgroundColor: '#20C997',
  },
  actionIcon: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    lineHeight: 32,
  },
  actionBadge: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    lineHeight: 32,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#E0E0E0',
    lineHeight: 18,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#DC3545',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 12,
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: '30%',
    minWidth: Platform.OS === 'web' ? 140 : 100,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
    boxShadow: '0px 1px 3px #00000015',
    elevation: 2,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 38,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  statSuccess: {
    color: '#28A745',
  },
  statWarning: {
    color: '#FFC107',
  },
  statDanger: {
    color: '#DC3545',
  },
  revenueCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  revenueLabel: {
    fontSize: 16,
    color: '#666',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modalButtonPrimary: {
    backgroundColor: '#0066CC',
  },
  modalButtonSuccess: {
    backgroundColor: '#28a745',
  },
  modalButtonDanger: {
    backgroundColor: '#dc3545',
  },
  modalButtonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  modalButtonInfo: {
    backgroundColor: '#17A2B8',
  },
  restoreSectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    marginTop: Platform.OS === 'web' ? 15 : 12,
  },
  backupsList: {
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 15 : 12,
    backgroundColor: '#F9F9F9',
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backupInfo: {
    flex: 1,
  },
  backupFilename: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
  },
  backupMeta: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: Platform.OS === 'web' ? 15 : 12,
  },
  configItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 15 : 12,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    borderLeftWidth: 4,
    borderLeftColor: '#17A2B8',
  },
  configLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  configValue: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
    color: '#17A2B8',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#999',
    fontStyle: 'italic',
  },
});
