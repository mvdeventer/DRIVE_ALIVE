import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { Button, Card, Input, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { API_BASE_URL } from '../../config';

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
  twilioSenderPhoneNumber: string;  // Twilio sender number (FROM)
  twilioPhoneNumber: string;  // Admin's phone for receiving tests (TO)
}

interface SetupScreenProps {
  navigation: any;
}

export default function SetupScreen({ navigation }: SetupScreenProps) {
  const { colors } = useTheme();
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
    twilioSenderPhoneNumber: '',  // Twilio sender number
    twilioPhoneNumber: '',  // Admin's test recipient phone
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
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
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
      const response = await fetch(`${API_BASE_URL}/setup/create-initial-admin`, {
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
          twilio_sender_phone_number: formData.twilioSenderPhoneNumber || null,  // Twilio sender number
          twilio_phone_number: formData.twilioPhoneNumber || null,  // Admin's test recipient phone
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(
          `✅ Admin account created successfully!\n\n` +
          `You can now log in with your credentials.\n\n` +
          `No verification needed — your admin account is active immediately.`
        );

        // Navigate to login screen after a short delay
        setTimeout(() => {
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

  const handleTestEmail = async () => {
    if (!formData.smtpEmail || !formData.smtpPassword || !formData.testRecipient) {
      setErrorMessage('Please fill in Gmail address, app password, and test recipient email');
      return;
    }

    setTestingEmail(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/verify/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_email: formData.smtpEmail,
          smtp_password: formData.smtpPassword,
          test_recipient: formData.testRecipient,
          verification_link_validity_minutes: parseInt(formData.linkValidity) || 30,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const storedMsg = data.stored_in_db ? ' (Config saved to database ✅)' : ' (Not stored - admin account will be created next)';
        setSuccessMessage(`✅ ${data.message || 'Test email sent successfully! Check your inbox.'}${storedMsg}`);
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

  const handleTestWhatsApp = async () => {
    if (!formData.twilioPhoneNumber) {
      setErrorMessage('Please enter your phone number to receive the test message');
      return;
    }
    
    if (!formData.twilioSenderPhoneNumber) {
      setErrorMessage('Please enter your Twilio sender phone number (e.g., +14155238886 for sandbox)');
      return;
    }

    setTestingWhatsApp(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const requestBody = {
        phone: formData.twilioPhoneNumber,
        twilio_sender_phone_number: formData.twilioSenderPhoneNumber,
      };
      console.log('Sending WhatsApp test request:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/verify/test-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const storedMsg = data.stored_in_db ? ' (Config saved to database ✅)' : ' (Not stored - admin account will be created next)';
        setSuccessMessage(`✅ WhatsApp message sent!${storedMsg} Check your phone in a few seconds.`);
      } else {
        const errorData = await response.json();
        setErrorMessage(`❌ Test failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage('❌ Network error while testing WhatsApp. Please check your connection.');
      console.error('Test WhatsApp error:', error);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    // Auto-format phone numbers
    if (field === 'phone' || field === 'twilioSenderPhoneNumber' || field === 'twilioPhoneNumber') {
      value = formatPhoneNumber(value);
    }
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.headerEmoji}>🚀</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>System Setup</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Welcome! Create the initial admin account to get started.
        </Text>
      </View>

      {/* Success/Error Messages */}
      {successMessage ? (
        <View style={[styles.messageBanner, { backgroundColor: colors.successBg, borderLeftColor: colors.success }]}>
          <Text style={[styles.messageText, { color: colors.text }]}>{successMessage}</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={[styles.messageBanner, { backgroundColor: colors.dangerBg, borderLeftColor: colors.danger }]}>
          <Text style={[styles.messageText, { color: colors.text }]}>❌ {errorMessage}</Text>
        </View>
      ) : null}

      {/* Personal Information */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Personal Information</Text>

        <Input
          label="First Name *"
          placeholder="Enter first name"
          value={formData.firstName}
          onChangeText={(v) => handleChange('firstName', v)}
          error={errors.firstName}
          editable={!loading}
        />
        <Input
          label="Last Name *"
          placeholder="Enter last name"
          value={formData.lastName}
          onChangeText={(v) => handleChange('lastName', v)}
          error={errors.lastName}
          editable={!loading}
        />
        <Input
          label="Email Address *"
          placeholder="admin@example.com"
          value={formData.email}
          onChangeText={(v) => handleChange('email', v)}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <Input
          label="Phone Number *"
          placeholder="+27123456789"
          value={formData.phone}
          onChangeText={(v) => handleChange('phone', v)}
          error={errors.phone}
          keyboardType="phone-pad"
          editable={!loading}
        />
        <Input
          label="ID Number *"
          placeholder="13-digit SA ID number"
          value={formData.idNumber}
          onChangeText={(v) => handleChange('idNumber', v)}
          error={errors.idNumber}
          hint="South African ID number (13 digits)"
          keyboardType="numeric"
          maxLength={13}
          editable={!loading}
        />
      </Card>

      {/* Address */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Address</Text>
        <AddressAutocomplete
          value={formData.address}
          onChangeText={(v) => handleChange('address', v)}
          onLocationCapture={(coords) => setPickupCoordinates(coords)}
        />
        {errors.address ? (
          <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.address}</Text>
        ) : null}
      </Card>

      {/* Security */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Security</Text>

        <Input
          key={`password-${showPassword}`}
          label="Password *"
          placeholder="Enter a strong password"
          value={formData.password}
          onChangeText={(v) => handleChange('password', v)}
          error={errors.password}
          hint="At least 8 characters recommended"
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <Input
          key={`confirm-password-${showPassword}`}
          label="Confirm Password *"
          placeholder="Confirm password"
          value={formData.confirmPassword}
          onChangeText={(v) => handleChange('confirmPassword', v)}
          error={errors.confirmPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <Pressable style={styles.showPasswordButton} onPress={() => setShowPassword(!showPassword)}>
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
          </Text>
        </Pressable>
      </Card>

      {/* Email Configuration */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📧 Email Configuration (Optional)</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Configure Gmail SMTP to send verification emails. You can skip this and configure later in settings.
        </Text>

        <Input
          label="Gmail Address"
          placeholder="admin@gmail.com"
          value={formData.smtpEmail}
          onChangeText={(v) => handleChange('smtpEmail', v)}
          hint="Your Gmail address for sending verification emails"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <Input
          key={`smtp-password-${showSmtpPassword}`}
          label="Gmail App Password"
          placeholder="16-character app password"
          value={formData.smtpPassword}
          onChangeText={(v) => handleChange('smtpPassword', v)}
          hint="Generate at: myaccount.google.com/apppasswords (requires 2FA)"
          secureTextEntry={!showSmtpPassword}
          editable={!loading}
        />
        <Pressable style={styles.showPasswordButton} onPress={() => setShowSmtpPassword(!showSmtpPassword)}>
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showSmtpPassword ? '🙈 Hide' : '👁️ Show'}
          </Text>
        </Pressable>

        <Input
          label="Verification Link Validity (minutes)"
          placeholder="30"
          value={formData.linkValidity}
          onChangeText={(v) => handleChange('linkValidity', v)}
          hint="How long verification links stay valid (default: 30 min)"
          keyboardType="numeric"
          editable={!loading}
        />

        {/* Test Email */}
        {formData.smtpEmail && formData.smtpPassword ? (
          <View style={[styles.testBox, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}>
            <Input
              label="Test Email Recipient"
              placeholder="test@example.com"
              value={formData.testRecipient}
              onChangeText={(v) => handleChange('testRecipient', v)}
              hint="Send a test email to verify your Gmail configuration"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading && !testingEmail}
            />
            <Button
              label={testingEmail ? '⏳ Sending…' : '📧 Send Test Email'}
              onPress={handleTestEmail}
              loading={testingEmail}
              disabled={!formData.testRecipient || testingEmail}
              fullWidth
            />
          </View>
        ) : null}
      </Card>

      {/* WhatsApp Configuration */}
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>💬 WhatsApp Configuration (Optional)</Text>

        <Input
          label="Twilio Sender Phone Number"
          placeholder="e.g., +14155238886 (sandbox)"
          value={formData.twilioSenderPhoneNumber}
          onChangeText={(v) => handleChange('twilioSenderPhoneNumber', v)}
          hint="📱 Your Twilio FROM number for all messages"
          keyboardType="phone-pad"
          editable={!loading && !testingWhatsApp}
        />
        <Input
          label="Your Phone Number (For Testing)"
          placeholder="e.g., +27123456789"
          value={formData.twilioPhoneNumber}
          onChangeText={(v) => handleChange('twilioPhoneNumber', v)}
          hint="🔔 Enter YOUR phone number to receive test messages"
          keyboardType="phone-pad"
          editable={!loading && !testingWhatsApp}
        />
        <Button
          label={testingWhatsApp ? '⏳ Sending…' : '💬 Send Test WhatsApp'}
          onPress={handleTestWhatsApp}
          loading={testingWhatsApp}
          disabled={!formData.twilioSenderPhoneNumber || !formData.twilioPhoneNumber || testingWhatsApp}
          variant="accent"
          fullWidth
        />
      </Card>

      {/* Submit */}
      <Button
        label="Create Admin Account"
        onPress={handleCreateAdmin}
        loading={loading}
        disabled={loading}
        fullWidth
        size="lg"
      />

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.infoBg, borderLeftColor: colors.primary }]}>
        <Text style={[styles.infoTitle, { color: colors.primary }]}>ℹ️ Important Information</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • This will be the first administrator of the system{'\n'}
          • Only admins can create other admin, instructor, and student accounts{'\n'}
          • Keep your admin credentials secure{'\n'}
          • You can change your password after logging in
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Confirmation Modal */}
    <ThemedModal
      visible={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      title="Confirm Admin Account"
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
        Please review your information before creating the admin account
      </Text>
      <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Name:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>
          {formData.firstName} {formData.lastName}
        </Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Email:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.email}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Phone:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.phone}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>ID Number:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.idNumber}</Text>
        <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Address:</Text>
        <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.address}</Text>

        {pickupCoordinates ? (
          <>
            <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>GPS:</Text>
            <Text style={[styles.confirmValue, { color: colors.text }]}>
              {pickupCoordinates.latitude.toFixed(4)}, {pickupCoordinates.longitude.toFixed(4)}
            </Text>
          </>
        ) : null}

        {formData.smtpEmail && formData.smtpPassword ? (
          <>
            <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>📧 Email Config:</Text>
            <Text style={[styles.confirmValue, { color: colors.text }]}>
              Gmail: {formData.smtpEmail} | Validity: {formData.linkValidity} min
            </Text>
          </>
        ) : null}

        {formData.twilioSenderPhoneNumber || formData.twilioPhoneNumber ? (
          <>
            <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>💬 WhatsApp Config:</Text>
            {formData.twilioSenderPhoneNumber ? (
              <Text style={[styles.confirmValue, { color: colors.text }]}>
                Sender: {formData.twilioSenderPhoneNumber}
              </Text>
            ) : null}
          </>
        ) : null}
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
    marginBottom: 28,
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
    lineHeight: 21,
  },
  messageBanner: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    lineHeight: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  showPasswordButton: {
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
  },
  testBox: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1,
    marginTop: 12,
  },
  infoBox: {
    borderLeftWidth: 4,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
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
