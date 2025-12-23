/**
 * Instructor Registration Screen
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import LocationSelector from '../../components/LocationSelector';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';

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
    province: DEBUG_CONFIG.ENABLED ? 'Gauteng' : '',
    city: DEBUG_CONFIG.ENABLED ? 'Johannesburg' : '',
    suburb: DEBUG_CONFIG.ENABLED ? 'Sandton' : '',
    hourly_rate: DEBUG_CONFIG.ENABLED ? '350' : '',
    service_radius_km: '20',
    max_travel_distance_km: '50',
    rate_per_km_beyond_radius: '5',
    bio: DEBUG_CONFIG.ENABLED
      ? 'Experienced driving instructor with 15 years teaching Code B, EB, and C1.'
      : '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
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
    if (!formData.city) missingFields.push('City');
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
        province: formData.province || null,
        city: formData.city,
        suburb: formData.suburb || null,
        hourly_rate: parseFloat(formData.hourly_rate),
        service_radius_km: parseFloat(formData.service_radius_km),
        max_travel_distance_km: parseFloat(formData.max_travel_distance_km),
        rate_per_km_beyond_radius: parseFloat(formData.rate_per_km_beyond_radius),
        bio: formData.bio || null,
      };

      const response = await ApiService.post('/auth/register/instructor', registrationData);

      // Show success message and scroll to top
      setMessage({
        type: 'success',
        text: '✅ Success! Registration successful! Redirecting to login...',
      });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Auto-navigate to login after 4 seconds
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 4000);
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
    setFormData(prev => ({ ...prev, [field]: value }));
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

        <LocationSelector
          label="Operating Location"
          tooltip="Select your province, city, and suburb where you primarily operate. Students will search for instructors in their area."
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
          label="Password"
          tooltip="Create a strong password with at least 6 characters. Use a mix of letters, numbers, and symbols for better security. This protects your account and student data."
          required
          placeholder="Minimum 6 characters"
          value={formData.password}
          onChangeText={text => updateFormData('password', text)}
          secureTextEntry
        />

        <FormFieldWithTip
          label="Confirm Password"
          tooltip="Re-enter your password to ensure it was typed correctly. Both passwords must match exactly."
          required
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChangeText={text => updateFormData('confirmPassword', text)}
          secureTextEntry
        />

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
});
