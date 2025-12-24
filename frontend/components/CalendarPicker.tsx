/**
 * Custom Calendar Picker Component
 * Provides a visual calendar for date selection
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CalendarPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[]; // Deprecated - kept for backward compatibility
  timeOffDates?: Date[]; // Orange - instructor time-off
  noScheduleDates?: Date[]; // Grey - days instructor doesn't work
  fullyBookedDates?: Date[]; // Red - all slots booked
}

export default function CalendarPicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates,
  timeOffDates,
  noScheduleDates,
  fullyBookedDates,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1)
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
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

    // Prevent selection if date doesn't pass validation
    if (isDateDisabled(day)) return;

    onChange(selectedDate);
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    // Check if date is in disabledDates array (backward compatibility)
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

    // Check if date is in timeOffDates
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

    // Check if date is in noScheduleDates
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

    // Check if date is fully booked (no available slots)
    if (fullyBookedDates && fullyBookedDates.length > 0) {
      const isFullyBooked = fullyBookedDates.some(bookedDate => {
        return (
          date.getDate() === bookedDate.getDate() &&
          date.getMonth() === bookedDate.getMonth() &&
          date.getFullYear() === bookedDate.getFullYear()
        );
      });
      if (isFullyBooked) return true;
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
      day === value.getDate() &&
      currentMonth.getMonth() === value.getMonth() &&
      currentMonth.getFullYear() === value.getFullYear()
    );
  };

  const isInTimeOff = (day: number) => {
    // Check new timeOffDates prop first, fallback to disabledDates for backward compatibility
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
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return fullyBookedDates.some(fullyBookedDate => {
      return (
        date.getDate() === fullyBookedDate.getDate() &&
        date.getMonth() === fullyBookedDate.getMonth() &&
        date.getFullYear() === fullyBookedDate.getFullYear()
      );
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(day);
      const today = isToday(day);
      const selected = isSelected(day);
      const inTimeOff = isInTimeOff(day);
      const noSchedule = isNoSchedule(day);
      const fullyBooked = isFullyBooked(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            today && styles.todayCell,
            selected && styles.selectedCell,
            disabled && styles.disabledCell,
            inTimeOff && styles.timeOffCell,
            noSchedule && !inTimeOff && styles.noScheduleCell,
            fullyBooked && !inTimeOff && !noSchedule && styles.fullyBookedCell,
          ]}
          onPress={() => !disabled && selectDate(day)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.dayText,
              today && styles.todayText,
              selected && styles.selectedText,
              disabled && styles.disabledText,
              inTimeOff && styles.timeOffText,
              noSchedule && !inTimeOff && styles.noScheduleText,
              fullyBooked && !inTimeOff && !noSchedule && styles.fullyBookedText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <View style={styles.container}>
      {/* Month/Year Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map(name => (
          <View key={name} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>{renderCalendar()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#007bff',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  todayCell: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  disabledCell: {
    opacity: 0.3,
  },
  noScheduleCell: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9e9e9e',
    opacity: 1,
  },
  timeOffCell: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff9800',
    opacity: 1,
  },
  fullyBookedCell: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f44336',
    opacity: 1,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  todayText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#ccc',
  },
  noScheduleText: {
    color: '#9e9e9e',
    fontWeight: 'bold',
  },
  timeOffText: {
    color: '#ff9800',
    fontWeight: 'bold',
    textDecorationLine: 'line-through',
  },
  fullyBookedText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
});
