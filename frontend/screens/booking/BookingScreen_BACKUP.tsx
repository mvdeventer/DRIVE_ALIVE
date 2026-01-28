/**
 * Booking Screen - Book a driving lesson with selected instructor
 */
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

// Conditional import for DateTimePicker
let DateTimePicker: any;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instructor_id: number;
  license_number: string;
  license_types: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  province?: string;
  city: string;
  suburb?: string;
  is_available: boolean;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface AvailableSlots {
  date: string;
  slots: TimeSlot[];
}

interface SelectedBooking {
  date: string;
  slot: TimeSlot;
  time: string;
}

export default function BookingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const instructor = (route.params as any)?.instructor as Instructor;

  const [formData, setFormData] = useState({
    duration_minutes: '60',
    pickup_address: '',
    notes: '',
  });

  // Step-by-step booking flow
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<SelectedBooking[]>([]);
  const [showSlotSelection, setShowSlotSelection] = useState(false);

  const loadSlotsForDate = async (date: Date) => {
    try {
      setLoadingSlots(true);
      const dateStr = date.toISOString().split('T')[0];

      console.log('Loading slots for date:', dateStr);
      console.log('Duration:', formData.duration_minutes, 'minutes');

      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/slots`,
        {
          params: {
            start_date: dateStr,
            end_date: dateStr, // Only get slots for this specific date
            duration_minutes: parseInt(formData.duration_minutes) || 60,
          },
        }
      );

      console.log('Available slots response:', response.data);

      if (response.data.availability && response.data.availability.length > 0) {
        setAvailableSlotsForDate(response.data.availability[0].slots || []);
        setShowSlotSelection(true);
      } else {
        setAvailableSlotsForDate([]);
        if (Platform.OS === 'web') {
          alert('No available time slots for this date. Please select another date.');
        } else {
          Alert.alert(
            'No Slots Available',
            'No available time slots for this date. Please select another date.'
          );
        }
      }
    } catch (error: any) {
      console.error('Error loading available slots:', error);

      if (Platform.OS === 'web') {
        alert('Failed to load available slots. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to load available slots. Please try again.');
      }
      setAvailableSlotsForDate([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    loadSlotsForDate(date);
  };

  const handleAddSlot = (slot: TimeSlot) => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const startTime = new Date(slot.start_time);
    const timeStr = startTime.toTimeString().split(' ')[0].substring(0, 5);

    // Check if this exact slot is already selected
    const exists = selectedBookings.some(
      booking => booking.date === dateStr && booking.slot.start_time === slot.start_time
    );

    if (exists) {
      if (Platform.OS === 'web') {
        alert('This time slot is already added to your bookings.');
      } else {
        Alert.alert('Already Added', 'This time slot is already added to your bookings.');
      }
      return;
    }

    // Add to bookings
    setSelectedBookings(prev => [...prev, { date: dateStr, slot, time: timeStr }]);

    // Reset for next selection
    setShowSlotSelection(false);
    setSelectedDate(null);
    setAvailableSlotsForDate([]);

    if (Platform.OS === 'web') {
      alert(`✅ Time slot added! Click "Add Another Date/Time" to add more lessons.`);
    } else {
      Alert.alert('Added', 'Time slot added! Tap "Add Another Date/Time" to add more lessons.');
    }
  };

  const handleAddAnotherDateTime = () => {
    setShowSlotSelection(false);
    setSelectedDate(null);
    setAvailableSlotsForDate([]);
    setShowDatePicker(true);
  };

  const handleRemoveBooking = (index: number) => {
    setSelectedBookings(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.reload();
      } else {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user_role');
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePrice = () => {
    const hours = parseInt(formData.duration_minutes) / 60;
    const pricePerBooking = (instructor?.hourly_rate || 0) * hours;
    return pricePerBooking * selectedBookings.length;
  };

  const handleSubmitBooking = async () => {
    // Validate form
    if (selectedBookings.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one time slot');
      } else {
        Alert.alert('Validation Error', 'Please select at least one time slot');
      }
      return;
    }

    if (!formData.pickup_address) {
      if (Platform.OS === 'web') {
        alert('Please enter your pickup address');
      } else {
        Alert.alert('Validation Error', 'Please enter your pickup address');
      }
      return;
    }

    setLoading(true);
    try {
      // Prepare all bookings data
      const bookingsData = selectedBookings.map(booking => {
        const lessonDateTime = `${booking.date}T${booking.time}:00`;

        return {
          instructor_id: instructor.instructor_id,
          lesson_date: lessonDateTime,
          duration_minutes: parseInt(formData.duration_minutes),
          lesson_type: 'standard',
          pickup_latitude: 0, // TODO: Get from geocoding
          pickup_longitude: 0, // TODO: Get from geocoding
          pickup_address: formData.pickup_address,
          dropoff_latitude: null,
          dropoff_longitude: null,
          dropoff_address: null,
          student_notes: formData.notes || null,
        };
      });

      // Use bulk booking endpoint for atomic creation
      const response = await ApiService.post('/bookings/bulk', bookingsData);

      if (Platform.OS === 'web') {
        alert(
          `✅ ${response.data.length} Booking${
            response.data.length > 1 ? 's' : ''
          } confirmed!\n\nYou will receive confirmation shortly.`
        );
      } else {
        Alert.alert(
          '✅ Bookings Confirmed',
          `${response.data.length} lesson${
            response.data.length > 1 ? 's' : ''
          } booked successfully!\n\nYou will receive confirmation shortly.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to create bookings';

      if (Platform.OS === 'web') {
        alert(`❌ Booking Failed\n\n${errorMsg}`);
      } else {
        Alert.alert('Booking Failed', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!instructor) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No instructor selected</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Lesson</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Instructor Info Card */}
        <View style={styles.instructorCard}>
          <Text style={styles.sectionTitle}>Instructor Details</Text>
          <View style={styles.instructorInfo}>
            <Text style={styles.instructorName}>
              {instructor.first_name} {instructor.last_name}
              {instructor.is_verified && ' ✅'}
            </Text>
            <Text style={styles.instructorDetail}>
              🚗 {instructor.vehicle_make} {instructor.vehicle_model} ({instructor.vehicle_year})
            </Text>
            <Text style={styles.instructorDetail}>
              📍{' '}
              {[instructor.province, instructor.city, instructor.suburb].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.instructorDetail}>
              ⭐ {instructor.rating.toFixed(1)} ({instructor.total_reviews} reviews)
            </Text>
            <Text style={styles.instructorDetail}>💰 R{instructor.hourly_rate}/hr</Text>
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Lesson Details</Text>

          {/* Duration Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <View style={styles.durationButtons}>
              {['30', '60', '90', '120'].map(duration => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationButton,
                    formData.duration_minutes === duration && styles.durationButtonActive,
                  ]}
                  onPress={() => updateField('duration_minutes', duration)}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      formData.duration_minutes === duration && styles.durationButtonTextActive,
                    ]}
                  >
                    {duration} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Available Time Slots */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Select Available Time Slot <Text style={styles.required}>*</Text>
            </Text>

            {/* Debug Info */}
            <View
              style={{ backgroundColor: '#f0f0f0', padding: 10, marginBottom: 10, borderRadius: 5 }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                🔍 Debug Info:{'\n'}
                Instructor ID: {instructor.instructor_id}
                {'\n'}
                API URL: /availability/instructor/{instructor.instructor_id}/slots{'\n'}
                Slots loaded: {availableSlots.length} dates{'\n'}
                Total slots: {availableSlots.reduce((sum, day) => sum + day.slots.length, 0)}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#007bff', padding: 8, borderRadius: 4, marginTop: 8 }}
                onPress={loadAvailableSlots}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>
                  🔄 Reload Slots (Check Console)
                </Text>
              </TouchableOpacity>
            </View>

            {loadingSlots ? (
              <View style={styles.loadingSlotsContainer}>
                <ActivityIndicator size="small" color="#007bff" />
                <Text style={styles.loadingSlotsText}>Loading available times...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.noSlotsContainer}>
                <Text style={styles.noSlotsTitle}>😔 No Available Time Slots</Text>
                <Text style={styles.noSlotsText}>
                  This instructor hasn't set up their availability schedule yet, or all their time
                  slots are fully booked for the selected duration.
                </Text>
                <Text style={styles.noSlotsHint}>
                  Please try:{'\n'}• Selecting a different lesson duration{'\n'}• Contacting the
                  instructor directly{'\n'}• Choosing another instructor
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.slotsContainer} nestedScrollEnabled>
                {availableSlots.map(daySlots => (
                  <View key={daySlots.date} style={styles.daySection}>
                    <Text style={styles.dayLabel}>
                      {new Date(daySlots.date).toLocaleDateString('en-ZA', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <View style={styles.slotsList}>
                      {daySlots.slots.map((slot, index) => {
                        const startTime = new Date(slot.start_time);
                        const endTime = new Date(slot.end_time);
                        const isSelected = isSlotSelected(slot, daySlots.date);

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[styles.slotButton, isSelected && styles.slotButtonSelected]}
                            onPress={() => handleSelectSlot(slot, daySlots.date)}
                          >
                            <Text
                              style={[
                                styles.slotButtonText,
                                isSelected && styles.slotButtonTextSelected,
                              ]}
                            >
                              {startTime.toLocaleTimeString('en-ZA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {endTime.toLocaleTimeString('en-ZA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Selected Bookings Display */}
          {selectedBookings.length > 0 && (
            <View style={styles.selectedBookingsContainer}>
              <View style={styles.selectedBookingsHeader}>
                <Text style={styles.selectedBookingsTitle}>
                  📅 Selected Lessons ({selectedBookings.length})
                </Text>
                {selectedBookings.length > 1 && (
                  <Text style={styles.selectedBookingsHint}>Tap on a slot again to remove it</Text>
                )}
              </View>
              {selectedBookings.map((booking, index) => (
                <View key={index} style={styles.selectedBookingCard}>
                  <View style={styles.selectedBookingInfo}>
                    <Text style={styles.selectedBookingDate}>
                      {new Date(booking.date).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.selectedBookingTime}>
                      🕐 {booking.time} ({formData.duration_minutes} min)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBookingButton}
                    onPress={() => handleRemoveBooking(index)}
                  >
                    <Text style={styles.removeBookingButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.addMoreHint}>
                <Text style={styles.addMoreHintText}>
                  💡 Tip: Click on more time slots above to add additional lessons
                </Text>
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Pickup Address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your pickup location"
              value={formData.pickup_address}
              onChangeText={value => updateField('pickup_address', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special requests or information for the instructor"
              value={formData.notes}
              onChangeText={value => updateField('notes', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Number of Lessons:</Text>
            <Text style={styles.priceValue}>{selectedBookings.length}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Duration per Lesson:</Text>
            <Text style={styles.priceValue}>{formData.duration_minutes} minutes</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Hourly Rate:</Text>
            <Text style={styles.priceValue}>R{instructor.hourly_rate}/hr</Text>
          </View>
          {selectedBookings.length > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price per Lesson:</Text>
              <Text style={styles.priceValue}>
                R{((instructor.hourly_rate * parseInt(formData.duration_minutes)) / 60).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Price:</Text>
            <Text style={styles.totalValue}>R{calculatePrice().toFixed(2)}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitBooking}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : '📅 Confirm Booking'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerBackButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructorInfo: {
    marginTop: 4,
  },
  instructorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  instructorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  durationButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  loadingSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  loadingSlotsText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noSlotsContainer: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  noSlotsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  noSlotsHint: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'left',
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 6,
  },
  slotsContainer: {
    maxHeight: 300,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  daySection: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  slotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginRight: 8,
    marginBottom: 8,
  },
  slotButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  slotButtonText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  slotButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedBookingsContainer: {
    backgroundColor: '#e7f5ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  selectedBookingsHeader: {
    marginBottom: 12,
  },
  selectedBookingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  selectedBookingsHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedBookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  selectedBookingInfo: {
    flex: 1,
  },
  selectedBookingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  selectedBookingTime: {
    fontSize: 13,
    color: '#666',
  },
  removeBookingButton: {
    backgroundColor: '#dc3545',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeBookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMoreHint: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  addMoreHintText: {
    fontSize: 12,
    color: '#007bff',
    textAlign: 'center',
  },
  selectedSlotCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  selectedSlotTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  selectedSlotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedSlotTime: {
    fontSize: 14,
    color: '#666',
  },
});
