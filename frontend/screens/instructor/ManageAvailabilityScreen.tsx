/**
 * Instructor Availability Management Screen
 * Allows instructors to set up their weekly schedule and manage availability
 */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';
import TimePickerWheel from '../../components/TimePickerWheel';
import CalendarPicker from '../../components/CalendarPicker';

// Lazy load DateTimePicker for native platforms
const getDateTimePicker = () => {
  if (Platform.OS !== 'web') {
    return require('@react-native-community/datetimepicker').default;
  }
  return null;
};

interface Schedule {
  id?: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TimeOff {
  id?: number;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS: { [key: string]: string } = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function ManageAvailabilityScreen({ navigation: navProp }: any) {
  const navInstance = navProp || useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [originalSchedules, setOriginalSchedules] = useState<Schedule[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [newTimeOff, setNewTimeOff] = useState<TimeOff>({
    start_date: '',
    end_date: '',
    reason: '',
    notes: '',
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState<{
    day?: string;
    field?: 'start_time' | 'end_time';
  }>({});

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState<{
    field?: 'start_date' | 'end_date';
  }>({});
  const [tempDate, setTempDate] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadAvailability();
  }, []);

  // Reload availability when screen comes into focus (e.g., after changes)
  useFocusEffect(
    useCallback(() => {
      loadAvailability();
    }, [])
  );

  // Track Time Off form changes (dates or reason entered)
  useEffect(() => {
    const hasTimeOffFormData =
      newTimeOff.start_date.length > 0 ||
      newTimeOff.end_date.length > 0 ||
      newTimeOff.reason.trim().length > 0;
    if (hasTimeOffFormData && !hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [newTimeOff.start_date, newTimeOff.end_date, newTimeOff.reason]);

  useEffect(() => {
    const unsubscribe = navInstance.addListener('beforeRemove', e => {
      if (!hasUnsavedChanges) {
        return;
      }
      e.preventDefault();
      setPendingNavigation(e.data.action);
      setShowDiscardModal(true);
    });
    return unsubscribe;
  }, [navInstance, hasUnsavedChanges]);

  const handleDiscardChanges = () => {
    setShowDiscardModal(false);
    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveAndContinue = async () => {
    setShowDiscardModal(false);
    await handleSaveSchedule();
    // After save completes, navigation will happen via the save handler if successful
  };

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const [scheduleRes, timeOffRes] = await Promise.all([
        ApiService.get('/availability/schedule'),
        ApiService.get('/availability/time-off'),
      ]);

      const initialSchedules = scheduleRes.data || [];
      setSchedules(initialSchedules);
      setOriginalSchedules(JSON.parse(JSON.stringify(initialSchedules))); // Deep copy
      setTimeOff(timeOffRes.data || []);

      // Initialize empty schedules for days without entries
      DAYS_OF_WEEK.forEach(day => {
        if (!scheduleRes.data.find((s: Schedule) => s.day_of_week === day)) {
          const newSchedule = {
            day_of_week: day,
            start_time: '08:00',
            end_time: '17:00',
            is_active: false,
          };
          setSchedules(prev => [...prev, newSchedule]);
          setOriginalSchedules(prev => [...prev, JSON.parse(JSON.stringify(newSchedule))]);
        }
      });
    } catch (error) {
      console.error('Error loading availability:', error);
      setMessage({ type: 'error', text: 'Failed to load availability' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (day: string, field: string, value: any) => {
    setSchedules(prev => {
      const updated = prev.map(schedule =>
        schedule.day_of_week === day ? { ...schedule, [field]: value } : schedule
      );
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker({});
    }

    if (selectedDate && showTimePicker.day && showTimePicker.field) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateSchedule(showTimePicker.day, showTimePicker.field, timeString);

      if (Platform.OS === 'ios') {
        setShowTimePicker({});
      }
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker({});
    }

    if (selectedDate && showDatePicker.field) {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      setNewTimeOff({ ...newTimeOff, [showDatePicker.field]: dateString });

      if (Platform.OS === 'ios') {
        setShowDatePicker({});
      }
    }
  };

  const openTimePicker = (day: string, field: 'start_time' | 'end_time') => {
    const schedule = schedules.find(s => s.day_of_week === day);
    if (schedule) {
      const [hours, minutes] = schedule[field].split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      setTempDate(date);
    }
    setShowTimePicker({ day, field });
  };

  // Generate array of disabled dates from existing time off periods
  const getDisabledDates = (): Date[] => {
    const disabled: Date[] = [];
    timeOff.forEach(period => {
      const start = new Date(period.start_date);
      const end = new Date(period.end_date);

      // Add all dates in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        disabled.push(new Date(date));
      }
    });
    return disabled;
  };

  const saveSchedules = async () => {
    try {
      setSaving(true);

      // Filter only active schedules
      const activeSchedules = schedules.filter(s => s.is_active);

      if (activeSchedules.length === 0) {
        setMessage({ type: 'warning', text: 'Please enable at least one day' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Validate times
      for (const schedule of activeSchedules) {
        if (schedule.start_time >= schedule.end_time) {
          setMessage({
            type: 'warning',
            text: `Invalid time range for ${DAY_LABELS[schedule.day_of_week]}`,
          });
          setTimeout(() => setMessage(null), 3000);
          return;
        }
      }

      // Delete all existing schedules and create new ones
      // First, delete existing schedules
      const existingSchedules = schedules.filter(s => s.id);
      for (const schedule of existingSchedules) {
        if (schedule.id) {
          await ApiService.delete(`/availability/schedule/${schedule.id}`);
        }
      }

      // Create bulk schedule
      await ApiService.post('/availability/schedule/bulk', {
        schedules: activeSchedules.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active,
        })),
      });

      setMessage({ type: 'success', text: 'Schedule saved successfully!' });
      setHasUnsavedChanges(false);
      setOriginalSchedules(JSON.parse(JSON.stringify(activeSchedules)));
      setTimeout(() => setMessage(null), 4000);

      loadAvailability();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      const errMsg = error.response?.data?.detail || 'Failed to save schedule';
      setMessage({ type: 'error', text: errMsg });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async () => {
    try {
      // Validate start date is provided
      if (!newTimeOff.start_date) {
        setMessage({ type: 'error', text: 'Please select at least a start date' });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const startDate = new Date(newTimeOff.start_date);
      // If no end date provided, use start date (single day off)
      const endDate = newTimeOff.end_date
        ? new Date(newTimeOff.end_date)
        : new Date(newTimeOff.start_date);

      if (newTimeOff.end_date && endDate < startDate) {
        setMessage({ type: 'error', text: 'End date cannot be before start date' });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Check for overlaps with existing time off
      const hasOverlap = timeOff.some(existing => {
        const existingStart = new Date(existing.start_date);
        const existingEnd = new Date(existing.end_date);
        return (
          (startDate >= existingStart && startDate <= existingEnd) ||
          (endDate >= existingStart && endDate <= existingEnd) ||
          (startDate <= existingStart && endDate >= existingEnd)
        );
      });

      if (hasOverlap) {
        const overlapping = timeOff.find(existing => {
          const existingStart = new Date(existing.start_date);
          const existingEnd = new Date(existing.end_date);
          return (
            (startDate >= existingStart && startDate <= existingEnd) ||
            (endDate >= existingStart && endDate <= existingEnd) ||
            (startDate <= existingStart && endDate >= existingEnd)
          );
        });

        setMessage({
          type: 'error',
          text: `This time off period overlaps with existing time off from ${overlapping?.start_date} to ${overlapping?.end_date}`,
        });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(() => setMessage(null), 5000);
        return;
      }

      // Create single time off entry for the date range
      await ApiService.post('/availability/time-off', {
        start_date: newTimeOff.start_date,
        end_date: newTimeOff.end_date || newTimeOff.start_date, // Use start_date if end_date not provided
        reason: newTimeOff.reason || 'Unavailable',
        notes: newTimeOff.notes,
      });

      setMessage({
        type: 'success',
        text: 'Time off added successfully!',
      });
      setTimeout(() => setMessage(null), 4000);

      setNewTimeOff({
        start_date: '',
        end_date: '',
        reason: '',
        notes: '',
      });

      // Clear unsaved changes flag since we successfully saved
      setHasUnsavedChanges(false);

      loadAvailability();
    } catch (error: any) {
      console.error('Error adding time off:', error);
      const errMsg = error.response?.data?.detail || 'Failed to add time off';
      setMessage({ type: 'error', text: errMsg });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteTimeOff = async (id: number) => {
    try {
      await ApiService.delete(`/availability/time-off/${id}`);
      loadAvailability();

      setMessage({ type: 'success', text: 'Time off deleted' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting time off:', error);
      setMessage({ type: 'error', text: 'Failed to delete time off' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const confirmDeleteTimeOff = (id: number) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete) {
      await deleteTimeOff(confirmDelete);
      setConfirmDelete(null);
    }
  };

  const handleDatePickerConfirm = (date: Date) => {
    if (!showDatePicker.field) return;

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    setNewTimeOff({
      ...newTimeOff,
      [showDatePicker.field]: dateString,
    });
    setShowDatePicker({});
    setTempSelectedDate(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Manage Availability"
        onBack={() => navInstance.goBack()}
        showBackButton={true}
      />
      <ScrollView ref={scrollViewRef} style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
        <Text style={styles.title}>📅 Manage Availability</Text>
        {hasUnsavedChanges && (
          <View style={styles.unsavedBadge}>
            <Text style={styles.unsavedBadgeText}>●</Text>
          </View>
        )}
      </View>

      {/* Inline Message Display */}
      {message && (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      )}

      {/* Weekly Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <Text style={styles.sectionDescription}>
          Set your regular working hours for each day of the week
        </Text>

        {/* Enable All Toggle */}
        <View style={styles.enableAllCard}>
          <View style={styles.enableAllHeader}>
            <Text style={styles.enableAllLabel}>Enable All Days</Text>
            <Switch
              value={schedules.every(s => s.is_active)}
              onValueChange={value => {
                const updatedSchedules = DAYS_OF_WEEK.map(day => {
                  const existingSchedule = schedules.find(s => s.day_of_week === day);
                  return {
                    day_of_week: day,
                    start_time: existingSchedule?.start_time || '08:00',
                    end_time: existingSchedule?.end_time || '17:00',
                    is_active: value,
                    ...(existingSchedule?.id && { id: existingSchedule.id }),
                  };
                });
                setSchedules(updatedSchedules);
                setHasUnsavedChanges(true);
              }}
              trackColor={{ false: '#ccc', true: '#28a745' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
          <Text style={styles.enableAllDescription}>
            Quickly enable/disable all days with default times (08:00 - 17:00)
          </Text>
        </View>

        {DAYS_OF_WEEK.map(day => {
          const schedule = schedules.find(s => s.day_of_week === day) || {
            day_of_week: day,
            start_time: '08:00',
            end_time: '17:00',
            is_active: false,
          };

          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
                <Switch
                  value={schedule.is_active}
                  onValueChange={value => updateSchedule(day, 'is_active', value)}
                  trackColor={{ false: '#ccc', true: '#28a745' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                />
              </View>

              {schedule.is_active && (
                <View style={styles.timeInputs}>
                  <View style={styles.timeGroup}>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(day, 'start_time')}
                    >
                      <Text style={styles.timePickerText}>{schedule.start_time}</Text>
                      <Text style={styles.timePickerIcon}>🕐</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeGroup}>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => openTimePicker(day, 'end_time')}
                    >
                      <Text style={styles.timePickerText}>{schedule.end_time}</Text>
                      <Text style={styles.timePickerIcon}>🕐</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={saveSchedules}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save Schedule</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Time Off */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Off</Text>
        <Text style={styles.sectionDescription}>
          Block out dates when you're not available (holidays, vacations, etc.)
        </Text>

        {/* Add Time Off Form */}
        <View style={styles.timeOffForm}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>From Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker({ field: 'start_date' })}
            >
              <Text style={styles.datePickerText}>
                {newTimeOff.start_date || 'Select Start Date'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>To Date (optional - leave blank for single day)</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker({ field: 'end_date' })}
            >
              <Text style={styles.datePickerText}>{newTimeOff.end_date || 'Select End Date'}</Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              value={newTimeOff.reason}
              onChangeText={value => setNewTimeOff({ ...newTimeOff, reason: value })}
              placeholder="e.g., Holiday, Sick leave"
            />
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addTimeOff}>
            <Text style={styles.addButtonText}>➕ Add Time Off</Text>
          </TouchableOpacity>
        </View>

        {/* Time Off List */}
        {timeOff.length > 0 && (
          <View style={styles.timeOffList}>
            {timeOff.map(entry => (
              <View key={entry.id} style={styles.timeOffCard}>
                <View style={styles.timeOffInfo}>
                  <Text style={styles.timeOffDates}>
                    {entry.start_date} to {entry.end_date}
                  </Text>
                  {entry.reason && <Text style={styles.timeOffReason}>{entry.reason}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => entry.id && confirmDeleteTimeOff(entry.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Time Picker Modal */}
      {showTimePicker.day &&
        showTimePicker.field &&
        (Platform.OS === 'web' ? (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimePicker({})}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TimePickerWheel
                  value={
                    schedules.find(s => s.day_of_week === showTimePicker.day)?.[
                      showTimePicker.field!
                    ] || '08:00'
                  }
                  onChange={value => {
                    if (showTimePicker.day && showTimePicker.field) {
                      updateSchedule(showTimePicker.day, showTimePicker.field, value);
                    }
                  }}
                  minuteInterval={15}
                />
                <TouchableOpacity style={styles.modalButton} onPress={() => setShowTimePicker({})}>
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (() => {
          const DateTimePicker = getDateTimePicker();
          return DateTimePicker ? (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              minuteInterval={15}
            />
          ) : null;
        })())}

      {/* Date Picker Modal */}
      {showDatePicker.field &&
        (Platform.OS === 'web' ? (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker({})}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Select {showDatePicker.field === 'start_date' ? 'Start' : 'End'} Date
                </Text>
                <CalendarPicker
                  value={
                    tempSelectedDate ||
                    (showDatePicker.field === 'start_date' && newTimeOff.start_date
                      ? new Date(newTimeOff.start_date)
                      : showDatePicker.field === 'end_date' && newTimeOff.end_date
                      ? new Date(newTimeOff.end_date)
                      : new Date())
                  }
                  onChange={date => {
                    setTempSelectedDate(date);
                  }}
                  minDate={
                    showDatePicker.field === 'end_date' && newTimeOff.start_date
                      ? new Date(newTimeOff.start_date)
                      : new Date()
                  }
                  disabledDates={getDisabledDates()}
                  showActions={false}
                />
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#6c757d', marginRight: 8 }]}
                    onPress={() => {
                      setShowDatePicker({});
                      setTempSelectedDate(null);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      if (tempSelectedDate) {
                        handleDatePickerConfirm(tempSelectedDate);
                      }
                    }}
                  >
                    <Text style={styles.modalButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : (() => {
          const DateTimePicker = getDateTimePicker();
          return DateTimePicker ? (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          ) : null;
        })())}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDelete !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>⚠️ Delete Time Off</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this time off period?
            </Text>
            <Text style={styles.confirmModalSubtext}>This action cannot be undone.</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        visible={showDiscardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>⚠️ Unsaved Changes</Text>
            <Text style={styles.confirmModalText}>
              You have unsaved changes to your schedule! Choose an option below:
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDiscardModal(false);
                  setPendingNavigation(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.saveAndContinueButton]}
                onPress={handleSaveAndContinue}
                disabled={saving}
              >
                <Text style={styles.saveAndContinueButtonText}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.deleteConfirmButton]}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.deleteConfirmButtonText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  unsavedBadge: {
    position: 'absolute',
    top: -4,
    right: 16,
  },
  unsavedBadgeText: {
    fontSize: 32,
    color: '#ffc107',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  enableAllCard: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#28a745',
  },
  enableAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enableAllLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  enableAllDescription: {
    fontSize: 13,
    color: '#2e7d32',
    marginTop: 6,
    fontStyle: 'italic',
  },
  dayCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeInputs: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  timeGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  timePickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 14,
    color: '#333',
  },
  timePickerIcon: {
    fontSize: 16,
  },
  datePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  datePickerIcon: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  timeOffForm: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeOffList: {
    marginTop: 16,
  },
  timeOffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeOffInfo: {
    flex: 1,
  },
  timeOffDates: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeOffReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedCountText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedDatesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedDatesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  selectedDateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  removeChipButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeChipText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    flex: 1,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmModalSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveAndContinueButton: {
    backgroundColor: '#28a745',
  },
  saveAndContinueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
