/**
 * ScheduleEditor — lightweight schedule slot picker used during registration.
 * No API calls; collects slots locally and returns them via onChange.
 */
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ScheduleSlot {
  day_of_week: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  is_active: boolean;
}

interface Props {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}

const DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_START = '08:00';
const DEFAULT_END = '17:00';

/** Make sure time string is in HH:MM format */
function normalizeTime(raw: string): string {
  const cleaned = raw.replace(/[^0-9:]/g, '');
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [h, m] = cleaned.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  return cleaned;
}

export default function ScheduleEditor({ value, onChange }: Props) {
  const { colors } = useTheme();

  const getSlot = (day: string) =>
    value.find((s) => s.day_of_week === day) ?? null;

  const toggleDay = (day: string) => {
    const existing = getSlot(day);
    if (existing) {
      onChange(value.filter((s) => s.day_of_week !== day));
    } else {
      onChange([
        ...value,
        { day_of_week: day, start_time: DEFAULT_START, end_time: DEFAULT_END, is_active: true },
      ]);
    }
  };

  const updateSlot = (
    day: string,
    field: 'start_time' | 'end_time',
    raw: string,
  ) => {
    onChange(
      value.map((s) =>
        s.day_of_week === day ? { ...s, [field]: normalizeTime(raw) } : s,
      ),
    );
  };

  return (
    <View>
      {DAYS.map(({ key, label }) => {
        const slot = getSlot(key);
        const active = !!slot;
        return (
          <View
            key={key}
            style={[
              styles.dayRow,
              {
                backgroundColor: active ? colors.cardElevated : colors.backgroundSecondary,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            {/* Day toggle */}
            <View style={styles.dayHeader}>
              <Switch
                value={active}
                onValueChange={() => toggleDay(key)}
                thumbColor={active ? colors.primary : colors.textSecondary}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
              />
              <Pressable onPress={() => toggleDay(key)} style={styles.dayLabelWrap}>
                <Text
                  style={[
                    styles.dayLabel,
                    { color: active ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            </View>

            {/* Time inputs — only shown when day is active */}
            {active && slot && (
              <View style={styles.timesRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                    From
                  </Text>
                  <TextInput
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={slot.start_time}
                    onChangeText={(v) => updateSlot(key, 'start_time', v)}
                    placeholder="08:00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                    maxLength={5}
                  />
                </View>
                <Text style={[styles.timeSep, { color: colors.textSecondary }]}>—</Text>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                    To
                  </Text>
                  <TextInput
                    style={[
                      styles.timeInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={slot.end_time}
                    onChangeText={(v) => updateSlot(key, 'end_time', v)}
                    placeholder="17:00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                    maxLength={5}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabelWrap: {
    marginLeft: 8,
    flex: 1,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  timeField: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
  },
  timeSep: {
    fontSize: 16,
    marginTop: 18,
  },
});
