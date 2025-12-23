/**
 * Main App Component
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

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
import EditInstructorProfileScreen from './screens/instructor/EditInstructorProfileScreen';
import InstructorHomeScreen from './screens/instructor/InstructorHomeScreen';
import ManageAvailabilityScreen from './screens/instructor/ManageAvailabilityScreen';

// Payment Screens
import PaymentScreen from './screens/payment/PaymentScreen';

// Admin Screens
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import BookingOversightScreen from './screens/admin/BookingOversightScreen';
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('access_token');
      const role = await storage.getItem('user_role');
      setIsAuthenticated(!!token);
      setUserRole(role);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  const handleAuthChange = () => {
    checkAuth();
  };

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
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
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
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

          {/* Payment */}
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />

          {/* Admin Stack */}
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
