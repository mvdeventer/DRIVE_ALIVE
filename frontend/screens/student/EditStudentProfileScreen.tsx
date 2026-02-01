/**
 * Edit Student Profile Screen
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

export default function EditStudentProfileScreen({ navigation: navProp }: any) {
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
    // After save completes, navigation will happen automatically via the save handler
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
    } catch (error) {
      console.error('Error loading profile:', error);
      showAlert('Error', 'Failed to load profile data');
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
  };

  const handleSaveProfile = async () => {
    // Validation
    const missingFields = [];
    if (!formData.first_name) missingFields.push('First Name');
    if (!formData.last_name) missingFields.push('Last Name');
    if (!formData.phone) missingFields.push('Phone Number');
    if (!formData.id_number) missingFields.push('ID Number');
    if (!formData.emergency_contact_name) missingFields.push('Emergency Contact Name');
    if (!formData.emergency_contact_phone) missingFields.push('Emergency Contact Phone');
    if (!formData.address_line1) missingFields.push('Address Line 1');
    if (!formData.city) missingFields.push('City');
    if (!formData.postal_code) missingFields.push('Postal Code');

    if (missingFields.length > 0) {
      setErrorMessage(
        `Missing Required Fields:\n\n${missingFields.map(field => `• ${field}`).join('\n')}`
      );
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setSaving(true);
    try {
      if (isAdminEditing && params?.userId && studentId) {
        // Admin editing mode - use admin endpoints
        console.log('💾 Saving student via admin endpoints...');
        console.log('  userId:', params.userId);
        console.log('  studentId:', studentId);

        // Update user basic info via admin endpoint
        await ApiService.put(
          `/admin/users/${params.userId}?first_name=${encodeURIComponent(
            formData.first_name
          )}&last_name=${encodeURIComponent(formData.last_name)}&phone=${encodeURIComponent(
            formData.phone
          )}`
        );

        // Update student profile via admin endpoint
        const studentParams = new URLSearchParams({
          address: `${formData.address_line1}${
            formData.address_line2 ? ', ' + formData.address_line2 : ''
          }`,
          city: formData.city,
          province: formData.province,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
        });

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
          tooltip="Your contact number for instructors to reach you"
          keyboardType="phone-pad"
        />

        <FormFieldWithTip
          label="ID Number"
          required
          placeholder="e.g., 7901175104084"
          value={formData.id_number}
          onChangeText={value => updateField('id_number', value)}
          tooltip="Your South African ID number (13 digits)"
          keyboardType="numeric"
        />

        <FormFieldWithTip
          label="Learner's Permit Number (Optional)"
          placeholder="e.g., LP123456789"
          value={formData.learners_permit_number}
          onChangeText={value => updateField('learners_permit_number', value)}
          tooltip="Your learner's permit number if you have one"
        />

        {/* Emergency Contact */}
        <Text style={styles.sectionTitle}>Emergency Contact</Text>

        <FormFieldWithTip
          label="Emergency Contact Name"
          required
          placeholder="e.g., Jane Doe"
          value={formData.emergency_contact_name}
          onChangeText={value => updateField('emergency_contact_name', value)}
          tooltip="Full name of your emergency contact person"
        />

        <FormFieldWithTip
          label="Emergency Contact Phone"
          required
          placeholder="+27821234567"
          value={formData.emergency_contact_phone}
          onChangeText={value => updateField('emergency_contact_phone', value)}
          tooltip="Phone number of your emergency contact"
          keyboardType="phone-pad"
        />

        {/* Residential Address */}
        <Text style={styles.sectionTitle}>Residential Address</Text>

        <FormFieldWithTip
          label="Address Line 1"
          required
          placeholder="e.g., 123 Main Street"
          value={formData.address_line1}
          onChangeText={value => updateField('address_line1', value)}
          tooltip="Your street address"
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
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
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
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
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
    marginTop: 24,
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  modalCancelButtonText: {
    color: '#dc3545',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#28a745',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 15,
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
