/**
 * CreditBanner — Shows the student's available credit balance.
 * Fetches credits from the API and displays a compact banner.
 * Renders nothing if the user has no credits or is not a student.
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card } from './ui';
import { useTheme } from '../theme/ThemeContext';
import ApiService from '../services/api';

interface CreditBannerProps {
  /** Force a refresh (increment to trigger reload) */
  refreshKey?: number;
  /** Compact mode for inline use in sub-screens */
  compact?: boolean;
}

export default function CreditBanner({ refreshKey = 0, compact = false }: CreditBannerProps) {
  const { colors } = useTheme();
  const [creditTotal, setCreditTotal] = useState(0);
  const [creditCount, setCreditCount] = useState(0);

  useEffect(() => {
    loadCredits();
  }, [refreshKey]);

  const loadCredits = async () => {
    try {
      const res = await ApiService.getAvailableCredits();
      const credits = res.credits || [];
      const total = res.total_available_credit || credits.reduce((sum: number, c: any) => sum + c.credit_amount, 0);
      setCreditTotal(total);
      setCreditCount(credits.length);
    } catch {
      setCreditTotal(0);
      setCreditCount(0);
    }
  };

  if (creditTotal <= 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.success + '15',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderLeftWidth: 3,
          borderLeftColor: colors.success,
        }}>
          <Text style={{ fontSize: 13, color: colors.success, fontWeight: '600' }}>
            💰 R{creditTotal.toFixed(2)} credit available
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginLeft: 8 }}>
            Auto-applied on next booking
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <Card variant="elevated" padding="md" style={{ borderLeftWidth: 4, borderLeftColor: colors.success }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>💰 Available Credit</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.success }}>
              R{creditTotal.toFixed(2)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              From {creditCount} cancelled {creditCount === 1 ? 'booking' : 'bookings'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
              Auto-applied on next booking
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}
