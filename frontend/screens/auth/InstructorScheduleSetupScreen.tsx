/**
 * Instructor Schedule Setup Screen
 * Wrapper for schedule management - used during registration and by admins/instructors
 */
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';
import AdminManageInstructorScheduleScreen from '../admin/AdminManageInstructorScheduleScreen';

export default function InstructorScheduleSetupScreen({ route, navigation }: any) {
  const {
    instructorId: passedInstructorId,
    instructorName,
    isInitialSetup = false,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchInstructorId}>
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
        {isInitialSetup && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>⏩ Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isInitialSetup && (
        <View style={styles.headerBanner}>
          {verificationData?.adminVerificationPending ? (
            <>
              <Text style={styles.bannerText}>
                ✅ Registration Successful! {verificationData.adminCount > 0 ? `${verificationData.adminCount} admin(s) have been notified to verify your account.` : 'Admins will verify your account soon.'}
              </Text>
              <Text style={[styles.bannerText, { marginTop: 8, fontSize: Platform.OS === 'web' ? 14 : 12 }]}>
                📅 You can set up your schedule now or skip and do it later.
              </Text>
            </>
          ) : (
            <Text style={styles.bannerText}>
              📅 Set up your weekly schedule and availability (optional - you can skip and do this
              later)
            </Text>
          )}
          <TouchableOpacity style={styles.skipBannerButton} onPress={handleSkip}>
            <Text style={styles.skipBannerButtonText}>⏩ Skip</Text>
          </TouchableOpacity>
        </View>
      )}
      <AdminManageInstructorScheduleScreen
        route={{ params: { instructorId, instructorName } }}
        navigation={navigation}
      />
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 18,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#6c757d',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 18,
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  headerBanner: {
    backgroundColor: '#e8f5e9',
    padding: Platform.OS === 'web' ? 16 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  bannerText: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#2e7d32',
    marginRight: 10,
  },
  skipBannerButton: {
    backgroundColor: '#4caf50',
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
