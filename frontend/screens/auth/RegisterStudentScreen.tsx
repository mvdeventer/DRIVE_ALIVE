/**
 * Student Registration Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import ApiService from '../../services/api';

export default function RegisterStudentScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    id_number: '',
    learners_permit_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;
      await ApiService.registerStudent(registrationData);
      
      Alert.alert(
        'Success',
        'Registration successful!',
        [{ text: 'OK', onPress: () => navigation.replace('StudentHome') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'An error occurred during registration'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Student Registration</Text>

      <Text style={styles.sectionTitle}>Personal Information</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name *"
        value={formData.first_name}
        onChangeText={(value) => updateField('first_name', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name *"
        value={formData.last_name}
        onChangeText={(value) => updateField('last_name', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number *"
        value={formData.phone}
        onChangeText={(value) => updateField('phone', value)}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="South African ID Number *"
        value={formData.id_number}
        onChangeText={(value) => updateField('id_number', value)}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Learner's Permit Number (Optional)"
        value={formData.learners_permit_number}
        onChangeText={(value) => updateField('learners_permit_number', value)}
      />

      <Text style={styles.sectionTitle}>Emergency Contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Emergency Contact Name *"
        value={formData.emergency_contact_name}
        onChangeText={(value) => updateField('emergency_contact_name', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Emergency Contact Phone *"
        value={formData.emergency_contact_phone}
        onChangeText={(value) => updateField('emergency_contact_phone', value)}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Address Line 1 *"
        value={formData.address_line1}
        onChangeText={(value) => updateField('address_line1', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Address Line 2 (Optional)"
        value={formData.address_line2}
        onChangeText={(value) => updateField('address_line2', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="City *"
        value={formData.city}
        onChangeText={(value) => updateField('city', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Province *"
        value={formData.province}
        onChangeText={(value) => updateField('province', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Postal Code *"
        value={formData.postal_code}
        onChangeText={(value) => updateField('postal_code', value)}
        keyboardType="numeric"
      />

      <Text style={styles.sectionTitle}>Security</Text>
      <TextInput
        style={styles.input}
        placeholder="Password *"
        value={formData.password}
        onChangeText={(value) => updateField('password', value)}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password *"
        value={formData.confirmPassword}
        onChangeText={(value) => updateField('confirmPassword', value)}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#007AFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
