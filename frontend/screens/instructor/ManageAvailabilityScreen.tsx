/**
 * Instructor Availability Management Screen
 * Allows instructors to set up their weekly schedule and manage availability
 */
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import ApiService from '../../services/api';

// Conditional imports for web and native
let TimePickerWheel: any;
let CalendarPicker: any;
let DateTimePicker: any;

if (Platform.OS === 'web') {
  TimePickerWheel = require('../../components/TimePickerWheel').default;
  CalendarPicker = require('../../components/CalendarPicker').default;
} else {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

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

export default function ManageAvailabilityScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [newTimeOff, setNewTimeOff] = useState<TimeOff>({
    start_date: '',
    end_date: '',
    reason: '',
    notes: '',
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]); // Array of selected dates for multi-select

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

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const [scheduleRes, timeOffRes] = await Promise.all([
        ApiService.get('/availability/schedule'),
        ApiService.get('/availability/time-off'),
      ]);

      setSchedules(scheduleRes.data || []);
      setTimeOff(timeOffRes.data || []);

      // Initialize empty schedules for days without entries
      DAYS_OF_WEEK.forEach(day => {
        if (!scheduleRes.data.find((s: Schedule) => s.day_of_week === day)) {
          setSchedules(prev => [
            ...prev,
            {
              day_of_week: day,
              start_time: '08:00',
              end_time: '17:00',
              is_active: false,
            },
          ]);
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
    setSchedules(prev =>
      prev.map(schedule =>
        schedule.day_of_week === day ? { ...schedule, [field]: value } : schedule
      )
    );
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
      if (selectedDates.length === 0) {
        setMessage({ type: 'warning', text: 'Please select at least one date' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Create time off entries for each selected date
      for (const dateStr of selectedDates) {
        await ApiService.post('/availability/time-off', {
          start_date: dateStr,
          end_date: dateStr,
          reason: newTimeOff.reason || 'Unavailable',
          notes: newTimeOff.notes,
        });
      }

      setMessage({
        type: 'success',
        text: `Time off added for ${selectedDates.length} date(s) successfully!`,
      });
      setTimeout(() => setMessage(null), 4000);

      setNewTimeOff({
        start_date: '',
        end_date: '',
        reason: '',
        notes: '',
      });
      setSelectedDates([]);

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
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this time off?')) {
        deleteTimeOff(id);
      }
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this time off?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTimeOff(id) },
      ]);
    }
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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📅 Manage Availability</Text>
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
            <Text style={styles.label}>Select Unavailable Dates</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker({ field: 'start_date' })}
            >
              <Text style={styles.datePickerText}>
                {selectedDates.length > 0
                  ? `${selectedDates.length} date(s) selected`
                  : 'Select Dates'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* Display Selected Dates */}
          {selectedDates.length > 0 && (
            <View style={styles.selectedDatesContainer}>
              <Text style={styles.selectedDatesLabel}>Selected Dates:</Text>
              <View style={styles.selectedDatesList}>
                {selectedDates.map((date, index) => (
                  <View key={index} style={styles.selectedDateChip}>
                    <Text style={styles.selectedDateText}>{date}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                      style={styles.removeChipButton}
                    >
                      <Text style={styles.removeChipText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

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
            <Text style={styles.addButtonText}>
              ➕ Add Time Off {selectedDates.length > 0 ? `(${selectedDates.length})` : ''}
            </Text>
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
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            minuteInterval={15}
          />
        ))}

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
                <Text style={styles.modalTitle}>Select Unavailable Dates</Text>
                <Text style={styles.modalSubtitle}>Click multiple dates, then click Done</Text>
                <CalendarPicker
                  value={new Date()}
                  onChange={date => {
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const dateString = `${year}-${month}-${day}`;

                    // Toggle date selection
                    setSelectedDates(prev =>
                      prev.includes(dateString)
                        ? prev.filter(d => d !== dateString)
                        : [...prev, dateString]
                    );
                  }}
                  minDate={new Date()}
                />
                <View style={styles.modalFooter}>
                  {selectedDates.length > 0 && (
                    <Text style={styles.selectedCountText}>
                      {selectedDates.length} date(s) selected
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowDatePicker({})}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalFooter: {
    marginTop: 16,
    gap: 8,
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
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
