/**
 * Main App Component
 */
// Import polyfills first (CRITICAL: Must be before any other imports)
import './utils/textEncodingPolyfill';

import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

// Global Top Bar
import GlobalTopBar from './components/GlobalTopBar';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterChoiceScreen from './screens/auth/RegisterChoiceScreen';
import RegisterInstructorScreen from './screens/auth/RegisterInstructorScreen';
import RegisterStudentScreen from './screens/auth/RegisterStudentScreen';

// Student Screens
import BookingScreen from './screens/booking/BookingScreen';
import EditStudentProfileScreen from './screens/student/EditStudentProfileScreen';
import InstructorListScreen from './screens/student/InstructorListScreen';
import StudentHomeScreen from './screens/student/StudentHomeScreen';

// Instructor Screens
import EarningsReportScreen from './screens/instructor/EarningsReportScreen';
import EditInstructorProfileScreen from './screens/instructor/EditInstructorProfileScreen';
import InstructorHomeScreen from './screens/instructor/InstructorHomeScreen';
import ManageAvailabilityScreen from './screens/instructor/ManageAvailabilityScreen';

// Payment Screens
import PaymentCancelScreen from './screens/payment/PaymentCancelScreen';
import PaymentScreen from './screens/payment/PaymentScreen';
import PaymentSuccessScreen from './screens/payment/PaymentSuccessScreen';

// API Service
import ApiService from './services/api';

// Admin Screens
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import BookingOversightScreen from './screens/admin/BookingOversightScreen';
import EditAdminProfileScreen from './screens/admin/EditAdminProfileScreen';
import InstructorEarningsOverviewScreen from './screens/admin/InstructorEarningsOverviewScreen';
import InstructorVerificationScreen from './screens/admin/InstructorVerificationScreen';
import RevenueAnalyticsScreen from './screens/admin/RevenueAnalyticsScreen';
import UserManagementScreen from './screens/admin/UserManagementScreen';

const Stack = createNativeStackNavigator();

