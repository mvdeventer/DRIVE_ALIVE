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
import { useT } from '../../i18n';
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
  const { colors, isDark, withAlpha } = useTheme();
  const t = useT();
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
      setError(err.response?.data?.detail || t('adminDashboard.msg.statsFailed'));
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
        alert(t('adminDashboard.msg.backupOk'));
      } else {
        // Mobile: Save to device storage
        const fileUri = (FileSystem.documentDirectory || '') + `roadready_backup_${new Date().toISOString().split('T')[0]}.json`;
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(response.data));
        alert(t('adminDashboard.msg.backupTo', { path: fileUri }));
      }
      
      setShowDbModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('adminDashboard.msg.backupFailed'));
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
        alert(t('adminDashboard.msg.backupBeforeResetFailed'));
        // If backup fails, abort reset for safety
        setDbAction(null);
        return;
      }
      
      // STEP 2: Reset the database
      await apiService.resetDatabase();
      
      // STEP 3: Clear authentication tokens and force full logout
      await apiService.logout();
      
      setShowDbModal(false);
      
      alert(t('adminDashboard.msg.resetOk'));
      
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
      setError(err.response?.data?.detail || t('adminDashboard.msg.resetFailed'));
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
      setError(err.response?.data?.detail || t('adminDashboard.msg.configLoadFailed'));
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveBackupConfig = async () => {
    try {
      setConfigLoading(true);
      await apiService.updateBackupConfig(backupConfig);
      alert(t('adminDashboard.msg.configSaved'));
      setShowBackupConfig(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('adminDashboard.msg.configSaveFailed'));
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
              alert(t('adminDashboard.msg.restoreLocalOk'));
              setShowDbModal(false);
              setShowRestoreOptions(false);
              loadStats();
            } catch (err: any) {
              setError(err.response?.data?.detail || t('adminDashboard.msg.restoreFailed'));
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
          alert(t('adminDashboard.msg.restoreLocalOk'));
          setShowDbModal(false);
          setShowRestoreOptions(false);
          loadStats();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('adminDashboard.msg.restoreLocalFailed'));
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
      
      alert(t('adminDashboard.msg.restoreServerOk'));
      setShowDbModal(false);
      setShowRestoreOptions(false);
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('adminDashboard.msg.restoreServerFailed'));
    } finally {
      setDbAction(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('adminDashboard.loading')}</Text>
      </View>
    );
  }

  const actionItems = [
    { key: 'verify', label: t('adminDashboard.action.verify'), screen: 'InstructorVerification', badge: stats?.pending_verification },
    { key: 'users', label: t('adminDashboard.action.users'), screen: 'UserManagement' },
    { key: 'bookings', label: t('adminDashboard.action.bookings'), screen: 'BookingOversight', badge: stats?.pending_bookings },
    { key: 'revenue', label: t('adminDashboard.action.revenue'), screen: 'RevenueAnalytics' },
    { key: 'analytics', label: t('adminDashboard.action.analytics'), screen: 'AdvancedAnalytics' },
    { key: 'earnings', label: t('adminDashboard.action.earnings'), screen: 'InstructorEarningsOverview' },
    { key: 'settings', label: t('common.settings'), screen: 'AdminSettings' },
    { key: 'createAdmin', label: t('adminDashboard.action.createAdmin'), screen: 'CreateAdmin' },
    { key: 'database', label: t('adminDashboard.action.database'), screen: 'DatabaseInterface' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title={t('adminDashboard.title')}
        onBack={() => navigation.goBack()}
        showBackButton={false}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error ? <InlineMessage message={error} type="error" /> : null}

        {stats && (
          <>
            {/* Quick Action Buttons */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminDashboard.quickActions')}</Text>
              <View style={styles.actionGrid}>
                {actionItems.map((item) => (
                  <Pressable
                    key={item.key}
                    // Tinted surface + brand-coloured label. White on solid
                    // `primary` measured 2.48:1 (dark) / 3.9:1 (light) — both
                    // below the WCAG AA 4.5:1 floor for normal text.
                    style={[
                      styles.actionCard,
                      { backgroundColor: withAlpha(colors.primary, isDark ? 0.18 : 0.1) },
                    ]}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Text
                      style={[
                        styles.actionTitle,
                        { color: isDark ? colors.primaryLight : colors.primaryDark },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge && item.badge > 0 ? (
                      <View style={[styles.badge, { backgroundColor: colors.buttonDanger }]}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* User Statistics */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminDashboard.userStats')}</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_users}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.totalUsers')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{stats.active_users}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.active')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_instructors}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.instructors')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_students}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.students')}</Text>
                </View>
              </View>
            </Card>

            {/* Instructor Verification */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminDashboard.verification')}</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.verified_instructors}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.verified')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {stats.pending_verification}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.pending')}</Text>
                </View>
              </View>
            </Card>

            {/* Booking Statistics */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminDashboard.bookingStats')}</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_bookings}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.total')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {stats.pending_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.pending')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.completed_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.completed')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.danger }]}>
                    {stats.cancelled_bookings}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.cancelled')}</Text>
                </View>
              </View>
            </Card>

            {/* Revenue Overview */}
            <Card variant="elevated" style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminDashboard.revenueOverview')}</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    R{stats.total_revenue.toFixed(0)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.totalRevenue')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>R{stats.avg_booking_value.toFixed(0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('adminDashboard.avgBooking')}</Text>
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
        title={t('adminDashboard.db.title')}
        footer={
          <Button variant="secondary" onPress={() => setShowDbModal(false)} disabled={!!dbAction} fullWidth>
            {t('common.cancel')}
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          {t('adminDashboard.db.subtitle')}
        </Text>

        <View style={styles.modalButtons}>
          <Button
            variant="primary"
            onPress={handleBackupDatabase}
            disabled={!!dbAction}
            loading={dbAction === 'backup'}
            fullWidth
          >
            {t('adminDashboard.db.backupToPc')}
          </Button>

          <Button
            variant="primary"
            style={{ backgroundColor: colors.success }}
            onPress={handleRestoreDatabase}
            disabled={!!dbAction}
            loading={dbAction === 'restore'}
            fullWidth
          >
            {t('adminDashboard.db.restoreFromBackup')}
          </Button>

          <Button
            variant="danger"
            onPress={() => {
              if (Platform.OS === 'web') {
                if (confirm(t('adminDashboard.db.confirmReset'))) {
                  handleResetDatabase();
                }
              } else {
                Alert.alert(
                  t('adminDashboard.db.resetDatabase'),
                  t('adminDashboard.db.confirmReset'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('adminDashboard.db.reset'), style: 'destructive', onPress: handleResetDatabase },
                  ]
                );
              }
            }}
            disabled={!!dbAction}
            loading={dbAction === 'reset'}
            fullWidth
          >
            {t('adminDashboard.db.resetDatabase')}
          </Button>
        </View>
      </ThemedModal>

      {/* Restore Options Modal */}
      <ThemedModal
        visible={showRestoreOptions}
        onClose={() => setShowRestoreOptions(false)}
        title={t('adminDashboard.db.restoreTitle')}
        size="lg"
        footer={
          <Button variant="secondary" onPress={() => setShowRestoreOptions(false)} disabled={!!dbAction} fullWidth>
            {t('common.cancel')}
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          {t('adminDashboard.db.chooseSource')}
        </Text>

        {backupsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Server Backups Section */}
            {serverBackups.length > 0 && (
              <>
                <Text style={[styles.restoreSectionTitle, { color: colors.text }]}>{t('adminDashboard.db.serverBackups', { count: serverBackups.length })}</Text>
                <ScrollView style={[styles.backupsList, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} nestedScrollEnabled={true}>
                  {serverBackups.map((backup: any) => (
                    <Pressable
                      key={`${backup.type}-${backup.filename}`}
                      style={[styles.backupItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        const desc = backup.type === 'archived'
                          ? t('adminDashboard.db.archivePrefix', { filename: backup.filename })
                          : `${backup.filename}`;
                        if (confirm(t('adminDashboard.db.confirmRestore', { desc }))) {
                          restoreFromServerBackup(backup);
                        }
                      }}
                      disabled={!!dbAction}
                    >
                      <View style={styles.backupInfo}>
                        <Text style={[styles.backupFilename, { color: colors.primary }]}>
                          {backup.filename}
                        </Text>
                        <Text style={[styles.backupMeta, { color: colors.textTertiary }]}>
                          {t('adminDashboard.db.backupMeta', {
                            size: backup.size_mb,
                            created: new Date(backup.created_at).toLocaleDateString(),
                          })}
                          {backup.type === 'archived' &&
                            t('adminDashboard.db.backupFiles', { count: backup.file_count })}
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
              {t('adminDashboard.db.backupSettings')}
            </Button>

            {/* Local File Option */}
            <Button
              variant="primary"
              onPress={restoreFromLocalFile}
              disabled={!!dbAction}
              loading={dbAction === 'restore'}
              fullWidth
            >
              {t('adminDashboard.db.browseLocal')}
            </Button>
          </>
        )}
      </ThemedModal>

      {/* Backup Configuration Modal */}
      <ThemedModal
        visible={showBackupConfig}
        onClose={() => setShowBackupConfig(false)}
        title={t('adminDashboard.db.configTitle')}
        footer={
          <Button variant="secondary" onPress={() => setShowBackupConfig(false)} disabled={configLoading} fullWidth>
            {t('common.close')}
          </Button>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          {t('adminDashboard.db.configSubtitle')}
        </Text>

        {configLoading || !backupConfig ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>{t('adminDashboard.db.retentionLabel')}</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{t('adminDashboard.db.days', { count: backupConfig.retention_days })}</Text>
              <Text style={[styles.configDescription, { color: colors.textTertiary }]}>
                {t('adminDashboard.db.retentionHint')}
              </Text>
            </View>

            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>{t('adminDashboard.db.archiveLabel')}</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{t('adminDashboard.db.days', { count: backupConfig.auto_archive_after_days })}</Text>
              <Text style={[styles.configDescription, { color: colors.textTertiary }]}>
                {t('adminDashboard.db.archiveHint')}
              </Text>
            </View>

            <View style={[styles.configItem, { backgroundColor: colors.backgroundSecondary, borderLeftColor: colors.primary }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>{t('adminDashboard.db.intervalLabel')}</Text>
              <Text style={[styles.configValue, { color: colors.primary }]}>{t('adminDashboard.db.minutes', { count: backupConfig.backup_interval_minutes })}</Text>
              <Text style={[styles.configDescription, { color: colors.textTertiary }]}>
                {t('adminDashboard.db.intervalHint')}
              </Text>
            </View>

            <Button
              variant="secondary"
              onPress={() => {
                alert(t('adminDashboard.db.editSettingsNote'));
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            >
              {t('adminDashboard.db.editSettings')}
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
  section: {
    marginTop: Platform.OS === 'web' ? 10 : 8,
    marginHorizontal: Platform.OS === 'web' ? 12 : 8,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  actionCard: {
    padding: Platform.OS === 'web' ? 14 : 10,
    borderRadius: 10,
    margin: Platform.OS === 'web' ? 4 : 3,
    flexBasis: '22%',
    minWidth: Platform.OS === 'web' ? 120 : 90,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? 56 : 48,
  },
  actionTitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontFamily: 'Inter_600SemiBold',
    // colour supplied at render time from theme tokens (contrast-safe)
    textAlign: 'center',
    lineHeight: 18,
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
    padding: Platform.OS === 'web' ? 14 : 10,
    margin: Platform.OS === 'web' ? 4 : 3,
    flexBasis: '22%',
    minWidth: Platform.OS === 'web' ? 120 : 90,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
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
