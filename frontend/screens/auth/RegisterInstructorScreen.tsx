/**
 * Instructor Registration Screen
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

export default function RegisterInstructorScreen({ navigation }: any) {
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
        emails_sent: 0,
        whatsapp_sent: 0,
        total_admins: 0,
      };

      // Show success message about admin verification
      const adminCount = verificationData.total_admins || 0;
      const emailsSent = verificationData.emails_sent || 0;
      const whatsappSent = verificationData.whatsapp_sent || 0;
      
      let successText = '✅ Registration Successful!\n\n';
      successText += `Admins have been notified to verify your instructor profile.\n\n`;
      
      if (adminCount > 0) {
        successText += `📧 Email sent to ${emailsSent} admin(s)\n`;
        successText += `💬 WhatsApp sent to ${whatsappSent} admin(s)\n\n`;
      }
      
      successText += 'You can set up your schedule while waiting for verification!';

      setMessage({
        type: 'success',
        text: successText,
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Wait 3 seconds, then navigate to schedule setup option
      setTimeout(() => {
        navigation.replace('InstructorScheduleSetup', {
          instructorId: null, // Will fetch from backend after login
          instructorName: `${formData.first_name} ${formData.last_name}`,
          isInitialSetup: true, // Flag to show "Skip" button
          verificationData: {
            email: formData.email,
            phone: formData.phone,
            firstName: formData.first_name,
            adminVerificationPending: true,
            adminCount: adminCount,
          },
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
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Register as Instructor</Text>
        <Text style={styles.subtitle}>Join our driving school network</Text>

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
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <FormFieldWithTip
          label="First Name"
          tooltip="Enter your legal first name as it appears on your ID document. This will be displayed to students."
          required
          placeholder="e.g., John"
          value={formData.first_name}
          onChangeText={text => updateFormData('first_name', text)}
          autoCapitalize="words"
        />

        <FormFieldWithTip
          label="Last Name"
          tooltip="Enter your legal surname as it appears on your ID document. This helps students identify you professionally."
          required
          placeholder="e.g., Smith"
          value={formData.last_name}
          onChangeText={text => updateFormData('last_name', text)}
          autoCapitalize="words"
        />

        <FormFieldWithTip
          label="Email Address"
          tooltip="Use a valid email address. You'll receive booking confirmations, payment notifications, and important updates here."
          required
          placeholder="e.g., john.smith@example.com"
          value={formData.email}
          onChangeText={text => updateFormData('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormFieldWithTip
          label="Phone Number"
          tooltip="Enter your mobile number in South African format (+27 followed by 9 digits). Students may contact you for urgent matters or directions."
          required
          placeholder="e.g., +27821234567"
          value={formData.phone}
          onChangeText={text => updateFormData('phone', text)}
          keyboardType="phone-pad"
          maxLength={12}
        />

        <FormFieldWithTip
          label="ID Number"
          tooltip="Your South African ID number is required for verification and POPIA compliance. This information is kept secure and private."
          required
          placeholder="e.g., 8001015009087"
          value={formData.id_number}
          onChangeText={text => updateFormData('id_number', text)}
          keyboardType="numeric"
          maxLength={13}
        />

        {/* Professional Information */}
        <Text style={styles.sectionTitle}>Professional Details</Text>

        <FormFieldWithTip
          label="Driving License Number"
          tooltip="Enter your valid South African driving license number. This must be a professional driving permit (PrDP) to legally offer driving instruction services."
          required
          placeholder="e.g., A12345678"
          value={formData.license_number}
          onChangeText={text => updateFormData('license_number', text)}
          autoCapitalize="characters"
        />

        <LicenseTypeSelector
          label="License Types You Can Teach"
          tooltip="Select all the license types/codes you are qualified to teach. This includes CODE8 (light vehicles/cars), CODE10 (heavy vehicles), CODE14 (extra heavy vehicles), etc. Students will filter instructors based on the license type they need."
          required
          selectedTypes={formData.license_types}
          onSelectionChange={types => setFormData(prev => ({ ...prev, license_types: types }))}
        />

        {/* Vehicle Information */}
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <FormFieldWithTip
          label="Vehicle Registration"
          tooltip="Enter your vehicle's registration number (license plate). Students will use this to identify your car during pickup."
          required
          placeholder="e.g., CA 123-456 or ABC 123 GP"
          value={formData.vehicle_registration}
          onChangeText={text => updateFormData('vehicle_registration', text)}
          autoCapitalize="characters"
        />

        <FormFieldWithTip
          label="Vehicle Make"
          tooltip="The manufacturer of your vehicle. This helps students recognize your car."
          placeholder="e.g., Toyota, Volkswagen, Ford"
          value={formData.vehicle_make}
          onChangeText={text => updateFormData('vehicle_make', text)}
          autoCapitalize="words"
        />

        <FormFieldWithTip
          label="Vehicle Model"
          tooltip="Your vehicle's model name. Combined with make, this helps students easily spot your car."
          placeholder="e.g., Corolla, Polo, Ranger"
          value={formData.vehicle_model}
          onChangeText={text => updateFormData('vehicle_model', text)}
          autoCapitalize="words"
        />

        <FormFieldWithTip
          label="Vehicle Year"
          tooltip="The year your vehicle was manufactured. This is optional but provides additional identification details."
          placeholder="e.g., 2020"
          value={formData.vehicle_year}
          onChangeText={text => updateFormData('vehicle_year', text)}
          keyboardType="numeric"
        />

        <View style={styles.addressGpsContainer}>
          <Text style={styles.addressGpsLabel}>Operating Address (GPS)</Text>
          <AddressAutocomplete
            value={instructorAddressValue}
            onChangeText={handleInstructorAddressChange}
          />
          <Text style={styles.addressGpsHint}>
            📍 Use GPS to capture your operating location address.
          </Text>
        </View>

        {/* Service Information */}
        <Text style={styles.sectionTitle}>Service Details</Text>

        <FormFieldWithTip
          label="Hourly Rate (ZAR)"
          tooltip="Set your hourly rate in South African Rands. The typical range is R250-R500 per hour. Students will see this rate when booking lessons with you."
          required
          placeholder="e.g., 350"
          value={formData.hourly_rate}
          onChangeText={text => updateFormData('hourly_rate', text)}
          keyboardType="decimal-pad"
        />

        <FormFieldWithTip
          label="Service Radius (km)"
          tooltip="The maximum distance you're willing to travel to pick up students from their location. Default is 20km. A larger radius means more potential students, but consider fuel costs and travel time."
          placeholder="e.g., 20 (recommended: 10-30km)"
          value={formData.service_radius_km}
          onChangeText={text => updateFormData('service_radius_km', text)}
          keyboardType="decimal-pad"
        />

        <FormFieldWithTip
          label="Maximum Travel Distance (km)"
          tooltip="The absolute maximum distance you'll travel for a student, even with extra charges. Example: If service radius is 20km and max travel is 50km, you'll accept students up to 50km away but charge extra for the 30km beyond your service radius."
          placeholder="e.g., 50 (must be ≥ service radius)"
          value={formData.max_travel_distance_km}
          onChangeText={text => updateFormData('max_travel_distance_km', text)}
          keyboardType="decimal-pad"
        />

        <FormFieldWithTip
          label="Rate per Extra Kilometer (ZAR)"
          tooltip="How much you charge per kilometer when students are outside your service radius. Example: If a student is 25km away and your service radius is 20km, you'll charge this rate × 5km extra. Typical range: R3-R10 per km."
          placeholder="e.g., 5 (recommended: R3-R10)"
          value={formData.rate_per_km_beyond_radius}
          onChangeText={text => updateFormData('rate_per_km_beyond_radius', text)}
          keyboardType="decimal-pad"
        />

        <FormFieldWithTip
          label="Bio (Optional)"
          tooltip="Tell students about yourself! Mention your teaching experience, specialties (e.g., nervous learners, test preparation), languages spoken, and what makes you a great instructor. A compelling bio helps attract more students."
          placeholder="e.g., 'Professional driving instructor with 10 years experience. Patient and friendly approach, specializing in helping nervous learners gain confidence...'"
          value={formData.bio}
          onChangeText={text => updateFormData('bio', text)}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        {/* Password */}
        <Text style={styles.sectionTitle}>Security</Text>

        <FormFieldWithTip
          key={`password-${showPassword}`}
          label="Password"
          tooltip="Create a strong password with at least 6 characters. Use a mix of letters, numbers, and symbols for better security. This protects your account and student data."
          required
          placeholder="Minimum 6 characters"
          value={formData.password}
          onChangeText={text => updateFormData('password', text)}
          secureTextEntry={!showPassword}
        />

        <FormFieldWithTip
          key={`confirm-password-${showPassword}`}
          label="Confirm Password"
          tooltip="Re-enter your password to ensure it was typed correctly. Both passwords must match exactly."
          required
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChangeText={text => updateFormData('confirmPassword', text)}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.showPasswordText}>
            {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.7}
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

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>✓ Confirm Registration Details</Text>
              <Text style={styles.modalSubtitle}>Please review your instructor information</Text>
              
              <View style={styles.confirmDetails}>
                <Text style={styles.confirmSectionTitle}>Personal Information</Text>
                <Text style={styles.confirmLabel}>Name:</Text>
                <Text style={styles.confirmValue}>{formData.first_name} {formData.last_name}</Text>
                
                <Text style={styles.confirmLabel}>Email:</Text>
                <Text style={styles.confirmValue}>{formData.email}</Text>
                
                <Text style={styles.confirmLabel}>Phone:</Text>
                <Text style={styles.confirmValue}>{formData.phone}</Text>
                
                <Text style={styles.confirmLabel}>ID Number:</Text>
                <Text style={styles.confirmValue}>{formData.id_number}</Text>

                <Text style={styles.confirmSectionTitle}>License & Vehicle</Text>
                <Text style={styles.confirmLabel}>License Number:</Text>
                <Text style={styles.confirmValue}>{formData.license_number}</Text>
                
                <Text style={styles.confirmLabel}>License Types:</Text>
                <Text style={styles.confirmValue}>{formData.license_types.join(', ')}</Text>
                
                <Text style={styles.confirmLabel}>Vehicle:</Text>
                <Text style={styles.confirmValue}>{formData.vehicle_make} {formData.vehicle_model} ({formData.vehicle_year})</Text>
                
                <Text style={styles.confirmLabel}>Registration:</Text>
                <Text style={styles.confirmValue}>{formData.vehicle_registration}</Text>

                <Text style={styles.confirmSectionTitle}>Rates & Service</Text>
                <Text style={styles.confirmLabel}>Hourly Rate:</Text>
                <Text style={styles.confirmValue}>R{formData.hourly_rate}/hour</Text>
                
                <Text style={styles.confirmLabel}>Service Radius:</Text>
                <Text style={styles.confirmValue}>{formData.service_radius_km}km</Text>
                
                <Text style={styles.confirmLabel}>Max Travel Distance:</Text>
                <Text style={styles.confirmValue}>{formData.max_travel_distance_km}km (R{formData.rate_per_km_beyond_radius}/km beyond)</Text>
                
                {formData.bio && (
                  <>
                    <Text style={styles.confirmLabel}>Bio:</Text>
                    <Text style={styles.confirmValue}>{formData.bio}</Text>
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
                  <Text style={styles.modalButtonText}>✓ Confirm & Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  addressGpsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: 16,
  },
  addressGpsLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  addressGpsHint: {
    marginTop: 8,
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#666',
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
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    color: '#007bff',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cityText: {
    fontSize: 16,
    color: '#333',
  },
  pickerCloseButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '50%' : '92%',
    maxWidth: 650,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 24 : 18,
    marginBottom: 24,
  },
  confirmSectionTitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 6,
  },
  confirmLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  confirmValue: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#28a745',
  },
  modalButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#dc3545',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
});
