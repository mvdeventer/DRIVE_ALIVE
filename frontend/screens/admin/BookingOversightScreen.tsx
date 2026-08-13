/**
 * Booking Oversight Screen
 * View and manage all bookings across the system
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  FlatList,
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
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import apiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

const SCREEN_NAME = 'BookingOversightScreen';
// The server caps /admin/bookings at 100 per request.
const PAGE_SIZE = 100;

interface Booking {
  id: number;
  booking_reference: string;
  student_id: number;
  student_name: string;
  student_id_number: string;
  instructor_id: number;
  instructor_name: string;
  instructor_id_number: string;
  lesson_date: string;
  duration_minutes: number;
  lesson_type: string;
  pickup_address: string;
  dropoff_address?: string;
  status: string;
  amount: number;
  created_at: string;
}

export default function BookingOversightScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  // Grid density is viewport-driven and must be read during render — putting
  // it in StyleSheet.create froze the layout at whatever width the module
  // happened to be imported at.
  const { select } = useBreakpoint();
  const columns = select({ xs: 1, md: 2, lg: 3 }) ?? 1;
  const cardWidthStyle = {
    flexBasis: select({ xs: '100%', md: '48%', lg: '30%' }),
    minWidth: columns === 1 ? '100%' : Platform.OS === 'web' ? 280 : 200,
  } as const;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'cancelled' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
  // Tab counts must describe every booking, not the page in hand — see
  // loadBookings. /admin/stats already counts server-side for the dashboard.
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const byDate = (list: Booking[]) =>
    [...list].sort(
      (a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime()
    );

  /**
   * `/admin/bookings` is paged and caps `limit` at 100, so the screen only ever
   * holds a page. Two consequences drove this shape:
   *
   *  - the tab must filter server-side, or selecting "Completed" would only
   *    find the completed bookings that happened to be in the page already;
   *  - the counts beside each tab must come from `/admin/stats`, which counts
   *    the whole table, or they describe the page and read as nonsense (a
   *    database with 1143 completed bookings showed "Completed (0)").
   */
  const loadBookings = async (tab = activeTab, append = false, search = searchQuery) => {
    try {
      setError('');
      const skip = append ? bookings.length : 0;
      const data: Booking[] = await apiService.getAllBookingsAdmin(
        tab === 'all' ? '' : tab,
        skip,
        PAGE_SIZE,
        search
      );
      setBookings(prev => byDate(append ? [...prev, ...data] : data));
      setHasMore(data.length === PAGE_SIZE);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('bookingOversight.msg.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadCounts = async () => {
    try {
      const stats = await apiService.getAdminStats();
      setStatusCounts({
        all: stats.total_bookings ?? 0,
        pending: stats.pending_bookings ?? 0,
        completed: stats.completed_bookings ?? 0,
        cancelled: stats.cancelled_bookings ?? 0,
      });
    } catch {
      // A failed count must not blank the list the admin came here for.
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings(activeTab);
      loadCounts();
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings(activeTab);
    loadCounts();
  };

  const onLoadMore = () => {
    setLoadingMore(true);
    loadBookings(activeTab, true);
  };

  // Search runs server-side (the list is paged, so a local filter would only
  // ever see the current page). Debounced so typing is not one request per key.
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) {
      firstSearchRun.current = false;
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setLoading(true);
      loadBookings(activeTab, false, searchQuery);
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery]);

  const selectTab = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setLoading(true);
    setBookings([]);
    loadBookings(tab);
  };

  const handleCancelBooking = (booking: Booking) => {
    setConfirmCancel(booking);
  };

  const confirmCancelBooking = async () => {
    if (!confirmCancel) return;

    try {
      setError('');
      await apiService.cancelBookingAdmin(confirmCancel.id);
      showMessage(
        setSuccess,
        t('bookingOversight.msg.cancelled'),
        SCREEN_NAME,
        'bookingCancel',
        'success'
      );
      setConfirmCancel(null);
      loadBookings();
    } catch (err: any) {
      showMessage(
        setError,
        err.response?.data?.detail || t('bookingOversight.msg.cancelFailed'),
        SCREEN_NAME,
        'error',
        'error'
      );
      setConfirmCancel(null);
    }
  };

  // Both the tab filter and the search now run server-side in loadBookings,
  // because the list is paged and a local filter could only ever see one page.
  // loadBookings already sorts by lesson date.
  const filteredBookings = bookings;

  const copyBookingDetails = (booking: Booking) => {
    const details = `
════════════════════════════════════════
           BOOKING DETAILS
════════════════════════════════════════

Booking Ref:    ${booking.booking_reference}
Booking ID:     #${booking.id}
Status:         ${booking.status.toUpperCase()}
Lesson Type:    ${booking.lesson_type.toUpperCase()}

👤 Student:     ${booking.student_name}
   ID Number:   ${booking.student_id_number}

🚗 Instructor:  ${booking.instructor_name}
   ID Number:   ${booking.instructor_id_number}

📅 Date:        ${new Date(booking.lesson_date).toLocaleDateString()}
🕐 Time:        ${new Date(booking.lesson_date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}
⏱️  Duration:    ${booking.duration_minutes} minutes

📍 Pickup:      ${booking.pickup_address}${
      booking.dropoff_address
        ? `
📍 Dropoff:     ${booking.dropoff_address}`
        : ''
    }

💰 Amount:      R${booking.amount.toFixed(2)}

📝 Created:     ${new Date(booking.created_at).toLocaleString()}

════════════════════════════════════════
`.trim();

    Clipboard.setString(details);
    setSuccess(t('bookingOversight.msg.copied'));
    setTimeout(() => setSuccess(''), 3000);
  };

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  const copyAndCloseModal = () => {
    if (selectedBooking) {
      copyBookingDetails(selectedBooking);
      closeModal();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.textTertiary;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <Card
      variant="elevated"
      style={[styles.bookingCard, cardWidthStyle]}
      onPress={() => showBookingDetails(item)}
    >
      <View style={[styles.bookingHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.bookingInfo}>
          <Text style={[styles.bookingId, { color: colors.primary }]}>
            ID: #{item.id} {item.booking_reference}
          </Text>
          <Text style={[styles.studentName, { color: colors.text }]}>{item.student_name}</Text>
          <Text style={[styles.idNumber, { color: colors.textTertiary }]}>ID: {item.student_id_number}</Text>
          <Text style={[styles.instructorName, { color: colors.textSecondary }]}>{item.instructor_name}</Text>
          <Text style={[styles.idNumber, { color: colors.textTertiary }]}>ID: {item.instructor_id_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.type')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.lesson_type.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.date')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(item.lesson_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.time')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {new Date(item.lesson_date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.duration')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{item.duration_minutes} min</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.pickup')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
            {item.pickup_address}
          </Text>
        </View>
        {item.dropoff_address ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.dropoff')}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
              {item.dropoff_address}
            </Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.amount')}</Text>
          <Text style={[styles.amountText, { color: colors.success }]}>R{item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.created')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button variant="primary" size="sm" style={{ flex: 1 }} onPress={() => copyBookingDetails(item)}>
          {t('misc.copyDetails')}
        </Button>
        {item.status.toLowerCase() !== 'cancelled' && item.status.toLowerCase() !== 'completed' && (
          <Button variant="danger" size="sm" style={{ flex: 1 }} onPress={() => handleCancelBooking(item)}>
            {t('common.cancel')}
          </Button>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('bookingOversight.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title={t('bookingOversight.title')}
        onBack={() => navigation.goBack()}
        showBackButton={navigation.canGoBack()}
      />

      {/* Ternaries, not `&&`: these are string states, so `'' && …` renders the
          empty string as a text node, which <View> rejects on web. */}
      {error ? <InlineMessage message={error} type="error" /> : null}
      {success ? <InlineMessage message={success} type="success" /> : null}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((tab) => {
          const count = statusCounts[tab] ?? 0;
          // The label already interpolates the count; appending another pair of
          // brackets here rendered "All (50) (50)".
          const label = t(`bookingOversight.tab.${tab}`, { count });
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: activeTab === tab }}
              {...({ 'aria-selected': activeTab === tab } as any)}
              style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, backgroundColor: colors.primaryLight }]}
              onPress={() => selectTab(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
          placeholder={t('bookingOversight.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id.toString()}
        numColumns={columns}
        // FlatList cannot change numColumns in place — remounting via key is
        // the documented workaround.
        key={`grid-${columns}`}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreWrap}>
              <Button variant="secondary" onPress={onLoadMore} disabled={loadingMore}>
                {loadingMore ? t('common.loading') : t('bookingOversight.loadMore')}
              </Button>
            </View>
          ) : null
        }
      />

      <ThemedModal
        visible={modalVisible}
        onClose={closeModal}
        title={t('bookingOversight.detailsTitle')}
        size="lg"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="primary" style={{ flex: 1 }} onPress={copyAndCloseModal}>
              {t('misc.copyDetails')}
            </Button>
            <Button variant="secondary" style={{ flex: 1 }} onPress={closeModal}>
              {t('common.close')}
            </Button>
          </View>
        }
      >
            {selectedBooking && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.reference')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.booking_reference}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.bookingId')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>#{selectedBooking.id}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.status')}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                    <Text style={styles.modalStatusText}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.lessonType')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.lesson_type.toUpperCase()}</Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('createUser.roleStudent')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.student_name}</Text>
                  <Text style={[styles.modalSubvalue, { color: colors.textTertiary }]}>ID: {selectedBooking.student_id_number}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('createUser.roleInstructor')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.instructor_name}</Text>
                  <Text style={[styles.modalSubvalue, { color: colors.textTertiary }]}>
                    ID: {selectedBooking.instructor_id_number}
                  </Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.date')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.lesson_date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.time')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.lesson_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.duration')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.duration_minutes} minutes</Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.pickup')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.pickup_address}</Text>
                </View>

                {selectedBooking.dropoff_address ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.dropoff')}</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>{selectedBooking.dropoff_address}</Text>
                  </View>
                ) : null}

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.amount')}</Text>
                  <Text style={[styles.modalAmount, { color: colors.success }]}>R{selectedBooking.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('bookingOversight.label.created')}</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedBooking.created_at).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}
      </ThemedModal>

      {/* Confirmation Modal */}
      <ThemedModal
        visible={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title={t('bookingOversight.cancelBooking')}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmCancel(null)}>
              {t('bookingOversight.msg.keepIt')}
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={confirmCancelBooking}>
              {t('bookingOversight.msg.yesCancel')}
            </Button>
          </View>
        }
      >
            <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: 15, fontFamily: 'Inter_400Regular' }}>
              {t('bookingOversight.msg.confirmCancel')}
            </Text>

              {confirmCancel && (
                <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{t('bookingOversight.label.student')} </Text>
                    <Text>{confirmCancel.student_name}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{t('bookingOversight.label.instructor')} </Text>
                    <Text>{confirmCancel.instructor_name}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5, fontFamily: 'Inter_400Regular' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{t('bookingOversight.label.date')} </Text>
                    <Text>{new Date(confirmCancel.lesson_date).toLocaleString()}</Text>
                  </Text>
                </View>
              )}

            <Text style={{ fontSize: 14, color: colors.danger, textAlign: 'center', fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
              {t('misc.cannotBeUndone')}
            </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadMoreWrap: { padding: 16, alignItems: 'center' },
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 15 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 11,
    fontFamily: 'Inter_600SemiBold',
  },
  searchContainer: {
    padding: Platform.OS === 'web' ? 15 : 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: Platform.OS === 'web' ? 40 : 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 15 : 10,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    padding: Platform.OS === 'web' ? 10 : 6,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: Platform.OS === 'web' ? 5 : 2,
  },
  bookingCard: {
    margin: Platform.OS === 'web' ? 6 : 4,
    // flexBasis / minWidth are viewport-derived and supplied at render time
    // by `cardWidthStyle` — they must not live here.
    maxWidth: '100%',
    flexGrow: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  studentName: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  instructorName: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  idNumber: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: Platform.OS === 'web' ? 10 : 9,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  bookingDetails: {
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Platform.OS === 'web' ? 5 : 4,
  },
  detailLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
    minWidth: 64,
  },
  detailValue: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_500Medium',
    flexShrink: 1,
  },
  amountText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_700Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
    marginTop: Platform.OS === 'web' ? 6 : 4,
  },
  // Modal styles
  modalSection: {
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  modalSubvalue: {
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  modalDivider: {
    height: 1,
    marginVertical: 15,
  },
  confirmDetails: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
});
