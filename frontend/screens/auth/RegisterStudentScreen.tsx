/**
 * Student Registration Screen
 */
import React, { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import { Button, Card, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

export default function RegisterStudentScreen({ navigation }: any) {
  const { colors } = useTheme();
  // Create refs for all input fields
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const idNumberRef = useRef<TextInput>(null);
  const learnersPermitRef = useRef<TextInput>(null);
  const emergencyNameRef = useRef<TextInput>(null);
  const emergencyPhoneRef = useRef<TextInput>(null);
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
    // Auto-format phone numbers
    if (field === 'phone' || field === 'emergency_contact_phone') {
      value = formatPhoneNumber(value);
    }
    setFormData({ ...formData, [field]: value });
  };

  const addressValue = [
    formData.address_line1,
    formData.postal_code,
  ]
    .filter(part => part && part.trim())
    .join('\n');

  const handleAddressChange = (value: string) => {
    const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
    const street = lines[0] || '';
    const postal = lines[lines.length - 1] || '';

    setFormData(prev => ({
      ...prev,
      address_line1: street,
      postal_code: postal || prev.postal_code,
    }));
  };

  return (
    <>
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.headerEmoji}>🎓</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Student Registration</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create your account to start booking driving lessons
        </Text>
      </View>

      {/* Message Display */}
      {message && (
        <InlineMessage
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
          autoDismissMs={4000}
        />
      )}

      {/* Personal Information */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Personal Information</Text>
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
      </Card>

      {/* Emergency Contact */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Emergency Contact</Text>
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
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
        />
      </Card>

      {/* Address */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Address</Text>
        <View style={[styles.addressGpsContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.addressGpsLabel, { color: colors.text }]}>Address with GPS</Text>
          <AddressAutocomplete
            value={addressValue}
            onChangeText={handleAddressChange}
          />
          <Text style={[styles.addressGpsHint, { color: colors.textSecondary }]}>
            📍 Use GPS to auto-fill your address and postal code. You can still edit the fields below if needed.
          </Text>
        </View>
      </Card>

      {/* Security */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Security</Text>
        <FormFieldWithTip
          key={`password-${showPassword}`}
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
          key={`confirm-password-${showPassword}`}
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
        <Pressable
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
          </Text>
        </Pressable>
      </Card>

      {/* Register Button */}
      <Button
        label="Register"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        fullWidth
        size="lg"
      />

      <Pressable onPress={() => navigation.navigate('Login')} style={[styles.linkButton, { padding: 12 }]}>
        <Text style={[styles.linkText, { color: colors.primary }]}>
          Already have an account? <Text style={{ fontWeight: '600' }}>Login</Text>
        </Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Confirmation Modal */}
    <ThemedModal
      visible={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      title="Confirm Registration"
      size="md"
      footer={
        <View style={styles.modalButtons}>
          <Button
            label="✏️ Edit"
            onPress={() => setShowConfirmModal(false)}
            variant="outline"
            style={{ flex: 1 }}
          />
          <Button
            label="✓ Confirm & Create"
            onPress={confirmAndSubmit}
            variant="primary"
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
        Please review your information before creating your account
      </Text>
      <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Name:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>
          {formData.first_name} {formData.last_name}
        </Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Email:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.email}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Phone:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.phone}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>ID Number:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.id_number}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Address:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>
          {`${formData.address_line1}${formData.address_line2 ? `, ${formData.address_line2}` : ''}${formData.postal_code ? `, ${formData.postal_code}` : ''}`}
        </Text>
      </View>
    </ThemedModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    padding: Platform.OS === 'web' ? 40 : 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerEmoji: { fontSize: 36 },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    textAlign: 'center',
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  addressGpsContainer: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
  },
  addressGpsLabel: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  addressGpsHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  showPasswordButton: {
    marginTop: 4,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmDetails: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 14,
  },
  confirmLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  confirmValue: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
});
