/**
 * Instructor Registration Screen
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

export default function RegisterInstructorScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    id_number: '',
    license_number: '',
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    hourly_rate: '',
    service_radius_km: '20',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (
      !formData.email ||
      !formData.password ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.phone ||
      !formData.license_number ||
      !formData.id_number ||
      !formData.vehicle_registration
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        id_number: formData.id_number,
        license_number: formData.license_number,
        vehicle_registration: formData.vehicle_registration,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: parseInt(formData.vehicle_year),
        hourly_rate: parseFloat(formData.hourly_rate),
        service_radius_km: parseFloat(formData.service_radius_km),
        bio: formData.bio || null,
      };

      const response = await ApiService.post('/auth/register/instructor', registrationData);

      // Store token
      await ApiService.setAuthToken(response.access_token);

      Alert.alert('Success', 'Registration successful!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('InstructorHome'),
        },
      ]);
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'An error occurred during registration'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Register as Instructor</Text>
        <Text style={styles.subtitle}>Join our driving school network</Text>

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name *"
          value={formData.first_name}
          onChangeText={text => updateFormData('first_name', text)}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name *"
          value={formData.last_name}
          onChangeText={text => updateFormData('last_name', text)}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={formData.email}
          onChangeText={text => updateFormData('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          value={formData.phone}
          onChangeText={text => updateFormData('phone', text)}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="ID Number *"
          value={formData.id_number}
          onChangeText={text => updateFormData('id_number', text)}
        />

        {/* Professional Information */}
        <Text style={styles.sectionTitle}>Professional Details</Text>

        <TextInput
          style={styles.input}
          placeholder="Driving License Number *"
          value={formData.license_number}
          onChangeText={text => updateFormData('license_number', text)}
          autoCapitalize="characters"
        />

        {/* Vehicle Information */}
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <TextInput
          style={styles.input}
          placeholder="Vehicle Registration *"
          value={formData.vehicle_registration}
          onChangeText={text => updateFormData('vehicle_registration', text)}
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="Vehicle Make (e.g., Toyota)"
          value={formData.vehicle_make}
          onChangeText={text => updateFormData('vehicle_make', text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Vehicle Model (e.g., Corolla)"
          value={formData.vehicle_model}
          onChangeText={text => updateFormData('vehicle_model', text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Vehicle Year (e.g., 2020)"
          value={formData.vehicle_year}
          onChangeText={text => updateFormData('vehicle_year', text)}
          keyboardType="numeric"
        />

        {/* Service Information */}
        <Text style={styles.sectionTitle}>Service Details</Text>

        <TextInput
          style={styles.input}
          placeholder="Hourly Rate (ZAR) *"
          value={formData.hourly_rate}
          onChangeText={text => updateFormData('hourly_rate', text)}
          keyboardType="decimal-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Service Radius (km)"
          value={formData.service_radius_km}
          onChangeText={text => updateFormData('service_radius_km', text)}
          keyboardType="decimal-pad"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Bio (Optional - Tell students about yourself)"
          value={formData.bio}
          onChangeText={text => updateFormData('bio', text)}
          multiline
          numberOfLines={4}
        />

        {/* Password */}
        <Text style={styles.sectionTitle}>Security</Text>

        <TextInput
          style={styles.input}
          placeholder="Password *"
          value={formData.password}
          onChangeText={text => updateFormData('password', text)}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password *"
          value={formData.confirmPassword}
          onChangeText={text => updateFormData('confirmPassword', text)}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
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
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 20,
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
});
