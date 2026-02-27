/**
 * Admin Settings Screen
 * Configure system-wide settings including verification link validity
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
import apiService from '../../services/api';

const SCREEN_NAME = 'AdminSettingsScreen';

export default function AdminSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
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
  const [showTwilioAuthToken, setShowTwilioAuthToken] = useState(false);
  const [actualPassword, setActualPassword] = useState('');  // Store actual password for masking
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
    twilioAccountSid: '',   // blank = no change; enter new to update
    twilioAuthToken: '',    // blank = no change; enter new to update
    testRecipient: '',
    inactivityTimeout: '15',  // Auto-logout timeout in minutes
  });

  // Track whether SID/token are configured in DB (to show ✅ hint)
  const [twilioSidConfigured, setTwilioSidConfigured] = useState(false);
  const [twilioTokenConfigured, setTwilioTokenConfigured] = useState(false);

  const [originalData, setOriginalData] = useState({
    smtpEmail: '',
    smtpPassword: '',
    linkValidity: '30',
    backupIntervalMinutes: '10',
    retentionDays: '30',
    autoArchiveAfterDays: '14',
    twilioPhoneNumber: '',
    adminPhoneNumber: '',
    inactivityTimeout: '15',
  });

  // Track whether SID/token are configured in DB for originalData comparison
  const [originalTwilioSid, setOriginalTwilioSid] = useState('');
  const [originalTwilioToken, setOriginalTwilioToken] = useState('');

  const loadSettings = async () => {
    try {
      setErrorMessage('');
      const data = await apiService.getAdminSettings();
      
      const settingsData = {
        smtpEmail: data.smtp_email || '',
        smtpPassword: data.smtp_password || '',  // Store actual password
        linkValidity: data.verification_link_validity_minutes?.toString() || '30',
        backupIntervalMinutes: data.backup_interval_minutes?.toString() || '10',
        retentionDays: data.retention_days?.toString() || '30',
        autoArchiveAfterDays: data.auto_archive_after_days?.toString() || '14',
        twilioPhoneNumber: data.twilio_sender_phone_number || '',
        adminPhoneNumber: data.twilio_phone_number || '',
        twilioAccountSid: '',  // never pre-fill; show configured hint instead
        twilioAuthToken: '',   // never pre-fill; show configured hint instead
        testRecipient: '',
        inactivityTimeout: data.inactivity_timeout_minutes?.toString() || '15',
      };

      setTwilioSidConfigured(!!data.twilio_account_sid);
      setTwilioTokenConfigured(!!data.twilio_auth_token);

      setFormData(settingsData);
      setActualPassword(data.smtp_password || '');  // Store decrypted password
      setOriginalData({
        smtpEmail: settingsData.smtpEmail,
        smtpPassword: settingsData.smtpPassword,
        linkValidity: settingsData.linkValidity,
        backupIntervalMinutes: settingsData.backupIntervalMinutes,
        retentionDays: settingsData.retentionDays,
        autoArchiveAfterDays: settingsData.autoArchiveAfterDays,
        twilioPhoneNumber: settingsData.twilioPhoneNumber,
        adminPhoneNumber: settingsData.adminPhoneNumber,
        inactivityTimeout: settingsData.inactivityTimeout,
      });
      setOriginalTwilioSid(settingsData.twilioAccountSid);
      setOriginalTwilioToken(settingsData.twilioAuthToken);
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
    // Ignore password field if it's the placeholder or empty
    const passwordChanged = formData.smtpPassword !== originalData.smtpPassword &&
                           formData.smtpPassword !== '••••••••••••••••' &&
                           formData.smtpPassword !== '';
    
    return (
      formData.smtpEmail !== originalData.smtpEmail ||
      passwordChanged ||
      formData.linkValidity !== originalData.linkValidity ||
      formData.inactivityTimeout !== originalData.inactivityTimeout ||
      formData.backupIntervalMinutes !== originalData.backupIntervalMinutes ||
      formData.retentionDays !== originalData.retentionDays ||
      formData.autoArchiveAfterDays !== originalData.autoArchiveAfterDays ||
      formData.twilioPhoneNumber !== originalData.twilioPhoneNumber ||
      formData.adminPhoneNumber !== originalData.adminPhoneNumber ||
      formData.twilioAccountSid !== originalTwilioSid ||
      formData.twilioAuthToken !== originalTwilioToken
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
      // Send actual password or null if empty
      const passwordToSend = formData.smtpPassword ? formData.smtpPassword : null;
      
      const response = await apiService.updateAdminSettings({
        smtp_email: formData.smtpEmail || null,
        smtp_password: passwordToSend || null,
        verification_link_validity_minutes: parseInt(formData.linkValidity) || 30,
        backup_interval_minutes: parseInt(formData.backupIntervalMinutes) || 10,
        retention_days: parseInt(formData.retentionDays) || 30,
        auto_archive_after_days: parseInt(formData.autoArchiveAfterDays) || 14,
        twilio_sender_phone_number: formData.twilioPhoneNumber || null,
        twilio_phone_number: formData.adminPhoneNumber || null,
        twilio_account_sid: formData.twilioAccountSid.trim() || null,
        twilio_auth_token: formData.twilioAuthToken.trim() || null,
        inactivity_timeout_minutes: parseInt(formData.inactivityTimeout) || 15,
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
        inactivityTimeout: formData.inactivityTimeout,
      });
      // If we just saved new SID/token, mark them as configured & clear fields
      if (formData.twilioAccountSid.trim()) setTwilioSidConfigured(true);
      if (formData.twilioAuthToken.trim()) setTwilioTokenConfigured(true);
      setOriginalTwilioSid('');
      setOriginalTwilioToken('');
      setFormData(prev => ({ ...prev, twilioAccountSid: '', twilioAuthToken: '' }));

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
      const response = await apiService.post('/verify/test-email', {
        smtp_email: formData.smtpEmail,
        smtp_password: formData.smtpPassword,
        test_recipient: formData.testRecipient,
        verification_link_validity_minutes: parseInt(formData.linkValidity) || 30,
      });

      const data = response.data;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage(`✅ ${data.message || 'Test email sent successfully! Check your inbox.'}`);
      setTimeout(() => setSuccessMessage(''), 4000);
      
      // Reload settings to get the saved values from database
      await loadSettings();
    } catch (error: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      setErrorMessage(`❌ Test failed: ${detail}`);
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
      const response = await apiService.post('/verify/test-whatsapp', {
        phone: formData.adminPhoneNumber,
        twilio_sender_phone_number: formData.twilioPhoneNumber,
        // Pass new SID/token if user entered them in the form; otherwise backend uses DB
        ...(formData.twilioAccountSid.trim() && { twilio_account_sid: formData.twilioAccountSid.trim() }),
        ...(formData.twilioAuthToken.trim() && { twilio_auth_token: formData.twilioAuthToken.trim() }),
      });

      const data = response.data;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage(`\u2705 ${data.message || 'Test WhatsApp sent successfully! Check your phone.'}`);
      setTimeout(() => setSuccessMessage(''), 4000);
      // Reload settings to get the saved values from database
      await loadSettings();
    } catch (error: any) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      setErrorMessage(`\u274C Test failed: ${detail}`);
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Admin Settings"
        onBack={() => navigation.goBack()}
        showBackButton={navigation.canGoBack()}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {successMessage ? <InlineMessage message={successMessage} type="success" /> : null}
        {errorMessage ? <InlineMessage message={errorMessage} type="error" /> : null}

        <View style={styles.content}>
          {/* Verification Settings Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Email Configuration</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Configure Gmail SMTP to send verification emails (global setting - shared by all admins)
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Gmail Address</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="admin@gmail.com"
                placeholderTextColor={colors.textMuted}
                value={formData.smtpEmail}
                onChangeText={(value) => handleChange('smtpEmail', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Gmail App Password</Text>
              <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="xxxx xxxx xxxx xxxx"
                  placeholderTextColor={colors.textMuted}
                  value={showPassword ? formData.smtpPassword : formData.smtpPassword.replace(/./g, '\u2022')}
                  onChangeText={(value) => {
                    if (showPassword) {
                      handleChange('smtpPassword', value);
                      setActualPassword(value);
                    }
                  }}
                  secureTextEntry={false}
                  autoCapitalize="none"
                  editable={!saving && showPassword}
                  selectTextOnFocus={showPassword}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {showPassword 
                  ? 'Generate at: myaccount.google.com/apppasswords'
                  : 'Click Show to view or edit the password'
                }
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Link Validity (Minutes)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                value={formData.linkValidity}
                onChangeText={(value) => handleChange('linkValidity', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                How long verification links remain valid (15-120 minutes recommended)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Auto-Logout Timeout (Minutes)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="15"
                placeholderTextColor={colors.textMuted}
                value={formData.inactivityTimeout}
                onChangeText={(value) => handleChange('inactivityTimeout', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Automatically log out inactive users after this many minutes (1-120 minutes). 
                Applies to all users (students, instructors, admins). Default: 15 minutes.
              </Text>
              <Text style={[styles.hint, { marginTop: 5, fontFamily: 'Inter_600SemiBold', color: colors.primary }]}>
                On web browsers, closing the tab/window will also log out users immediately.
              </Text>
            </View>

            {/* Test Email Section */}
            <View style={[styles.testEmailSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.testEmailTitle, { color: colors.text }]}>Test Email Configuration</Text>
              <Text style={[styles.testEmailSubtitle, { color: colors.textSecondary }]}>
                Send a test email to verify your SMTP settings. Settings will be saved to database for all admin roles.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Test Recipient Email</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                  placeholder="test@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={formData.testRecipient}
                  onChangeText={(value) => handleChange('testRecipient', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!testingEmail}
                />
              </View>

              <Button
                variant="secondary"
                onPress={handleTestEmail}
                disabled={testingEmail}
                loading={testingEmail}
                fullWidth
              >
                Send Test Email & Save Settings
              </Button>
              
              <Text style={[styles.hint, { marginTop: 10, fontStyle: 'italic', color: colors.textMuted }]}>
                Email credentials will be saved to database when test succeeds
              </Text>
            </View>
          </Card>

          {/* Backup Configuration Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup Configuration</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Configure automatic database backup settings and retention policies
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Backup Interval (Minutes)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                value={formData.backupIntervalMinutes}
                onChangeText={(value) => handleChange('backupIntervalMinutes', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                How often to create automatic backups (5-60 minutes recommended)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Retention Days</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                value={formData.retentionDays}
                onChangeText={(value) => handleChange('retentionDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Keep uncompressed backups for this many days (default: 30 days)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Auto-Archive After Days</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="14"
                placeholderTextColor={colors.textMuted}
                value={formData.autoArchiveAfterDays}
                onChangeText={(value) => handleChange('autoArchiveAfterDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Compress old backups to ZIP after this many days (default: 14 days)
              </Text>
            </View>
          </Card>

          {/* Twilio WhatsApp Configuration Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>WhatsApp Configuration</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Configure Twilio credentials and sender number (global for all admins)
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Twilio Account SID</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder={twilioSidConfigured ? '✅ Configured — enter new SID to replace' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                placeholderTextColor={colors.textMuted}
                value={formData.twilioAccountSid}
                onChangeText={(value) => handleChange('twilioAccountSid', value)}
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Twilio Auth Token</Text>
              <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder={twilioTokenConfigured ? '✅ Configured — enter new token to replace' : 'Your Twilio Auth Token'}
                  placeholderTextColor={colors.textMuted}
                  value={formData.twilioAuthToken}
                  onChangeText={(value) => handleChange('twilioAuthToken', value)}
                  secureTextEntry={!showTwilioAuthToken}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowTwilioAuthToken(!showTwilioAuthToken)}>
                  <Text style={styles.eyeIcon}>{showTwilioAuthToken ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>Found at console.twilio.com — never share this token</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Twilio Sender Phone Number (FROM)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="+14155238886 (Twilio sandbox)"
                placeholderTextColor={colors.textMuted}
                value={formData.twilioPhoneNumber}
                onChangeText={(value) => handleChange('twilioPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                This number sends all WhatsApp messages (sandbox: +14155238886 or your Twilio number)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Your Phone Number (TO - for testing)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="+27611154598"
                placeholderTextColor={colors.textMuted}
                value={formData.adminPhoneNumber}
                onChangeText={(value) => handleChange('adminPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Your personal phone number to receive test WhatsApp messages
              </Text>
            </View>

            <Button
              variant="primary"
              style={{ backgroundColor: colors.success }}
              onPress={handleTestWhatsApp}
              disabled={!formData.twilioPhoneNumber || !formData.adminPhoneNumber || testingWhatsApp}
              loading={testingWhatsApp}
              fullWidth
            >
              Send Test WhatsApp & Save Settings
            </Button>
            
            <Text style={[styles.hint, { marginTop: 10, fontStyle: 'italic', color: colors.textMuted }]}>
              Twilio credentials will be saved to database when test succeeds
            </Text>
          </Card>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>About These Settings</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              <Text style={{ fontFamily: 'Inter_700Bold' }}>Verification:</Text>{'\n'}
              {'\u2022'} New users receive verification emails/WhatsApp{'\n'}
              {'\u2022'} Verification links expire after the configured time{'\n'}
              {'\u2022'} Users cannot log in until they verify{'\n\n'}
              <Text style={{ fontFamily: 'Inter_700Bold' }}>Backups:</Text>{'\n'}
              {'\u2022'} Automatic database backups on your schedule{'\n'}
              {'\u2022'} Old backups are compressed to save storage{'\n'}
              {'\u2022'} You can restore from any backup anytime
            </Text>
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            style={{ backgroundColor: hasUnsavedChanges() ? colors.success : colors.textMuted }}
            onPress={handleSave}
            disabled={!hasUnsavedChanges() || saving}
            loading={saving}
            fullWidth
          >
            {hasUnsavedChanges() ? 'Save Changes' : 'No Changes'}
          </Button>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ThemedModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Settings Update"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" onPress={() => setShowConfirmModal(false)} style={{ flex: 1 }}>
              Edit
            </Button>
            <Button variant="primary" onPress={confirmAndSave} style={{ flex: 1, backgroundColor: colors.success }}>
              Confirm & Save
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Please review your changes</Text>

        <View style={[styles.confirmDetails, { backgroundColor: colors.backgroundSecondary }]}>
          {formData.smtpEmail !== originalData.smtpEmail && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Gmail Address:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.smtpEmail || '(Not set)'}</Text>
            </>
          )}

          {formData.smtpPassword !== originalData.smtpPassword && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>App Password:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>
                {formData.smtpPassword ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '(Not set)'}
              </Text>
            </>
          )}

          {formData.linkValidity !== originalData.linkValidity && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Link Validity:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.linkValidity} minutes</Text>
            </>
          )}

          {formData.inactivityTimeout !== originalData.inactivityTimeout && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Auto-Logout Timeout:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.inactivityTimeout} minutes</Text>
            </>
          )}

          {formData.backupIntervalMinutes !== originalData.backupIntervalMinutes && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Backup Interval:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.backupIntervalMinutes} minutes</Text>
            </>
          )}

          {formData.retentionDays !== originalData.retentionDays && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Retention Days:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.retentionDays} days</Text>
            </>
          )}

          {formData.autoArchiveAfterDays !== originalData.autoArchiveAfterDays && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Auto-Archive After:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.autoArchiveAfterDays} days</Text>
            </>
          )}

          {formData.twilioPhoneNumber !== originalData.twilioPhoneNumber && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Twilio Sender Phone:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.twilioPhoneNumber || '(Not set)'}</Text>
            </>
          )}

          {formData.adminPhoneNumber !== originalData.adminPhoneNumber && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textMuted }]}>Your Phone Number:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.adminPhoneNumber || '(Not set)'}</Text>
            </>
          )}
        </View>
      </ThemedModal>

      {/* Unsaved Changes Modal */}
      <ThemedModal
        visible={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="Unsaved Changes"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" onPress={() => setShowUnsavedModal(false)} style={{ flex: 1 }}>
              Stay
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                setShowUnsavedModal(false);
                const action = pendingNavActionRef.current;
                pendingNavActionRef.current = null;
                if (action) {
                  navigation.dispatch(action);
                }
              }}
              style={{ flex: 1 }}
            >
              Discard Changes
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          You have unsaved changes. Do you want to discard them?
        </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
  },
  content: {
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: 'Inter_400Regular',
  },
  eyeButton: {
    padding: Platform.OS === 'web' ? 12 : 10,
  },
  eyeIcon: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_600SemiBold',
  },
  hint: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  testEmailSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  testEmailTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  testEmailSubtitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  infoBox: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  confirmDetails: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontFamily: 'Inter_500Medium',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
