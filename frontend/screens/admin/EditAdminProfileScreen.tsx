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
    try {
      setSaving(true);
      setErrorMessage('');

      if (isEditingOtherAdmin && params?.userId) {
        // Admin editing another admin
        await ApiService.put(`/admin/users/${params.userId}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          id_number: formData.id_number,
          address: formData.address,
        });
      } else {
        // Admin editing own profile
        await ApiService.put('/auth/me', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
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

          <FormFieldWithTip
            label="ID Number"
            value={formData.id_number}
            onChangeText={text => setFormData({ ...formData, id_number: text })}
            placeholder="13-digit SA ID number"
            keyboardType="numeric"
            maxLength={13}
            tooltip="South African ID number (13 digits)"
          />

          <FormFieldWithTip
            label="Address"
            value={formData.address}
            onChangeText={text => setFormData({ ...formData, address: text })}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
            tooltip="Full residential or office address"
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

          {!isEditingOtherAdmin && (
            <Button
              variant="outline"
              fullWidth
              style={{ borderColor: colors.warning }}
              onPress={() => setShowPasswordModal(true)}
            >
              Change Password
            </Button>
          )}

          <Button variant="secondary" fullWidth onPress={() => navigation.goBack()}>
            Cancel
          </Button>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <ThemedModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="sm"
        footer={
          <View style={styles.modalButtons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" style={{ flex: 1 }} onPress={handlePasswordChange} disabled={saving} loading={saving}>
              Change Password
            </Button>
          </View>
        }
      >
        <FormFieldWithTip
          label="Current Password"
          value={passwordData.currentPassword}
          onChangeText={text => setPasswordData({ ...passwordData, currentPassword: text })}
          placeholder="Enter current password"
          secureTextEntry={!showPassword}
          required
        />

        <FormFieldWithTip
          label="New Password"
          value={passwordData.newPassword}
          onChangeText={text => setPasswordData({ ...passwordData, newPassword: text })}
          placeholder="Enter new password"
          secureTextEntry={!showPassword}
          tooltip="Minimum 8 characters"
          required
        />

        <FormFieldWithTip
          label="Confirm New Password"
          value={passwordData.confirmPassword}
          onChangeText={text => setPasswordData({ ...passwordData, confirmPassword: text })}
          placeholder="Re-enter new password"
          secureTextEntry={!showPassword}
          required
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
