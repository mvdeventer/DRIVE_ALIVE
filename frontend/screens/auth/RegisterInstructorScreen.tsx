/**
 * Instructor Registration Screen
 */
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import { Button, Card, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

export default function RegisterInstructorScreen({ navigation }: any) {
  const { colors } = useTheme();
  // Pre-fill with test data only when DEBUG_CONFIG is enabled
  // Use debug email and phone when in debug mode
  const timestamp = DEBUG_CONFIG.ENABLED ? Date.now().toString().slice(-6) : '';
  const [formData, setFormData] = useState({
    email: DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.DEFAULT_EMAIL : '',
    phone: DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.DEFAULT_PHONE : '',
    password: '',
    confirmPassword: '',
    first_name: DEBUG_CONFIG.ENABLED ? 'LEEN' : '',
    last_name: DEBUG_CONFIG.ENABLED ? 'van Deventer' : '',
    id_number: DEBUG_CONFIG.ENABLED ? `790117510408${timestamp.slice(-1)}` : '',
    license_number: DEBUG_CONFIG.ENABLED ? `ABC${timestamp}` : '',
    license_types: DEBUG_CONFIG.ENABLED ? ['B', 'EB', 'C1'] : ([] as string[]),
    vehicle_registration: DEBUG_CONFIG.ENABLED ? 'ABC123GP' : '',
    vehicle_make: DEBUG_CONFIG.ENABLED ? 'Toyota' : '',
    vehicle_model: DEBUG_CONFIG.ENABLED ? 'Corolla' : '',
    vehicle_year: DEBUG_CONFIG.ENABLED ? '2020' : '',
    hourly_rate: DEBUG_CONFIG.ENABLED ? '350' : '',
    service_radius_km: '20',
    max_travel_distance_km: '50',
    rate_per_km_beyond_radius: '5',
    bio: DEBUG_CONFIG.ENABLED
      ? 'Experienced driving instructor with 15 years teaching Code B, EB, and C1.'
      : '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleRegister = async () => {
    console.log('Register button clicked!');
    console.log('Form data:', formData);
    console.log('Email being sent:', formData.email);
    console.log('Phone being sent:', formData.phone);

    // Detailed validation with specific error messages
    const missingFields = [];

    if (!formData.email) missingFields.push('Email');
    if (!formData.first_name) missingFields.push('First Name');
    if (!formData.last_name) missingFields.push('Last Name');
    if (!formData.id_number) missingFields.push('ID Number');
    if (!formData.phone) missingFields.push('Phone Number');
    if (!formData.license_number) missingFields.push('License Number');
    if (formData.license_types.length === 0) missingFields.push('License Types');
    if (!formData.vehicle_registration) missingFields.push('Vehicle Registration');
    if (!formData.vehicle_make) missingFields.push('Vehicle Make');
    if (!formData.vehicle_model) missingFields.push('Vehicle Model');
    if (!formData.vehicle_year) missingFields.push('Vehicle Year');
    if (!formData.hourly_rate) missingFields.push('Hourly Rate');
    if (!formData.password) missingFields.push('Password');
    if (!formData.confirmPassword) missingFields.push('Confirm Password');

    if (missingFields.length > 0) {
      console.log('Validation failed - missing fields:', missingFields);
      setMessage({
        type: 'error',
        text: `📝 Missing Required Fields: ${missingFields.join(', ')}`,
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

    setMessage(null);
    setShowConfirmModal(true); // Show confirmation modal
  };

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false);
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
        license_types: formData.license_types.join(','),
        vehicle_registration: formData.vehicle_registration,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: parseInt(formData.vehicle_year),

        hourly_rate: parseFloat(formData.hourly_rate),
        service_radius_km: parseFloat(formData.service_radius_km),
        max_travel_distance_km: parseFloat(formData.max_travel_distance_km),
        rate_per_km_beyond_radius: parseFloat(formData.rate_per_km_beyond_radius),
        bio: formData.bio || null,
      };

      const response = await ApiService.post('/auth/register/instructor', registrationData);

      // Capture verification info from response
      const verificationData = response.verification_sent || {
        email_sent: false,
        whatsapp_sent: false,
        expires_in_minutes: 30,
        emails_sent: 0,
        whatsapp_sent_to_admins: 0,
        total_admins: 0,
      };

      // Show success message about both user and admin verification
      const adminCount = verificationData.total_admins || 0;
      
      let successText = '✅ Registration Successful!\n\n';
      successText += 'Please check your email and WhatsApp to verify your account.\n\n';
      if (adminCount > 0) {
        successText += `Admins (${adminCount}) have also been notified to verify your instructor credentials.\n\n`;
      }
      successText += 'You must verify your account before you can log in.';

      setMessage({
        type: 'success',
        text: successText,
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Navigate to verification pending screen
      setTimeout(() => {
        navigation.replace('VerificationPending', {
          email: formData.email,
          phone: formData.phone,
          firstName: formData.first_name,
          emailSent: verificationData.email_sent || false,
          whatsappSent: verificationData.whatsapp_sent || false,
          expiryMinutes: verificationData.expires_in_minutes || 30,
        });
      }, 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data);

      // Extract error message
      let errorMessage = 'An error occurred during registration';

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Display error message inline
      setMessage({
        type: 'error',
        text: `❌ Registration Failed: ${errorMessage}`,
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    // Auto-format phone numbers
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // GPS address value for instructor (no longer used since no manual fields)
  const instructorAddressValue = '';

  const handleInstructorAddressChange = (value: string) => {
    // GPS address captured for location tracking only
    console.log('GPS address captured:', value);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent + '15' }]}>
            <Text style={styles.headerEmoji}>🚗</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Register as Instructor</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join our driving school network
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
            label="First Name"
            tooltip="Enter your legal first name as it appears on your ID document."
            required
            placeholder="e.g., John"
            value={formData.first_name}
            onChangeText={text => updateFormData('first_name', text)}
            autoCapitalize="words"
          />
          <FormFieldWithTip
            label="Last Name"
            tooltip="Enter your legal surname as it appears on your ID document."
            required
            placeholder="e.g., Smith"
            value={formData.last_name}
            onChangeText={text => updateFormData('last_name', text)}
            autoCapitalize="words"
          />
          <FormFieldWithTip
            label="Email Address"
            tooltip="You'll receive booking confirmations and payment notifications here."
            required
            placeholder="e.g., john.smith@example.com"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormFieldWithTip
            label="Phone Number"
            tooltip="South African format: +27 followed by 9 digits."
            required
            placeholder="e.g., +27821234567"
            value={formData.phone}
            onChangeText={text => updateFormData('phone', text)}
            keyboardType="phone-pad"
            maxLength={12}
          />
          <FormFieldWithTip
            label="ID Number"
            tooltip="Your 13-digit South African ID number for verification."
            required
            placeholder="e.g., 8001015009087"
            value={formData.id_number}
            onChangeText={text => updateFormData('id_number', text)}
            keyboardType="numeric"
            maxLength={13}
          />
        </Card>

        {/* Professional Details */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Professional Details</Text>

          <FormFieldWithTip
            label="Driving License Number"
            tooltip="Your valid South African PrDP number."
            required
            placeholder="e.g., A12345678"
            value={formData.license_number}
            onChangeText={text => updateFormData('license_number', text)}
            autoCapitalize="characters"
          />
          <LicenseTypeSelector
            label="License Types You Can Teach"
            tooltip="Select all codes you are qualified to teach."
            required
            selectedTypes={formData.license_types}
            onSelectionChange={types => setFormData(prev => ({ ...prev, license_types: types }))}
          />
        </Card>

        {/* Vehicle Information */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Vehicle Information</Text>

          <FormFieldWithTip
            label="Vehicle Registration"
            tooltip="Your license plate number."
            required
            placeholder="e.g., CA 123-456 or ABC 123 GP"
            value={formData.vehicle_registration}
            onChangeText={text => updateFormData('vehicle_registration', text)}
            autoCapitalize="characters"
          />
          <FormFieldWithTip
            label="Vehicle Make"
            tooltip="The manufacturer of your vehicle."
            placeholder="e.g., Toyota, Volkswagen"
            value={formData.vehicle_make}
            onChangeText={text => updateFormData('vehicle_make', text)}
            autoCapitalize="words"
          />
          <FormFieldWithTip
            label="Vehicle Model"
            tooltip="Your vehicle's model name."
            placeholder="e.g., Corolla, Polo"
            value={formData.vehicle_model}
            onChangeText={text => updateFormData('vehicle_model', text)}
            autoCapitalize="words"
          />
          <FormFieldWithTip
            label="Vehicle Year"
            placeholder="e.g., 2020"
            value={formData.vehicle_year}
            onChangeText={text => updateFormData('vehicle_year', text)}
            keyboardType="numeric"
          />

          <View style={[styles.addressGpsContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.addressGpsLabel, { color: colors.text }]}>Operating Address (GPS)</Text>
            <AddressAutocomplete
              value={instructorAddressValue}
              onChangeText={handleInstructorAddressChange}
            />
            <Text style={[styles.addressGpsHint, { color: colors.textSecondary }]}>
              📍 Use GPS to capture your operating location address.
            </Text>
          </View>
        </Card>

        {/* Service Details */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Service Details</Text>

          <FormFieldWithTip
            label="Hourly Rate (ZAR)"
            tooltip="Typical range: R250-R500 per hour."
            required
            placeholder="e.g., 350"
            value={formData.hourly_rate}
            onChangeText={text => updateFormData('hourly_rate', text)}
            keyboardType="decimal-pad"
          />
          <FormFieldWithTip
            label="Service Radius (km)"
            tooltip="Max distance to pick up students (recommended: 10-30km)."
            placeholder="e.g., 20"
            value={formData.service_radius_km}
            onChangeText={text => updateFormData('service_radius_km', text)}
            keyboardType="decimal-pad"
          />
          <FormFieldWithTip
            label="Maximum Travel Distance (km)"
            tooltip="Absolute max distance, even with extra charges."
            placeholder="e.g., 50"
            value={formData.max_travel_distance_km}
            onChangeText={text => updateFormData('max_travel_distance_km', text)}
            keyboardType="decimal-pad"
          />
          <FormFieldWithTip
            label="Rate per Extra Kilometer (ZAR)"
            tooltip="Charge per km beyond your service radius (R3-R10 typical)."
            placeholder="e.g., 5"
            value={formData.rate_per_km_beyond_radius}
            onChangeText={text => updateFormData('rate_per_km_beyond_radius', text)}
            keyboardType="decimal-pad"
          />
          <FormFieldWithTip
            label="Bio (Optional)"
            tooltip="Tell students about your experience, specialties, and teaching style."
            placeholder="e.g., Professional instructor with 10 years experience..."
            value={formData.bio}
            onChangeText={text => updateFormData('bio', text)}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </Card>

        {/* Security */}
        <Card variant="outlined" padding="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Security</Text>

          <FormFieldWithTip
            key={`password-${showPassword}`}
            label="Password"
            tooltip="Minimum 6 characters. Mix letters, numbers, and symbols."
            required
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry={!showPassword}
          />
          <FormFieldWithTip
            key={`confirm-password-${showPassword}`}
            label="Confirm Password"
            tooltip="Re-enter your password to confirm."
            required
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChangeText={text => updateFormData('confirmPassword', text)}
            secureTextEntry={!showPassword}
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

        <Pressable onPress={() => navigation.goBack()} style={[styles.linkButton, { padding: 12 }]}>
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
        size="lg"
        footer={
          <View style={styles.modalButtons}>
            <Button
              label="✏️ Edit"
              onPress={() => setShowConfirmModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              label="✓ Confirm & Register"
              onPress={confirmAndSubmit}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          Please review your instructor information
        </Text>
        <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.confirmSectionTitle, { color: colors.primary, borderBottomColor: colors.divider }]}>
            Personal Information
          </Text>
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

          <Text style={[styles.confirmSectionTitle, { color: colors.primary, borderBottomColor: colors.divider }]}>
            License & Vehicle
          </Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>License Number:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.license_number}</Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>License Types:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.license_types.join(', ')}</Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Vehicle:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>
            {formData.vehicle_make} {formData.vehicle_model} ({formData.vehicle_year})
          </Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Registration:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.vehicle_registration}</Text>

          <Text style={[styles.confirmSectionTitle, { color: colors.primary, borderBottomColor: colors.divider }]}>
            Rates & Service
          </Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Hourly Rate:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>R{formData.hourly_rate}/hour</Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Service Radius:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.service_radius_km}km</Text>
          <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Max Travel Distance:</Text>
          <Text style={[styles.confirmValue, { color: colors.text }]}>
            {formData.max_travel_distance_km}km (R{formData.rate_per_km_beyond_radius}/km beyond)
          </Text>
          {formData.bio ? (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Bio:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.bio}</Text>
            </>
          ) : null}
        </View>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
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
    marginTop: 8,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  confirmSectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 6,
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
