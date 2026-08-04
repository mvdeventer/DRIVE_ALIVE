/**
 * CreateUserScreen — admin-only account creation for students and instructors.
 *
 * Public self-registration is unchanged and still the normal path; this is the
 * admin equivalent for walk-in signups. Admins remain the only actors permitted
 * on this route (enforced server-side by RoleTransitionPolicy's ADMIN_GRANT
 * channel, not by hiding the screen).
 *
 * Admin accounts are NOT created here — they keep their own screen because they
 * additionally carry the global SMTP/Twilio configuration.
 */
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '../../components/ui';
import InlineMessage from '../../components/InlineMessage';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeContext';
import api from '../../services/api';
import { passwordErrorMessage } from '../../utils/passwordPolicy';

type TargetRole = 'student' | 'instructor';

interface FormState {
  // shared identity
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  password: string;
  confirmPassword: string;
  // shared address
  address_line1: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  // student
  learners_permit_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // instructor
  license_number: string;
  license_types: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  hourly_rate: string;
  service_radius_km: string;
  // consent
  accept_terms: boolean;
}

const EMPTY: FormState = {
  first_name: '', last_name: '', email: '', phone: '', id_number: '',
  password: '', confirmPassword: '',
  address_line1: '', suburb: '', city: '', province: '', postal_code: '',
  learners_permit_number: '', emergency_contact_name: '', emergency_contact_phone: '',
  license_number: '', license_types: '', vehicle_registration: '',
  vehicle_make: '', vehicle_model: '', vehicle_year: '', hourly_rate: '',
  service_radius_km: '20',
  accept_terms: false,
};

/** Fields required by the backend schema for each role. */
const REQUIRED: Record<TargetRole, (keyof FormState)[]> = {
  student: [
    'first_name', 'last_name', 'email', 'phone', 'id_number', 'password',
    'address_line1', 'postal_code', 'emergency_contact_name', 'emergency_contact_phone',
  ],
  instructor: [
    'first_name', 'last_name', 'email', 'phone', 'id_number', 'password',
    'license_number', 'license_types', 'vehicle_registration', 'vehicle_make',
    'vehicle_model', 'vehicle_year', 'hourly_rate',
  ],
};

/**
 * Field -> i18n key. Labels are looked up at render time rather than passed in
 * as literals: the previous version passed them positionally to `field()`,
 * which meant they were never translated AND were invisible to
 * i18n-detect-hardcoded (its scan only matches strings in attribute position).
 */
const LABEL_KEYS: Record<keyof FormState, string> = {
  first_name: 'createUser.field.firstName',
  last_name: 'createUser.field.lastName',
  email: 'createUser.field.email',
  phone: 'createUser.field.phone',
  id_number: 'createUser.field.idNumber',
  password: 'createUser.field.password',
  confirmPassword: 'createUser.field.confirmPassword',
  address_line1: 'createUser.field.streetAddress',
  suburb: 'createUser.field.suburb',
  city: 'createUser.field.city',
  province: 'createUser.field.province',
  postal_code: 'createUser.field.postalCode',
  learners_permit_number: 'createUser.field.learnersPermit',
  emergency_contact_name: 'createUser.field.emergencyName',
  emergency_contact_phone: 'createUser.field.emergencyPhone',
  license_number: 'createUser.field.licenceNumber',
  license_types: 'createUser.field.licenceCodes',
  vehicle_registration: 'createUser.field.vehicleRegistration',
  vehicle_make: 'createUser.field.vehicleMake',
  vehicle_model: 'createUser.field.vehicleModel',
  vehicle_year: 'createUser.field.vehicleYear',
  hourly_rate: 'createUser.field.hourlyRate',
  service_radius_km: 'createUser.field.serviceRadius',
  accept_terms: 'createUser.consent',
};

