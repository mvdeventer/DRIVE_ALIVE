/**
 * AdvancedAnalyticsScreen
 *
 * Admin-only deep-dive analytics:
 *  - Daily booking & revenue time-series (last 7/30/90 days)
 *  - Booking status breakdown
 *  - Completion / cancellation rates
 *  - User role distribution
 *  - 30-day growth metrics
 *
 * Pure React Native primitives — works on iOS, Android, and Web.
 * Bars are rendered with `View` width % to avoid any chart library
 * cross-platform compatibility issues.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

// ─── Types ─────────────────────────────────────────────────

interface TimeseriesPoint {
  date: string;
  bookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

interface Timeseries {
  days: number;
  start_date: string;
  end_date: string;
  points: TimeseriesPoint[];
  totals: { bookings: number; completed: number; cancelled: number; revenue: number };
}

interface Breakdown {
  status_counts: Record<string, number>;
  completion_rate: number;
  cancellation_rate: number;
  role_counts: Record<string, number>;
  new_users_last_30d: number;
  new_bookings_last_30d: number;
  avg_lessons_per_student: number;
}

const RANGE_OPTIONS: Array<{ label: string; days: number }> = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

// ─── Helpers ───────────────────────────────────────────────

function formatZAR(value: number): string {
  return `R ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function shortDate(iso: string): string {
  // YYYY-MM-DD → DD/MM
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// ─── Component ─────────────────────────────────────────────

export default function AdvancedAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [days, setDays] = useState(30);
  const [series, setSeries] = useState<Timeseries | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, b] = await Promise.all([
        ApiService.getAnalyticsTimeseries(days),
        ApiService.getAnalyticsBreakdown(),
      ]);
      setSeries(s);
      setBreakdown(b);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const maxBookings = useMemo(() => {
    if (!series) return 0;
    return Math.max(1, ...series.points.map((p) => p.bookings));
  }, [series]);

  const maxRevenue = useMemo(() => {
    if (!series) return 0;
    return Math.max(1, ...series.points.map((p) => p.revenue));
  }, [series]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.h1}>Advanced Analytics</Text>
      <Text style={styles.sub}>Deep-dive into bookings, revenue and growth.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map((opt) => {
          const active = days === opt.days;
          return (
            <Pressable
              key={opt.days}
              onPress={() => setDays(opt.days)}
              style={[
                styles.rangeBtn,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: '600',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Totals */}
      {series ? (
        <View style={styles.kpiGrid}>
          <Kpi label="Bookings" value={String(series.totals.bookings)} color={colors.primary} />
          <Kpi label="Completed" value={String(series.totals.completed)} color="#16a34a" />
          <Kpi label="Cancelled" value={String(series.totals.cancelled)} color="#dc2626" />
          <Kpi label="Revenue" value={formatZAR(series.totals.revenue)} color="#0ea5e9" />
        </View>
      ) : null}

      {/* Bookings chart */}
      {series ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Bookings</Text>
          <BarChart
            points={series.points.map((p) => ({
              label: shortDate(p.date),
              value: p.bookings,
            }))}
            max={maxBookings}
            colors={colors}
            barColor={colors.primary}
          />
        </View>
      ) : null}

      {/* Revenue chart */}
      {series ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Revenue (ZAR)</Text>
          <BarChart
            points={series.points.map((p) => ({
              label: shortDate(p.date),
              value: p.revenue,
            }))}
            max={maxRevenue}
            colors={colors}
            barColor="#0ea5e9"
            valueFormatter={(v) => formatZAR(v)}
          />
        </View>
      ) : null}

      {/* Breakdown */}
      {breakdown ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Status</Text>
            {Object.entries(breakdown.status_counts).map(([k, v]) => (
              <KeyValueRow key={k} label={titleCase(k)} value={String(v)} colors={colors} />
            ))}
            <View style={styles.divider} />
            <KeyValueRow
              label="Completion Rate"
              value={`${breakdown.completion_rate}%`}
              colors={colors}
              accent="#16a34a"
            />
            <KeyValueRow
              label="Cancellation Rate"
              value={`${breakdown.cancellation_rate}%`}
              colors={colors}
              accent="#dc2626"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Roles</Text>
            {Object.entries(breakdown.role_counts).map(([k, v]) => (
              <KeyValueRow key={k} label={titleCase(k)} value={String(v)} colors={colors} />
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Growth (Last 30 Days)</Text>
            <KeyValueRow
              label="New Users"
              value={String(breakdown.new_users_last_30d)}
              colors={colors}
            />
            <KeyValueRow
              label="New Bookings"
              value={String(breakdown.new_bookings_last_30d)}
              colors={colors}
            />
            <KeyValueRow
              label="Avg Completed Lessons / Student"
              value={String(breakdown.avg_lessons_per_student)}
              colors={colors}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ─── Sub-components ────────────────────────────────────────

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexBasis: '48%',
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: '700', marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function BarChart({
  points,
  max,
  colors,
  barColor,
  valueFormatter,
}: {
  points: Array<{ label: string; value: number }>;
  max: number;
  colors: any;
  barColor: string;
  valueFormatter?: (v: number) => string;
}) {
  // Show at most ~12 evenly-spaced bars to stay readable on phones.
  const stride = Math.max(1, Math.floor(points.length / 12));
  const visible = points.filter((_, i) => i % stride === 0);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
        {visible.map((p, idx) => {
          const heightPct = max > 0 ? (p.value / max) * 100 : 0;
          return (
            <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: '80%',
                  height: `${Math.max(2, heightPct)}%`,
                  backgroundColor: p.value === 0 ? colors.border : barColor,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4, gap: 4 }}>
        {visible.map((p, idx) => (
          <Text
            key={idx}
            style={{
              flex: 1,
              fontSize: 9,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {p.label}
          </Text>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
        Max: {valueFormatter ? valueFormatter(max) : max}
      </Text>
    </View>
  );
}

function KeyValueRow({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: any;
  accent?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: colors.text }}>{label}</Text>
      <Text style={{ color: accent || colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Styles ────────────────────────────────────────────────

function useStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    h1: { color: colors.text, fontSize: 22, fontWeight: '700' },
    sub: { color: colors.textSecondary, marginTop: 4, marginBottom: 14 },
    error: { color: '#dc2626', marginBottom: 12 },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    rangeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginTop: 10,
    },
    cardTitle: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 15,
      marginBottom: 10,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
  });
}
