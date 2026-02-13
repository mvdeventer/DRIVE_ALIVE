/**
 * Edit Admin Profile Screen
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
import { Button, Card, ThemedModal } from '../../components';
import { useTheme } from '../../theme/ThemeContext';
import FormFieldWithTip from '../../components/FormFieldWithTip';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';

export default function EditAdminProfileScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
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
    id_number: '',
    address: '',
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
  const [userId, setUserId] = useState<number | null>(null);
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
    // After save, dispatch pending navigation
    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const loadProfile = async () => {
    try {
      // First, get current user to determine if editing self or another admin
      const meRes = await ApiService.get('/auth/me');
      const currentUser = meRes.data;
      setCurrentUserId(currentUser.id);

      let user;

      if (params?.userId && params.userId !== currentUser.id) {
        // Editing another admin's profile
        setIsEditingOtherAdmin(true);
        const userRes = await ApiService.get(`/admin/users/${params.userId}`);
        user = userRes.data;
      } else {
        // Editing own profile
        setIsEditingOtherAdmin(false);
        user = currentUser; // Use already fetched current user data
      }

      console.log('User data loaded:', user);
      console.log('User ID:', user.id);
      
      setUserId(user.id);
      setFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: user.id_number || '',
        address: user.address || '',
      });
      setOriginalFormData({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        id_number: user.id_number || '',
        address: user.address || '',
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
    // Per-field validation
    const errors: Record<string, string> = {};
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.phone) errors.phone = 'Phone number is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fix the highlighted errors');
      return;
    }
    setFieldErrors({});

    try {
      setSaving(true);
      setErrorMessage('');

      if (isEditingOtherAdmin && params?.userId) {
        // Admin editing another admin - use query params
        const userParams = new URLSearchParams({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
        });
        if (formData.id_number) userParams.set('id_number', formData.id_number);
        if (formData.address) userParams.set('address', formData.address);
        await ApiService.put(`/admin/users/${params.userId}?${userParams.toString()}`);
      } else {
        // Admin editing own profile
        await ApiService.put('/auth/me', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          id_number: formData.id_number,
          address: formData.address,
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
      const errorMsg = error.response?.data?.detail || 'Failed to update profile';
      // Set field-level errors for uniqueness violations
      if (errorMsg.toLowerCase().includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: errorMsg }));
      } else if (errorMsg.toLowerCase().includes('id number')) {
        setFieldErrors(prev => ({ ...prev, id_number: errorMsg }));
      }
      setErrorMessage(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const pwErrors: Record<string, string> = {};

    if (isEditingOtherAdmin) {
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
      return;
    }
    setPasswordFieldErrors({});

    try {
      setSaving(true);
      setErrorMessage('');

      if (isEditingOtherAdmin && params?.userId) {
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
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Edit Admin Profile"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {successMessage && <InlineMessage message={successMessage} type="success" />}
        {errorMessage && <InlineMessage message={errorMessage} type="error" />}

        {/* User ID Display */}
        {userId !== null && (
          <View style={[styles.userIdCard, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
            <Text style={[styles.userIdLabel, { color: colors.primary }]}>
              User ID: <Text style={[styles.userIdValue, { color: colors.primary }]}>#{userId}</Text>
            </Text>
            <Text style={[styles.userIdHint, { color: colors.primary }]}>Use this ID to search for this user</Text>
          </View>
        )}

        <Card variant="elevated" style={{ marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>

          <FormFieldWithTip
            label="First Name"
            value={formData.first_name}
            onChangeText={text => { setFormData({ ...formData, first_name: text }); setFieldErrors(prev => ({ ...prev, first_name: undefined as any })); }}
            placeholder="Enter first name"
            required
            error={fieldErrors.first_name}
          />

          <FormFieldWithTip
            label="Last Name"
            value={formData.last_name}
            onChangeText={text => { setFormData({ ...formData, last_name: text }); setFieldErrors(prev => ({ ...prev, last_name: undefined as any })); }}
            placeholder="Enter last name"
            required
            error={fieldErrors.last_name}
          />

          <FormFieldWithTip
            label="Email Address"
            value={formData.email}
            onChangeText={text => { setFormData({ ...formData, email: text }); setFieldErrors(prev => ({ ...prev, email: undefined as any })); }}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            required
            error={fieldErrors.email}
          />

          <FormFieldWithTip
            label="Phone Number"
            value={formData.phone}
            onChangeText={text => { setFormData({ ...formData, phone: text }); setFieldErrors(prev => ({ ...prev, phone: undefined as any })); }}
            placeholder="+27 XX XXX XXXX"
            keyboardType="phone-pad"
            tooltip="Format: +27XXXXXXXXX or 0XXXXXXXXX"
            required
            error={fieldErrors.phone}
          />

          <FormFieldWithTip
            label="ID Number"
            value={formData.id_number}
            onChangeText={text => { setFormData({ ...formData, id_number: text }); setFieldErrors(prev => ({ ...prev, id_number: undefined as any })); }}
            placeholder="13-digit SA ID number"
            keyboardType="numeric"
            maxLength={13}
            tooltip="South African ID number (13 digits)"
            error={fieldErrors.id_number}
          />

          <FormFieldWithTip
            label="Address"
            value={formData.address}
            onChangeText={text => { setFormData({ ...formData, address: text }); setFieldErrors(prev => ({ ...prev, address: undefined as any })); }}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
            tooltip="Full residential or office address"
            error={fieldErrors.address}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            fullWidth
            style={{ backgroundColor: colors.success }}
            onPress={handleSaveProfile}
            disabled={saving || !hasUnsavedChanges}
            loading={saving}
          >
            Save Changes
          </Button>

          <Button
            variant="outline"
            fullWidth
            style={{ borderColor: colors.warning }}
            onPress={() => setShowPasswordModal(true)}
          >
            {isEditingOtherAdmin ? 'Reset Password' : 'Change Password'}
          </Button>

          <Button variant="secondary" fullWidth onPress={() => navigation.goBack()}>
            Cancel
          </Button>
        </View>
      </ScrollView>

      {/* Password Change/Reset Modal */}
      <ThemedModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={isEditingOtherAdmin ? 'Reset Password' : 'Change Password'}
        size="md"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" style={{ flex: 1 }} onPress={handlePasswordChange} disabled={saving} loading={saving}>
              {isEditingOtherAdmin ? 'Reset Password' : 'Change Password'}
            </Button>
          </View>
        }
      >
        {!isEditingOtherAdmin && (
          <FormFieldWithTip
            label="Current Password"
            value={passwordData.currentPassword}
            onChangeText={text => { setPasswordData({ ...passwordData, currentPassword: text }); setPasswordFieldErrors(prev => ({ ...prev, currentPassword: undefined as any })); }}
            placeholder="Enter current password"
            secureTextEntry={!showPassword}
            required
            error={passwordFieldErrors.currentPassword}
          />
        )}

        <FormFieldWithTip
          label="New Password"
          value={passwordData.newPassword}
          onChangeText={text => { setPasswordData({ ...passwordData, newPassword: text }); setPasswordFieldErrors(prev => ({ ...prev, newPassword: undefined as any })); }}
          placeholder="Enter new password"
          secureTextEntry={!showPassword}
          tooltip="Minimum 6 characters"
          required
          error={passwordFieldErrors.newPassword}
        />

        <FormFieldWithTip
          label="Confirm New Password"
          value={passwordData.confirmPassword}
          onChangeText={text => { setPasswordData({ ...passwordData, confirmPassword: text }); setPasswordFieldErrors(prev => ({ ...prev, confirmPassword: undefined as any })); }}
          placeholder="Re-enter new password"
          secureTextEntry={!showPassword}
          required
          error={passwordFieldErrors.confirmPassword}
        />

        <Pressable
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={[styles.showPasswordText, { color: colors.primary }]}>
            {showPassword ? 'Hide Password' : 'Show Password'}
          </Text>
        </Pressable>
      </ThemedModal>

      {/* Discard Changes Modal */}
      <ThemedModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="Unsaved Changes"
        size="sm"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setShowDiscardModal(false)}>
              Stay
            </Button>
            <Button variant="danger" style={{ flex: 1 }} onPress={handleDiscardChanges}>
              Discard Changes
            </Button>
          </View>
        }
      >
        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
          You have unsaved changes. Are you sure you want to discard them?
        </Text>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  userIdCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  userIdLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  userIdValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  userIdHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    width: '100%',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 15,
  },
  buttonContainer: {
    gap: 10,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
});
