/**
 * Main App Component
 */
// Import polyfills first (CRITICAL: Must be before any other imports)
import './utils/textEncodingPolyfill';

// NativeWind global styles
import './global.css';

import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Theme
import { ThemeProvider, useTheme } from './theme/ThemeContext';

// Global Top Bar
import GlobalTopBar from './components/GlobalTopBar';

// Auth Screens
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import InstructorScheduleSetupScreen from './screens/auth/InstructorScheduleSetupScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterChoiceScreen from './screens/auth/RegisterChoiceScreen';
import RegisterInstructorScreen from './screens/auth/RegisterInstructorScreen';
import RegisterStudentScreen from './screens/auth/RegisterStudentScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import SetupScreen from './screens/auth/SetupScreen';
import VerifyAccountScreen from './screens/auth/VerifyAccountScreen';
import VerificationPendingScreen from './screens/auth/VerificationPendingScreen';

// Verification Screens
import InstructorVerifyScreen from './screens/verification/InstructorVerifyScreen';

// Payment Screens (root stack — shared across flows, deep-linked)
import MockPaymentScreen from './screens/payment/MockPaymentScreen';
import PaymentCancelScreen from './screens/payment/PaymentCancelScreen';
import PaymentScreen from './screens/payment/PaymentScreen';
import PaymentSuccessScreen from './screens/payment/PaymentSuccessScreen';

// Services
import ApiService from './services/api';
import SetupService from './services/setup';

// Utilities
import InactivityManager from './utils/inactivityManager';

// Navigation — role-based bottom tabs
import { AuthActionsContext } from './navigation/AuthContext';
import MainTabs from './navigation/MainTabs';


const Stack = createNativeStackNavigator();

// Deep linking configuration
const linking = {
  prefixes: ['http://10.0.0.121:3000', 'http://10.0.0.121:8081', 'https://roadready.co.za'],
  config: {
    screens: {
      VerifyAccount: 'verify-account',
      InstructorVerify: 'instructor-verify',
      ResetPassword: 'reset-password',
      PaymentMock: 'payment/mock',
      PaymentSuccess: 'payment/success',
      PaymentCancel: 'payment/cancel',
    },
  },
};

