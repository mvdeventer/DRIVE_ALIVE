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
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Button, Card, ThemedModal } from '../../components';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';
import apiService from '../../services/api';
import { DEBUG_CONFIG } from '../../config';

const SCREEN_NAME = 'AdminSettingsScreen';

export default function AdminSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
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
    smtpEmail:             DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.SMTP_EMAIL           : '',
    smtpPassword:          DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.SMTP_PASSWORD        : '',
    linkValidity:          '30',
    backupIntervalMinutes: '10',
    retentionDays:         '30',
    autoArchiveAfterDays:  '14',
    twilioPhoneNumber:     DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.TWILIO_SENDER_PHONE  : '',
    adminPhoneNumber:      DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.TWILIO_TEST_PHONE    : '',
    twilioAccountSid:      DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.TWILIO_ACCOUNT_SID   : '',  // blank = no change; enter new to update
    twilioAuthToken:       DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.TWILIO_AUTH_TOKEN    : '',  // blank = no change; enter new to update
    testRecipient:         DEBUG_CONFIG.ENABLED ? DEBUG_CONFIG.DEFAULT_EMAIL        : '',
    inactivityTimeout:     '15',
    commissionPercent:     '8',
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
    commissionPercent: '8',
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
        commissionPercent: data.commission_percent?.toString() || '8',
      };

      // In debug mode, inject credentials that the server never sends back
      if (DEBUG_CONFIG.ENABLED) {
        if (DEBUG_CONFIG.TWILIO_ACCOUNT_SID) settingsData.twilioAccountSid = DEBUG_CONFIG.TWILIO_ACCOUNT_SID;
        if (DEBUG_CONFIG.TWILIO_AUTH_TOKEN)   settingsData.twilioAuthToken   = DEBUG_CONFIG.TWILIO_AUTH_TOKEN;
        if (DEBUG_CONFIG.TWILIO_SENDER_PHONE && !settingsData.twilioPhoneNumber)
          settingsData.twilioPhoneNumber = DEBUG_CONFIG.TWILIO_SENDER_PHONE;
        if (DEBUG_CONFIG.TWILIO_TEST_PHONE && !settingsData.adminPhoneNumber)
          settingsData.adminPhoneNumber  = DEBUG_CONFIG.TWILIO_TEST_PHONE;
        if (DEBUG_CONFIG.SMTP_EMAIL && !settingsData.smtpEmail)
          settingsData.smtpEmail    = DEBUG_CONFIG.SMTP_EMAIL;
        // Replace the "********" mask with the real debug password
        if (DEBUG_CONFIG.SMTP_PASSWORD)
          settingsData.smtpPassword = DEBUG_CONFIG.SMTP_PASSWORD;
        if (DEBUG_CONFIG.DEFAULT_EMAIL)
          settingsData.testRecipient = DEBUG_CONFIG.DEFAULT_EMAIL;
      }

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
        commissionPercent: settingsData.commissionPercent,
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
      formData.commissionPercent !== originalData.commissionPercent ||
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
        commission_percent: parseFloat(formData.commissionPercent) >= 0
          ? parseFloat(formData.commissionPercent)
          : 8,
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
        commissionPercent: formData.commissionPercent,
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
          {/* Language Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminSettings.languageTitle')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('adminSettings.languageSubtitle')}
            </Text>
            <LanguageSwitcher />
          </Card>

          {/* Verification Settings Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminSettings.email.title')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('adminSettings.email.subtitle')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.email.gmailAddress')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="admin@gmail.com"
                placeholderTextColor={colors.textTertiary}
                value={formData.smtpEmail}
                onChangeText={(value) => handleChange('smtpEmail', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.email.appPassword')}</Text>
              <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="xxxx xxxx xxxx xxxx"
                  placeholderTextColor={colors.textTertiary}
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
                  <Text style={styles.eyeIcon}>{showPassword ? t('adminSettings.hide') : t('adminSettings.show')}</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {showPassword 
                  ? t('adminSettings.email.hintGenerate')
                  : t('adminSettings.email.hintShow')
                }
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.email.linkValidity')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="30"
                placeholderTextColor={colors.textTertiary}
                value={formData.linkValidity}
                onChangeText={(value) => handleChange('linkValidity', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.email.linkValidityHint')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.email.autoLogout')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="15"
                placeholderTextColor={colors.textTertiary}
                value={formData.inactivityTimeout}
                onChangeText={(value) => handleChange('inactivityTimeout', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.email.autoLogoutHint')}
              </Text>
              <Text style={[styles.hint, { marginTop: 5, fontFamily: 'Inter_600SemiBold', color: colors.primary }]}>
                {t('adminSettings.email.autoLogoutWeb')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.email.commission')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="8"
                placeholderTextColor={colors.textTertiary}
                value={formData.commissionPercent}
                onChangeText={(value) => handleChange('commissionPercent', value)}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.email.commissionHint')}
              </Text>
            </View>

            {/* Test Email Section */}
            <View style={[styles.testEmailSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.testEmailTitle, { color: colors.text }]}>{t('adminSettings.test.title')}</Text>
              <Text style={[styles.testEmailSubtitle, { color: colors.textSecondary }]}>
                {t('adminSettings.test.subtitle')}
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.test.recipient')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                  placeholder="test@example.com"
                  placeholderTextColor={colors.textTertiary}
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
                {t('adminSettings.test.send')}
              </Button>
              
              <Text style={[styles.hint, { marginTop: 10, fontStyle: 'italic', color: colors.textTertiary }]}>
                {t('adminSettings.test.hint')}
              </Text>
            </View>
          </Card>

          {/* Backup Configuration Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminSettings.backup.title')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('adminSettings.backup.subtitle')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.backup.interval')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
                value={formData.backupIntervalMinutes}
                onChangeText={(value) => handleChange('backupIntervalMinutes', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.backup.intervalHint')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.backup.retention')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="30"
                placeholderTextColor={colors.textTertiary}
                value={formData.retentionDays}
                onChangeText={(value) => handleChange('retentionDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.backup.retentionHint')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.backup.autoArchive')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="14"
                placeholderTextColor={colors.textTertiary}
                value={formData.autoArchiveAfterDays}
                onChangeText={(value) => handleChange('autoArchiveAfterDays', value)}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.backup.autoArchiveHint')}
              </Text>
            </View>
          </Card>

          {/* Twilio WhatsApp Configuration Section */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('adminSettings.whatsapp.title')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('adminSettings.whatsapp.subtitle')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.whatsapp.sid')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder={twilioSidConfigured ? `✅ ${t('adminSettings.whatsapp.sidConfigured')}` : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                placeholderTextColor={colors.textTertiary}
                value={formData.twilioAccountSid}
                onChangeText={(value) => handleChange('twilioAccountSid', value)}
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.whatsapp.token')}</Text>
              <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder={twilioTokenConfigured ? `✅ ${t('adminSettings.whatsapp.tokenConfigured')}` : t('adminSettings.whatsapp.tokenPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={formData.twilioAuthToken}
                  onChangeText={(value) => handleChange('twilioAuthToken', value)}
                  secureTextEntry={!showTwilioAuthToken}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowTwilioAuthToken(!showTwilioAuthToken)}>
                  <Text style={styles.eyeIcon}>{showTwilioAuthToken ? t('adminSettings.hide') : t('adminSettings.show')}</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('adminSettings.whatsapp.tokenHint')}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.whatsapp.sender')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="+14155238886 (Twilio sandbox)"
                placeholderTextColor={colors.textTertiary}
                value={formData.twilioPhoneNumber}
                onChangeText={(value) => handleChange('twilioPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.whatsapp.senderHint')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('adminSettings.whatsapp.yourPhone')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="+27611154598"
                placeholderTextColor={colors.textTertiary}
                value={formData.adminPhoneNumber}
                onChangeText={(value) => handleChange('adminPhoneNumber', value)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t('adminSettings.whatsapp.yourPhoneHint')}
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
              {t('adminSettings.whatsapp.send')}
            </Button>
            
            <Text style={[styles.hint, { marginTop: 10, fontStyle: 'italic', color: colors.textTertiary }]}>
              {t('adminSettings.whatsapp.hint')}
            </Text>
          </Card>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>{t('adminSettings.info.title')}</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              <Text style={{ fontFamily: 'Inter_700Bold' }}>{t('adminSettings.info.verification')}</Text>{'\n'}
              {'\u2022'} {t('adminSettings.info.v1')}{'\n'}
              {'\u2022'} {t('adminSettings.info.v2')}{'\n'}
              {'\u2022'} {t('adminSettings.info.v3')}{'\n\n'}
              <Text style={{ fontFamily: 'Inter_700Bold' }}>{t('adminSettings.info.backups')}</Text>{'\n'}
              {'\u2022'} {t('adminSettings.info.b1')}{'\n'}
              {'\u2022'} {t('adminSettings.info.b2')}{'\n'}
              {'\u2022'} {t('adminSettings.info.b3')}
            </Text>
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            style={{ backgroundColor: hasUnsavedChanges() ? colors.success : colors.textTertiary }}
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
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Gmail Address:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.smtpEmail || '(Not set)'}</Text>
            </>
          )}

          {formData.smtpPassword !== originalData.smtpPassword && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>App Password:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>
                {formData.smtpPassword ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '(Not set)'}
              </Text>
            </>
          )}

          {formData.linkValidity !== originalData.linkValidity && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Link Validity:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.linkValidity} minutes</Text>
            </>
          )}

          {formData.inactivityTimeout !== originalData.inactivityTimeout && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Auto-Logout Timeout:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.inactivityTimeout} minutes</Text>
            </>
          )}

          {formData.commissionPercent !== originalData.commissionPercent && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Platform Commission:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.commissionPercent}%</Text>
            </>
          )}

          {formData.backupIntervalMinutes !== originalData.backupIntervalMinutes && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Backup Interval:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.backupIntervalMinutes} minutes</Text>
            </>
          )}

          {formData.retentionDays !== originalData.retentionDays && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Retention Days:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.retentionDays} days</Text>
            </>
          )}

          {formData.autoArchiveAfterDays !== originalData.autoArchiveAfterDays && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Auto-Archive After:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.autoArchiveAfterDays} days</Text>
            </>
          )}

          {formData.twilioPhoneNumber !== originalData.twilioPhoneNumber && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Twilio Sender Phone:</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{formData.twilioPhoneNumber || '(Not set)'}</Text>
            </>
          )}

          {formData.adminPhoneNumber !== originalData.adminPhoneNumber && (
            <>
              <Text style={[styles.confirmLabel, { color: colors.textTertiary }]}>Your Phone Number:</Text>
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
