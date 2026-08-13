/**
 * Instructor Verification Screen
 * Allow admins to view all instructors filtered by verification status,
 * search them by name / ID / licence, and approve / reject / resend
 * verification links.
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useT } from '../../i18n';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useTheme } from '../../theme/ThemeContext';
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

const TAB_KEYS: FilterTab[] = [
  'all',
  'pending_admin',
  'pending_company',
  'verified',
  'rejected',
];

type Translate = (key: string, vars?: Record<string, any>) => string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeInfo(status: string | null, colors: any, t: Translate) {
  if (status === 'verified') { return { bg: colors.successBg, text: colors.success, label: t('instructorVerify.badge.verified') }; }
  if (status === 'pending_admin') { return { bg: colors.warningBg, text: colors.warning, label: t('instructorVerify.badge.pendingAdmin') }; }
  if (status === 'pending_company') { return { bg: colors.infoBg, text: colors.info, label: t('instructorVerify.badge.pendingCompany') }; }
  if (status === 'rejected') { return { bg: colors.dangerBg, text: colors.danger, label: t('instructorVerify.badge.rejected') }; }
  return { bg: colors.backgroundSecondary, text: colors.textSecondary, label: t('instructorVerify.badge.unknown') };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, colors, t }: { status: string | null; colors: any; t: Translate }) {
  const b = badgeInfo(status, colors, t);
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }]}>
      <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function InstructorCardActions({
  item,
  colors,
  t,
  onApprove,
  onReject,
  onResend,
}: {
  item: InstructorRecord;
  colors: any;
  t: Translate;
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
}) {
  const status = item.verification_status;

  if (status === 'pending_admin') {
    return (
      <View style={styles.actions}>
        <Button style={{ flex: 1, backgroundColor: colors.success }} onPress={onApprove}>
          {t('instructorVerify.action.approve')}
        </Button>
        <Button variant="danger" style={{ flex: 1 }} onPress={onReject}>
          {t('instructorVerify.action.reject')}
        </Button>
      </View>
    );
  }
  if (status === 'rejected') {
    return (
      <View style={styles.actions}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onResend}>
          {t('instructorVerify.action.resubmit')}
        </Button>
      </View>
    );
  }
  if (status === 'pending_company') {
    // The two gates clear in either order. `is_verified` is what records that
    // the admin gate is already shut, so while it is still open the admin can
    // act now rather than waiting on the school — the status only names the
    // gate that is still outstanding.
    return (
      <View style={{ gap: 8 }}>
        {!item.is_verified && (
          <View style={styles.actions}>
            <Button style={{ flex: 1, backgroundColor: colors.success }} onPress={onApprove}>
              {t('instructorVerify.action.approve')}
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={onReject}>
              {t('instructorVerify.action.reject')}
            </Button>
          </View>
        )}
        {/* The outstanding approval belongs to the school owner, so say so — the
            generic "Resend link" read as "resend the admin link" and the backend
            obliged by dragging the instructor back into the admin queue. */}
        <View style={styles.actions}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={onResend}>
            {t('instructorVerify.action.resendCompany')}
          </Button>
        </View>
      </View>
    );
  }
  // Verified (or a legacy row with no status): there is no outstanding link,
  // and offering to "resend" one previously un-verified a working instructor.
  return (
    <Text style={[styles.noAction, { color: colors.textTertiary }]}>
      {status === 'verified'
        ? t('instructorVerify.action.noneVerified')
        : t('instructorVerify.action.noneUnknown')}
    </Text>
  );
}

