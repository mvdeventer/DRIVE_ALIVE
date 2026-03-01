/**
 * Instructor Registration Screen — 4-step wizard
 * Step 1: Personal Info
 * Step 2: Professional Details
 * Step 3: Company / Driving School
 * Step 4: Weekly Schedule
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import ScheduleEditor, { ScheduleSlot } from '../../components/ScheduleEditor';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { DEBUG_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

interface CompanyOption {
  id: number;
  name: string;
}

export default function RegisterInstructorScreen({ navigation }: any) {
  const { colors } = useTheme();
  const timestamp = DEBUG_CONFIG.ENABLED ? Date.now().toString().slice(-6) : '';

  // ── Step state ──────────────────────────────────────────
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  // ── Form data (steps 1 & 2) ─────────────────────────────
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
    hourly_rate: DEBUG_CONFIG.ENABLED ? '350' : '',
    service_radius_km: '20',
    max_travel_distance_km: '50',
    rate_per_km_beyond_radius: '5',
    bio: DEBUG_CONFIG.ENABLED
      ? 'Experienced driving instructor with 15 years teaching Code B, EB, and C1.'
      : '',
  });

  // ── Company state (step 3) ──────────────────────────────
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyChoice, setCompanyChoice] = useState<'independent' | 'join' | 'create'>('independent');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');

  // ── Schedule state (step 4) ─────────────────────────────
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);

  // ── UI state ────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // ── Load companies when reaching step 3 ────────────────
  useEffect(() => {
    if (step === 3 && companies.length === 0 && !companiesLoading) {
      setCompaniesLoading(true);
      (ApiService.get('/companies') as Promise<CompanyOption[]>)
        .then((data) => setCompanies(data))
        .catch(() => setCompanies([]))
        .finally(() => setCompaniesLoading(false));
    }
  }, [step, companies.length, companiesLoading]);

  const updateFormData = (field: string, value: string) => {
    const v = field === 'phone' ? formatPhoneNumber(value) : value;
    setFormData(prev => ({ ...prev, [field]: v }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined as any }));
    }
  };

  // ── Per-step validation ──────────────────────────────────
  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.first_name) errors.first_name = 'First name is required';
      if (!formData.last_name) errors.last_name = 'Last name is required';
      if (!formData.email) errors.email = 'Email is required';
      else if (!formData.email.includes('@')) errors.email = 'Valid email is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      if (!formData.id_number) errors.id_number = 'ID number is required';
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    } else if (step === 2) {
      if (!formData.license_number) errors.license_number = 'License number is required';
      if (formData.license_types.length === 0) errors.license_types = 'Select at least one license type';
      if (!formData.vehicle_registration) errors.vehicle_registration = 'Vehicle registration is required';
      if (!formData.vehicle_make) errors.vehicle_make = 'Vehicle make is required';
      if (!formData.vehicle_model) errors.vehicle_model = 'Vehicle model is required';
      if (!formData.vehicle_year) errors.vehicle_year = 'Vehicle year is required';
      if (!formData.hourly_rate) errors.hourly_rate = 'Hourly rate is required';
    } else if (step === 3) {
      if (companyChoice === 'join' && !selectedCompanyId) {
        errors.company = 'Please select a driving school';
      }
      if (companyChoice === 'create' && !newCompanyName.trim()) {
        errors.company = 'Please enter a name for your driving school';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setMessage(null);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    setMessage(null);
    setFieldErrors({});
    setStep(s => Math.max(s - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setMessage(null);
    try {
      const payload: Record<string, any> = {
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
        hourly_rate: parseFloat(formData.hourly_rate),
        service_radius_km: parseFloat(formData.service_radius_km),
        max_travel_distance_km: parseFloat(formData.max_travel_distance_km),
        rate_per_km_beyond_radius: parseFloat(formData.rate_per_km_beyond_radius),
        bio: formData.bio || null,
        schedule: schedule.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active,
        })),
      };
      if (companyChoice === 'join' && selectedCompanyId) {
        payload.company_id = selectedCompanyId;
      } else if (companyChoice === 'create' && newCompanyName.trim()) {
        payload.company_name = newCompanyName.trim();
      }
      await ApiService.post('/auth/register/instructor', payload);
      setRegistered(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail ?? error.message ?? 'An error occurred during registration';
      setMessage({ type: 'error', text: `Registration Failed: ${detail}` });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ───────────────────────────────────────
  const STEP_LABELS = ['Personal', 'Professional', 'Company', 'Schedule'];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isCurrent = num === step;
        return (
          <React.Fragment key={num}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isDone && { backgroundColor: colors.success, borderColor: colors.success },
                  isCurrent && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !isCurrent && !isDone && { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.stepNum,
                    (isCurrent || isDone) ? { color: colors.textInverse } : { color: colors.textTertiary },
                  ]}
                >
                  {isDone ? '✓' : num}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent
                    ? { color: colors.primary, fontWeight: '700' }
                    : { color: colors.textTertiary },
                ]}
              >
                {label}
              </Text>
            </View>
            {i < TOTAL_STEPS - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: num < step ? colors.success : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── GPS address handler ──────────────────────────────────
  const handleInstructorAddressChange = useCallback((value: string) => {
    console.log('GPS address captured:', value);
  }, []);

  // ── Render steps ─────────────────────────────────────────
  const renderStep1 = () => (
    <Card variant="outlined" padding="md" style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Personal Information</Text>
      <FormFieldWithTip
        label="First Name"
        tooltip="Enter your legal first name as it appears on your ID document."
        required
        placeholder="e.g., John"
        value={formData.first_name}
        onChangeText={t => updateFormData('first_name', t)}
        autoCapitalize="words"
        error={fieldErrors.first_name}
      />
      <FormFieldWithTip
        label="Last Name"
        tooltip="Enter your legal surname as it appears on your ID document."
        required
        placeholder="e.g., Smith"
        value={formData.last_name}
        onChangeText={t => updateFormData('last_name', t)}
        autoCapitalize="words"
        error={fieldErrors.last_name}
      />
      <FormFieldWithTip
        label="Email Address"
        tooltip="You'll receive booking confirmations and payment notifications here."
        required
        placeholder="e.g., john.smith@example.com"
        value={formData.email}
        onChangeText={t => updateFormData('email', t)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
      />
      <FormFieldWithTip
        label="Phone Number"
        tooltip="South African format: +27 followed by 9 digits."
        required
        placeholder="e.g., +27821234567"
        value={formData.phone}
        onChangeText={t => updateFormData('phone', t)}
        keyboardType="phone-pad"
        maxLength={12}
        error={fieldErrors.phone}
      />
      <FormFieldWithTip
        label="ID Number"
        tooltip="Your 13-digit South African ID number for verification."
        required
        placeholder="e.g., 8001015009087"
        value={formData.id_number}
        onChangeText={t => updateFormData('id_number', t)}
        keyboardType="numeric"
        maxLength={13}
        error={fieldErrors.id_number}
      />
      <FormFieldWithTip
        key={`pw-${showPassword}`}
        label="Password"
        tooltip="Minimum 6 characters. Mix letters, numbers, and symbols."
        required
        placeholder="Minimum 6 characters"
        value={formData.password}
        onChangeText={t => updateFormData('password', t)}
        secureTextEntry={!showPassword}
        error={fieldErrors.password}
      />
      <FormFieldWithTip
        key={`cpw-${showPassword}`}
        label="Confirm Password"
        tooltip="Re-enter your password to confirm."
        required
        placeholder="Re-enter your password"
        value={formData.confirmPassword}
        onChangeText={t => updateFormData('confirmPassword', t)}
        secureTextEntry={!showPassword}
        error={fieldErrors.confirmPassword}
      />
      <Pressable style={styles.showPasswordButton} onPress={() => setShowPassword(v => !v)}>
        <Text style={[styles.showPasswordText, { color: colors.primary }]}>
          {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
        </Text>
      </Pressable>
    </Card>
  );

  const renderStep2 = () => (
    <>
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Professional Details</Text>
        <FormFieldWithTip
          label="Driving License Number"
          tooltip="Your valid South African PrDP number."
          required
          placeholder="e.g., A12345678"
          value={formData.license_number}
          onChangeText={t => updateFormData('license_number', t)}
          autoCapitalize="characters"
          error={fieldErrors.license_number}
        />
        <LicenseTypeSelector
          label="License Types You Can Teach"
          tooltip="Select all codes you are qualified to teach."
          required
          selectedTypes={formData.license_types}
          onSelectionChange={types => setFormData(prev => ({ ...prev, license_types: types }))}
        />
        {fieldErrors.license_types ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{fieldErrors.license_types}</Text>
        ) : null}
      </Card>
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Vehicle Information</Text>
        <FormFieldWithTip
          label="Vehicle Registration"
          tooltip="Your license plate number."
          required
          placeholder="e.g., CA 123-456 or ABC 123 GP"
          value={formData.vehicle_registration}
          onChangeText={t => updateFormData('vehicle_registration', t)}
          autoCapitalize="characters"
          error={fieldErrors.vehicle_registration}
        />
        <FormFieldWithTip
          label="Vehicle Make"
          tooltip="The manufacturer of your vehicle."
          placeholder="e.g., Toyota, Volkswagen"
          value={formData.vehicle_make}
          onChangeText={t => updateFormData('vehicle_make', t)}
          autoCapitalize="words"
          error={fieldErrors.vehicle_make}
        />
        <FormFieldWithTip
          label="Vehicle Model"
          tooltip="Your vehicle's model name."
          placeholder="e.g., Corolla, Polo"
          value={formData.vehicle_model}
          onChangeText={t => updateFormData('vehicle_model', t)}
          autoCapitalize="words"
          error={fieldErrors.vehicle_model}
        />
        <FormFieldWithTip
          label="Vehicle Year"
          placeholder="e.g., 2020"
          value={formData.vehicle_year}
          onChangeText={t => updateFormData('vehicle_year', t)}
          keyboardType="numeric"
          error={fieldErrors.vehicle_year}
        />
        <View style={[styles.addressGpsContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.addressGpsLabel, { color: colors.text }]}>Operating Address (GPS)</Text>
          <AddressAutocomplete value="" onChangeText={handleInstructorAddressChange} />
          <Text style={[styles.addressGpsHint, { color: colors.textSecondary }]}>
            📍 Use GPS to capture your operating location address.
          </Text>
        </View>
      </Card>
      <Card variant="outlined" padding="md" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Service Details</Text>
        <FormFieldWithTip
          label="Hourly Rate (ZAR)"
          tooltip="Typical range: R250-R500 per hour."
          required
          placeholder="e.g., 350"
          value={formData.hourly_rate}
          onChangeText={t => updateFormData('hourly_rate', t)}
          keyboardType="decimal-pad"
          error={fieldErrors.hourly_rate}
        />
        <FormFieldWithTip
          label="Service Radius (km)"
          tooltip="Max distance to pick up students (recommended: 10-30km)."
          placeholder="e.g., 20"
          value={formData.service_radius_km}
          onChangeText={t => updateFormData('service_radius_km', t)}
          keyboardType="decimal-pad"
        />
        <FormFieldWithTip
          label="Maximum Travel Distance (km)"
          tooltip="Absolute max distance, even with extra charges."
          placeholder="e.g., 50"
          value={formData.max_travel_distance_km}
          onChangeText={t => updateFormData('max_travel_distance_km', t)}
          keyboardType="decimal-pad"
        />
        <FormFieldWithTip
          label="Rate per Extra Kilometer (ZAR)"
          tooltip="Charge per km beyond your service radius (R3-R10 typical)."
          placeholder="e.g., 5"
          value={formData.rate_per_km_beyond_radius}
          onChangeText={t => updateFormData('rate_per_km_beyond_radius', t)}
          keyboardType="decimal-pad"
        />
        <FormFieldWithTip
          label="Bio (Optional)"
          tooltip="Tell students about your experience, specialties, and teaching style."
          placeholder="e.g., Professional instructor with 10 years experience..."
          value={formData.bio}
          onChangeText={t => updateFormData('bio', t)}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
      </Card>
    </>
  );

  const renderChoiceCard = (
    choice: typeof companyChoice,
    icon: string,
    title: string,
    desc: string,
  ) => (
    <Pressable
      key={choice}
      onPress={() => {
        setCompanyChoice(choice);
        setFieldErrors({});
      }}
      style={[
        styles.choiceCard,
        {
          borderColor: companyChoice === choice ? colors.primary : colors.border,
          backgroundColor: companyChoice === choice ? colors.cardElevated : colors.card,
        },
      ]}
    >
      <Text style={styles.choiceIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.choiceTitle,
            { color: companyChoice === choice ? colors.primary : colors.text },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
      <View
        style={[
          styles.choiceRadio,
          { borderColor: companyChoice === choice ? colors.primary : colors.border },
        ]}
      >
        {companyChoice === choice && (
          <View style={[styles.choiceRadioDot, { backgroundColor: colors.primary }]} />
        )}
      </View>
    </Pressable>
  );

  const renderStep3 = () => (
    <Card variant="outlined" padding="md" style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Driving School / Company</Text>
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        Are you joining an existing school, starting your own, or working independently?
      </Text>
      {renderChoiceCard('independent', '🧑‍💼', 'Independent', 'Work on your own without a company affiliation')}
      {renderChoiceCard('join', '🏫', 'Join a Driving School', 'Join an existing registered driving school')}
      {renderChoiceCard('create', '🏗️', 'Start a New School', 'Register a new driving school under your name')}

      {companyChoice === 'join' && (
        <View style={styles.companyPickerSection}>
          <Text style={[styles.pickerLabel, { color: colors.text }]}>Select Driving School</Text>
          {companiesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : companies.length === 0 ? (
            <Text style={[styles.noCompaniesText, { color: colors.textSecondary }]}>
              No registered schools found. You can create a new one instead.
            </Text>
          ) : (
            <View style={styles.companyList}>
              {companies.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setSelectedCompanyId(c.id);
                    setFieldErrors({});
                  }}
                  style={[
                    styles.companyItem,
                    {
                      borderColor: selectedCompanyId === c.id ? colors.primary : colors.border,
                      backgroundColor: selectedCompanyId === c.id ? colors.cardElevated : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.companyItemText,
                      { color: selectedCompanyId === c.id ? colors.primary : colors.text },
                    ]}
                  >
                    {c.name}
                  </Text>
                  {selectedCompanyId === c.id && (
                    <Text style={{ color: colors.primary }}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
          {fieldErrors.company ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{fieldErrors.company}</Text>
          ) : null}
        </View>
      )}

      {companyChoice === 'create' && (
        <View style={styles.companyPickerSection}>
          <FormFieldWithTip
            label="Driving School Name"
            tooltip="This will be your school's official registered name."
            required
            placeholder="e.g., Cape Town Driving Academy"
            value={newCompanyName}
            onChangeText={v => {
              setNewCompanyName(v);
              setFieldErrors(prev => ({ ...prev, company: undefined as any }));
            }}
            autoCapitalize="words"
            error={fieldErrors.company}
          />
        </View>
      )}
    </Card>
  );

  const renderStep4 = () => (
    <Card variant="outlined" padding="md" style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Weekly Schedule (Optional)</Text>
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        Set your typical working hours. You can update this anytime from your profile.
      </Text>
      <ScheduleEditor value={schedule} onChange={setSchedule} />
    </Card>
  );

  // ── Registered success view ──────────────────────────────
  if (registered) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={[styles.successTitle, { color: colors.text }]}>Application Submitted!</Text>
          <Text style={[styles.successBody, { color: colors.textSecondary }]}>
            Your instructor registration has been submitted for review.{'\n\n'}
            You will be notified by email or WhatsApp once your account has been approved by an
            administrator.
            {companyChoice === 'join'
              ? '\n\nThe driving school owner will also need to approve your membership.'
              : ''}
          </Text>
          <Button
            label="Back to Login"
            onPress={() => navigation.replace('Login')}
            variant="primary"
            size="lg"
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent + '15' }]}>
            <Text style={styles.headerEmoji}>🚗</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Register as Instructor</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join our driving school network
          </Text>
        </View>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Message Display */}
        {message && (
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={6000}
          />
        )}

        {/* Step content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Field error summary */}
        {Object.values(fieldErrors).some(Boolean) && (
          <View
            style={[
              styles.validationSummary,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}
          >
            <Text style={[styles.validationSummaryTitle, { color: colors.danger }]}>
              ⚠️ Please fix the following:
            </Text>
            {Object.entries(fieldErrors).map(([field, msg]) =>
              msg ? (
                <Text key={field} style={[styles.validationSummaryItem, { color: colors.danger }]}>
                  • {msg}
                </Text>
              ) : null,
            )}
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navButtons}>
          {step > 1 && (
            <Button label="← Back" onPress={handleBack} variant="outline" style={{ flex: 1 }} />
          )}
          {step < TOTAL_STEPS ? (
            <Button label="Next →" onPress={handleNext} variant="primary" style={{ flex: 1 }} />
          ) : (
            <Button
              label="Submit Registration"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="lg"
              style={{ flex: 1 }}
            />
          )}
        </View>

        <Pressable onPress={() => navigation.goBack()} style={[styles.linkButton, { padding: 12 }]}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Already have an account? <Text style={{ fontWeight: '600' }}>Login</Text>
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Platform.OS === 'web' ? 40 : 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerEmoji: { fontSize: 36 },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: { fontSize: Platform.OS === 'web' ? 15 : 13, textAlign: 'center' },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepLabel: { fontSize: 10, letterSpacing: 0.2 },
  stepLine: { flex: 1, height: 2, marginBottom: 16, marginHorizontal: 4 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  stepHint: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  addressGpsContainer: {
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginTop: 8,
  },
  addressGpsLabel: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  addressGpsHint: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  textArea: { height: 100, textAlignVertical: 'top' },
  showPasswordButton: { marginTop: 4, padding: 8, alignItems: 'center' },
  showPasswordText: { fontSize: Platform.OS === 'web' ? 14 : 13, fontWeight: '600' },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  choiceIcon: { fontSize: 24 },
  choiceTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  choiceDesc: { fontSize: 12, lineHeight: 16 },
  choiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceRadioDot: { width: 10, height: 10, borderRadius: 5 },
  companyPickerSection: { marginTop: 12 },
  pickerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  noCompaniesText: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  companyList: { gap: 8 },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
  },
  companyItemText: { fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 12, marginTop: 6 },
  navButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  linkButton: { marginTop: 8, alignItems: 'center' },
  linkText: { fontSize: Platform.OS === 'web' ? 15 : 13 },
  validationSummary: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 14 : 10,
    marginBottom: 12,
  },
  validationSummaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  validationSummaryItem: { fontSize: 13, lineHeight: 20 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 60 : 40,
  },
  successEmoji: { fontSize: 72, marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  successBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
});
