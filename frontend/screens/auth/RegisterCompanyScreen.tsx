/**
 * Driving School Registration Screen
 *
 * Registers a school and the person who administers it, in one step.
 *
 * This screen used to be a two-field router: it collected a school name and
 * navigated to RegisterInstructor with presetCompanyChoice='create', which
 * forced school owners to invent a licence number, a vehicle and an hourly
 * rate before they could manage anything. A school administrator does not
 * teach, so none of that applies to them.
 *
 * A solo instructor founding a one-person school still goes through
 * RegisterInstructor with presetCompanyChoice='create' — that path stays.
 */
import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { Button, Card, ThemedModal } from '../../components/ui';
import { DEBUG_CONFIG } from '../../config';
import { useT } from '../../i18n';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { passwordErrorMessage } from '../../utils/passwordPolicy';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

// ── Consent checkbox row (POPIA / GDPR / TCPA) ─────────────────────────────
function ConsentRow({
  checked,
  onToggle,
  colors,
  required = false,
  error,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  colors: any;
  required?: boolean;
  error?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginVertical: 6 }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: error ? colors.danger : checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            marginTop: 2,
          }}
        >
          {checked && (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}
            >
              ✓
            </Text>
          )}
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 }}>
          {children}
          {required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
      </Pressable>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginLeft: 32 }}>{error}</Text>
      ) : null}
    </View>
  );
}

