/**
 * Edit Student Profile Screen
 */
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import LocationSelector from '../../components/LocationSelector';
import ApiService from '../../services/api';

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    const fullMessage = `${title}\n\n${message}`;
    alert(fullMessage);
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function EditStudentProfileScreen() {
  const navigation = useNavigation();
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [userRes, studentRes] = await Promise.all([
        ApiService.get('/auth/me'),
        ApiService.get('/students/me'),
      ]);

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
    } catch (error) {
      console.error('Error loading profile:', error);
      showAlert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.reload();
      } else {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user_role');
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
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
      showAlert(
        'Missing Required Fields',
        `Please fill in:\n\n${missingFields.map(field => `• ${field}`).join('\n')}`
      );
      return;
    }

    setSaving(true);
    try {
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

      showAlert('✅ Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update profile';
      showAlert('Error', errorMsg);
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
      showAlert('Missing Fields', 'Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showAlert('Password Too Short', 'Password must be at least 6 characters long');
      return;
    }

    try {
      await ApiService.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showAlert('✅ Success', 'Password changed successfully!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to change password';
      showAlert('Error', errorMsg);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

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
              secureTextEntry
              tooltip="Your current password for verification"
            />

            <FormFieldWithTip
              label="New Password"
              required
              placeholder="Enter new password"
              value={passwordData.newPassword}
              onChangeText={value => setPasswordData(prev => ({ ...prev, newPassword: value }))}
              secureTextEntry
              tooltip="New password (minimum 6 characters)"
            />

            <FormFieldWithTip
              label="Confirm New Password"
              required
              placeholder="Confirm new password"
              value={passwordData.confirmPassword}
              onChangeText={value => setPasswordData(prev => ({ ...prev, confirmPassword: value }))}
              secureTextEntry
              tooltip="Re-enter your new password"
            />

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
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
});
