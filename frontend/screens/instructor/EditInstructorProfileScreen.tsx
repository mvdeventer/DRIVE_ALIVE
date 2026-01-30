/**
 * Edit Instructor Profile Screen
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import LicenseTypeSelector from '../../components/LicenseTypeSelector';
import LocationSelector from '../../components/LocationSelector';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function EditInstructorProfileScreen({ navigation: navProp }: any) {
  const navigation = navProp || useNavigation();
  const route = useRoute();
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
      showAlert(
        'Error',
        `Failed to load profile data: ${error.response?.data?.detail || error.message}`
      );
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
      showAlert(
        'Missing Required Fields',
        `Please fill in:\n\n${missingFields.map(field => `• ${field}`).join('\n')}`
      );
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Edit Instructor Profile"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
        <Text style={styles.sectionTitle}>Personal Information</Text>

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
        <Text style={styles.sectionTitle}>License Information</Text>

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
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

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
        <Text style={styles.sectionTitle}>Operating Location</Text>

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
        <Text style={styles.sectionTitle}>Service Details</Text>

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
        <TouchableOpacity style={styles.passwordButton} onPress={() => setShowPasswordModal(true)}>
          <Text style={styles.passwordButtonText}>🔒 Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : '✅ Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

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

            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalSaveButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Discard Changes Confirmation Modal */}
      <Modal
        visible={showDiscardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>⚠️ Unsaved Changes</Text>
            <Text style={styles.confirmModalText}>
              You have unsaved changes! Choose an option below:
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDiscardModal(false);
                  setPendingNavigation(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.saveAndContinueButton]}
                onPress={handleSaveAndContinue}
                disabled={saving}
              >
                <Text style={styles.saveAndContinueButtonText}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.deleteConfirmButton]}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.deleteConfirmButtonText}>Discard</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  passwordButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  passwordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
    fontWeight: 'bold',
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  modalCancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#007bff',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveAndContinueButton: {
    backgroundColor: '#28a745',
  },
  saveAndContinueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
