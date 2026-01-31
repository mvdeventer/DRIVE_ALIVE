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
import WebNavigationHeader from '../../components/WebNavigationHeader';
import apiService from '../../services/api';

const SCREEN_NAME = 'AdminSettingsScreen';

export default function AdminSettingsScreen({ navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingNavActionRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [formData, setFormData] = useState({
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
    backupIntervalMinutes: '10',
    retentionDays: '30',
    autoArchiveAfterDays: '14',
    twilioPhoneNumber: '',
    adminPhoneNumber: '',
    testRecipient: '',
  });

  const [originalData, setOriginalData] = useState({
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
    backupIntervalMinutes: '10',
    retentionDays: '30',
    autoArchiveAfterDays: '14',
    twilioPhoneNumber: '',
    adminPhoneNumber: '',
  });

  const loadSettings = async () => {
    try {
      setErrorMessage('');
      const data = await apiService.getAdminSettings();
      
      const settingsData = {
        smtpEmail: data.smtp_email || '',
        smtpPassword: data.smtp_password || '',
        linkValidity: data.verification_link_validity_minutes?.toString() || '30',
        backupIntervalMinutes: data.backup_interval_minutes?.toString() || '10',
        retentionDays: data.retention_days?.toString() || '30',
        autoArchiveAfterDays: data.auto_archive_after_days?.toString() || '14',
        twilioPhoneNumber: data.twilio_sender_phone_number || '',
        adminPhoneNumber: data.twilio_phone_number || '',
        testRecipient: '',
      };

      setFormData(settingsData);
      setOriginalData({
        smtpEmail: settingsData.smtpEmail,
        smtpPassword: settingsData.smtpPassword,
        linkValidity: settingsData.linkValidity,
        backupIntervalMinutes: settingsData.backupIntervalMinutes,
        retentionDays: settingsData.retentionDays,
        autoArchiveAfterDays: settingsData.autoArchiveAfterDays,
        twilioPhoneNumber: settingsData.twilioPhoneNumber,
        adminPhoneNumber: settingsData.adminPhoneNumber,
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
      formData.linkValidity !== originalData.linkValidity ||
      formData.backupIntervalMinutes !== originalData.backupIntervalMinutes ||
      formData.retentionDays !== originalData.retentionDays ||
      formData.autoArchiveAfterDays !== originalData.autoArchiveAfterDays ||
      formData.twilioPhoneNumber !== originalData.twilioPhoneNumber
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
        backup_interval_minutes: parseInt(formData.backupIntervalMinutes) || 10,
        retention_days: parseInt(formData.retentionDays) || 30,
        auto_archive_after_days: parseInt(formData.autoArchiveAfterDays) || 14,
        twilio_sender_phone_number: formData.twilioPhoneNumber || null,
        twilio_phone_number: formData.adminPhoneNumber || null,
      } as any);

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('✅ Settings saved successfully!');
      
      // Update original data
      setOriginalData({
        smtpEmail: formData.smtpEmail,
        smtpPassword: formData.smtpPassword,
        linkValidity: formData.linkValidity,
        backupIntervalMinutes: formData.backupIntervalMinutes,
        retentionDays: formData.retentionDays,
        autoArchiveAfterDays: formData.autoArchiveAfterDays,
        twilioPhoneNumber: formData.twilioPhoneNumber,
        adminPhoneNumber: formData.adminPhoneNumber,
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

  const handleTestWhatsApp = async () => {
    if (!formData.twilioPhoneNumber || !formData.adminPhoneNumber) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('Please fill in both Twilio sender number and your phone number');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setTestingWhatsApp(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:8000/verify/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.adminPhoneNumber,
          twilio_sender_phone_number: formData.twilioPhoneNumber,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setSuccessMessage(`✅ ${data.message || 'Test WhatsApp sent successfully! Check your phone.'}`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const errorData = await response.json();
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setErrorMessage(`❌ Test failed: ${errorData.detail || 'Unknown error'}`);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('❌ Network error while testing WhatsApp. Please check your connection.');
      setTimeout(() => setErrorMessage(''), 5000);
      console.error('Test WhatsApp error:', error);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges()) {
        return;
      }

      e.preventDefault();
      pendingNavActionRef.current = e.data.action;
      setShowUnsavedModal(true);
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
    <View style={styles.container}>
      <WebNavigationHeader
        title="Admin Settings"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {successMessage ? <InlineMessage message={successMessage} type="success" /> : null}
        {errorMessage ? <InlineMessage message={errorMessage} type="error" /> : null}

        <View style={styles.content}>
          {/* Verification Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📧 Email Configuration</Text>
            <Text style={styles.sectionSubtitle}>
              Configure Gmail SMTP to send verification emails (🌍 Global setting - shared by all admins)
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

          {/* Backup Configuration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 Backup Configuration</Text>
            <Text style={styles.sectionSubtitle}>
              Configure automatic database backup settings and retention policies
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Backup Interval (Minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={formData.backupIntervalMinutes}
                onChangeText={(value) => handleChange('backupIntervalMinutes', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={styles.hint}>
                How often to create automatic backups (5-60 minutes recommended)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Retention Days</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={formData.retentionDays}
                onChangeText={(value) => handleChange('retentionDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={styles.hint}>
                Keep uncompressed backups for this many days (default: 30 days)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Auto-Archive After Days</Text>
              <TextInput
                style={styles.input}
                placeholder="14"
                value={formData.autoArchiveAfterDays}
                onChangeText={(value) => handleChange('autoArchiveAfterDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={styles.hint}>
                Compress old backups to ZIP after this many days (default: 14 days)
              </Text>
            </View>
          </View>

          {/* Twilio WhatsApp Configuration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 WhatsApp Configuration</Text>
            <Text style={styles.sectionSubtitle}>
              Configure Twilio sender number (🌍 Global) and your phone for testing
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Twilio Sender Phone Number (FROM)</Text>
              <TextInput
                style={styles.input}
                placeholder="+14155238886 (Twilio sandbox)"
                value={formData.twilioPhoneNumber}
                onChangeText={(value) => handleChange('twilioPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={styles.hint}>
                This number sends all WhatsApp messages (sandbox: +14155238886 or your Twilio number)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Phone Number (TO - for testing)</Text>
              <TextInput
                style={styles.input}
                placeholder="+27611154598"
                value={formData.adminPhoneNumber}
                onChangeText={(value) => handleChange('adminPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={styles.hint}>
                Your personal phone number to receive test WhatsApp messages
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.testWhatsAppButton,
                (!formData.twilioPhoneNumber || !formData.adminPhoneNumber || testingWhatsApp) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleTestWhatsApp}
              disabled={!formData.twilioPhoneNumber || !formData.adminPhoneNumber || testingWhatsApp}
            >
              <Text style={styles.testWhatsAppButtonText}>
                {testingWhatsApp ? '⏳ Sending WhatsApp...' : '💬 Send Test WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ About These Settings</Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Verification:</Text>{'\n'}
              • New users receive verification emails/WhatsApp{'\n'}
              • Verification links expire after the configured time{'\n'}
              • Users cannot log in until they verify{'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Backups:</Text>{'\n'}
              • Automatic database backups on your schedule{'\n'}
              • Old backups are compressed to save storage{'\n'}
              • You can restore from any backup anytime
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

              {formData.backupIntervalMinutes !== originalData.backupIntervalMinutes && (
                <>
                  <Text style={styles.confirmLabel}>Backup Interval:</Text>
                  <Text style={styles.confirmValue}>{formData.backupIntervalMinutes} minutes</Text>
                </>
              )}

              {formData.retentionDays !== originalData.retentionDays && (
                <>
                  <Text style={styles.confirmLabel}>Retention Days:</Text>
                  <Text style={styles.confirmValue}>{formData.retentionDays} days</Text>
                </>
              )}

              {formData.autoArchiveAfterDays !== originalData.autoArchiveAfterDays && (
                <>
                  <Text style={styles.confirmLabel}>Auto-Archive After:</Text>
                  <Text style={styles.confirmValue}>{formData.autoArchiveAfterDays} days</Text>
                </>
              )}

              {formData.twilioPhoneNumber !== originalData.twilioPhoneNumber && (
                <>
                  <Text style={styles.confirmLabel}>Twilio Sender Phone:</Text>
                  <Text style={styles.confirmValue}>{formData.twilioPhoneNumber || '(Not set)'}</Text>
                </>
              )}

              {formData.adminPhoneNumber !== originalData.adminPhoneNumber && (
                <>
                  <Text style={styles.confirmLabel}>Your Phone Number:</Text>
                  <Text style={styles.confirmValue}>{formData.adminPhoneNumber || '(Not set)'}</Text>
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

      {/* Unsaved Changes Modal */}
      <Modal
        visible={showUnsavedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnsavedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleWarning}>Unsaved Changes</Text>
            <Text style={styles.modalSubtitle}>
              You have unsaved changes. Do you want to discard them?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowUnsavedModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Stay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => {
                  setShowUnsavedModal(false);
                  const action = pendingNavActionRef.current;
                  pendingNavActionRef.current = null;
                  if (action) {
                    navigation.dispatch(action);
                  }
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Discard Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flex: 1,
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
  testWhatsAppButton: {
    backgroundColor: '#25D366',
    borderRadius: 6,
    padding: Platform.OS === 'web' ? 14 : 12,
    alignItems: 'center',
    marginTop: 16,
  },
  testWhatsAppButtonText: {
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
  modalTitleWarning: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    color: '#DC3545',
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
  modalButtonDanger: {
    backgroundColor: '#DC3545',
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