// Storage wrapper for web compatibility
// Web: HTTP-only cookies (no JS access)
// Native: SecureStore
const storage = {
  async getItem(key: string): Promise<string | null> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      return null;
    }
    return await SecureStore.getItemAsync(key);
  },
  async removeItem(key: string): Promise<void> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      return;
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Expo will show splash screen until fonts load
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [requiresSetup, setRequiresSetup] = useState<boolean>(false);
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(15); // Default 15 minutes
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkInitialization();
  }, []);

  // Inactivity tracking - start when authenticated, stop when logged out
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch timeout setting from server and start tracking
      fetchInactivityTimeout();
      InactivityManager.startTracking(handleLogout, inactivityTimeout);
      console.log('🕐 Inactivity tracking started');
    } else {
      InactivityManager.stopTracking();
    }

    return () => {
      InactivityManager.stopTracking();
    };
  }, [isAuthenticated, inactivityTimeout]);

  const checkInitialization = async () => {
    try {
      // First check if system is initialized (admin exists)
      const setupStatus = await SetupService.checkSetupStatus();
      setRequiresSetup(setupStatus.requires_setup);

      // Then check authentication
      await checkAuth();
    } catch (error) {
      console.error('Error checking initialization:', error);
      setRequiresSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const isWeb = Platform?.OS === 'web';
      if (isWeb) {
        // Web: rely on HTTP-only cookie, verify by calling /auth/me
        const response = await ApiService.get('/auth/me');
        const role = response.data.role;
        const firstName = response.data.first_name || '';
        const lastName = response.data.last_name || '';
        const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
        setIsAuthenticated(true);
        setUserRole(role);
        setUserName(`${firstName} ${lastName} (${roleName})`);
        return;
      }

      // Native: use SecureStore + Authorization header fallback
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
      setIsAuthenticated(false);
      setUserRole(null);
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

  const fetchInactivityTimeout = async () => {
    try {
      // Fetch global inactivity timeout from server
      const response = await ApiService.get('/auth/inactivity-timeout');
      const timeout = response.data.inactivity_timeout_minutes || 15;
      setInactivityTimeout(timeout);
      InactivityManager.updateTimeout(timeout);
      console.log(`⏱️ Inactivity timeout loaded: ${timeout} minutes`);
    } catch (error) {
      console.error('Error fetching inactivity timeout:', error);
      // Use default 15 minutes if fetch fails
      setInactivityTimeout(15);
    }
  };

  // useTheme must be called before any conditional return (Rules of Hooks)
  const { colors } = useTheme();

  if (isLoading) {
    return null; // Or a loading screen
  }

  const handleAuthChange = async () => {
    await checkAuth();
  };

  const handleSetupComplete = async () => {
    // After setup is complete, refresh and check auth
    setRequiresSetup(false);
    await checkAuth();
  };

  const handleLogout = async () => {
    // IMMEDIATE LOGOUT: Clear auth tokens and redirect to login (per AGENTS.md)
    try {
      await ApiService.logout();
      await storage.removeItem('access_token');
      await storage.removeItem('user_role');
      setIsAuthenticated(false);
      setUserRole(null);
      setUserName('');

      // Web: Redirect to root (login page) to clear all state
      if (Platform.OS === 'web') {
        window.location.href = '/';
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

  return (
    <AuthActionsContext.Provider value={{ onLogout: handleLogout, userName, userRole }}>
      <StatusBar style="auto" />
      {isAuthenticated && Platform.OS === 'web' && (
        <GlobalTopBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      )}
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        style={isAuthenticated && Platform.OS === 'web' ? styles.navigationWithTopBar : {}}
      >
        <Stack.Navigator
          initialRouteName={requiresSetup ? 'Setup' : isAuthenticated ? 'Main' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.headerBackground },
            headerTintColor: colors.headerText,
            headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
            headerBackTitle: 'Back',
            headerShown: true,
          }}
        >
          {/* Setup — shown only when no admin exists */}
          {requiresSetup && (
            <Stack.Screen
              name="Setup"
              component={SetupScreen}
              options={{ title: 'Initial Setup' }}
              listeners={{
                focus: () => {
                  SetupService.checkSetupStatus().then(status => {
                    if (!status.requires_setup) {
                      setRequiresSetup(false);
                      handleSetupComplete();
                    }
                  });
                },
              }}
            />
          )}

          {isAuthenticated ? (
            <Stack.Group screenOptions={{ headerShown: false }}>
              {/* Tab navigator — handles its own headers via nested stacks */}
              <Stack.Screen name="Main" component={MainTabs} />

              {/* Payment screens — root level for cross-navigator access */}
              <Stack.Screen
                name="Payment"
                component={PaymentScreen}
                options={{
                  headerShown: true,
                  title: 'Payment',
                  headerStyle: { backgroundColor: colors.headerBackground },
                  headerTintColor: colors.headerText,
                  headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
                }}
              />
              <Stack.Screen name="PaymentMock" component={MockPaymentScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
              <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="Login" options={{ title: 'Login' }}>
                {props => <LoginScreen {...props} onAuthChange={handleAuthChange} />}
              </Stack.Screen>
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
              <Stack.Screen name="RegisterChoice" component={RegisterChoiceScreen} options={{ title: 'Choose Account Type' }} />
              <Stack.Screen name="RegisterStudent" component={RegisterStudentScreen} options={{ title: 'Register as Student' }} />
              <Stack.Screen name="RegisterInstructor" component={RegisterInstructorScreen} options={{ title: 'Register as Instructor' }} />
              <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} options={{ title: 'Verify Your Account' }} />
              <Stack.Screen name="InstructorScheduleSetup" component={InstructorScheduleSetupScreen} options={{ title: 'Set Up Schedule' }} />
            </Stack.Group>
          )}

          {/* Deep-linked screens — always available regardless of auth state */}
          <Stack.Group>
            <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} options={{ title: 'Verify Account' }} />
            <Stack.Screen name="InstructorVerify" component={InstructorVerifyScreen} options={{ title: 'Verify Instructor' }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </AuthActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  navigationWithTopBar: {
    marginTop: Platform.OS === 'web' ? 56 : 0,
  },
});
