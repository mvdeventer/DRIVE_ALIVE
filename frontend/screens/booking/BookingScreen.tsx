/**
 * Booking Screen - Book a driving lesson with selected instructor
 * Redesigned with step-by-step date and time selection
 */
import { CommonActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import CalendarPicker from '../../components/CalendarPicker';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

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
  booking_fee?: number; // Per-instructor booking fee in ZAR
  rating: number;
  total_reviews: number;
  is_verified: boolean;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_booked?: boolean; // Whether this slot is already booked by another student
}

interface SelectedBooking {
  date: string;
  slot: TimeSlot;
  time: string;
  pickup_address?: string;
}

interface ExistingBooking {
  id: number;
  instructor_id: number;
  instructor_name: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  created_at: string;
}

export default function BookingScreen({ navigation: navProp }: any) {
  const navigation = navProp || useNavigation();
  const route = useRoute();
  const instructor = (route.params as any)?.instructor as Instructor;

  const [formData, setFormData] = useState({
    duration_minutes: '60',
    pickup_address: '',
    notes: '',
  });
  const [pickupCoordinates, setPickupCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Step-by-step booking flow
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [instructorTimeOff, setInstructorTimeOff] = useState<Date[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<Date[]>([]);
  const [instructorSchedule, setInstructorSchedule] = useState<string[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<SelectedBooking[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showSlotSelection, setShowSlotSelection] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);
  const [unsavedChangesMessage, setUnsavedChangesMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{
    booking: ExistingBooking;
    fee: number;
  } | null>(null);

  // Load existing bookings and instructor time-off on mount
  useEffect(() => {
    loadExistingBookings();
    loadInstructorTimeOff();
    loadFullyBookedDates();
    loadInstructorSchedule();
  }, [instructor.instructor_id]);

  // Reload fully booked dates when duration changes
  useEffect(() => {
    loadFullyBookedDates();
  }, [formData.duration_minutes]);

  // Refresh instructor availability when screen comes into focus
  // This ensures changes made by instructor (deleting time-off) are reflected
  useFocusEffect(
    useCallback(() => {
      console.log('📱 BookingScreen focused - refreshing instructor availability');
      loadInstructorTimeOff();
      loadFullyBookedDates();
      loadInstructorSchedule();
    }, [instructor.instructor_id])
  );

  // Track unsaved changes (selected bookings or form data)
  useEffect(() => {
    const hasSelections = selectedBookings.length > 0;
    const hasPickupAddress = formData.pickup_address.trim().length > 0;
    const hasNotes = formData.notes.trim().length > 0;
    setHasUnsavedChanges(hasSelections || hasPickupAddress || hasNotes);
  }, [selectedBookings, formData.pickup_address, formData.notes]);

  // Prevent navigation if there are unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!hasUnsavedChanges) {
        return;
      }
      e.preventDefault();

      const message =
        selectedBookings.length > 0
          ? `You have ${selectedBookings.length} lesson${
              selectedBookings.length > 1 ? 's' : ''
            } selected but not yet booked.`
          : 'You have entered booking information that has not been saved.';

      setUnsavedChangesMessage(message);
      setPendingNavigation(e.data.action);
      setShowUnsavedChangesModal(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, selectedBookings.length]);

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedChangesModal(false);
    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const loadInstructorTimeOff = async () => {
    try {
      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/time-off`
      );
      const timeOffDates: Date[] = [];

      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((period: any) => {
          const start = new Date(period.start_date + 'T00:00:00');
          const end = new Date(period.end_date + 'T00:00:00');

          // Add all dates in the range
          for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            timeOffDates.push(new Date(date));
          }
        });
      }

      setInstructorTimeOff(timeOffDates);
      console.log('📅 Instructor time-off dates loaded:', timeOffDates.length);
    } catch (error) {
      console.error('Error loading instructor time-off:', error);
    }
  };

  const loadInstructorSchedule = async () => {
    try {
      console.log('📋 Loading instructor schedule...');
      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/schedule`
      );

      // Extract active days (lowercase for comparison)
      const activeDays: string[] = response.data.map((sched: any) =>
        sched.day_of_week.toLowerCase()
      );

      setInstructorSchedule(activeDays);
      console.log('✅ Instructor active days:', activeDays);

      // Calculate unavailable days for the next 90 days
      const unavailable: Date[] = [];
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90);

      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];

      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = dayNames[d.getDay()];
        if (!activeDays.includes(dayName)) {
          unavailable.push(new Date(d));
        }
      }

      setUnavailableDays(unavailable);
      console.log('🚫 Unavailable days count:', unavailable.length);
    } catch (error) {
      console.error('Error loading instructor schedule:', error);
    }
  };

  const loadFullyBookedDates = async () => {
    try {
      // Get the next 60 days of availability to find fully booked dates (backend limit)
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 60);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('🔍 Loading fully booked dates from', startDateStr, 'to', endDateStr);

      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/slots`,
        {
          params: {
            start_date: startDateStr,
            end_date: endDateStr,
            duration_minutes: parseInt(formData.duration_minutes) || 60,
            show_booked: true,
          },
        }
      );

      const fullyBooked: Date[] = [];

      if (response.data.availability && Array.isArray(response.data.availability)) {
        response.data.availability.forEach((dayData: any) => {
          // A day is fully booked if it has slots AND all slots are booked
          if (dayData.slots && dayData.slots.length > 0) {
            const allSlotsBooked = dayData.slots.every((slot: TimeSlot) => slot.is_booked);
            if (allSlotsBooked) {
              // Parse date and normalize to UTC midnight for consistent comparison
              const [year, month, day] = dayData.date.split('-').map(Number);
              const bookedDate = new Date(Date.UTC(year, month - 1, day));
              fullyBooked.push(bookedDate);
              console.log(
                '🔴 Fully booked date found:',
                dayData.date,
                '→',
                bookedDate.toISOString()
              );
            }
          }
        });
      }

      setFullyBookedDates(fullyBooked);
      console.log('🔴 Total fully booked dates:', fullyBooked.length);
    } catch (error) {
      console.error('Error loading fully booked dates:', error);
    }
  };

  const loadExistingBookings = async () => {
    try {
      setLoadingExisting(true);
      const response = await ApiService.get('/bookings/my-bookings');

      // Get ALL future bookings (not filtered by instructor) to check for conflicts across all instructors
      const allFutureBookings = response.data.filter(
        (booking: ExistingBooking) =>
          booking.status !== 'cancelled' && new Date(booking.scheduled_time) > new Date()
      );

      setExistingBookings(allFutureBookings);
      console.log('📅 Loaded existing bookings:', allFutureBookings.length);
    } catch (error: any) {
      console.error('Error loading existing bookings:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Check if a slot conflicts with any existing student bookings (across ALL instructors)
  // Returns the conflicting booking if found, otherwise null
  const isSlotConflictingWithExisting = (
    slotStart: string,
    slotEnd: string
  ): ExistingBooking | null => {
    const slotStartTime = new Date(slotStart);
    const slotEndTime = new Date(slotEnd);

    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.scheduled_time);
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000);

      // Check for overlap: slots conflict if they don't end before the other starts
      if (!(slotEndTime <= bookingStart || slotStartTime >= bookingEnd)) {
        return booking; // Return the conflicting booking
      }
    }
    return null;
  };

  const loadSlotsForDate = async (date: Date) => {
    try {
      setLoadingSlots(true);
      // Format date as YYYY-MM-DD using local timezone (not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      console.log('Loading slots for date:', dateStr);
      console.log('Duration:', formData.duration_minutes, 'minutes');

      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/slots`,
        {
          params: {
            start_date: dateStr,
            end_date: dateStr,
            duration_minutes: parseInt(formData.duration_minutes) || 60,
            show_booked: true, // Include booked slots to show them as disabled
          },
        }
      );

      console.log('Available slots response:', response.data);

      if (response.data.availability && response.data.availability.length > 0) {
        const slots = response.data.availability[0].slots || [];

        // Mark slots that conflict with student's existing bookings (any instructor)
        const slotsWithConflicts = slots.map((slot: TimeSlot) => {
          const conflictingBooking = isSlotConflictingWithExisting(slot.start_time, slot.end_time);
          const isDifferentInstructor =
            conflictingBooking && conflictingBooking.instructor_id !== instructor.instructor_id;
          return {
            ...slot,
            conflicting_booking: conflictingBooking, // Store reference to conflicting booking
            has_student_conflict: conflictingBooking !== null, // Flag for student's own conflict
            is_same_instructor_conflict: conflictingBooking !== null && !isDifferentInstructor, // Same instructor
            is_different_instructor_conflict: isDifferentInstructor, // Different instructor
            is_booked: slot.is_booked, // Keep original is_booked status (booked by others)
          };
        });

        console.log('✅ Slots received:', slotsWithConflicts.length);
        console.log('📋 Sample slot:', slotsWithConflicts[0]);
        console.log(
          '🔒 Booked/Conflict slots:',
          slotsWithConflicts.filter((s: any) => s.is_booked).length
        );
        console.log(
          '✨ Available slots:',
          slotsWithConflicts.filter((s: any) => !s.is_booked).length
        );
        setAvailableSlotsForDate(slotsWithConflicts);
        setShowSlotSelection(true);
      } else {
        console.log('❌ No availability - instructor has no schedule for this date');
        setAvailableSlotsForDate([]);
        setShowSlotSelection(true);
      }
    } catch (error: any) {
      console.error('Error loading available slots:', error);
      setMessage({ type: 'error', text: 'Failed to load available slots. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
      setAvailableSlotsForDate([]);
      setShowSlotSelection(false);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    loadSlotsForDate(date);
  };

  const handleAddSlot = (slot: any) => {
    if (!selectedDate) return;

    // Check if there's a conflicting booking with student's own appointment
    if (slot.conflicting_booking) {
      const conflictBooking = slot.conflicting_booking;
      const conflictDate = new Date(conflictBooking.scheduled_time);
      const conflictTime = conflictDate.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const conflictDateStr = conflictDate.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Show detailed conflict information
      if (conflictBooking.instructor_id !== instructor.instructor_id) {
        // Different instructor - show error with instructor details
        setMessage({
          type: 'error',
          text: `❌ Booking Conflict: You already have a booking with ${conflictBooking.instructor_name} on ${conflictDateStr} at ${conflictTime} (${conflictBooking.duration_minutes} minutes). Please cancel that lesson in your Student Home page first before booking with ${instructor.first_name} ${instructor.last_name}.`,
        });
      } else {
        // Same instructor - show error message
        setMessage({
          type: 'error',
          text: `❌ Already Booked: You already have a booking with this instructor (${instructor.first_name} ${instructor.last_name}) on ${conflictDateStr} at ${conflictTime} (${conflictBooking.duration_minutes} minutes). Please cancel it in your Student Home page first.`,
        });
      }
      setTimeout(() => setMessage(null), 8000);
      return;
    }

    // Prevent selecting booked slots (by other students)
    if (slot.is_booked) {
      setMessage({
        type: 'error',
        text: 'This time slot is already booked by another student with this instructor. Please select a different time.',
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    // Check if slot is in the past
    const slotDateTime = new Date(slot.start_time);
    const now = new Date();
    if (slotDateTime <= now) {
      setMessage({
        type: 'error',
        text: 'Cannot book lessons in the past. Please select a future time slot.',
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Format date without timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const startTime = new Date(slot.start_time);
    const timeStr = startTime.toTimeString().split(' ')[0].substring(0, 5);

    // Check if this exact slot is already selected
    const existingIndex = selectedBookings.findIndex(
      booking => booking.date === dateStr && booking.slot.start_time === slot.start_time
    );

    if (existingIndex !== -1) {
      // Deselect: Remove from selected bookings
      setSelectedBookings(prev => prev.filter((_, index) => index !== existingIndex));
      setMessage({ type: 'info', text: '✓ Time slot deselected' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Add to bookings with pickup address
    setSelectedBookings(prev => [
      ...prev,
      { date: dateStr, slot, time: timeStr, pickup_address: formData.pickup_address },
    ]);

    setMessage({ type: 'success', text: '✓ Time slot added' });
    setTimeout(() => setMessage(null), 2000);
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

  const handleCancelExistingBooking = async (booking: ExistingBooking) => {
    const lessonDateTime = new Date(booking.lesson_date);
    const now = new Date();
    const hoursUntilLesson = (lessonDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let cancelFee = 0;

    if (hoursUntilLesson < 6) {
      // Calculate 50% cancellation fee
      const hours = booking.duration_minutes / 60;
      cancelFee = instructor.hourly_rate * hours * 0.5;
    }

    // Show inline confirmation
    setConfirmCancel({ booking, fee: cancelFee });
  };

  const confirmCancellation = async () => {
    if (!confirmCancel) return;
    const { booking, fee: cancelFee } = confirmCancel;
    setConfirmCancel(null);

    try {
      setLoading(true);

      // Cancel the booking
      await ApiService.patch(`/bookings/${booking.id}`, {
        status: 'cancelled',
        cancellation_fee: cancelFee,
      });

      setMessage({
        type: 'success',
        text: `✅ Lesson cancelled successfully.${
          cancelFee > 0 ? ` A cancellation fee of R${cancelFee.toFixed(2)} will be charged.` : ''
        }`,
      });
      setTimeout(() => setMessage(null), 5000);

      // Reload bookings
      await loadExistingBookings();
    } catch (error: any) {
      console.error('Cancellation error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to cancel booking';
      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
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

  const updateField = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Reload slots if duration changes and a date is already selected
    if (field === 'duration_minutes' && selectedDate) {
      console.log('🔄 Duration changed to:', value, 'minutes - reloading slots...');

      // Warn if there are existing bookings with different duration
      if (selectedBookings.length > 0) {
        const hasConflict = selectedBookings.some(
          booking => booking.slot.duration_minutes !== parseInt(value)
        );

        if (hasConflict) {
          setMessage({
            type: 'warning',
            text: `⚠️ Changing duration will clear your current selections. All lessons must have the same duration.`,
          });
          setTimeout(() => setMessage(null), 4000);
          // Clear selected bookings since they have different durations
          setSelectedBookings([]);
        }
      }

      // Clear current slots first to show loading state
      setAvailableSlotsForDate([]);
      setLoadingSlots(true);
      // Use the new value directly instead of waiting for state update
      setTimeout(() => {
        loadSlotsWithDuration(selectedDate, parseInt(value));
      }, 100); // Small delay to ensure loading state is visible
    }
  };

  const loadSlotsWithDuration = async (date: Date, durationMinutes: number) => {
    try {
      setLoadingSlots(true);
      // Use local date to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      console.log('Loading slots for date:', dateStr);
      console.log('Duration:', durationMinutes, 'minutes');

      const response = await ApiService.get(
        `/availability/instructor/${instructor.instructor_id}/slots`,
        {
          params: {
            start_date: dateStr,
            end_date: dateStr,
            duration_minutes: durationMinutes,
            show_booked: true, // Include booked slots to show them as disabled
          },
        }
      );

      console.log('Available slots response:', response.data);

      if (response.data.availability && response.data.availability.length > 0) {
        const slots = response.data.availability[0].slots || [];
        console.log('Slots received:', slots.length);
        console.log('Sample slot:', slots[0]);
        console.log('Booked slots:', slots.filter((s: TimeSlot) => s.is_booked).length);
        setAvailableSlotsForDate(slots);
        setShowSlotSelection(true);
      } else {
        setAvailableSlotsForDate([]);
        setShowSlotSelection(true);
      }
    } catch (error: any) {
      console.error('Error loading available slots:', error);
      setMessage({ type: 'error', text: 'Failed to load available slots. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
      setAvailableSlotsForDate([]);
      setShowSlotSelection(false);
    } finally {
      setLoadingSlots(false);
    }
  };

  const calculatePrice = () => {
    const hours = parseInt(formData.duration_minutes) / 60;
    const pricePerBooking = (instructor?.hourly_rate || 0) * hours;
    const instructorBookingFee = instructor?.booking_fee || 20.0; // Default to R20 if not set
    const lessonTotal = pricePerBooking * selectedBookings.length;
    const totalBookingFees = instructorBookingFee * selectedBookings.length;
    return lessonTotal + totalBookingFees;
  };

  const handleSubmitBooking = async () => {
    console.log('🔵 handleSubmitBooking called');
    console.log('Selected bookings:', selectedBookings);
    console.log('Pickup address:', formData.pickup_address);

    // Validate form
    if (selectedBookings.length === 0) {
      setMessage({ type: 'warning', text: 'Please select at least one time slot' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!formData.pickup_address) {
      setMessage({ type: 'warning', text: 'Please enter your pickup address' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    console.log('✅ Validation passed, proceeding to payment...');

    // Calculate pricing
    const hours = parseInt(formData.duration_minutes) / 60;
    const lessonAmount = instructor.hourly_rate * hours * selectedBookings.length;
    const instructorBookingFee = instructor.booking_fee || 20.0; // Use instructor's configured fee or default to R20
    const bookingFee = instructorBookingFee * selectedBookings.length;
    const totalAmount = lessonAmount + bookingFee;

    // Prepare bookings with pickup addresses and coordinates
    const bookingsWithPickup = selectedBookings.map(booking => ({
      date: booking.date,
      time: booking.time,
      pickup_address: formData.pickup_address,
      pickup_latitude: pickupCoordinates?.latitude || -33.9249, // Default to Cape Town if GPS not used
      pickup_longitude: pickupCoordinates?.longitude || 18.4241,
      notes: formData.notes || '',
    }));

    // Navigate to payment screen
    navigation.navigate(
      'Payment' as never,
      {
        instructor,
        bookings: bookingsWithPickup,
        total_amount: totalAmount,
        booking_fee: bookingFee,
        lesson_amount: lessonAmount,
      } as never
    );

    // Clear unsaved changes since we're proceeding to payment
    setHasUnsavedChanges(false);
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
      {/* Inline Message Display */}
      {message && (
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      )}

      {/* Inline Confirmation for Cancellation */}
      {confirmCancel && (
        <View style={styles.confirmCancelContainer}>
          <Text style={styles.confirmCancelTitle}>⚠️ Cancel Lesson?</Text>
          <Text style={styles.confirmCancelText}>
            {confirmCancel.fee > 0
              ? `Cancellation within 6 hours requires a 50% fee of R${confirmCancel.fee.toFixed(
                  2
                )}. Proceed with cancellation?`
              : 'Are you sure you want to cancel this lesson?'}
          </Text>
          <View style={styles.confirmCancelButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonNo]}
              onPress={() => setConfirmCancel(null)}
            >
              <Text style={styles.confirmButtonTextNo}>No, Keep It</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonYes]}
              onPress={confirmCancellation}
            >
              <Text style={styles.confirmButtonTextYes}>Yes, Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <WebNavigationHeader
        title="Book Lesson"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
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
              {'📍 '}
              {[instructor.province, instructor.city, instructor.suburb].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.instructorDetail}>
              ⭐ {instructor.rating.toFixed(1)} ({instructor.total_reviews} reviews)
            </Text>
            <Text style={styles.instructorDetail}>
              💰 R{((instructor.hourly_rate || 0) + (instructor.booking_fee || 20.0)).toFixed(2)}/hr
            </Text>
          </View>
        </View>

        {/* Pickup Address - MOVED TO TOP */}
        <View style={[styles.formCard, styles.pickupFormCard]}>
          <Text style={styles.sectionTitle}>Step 1: Pickup Details</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Pickup Address <Text style={styles.required}>*</Text>
            </Text>
            <AddressAutocomplete
              value={formData.pickup_address}
              onChangeText={value => updateField('pickup_address', value)}
              onLocationCapture={coords => {
                setPickupCoordinates(coords);
                console.log('📍 Pickup location captured:', coords);
              }}
              placeholder="Start typing your street address... (e.g., 123 Main Road, Sandton)"
              style={styles.textArea}
            />
          </View>
        </View>

        {/* Booking Form */}
        <View style={[styles.formCard, styles.lessonFormCard]}>
          <Text style={styles.sectionTitle}>Step 2: Lesson Details</Text>

          {/* Show warning if pickup address not filled */}
          {!formData.pickup_address.trim() && (
            <View style={styles.pickupWarningContainer}>
              <Text style={styles.pickupWarningIcon}>📍</Text>
              <Text style={styles.pickupWarningText}>
                Please enter your pickup address above before selecting lesson dates and times.
              </Text>
            </View>
          )}

          {/* Duration Selection - Fixed at 60 minutes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <View style={styles.durationButtons}>
              <TouchableOpacity
                style={[styles.durationButton, styles.durationButtonActive]}
                disabled
              >
                <Text style={[styles.durationButtonText, styles.durationButtonTextActive]}>
                  60 min (Standard)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Selection - Above Title - DISABLED if no pickup address */}
          {!showSlotSelection && (
            <View style={styles.formGroup}>
              <Text style={styles.instructionText}>Select a date</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  !formData.pickup_address.trim() && styles.datePickerButtonDisabled,
                ]}
                onPress={() => {
                  if (formData.pickup_address.trim()) {
                    setShowCalendarModal(true);
                  }
                }}
                disabled={!formData.pickup_address.trim()}
              >
                <Text style={styles.datePickerIcon}>📅</Text>
                <Text
                  style={[
                    styles.datePickerText,
                    !formData.pickup_address.trim() && styles.datePickerTextDisabled,
                  ]}
                >
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : formData.pickup_address.trim()
                      ? 'Click to Select Date'
                      : 'Enter pickup address first'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step-by-Step Date and Time Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Add Lesson Date & Time <Text style={styles.required}>*</Text>
            </Text>

            {/* Loading Slots */}
            {loadingSlots && (
              <View style={styles.loadingSlotsContainer}>
                <ActivityIndicator size="small" color="#007bff" />
                <Text style={styles.loadingSlotsText}>Loading available times...</Text>
              </View>
            )}

            {/* Time Slot Selection */}
            {showSlotSelection && !loadingSlots && (
              <View style={styles.slotSelectionContainer}>
                <View style={styles.selectedDateHeader}>
                  <Text style={styles.selectedDateTitle}>
                    📅{' '}
                    {selectedDate?.toLocaleDateString('en-ZA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.changeDateButton}
                    onPress={() => {
                      setShowSlotSelection(false);
                      setSelectedDate(null);
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.changeDateButtonText}>Change Date</Text>
                  </TouchableOpacity>
                </View>

                {availableSlotsForDate.length === 0 ? (
                  <View style={styles.noSlotsContainer}>
                    <Text style={styles.noSlotsTitle}>😔 No Available Time Slots</Text>
                    <Text style={styles.noSlotsText}>No available time slots for this date.</Text>
                    <TouchableOpacity
                      style={styles.selectDateButton}
                      onPress={() => {
                        setShowSlotSelection(false);
                        setSelectedDate(null);
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={styles.selectDateButtonText}>Try Another Date</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.instructionText}>Select a time slot</Text>
                    <Text style={styles.slotCountText}>
                      {availableSlotsForDate.filter(s => !s.is_booked).length} available,{' '}
                      {availableSlotsForDate.filter(s => s.is_booked).length} booked (Total:{' '}
                      {availableSlotsForDate.length} slots)
                    </Text>
                    <ScrollView
                      style={styles.slotsScrollView}
                      contentContainerStyle={styles.slotsScrollViewContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                    >
                      <View style={styles.slotsList}>
                        {availableSlotsForDate.map((slot, index) => {
                          const startTime = new Date(slot.start_time);
                          const endTime = new Date(slot.end_time);
                          const now = new Date();
                          // Format date consistently with handleAddSlot
                          const year = selectedDate?.getFullYear() || 0;
                          const month = String((selectedDate?.getMonth() || 0) + 1).padStart(
                            2,
                            '0'
                          );
                          const day = String(selectedDate?.getDate() || 0).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          const isSelected = selectedBookings.some(
                            booking =>
                              booking.date === dateStr &&
                              booking.slot.start_time === slot.start_time
                          );
                          const hasSameInstructorConflict =
                            (slot as any).is_same_instructor_conflict || false;
                          const hasDifferentInstructorConflict =
                            (slot as any).is_different_instructor_conflict || false;
                          const isBooked = slot.is_booked || false;
                          const isPast = startTime < now;

                          return (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.slotButton,
                                !isSelected &&
                                  hasDifferentInstructorConflict &&
                                  !isPast &&
                                  styles.slotButtonConflict,
                                !isSelected &&
                                  hasSameInstructorConflict &&
                                  !isPast &&
                                  styles.slotButtonOverlap,
                                !isSelected &&
                                  isBooked &&
                                  !hasSameInstructorConflict &&
                                  !hasDifferentInstructorConflict &&
                                  !isPast &&
                                  styles.slotButtonBooked,
                                !isSelected && isPast && styles.slotButtonPast,
                                isSelected && styles.slotButtonSelected,
                              ]}
                              onPress={() => {
                                handleAddSlot(slot);
                              }}
                              disabled={
                                !isSelected &&
                                ((isBooked &&
                                  !hasSameInstructorConflict &&
                                  !hasDifferentInstructorConflict) ||
                                  isPast)
                              }
                            >
                              <View style={styles.slotButtonContent}>
                                <Text
                                  style={[
                                    styles.slotButtonText,
                                    !isSelected &&
                                      hasDifferentInstructorConflict &&
                                      !isPast &&
                                      styles.slotButtonTextConflict,
                                    !isSelected &&
                                      hasSameInstructorConflict &&
                                      !isPast &&
                                      styles.slotButtonTextOverlap,
                                    !isSelected &&
                                      isBooked &&
                                      !isPast &&
                                      styles.slotButtonTextBooked,
                                    !isSelected && isPast && styles.slotButtonTextPast,
                                    isSelected && styles.slotButtonTextSelected,
                                  ]}
                                >
                                  {startTime.toLocaleTimeString('en-ZA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {' - '}
                                  {endTime.toLocaleTimeString('en-ZA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                                {hasDifferentInstructorConflict && !isPast && (
                                  <Text style={styles.conflictBadge}>❌ Conflict</Text>
                                )}
                                {hasSameInstructorConflict && !isPast && (
                                  <Text style={styles.overlapBadge}>⚠️ Booked</Text>
                                )}
                                {isBooked &&
                                  !isPast &&
                                  !hasSameInstructorConflict &&
                                  !hasDifferentInstructorConflict && (
                                    <Text style={styles.bookedBadge}>🔒 Already Booked</Text>
                                  )}
                                {isPast && <Text style={styles.pastBadge}>⏰ Time Passed</Text>}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Selected Bookings Display */}
            {selectedBookings.length > 0 && (
              <View style={styles.selectedBookingsContainer}>
                <View style={styles.selectedBookingsHeader}>
                  <Text style={styles.selectedBookingsTitle}>
                    📅 Selected Lessons ({selectedBookings.length})
                  </Text>
                </View>
                {selectedBookings.map((booking, index) => (
                  <View key={index} style={styles.selectedBookingCard}>
                    <View style={styles.selectedBookingInfo}>
                      <Text style={styles.selectedBookingDate}>
                        {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.selectedBookingTime}>
                        🕐 {booking.time} ({booking.slot.duration_minutes} min)
                      </Text>
                      <Text style={styles.selectedBookingDetails}>
                        💰 R
                        {(
                          (instructor.hourly_rate * booking.slot.duration_minutes) / 60 +
                          (instructor.booking_fee || 20.0)
                        ).toFixed(2)}
                      </Text>
                      {booking.pickup_address && (
                        <Text style={styles.selectedBookingAddress}>
                          📍 {booking.pickup_address}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeBookingButton}
                      onPress={() => handleRemoveBooking(index)}
                    >
                      <Text style={styles.removeBookingButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addAnotherButton}
                  onPress={handleAddAnotherDateTime}
                >
                  <Text style={styles.addAnotherButtonText}>➕ Add Another Date/Time</Text>
                </TouchableOpacity>
              </View>
            )}
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
          {selectedBookings.length > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price per Lesson:</Text>
              <Text style={styles.priceValue}>
                R
                {(
                  (instructor.hourly_rate * parseInt(formData.duration_minutes)) / 60 +
                  (instructor.booking_fee || 20.0)
                ).toFixed(2)}
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
            {loading ? 'Processing...' : '� Proceed to Payment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>📅 Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowCalendarModal(false)}
                style={styles.calendarModalClose}
              >
                <Text style={styles.calendarModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <CalendarPicker
              value={selectedDate || new Date()}
              onChange={date => {
                handleDateSelect(date);
                setShowCalendarModal(false);
              }}
              minDate={new Date(new Date().setHours(0, 0, 0, 0))}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              timeOffDates={instructorTimeOff}
              noScheduleDates={unavailableDays}
              fullyBookedDates={fullyBookedDates}
            />
            <View style={styles.calendarLegendContainer}>
              <Text style={styles.noScheduleLegend}>⚫ Grey = No schedule</Text>
              <Text style={styles.timeOffLegend}>🟧 Orange = Time-off</Text>
              <Text style={styles.fullyBookedLegend}>🟥 Red = Fully booked</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        visible={showUnsavedChangesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnsavedChangesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>⚠️ Unsaved Changes</Text>
            <Text style={styles.confirmModalText}>
              {unsavedChangesMessage}
              {'\n\n'}Are you sure you want to leave? Your selections will be lost.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmStayButton]}
                onPress={() => setShowUnsavedChangesModal(false)}
              >
                <Text style={styles.confirmStayButtonText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmLeaveButton]}
                onPress={handleLeaveWithoutSaving}
              >
                <Text style={styles.confirmLeaveButtonText}>Leave</Text>
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
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
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
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
    overflow: 'visible', // Allow dropdown to show above other cards
  },
  pickupFormCard: {
    zIndex: 100, // Higher z-index for Step 1 (pickup address with dropdown)
  },
  lessonFormCard: {
    zIndex: 1, // Lower z-index for Step 2 (so dropdown appears above it)
  },
  formGroup: {
    marginBottom: 16,
    overflow: 'visible', // Allow dropdown to overflow
    zIndex: 1,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
  },
  checkboxCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  pickupWarningContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    marginBottom: 16,
    alignItems: 'center',
  },
  pickupWarningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  pickupWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  datePickerButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#ced4da',
    opacity: 0.6,
  },
  datePickerTextDisabled: {
    color: '#6c757d',
  },
  bigCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0056b3',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  bigCalendarIcon: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    marginRight: 12,
  },
  bigCalendarText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#fff',
    fontWeight: '600',
  },
  selectDateButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectDateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  slotSelectionContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  changeDateButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  changeDateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noSlotsContainer: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    alignItems: 'center',
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
  slotsScrollView: {
    maxHeight: 600,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
  },
  slotsScrollViewContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  slotCountText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  slotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
    alignItems: 'flex-start',
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
    minWidth: 120,
  },
  slotButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  slotButtonConflict: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  slotButtonOverlap: {
    backgroundColor: '#e9d5ff',
    borderColor: '#9333ea',
    borderWidth: 2,
  },
  slotButtonBooked: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  slotButtonPast: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
    opacity: 0.7,
  },
  slotButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotButtonText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  slotButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  slotButtonTextConflict: {
    color: '#dc2626',
    fontWeight: '600',
  },
  slotButtonTextOverlap: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  slotButtonTextBooked: {
    color: '#856404',
    fontWeight: '500',
  },
  slotButtonTextPast: {
    color: '#721c24',
    textDecorationLine: 'line-through',
  },
  bookedBadge: {
    fontSize: 9,
    color: '#856404',
    fontWeight: '600',
    marginLeft: 6,
  },
  conflictBadge: {
    fontSize: 9,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 6,
  },
  overlapBadge: {
    fontSize: 9,
    color: '#7c3aed',
    fontWeight: '600',
    marginLeft: 6,
  },
  pastBadge: {
    fontSize: 9,
    color: '#721c24',
    fontWeight: '600',
    marginLeft: 6,
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
  selectedBookingDetails: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 2,
    fontWeight: '600',
  },
  selectedBookingAddress: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
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
  addAnotherButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addAnotherButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  existingBookingsContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  existingBookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  cancelBookingButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelBookingButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancellationWarning: {
    fontSize: 11,
    color: '#dc3545',
    marginTop: 4,
    fontStyle: 'italic',
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
  confirmCancelContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#ffc107',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  confirmCancelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  confirmCancelText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
    lineHeight: 20,
  },
  confirmCancelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonNo: {
    backgroundColor: '#6c757d',
  },
  confirmButtonYes: {
    backgroundColor: '#dc3545',
  },
  confirmButtonTextNo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonTextYes: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  datePickerIcon: {
    fontSize: 24,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  calendarModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '90%',
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalCloseText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  calendarLegendContainer: {
    marginTop: 12,
    gap: 4,
  },
  noScheduleLegend: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeOffLegend: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fullyBookedLegend: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
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
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
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
  confirmStayButton: {
    backgroundColor: '#0066CC',
  },
  confirmStayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmLeaveButton: {
    backgroundColor: '#DC3545',
  },
  confirmLeaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