export default function RegisterCompanyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const t = useT();
  const scrollViewRef = useRef<ScrollView>(null);

  const [formData, setFormData] = useState({
    company_name: DEBUG_CONFIG.ENABLED ? 'ABC Driving Academy' : '',
    billing_email: '',
    first_name: DEBUG_CONFIG.ENABLED ? 'Thandi' : '',
    last_name: DEBUG_CONFIG.ENABLED ? 'Nkosi' : '',
    email: '',
    phone: DEBUG_CONFIG.ENABLED ? '+27611154598' : '',
    password: '',
    confirmPassword: '',
    accept_terms: DEBUG_CONFIG.ENABLED,
    opt_in_email_marketing: false,
    opt_in_sms: false,
    opt_in_whatsapp: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const updateField = (field: string, value: string | boolean) => {
    const next = field === 'phone' && typeof value === 'string' ? formatPhoneNumber(value) : value;
    setFormData(prev => ({ ...prev, [field]: next }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      errors.company_name = 'Driving school name is required';
    } else if (formData.company_name.trim().length < 2) {
      errors.company_name = 'Driving school name is too short';
    }
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Valid email is required';
    }
    if (formData.billing_email.trim() && !formData.billing_email.includes('@')) {
      errors.billing_email = 'Valid email is required';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const pwdError = passwordErrorMessage(formData.password, t);
      if (pwdError) errors.password = pwdError;
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.accept_terms) {
      errors.accept_terms = 'You must accept the Terms of Service and Privacy Policy';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    setMessage(null);
    if (validate()) setShowConfirmModal(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false);
    setMessage(null);
    setLoading(true);

    try {
      const { confirmPassword, billing_email, ...rest } = formData;
      const response = await ApiService.registerCompany({
        ...rest,
        // Omit rather than send an empty string; the backend falls back to the
        // administrator's own email.
        ...(billing_email.trim() ? { billing_email: billing_email.trim() } : {}),
      });

      if (response.requires_verification) {
        const verification = response.verification_sent || {};
        navigation.replace('VerificationPending', {
          email: formData.email,
          phone: formData.phone,
          firstName: formData.first_name,
          emailSent: verification.email_sent ?? false,
          whatsappSent: verification.whatsapp_sent ?? false,
          expiryMinutes: verification.expires_in_minutes || 30,
        });
      } else {
        // An existing, already-verified account simply gained a school.
        navigation.replace('Login');
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const errorText =
        typeof detail === 'string'
          ? detail
          : detail?.message || 'An error occurred during registration';
      setMessage({ type: 'error', text: `Registration failed: ${errorText}` });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Register Your Driving School
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create the school and your administrator account. You will be able to add instructors
          once your email is verified.
        </Text>
      </View>

      {message && <InlineMessage type={message.type} message={message.text} />}

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Driving School</Text>
        <FormFieldWithTip
          label="Driving School Name"
          placeholder="e.g., ABC Driving Academy"
          value={formData.company_name}
          onChangeText={value => updateField('company_name', value)}
          tooltip="The trading name of your school, as students will see it."
          required
          error={fieldErrors.company_name}
        />
        <FormFieldWithTip
          label="Billing Email (optional)"
          placeholder="accounts@yourschool.co.za"
          value={formData.billing_email}
          onChangeText={value => updateField('billing_email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          tooltip="Where statements are sent. Defaults to your own email address."
          error={fieldErrors.billing_email}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Administrator Account</Text>
        <Text style={[styles.sectionNote, { color: colors.textSecondary }]}>
          This account manages the school. You do not need an instructor licence.
        </Text>
        <FormFieldWithTip
          label="First Name"
          placeholder="Enter your first name"
          value={formData.first_name}
          onChangeText={value => updateField('first_name', value)}
          tooltip="Your legal first name as it appears on your ID."
          required
          error={fieldErrors.first_name}
        />
        <FormFieldWithTip
          label="Last Name"
          placeholder="Enter your last name"
          value={formData.last_name}
          onChangeText={value => updateField('last_name', value)}
          tooltip="Your legal last name as it appears on your ID."
          required
          error={fieldErrors.last_name}
        />
        <FormFieldWithTip
          label="Email Address"
          placeholder="you@yourschool.co.za"
          value={formData.email}
          onChangeText={value => updateField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          tooltip="You sign in with this address. A verification link is sent here."
          required
          error={fieldErrors.email}
        />
        <FormFieldWithTip
          label="Phone Number"
          placeholder="+27 XX XXX XXXX"
          value={formData.phone}
          onChangeText={value => updateField('phone', value)}
          keyboardType="phone-pad"
          tooltip="South African number starting with +27."
          required
          error={fieldErrors.phone}
        />
        <FormFieldWithTip
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChangeText={value => updateField('password', value)}
          secureTextEntry
          tooltip="At least 8 characters, with upper and lower case, a number and a symbol."
          required
          error={fieldErrors.password}
        />
        <PasswordStrengthMeter password={formData.password} />
        <FormFieldWithTip
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          secureTextEntry
          tooltip="Must match the password above."
          required
          error={fieldErrors.confirmPassword}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Consent & Communications</Text>
        <ConsentRow
          checked={formData.accept_terms}
          onToggle={() => updateField('accept_terms', !formData.accept_terms)}
          colors={colors}
          required
          error={fieldErrors.accept_terms}
          label="Accept the Terms of Service and Privacy Policy"
        >
          I accept the{' '}
          <Text
            style={{ color: colors.primary, fontWeight: '600' }}
            onPress={() => navigation.navigate('Terms')}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={{ color: colors.primary, fontWeight: '600' }}
            onPress={() => navigation.navigate('Privacy')}
          >
            Privacy Policy
          </Text>
          .
        </ConsentRow>
        <ConsentRow
          checked={formData.opt_in_email_marketing}
          onToggle={() => updateField('opt_in_email_marketing', !formData.opt_in_email_marketing)}
          colors={colors}
          label="Receive product updates by email"
        >
          Send me product updates and promotions by email (optional).
        </ConsentRow>
        <ConsentRow
          checked={formData.opt_in_sms}
          onToggle={() => updateField('opt_in_sms', !formData.opt_in_sms)}
          colors={colors}
          label="Receive SMS notifications"
        >
          Send me SMS reminders and notifications (optional).
        </ConsentRow>
        <ConsentRow
          checked={formData.opt_in_whatsapp}
          onToggle={() => updateField('opt_in_whatsapp', !formData.opt_in_whatsapp)}
          colors={colors}
          label="Receive WhatsApp notifications"
        >
          Send me WhatsApp reminders and notifications (optional).
        </ConsentRow>
      </Card>

      <Button onPress={handleSubmit} loading={loading} disabled={loading} fullWidth>
        Register Driving School
      </Button>

      <Pressable
        onPress={() => navigation.navigate('RegisterChoice')}
        accessibilityRole="button"
        accessibilityLabel="Back to account type"
        hitSlop={8}
        style={styles.linkButton}
      >
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>Back to account type</Text>
      </Pressable>

      <ThemedModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Registration"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onPress={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onPress={confirmAndSubmit}>Confirm</Button>
          </>
        }
      >
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
          Register <Text style={{ fontWeight: '700' }}>{formData.company_name.trim()}</Text> with{' '}
          <Text style={{ fontWeight: '700' }}>{formData.email.trim()}</Text> as its administrator?
        </Text>
      </ThemedModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Platform.OS === 'web' ? 32 : 20,
    paddingBottom: 48,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 30 : 24,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  sectionNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  linkButton: {
    marginTop: 18,
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
