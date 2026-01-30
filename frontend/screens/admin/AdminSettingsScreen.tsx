/**
 * Admin Settings Screen
 * Configure system-wide settings including verification link validity
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import InlineMessage from '../../components/InlineMessage';
import apiService from '../../services/api';

const SCREEN_NAME = 'AdminSettingsScreen';

export default function AdminSettingsScreen({ navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
    testRecipient: '',
  });

  const [originalData, setOriginalData] = useState({
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
  });

  const loadSettings = async () => {
    try {
      setErrorMessage('');
      const data = await apiService.getAdminSettings();
      
      const settingsData = {
        smtpEmail: data.smtp_email || '',
        smtpPassword: data.smtp_password || '',
        linkValidity: data.verification_link_validity_minutes?.toString() || '30',
        testRecipient: '',
      };

      setFormData(settingsData);
      setOriginalData({
        smtpEmail: settingsData.smtpEmail,
        smtpPassword: settingsData.smtpPassword,
        linkValidity: settingsData.linkValidity,
      });
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings();
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasUnsavedChanges = () => {
    return (
      formData.smtpEmail !== originalData.smtpEmail ||
      formData.smtpPassword !== originalData.smtpPassword ||
      formData.linkValidity !== originalData.linkValidity
    );
  };

  const handleSave = () => {
    if (!hasUnsavedChanges()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('No changes to save');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await apiService.updateAdminSettings({
        smtp_email: formData.smtpEmail || null,
        smtp_password: formData.smtpPassword || null,
        verification_link_validity_minutes: parseInt(formData.linkValidity) || 30,
      });

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('✅ Settings saved successfully!');
      
      // Update original data
      setOriginalData({
        smtpEmail: formData.smtpEmail,
        smtpPassword: formData.smtpPassword,
        linkValidity: formData.linkValidity,
      });

      // Clear success message after 4 seconds
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(err.response?.data?.detail || 'Failed to save settings');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData.smtpEmail || !formData.smtpPassword || !formData.testRecipient) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Please fill in Gmail address, app password, and test recipient email');
      setTimeout(() => setErrorMessage(''), 5000);
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
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setSuccessMessage(`✅ ${data.message || 'Test email sent successfully! Check your inbox.'}`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const errorData = await response.json();
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setErrorMessage(`❌ Test failed: ${errorData.detail || 'Unknown error'}`);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('❌ Network error while testing email. Please check your connection.');
      setTimeout(() => setErrorMessage(''), 5000);
      console.error('Test email error:', error);
    } finally {
      setTestingEmail(false);
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges()) {
        return;
      }

      e.preventDefault();

      if (Platform.OS === 'web') {
        const confirmLeave = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        );
        if (confirmLeave) {
          navigation.dispatch(e.data.action);
        }
      } else {
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved changes. Are you sure you want to leave?',
          [
            { text: 'Stay', style: 'cancel' },
            {
              text: 'Discard Changes',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, formData, originalData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Admin Settings</Text>
          <Text style={styles.subtitle}>Configure system-wide verification settings</Text>
        </View>

        {successMessage ? <InlineMessage message={successMessage} type="success" /> : null}
        {errorMessage ? <InlineMessage message={errorMessage} type="error" /> : null}

        <View style={styles.content}>
          {/* Verification Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📧 Email Configuration</Text>
            <Text style={styles.sectionSubtitle}>
              Configure Gmail SMTP to send verification emails to new users
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gmail Address</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@gmail.com"
                value={formData.smtpEmail}
                onChangeText={(value) => handleChange('smtpEmail', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gmail App Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={formData.smtpPassword}
                  onChangeText={(value) => handleChange('smtpPassword', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                Generate at: myaccount.google.com/apppasswords
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Verification Link Validity (Minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={formData.linkValidity}
                onChangeText={(value) => handleChange('linkValidity', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={styles.hint}>
                How long verification links remain valid (15-120 minutes recommended)
              </Text>
            </View>

            {/* Test Email Section */}
            <View style={styles.testEmailSection}>
              <Text style={styles.testEmailTitle}>🧪 Test Email Configuration</Text>
              <Text style={styles.testEmailSubtitle}>
                Send a test email to verify your SMTP settings work correctly
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Test Recipient Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="test@example.com"
                  value={formData.testRecipient}
                  onChangeText={(value) => handleChange('testRecipient', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!testingEmail}
                />
              </View>

              <TouchableOpacity
                style={[styles.testButton, testingEmail && styles.testButtonDisabled]}
                onPress={handleTestEmail}
                disabled={testingEmail}
              >
                {testingEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.testButtonText}>📧 Send Test Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ About Verification Settings</Text>
            <Text style={styles.infoText}>
              • New students and instructors receive verification emails{'\n'}
              • Verification links expire after the configured time{'\n'}
              • Users cannot log in until they verify their account{'\n'}
              • You can change these settings anytime
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasUnsavedChanges() || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasUnsavedChanges() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {hasUnsavedChanges() ? '💾 Save Changes' : '✅ No Changes'}
              </Text>
            )}
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>✓ Confirm Settings Update</Text>
            <Text style={styles.modalSubtitle}>Please review your changes</Text>

            <View style={styles.confirmDetails}>
              {formData.smtpEmail !== originalData.smtpEmail && (
                <>
                  <Text style={styles.confirmLabel}>Gmail Address:</Text>
                  <Text style={styles.confirmValue}>{formData.smtpEmail || '(Not set)'}</Text>
                </>
              )}

              {formData.smtpPassword !== originalData.smtpPassword && (
                <>
                  <Text style={styles.confirmLabel}>App Password:</Text>
                  <Text style={styles.confirmValue}>
                    {formData.smtpPassword ? '••••••••' : '(Not set)'}
                  </Text>
                </>
              )}

              {formData.linkValidity !== originalData.linkValidity && (
                <>
                  <Text style={styles.confirmLabel}>Link Validity:</Text>
                  <Text style={styles.confirmValue}>{formData.linkValidity} minutes</Text>
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
                onPress={confirmAndSave}
              >
                <Text style={styles.modalButtonTextPrimary}>✓ Confirm & Save</Text>
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
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#6C757D',
  },
  header: {
    backgroundColor: '#fff',
    padding: Platform.OS === 'web' ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#6C757D',
  },
  content: {
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#6C757D',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  eyeButton: {
    padding: Platform.OS === 'web' ? 12 : 10,
  },
  eyeIcon: {
    fontSize: 20,
  },
  hint: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#6C757D',
    marginTop: 4,
  },
  testEmailSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  testEmailTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  testEmailSubtitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#6C757D',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#6C757D',
    borderRadius: 6,
    padding: Platform.OS === 'web' ? 14 : 12,
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E7F3FF',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#0056B3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#004085',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#28A745',
    borderRadius: 6,
    padding: Platform.OS === 'web' ? 16 : 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 24 : 20,
    width: Platform.OS === 'web' ? '40%' : '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#6C757D',
    marginBottom: 20,
  },
  confirmDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 8,
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#212529',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#6C757D',
  },
  modalButtonPrimary: {
    backgroundColor: '#28A745',
  },
  modalButtonTextSecondary: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
});
