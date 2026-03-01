/**
 * MyInstructorsScreen
 * Company-owner view: shows all instructors linked to the owner's company.
 * Allows approving or rejecting instructors currently in 'pending_company' status.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import apiService from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInstructor {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_types: string;
  verification_status: string | null;
  is_verified: boolean;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: string | null): string {
  if (status === 'verified') { return '✓ Verified'; }
  if (status === 'pending_company') { return '⏳ Awaiting Your Approval'; }
  if (status === 'pending_admin') { return '🔍 Pending Admin'; }
  if (status === 'rejected') { return '✗ Rejected'; }
  return '? Unknown';
}

function statusColor(status: string | null, colors: any): string {
  if (status === 'verified') { return colors.success; }
  if (status === 'pending_company') { return colors.warning; }
  if (status === 'rejected') { return colors.danger; }
  return colors.textSecondary;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InstructorRow({
  item,
  colors,
  onApprove,
  onReject,
}: {
  item: CompanyInstructor;
  colors: any;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPendingCompany = item.verification_status === 'pending_company';

  return (
    <Card variant="elevated" style={{ marginBottom: 10 }}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.email}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.phone}</Text>
          <Text style={[styles.licenses, { color: colors.textTertiary }]}>
            Licenses: {item.license_types}
          </Text>
        </View>
        <Text
          style={[
            styles.statusLabel,
            { color: statusColor(item.verification_status, colors) },
          ]}
        >
          {statusLabel(item.verification_status)}
        </Text>
      </View>

      {isPendingCompany && (
        <View style={styles.rowActions}>
          <Button style={{ flex: 1, backgroundColor: colors.success }} onPress={onApprove}>
            ✓ Approve
          </Button>
          <Button variant="danger" style={{ flex: 1 }} onPress={onReject}>
            ✗ Reject
          </Button>
        </View>
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyInstructorsScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [instructors, setInstructors] = useState<CompanyInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    instructor: CompanyInstructor;
    action: 'approve' | 'reject';
  } | null>(null);

  const loadInstructors = async () => {
    try {
      setError('');
      const data = await apiService.getMyCompanyInstructors();
      setInstructors(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load company instructors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadInstructors(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadInstructors();
  };

  const executeAction = async () => {
    if (!confirmAction) { return; }
    const { instructor, action } = confirmAction;
    setError('');
    setConfirmAction(null);
    try {
      if (action === 'approve') {
        await apiService.companyVerifyInstructor(instructor.id);
        setSuccess(`Approved: ${instructor.full_name}`);
      } else {
        await apiService.companyRejectInstructor(instructor.id);
        setSuccess(`Rejected: ${instructor.full_name}`);
      }
      setTimeout(() => setSuccess(''), 5000);
      loadInstructors();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Action failed');
    }
  };

  const renderItem = ({ item }: { item: CompanyInstructor }) => (
    <InstructorRow
      item={item}
      colors={colors}
      onApprove={() => setConfirmAction({ instructor: item, action: 'approve' })}
      onReject={() => setConfirmAction({ instructor: item, action: 'reject' })}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="My Company Instructors"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {error ? <InlineMessage message={error} type="error" /> : null}
      {success ? <InlineMessage message={success} type="success" /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading instructors…
          </Text>
        </View>
      ) : instructors.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>🏢</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No instructors yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            When instructors join your company, they will appear here once approved by admin.
          </Text>
        </View>
      ) : (
        <FlatList
          data={instructors}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Confirmation Modal */}
      <ThemedModal
        visible={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.action === 'approve' ? '✓ Approve Instructor' : '✗ Reject Instructor'}
        size="sm"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.action === 'reject' ? 'danger' : 'primary'}
              style={{ flex: 1 }}
              onPress={executeAction}
            >
              {confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>
          {confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}{' '}
          {confirmAction?.instructor.full_name} as part of your company?
        </Text>
      </ThemedModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15 },
  list: { padding: 15 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  name: { fontSize: IS_WEB ? 16 : 15, fontWeight: '700', marginBottom: 3 },
  sub: { fontSize: 13, marginBottom: 2 },
  licenses: { fontSize: 12, marginTop: 4 },
  statusLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right', maxWidth: 130 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalMsg: { fontSize: IS_WEB ? 16 : 15, textAlign: 'center', lineHeight: 22 },
});
