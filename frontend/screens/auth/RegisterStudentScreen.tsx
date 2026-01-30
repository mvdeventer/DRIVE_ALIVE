/**
 * Student Registration Screen
 */
import React, { useRef, useState } from 'react';
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
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LocationSelector from '../../components/LocationSelector';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';

export default function RegisterStudentScreen({ navigation }: any) {
  // Create refs for all input fields
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const idNumberRef = useRef<TextInput>(null);
  const learnersPermitRef = useRef<TextInput>(null);
  const emergencyNameRef = useRef<TextInput>(null);
  const emergencyPhoneRef = useRef<TextInput>(null);
  const addressLine1Ref = useRef<TextInput>(null);
  const addressLine2Ref = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.STUDENT_EMAIL : '',
    phone: DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.STUDENT_PHONE : '',
    password: '',
    confirmPassword: '',
    first_name: DEBUG_CONFIG.ENABLED ? 'Martin' : '',
    last_name: DEBUG_CONFIG.ENABLED ? 'van Deventer' : '',
    id_number: DEBUG_CONFIG.ENABLED ? '7901175104085' : '',
    learners_permit_number: DEBUG_CONFIG.ENABLED ? 'LP123456789' : '',
    emergency_contact_name: DEBUG_CONFIG.ENABLED ? 'Jane van Deventer' : '',
    emergency_contact_phone: DEBUG_CONFIG.ENABLED ? '+27821234567' : '',
    address_line1: DEBUG_CONFIG.ENABLED ? '123 Main Street' : '',
    address_line2: DEBUG_CONFIG.ENABLED ? 'Apartment 4B' : '',
    province: DEBUG_CONFIG.ENABLED ? 'Gauteng' : '',
    city: DEBUG_CONFIG.ENABLED ? 'Johannesburg' : '',
    suburb: DEBUG_CONFIG.ENABLED ? 'Sandton' : '',
    postal_code: DEBUG_CONFIG.ENABLED ? '2000' : '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleRegister = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setMessage({
        type: 'error',
        text: '❌ Missing Fields: Please fill in all required fields',
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: '🔒 Password Mismatch: Passwords do not match. Please make sure both passwords are identical.',
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({
        type: 'error',
        text: '🔒 Password Too Short: Password must be at least 6 characters long for security.',
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false);
    setMessage(null);
    setLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;
      const response = await ApiService.registerStudent(registrationData);

      // Capture verification info from response
      const verificationData = response.verification_sent || {
        email_sent: false,
        whatsapp_sent: false,
      };

      // Navigate to verification pending screen
      navigation.replace('VerificationPending', {
        email: formData.email,
        phone: formData.phone,
        firstName: formData.first_name,
        emailSent: verificationData.email_sent,
        whatsappSent: verificationData.whatsapp_sent,
        expiryMinutes: verificationData.expires_in_minutes || 30,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'An error occurred during registration';
      setMessage({
        type: 'error',
        text: `❌ Registration Failed: ${errorMessage}`,
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <>
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <Text style={styles.title}>Student Registration</Text>

      {/* Message Display */}
      {message && (
        <InlineMessage
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
          autoDismissMs={4000}
        />
      )}

      <Text style={styles.sectionTitle}>Personal Information</Text>
      <FormFieldWithTip
        ref={firstNameRef}
        label="First Name"
        placeholder="Enter your first name"
        value={formData.first_name}
        onChangeText={value => updateField('first_name', value)}
        tip="Your legal first name as it appears on your ID"
        returnKeyType="next"
        onSubmitEditing={() => lastNameRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={lastNameRef}
        label="Last Name"
        placeholder="Enter your last name"
        value={formData.last_name}
        onChangeText={value => updateField('last_name', value)}
        tip="Your legal last name as it appears on your ID"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={emailRef}
        label="Email Address"
        placeholder="your.email@example.com"
        value={formData.email}
        onChangeText={value => updateField('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        tip="We'll use this to send booking confirmations and updates"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={phoneRef}
        label="Phone Number"
        placeholder="+27611234567"
        value={formData.phone}
        onChangeText={value => updateField('phone', value)}
        keyboardType="phone-pad"
        tip="South African format: +27 followed by 9 digits"
        maxLength={12}
        returnKeyType="next"
        onSubmitEditing={() => idNumberRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={idNumberRef}
        label="South African ID Number"
        placeholder="Enter your 13-digit ID number"
        value={formData.id_number}
        onChangeText={value => updateField('id_number', value)}
        keyboardType="numeric"
        maxLength={13}
        tip="Your 13-digit South African ID number for verification"
        returnKeyType="next"
        onSubmitEditing={() => learnersPermitRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={learnersPermitRef}
        label="Learner's Permit Number (Optional)"
        placeholder="Enter permit number if available"
        value={formData.learners_permit_number}
        onChangeText={value => updateField('learners_permit_number', value)}
        tip="Optional - Provide if you already have a learner's permit"
        returnKeyType="next"
        onSubmitEditing={() => emergencyNameRef.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.sectionTitle}>Emergency Contact</Text>
      <FormFieldWithTip
        ref={emergencyNameRef}
        label="Emergency Contact Name"
        placeholder="Full name"
        value={formData.emergency_contact_name}
        onChangeText={value => updateField('emergency_contact_name', value)}
        tip="Person to contact in case of emergency during lessons"
        returnKeyType="next"
        onSubmitEditing={() => emergencyPhoneRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={emergencyPhoneRef}
        label="Emergency Contact Phone"
        placeholder="+27821234567"
        value={formData.emergency_contact_phone}
        onChangeText={value => updateField('emergency_contact_phone', value)}
        keyboardType="phone-pad"
        tip="South African format: +27 followed by 9 digits"
        maxLength={12}
        returnKeyType="next"
        onSubmitEditing={() => addressLine1Ref.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.sectionTitle}>Address</Text>
      <FormFieldWithTip
        ref={addressLine1Ref}
        label="Address Line 1"
        placeholder="Street address"
        value={formData.address_line1}
        onChangeText={value => updateField('address_line1', value)}
        tip="Your residential address - we'll use this for pickups"
        returnKeyType="next"
        onSubmitEditing={() => addressLine2Ref.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={addressLine2Ref}
        label="Address Line 2 (Optional)"
        placeholder="Apartment, suite, etc."
        value={formData.address_line2}
        onChangeText={value => updateField('address_line2', value)}
        tip="Optional additional address information"
        returnKeyType="next"
        onSubmitEditing={() => postalCodeRef.current?.focus()}
        blurOnSubmit={false}
      />

      <LocationSelector
        label="Residential Location"
        tooltip="Select your province, city, and suburb where you live. This helps match you with nearby instructors."
        required
        selectedProvince={formData.province}
        selectedCity={formData.city}
        selectedSuburb={formData.suburb}
        onProvinceChange={province =>
          setFormData(prev => ({ ...prev, province, city: '', suburb: '' }))
        }
        onCityChange={city => setFormData(prev => ({ ...prev, city, suburb: '' }))}
        onSuburbChange={suburb => setFormData(prev => ({ ...prev, suburb }))}
        onPostalCodeChange={postalCode =>
          setFormData(prev => ({ ...prev, postal_code: postalCode || prev.postal_code }))
        }
        showSuburbs={true}
      />

      <FormFieldWithTip
        ref={postalCodeRef}
        label="Postal Code"
        placeholder="Postal code"
        value={formData.postal_code}
        onChangeText={value => updateField('postal_code', value)}
        keyboardType="numeric"
        tip="4-digit postal code"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.sectionTitle}>Security</Text>
      <FormFieldWithTip
        ref={passwordRef}
        label="Password"
        placeholder="At least 6 characters"
        value={formData.password}
        onChangeText={value => updateField('password', value)}
        secureTextEntry={!showPassword}
        tip="Create a strong password (minimum 6 characters)"
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormFieldWithTip
        ref={confirmPasswordRef}
        label="Confirm Password"
        placeholder="Re-enter password"
        value={formData.confirmPassword}
        onChangeText={value => updateField('confirmPassword', value)}
        secureTextEntry={!showPassword}
        tip="Re-enter your password to confirm"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <TouchableOpacity
        style={styles.showPasswordButton}
        onPress={() => setShowPassword(!showPassword)}
      >
        <Text style={styles.showPasswordText}>
          {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
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
          <Text style={styles.modalTitle}>✓ Confirm Registration Details</Text>
          <Text style={styles.modalSubtitle}>Please review your information before creating your account</Text>
          
          <View style={styles.confirmDetails}>
            <Text style={styles.confirmLabel}>Name:</Text>
            <Text style={styles.confirmValue}>{formData.first_name} {formData.last_name}</Text>
            
            <Text style={styles.confirmLabel}>Email:</Text>
            <Text style={styles.confirmValue}>{formData.email}</Text>
            
            <Text style={styles.confirmLabel}>Phone:</Text>
            <Text style={styles.confirmValue}>{formData.phone}</Text>
            
            <Text style={styles.confirmLabel}>ID Number:</Text>
            <Text style={styles.confirmValue}>{formData.id_number}</Text>
            
            <Text style={styles.confirmLabel}>City:</Text>
            <Text style={styles.confirmValue}>{formData.city}, {formData.province}</Text>
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
              <Text style={styles.modalButtonText}>✓ Confirm & Create Account</Text>
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
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    marginTop: Platform.OS === 'web' ? 15 : 12,
    marginBottom: Platform.OS === 'web' ? 10 : 8,
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: Platform.OS === 'web' ? 16 : 14,
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
});
