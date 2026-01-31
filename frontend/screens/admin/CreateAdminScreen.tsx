import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import api from '../../services/api';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  address: string;
  address_latitude: number;
  address_longitude: number;
  password: string;
  confirmPassword: string;
  smtp_email: string;
  smtp_password: string;
  verification_link_validity_minutes: number;
  twilio_sender_phone_number: string;
  twilio_phone_number: string;
}

export default function CreateAdminScreen({ navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    address: '',
    address_latitude: -33.9249,
    address_longitude: 18.4241,
    password: '',
    confirmPassword: '',
    smtp_email: '',
    smtp_password: '',
    verification_link_validity_minutes: 30,
    twilio_sender_phone_number: '',
    twilio_phone_number: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [pickupCoordinates, setPickupCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch admin settings on mount
  useEffect(() => {
    fetchAdminSettings();
  }, []);

  const fetchAdminSettings = async () => {
    try {
      const settings = await api.getAdminSettings();
      setFormData((prev) => ({
        ...prev,
        smtp_email: settings.smtp_email || '',
        smtp_password: settings.smtp_password || '',
        verification_link_validity_minutes: settings.verification_link_validity_minutes || 30,
        twilio_sender_phone_number: settings.twilio_sender_phone_number || '',
        twilio_phone_number: settings.twilio_phone_number || '',
      }));
    } catch (error: any) {
      console.log('Could not fetch admin settings (expected on first admin creation):', error.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.phone ||
      !formData.id_number ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Please fill in all required fields');
      return false;
    }

    if (!formData.email.includes('@')) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleCreateAdmin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.createAdmin({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        id_number: formData.id_number,
        address: formData.address || 'Not provided',
        address_latitude: formData.address_latitude,
        address_longitude: formData.address_longitude,
        password: formData.password,
        smtp_email: formData.smtp_email || '',
        smtp_password: formData.smtp_password || '',
        verification_link_validity_minutes: formData.verification_link_validity_minutes,
        twilio_sender_phone_number: formData.twilio_sender_phone_number || '',
        twilio_phone_number: formData.twilio_phone_number || '',
      });
      const verificationData = response.verification_sent || {
        email_sent: false,
        whatsapp_sent: false,
        expires_in_minutes: formData.verification_link_validity_minutes || 30,
      };

      navigation.navigate('VerificationPending', {
        email: formData.email,
        phone: formData.phone,
        firstName: formData.first_name,
        emailSent: verificationData.email_sent,
        whatsappSent: verificationData.whatsapp_sent,
        expiryMinutes: verificationData.expires_in_minutes || 30,
      });
    } catch (error: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Create New Admin"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView ref={scrollViewRef} style={styles.scrollContent}>
        {errorMessage ? (
          <InlineMessage message={errorMessage} type="error" />
        ) : null}
        {successMessage ? (
          <InlineMessage message={successMessage} type="success" />
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            placeholder="John"
          />

          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            placeholder="Doe"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="admin@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => handleChange('phone', text)}
            placeholder="0611154598 or +27611154598"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>ID Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.id_number}
            onChangeText={(text) => handleChange('id_number', text)}
            placeholder="9001015009087"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Address (Optional)</Text>
          <AddressAutocomplete
            value={formData.address}
            onChangeText={(text) => handleChange('address', text)}
            onLocationCapture={(coords) => {
              setPickupCoordinates(coords);
              handleChange('address_latitude', coords.latitude);
              handleChange('address_longitude', coords.longitude);
            }}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Security</Text>

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="Min 6 characters"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              placeholder="Re-enter password"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeButtonText}>
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadingSettings && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Loading Admin Settings...</Text>
            <ActivityIndicator size="large" color="#007BFF" style={{ marginVertical: 20 }} />
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Email Configuration (Optional)</Text>
          {loadingSettings ? (
            <Text style={styles.hintText}>Loading settings from database...</Text>
          ) : (
            <Text style={styles.hintText}>📧 Pre-populated from current admin settings (🌍 Global setting - shared by all admins)</Text>
          )}

          <Text style={styles.label}>Gmail Address</Text>
          <TextInput
            style={styles.input}
            value={formData.smtp_email}
            onChangeText={(text) => handleChange('smtp_email', text)}
            placeholder="your-gmail@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Gmail App Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.smtp_password}
              onChangeText={(text) => handleChange('smtp_password', text)}
              placeholder="xxxx xxxx xxxx xxxx"
              secureTextEntry={!showSmtpPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowSmtpPassword(!showSmtpPassword)}
            >
              <Text style={styles.eyeButtonText}>
                {showSmtpPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Verification Link Validity (minutes)</Text>
          <TextInput
            style={styles.input}
            value={String(formData.verification_link_validity_minutes)}
            onChangeText={(text) =>
              handleChange('verification_link_validity_minutes', Number(text) || 30)
            }
            placeholder="30"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>WhatsApp Configuration (Optional)</Text>
          <Text style={styles.hintText}>📱 Pre-populated from current admin settings (🌍 Global setting - shared by all admins)</Text>

          <Text style={styles.label}>Twilio Sender Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.twilio_sender_phone_number}
            onChangeText={(text) => handleChange('twilio_sender_phone_number', text)}
            placeholder="+27123456789 or +14155238886"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Admin Phone (for test messages)</Text>
          <TextInput
            style={styles.input}
            value={formData.twilio_phone_number}
            onChangeText={(text) => handleChange('twilio_phone_number', text)}
            placeholder="0611154598 or +27611154598"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateAdmin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Admin Account</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>✓ Confirm Admin Account Details</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                <Text style={styles.modalText}>Name: {formData.first_name} {formData.last_name}</Text>
                <Text style={styles.modalText}>Email: {formData.email}</Text>
                <Text style={styles.modalText}>Phone: {formData.phone}</Text>
                <Text style={styles.modalText}>ID Number: {formData.id_number}</Text>
                {formData.address && (
                  <>
                    <Text style={styles.modalText}>Address: {formData.address}</Text>
                    {pickupCoordinates && (
                      <Text style={styles.modalText}>
                        📍 GPS: {pickupCoordinates.latitude.toFixed(4)}, {pickupCoordinates.longitude.toFixed(4)}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {formData.smtp_email && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Email Configuration</Text>
                  <Text style={styles.modalText}>Gmail: {formData.smtp_email}</Text>
                  <Text style={styles.modalText}>
                    Link Validity: {formData.verification_link_validity_minutes} minutes
                  </Text>
                </View>
              )}

              {formData.twilio_sender_phone_number && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>WhatsApp Configuration</Text>
                  <Text style={styles.modalText}>
                    Twilio Sender: {formData.twilio_sender_phone_number}
                  </Text>
                  {formData.twilio_phone_number && (
                    <Text style={styles.modalText}>
                      Test Recipient: {formData.twilio_phone_number}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonConfirm}
                  onPress={confirmAndSubmit}
                >
                  <Text style={styles.modalButtonTextConfirm}>✓ Confirm & Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  formSection: {
    padding: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  label: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  hintText: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
  },
  passwordInput: {
    flex: 1,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  eyeButton: {
    padding: 12,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 8,
    alignItems: 'center',
    margin: Platform.OS === 'web' ? 20 : 16,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
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
    padding: Platform.OS === 'web' ? 24 : 20,
    width: Platform.OS === 'web' ? '50%' : '90%',
    maxWidth: 600,
    maxHeight: Platform.OS === 'web' ? '80%' : '85%',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#28a745',
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  modalSectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    marginBottom: 4,
    color: '#555',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#6C757D',
    padding: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
  },
});
