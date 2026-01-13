/**
 * Edit Admin Profile Screen
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
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function EditAdminProfileScreen({ navigation: navProp }: any) {
  const navigation = navProp || useNavigation();
  const route = useRoute();
  const params = route.params as { userId?: number } | undefined;
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isEditingOtherAdmin, setIsEditingOtherAdmin] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
  });
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    setHasUnsavedChanges(changed);
  }, [formData, originalFormData]);

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
      // First, get current user to determine if editing self or another admin
      const meRes = await ApiService.get('/auth/me');
      const currentUser = meRes.data;
      setCurrentUserId(currentUser.id);

      let userRes;

      if (params?.userId && params.userId !== currentUser.id) {
        // Editing another admin's profile
        setIsEditingOtherAdmin(true);
        userRes = await ApiService.get(`/admin/users/${params.userId}`);
      } else {
        // Editing own profile
        setIsEditingOtherAdmin(false);
        userRes = meRes; // Use already fetched current user data
      }

      const user = userRes.data;

      setFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      });
      setOriginalFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      showAlert(
        'Error',
        error.response?.data?.detail || 'Failed to load admin profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setErrorMessage('');

      if (isEditingOtherAdmin && params?.userId) {
        // Admin editing another admin
        await ApiService.put(`/admin/users/${params.userId}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        });
      } else {
        // Admin editing own profile
        await ApiService.put('/auth/me', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        });
      }

      setSuccessMessage('Profile updated successfully!');
      setOriginalFormData({ ...formData });
      setTimeout(() => {
        setSuccessMessage('');
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Save error:', error);
      setErrorMessage(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setErrorMessage('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      await ApiService.put('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setSuccessMessage('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Edit Admin Profile"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {successMessage && <InlineMessage message={successMessage} type="success" />}
        {errorMessage && <InlineMessage message={errorMessage} type="error" />}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <FormFieldWithTip
            label="First Name"
            value={formData.first_name}
            onChangeText={text => setFormData({ ...formData, first_name: text })}
            placeholder="Enter first name"
            required
          />

          <FormFieldWithTip
            label="Last Name"
            value={formData.last_name}
            onChangeText={text => setFormData({ ...formData, last_name: text })}
            placeholder="Enter last name"
            required
          />

          <FormFieldWithTip
            label="Email Address"
            value={formData.email}
            onChangeText={text => setFormData({ ...formData, email: text })}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={false}
            tooltip="Email cannot be changed"
          />

          <FormFieldWithTip
            label="Phone Number"
            value={formData.phone}
            onChangeText={text => setFormData({ ...formData, phone: text })}
            placeholder="+27 XX XXX XXXX"
            keyboardType="phone-pad"
            tooltip="Format: +27XXXXXXXXX or 0XXXXXXXXX"
            required
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving || !hasUnsavedChanges}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          {!isEditingOtherAdmin && (
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={styles.passwordButtonText}>Change Password</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <FormFieldWithTip
              label="Current Password"
              value={passwordData.currentPassword}
              onChangeText={text => setPasswordData({ ...passwordData, currentPassword: text })}
              placeholder="Enter current password"
              secureTextEntry
              required
            />

            <FormFieldWithTip
              label="New Password"
              value={passwordData.newPassword}
              onChangeText={text => setPasswordData({ ...passwordData, newPassword: text })}
              placeholder="Enter new password"
              secureTextEntry
              tooltip="Minimum 8 characters"
              required
            />

            <FormFieldWithTip
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={text => setPasswordData({ ...passwordData, confirmPassword: text })}
              placeholder="Re-enter new password"
              secureTextEntry
              required
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handlePasswordChange}
                disabled={saving}
              >
                <Text style={styles.modalSaveButtonText}>
                  {saving ? 'Saving...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discard Changes Modal */}
      <Modal
        visible={showDiscardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unsaved Changes</Text>
            <Text style={styles.modalMessage}>
              You have unsaved changes. Are you sure you want to discard them?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDiscardModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDiscardButton} onPress={handleDiscardChanges}>
                <Text style={styles.modalDiscardButtonText}>Discard Changes</Text>
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
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  buttonContainer: {
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordButton: {
    backgroundColor: '#FFC107',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDiscardButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDiscardButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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
  confirmModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
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