// Storage wrapper for web compatibility
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('access_token');
      const role = await storage.getItem('user_role');
      setIsAuthenticated(!!token);
      setUserRole(role);

      // Fetch user profile if authenticated
      if (token && role) {
        fetchUserProfile(role);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (role: string) => {
    try {
      let endpoint = '';
      if (role === 'instructor') {
        endpoint = '/instructors/me';
      } else if (role === 'student') {
        endpoint = '/students/me';
      } else if (role === 'admin') {
        endpoint = '/auth/me';
      }

      if (endpoint) {
        const response = await ApiService.get(endpoint);
        const firstName = response.data.first_name || '';
        const lastName = response.data.last_name || '';
        const roleName = role.charAt(0).toUpperCase() + role.slice(1);
        setUserName(`${firstName} ${lastName} (${roleName})`);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set generic name if profile fetch fails
      const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
      setUserName(roleName);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  const handleAuthChange = async () => {
    await checkAuth();
  };

  const handleLogout = async () => {
    // IMMEDIATE LOGOUT: Clear auth tokens and reload (per AGENTS.md)
    try {
      await storage.removeItem('access_token');
      await storage.removeItem('user_role');
      setIsAuthenticated(false);
      setUserRole(null);
      setUserName('');

      // Web: Reload page to clear all state
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        // Mobile: Reset navigation to Login screen
        navigationRef.current?.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const UserNameDisplay = () => <Text style={styles.userNameText}>{userName}</Text>;

  const LogoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );

  const WebBackButton = ({ navigation }: any) => (
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.webBackButton}>
      <Text style={styles.webBackButtonText}>← Back</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar style="auto" />
      {isAuthenticated && Platform.OS === 'web' && (
        <GlobalTopBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      )}
      <NavigationContainer
        ref={navigationRef}
        style={isAuthenticated && Platform.OS === 'web' ? styles.navigationWithTopBar : {}}
      >
        <Stack.Navigator
          initialRouteName={
            !isAuthenticated
              ? 'Login'
              : userRole === 'admin'
              ? 'AdminDashboard'
              : userRole === 'instructor'
              ? 'InstructorHome'
              : 'StudentHome'
          }
          screenOptions={({ navigation, route }) => ({
            headerStyle: {
              backgroundColor: '#007AFF',
              height: 60,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            // Show back button on web for all authenticated screens except dashboard
            headerLeft:
              Platform.OS === 'web' &&
              isAuthenticated &&
              route.name !== 'AdminDashboard' &&
              route.name !== 'InstructorHome' &&
              route.name !== 'StudentHome'
                ? () => <WebBackButton navigation={navigation} />
                : isAuthenticated && userName && !navigation.canGoBack() && Platform.OS !== 'web'
                ? () => <UserNameDisplay />
                : undefined,
            // Show logout button on mobile only (web has GlobalTopBar)
            headerRight:
              isAuthenticated && Platform.OS !== 'web' ? () => <LogoutButton /> : undefined,
            // Ensure header is visible on all authenticated screens
            headerShown: true,
          })}
        >
          {/* Auth Stack - Always available */}
          <Stack.Screen name="Login" options={{ title: 'Login', headerShown: !isAuthenticated }}>
            {props => <LoginScreen {...props} onAuthChange={handleAuthChange} />}
          </Stack.Screen>
          <Stack.Screen
            name="RegisterChoice"
            component={RegisterChoiceScreen}
            options={{ title: 'Choose Account Type', headerShown: !isAuthenticated }}
          />
          <Stack.Screen
            name="RegisterStudent"
            component={RegisterStudentScreen}
            options={{ title: 'Register as Student', headerShown: !isAuthenticated }}
          />
          <Stack.Screen
            name="RegisterInstructor"
            component={RegisterInstructorScreen}
            options={{ title: 'Register as Instructor', headerShown: !isAuthenticated }}
          />

          {/* Student Stack */}
          <Stack.Screen
            name="StudentHome"
            component={StudentHomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen
            name="InstructorList"
            component={InstructorListScreen}
            options={{ title: 'Find Instructors' }}
          />
          <Stack.Screen
            name="Booking"
            component={BookingScreen}
            options={{ title: 'Book Lesson' }}
          />
          <Stack.Screen
            name="EditStudentProfile"
            component={EditStudentProfileScreen}
            options={{ title: 'Edit Profile' }}
          />

          {/* Instructor Stack */}
          <Stack.Screen
            name="InstructorHome"
            component={InstructorHomeScreen}
            options={{ title: 'Instructor Dashboard' }}
          />
          <Stack.Screen
            name="EditInstructorProfile"
            component={EditInstructorProfileScreen}
            options={{ title: 'Edit Profile' }}
          />
          <Stack.Screen
            name="ManageAvailability"
            component={ManageAvailabilityScreen}
            options={{ title: 'Manage Availability' }}
          />
          <Stack.Screen
            name="EarningsReport"
            component={EarningsReportScreen}
            options={{ title: 'Earnings Report' }}
          />

          {/* Payment */}
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
          <Stack.Screen
            name="PaymentSuccess"
            component={PaymentSuccessScreen}
            options={{ title: 'Payment Successful', headerShown: false }}
          />
          <Stack.Screen
            name="PaymentCancel"
            component={PaymentCancelScreen}
            options={{ title: 'Payment Cancelled', headerShown: false }}
          />

          {/* Admin Stack */}
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen
            name="EditAdminProfile"
            component={EditAdminProfileScreen}
            options={{ title: 'Edit Admin Profile' }}
          />
          <Stack.Screen
            name="InstructorVerification"
            component={InstructorVerificationScreen}
            options={{ title: 'Verify Instructors' }}
          />
          <Stack.Screen
            name="UserManagement"
            component={UserManagementScreen}
            options={{ title: 'User Management' }}
          />
          <Stack.Screen
            name="BookingOversight"
            component={BookingOversightScreen}
            options={{ title: 'Booking Oversight' }}
          />
          <Stack.Screen
            name="RevenueAnalytics"
            component={RevenueAnalyticsScreen}
            options={{ title: 'Revenue Analytics' }}
          />
          <Stack.Screen
            name="InstructorEarningsOverview"
            component={InstructorEarningsOverviewScreen}
            options={{ title: 'Instructor Earnings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  userNameText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 15,
    maxWidth: Platform.OS === 'web' ? 250 : 180,
  },
  logoutButton: {
    marginRight: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  webBackButton: {
    marginLeft: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  webBackButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  navigationWithTopBar: {
    marginTop: Platform.OS === 'web' ? 70 : 0,
  },
});
