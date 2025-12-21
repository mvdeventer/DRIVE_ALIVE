/**
 * Booking Screen - Book a driving lesson with selected instructor
 */
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
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

export default function BookingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const instructor = (route.params as any)?.instructor as Instructor;

  const [formData, setFormData] = useState({
    lesson_date: '',
    lesson_time: '',
    duration_minutes: '60',
    pickup_address: '',
    notes: '',
  });

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
    return (instructor?.hourly_rate || 0) * hours;
  };

  const handleSubmitBooking = async () => {
    // Validate form
    if (!formData.lesson_date || !formData.lesson_time || !formData.pickup_address) {
      if (Platform.OS === 'web') {
        alert('Please fill in all required fields');
      } else {
        Alert.alert('Validation Error', 'Please fill in all required fields');
      }
      return;
    }

    setLoading(true);
    try {
      const lessonDateTime = `${formData.lesson_date}T${formData.lesson_time}:00`;

      const response = await ApiService.post('/bookings/', {
        instructor_id: instructor.instructor_id,
        lesson_date: lessonDateTime,
        duration_minutes: parseInt(formData.duration_minutes),
        pickup_address: formData.pickup_address,
        notes: formData.notes,
      });

      if (Platform.OS === 'web') {
        alert(
          `✅ Booking confirmed!\n\nBooking ID: ${response.data.id}\n\nYou will receive a confirmation shortly.`
        );
      } else {
        Alert.alert(
          '✅ Booking Confirmed',
          `Booking ID: ${response.data.id}\n\nYou will receive a confirmation shortly.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to create booking';

      if (Platform.OS === 'web') {
        alert(`Error: ${errorMsg}`);
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Lesson Date <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2025-12-25)"
              value={formData.lesson_date}
              onChangeText={value => updateField('lesson_date', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Lesson Time <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (e.g., 14:30)"
              value={formData.lesson_time}
              onChangeText={value => updateField('lesson_time', value)}
            />
          </View>

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
                    {duration}min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
            <Text style={styles.priceLabel}>Duration:</Text>
            <Text style={styles.priceValue}>{formData.duration_minutes} minutes</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Hourly Rate:</Text>
            <Text style={styles.priceValue}>R{instructor.hourly_rate}/hr</Text>
          </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderWidth: 1,
    borderColor: '#007bff',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  durationButtonActive: {
    backgroundColor: '#007bff',
  },
  durationButtonText: {
    color: '#007bff',
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});