function InstructorCard({
  item,
  colors,
  t,
  widthStyle,
  onApprove,
  onReject,
  onResend,
}: {
  item: InstructorRecord;
  colors: any;
  t: Translate;
  widthStyle: any;
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
}) {
  const vehicleStr = `${item.vehicle_make} ${item.vehicle_model} (${item.vehicle_year})`;

  return (
    <Card variant="elevated" style={[styles.card, widthStyle]}>
      {/* Both searchable ids live on the chip, so an admin can read off the
          number they are about to type into the search box. */}
      <View style={[styles.idBadge, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.idBadgeText, { color: colors.primary }]}>
          {t('instructorVerify.card.instructorId', { id: item.id })}
        </Text>
        <Text style={[styles.idBadgeText, { color: colors.primary }]}>
          {t('instructorVerify.card.userId', { id: item.user_id })}
        </Text>
      </View>

      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.email}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.phone}</Text>
          {item.id_number ? (
            <Text style={[styles.saId, { color: colors.primary }]}>
              {t('instructorVerify.card.saId', { id: item.id_number })}
            </Text>
          ) : null}
          {item.company_name ? (
            <Text style={[styles.companyTag, { color: colors.primary }]}>
              🏢 {item.company_name}
              {item.is_company_owner ? t('instructorVerify.card.ownerSuffix') : ''}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={item.verification_status} colors={colors} t={t} />
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <DetailRow label={t('instructorVerify.label.license')} value={item.license_number} colors={colors} />
        <DetailRow label={t('instructorVerify.label.types')} value={item.license_types} colors={colors} />
        <DetailRow label={t('instructorVerify.label.vehicle')} value={vehicleStr} colors={colors} />
        <DetailRow label={t('instructorVerify.label.registration')} value={item.vehicle_registration} colors={colors} />
      </View>

      <InstructorCardActions
        item={item}
        colors={colors}
        t={t}
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
  const t = useT() as Translate;
  // Grid density is viewport-derived, so it has to be read during render —
  // StyleSheet.create runs once at import and would freeze the load width.
  const { select } = useBreakpoint();
  const columns = select({ xs: 1, md: 2, lg: 3 }) ?? 1;
  const cardWidthStyle = {
    flexBasis: select({ xs: '100%', md: '48%', lg: '30%' }),
    // Without a cap a lone search result grows to fill the whole row; the cap
    // keeps a single match the same width as a card in a full row.
    maxWidth: select({ xs: '100%', md: '48%', lg: '32%' }),
    minWidth: columns === 1 ? '100%' : Platform.OS === 'web' ? 280 : 200,
  } as const;

  const [instructors, setInstructors] = useState<InstructorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending_admin');
  const [counts, setCounts] = useState<Record<FilterTab, number> | null>(null);
  // Only the first load may move the admin off the default tab; after that the
  // tab is their choice and must not be yanked away by a refresh.
  const pickedInitialTab = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    instructor: InstructorRecord;
    action: 'approve' | 'reject' | 'resend';
  } | null>(null);

  /**
   * Search runs server-side. `/admin/instructors` caps at 100 rows, so a local
   * filter over the loaded page would quietly miss every instructor past the
   * cap — the same trap that made booking search wrong.
   */
  const loadInstructors = async (tab: FilterTab = activeTab, search = searchQuery) => {
    try {
      setError('');
      const filterParam = tab === 'all' ? undefined : tab;
      const data = await apiService.getAllInstructorsAdmin(filterParam, 0, 100, search);
      setInstructors(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('instructorVerify.msg.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Counts for every tab, not just the one on screen. Without them the screen
  // cannot tell an empty queue from work waiting behind another filter, which
  // is what a dashboard badge reading "1" above an empty list looks like.
  const loadCounts = async () => {
    try {
      const c = await apiService.getInstructorVerificationCounts();
      setCounts({
        all: c.all,
        pending_admin: c.pending_admin,
        pending_company: c.pending_company,
        verified: c.verified,
        rejected: c.rejected,
      });
      return c;
    } catch {
      // A missing count must not blank the list; the tabs just lose their numbers.
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInstructors();
      loadCounts().then(c => {
        // Land where the work is. Arriving on an empty Pending Admin queue while
        // someone waits in Pending Company is the whole complaint.
        if (!c || pickedInitialTab.current) { return; }
        pickedInitialTab.current = true;
        if (c.pending_admin === 0 && c.pending_company > 0) {
          setActiveTab('pending_company');
          setLoading(true);
          loadInstructors('pending_company', searchQuery);
        }
      });
    }, [activeTab])
  );

  // Debounced so typing is not one request per keystroke.
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) {
      firstSearchRun.current = false;
      return;
    }
    if (searchDebounce.current) { clearTimeout(searchDebounce.current); }
    searchDebounce.current = setTimeout(() => {
      setLoading(true);
      loadInstructors(activeTab, searchQuery);
    }, 350);
    return () => {
      if (searchDebounce.current) { clearTimeout(searchDebounce.current); }
    };
  }, [searchQuery]);

  const switchTab = (tab: FilterTab) => {
    if (tab === activeTab) { return; }
    // A search debounce still in flight was scheduled against the tab we are
    // leaving; letting it fire would land the old tab's rows under the new
    // tab's header.
    if (searchDebounce.current) { clearTimeout(searchDebounce.current); }
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
        const updated = await apiService.verifyInstructor(instructor.id, true);
        // Approving a school member closes the admin gate but leaves the
        // school's open, so do not report it as finished.
        setSuccess(
          updated?.verification_status === 'pending_company'
            ? t('instructorVerify.msg.approvedAwaitingCompany', {
                name: instructor.full_name,
                company: instructor.company_name || '',
              })
            : t('instructorVerify.msg.approved', { name: instructor.full_name })
        );
      } else if (action === 'reject') {
        await apiService.adminRejectInstructor(instructor.id);
        setSuccess(t('instructorVerify.msg.rejected', { name: instructor.full_name }));
      } else {
        const wasCompanyStage = instructor.verification_status === 'pending_company';
        await apiService.adminResendVerification(instructor.id);
        setSuccess(
          wasCompanyStage
            ? t('instructorVerify.msg.resentCompany', {
                company: instructor.company_name || '',
              })
            : t('instructorVerify.msg.resent', { name: instructor.full_name })
        );
      }
      setTimeout(() => setSuccess(''), 5000);
      loadInstructors();
      loadCounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('instructorVerify.msg.actionFailed'));
    }
  };

  const renderItem = ({ item }: { item: InstructorRecord }) => (
    <InstructorCard
      item={item}
      colors={colors}
      t={t}
      widthStyle={cardWidthStyle}
      onApprove={() => setConfirmAction({ instructor: item, action: 'approve' })}
      onReject={() => setConfirmAction({ instructor: item, action: 'reject' })}
      onResend={() => setConfirmAction({ instructor: item, action: 'resend' })}
    />
  );

  const isCompanyResend = (): boolean =>
    confirmAction?.action === 'resend' &&
    confirmAction.instructor.verification_status === 'pending_company';

  const modalTitle = (): string => {
    if (!confirmAction) { return t('common.confirm'); }
    if (confirmAction.action === 'approve') { return t('instructorVerify.modal.approveTitle'); }
    if (confirmAction.action === 'reject') { return t('instructorVerify.modal.rejectTitle'); }
    return isCompanyResend()
      ? t('instructorVerify.modal.resendCompanyTitle')
      : t('instructorVerify.modal.resendTitle');
  };

  const modalConfirmLabel = (): string => {
    if (!confirmAction) { return t('common.confirm'); }
    if (confirmAction.action === 'approve') { return t('instructorVerify.modal.approve'); }
    if (confirmAction.action === 'reject') { return t('instructorVerify.modal.reject'); }
    return t('instructorVerify.modal.resend');
  };

  const modalMessage = (): string => {
    if (!confirmAction) { return ''; }
    const name = confirmAction.instructor.full_name;
    if (isCompanyResend()) {
      return t('instructorVerify.modal.confirmResendCompany', {
        name,
        company: confirmAction.instructor.company_name || '',
      });
    }
    if (confirmAction.action === 'resend') { return t('instructorVerify.modal.confirmResend', { name }); }
    if (confirmAction.action === 'approve') { return t('instructorVerify.modal.confirmApprove', { name }); }
    return t('instructorVerify.modal.confirmReject', { name });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title={t('instructorVerify.title')}
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Status filter — the tab strip *is* the status filter for this screen,
          so there is no second status dropdown to keep in sync with it. */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>
          {t('instructorVerify.filterByStatus')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {TAB_KEYS.map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => switchTab(key)}
              accessibilityRole="tab"
              accessibilityLabel={
                counts
                  ? t('instructorVerify.tab.withCount', {
                      label: t(`instructorVerify.tab.${key}`),
                      count: counts[key],
                    })
                  : t(`instructorVerify.tab.${key}`)
              }
              accessibilityState={{ selected: activeTab === key }}
              {...({ 'aria-selected': activeTab === key } as any)}
              style={[
                styles.tab,
                activeTab === key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === key ? colors.primary : colors.textSecondary },
                ]}
              >
                {counts
                  ? t('instructorVerify.tab.withCount', {
                      label: t(`instructorVerify.tab.${key}`),
                      count: counts[key],
                    })
                  : t(`instructorVerify.tab.${key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[
            styles.searchInput,
            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text },
          ]}
          placeholder={t('instructorVerify.searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel={t('instructorVerify.searchA11y')}
        />
        {searchQuery.length > 0 && (
          <Pressable
            style={[styles.clearSearchButton, { backgroundColor: colors.buttonDanger }]}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('instructorVerify.clearSearch')}
            hitSlop={8}
          >
            <Text style={styles.clearSearchText} accessibilityElementsHidden importantForAccessibility="no">
              ✕
            </Text>
          </Pressable>
        )}
      </View>

      {error ? <InlineMessage message={error} type="error" /> : null}
      {success ? <InlineMessage message={success} type="success" /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : instructors.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.success }]}>
            {t('instructorVerify.empty.title')}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {searchQuery
              ? t('instructorVerify.empty.noMatch', { query: searchQuery })
              : t('instructorVerify.empty.noneInFilter')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={instructors}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          numColumns={columns}
          // FlatList cannot change numColumns in place — remounting via key is
          // the documented workaround.
          key={`grid-${columns}`}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {t('instructorVerify.resultCount', { count: instructors.length })}
            </Text>
          }
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
              {t('common.cancel')}
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
        <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>{modalMessage()}</Text>
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
  list: { padding: IS_WEB ? 10 : 6 },
  row: { justifyContent: 'flex-start', paddingHorizontal: IS_WEB ? 5 : 2 },
  resultCount: { fontSize: 12, paddingHorizontal: 6, paddingBottom: 8 },
  filterBar: { borderBottomWidth: 1, paddingTop: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 14, marginBottom: 2 },
  tabContent: { paddingHorizontal: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4, borderRadius: 6 },
  tabLabel: { fontSize: IS_WEB ? 14 : 13, fontWeight: '600' },
  searchContainer: {
    padding: IS_WEB ? 12 : 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: IS_WEB ? 40 : 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: IS_WEB ? 15 : 10,
    fontSize: IS_WEB ? 14 : 13,
  },
  clearSearchButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  // maxWidth / flexBasis are viewport-derived and supplied at render time.
  card: { margin: IS_WEB ? 6 : 4, flexGrow: 1 },
  idBadge: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idBadgeText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
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
  saId: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  companyTag: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  dateText: { fontSize: 11 },
  details: { marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5, gap: 6 },
  detailLabel: { fontSize: 12, fontWeight: '600', minWidth: 56 },
  detailValue: { fontSize: 12, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  noAction: { fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
  emptyText: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalMsg: { fontSize: IS_WEB ? 16 : 15, textAlign: 'center', lineHeight: 22 },
});
