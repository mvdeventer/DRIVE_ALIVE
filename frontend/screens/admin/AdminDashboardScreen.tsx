/**
 * Admin Dashboard Home Screen
 * Main dashboard with system statistics and quick actions
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemModule from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// Type-safe FileSystem access
const FileSystem = FileSystemModule as typeof FileSystemModule & {
  documentDirectory: string | null;
};
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors } = useTheme();
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
        link.setAttribute('download', `roadready_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert('✅ Database backup downloaded successfully!');
      } else {
        // Mobile: Save to device storage
        const fileUri = (FileSystem.documentDirectory || '') + `roadready_backup_${new Date().toISOString().split('T')[0]}.json`;
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
          link.setAttribute('download', `roadready_backup_before_reset_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          // Mobile: Save to device storage
          const fileUri = (FileSystem.documentDirectory || '') + `roadready_backup_before_reset_${new Date().toISOString().split('T')[0]}.json`;
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
      await apiService.logout();
      
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
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
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
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  const actionItems = [
    { key: 'verify', label: 'Verify Instructors', screen: 'InstructorVerification', badge: stats?.pending_verification },
    { key: 'users', label: 'User Management', screen: 'UserManagement' },
    { key: 'bookings', label: 'Booking Oversight', screen: 'BookingOversight', badge: stats?.pending_bookings },
    { key: 'revenue', label: 'Revenue Analytics', screen: 'RevenueAnalytics' },
    { key: 'earnings', label: 'Instructor Earnings', screen: 'InstructorEarningsOverview' },
    { key: 'settings', label: 'Settings', screen: 'AdminSettings' },
    { key: 'createAdmin', label: 'Create Admin', screen: 'CreateAdmin' },
    { key: 'database', label: 'Database', screen: 'DatabaseInterface' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Admin Dashboard"
        onBack={() => navigation.goBack()}
        showBackButton={false}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>System Overview & Management</Text>
            </View>
          </View>
        </View>

        {error && <InlineMessage message={error} type="error" />}

        {stats && (
          <>
            {/* Quick Action Buttons */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                {actionItems.map((item) => (
                  <Pressable
                    key={item.key}
                    style={[styles.actionCard, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Text style={styles.actionTitle}>{item.label}</Text>
                    {item.badge && item.badge > 0 ? (
                      <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* User Statistics */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>User Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_users}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Users</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{stats.active_users}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_instructors}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Instructors</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_students}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students</Text>
                </View>
              </View>
            </Card>

            {/* Instructor Verification */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructor Verification</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.verified_instructors}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verified</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {stats.pending_verification}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                </View>
              </View>
            </Card>

            {/* Booking Statistics */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_bookings}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {stats.pending_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.completed_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.danger }]}>
                    {stats.cancelled_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cancelled</Text>
                </View>
              </View>
            </Card>

            {/* Revenue Overview */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Overview</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    R{stats.total_revenue.toFixed(0)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>R{stats.avg_booking_value.toFixed(0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Booking</Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Database Management Modal */}
      <ThemedModal
        visible={showDbModal}
        onClose={() => setShowDbModal(false)}
        title="Database Management"
        footer={
          <Button variant="secondary" onPress={() => setShowDbModal(false)} disabled={!!dbAction} fullWidth>
            Cancel
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          Backup, restore, or reset your database
        </Text>

        <View style={styles.modalButtons}>
          <Button
            variant="primary"
            onPress={handleBackupDatabase}
            disabled={!!dbAction}
            loading={dbAction === 'backup'}
            fullWidth
          >
            Backup to PC
          </Button>

          <Button
            variant="primary"
            style={{ backgroundColor: colors.success }}
            onPress={handleRestoreDatabase}
            disabled={!!dbAction}
            loading={dbAction === 'restore'}
            fullWidth
          >
            Restore from Backup
          </Button>

          <Button
            variant="danger"
            onPress={() => {
              if (Platform.OS === 'web') {
                if (confirm('This will DELETE ALL DATA! Are you absolutely sure?')) {
                  handleResetDatabase();
                }
              } else {
                Alert.alert(
                  'Reset Database',
                  'This will DELETE ALL DATA! Are you absolutely sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: handleResetDatabase },
                  ]
                );
              }
            }}
            disabled={!!dbAction}
            loading={dbAction === 'reset'}
            fullWidth
          >
            Reset Database
          </Button>
        </View>
      </ThemedModal>

      {/* Restore Options Modal */}
      <ThemedModal
        visible={showRestoreOptions}
        onClose={() => setShowRestoreOptions(false)}
        title="Restore Database"
        size="lg"
        footer={
          <Button variant="secondary" onPress={() => setShowRestoreOptions(false)} disabled={!!dbAction} fullWidth>
            Cancel
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          Choose where to restore from
        </Text>

        {backupsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Server Backups Section */}
            {serverBackups.length > 0 && (
              <>
                <Text style={[styles.restoreSectionTitle, { color: colors.text }]}>Server Backups ({serverBackups.length})</Text>
                <ScrollView style={[styles.backupsList, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} nestedScrollEnabled={true}>
                  {serverBackups.map((backup: any) => (
                    <Pressable
                      key={`${backup.type}-${backup.filename}`}
                      style={[styles.backupItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        const desc = backup.type === 'archived' ? `Archive: ${backup.filename}` : `${backup.filename}`;
                        if (confirm(`Restore from ${desc}?\n\nThis will replace all current data!`)) {
                          restoreFromServerBackup(backup);
                        }
                      }}
                      disabled={!!dbAction}
                    >
                      <View style={styles.backupInfo}>
                        <Text style={[styles.backupFilename, { color: colors.primary }]}>
                          {backup.filename}
                        </Text>
                        <Text style={[styles.backupMeta, { color: colors.textMuted }]}>
                          Size: {backup.size_mb}MB {'\u2022'} Created: {new Date(backup.created_at).toLocaleDateString()}
                          {backup.type === 'archived' && ` \u2022 Files: ${backup.file_count}`}
                        </Text>
                      </View>
                      {dbAction === 'restore' && (
                        <ActivityIndicator color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            {/* Backup Settings Button */}
            <Button
              variant="secondary"
              onPress={handleLoadBackupConfig}
              disabled={!!dbAction}
              fullWidth
              style={{ marginBottom: 12 }}
            >
              Backup Settings
            </Button>

            {/* Local File Option */}
            <Button
              variant="primary"
              onPress={restoreFromLocalFile}
              disabled={!!dbAction}
              loading={dbAction === 'restore'}
              fullWidth
            >
              Browse Local File
            </Button>
          </>
        )}
      </ThemedModal>

      {/* Backup Configuration Modal */}
      <ThemedModal
        visible={showBackupConfig}
        onClose={() => setShowBackupConfig(false)}
        title="Backup Configuration"
        footer={
          <Button variant="secondary" onPress={() => setShowBackupConfig(false)} disabled={configLoading} fullWidth>
            Close
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          Manage automatic backup settings
        </Text>

        {configLoading || !backupConfig ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Retention Period (Days):</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{backupConfig.retention_days} days</Text>
              <Text style={[styles.configDescription, { color: colors.textMuted }]}>
                Backups older than this will be automatically deleted
              </Text>
            </View>

            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Auto-Archive After (Days):</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{backupConfig.auto_archive_after_days} days</Text>
              <Text style={[styles.configDescription, { color: colors.textMuted }]}>
                Backups older than this will be compressed into ZIP files
              </Text>
            </View>

            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Backup Interval (Minutes):</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{backupConfig.backup_interval_minutes} minutes</Text>
              <Text style={[styles.configDescription, { color: colors.textMuted }]}>
                Automatic backups are created at this interval
              </Text>
            </View>

            <Button
              variant="secondary"
              onPress={() => {
                alert('Note: Configuration editing requires a dedicated settings screen.\nContact admin to modify these settings via backend API.');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            >
              Edit Settings (Admin API)
            </Button>
          </>
        )}
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  header: {
    padding: Platform.OS === 'web' ? 20 : 15,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  section: {
    marginTop: Platform.OS === 'web' ? 15 : 10,
    marginHorizontal: Platform.OS === 'web' ? 15 : 8,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontFamily: 'Inter_700Bold',
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
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? 80 : 60,
  },
  actionTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
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
    fontFamily: 'Inter_700Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 12,
    margin: Platform.OS === 'web' ? 6 : 4,
    flexBasis: '30%',
    minWidth: Platform.OS === 'web' ? 140 : 100,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    lineHeight: 38,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  modalButtons: {
    gap: 12,
  },
  restoreSectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    marginTop: Platform.OS === 'web' ? 15 : 12,
  },
  backupsList: {
    maxHeight: 250,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 15 : 12,
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 1,
  },
  backupInfo: {
    flex: 1,
  },
  backupFilename: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  backupMeta: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: 1,
    marginVertical: Platform.OS === 'web' ? 15 : 12,
  },
  configItem: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 15 : 12,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    borderLeftWidth: 4,
  },
  configLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  configValue: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
});
