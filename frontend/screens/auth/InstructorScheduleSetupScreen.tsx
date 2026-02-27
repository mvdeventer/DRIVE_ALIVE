/**
 * Instructor Schedule Setup Screen
 * Wrapper for schedule management - used during registration and by admins/instructors
 */
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ApiService from '../../services/api';
import AdminManageInstructorScheduleScreen from '../admin/AdminManageInstructorScheduleScreen';
import { Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';

export default function InstructorScheduleSetupScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const {
    instructorId: passedInstructorId,
    instructorName,
    isInitialSetup = false,
    setupToken = undefined as string | undefined,
    verificationData = null,
  } = route.params || {};

  const [instructorId, setInstructorId] = useState<number | null>(passedInstructorId);
  const [loading, setLoading] = useState(!passedInstructorId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!passedInstructorId) {
      // Fetch instructor ID for current user
      fetchInstructorId();
    }
  }, [passedInstructorId]);

  const fetchInstructorId = async () => {
    try {
      const response = await ApiService.get('/instructors/me');
      setInstructorId(response.data.instructor_id);
    } catch (err: any) {
      console.error('Failed to fetch instructor ID:', err);
      setError('Failed to load your instructor profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (verificationData) {
      // Navigate to verification pending screen
      navigation.replace('VerificationPending', verificationData);
    } else {
      // Go back to previous screen
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>❌ {error}</Text>
        <Button label="🔄 Retry" onPress={fetchInstructorId} style={{ marginBottom: 10 }} />
        {isInitialSetup ? (
          <Button label="⏩ Skip for Now" onPress={handleSkip} variant="secondary" />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isInitialSetup ? (
        <View style={[styles.headerBanner, { backgroundColor: colors.successBg, borderBottomColor: colors.success + '40' }]}>
          {verificationData?.adminVerificationPending ? (
            <>
              <Text style={[styles.bannerText, { color: colors.success }]}>
                ✅ Registration Successful! {verificationData.adminCount > 0 ? `${verificationData.adminCount} admin(s) have been notified to verify your account.` : 'Admins will verify your account soon.'}
              </Text>
              <Text style={[styles.bannerText, { marginTop: 8, fontSize: Platform.OS === 'web' ? 14 : 12, color: colors.textSecondary }]}>
                📅 You can set up your schedule now or skip and do it later.
              </Text>
            </>
          ) : (
            <Text style={[styles.bannerText, { color: colors.success }]}>
              📅 Set up your weekly schedule and availability (optional - you can skip and do this
              later)
            </Text>
          )}
          <Pressable
            style={[styles.skipBannerButton, { backgroundColor: colors.primary }]}
            onPress={handleSkip}
          >
            <Text style={styles.skipBannerButtonText}>⏩ Skip</Text>
          </Pressable>
        </View>
      ) : null}
      <AdminManageInstructorScheduleScreen
        route={{ params: { instructorId, instructorName, setupToken } }}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  headerBanner: {
    padding: Platform.OS === 'web' ? 16 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 14 : 12,
    marginRight: 10,
  },
  skipBannerButton: {
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 6,
  },
  skipBannerButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
  },
});
