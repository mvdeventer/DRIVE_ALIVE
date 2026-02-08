/**
 * Admin Manage Instructor Schedule Screen
 * Allows admins to set up schedules and time-off dates for instructors
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

export default function AdminManageInstructorScheduleScreen({ route, navigation: navProp }: any) {
  const { instructorId, instructorName } = route.params;
  const navInstance = navProp || useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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
  const [confirmDeleteTimeOff, setConfirmDeleteTimeOff] = useState<number | null>(null);
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
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadAvailability();
  }, [instructorId]);

  // Reload availability when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAvailability();
    }, [instructorId])
  );

  // Track Time Off form changes
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
    const unsubscribe = navInstance.addListener('beforeRemove', (e: any) => {
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
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      navInstance.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveAndContinue = async () => {
    setShowDiscardModal(false);
    await handleSaveSchedule();
  };

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const [scheduleRes, timeOffRes] = await Promise.all([
        ApiService.get(`/admin/instructors/${instructorId}/schedule`),
        ApiService.get(`/admin/instructors/${instructorId}/time-off`),
      ]);

      const loadedSchedules: Schedule[] = scheduleRes.data || [];
      
      // Initialize all days if no schedule exists
      const allDaysSchedule: Schedule[] = DAYS_OF_WEEK.map((day) => {
        const existing = loadedSchedules.find((s) => s.day_of_week === day);
        return existing || {
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          is_active: false,
        };
      });

      setSchedules(allDaysSchedule);
      setOriginalSchedules(JSON.parse(JSON.stringify(allDaysSchedule)));
      setTimeOff(timeOffRes.data || []);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to load instructor schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      
      for (const schedule of schedules) {
        const original = originalSchedules.find((s) => s.day_of_week === schedule.day_of_week);
        
        if (schedule.id && original) {
          // Update existing schedule if changed
          const hasChanged =
            schedule.start_time !== original.start_time ||
            schedule.end_time !== original.end_time ||
            schedule.is_active !== original.is_active;
          
          if (hasChanged) {
            await ApiService.put(`/admin/instructors/${instructorId}/schedule/${schedule.id}`, {
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              is_active: schedule.is_active,
            });
          }
        } else if (!schedule.id && schedule.is_active) {
          // Create new schedule if it doesn't exist and is active
          const created = await ApiService.post(`/admin/instructors/${instructorId}/schedule`, {
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active,
          });
          schedule.id = created.data.id;
        }
      }

      setOriginalSchedules(JSON.parse(JSON.stringify(schedules)));
      setHasUnsavedChanges(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('Schedule saved successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to save schedule');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      await ApiService.delete(`/admin/instructors/${instructorId}/schedule/${scheduleId}`);
      
      // Update local state
      const updatedSchedules = schedules.map((s) =>
        s.id === scheduleId ? { ...s, id: undefined, is_active: false } : s
      );
      setSchedules(updatedSchedules);
      setConfirmDelete(null);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('Schedule entry deleted successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to delete schedule');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleAddTimeOff = async () => {
    if (!newTimeOff.start_date) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Please select a start date');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    try {
      const timeOffPayload = {
        ...newTimeOff,
        end_date: newTimeOff.end_date || newTimeOff.start_date,
      };

      const created = await ApiService.post(
        `/admin/instructors/${instructorId}/time-off`,
        timeOffPayload
      );
      setTimeOff([...timeOff, created.data]);
      setNewTimeOff({ start_date: '', end_date: '', reason: '', notes: '' });
      setHasUnsavedChanges(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('Time off added successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to add time off');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDeleteTimeOff = async (timeOffId: number) => {
    try {
      await ApiService.delete(`/admin/instructors/${instructorId}/time-off/${timeOffId}`);
      setTimeOff(timeOff.filter((t) => t.id !== timeOffId));
      setConfirmDeleteTimeOff(null);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('Time off deleted successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to delete time off');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const toggleDay = (day: string) => {
    const updated = schedules.map((s) =>
      s.day_of_week === day ? { ...s, is_active: !s.is_active } : s
    );
    setSchedules(updated);
    setHasUnsavedChanges(true);
  };

  const toggleAllDays = (value: boolean) => {
    const updated = schedules.map((s) => ({ ...s, is_active: value }));
    setSchedules(updated);
    setHasUnsavedChanges(true);
  };

  const updateScheduleTime = (day: string, field: 'start_time' | 'end_time', value: string) => {
    const updated = schedules.map((s) =>
      s.day_of_week === day ? { ...s, [field]: value } : s
    );
    setSchedules(updated);
    setHasUnsavedChanges(true);
  };

  const handleTimePickerConfirm = (time: string) => {
    if (showTimePicker.day && showTimePicker.field) {
      updateScheduleTime(showTimePicker.day, showTimePicker.field, time);
    }
    setShowTimePicker({});
  };

  const handleDatePickerConfirm = (date: Date | null) => {
    if (date && showDatePicker.field) {
      const formatted = date.toISOString().split('T')[0];
      setNewTimeOff({ ...newTimeOff, [showDatePicker.field]: formatted });
    }
    setShowDatePicker({});
    setTempSelectedDate(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <WebNavigationHeader
          title={`${instructorName}'s Schedule`}
          onBack={() => navInstance.goBack()}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title={`${instructorName}'s Schedule`}
        onBack={() => navInstance.goBack()}
        showBackButton={true}
      />
      <ScrollView ref={scrollViewRef} style={styles.scrollContent}>
        {successMessage ? <InlineMessage message={successMessage} type="success" /> : null}
        {errorMessage ? <InlineMessage message={errorMessage} type="error" /> : null}

        {/* Weekly Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Weekly Schedule</Text>
          <Text style={styles.sectionHint}>Set the instructor's default weekly availability</Text>

          <View style={styles.enableAllCard}>
            <View style={styles.enableAllHeader}>
              <Text style={styles.enableAllLabel}>Enable All Days</Text>
              <Switch
                value={schedules.every((s) => s.is_active)}
                onValueChange={toggleAllDays}
                trackColor={{ false: '#ccc', true: '#28a745' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>
            <Text style={styles.enableAllDescription}>
              Quickly enable or disable all days
            </Text>
          </View>

          {schedules.map((schedule) => (
            <View key={schedule.day_of_week} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{DAY_LABELS[schedule.day_of_week]}</Text>
                <Switch
                  value={schedule.is_active}
                  onValueChange={() => toggleDay(schedule.day_of_week)}
                  trackColor={{ false: '#ccc', true: '#28a745' }}
                  thumbColor={schedule.is_active ? '#fff' : '#f4f3f4'}
                />
              </View>

              {schedule.is_active && (
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ day: schedule.day_of_week, field: 'start_time' })}
                  >
                    <Text style={styles.timeButtonText}>🕐 {schedule.start_time}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSeparator}>to</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ day: schedule.day_of_week, field: 'end_time' })}
                  >
                    <Text style={styles.timeButtonText}>🕐 {schedule.end_time}</Text>
                  </TouchableOpacity>
                  {schedule.id && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => setConfirmDelete(schedule.id!)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveSchedule}
            disabled={saving || !hasUnsavedChanges}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '⏳ Saving...' : '💾 Save Schedule'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Off */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 Time Off</Text>
          <Text style={styles.sectionHint}>Block out dates when instructor is unavailable</Text>

          {/* Existing Time Off */}
          {timeOff.map((item) => (
            <View key={item.id} style={styles.timeOffCard}>
              <Text style={styles.timeOffDates}>
                📅 {item.start_date} to {item.end_date}
              </Text>
              {item.reason && <Text style={styles.timeOffReason}>{item.reason}</Text>}
              <TouchableOpacity
                style={styles.deleteTimeOffButton}
                onPress={() => setConfirmDeleteTimeOff(item.id!)}
              >
                <Text style={styles.deleteTimeOffButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add New Time Off */}
          <View style={styles.addTimeOffSection}>
            <Text style={styles.addTimeOffTitle}>➕ Add New Time Off</Text>
            
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker({ field: 'start_date' })}
              >
                <Text style={styles.dateButtonLabel}>Start Date</Text>
                <Text style={styles.dateButtonValue}>
                  {newTimeOff.start_date || 'Select...'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker({ field: 'end_date' })}
              >
                <Text style={styles.dateButtonLabel}>End Date</Text>
                <Text style={styles.dateButtonValue}>
                  {newTimeOff.end_date || 'Select...'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.reasonInput}
              placeholder="Reason (optional)"
              value={newTimeOff.reason}
              onChangeText={(text) => setNewTimeOff({ ...newTimeOff, reason: text })}
            />

            <TouchableOpacity style={styles.addButton} onPress={handleAddTimeOff}>
              <Text style={styles.addButtonText}>➕ Add Time Off</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker.day && showTimePicker.field && (
        <TimePickerWheel
          visible={true}
          onConfirm={handleTimePickerConfirm}
          onCancel={() => setShowTimePicker({})}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker.field && (
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
                onChange={handleDatePickerConfirm}
                onCancel={() => {
                  setShowDatePicker({});
                  setTempSelectedDate(null);
                }}
                minDate={
                  showDatePicker.field === 'end_date' && newTimeOff.start_date
                    ? new Date(newTimeOff.start_date)
                    : new Date()
                }
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Confirm Delete Schedule Modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmTitle}>⚠️ Delete Schedule Entry</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete this schedule entry? This cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={() => confirmDelete && handleDeleteSchedule(confirmDelete)}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Time Off Modal */}
      <Modal visible={!!confirmDeleteTimeOff} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmTitle}>⚠️ Delete Time Off</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete this time off entry?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setConfirmDeleteTimeOff(null)}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={() => confirmDeleteTimeOff && handleDeleteTimeOff(confirmDeleteTimeOff)}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unsaved Changes Modal */}
      <Modal visible={showDiscardModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmTitle}>⚠️ Unsaved Changes</Text>
            <Text style={styles.confirmMessage}>
              You have unsaved changes. Do you want to save before leaving?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.confirmCancelButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSaveButton}
                onPress={handleSaveAndContinue}
              >
                <Text style={styles.confirmSaveButtonText}>Save & Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 10,
    marginHorizontal: Platform.OS === 'web' ? 20 : 10,
    padding: Platform.OS === 'web' ? 20 : 15,
    borderRadius: 8,
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : undefined,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  sectionHint: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    marginBottom: 15,
  },
  enableAllCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: 15,
  },
  enableAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  enableAllLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    color: '#333',
  },
  enableAllDescription: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#666',
  },
  dayRow: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 8,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    paddingHorizontal: 5,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
  },
  timeOffCard: {
    backgroundColor: '#f8f9fa',
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeOffDates: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  timeOffReason: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    marginBottom: 10,
  },
  deleteTimeOffButton: {
    backgroundColor: '#dc3545',
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteTimeOffButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
  },
  addTimeOffSection: {
    marginTop: 20,
    padding: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  addTimeOffTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 10 : 8,
    marginBottom: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#666',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#333',
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
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
  confirmModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
  },
  confirmTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6c757d',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    color: '#6c757d',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  confirmSaveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmSaveButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
});