export default function CreateUserScreen({ navigation }: any) {
  const { colors, radii, fontFamilies } = useTheme();
  const t = useT();

  const [role, setRole] = useState<TargetRole>('student');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /** Translated name of the role being created, for interpolated strings. */
  const roleLabel = t(
    role === 'student' ? 'createUser.roleStudent' : 'createUser.roleInstructor',
  );

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
    setErrorMessage('');
  };

  const missing = useMemo(
    () => REQUIRED[role].filter((k) => !String(form[k] ?? '').trim()),
    [role, form],
  );
  const canSubmit = missing.length === 0 && form.accept_terms && !loading;

  /** Translated field name, e.g. for "X is required". */
  const labelOf = (k: keyof FormState) => t(LABEL_KEYS[k]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    REQUIRED[role].forEach((k) => {
      if (!String(form[k] ?? '').trim()) {
        next[k] = t('createUser.error.required', { field: labelOf(k) });
      }
    });

    if (form.email && !form.email.includes('@')) {
      next.email = t('createUser.error.invalidEmail');
    }
    if (form.id_number && !/^\d{13}$/.test(form.id_number)) {
      next.id_number = t('createUser.error.idDigits');
    }
    if (form.password) {
      const pwdError = passwordErrorMessage(form.password, t);
      if (pwdError) next.password = pwdError;
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = t('createUser.error.passwordMismatch');
    }
    if (role === 'instructor') {
      if (form.vehicle_year && !/^\d{4}$/.test(form.vehicle_year)) {
        next.vehicle_year = t('createUser.error.fourDigitYear');
      }
      if (form.hourly_rate && Number.isNaN(Number(form.hourly_rate))) {
        next.hourly_rate = t('createUser.error.enterNumber');
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!form.accept_terms) {
      setErrorMessage(t('createUser.error.mustAcceptTerms'));
      return;
    }
    if (!validate()) {
      setErrorMessage(t('createUser.error.correctFields'));
      return;
    }

    setLoading(true);
    try {
      const shared = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        accept_terms: true,
        province: form.province || null,
        city: form.city || null,
        suburb: form.suburb || null,
      };

      const result =
        role === 'student'
          ? await api.adminCreateStudent({
              ...shared,
              id_number: form.id_number.trim(),
              learners_permit_number: form.learners_permit_number || null,
              emergency_contact_name: form.emergency_contact_name.trim(),
              emergency_contact_phone: form.emergency_contact_phone.trim(),
              address_line1: form.address_line1.trim(),
              postal_code: form.postal_code.trim(),
            })
          : await api.adminCreateInstructor({
              ...shared,
              id_number: form.id_number.trim(),
              license_number: form.license_number.trim(),
              license_types: form.license_types.trim(),
              vehicle_registration: form.vehicle_registration.trim(),
              vehicle_make: form.vehicle_make.trim(),
              vehicle_model: form.vehicle_model.trim(),
              vehicle_year: Number(form.vehicle_year),
              hourly_rate: Number(form.hourly_rate),
              service_radius_km: Number(form.service_radius_km || 20),
            });

      setSuccessMessage(result?.message ?? t('createUser.created', { role: roleLabel }));
      setForm(EMPTY);
      setErrors({});
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : detail?.message ?? t('createUser.error.createFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const field = (
    k: keyof FormState,
    required = false,
    extra: Record<string, unknown> = {},
  ) => (
    <Input
      label={`${labelOf(k)}${required ? ' *' : ''}`}
      value={String(form[k] ?? '')}
      onChangeText={(v: string) => set(k, v)}
      error={errors[k]}
      editable={!loading}
      {...extra}
    />
  );

  return (
    <ScreenContainer width="form">
      {Platform.OS === 'web' ? (
        <WebNavigationHeader
          title={t('createUser.title')}
          onBack={() => navigation.goBack()}
          showBackButton={navigation.canGoBack()}
        />
      ) : null}

      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fontFamilies.semibold }]}>
          {t('createUser.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('createUser.subtitle')}
        </Text>

        {/* Role selector */}
        <View style={styles.roleRow} accessibilityRole="radiogroup">
          {(['student', 'instructor'] as TargetRole[]).map((r) => {
            const active = role === r;
            const rLabel = t(
              r === 'student' ? 'createUser.roleStudent' : 'createUser.roleInstructor',
            );
            return (
              <Pressable
                key={r}
                onPress={() => {
                  setRole(r);
                  setErrors({});
                  setErrorMessage('');
                }}
                disabled={loading}
                accessibilityRole="radio"
                // accessibilityState alone emits no ARIA attribute on RNW 0.21;
                // the explicit aria-checked is what a screen reader reads.
                accessibilityState={{ checked: active, disabled: loading }}
                {...({ 'aria-checked': active } as any)}
                accessibilityLabel={t('createUser.roleA11y', { role: rLabel })}
                style={[
                  styles.rolePill,
                  {
                    borderRadius: radii.sm,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.text,
                    fontFamily: fontFamilies.semibold,
                    fontSize: 14,
                  }}
                >
                  {rLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {errorMessage ? <InlineMessage type="error" message={errorMessage} /> : null}
      {successMessage ? <InlineMessage type="success" message={successMessage} /> : null}

      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('createUser.identity')}</Text>
        {field('first_name', true)}
        {field('last_name', true)}
        {field('email', true, {
          keyboardType: 'email-address',
          autoCapitalize: 'none',
        })}
        {field('phone', true, { keyboardType: 'phone-pad' })}
        {field('id_number', true, { keyboardType: 'numeric', maxLength: 13 })}
      </Card>

      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('createUser.password')}</Text>
        {field('password', true, { secureTextEntry: true })}
        <PasswordStrengthMeter password={form.password} />
        {field('confirmPassword', true, { secureTextEntry: true })}
      </Card>

      {role === 'student' ? (
        <Card variant="outlined" padding="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('createUser.studentDetails')}</Text>
          {field('learners_permit_number')}
          {field('emergency_contact_name', true)}
          {field('emergency_contact_phone', true, {
            keyboardType: 'phone-pad',
          })}
          {field('address_line1', true)}
          {field('suburb')}
          {field('city')}
          {field('province')}
          {field('postal_code', true, { keyboardType: 'numeric' })}
        </Card>
      ) : (
        <>
          <Card variant="outlined" padding="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('createUser.licence')}</Text>
            {field('license_number', true)}
            {field('license_types', true, {
              placeholder: t('createUser.licenceCodesPlaceholder'),
            })}
          </Card>

          <Card variant="outlined" padding="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('createUser.vehicle')}</Text>
            {field('vehicle_registration', true)}
            {field('vehicle_make', true)}
            {field('vehicle_model', true)}
            {field('vehicle_year', true, {
              keyboardType: 'numeric',
              maxLength: 4,
            })}
          </Card>

          <Card variant="outlined" padding="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t('createUser.ratesArea')}
            </Text>
            {field('hourly_rate', true, { keyboardType: 'numeric' })}
            {field('service_radius_km', false, { keyboardType: 'numeric' })}
            {field('suburb')}
            {field('city')}
            {field('province')}
          </Card>
        </>
      )}

      <Card variant="outlined" padding="md" style={styles.section}>
        <Pressable
          onPress={() => set('accept_terms', !form.accept_terms)}
          disabled={loading}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.accept_terms, disabled: loading }}
          accessibilityLabel={t('createUser.consentA11y')}
          style={styles.consentRow}
          hitSlop={8}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderRadius: radii.sm,
                borderColor: form.accept_terms ? colors.primary : colors.border,
                backgroundColor: form.accept_terms ? colors.primary : 'transparent',
              },
            ]}
          >
            {form.accept_terms ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={[styles.consentText, { color: colors.text }]}>
            {t('createUser.consent')}
          </Text>
        </Pressable>
      </Card>

      {missing.length > 0 ? (
        <Text style={[styles.missing, { color: colors.textSecondary }]}>
          {t('createUser.stillRequired', {
            fields: missing.map((k) => labelOf(k)).join(', '),
          })}
        </Text>
      ) : null}

      <Button
        label={
          loading ? t('createUser.creating') : t('createUser.submit', { role: roleLabel })
        }
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
        fullWidth
        style={styles.submit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  title: { fontSize: 20, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 8 },
  rolePill: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 14, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 13, lineHeight: 18 },
  missing: { fontSize: 12, marginBottom: 8, paddingHorizontal: 4 },
  submit: { marginBottom: 32 },
});
