/**
 * Instructor Verification Screen
 * Allow admins to view all instructors filtered by verification status,
 * approve / reject / resend verification links.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import apiService from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstructorRecord {
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
  verification_status: string | null;
  company_id: number | null;
  company_name: string | null;
  is_company_owner: boolean;
  created_at: string;
}

type FilterTab = 'all' | 'pending_admin' | 'pending_company' | 'verified' | 'rejected';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_admin', label: 'Pending Admin' },
  { key: 'pending_company', label: 'Pending Company' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeInfo(status: string | null, colors: any) {
  if (status === 'verified') { return { bg: colors.successBg, text: colors.success, label: '✓ Verified' }; }
  if (status === 'pending_admin') { return { bg: colors.warningBg, text: colors.warning, label: '⏳ Pending Admin' }; }
  if (status === 'pending_company') { return { bg: colors.infoBg, text: colors.info, label: '🏢 Pending Company' }; }
  if (status === 'rejected') { return { bg: colors.dangerBg, text: colors.danger, label: '✗ Rejected' }; }
  return { bg: colors.backgroundSecondary, text: colors.textSecondary, label: '? Unknown' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, colors }: { status: string | null; colors: any }) {
  const b = badgeInfo(status, colors);
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }]}>
      <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}:</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function InstructorCardActions({
  item,
  colors,
  onApprove,
  onReject,
  onResend,
}: {
  item: InstructorRecord;
  colors: any;
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
}) {
  const isPending = item.verification_status === 'pending_admin';
  const isRejected = item.verification_status === 'rejected';

  if (isPending) {
    return (
      <View style={styles.actions}>
        <Button style={{ flex: 1, backgroundColor: colors.success }} onPress={onApprove}>
          ✓ Approve
        </Button>
        <Button variant="danger" style={{ flex: 1 }} onPress={onReject}>
          ✗ Reject
        </Button>
      </View>
    );
  }
  if (isRejected) {
    return (
      <View style={styles.actions}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onResend}>
          🔁 Re-send for review
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.actions}>
      <Button variant="secondary" style={{ flex: 1 }} onPress={onResend}>
        📧 Resend link
      </Button>
    </View>
  );
}

function InstructorCard({
  item,
  colors,
  onApprove,
  onReject,
  onResend,
}: {
  item: InstructorRecord;
  colors: any;
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
}) {
  const vehicleStr = `${item.vehicle_make} ${item.vehicle_model} (${item.vehicle_year})`;

  return (
    <Card variant="elevated" style={{ marginBottom: 10 }}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.email}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.phone}</Text>
          {item.company_name ? (
            <Text style={[styles.companyTag, { color: colors.primary }]}>
              🏢 {item.company_name}{item.is_company_owner ? ' (owner)' : ''}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={item.verification_status} colors={colors} />
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <DetailRow label="License" value={item.license_number} colors={colors} />
        <DetailRow label="Types" value={item.license_types} colors={colors} />
        <DetailRow label="ID No." value={item.id_number} colors={colors} />
        <DetailRow label="Vehicle" value={vehicleStr} colors={colors} />
        <DetailRow label="Reg." value={item.vehicle_registration} colors={colors} />
      </View>

      <InstructorCardActions
        item={item}
        colors={colors}
        onApprove={onApprove}
        onReject={onReject}
        onResend={onResend}
      />
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InstructorVerificationScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [instructors, setInstructors] = useState<InstructorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending_admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    instructor: InstructorRecord;
    action: 'approve' | 'reject' | 'resend';
  } | null>(null);

  const loadInstructors = async (tab: FilterTab = activeTab) => {
    try {
      setError('');
      const filterParam = tab === 'all' ? undefined : tab;
      const data = await apiService.getAllInstructorsAdmin(filterParam);
      setInstructors(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load instructors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInstructors();
    }, [activeTab])
  );

  const switchTab = (tab: FilterTab) => {
    setActiveTab(tab);
    setLoading(true);
    loadInstructors(tab);
  };

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
        await apiService.verifyInstructor(instructor.id, true);
        setSuccess(`Approved: ${instructor.full_name}`);
      } else if (action === 'reject') {
        await apiService.adminRejectInstructor(instructor.id);
        setSuccess(`Rejected: ${instructor.full_name}`);
      } else {
        await apiService.adminResendVerification(instructor.id);
        setSuccess(`Link resent for ${instructor.full_name}`);
      }
      setTimeout(() => setSuccess(''), 5000);
      loadInstructors();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Action failed');
    }
  };

  const renderItem = ({ item }: { item: InstructorRecord }) => (
    <InstructorCard
      item={item}
      colors={colors}
      onApprove={() => setConfirmAction({ instructor: item, action: 'approve' })}
      onReject={() => setConfirmAction({ instructor: item, action: 'reject' })}
      onResend={() => setConfirmAction({ instructor: item, action: 'resend' })}
    />
  );

  const modalTitle = (): string => {
    if (!confirmAction) { return 'Confirm'; }
    if (confirmAction.action === 'approve') { return '✓ Approve Instructor'; }
    if (confirmAction.action === 'reject') { return '✗ Reject Instructor'; }
    return '📧 Resend Verification';
  };

  const modalConfirmLabel = (): string => {
    if (!confirmAction) { return 'Confirm'; }
    if (confirmAction.action === 'approve') { return 'Approve'; }
    if (confirmAction.action === 'reject') { return 'Reject'; }
    return 'Resend';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Instructor Management"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabStrip, { borderBottomColor: colors.divider }]}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => switchTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? <InlineMessage message={error} type="error" /> : null}
      {success ? <InlineMessage message={success} type="success" /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading…</Text>
        </View>
      ) : instructors.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.success }]}>✓ Nothing here</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            No instructors match this filter.
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
        title={modalTitle()}
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
              {modalConfirmLabel()}
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>
          {confirmAction?.action === 'resend'
            ? `Resend verification for ${confirmAction?.instructor.full_name}?`
            : `${confirmAction?.action === 'approve' ? 'Approve' : 'Reject'} ${confirmAction?.instructor.full_name}?`}
        </Text>
      </ThemedModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16 },
  list: { padding: 15 },
  tabStrip: { maxHeight: 44, borderBottomWidth: 1 },
  tabContent: { paddingHorizontal: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  tabLabel: { fontSize: IS_WEB ? 14 : 13, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  name: { fontSize: IS_WEB ? 16 : 15, fontWeight: '700', marginBottom: 3 },
  sub: { fontSize: IS_WEB ? 13 : 12, marginBottom: 2 },
  companyTag: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  dateText: { fontSize: 11 },
  details: { marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailValue: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  emptyText: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalMsg: { fontSize: IS_WEB ? 16 : 15, textAlign: 'center', lineHeight: 22 },
});
