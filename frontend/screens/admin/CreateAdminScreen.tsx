import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors } = useTheme();
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

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage(`Admin account created for ${formData.first_name} ${formData.last_name}. Account is active immediately — no verification needed.`);
      // Return to dashboard after a short delay
      setTimeout(() => navigation.goBack(), 2500);
    } catch (error: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>First Name *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            placeholder="John"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            placeholder="Doe"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="admin@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.phone}
            onChangeText={(text) => handleChange('phone', text)}
            placeholder="0611154598 or +27611154598"
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>ID Number *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.id_number}
            onChangeText={(text) => handleChange('id_number', text)}
            placeholder="9001015009087"
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Address (Optional)</Text>
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

        <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
          <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="Min 6 characters"
              secureTextEntry={!showPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password *</Text>
          <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              placeholder="Re-enter password"
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeButtonText}>
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </Pressable>
          </View>
        </View>

        {loadingSettings && (
          <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Loading Admin Settings...</Text>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          </View>
        )}

        <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Email Configuration (Optional)</Text>
          {loadingSettings ? (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Loading settings from database...</Text>
          ) : (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Pre-populated from current admin settings (Global setting - shared by all admins)</Text>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>Gmail Address</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.smtp_email}
            onChangeText={(text) => handleChange('smtp_email', text)}
            placeholder="your-gmail@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Gmail App Password</Text>
          <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              value={formData.smtp_password}
              onChangeText={(text) => handleChange('smtp_password', text)}
              placeholder="xxxx xxxx xxxx xxxx"
              secureTextEntry={!showSmtpPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowSmtpPassword(!showSmtpPassword)}
            >
              <Text style={styles.eyeButtonText}>
                {showSmtpPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Link Validity (minutes)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={String(formData.verification_link_validity_minutes)}
            onChangeText={(text) =>
              handleChange('verification_link_validity_minutes', Number(text) || 30)
            }
            placeholder="30"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>WhatsApp Configuration (Optional)</Text>
          <Text style={[styles.hintText, { color: colors.textMuted }]}>Pre-populated from current admin settings (Global setting - shared by all admins)</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Twilio Sender Phone Number</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.twilio_sender_phone_number}
            onChangeText={(text) => handleChange('twilio_sender_phone_number', text)}
            placeholder="+27123456789 or +14155238886"
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Admin Phone (for test messages)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            value={formData.twilio_phone_number}
            onChangeText={(text) => handleChange('twilio_phone_number', text)}
            placeholder="0611154598 or +27611154598"
            keyboardType="phone-pad"
          />
        </View>

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          disabled={loading}
          onPress={handleCreateAdmin}
          style={{ margin: Platform.OS === 'web' ? 20 : 16 }}
        >
          Create Admin Account
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <ThemedModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Admin Account Details"
        size="md"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setShowConfirmModal(false)}>
              Edit
            </Button>
            <Button variant="primary" style={{ flex: 1, backgroundColor: colors.success }} onPress={confirmAndSubmit}>
              Confirm & Create
            </Button>
          </View>
        }
      >
        <ScrollView>
          <View style={[styles.modalSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Personal Information</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>Name: {formData.first_name} {formData.last_name}</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>Email: {formData.email}</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>Phone: {formData.phone}</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>ID Number: {formData.id_number}</Text>
            {formData.address && (
              <>
                <Text style={[styles.modalText, { color: colors.textSecondary }]}>Address: {formData.address}</Text>
                {pickupCoordinates && (
                  <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                    GPS: {pickupCoordinates.latitude.toFixed(4)}, {pickupCoordinates.longitude.toFixed(4)}
                  </Text>
                )}
              </>
            )}
          </View>

          {formData.smtp_email && (
            <View style={[styles.modalSection, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Email Configuration</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>Gmail: {formData.smtp_email}</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Link Validity: {formData.verification_link_validity_minutes} minutes
              </Text>
            </View>
          )}

          {formData.twilio_sender_phone_number && (
            <View style={[styles.modalSection, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>WhatsApp Configuration</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Twilio Sender: {formData.twilio_sender_phone_number}
              </Text>
              {formData.twilio_phone_number && (
                <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                  Test Recipient: {formData.twilio_phone_number}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  formSection: {
    padding: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  hintText: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
  },
  eyeButton: {
    padding: 12,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSection: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  modalSectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  modalText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
});
