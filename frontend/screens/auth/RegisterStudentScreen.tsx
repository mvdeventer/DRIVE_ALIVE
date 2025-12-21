/**
 * Student Registration Screen
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import LocationSelector from '../../components/LocationSelector';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';

// Web-compatible alert function
const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    const fullMessage = `${title}\n\n${message}`;
    alert(fullMessage);
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

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

  const handleRegister = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      showAlert('❌ Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showAlert(
        '🔒 Password Mismatch',
        'Passwords do not match. Please make sure both passwords are identical.'
      );
      return;
    }

    if (formData.password.length < 6) {
      showAlert(
        '🔒 Password Too Short',
        'Password must be at least 6 characters long for security.'
      );
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;
      await ApiService.registerStudent(registrationData);

      showAlert('✅ Success!', 'Registration successful! Please login to continue.', [
        {
          text: 'Login Now',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'An error occurred during registration';
      showAlert('❌ Registration Failed', errorMessage);
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
        tip="Include country code (+27 for South Africa)"
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
        tip="Include country code"
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
        tip="Your residential address"
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
        secureTextEntry
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
        secureTextEntry
        tip="Re-enter your password to confirm"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

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
