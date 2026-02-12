/**
 * Edit Instructor Profile Screen
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
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
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import LocationSelector from '../../components/LocationSelector';
import { Button, ThemedModal } from '../../components/ui';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

export default function EditInstructorProfileScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navigation = navProp || useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef<ScrollView>(null);
  const params = route.params as { userId?: number } | undefined;
  const isAdminEditing = params?.userId !== undefined;
  const [instructorId, setInstructorId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    id_number: '',
    license_number: '',
    license_types: [] as string[],
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    province: '',
    city: '',
    suburb: '',
    hourly_rate: '',
    service_radius_km: '',
    max_travel_distance_km: '',
    rate_per_km_beyond_radius: '',
    bio: '',
    is_available: true,
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

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      console.log('🚪 beforeRemove triggered');
      console.log('  hasUnsavedChanges:', hasUnsavedChanges);
      if (!hasUnsavedChanges) {
        console.log('  ✅ No unsaved changes, allowing navigation');
        return;
      }
      console.log('  ⚠️ Unsaved changes detected, preventing navigation');
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
    // After save completes, navigation will happen automatically via the save handler
  };

  const loadProfile = async () => {
    try {
      console.log('🔍 Loading profile...');
      console.log('  isAdminEditing:', isAdminEditing);
      console.log('  params?.userId:', params?.userId);

      let userRes, instructorRes;

      if (isAdminEditing && params?.userId) {
        // Admin is editing another user's profile
        console.log('📝 Admin editing mode - loading user', params.userId);
        const instructorByUserRes = await ApiService.get(`/instructors/by-user/${params.userId}`);
        console.log('  instructorByUserRes:', instructorByUserRes.data);
        const fetchedInstructorId = instructorByUserRes.data.instructor_id;
        console.log('  instructorId:', fetchedInstructorId);
        setInstructorId(fetchedInstructorId); // Store for later use in save handler

        [userRes, instructorRes] = await Promise.all([
          ApiService.get(`/admin/users/${params.userId}`),
          ApiService.get(`/instructors/${fetchedInstructorId}`),
        ]);
        console.log('  userRes.data:', userRes.data);
        console.log('  instructorRes.data:', instructorRes.data);
      } else {
        // User is editing their own profile
        console.log('👤 Self-editing mode');
        [userRes, instructorRes] = await Promise.all([
          ApiService.get('/auth/me'),
          ApiService.get('/instructors/me'),
        ]);
      }

      const user = userRes.data;
      const instructor = instructorRes.data;

      console.log('📊 Setting form data:');
      console.log('  first_name:', user.first_name);
      console.log('  last_name:', user.last_name);
      console.log('  email:', user.email);
      console.log('  phone:', user.phone);

      setFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: instructor.id_number || '',
        license_number: instructor.license_number || '',
        license_types: instructor.license_types ? instructor.license_types.split(',') : [],
        vehicle_registration: instructor.vehicle_registration || '',
        vehicle_make: instructor.vehicle_make || '',
        vehicle_model: instructor.vehicle_model || '',
        vehicle_year: instructor.vehicle_year?.toString() || '',
        province: instructor.province || '',
        city: instructor.city || '',
        suburb: instructor.suburb || '',
        hourly_rate: instructor.hourly_rate?.toString() || '',
        service_radius_km: instructor.service_radius_km?.toString() || '20',
        max_travel_distance_km: instructor.max_travel_distance_km?.toString() || '50',
        rate_per_km_beyond_radius: instructor.rate_per_km_beyond_radius?.toString() || '5',
        bio: instructor.bio || '',
        is_available: instructor.is_available || false,
      });
      setOriginalFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: instructor.id_number || '',
        license_number: instructor.license_number || '',
        license_types: instructor.license_types ? instructor.license_types.split(',') : [],
        vehicle_registration: instructor.vehicle_registration || '',
        vehicle_make: instructor.vehicle_make || '',
        vehicle_model: instructor.vehicle_model || '',
        vehicle_year: instructor.vehicle_year?.toString() || '',
        province: instructor.province || '',
        city: instructor.city || '',
        suburb: instructor.suburb || '',
        hourly_rate: instructor.hourly_rate?.toString() || '',
        service_radius_km: instructor.service_radius_km?.toString() || '20',
        max_travel_distance_km: instructor.max_travel_distance_km?.toString() || '50',
        rate_per_km_beyond_radius: instructor.rate_per_km_beyond_radius?.toString() || '5',
        bio: instructor.bio || '',
        is_available: instructor.is_available || false,
      });
      console.log('✅ Form data set successfully');
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(`Failed to load profile data: ${error.response?.data?.detail || error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalFormData);
      console.log('📝 Field updated:', field);
      console.log('  Has changes:', hasChanges);
      setHasUnsavedChanges(hasChanges);
      return updated;
    });
  };

  const handleSaveProfile = async () => {
    // Validation
    const missingFields = [];
    if (!formData.first_name) missingFields.push('First Name');
    if (!formData.last_name) missingFields.push('Last Name');
    if (!formData.phone) missingFields.push('Phone Number');
    if (!formData.license_number) missingFields.push('License Number');
    if (formData.license_types.length === 0) missingFields.push('License Types');
    if (!formData.vehicle_registration) missingFields.push('Vehicle Registration');
    if (!formData.vehicle_make) missingFields.push('Vehicle Make');
    if (!formData.vehicle_model) missingFields.push('Vehicle Model');
    if (!formData.vehicle_year) missingFields.push('Vehicle Year');
    if (!formData.city) missingFields.push('City');
    if (!formData.hourly_rate) missingFields.push('Hourly Rate');

    if (missingFields.length > 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(`Missing required fields: ${missingFields.join(', ')}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setSaving(true);
    try {
      if (isAdminEditing && params?.userId && instructorId) {
        // Admin editing mode - use admin endpoints
        console.log('💾 Saving via admin endpoints...');
        console.log('  userId:', params.userId);
        console.log('  instructorId:', instructorId);

        // Update user basic info via admin endpoint
        await ApiService.put(
          `/admin/users/${params.userId}?first_name=${encodeURIComponent(
            formData.first_name
          )}&last_name=${encodeURIComponent(formData.last_name)}&phone=${encodeURIComponent(
            formData.phone
          )}`
        );

        // Update instructor profile via admin endpoint
        const instructorParams = new URLSearchParams({
          license_number: formData.license_number,
          license_types: formData.license_types.join(','),
          vehicle_registration: formData.vehicle_registration,
          vehicle_make: formData.vehicle_make,
          vehicle_model: formData.vehicle_model,
          vehicle_year: formData.vehicle_year,
          province: formData.province,
          city: formData.city,
          suburb: formData.suburb,
          hourly_rate: formData.hourly_rate,
          service_radius_km: formData.service_radius_km || '20',
          max_travel_distance_km: formData.max_travel_distance_km || '50',
          rate_per_km_beyond_radius: formData.rate_per_km_beyond_radius || '5',
          bio: formData.bio,
          is_available: formData.is_available.toString(),
        });

        await ApiService.put(`/admin/instructors/${instructorId}?${instructorParams.toString()}`);
        console.log('✅ Admin save successful');
      } else {
        // Self-editing mode - use regular endpoints
        console.log('💾 Saving via self-edit endpoints...');

        // Update user info
        await ApiService.put('/auth/me', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        });

        // Update instructor profile
        await ApiService.put('/instructors/me', {
          license_number: formData.license_number,
          license_types: formData.license_types.join(','),
          vehicle_registration: formData.vehicle_registration,
          vehicle_make: formData.vehicle_make,
          vehicle_model: formData.vehicle_model,
          vehicle_year: parseInt(formData.vehicle_year),
          province: formData.province,
          city: formData.city,
          suburb: formData.suburb,
          hourly_rate: parseFloat(formData.hourly_rate),
          service_radius_km: parseFloat(formData.service_radius_km),
          max_travel_distance_km: parseFloat(formData.max_travel_distance_km),
          rate_per_km_beyond_radius: parseFloat(formData.rate_per_km_beyond_radius),
          bio: formData.bio,
          is_available: formData.is_available,
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
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setErrorMessage('Please fill in all password fields');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    try {
      await ApiService.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('Password changed successfully!');
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
        title="Edit Instructor Profile"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
        {/* Personal Information */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>

        <FormFieldWithTip
          label="First Name"
          required
          placeholder="Your first name"
          value={formData.first_name}
          onChangeText={value => updateField('first_name', value)}
          tooltip="Your legal first name as it appears on your ID"
        />

        <FormFieldWithTip
          label="Last Name"
          required
          placeholder="Your last name"
          value={formData.last_name}
          onChangeText={value => updateField('last_name', value)}
          tooltip="Your legal last name as it appears on your ID"
        />

        <FormFieldWithTip
          label="Email Address"
          placeholder="email@example.com"
          value={formData.email}
          editable={false}
          tooltip="Email cannot be changed. Contact support if you need to update it."
          keyboardType="email-address"
        />

        <FormFieldWithTip
          label="Phone Number"
          required
          placeholder="+27821234567"
          value={formData.phone}
          onChangeText={value => updateField('phone', value)}
          tooltip="Contact number for students to reach you"
          keyboardType="phone-pad"
        />

        {/* License Information */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>License Information</Text>

        <FormFieldWithTip
          label="Professional Driving License Number"
          required
          placeholder="e.g., ML123456789"
          value={formData.license_number}
          onChangeText={value => updateField('license_number', value)}
          tooltip="Your professional driving instructor license number"
        />

        <LicenseTypeSelector
          selectedTypes={formData.license_types}
          onSelectionChange={types => updateField('license_types', types)}
          tooltip="Select the license types you are certified to teach"
        />

        {/* Vehicle Information */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle Information</Text>

        <FormFieldWithTip
          label="Vehicle Registration Number"
          required
          placeholder="e.g., ABC123GP"
          value={formData.vehicle_registration}
          onChangeText={value => updateField('vehicle_registration', value.toUpperCase())}
          tooltip="License plate number of your training vehicle"
        />

        <FormFieldWithTip
          label="Vehicle Make"
          required
          placeholder="e.g., Toyota"
          value={formData.vehicle_make}
          onChangeText={value => updateField('vehicle_make', value)}
          tooltip="Manufacturer of the vehicle"
        />

        <FormFieldWithTip
          label="Vehicle Model"
          required
          placeholder="e.g., Corolla"
          value={formData.vehicle_model}
          onChangeText={value => updateField('vehicle_model', value)}
          tooltip="Model name of the vehicle"
        />

        <FormFieldWithTip
          label="Vehicle Year"
          required
          placeholder="e.g., 2020"
          value={formData.vehicle_year}
          onChangeText={value => updateField('vehicle_year', value)}
          keyboardType="numeric"
          tooltip="Year the vehicle was manufactured"
        />

        {/* Location */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Operating Location</Text>

        <LocationSelector
          label="Operating Location"
          tooltip="Select your province, city, and suburb where you primarily operate"
          required
          selectedProvince={formData.province}
          selectedCity={formData.city}
          selectedSuburb={formData.suburb}
          onProvinceChange={province =>
            setFormData(prev => ({ ...prev, province, city: '', suburb: '' }))
          }
          onCityChange={city => setFormData(prev => ({ ...prev, city, suburb: '' }))}
          onSuburbChange={suburb => setFormData(prev => ({ ...prev, suburb }))}
          showSuburbs={true}
        />

        {/* Service Details */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Details</Text>

        <FormFieldWithTip
          label="Hourly Rate (ZAR)"
          required
          placeholder="e.g., 350"
          value={formData.hourly_rate}
          onChangeText={value => updateField('hourly_rate', value)}
          keyboardType="decimal-pad"
          tooltip="Your hourly rate in South African Rands"
        />

        <FormFieldWithTip
          label="Service Radius (km)"
          placeholder="e.g., 20"
          value={formData.service_radius_km}
          onChangeText={value => updateField('service_radius_km', value)}
          keyboardType="decimal-pad"
          tooltip="Maximum distance you'll travel to pick up students"
        />

        <FormFieldWithTip
          label="Maximum Travel Distance (km)"
          placeholder="e.g., 50"
          value={formData.max_travel_distance_km}
          onChangeText={value => updateField('max_travel_distance_km', value)}
          keyboardType="decimal-pad"
          tooltip="Maximum distance you're willing to travel for lessons"
        />

        <FormFieldWithTip
          label="Rate per Extra Kilometer (ZAR)"
          placeholder="e.g., 5"
          value={formData.rate_per_km_beyond_radius}
          onChangeText={value => updateField('rate_per_km_beyond_radius', value)}
          keyboardType="decimal-pad"
          tooltip="Additional charge per kilometer beyond your service radius"
        />

        <FormFieldWithTip
          label="Bio (Optional)"
          placeholder="Tell students about your experience..."
          value={formData.bio}
          onChangeText={value => updateField('bio', value)}
          multiline
          numberOfLines={4}
          tooltip="Brief description of your experience and teaching style"
        />

        {/* Action Buttons */}
        <Button
          variant="secondary"
          onPress={() => setShowPasswordModal(true)}
          style={{ marginTop: 24 }}
        >
          🔒 Change Password
        </Button>

        <Button
          variant="primary"
          onPress={handleSaveProfile}
          disabled={saving}
          loading={saving}
          style={{ backgroundColor: colors.success, marginTop: 16, marginBottom: 40 }}
        >
          {saving ? 'Saving...' : '✅ Save Changes'}
        </Button>
      </ScrollView>

      {/* Password Change Modal */}
      <ThemedModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="md"
        footer={
          <View style={styles.modalFooter}>
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
              Change Password
            </Button>
          </View>
        }
      >
        <FormFieldWithTip
          label="Current Password"
          required
          placeholder="Enter current password"
          value={passwordData.currentPassword}
          onChangeText={value => setPasswordData(prev => ({ ...prev, currentPassword: value }))}
          secureTextEntry={!showPassword}
          tooltip="Your current password for verification"
        />

        <FormFieldWithTip
          label="New Password"
          required
          placeholder="Enter new password"
          value={passwordData.newPassword}
          onChangeText={value => setPasswordData(prev => ({ ...prev, newPassword: value }))}
          secureTextEntry={!showPassword}
          tooltip="New password (minimum 6 characters)"
        />

        <FormFieldWithTip
          label="Confirm New Password"
          required
          placeholder="Confirm new password"
          value={passwordData.confirmPassword}
          onChangeText={value => setPasswordData(prev => ({ ...prev, confirmPassword: value }))}
          secureTextEntry={!showPassword}
          tooltip="Re-enter your new password"
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
          <View style={styles.confirmModalButtons}>
            <Button
              variant="outline"
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
              style={{ flex: 1, backgroundColor: colors.success }}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
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
        <Text style={[styles.confirmModalText, { color: colors.text }]}>
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
    fontFamily: 'Inter_400Regular',
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
    marginTop: 24,
    marginBottom: 16,
  },
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
