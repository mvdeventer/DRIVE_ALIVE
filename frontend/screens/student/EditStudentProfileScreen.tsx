/**
 * Edit Student Profile Screen
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LocationSelector from '../../components/LocationSelector';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import CreditBanner from '../../components/CreditBanner';
import { Button, Card, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';

export default function EditStudentProfileScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navigation = navProp || useNavigation();
  const route = useRoute();
  const params = route.params as { userId?: number } | undefined;
  const isAdminEditing = params?.userId !== undefined;
  const [studentId, setStudentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    id_number: '',
    learners_permit_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address_line1: '',
    address_line2: '',
    province: '',
    city: '',
    suburb: '',
    postal_code: '',
  });
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!hasUnsavedChanges) {
        return;
      }
      e.preventDefault();
      setPendingNavigation(e.data.action);
      setShowDiscardModal(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  const handleDiscardChanges = () => {
    setShowDiscardModal(false);
    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveAndContinue = async () => {
    setShowDiscardModal(false);
    await handleSaveProfile();
    // After save, dispatch pending navigation
    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const loadProfile = async () => {
    try {
      let userRes, studentRes;

      if (isAdminEditing && params?.userId) {
        // Admin is editing another user's profile
        const studentByUserRes = await ApiService.get(`/students/by-user/${params.userId}`);
        const fetchedStudentId = studentByUserRes.data.student_id;
        setStudentId(fetchedStudentId); // Store for later use in save handler

        [userRes, studentRes] = await Promise.all([
          ApiService.get(`/admin/users/${params.userId}`),
          ApiService.get(`/students/${fetchedStudentId}`),
        ]);
      } else {
        // User is editing their own profile
        [userRes, studentRes] = await Promise.all([
          ApiService.get('/auth/me'),
          ApiService.get('/students/me'),
        ]);
      }

      const user = userRes.data;
      const student = studentRes.data;

      setFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: student.id_number || '',
        learners_permit_number: student.learners_permit_number || '',
        emergency_contact_name: student.emergency_contact_name || '',
        emergency_contact_phone: student.emergency_contact_phone || '',
        address_line1: student.address_line1 || '',
        address_line2: student.address_line2 || '',
        province: student.province || '',
        city: student.city || '',
        suburb: student.suburb || '',
        postal_code: student.postal_code || '',
      });
      setOriginalFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: student.id_number || '',
        learners_permit_number: student.learners_permit_number || '',
        emergency_contact_name: student.emergency_contact_name || '',
        emergency_contact_phone: student.emergency_contact_phone || '',
        address_line1: student.address_line1 || '',
        address_line2: student.address_line2 || '',
        province: student.province || '',
        city: student.city || '',
        suburb: student.suburb || '',
        postal_code: student.postal_code || '',
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setErrorMessage(error.response?.data?.detail || 'Failed to load profile data');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      setHasUnsavedChanges(JSON.stringify(updated) !== JSON.stringify(originalFormData));
      return updated;
    });
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined as any }));
    }
  };

  const handleSaveProfile = async () => {
    // Per-field validation
    const errors: Record<string, string> = {};
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.phone) errors.phone = 'Phone number is required';
    if (!formData.id_number) errors.id_number = 'ID number is required';
    if (!formData.emergency_contact_name) errors.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_phone) errors.emergency_contact_phone = 'Emergency contact phone is required';
    if (!formData.address_line1) errors.address_line1 = 'Address is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.postal_code) errors.postal_code = 'Postal code is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fix the highlighted errors');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isAdminEditing && params?.userId && studentId) {
        // Admin editing mode - use admin endpoints
        console.log('💾 Saving student via admin endpoints...');
        console.log('  userId:', params.userId);
        console.log('  studentId:', studentId);

        // Update user basic info via admin endpoint
        const userParams = new URLSearchParams({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          id_number: formData.id_number,
        });
        await ApiService.put(
          `/admin/users/${params.userId}?${userParams.toString()}`
        );

        // Update student profile via admin endpoint
        const studentParams = new URLSearchParams({
          address_line1: formData.address_line1,
          city: formData.city,
          province: formData.province,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
        });
        if (formData.address_line2) studentParams.set('address_line2', formData.address_line2);
        if (formData.suburb) studentParams.set('suburb', formData.suburb);
        if (formData.postal_code) studentParams.set('postal_code', formData.postal_code);
        if (formData.learners_permit_number) studentParams.set('learners_permit_number', formData.learners_permit_number);
        if (formData.id_number) studentParams.set('id_number', formData.id_number);

        await ApiService.put(`/admin/students/${studentId}?${studentParams.toString()}`);
        console.log('✅ Admin save successful');
      } else {
        // Self-editing mode - use regular endpoints
        console.log('💾 Saving student via self-edit endpoints...');

        // Update user info
        await ApiService.put('/auth/me', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          id_number: formData.id_number,
        });

        // Update student profile
        await ApiService.put('/students/me', {
          id_number: formData.id_number,
          learners_permit_number: formData.learners_permit_number,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          province: formData.province,
          city: formData.city,
          suburb: formData.suburb,
          postal_code: formData.postal_code,
        });
        console.log('✅ Self-edit save successful');
      }

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      setHasUnsavedChanges(false);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update profile';
      // Set field-level errors for uniqueness violations
      if (errorMsg.toLowerCase().includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: errorMsg }));
      } else if (errorMsg.toLowerCase().includes('id number')) {
        setFieldErrors(prev => ({ ...prev, id_number: errorMsg }));
      }
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const pwErrors: Record<string, string> = {};

    if (isAdminEditing) {
      // Admin resetting another user's password — no current password needed
      if (!passwordData.newPassword) {
        pwErrors.newPassword = 'New password is required';
      } else if (passwordData.newPassword.length < 6) {
        pwErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (!passwordData.confirmPassword) {
        pwErrors.confirmPassword = 'Please confirm the password';
      } else if (passwordData.newPassword !== passwordData.confirmPassword) {
        pwErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      // User changing their own password
      if (!passwordData.currentPassword) pwErrors.currentPassword = 'Current password is required';
      if (!passwordData.newPassword) {
        pwErrors.newPassword = 'New password is required';
      } else if (passwordData.newPassword.length < 6) {
        pwErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (!passwordData.confirmPassword) {
        pwErrors.confirmPassword = 'Please confirm your password';
      } else if (passwordData.newPassword !== passwordData.confirmPassword) {
        pwErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(pwErrors).length > 0) {
      setPasswordFieldErrors(pwErrors);
      setErrorMessage(Object.values(pwErrors)[0]);
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    setPasswordFieldErrors({});

    try {
      if (isAdminEditing && params?.userId) {
        await ApiService.resetUserPassword(params.userId, passwordData.newPassword);
        setSuccessMessage('Password reset successfully!');
      } else {
        await ApiService.post('/auth/change-password', {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        });
        setSuccessMessage('Password changed successfully!');
      }

      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to change password';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Edit Student Profile"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Inline Messages */}
      {successMessage && (
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <InlineMessage
            type="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage('')}
            autoDismissMs={0}
          />
        </View>
      )}
      {errorMessage && (
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <InlineMessage
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage('')}
            autoDismissMs={0}
          />
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <CreditBanner compact />

        {/* Personal Information */}
        <Card variant="default" style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>

          <FormFieldWithTip
            label="First Name"
            required
            placeholder="Your first name"
            value={formData.first_name}
            onChangeText={value => updateField('first_name', value)}
            tooltip="Your legal first name as it appears on your ID"
            error={fieldErrors.first_name}
          />

          <FormFieldWithTip
            label="Last Name"
            required
            placeholder="Your last name"
            value={formData.last_name}
            onChangeText={value => updateField('last_name', value)}
            tooltip="Your legal last name as it appears on your ID"
            error={fieldErrors.last_name}
          />

          <FormFieldWithTip
            label="Email Address"
            required
            placeholder="email@example.com"
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            tooltip="Your account email address"
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
          />

          <FormFieldWithTip
            label="Phone Number"
            required
            placeholder="+27821234567"
            value={formData.phone}
            onChangeText={value => updateField('phone', value)}
            tooltip="Your contact number for instructors to reach you"
            keyboardType="phone-pad"
            error={fieldErrors.phone}
          />

          <FormFieldWithTip
            label="ID Number"
            required
            placeholder="e.g., 7901175104084"
            value={formData.id_number}
            onChangeText={value => updateField('id_number', value)}
            tooltip="Your South African ID number (13 digits)"
            keyboardType="numeric"
            error={fieldErrors.id_number}
          />

          <FormFieldWithTip
            label="Learner's Permit Number (Optional)"
            placeholder="e.g., LP123456789"
            value={formData.learners_permit_number}
            onChangeText={value => updateField('learners_permit_number', value)}
            tooltip="Your learner's permit number if you have one"
          />
        </Card>

        {/* Emergency Contact */}
        <Card variant="default" style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Contact</Text>

          <FormFieldWithTip
            label="Emergency Contact Name"
            required
            placeholder="e.g., Jane Doe"
            value={formData.emergency_contact_name}
            onChangeText={value => updateField('emergency_contact_name', value)}
            tooltip="Full name of your emergency contact person"
            error={fieldErrors.emergency_contact_name}
          />

          <FormFieldWithTip
            label="Emergency Contact Phone"
            required
            placeholder="+27821234567"
            value={formData.emergency_contact_phone}
            onChangeText={value => updateField('emergency_contact_phone', value)}
            tooltip="Phone number of your emergency contact"
            keyboardType="phone-pad"
            error={fieldErrors.emergency_contact_phone}
          />
        </Card>

        {/* Residential Address */}
        <Card variant="default" style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Residential Address</Text>

          <FormFieldWithTip
            label="Address Line 1"
            required
            placeholder="e.g., 123 Main Street"
            value={formData.address_line1}
            onChangeText={value => updateField('address_line1', value)}
            tooltip="Your street address"
            error={fieldErrors.address_line1}
          />

          <FormFieldWithTip
            label="Address Line 2 (Optional)"
            placeholder="e.g., Apartment 4B"
            value={formData.address_line2}
            onChangeText={value => updateField('address_line2', value)}
            tooltip="Additional address information (optional)"
          />

          <LocationSelector
            label="Residential Location"
            tooltip="Select your province, city, and suburb where you live"
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
            label="Postal Code"
            required
            placeholder="4-digit postal code"
            value={formData.postal_code}
            onChangeText={value => updateField('postal_code', value)}
            keyboardType="numeric"
            tooltip="4-digit postal code"
            error={fieldErrors.postal_code}
          />
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => setShowPasswordModal(true)}
            icon="🔒"
          >
            {isAdminEditing ? 'Reset Password' : 'Change Password'}
          </Button>

          <Button
            variant="primary"
            fullWidth
            onPress={handleSaveProfile}
            disabled={saving}
            loading={saving}
            style={{ marginTop: 12, marginBottom: 40 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </View>
      </ScrollView>

      {/* Password Change/Reset Modal */}
      <ThemedModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={isAdminEditing ? 'Reset Password' : 'Change Password'}
        size="md"
        footer={
          <View style={styles.modalButtons}>
            <Button
              variant="outline"
              onPress={() => {
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleChangePassword}
              style={{ flex: 1 }}
            >
              {isAdminEditing ? 'Reset Password' : 'Change Password'}
            </Button>
          </View>
        }
      >
        {!isAdminEditing && (
          <FormFieldWithTip
            label="Current Password"
            required
            placeholder="Enter current password"
            value={passwordData.currentPassword}
            onChangeText={value => { setPasswordData(prev => ({ ...prev, currentPassword: value })); setPasswordFieldErrors(prev => ({ ...prev, currentPassword: undefined as any })); }}
            secureTextEntry={!showPassword}
            tooltip="Your current password for verification"
            error={passwordFieldErrors.currentPassword}
          />
        )}

        <FormFieldWithTip
          label="New Password"
          required
          placeholder="Enter new password"
          value={passwordData.newPassword}
          onChangeText={value => { setPasswordData(prev => ({ ...prev, newPassword: value })); setPasswordFieldErrors(prev => ({ ...prev, newPassword: undefined as any })); }}
          secureTextEntry={!showPassword}
          tooltip="New password (minimum 6 characters)"
          error={passwordFieldErrors.newPassword}
        />

        <FormFieldWithTip
          label="Confirm New Password"
          required
          placeholder="Confirm new password"
          value={passwordData.confirmPassword}
          onChangeText={value => { setPasswordData(prev => ({ ...prev, confirmPassword: value })); setPasswordFieldErrors(prev => ({ ...prev, confirmPassword: undefined as any })); }}
          secureTextEntry={!showPassword}
          tooltip="Re-enter your new password"
          error={passwordFieldErrors.confirmPassword}
        />

        <Pressable
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
          </Text>
        </Pressable>
      </ThemedModal>

      {/* Discard Changes Confirmation Modal */}
      <ThemedModal
        visible={showDiscardModal}
        onClose={() => {
          setShowDiscardModal(false);
          setPendingNavigation(null);
        }}
        title="⚠️ Unsaved Changes"
        size="sm"
        footer={
          <View style={styles.modalButtons}>
            <Button
              variant="ghost"
              onPress={() => {
                setShowDiscardModal(false);
                setPendingNavigation(null);
              }}
              style={{ flex: 1 }}
            >
              Stay
            </Button>
            <Button
              variant="primary"
              onPress={handleSaveAndContinue}
              disabled={saving}
              loading={saving}
              style={{ flex: 1 }}
            >
              Save & Continue
            </Button>
            <Button
              variant="danger"
              onPress={handleDiscardChanges}
              style={{ flex: 1 }}
            >
              Discard
            </Button>
          </View>
        }
      >
        <Text style={[styles.discardText, { color: colors.textSecondary }]}>
          You have unsaved changes! Choose an option below:
        </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  actionsContainer: {
    marginTop: 8,
  },
  showPasswordButton: {
    marginBottom: 8,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  discardText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
});
