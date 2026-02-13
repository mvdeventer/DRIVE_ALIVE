/**
 * Custom Calendar Picker Component
 * Provides a visual calendar for date selection
 */
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface CalendarPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onCancel?: () => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[]; // Deprecated - kept for backward compatibility
  timeOffDates?: Date[]; // Orange - instructor time-off
  noScheduleDates?: Date[]; // Grey - days instructor doesn't work
  fullyBookedDates?: Date[]; // Red - all slots booked
  showActions?: boolean;
}

export default function CalendarPicker({
  value,
  onChange,
  onCancel,
  minDate,
  maxDate,
  disabledDates,
  timeOffDates,
  noScheduleDates,
  fullyBookedDates,
  showActions = true,
}: CalendarPickerProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1)
  );
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(value);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (isDateDisabled(day)) return;
    setTempSelectedDate(selectedDate);
    // When showActions is false, the parent manages confirm/cancel buttons,
    // so notify the parent immediately on each day tap
    if (!showActions) {
      onChange(selectedDate);
    }
  };

  const handleConfirm = () => {
    onChange(tempSelectedDate);
  };

  const handleCancel = () => {
    setTempSelectedDate(value);
    if (onCancel) {
      onCancel();
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    if (disabledDates) {
      const isDisabled = disabledDates.some(disabledDate => {
        return (
          date.getDate() === disabledDate.getDate() &&
          date.getMonth() === disabledDate.getMonth() &&
          date.getFullYear() === disabledDate.getFullYear()
        );
      });
      if (isDisabled) return true;
    }

    if (timeOffDates) {
      const isTimeOff = timeOffDates.some(timeOffDate => {
        return (
          date.getDate() === timeOffDate.getDate() &&
          date.getMonth() === timeOffDate.getMonth() &&
          date.getFullYear() === timeOffDate.getFullYear()
        );
      });
      if (isTimeOff) return true;
    }

    if (noScheduleDates) {
      const isNoSchedule = noScheduleDates.some(noScheduleDate => {
        return (
          date.getDate() === noScheduleDate.getDate() &&
          date.getMonth() === noScheduleDate.getMonth() &&
          date.getFullYear() === noScheduleDate.getFullYear()
        );
      });
      if (isNoSchedule) return true;
    }

    return false;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === tempSelectedDate.getDate() &&
      currentMonth.getMonth() === tempSelectedDate.getMonth() &&
      currentMonth.getFullYear() === tempSelectedDate.getFullYear()
    );
  };

  const isInTimeOff = (day: number) => {
    const dates = timeOffDates || disabledDates;
    if (!dates) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return dates.some(timeOffDate => {
      return (
        date.getDate() === timeOffDate.getDate() &&
        date.getMonth() === timeOffDate.getMonth() &&
        date.getFullYear() === timeOffDate.getFullYear()
      );
    });
  };

  const isNoSchedule = (day: number) => {
    if (!noScheduleDates) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return noScheduleDates.some(noScheduleDate => {
      return (
        date.getDate() === noScheduleDate.getDate() &&
        date.getMonth() === noScheduleDate.getMonth() &&
        date.getFullYear() === noScheduleDate.getFullYear()
      );
    });
  };

  const isFullyBooked = (day: number) => {
    if (!fullyBookedDates) return false;
    const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    return fullyBookedDates.some(fullyBookedDate => {
      return (
        date.getUTCDate() === fullyBookedDate.getUTCDate() &&
        date.getUTCMonth() === fullyBookedDate.getUTCMonth() &&
        date.getUTCFullYear() === fullyBookedDate.getUTCFullYear()
      );
    });
  };

  const getDayStyle = (day: number) => {
    const disabled = isDateDisabled(day);
    const today = isToday(day);
    const selected = isSelected(day);
    const inTimeOff = isInTimeOff(day);
    const noSchedule = isNoSchedule(day);
    const fullyBooked = isFullyBooked(day);

    let bg = 'transparent';
    let textColor = colors.text;
    let borderColor = 'transparent';
    let borderWidth = 0;
    let opacity = 1;
    let fontFamily = 'Inter_400Regular';

    if (disabled) {
      opacity = 0.3;
      textColor = colors.textTertiary;
    }
    if (today && !fullyBooked) {
      bg = colors.primaryLight + '18';
      textColor = colors.primary;
      fontFamily = 'Inter_700Bold';
    }
    if (selected && !fullyBooked) {
      bg = colors.primary;
      textColor = colors.textInverse;
      fontFamily = 'Inter_700Bold';
    }
    if (noSchedule) {
      bg = colors.backgroundSecondary;
      borderWidth = 2;
      borderColor = colors.textTertiary;
      textColor = colors.textTertiary;
      fontFamily = 'Inter_700Bold';
      opacity = 1;
    }
    if (inTimeOff) {
      bg = colors.warningBg;
      borderWidth = 2;
      borderColor = colors.warning;
      textColor = colors.warning;
      fontFamily = 'Inter_700Bold';
      opacity = 1;
    }
    if (fullyBooked) {
      bg = colors.danger;
      borderWidth = 2;
      borderColor = colors.danger + 'CC';
      textColor = colors.textInverse;
      fontFamily = 'Inter_700Bold';
      opacity = 1;
    }

    return { bg, textColor, borderColor, borderWidth, opacity, disabled, fontFamily };
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View
          key={`empty-${i}`}
          style={{ width: '14.28%' as any, aspectRatio: 1 }}
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const s = getDayStyle(day);

      days.push(
        <Pressable
          key={day}
          style={{
            width: '14.28%' as any,
            aspectRatio: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 4,
            opacity: s.opacity,
          }}
          onPress={() => !s.disabled && selectDate(day)}
          disabled={s.disabled}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: s.bg,
              borderWidth: s.borderWidth,
              borderColor: s.borderColor,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: s.fontFamily,
                color: s.textColor,
              }}
            >
              {day}
            </Text>
          </View>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
      {/* Month/Year Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={previousMonth}
          style={{ padding: 8, borderRadius: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text
          style={{
            fontSize: 17,
            fontFamily: 'Inter_700Bold',
            color: colors.text,
          }}
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <Pressable
          onPress={nextMonth}
          style={{ padding: 8, borderRadius: 8 }}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Day Names */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {dayNames.map(name => (
          <View key={name} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: colors.textTertiary,
              }}
            >
              {name}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{renderCalendar()}</View>

      {/* Action Buttons */}
      {showActions && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 16,
            paddingHorizontal: 8,
          }}
        >
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 10,
              alignItems: 'center' as const,
              backgroundColor: pressed ? colors.border : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            })}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 10,
              alignItems: 'center' as const,
              backgroundColor: pressed ? colors.primaryDark : colors.primary,
            })}
          >
            <Text
              style={{
                color: colors.buttonPrimaryText,
                fontSize: 15,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              OK
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
