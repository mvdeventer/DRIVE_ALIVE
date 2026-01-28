import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface SetupScreenProps {
  navigation: any;
}

export default function SetupScreen({ navigation }: SetupScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAdmin = async () => {
    if (!validateForm()) {
      setErrorMessage('Please fix the errors above');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8000/setup/create-initial-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('✅ Admin account created successfully!');
        
        // Wait 2 seconds then redirect to login
        setTimeout(() => {
          // Navigate to login screen
          navigation.replace('Login');
        }, 2000);
      } else {
        const errorData = await response.json();
        setErrorMessage(
          errorData.detail || 'Failed to create admin account. Please try again.'
        );
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
      console.error('Setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚀 System Setup</Text>
          <Text style={styles.subtitle}>
            Welcome! This is the first run of the system. Please create the initial admin account.
          </Text>
        </View>

        {/* Success Message */}
        {successMessage ? (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>❌ {errorMessage}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              placeholder="Enter first name"
              value={formData.firstName}
              onChangeText={(value) => handleChange('firstName', value)}
              editable={!loading}
            />
            {errors.firstName ? (
              <Text style={styles.fieldError}>{errors.firstName}</Text>
            ) : null}
          </View>

          {/* Last Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              placeholder="Enter last name"
              value={formData.lastName}
              onChangeText={(value) => handleChange('lastName', value)}
              editable={!loading}
            />
            {errors.lastName ? (
              <Text style={styles.fieldError}>{errors.lastName}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="admin@example.com"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+27123456789"
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
              editable={!loading}
            />
            {errors.phone ? (
              <Text style={styles.fieldError}>{errors.phone}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter a strong password"
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              secureTextEntry
              editable={!loading}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}
            <Text style={styles.hint}>At least 8 characters recommended</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleChange('confirmPassword', value)}
              secureTextEntry
              editable={!loading}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateAdmin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Admin Account</Text>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Important Information</Text>
            <Text style={styles.infoText}>
              • This admin account will be the first administrator of the system{'\n'}
              • Only admin accounts can create other admin, instructor, and student accounts{'\n'}
              • Keep your admin credentials secure{'\n'}
              • You can change your password after logging in
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: Platform.OS === 'web' ? 40 : 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    color: '#ff6b6b',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    marginTop: 4,
  },
  hint: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#999',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  successText: {
    color: '#155724',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 15,
    borderRadius: 4,
    marginTop: 25,
  },
  infoTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontWeight: '600',
    color: '#0056b3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#004085',
    lineHeight: 20,
  },
});
