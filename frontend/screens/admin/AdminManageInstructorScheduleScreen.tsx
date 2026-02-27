/**
 * Admin Manage Instructor Schedule Screen
 * Allows admins to set up schedules and time-off dates for instructors
 */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useTheme } from '../../theme/ThemeContext';
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
  const { instructorId, instructorName, setupToken } = route.params;
  const navInstance = navProp || useNavigation();
  const { colors } = useTheme();

  // URL builder: uses unauthenticated setup endpoints when a one-time setup_token
  // is present (instructor initial schedule setup before account verification).
  const scheduleBase = setupToken
    ? `/instructors/setup/${instructorId}`
    : `/admin/instructors/${instructorId}`;
  const setupSuffix = setupToken ? `?setup_token=${encodeURIComponent(setupToken)}` : '';
  const scheduleUrl = (path: string) => `${scheduleBase}${path}${setupSuffix}`;
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
    // After save, dispatch pending navigation
    if (pendingNavigation) {
      navInstance.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const [scheduleRes, timeOffRes] = await Promise.all([
        ApiService.get(scheduleUrl('/schedule')),
        ApiService.get(scheduleUrl('/time-off')),
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
            await ApiService.put(scheduleUrl(`/schedule/${schedule.id}`), {
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              is_active: schedule.is_active,
            });
          }
        } else if (!schedule.id && schedule.is_active) {
          // Create new schedule if it doesn't exist and is active
          const created = await ApiService.post(scheduleUrl('/schedule'), {
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
      await ApiService.delete(scheduleUrl(`/schedule/${scheduleId}`));
      
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
        scheduleUrl('/time-off'),
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
      await ApiService.delete(scheduleUrl(`/time-off/${timeOffId}`));
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebNavigationHeader
          title={`${instructorName}'s Schedule`}
          onBack={() => navInstance.goBack()}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title={`${instructorName}'s Schedule`}
        onBack={() => navInstance.goBack()}
        showBackButton={true}
      />
      <ScrollView ref={scrollViewRef} style={styles.scrollContent}>
        {successMessage ? <InlineMessage message={successMessage} type="success" /> : null}
        {errorMessage ? <InlineMessage message={errorMessage} type="error" /> : null}

        {/* Weekly Schedule */}
        <Card variant="elevated" style={{ marginVertical: 10, marginHorizontal: Platform.OS === 'web' ? 20 : 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Schedule</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Set the instructor's default weekly availability</Text>

          <View style={[styles.enableAllCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.enableAllHeader}>
              <Text style={[styles.enableAllLabel, { color: colors.text }]}>Enable All Days</Text>
              <Switch
                value={schedules.every((s) => s.is_active)}
                onValueChange={toggleAllDays}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>
            <Text style={[styles.enableAllDescription, { color: colors.textMuted }]}>
              Quickly enable or disable all days
            </Text>
          </View>

          {schedules.map((schedule) => (
            <View key={schedule.day_of_week} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: colors.text }]}>{DAY_LABELS[schedule.day_of_week]}</Text>
                <Switch
                  value={schedule.is_active}
                  onValueChange={() => toggleDay(schedule.day_of_week)}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={schedule.is_active ? '#fff' : '#f4f3f4'}
                />
              </View>

              {schedule.is_active && (
                <View style={styles.timeRow}>
                  <Pressable
                    style={[styles.timeButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowTimePicker({ day: schedule.day_of_week, field: 'start_time' })}
                  >
                    <Text style={styles.timeButtonText}>{schedule.start_time}</Text>
                  </Pressable>
                  <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>to</Text>
                  <Pressable
                    style={[styles.timeButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowTimePicker({ day: schedule.day_of_week, field: 'end_time' })}
                  >
                    <Text style={styles.timeButtonText}>{schedule.end_time}</Text>
                  </Pressable>
                  {schedule.id && (
                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: colors.danger }]}
                      onPress={() => setConfirmDelete(schedule.id!)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))}

          <Button
            variant="primary"
            fullWidth
            style={{ backgroundColor: colors.success, marginTop: 20 }}
            onPress={handleSaveSchedule}
            disabled={saving || !hasUnsavedChanges}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </Card>

        {/* Time Off */}
        <Card variant="elevated" style={{ marginVertical: 10, marginHorizontal: Platform.OS === 'web' ? 20 : 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Off</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Block out dates when instructor is unavailable</Text>

          {/* Existing Time Off */}
          {timeOff.map((item) => (
            <View key={item.id} style={[styles.timeOffCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.timeOffDates, { color: colors.text }]}>
                {item.start_date} to {item.end_date}
              </Text>
              {item.reason && <Text style={[styles.timeOffReason, { color: colors.textSecondary }]}>{item.reason}</Text>}
              <Button
                variant="danger"
                size="sm"
                onPress={() => setConfirmDeleteTimeOff(item.id!)}
              >
                Delete
              </Button>
            </View>
          ))}

          {/* Add New Time Off */}
          <View style={[styles.addTimeOffSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.addTimeOffTitle, { color: colors.text }]}>Add New Time Off</Text>
            
            <View style={styles.dateRow}>
              <Pressable
                style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowDatePicker({ field: 'start_date' })}
              >
                <Text style={[styles.dateButtonLabel, { color: colors.textMuted }]}>Start Date</Text>
                <Text style={[styles.dateButtonValue, { color: colors.text }]}>
                  {newTimeOff.start_date || 'Select...'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowDatePicker({ field: 'end_date' })}
              >
                <Text style={[styles.dateButtonLabel, { color: colors.textMuted }]}>End Date</Text>
                <Text style={[styles.dateButtonValue, { color: colors.text }]}>
                  {newTimeOff.end_date || 'Select...'}
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={[styles.reasonInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.textMuted}
              value={newTimeOff.reason}
              onChangeText={(text) => setNewTimeOff({ ...newTimeOff, reason: text })}
            />

            <Button variant="primary" fullWidth onPress={handleAddTimeOff}>
              Add Time Off
            </Button>
          </View>
        </Card>
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
      <ThemedModal
        visible={!!showDatePicker.field}
        onClose={() => {
          setShowDatePicker({});
          setTempSelectedDate(null);
        }}
        title={`Select ${showDatePicker.field === 'start_date' ? 'Start' : 'End'} Date`}
      >
        {showDatePicker.field && (
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
        )}
      </ThemedModal>

      {/* Confirm Delete Schedule Modal */}
      <ThemedModal
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Schedule Entry"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={() => confirmDelete && handleDeleteSchedule(confirmDelete)}>
              Delete
            </Button>
          </View>
        }
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to delete this schedule entry? This cannot be undone.
        </Text>
      </ThemedModal>

      {/* Confirm Delete Time Off Modal */}
      <ThemedModal
        visible={!!confirmDeleteTimeOff}
        onClose={() => setConfirmDeleteTimeOff(null)}
        title="Delete Time Off"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmDeleteTimeOff(null)}>
              Cancel
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={() => confirmDeleteTimeOff && handleDeleteTimeOff(confirmDeleteTimeOff)}>
              Delete
            </Button>
          </View>
        }
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular' }}>
          Are you sure you want to delete this time off entry?
        </Text>
      </ThemedModal>

      {/* Unsaved Changes Modal */}
      <ThemedModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="Unsaved Changes"
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="danger" style={{ flex: 1 }} onPress={handleDiscardChanges}>
              Discard
            </Button>
            <Button variant="primary" style={{ flex: 1, backgroundColor: colors.success }} onPress={handleSaveAndContinue}>
              Save & Leave
            </Button>
          </View>
        }
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular' }}>
          You have unsaved changes. Do you want to save before leaving?
        </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  sectionHint: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 15,
  },
  enableAllCard: {
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
    fontFamily: 'Inter_600SemiBold',
  },
  enableAllDescription: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
  },
  dayRow: {
    marginBottom: 15,
    borderBottomWidth: 1,
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
    fontFamily: 'Inter_600SemiBold',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_600SemiBold',
  },
  timeSeparator: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 5,
    fontFamily: 'Inter_400Regular',
  },
  deleteButton: {
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 10,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 13 : 11,
    fontFamily: 'Inter_600SemiBold',
  },
  timeOffCard: {
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeOffDates: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 5,
  },
  timeOffReason: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
  },
  addTimeOffSection: {
    marginTop: 20,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
  },
  addTimeOffTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 15,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 10 : 8,
    marginBottom: 10,
  },
  dateButton: {
    flex: 1,
    padding: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_600SemiBold',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
  },
});
