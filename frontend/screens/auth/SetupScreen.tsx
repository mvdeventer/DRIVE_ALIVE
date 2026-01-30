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
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AddressAutocomplete from '../../components/AddressAutocomplete';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  password: string;
  confirmPassword: string;
  address: string;
  smtpEmail: string;
  smtpPassword: string;
  linkValidity: string;
  testRecipient: string;
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
    idNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
    testRecipient: '',
  });

  const [pickupCoordinates, setPickupCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'ID number is required';
    } else if (formData.idNumber.length !== 13) {
      newErrors.idNumber = 'ID number must be exactly 13 digits';
    } else if (!/^\d{13}$/.test(formData.idNumber)) {
      newErrors.idNumber = 'ID number must contain only digits';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
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

    setErrorMessage('');
    setSuccessMessage('');
    setShowConfirmModal(true); // Show confirmation modal
  };

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);

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
          id_number: formData.idNumber,
          password: formData.password,
          address: formData.address,
          address_latitude: pickupCoordinates?.latitude || -33.9249,
          address_longitude: pickupCoordinates?.longitude || 18.4241,
          smtp_email: formData.smtpEmail || null,
          smtp_password: formData.smtpPassword || null,
          verification_link_validity_minutes: formData.linkValidity ? parseInt(formData.linkValidity) : 30,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const validityTime = formData.linkValidity || '30';
        setSuccessMessage(
          `✅ Admin account created successfully!\n\n` +
          `📧 Verification links for new users will be valid for ${validityTime} minutes.\n\n` +
          `You can change this setting anytime in Admin Dashboard → Settings.`
        );
        
        // Wait 4 seconds to let user read the message, then redirect to login
        setTimeout(() => {
          // Navigate to login screen
          navigation.replace('Login');
        }, 4000);
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

  const handleTestEmail = async () => {
    if (!formData.smtpEmail || !formData.smtpPassword || !formData.testRecipient) {
      setErrorMessage('Please fill in Gmail address, app password, and test recipient email');
      return;
    }

    setTestingEmail(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8000/verify/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_email: formData.smtpEmail,
          smtp_password: formData.smtpPassword,
          test_recipient: formData.testRecipient,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`✅ ${data.message || 'Test email sent successfully! Check your inbox.'}`);
      } else {
        const errorData = await response.json();
        setErrorMessage(`❌ Test failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage('❌ Network error while testing email. Please check your connection.');
      console.error('Test email error:', error);
    } finally {
      setTestingEmail(false);
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
    <>
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

          {/* ID Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>ID Number *</Text>
            <TextInput
              style={[styles.input, errors.idNumber && styles.inputError]}
              placeholder="13-digit SA ID number"
              value={formData.idNumber}
              onChangeText={(value) => handleChange('idNumber', value)}
              keyboardType="numeric"
              maxLength={13}
              editable={!loading}
            />
            {errors.idNumber ? (
              <Text style={styles.fieldError}>{errors.idNumber}</Text>
            ) : null}
            <Text style={styles.hint}>South African ID number (13 digits)</Text>
          </View>

          {/* Address with GPS */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address *</Text>
            <AddressAutocomplete
              value={formData.address}
              onChangeText={(value) => handleChange('address', value)}
              onLocationCapture={(coords) => setPickupCoordinates(coords)}
            />
            {errors.address ? (
              <Text style={styles.fieldError}>{errors.address}</Text>
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
              secureTextEntry={!showPassword}
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
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.showPasswordText}>
              {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
            </Text>
          </TouchableOpacity>

          {/* Email Configuration Section */}
          <View style={styles.sectionDivider} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📧 Email Configuration (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Configure Gmail SMTP to send verification emails to users. You can skip this and configure later in settings.
            </Text>
          </View>

          {/* Gmail Address */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Gmail Address</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@gmail.com"
              value={formData.smtpEmail}
              onChangeText={(value) => handleChange('smtpEmail', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.hint}>Your Gmail address for sending verification emails</Text>
          </View>

          {/* Gmail App Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Gmail App Password</Text>
            <TextInput
              style={styles.input}
              placeholder="16-character app password (no spaces)"
              value={formData.smtpPassword}
              onChangeText={(value) => handleChange('smtpPassword', value)}
              secureTextEntry={!showSmtpPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.hint}>
              Generate at: myaccount.google.com/apppasswords (requires 2FA enabled)
            </Text>
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowSmtpPassword(!showSmtpPassword)}
            >
              <Text style={styles.showPasswordText}>
                {showSmtpPassword ? '🙈 Hide' : '👁️ Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Link Validity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Verification Link Validity (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={formData.linkValidity}
              onChangeText={(value) => handleChange('linkValidity', value)}
              keyboardType="numeric"
              editable={!loading}
            />
            <Text style={styles.hint}>How long verification links remain valid (default: 30 minutes)</Text>
          </View>

          {/* Test Email Section */}
          {formData.smtpEmail && formData.smtpPassword && (
            <View style={styles.testEmailSection}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Test Email Recipient</Text>
                <TextInput
                  style={styles.input}
                  placeholder="test@example.com"
                  value={formData.testRecipient}
                  onChangeText={(value) => handleChange('testRecipient', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading && !testingEmail}
                />
                <Text style={styles.hint}>Send a test email to verify your Gmail configuration</Text>
              </View>
              <TouchableOpacity
                style={[styles.testEmailButton, (!formData.testRecipient || testingEmail) && styles.buttonDisabled]}
                onPress={handleTestEmail}
                disabled={!formData.testRecipient || testingEmail}
              >
                <Text style={styles.testEmailButtonText}>
                  {testingEmail ? '⏳ Sending Test Email...' : '📧 Send Test Email'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

    {/* Confirmation Modal */}
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>✓ Confirm Admin Account Details</Text>
          <Text style={styles.modalSubtitle}>Please review your information before creating the admin account</Text>
          
          <View style={styles.confirmDetails}>
            <Text style={styles.confirmLabel}>Name:</Text>
            <Text style={styles.confirmValue}>{formData.firstName} {formData.lastName}</Text>
            
            <Text style={styles.confirmLabel}>Email:</Text>
            <Text style={styles.confirmValue}>{formData.email}</Text>
            
            <Text style={styles.confirmLabel}>Phone:</Text>
            <Text style={styles.confirmValue}>{formData.phone}</Text>
            
            <Text style={styles.confirmLabel}>ID Number:</Text>
            <Text style={styles.confirmValue}>{formData.idNumber}</Text>
            
            <Text style={styles.confirmLabel}>Address:</Text>
            <Text style={styles.confirmValue}>{formData.address}</Text>
            
            {pickupCoordinates && (
              <>
                <Text style={styles.confirmLabel}>GPS Coordinates:</Text>
                <Text style={styles.confirmValue}>
                  Lat: {pickupCoordinates.latitude.toFixed(4)}, Lng: {pickupCoordinates.longitude.toFixed(4)}
                </Text>
              </>
            )}

            {formData.smtpEmail && formData.smtpPassword && (
              <>
                <Text style={styles.confirmLabel}>📧 Email Configuration:</Text>
                <Text style={styles.confirmValue}>Gmail: {formData.smtpEmail}</Text>
                <Text style={styles.confirmValue}>Link Validity: {formData.linkValidity} minutes</Text>
              </>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>✏️ Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={confirmAndSubmit}
            >
              <Text style={styles.modalButtonText}>✓ Confirm & Create Admin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
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
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 30 : 24,
    width: Platform.OS === 'web' ? '40%' : '85%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  confirmValue: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#28a745',
  },
  modalButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#dc3545',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: Platform.OS === 'web' ? 24 : 20,
  },
  sectionHeader: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    lineHeight: 20,
  },
  testEmailSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 12,
  },
  testEmailButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  testEmailButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});
