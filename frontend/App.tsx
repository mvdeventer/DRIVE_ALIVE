/**
 * Main App Component
 */
// Import polyfills first (CRITICAL: Must be before any other imports)
import './utils/textEncodingPolyfill';

// ── PWA: register service worker for offline support (web only) ───────────────
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Service worker registration is best-effort; never block app startup.
    });
  });
}

// ── Sentry: web error monitoring (POPIA-scrubbed). ────────────────────────────
// To enable: npm install @sentry/react, set EXPO_PUBLIC_SENTRY_DSN in .env
// then uncomment the block below.
//
// import * as Sentry from '@sentry/react';
// if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
//   const _SA_ID = /\b\d{13}\b/g;
//   const _EMAIL = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
//   const _PHONE = /\b(?:\+27|0)\d{9}\b/g;
//   const scrub = (s: string) =>
//     s.replace(_SA_ID, '[SA_ID]').replace(_EMAIL, '[EMAIL]').replace(_PHONE, '[PHONE]');
//   Sentry.init({
//     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//     environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
//     tracesSampleRate: 0.05,
//     sendDefaultPii: false,
//     beforeSend(event) {
//       for (const exc of event.exception?.values ?? []) {
//         if (exc.value) exc.value = scrub(exc.value);
//       }
//       for (const bc of event.breadcrumbs?.values ?? []) {
//         if (bc.message) bc.message = scrub(bc.message);
//       }
//       return event;
//     },
//   });
// }

import {
  CommonActions,
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Theme
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { I18nProvider, LocaleOverride, useI18n } from './i18n';

// React Query
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';

// Global Top Bar
import GlobalTopBar from './components/GlobalTopBar';

// Auth Screens
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import InstructorScheduleSetupScreen from './screens/auth/InstructorScheduleSetupScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterChoiceScreen from './screens/auth/RegisterChoiceScreen';
import RegisterCompanyScreen from './screens/auth/RegisterCompanyScreen';
import InstructorInviteScreen from './screens/auth/InstructorInviteScreen';
import RegisterInstructorScreen from './screens/auth/RegisterInstructorScreen';
import RegisterStudentScreen from './screens/auth/RegisterStudentScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import SetupScreen from './screens/auth/SetupScreen';
import VerifyAccountScreen from './screens/auth/VerifyAccountScreen';
import VerificationPendingScreen from './screens/auth/VerificationPendingScreen';

// Verification Screens
import InstructorVerifyScreen from './screens/verification/InstructorVerifyScreen';
import InstructorCompanyVerifyScreen from './screens/verification/InstructorCompanyVerifyScreen';

// Instructor Screens
import MyInstructorsScreen from './screens/instructor/MyInstructorsScreen';
import PublicInstructorProfileScreen from './screens/instructor/PublicInstructorProfileScreen';

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
// The root stack has no declared param list, so React Navigation infers every
// screen as `unknown` and rejects the nested `config.screens` block below.
// Properly typing this would mean declaring a param list for every navigator
// in the app — a refactor with no runtime effect. This object was previously
// untyped (inferred) anyway, so `any` here loses nothing that existed before.
const linking: LinkingOptions<any> = {
  prefixes: ['http://localhost:3000', 'http://localhost:8081', 'https://roadready.co.za'],
  config: {
    screens: {
      VerifyAccount: 'verify-account',
      InstructorVerify: 'instructor-verify',
      InstructorCompanyVerify: 'company-instructor-verify',
      InstructorInvite: 'instructor-invite',
      ResetPassword: 'reset-password',
      // Without this the pending screen has no resolvable path, so refreshing
      // it (or reopening the tab) dropped the user back to Login mid-signup.
      VerificationPending: 'verification-pending',
      PublicInstructorProfile: 'instructors/:instructorId',
      PaymentMock: 'payment/mock',
      PaymentSuccess: 'payment/success',
      PaymentCancel: 'payment/cancel',
      // React Navigation *generates* URLs for the nested Main navigator even
      // without config (that is where /Main/DashboardTab/AdminDashboard comes
      // from) but it cannot parse them back. So every in-app screen had a URL
      // that looked bookmarkable and silently resolved to the stack's initial
      // route instead — a refresh on any sub-screen dumped the user back at
      // their dashboard. Declaring the nesting makes those URLs round-trip.
      //
      // Only one of these tab navigators is mounted at a time (MainTabs
      // dispatches on role), so the repeated tab names below never collide.
      Main: {
        screens: {
          // --- Admin ---
          DashboardTab: {
            screens: {
              AdminDashboard: 'admin/dashboard',
              InstructorVerification: 'admin/verify-instructors',
              RevenueAnalytics: 'admin/revenue',
              AdvancedAnalytics: 'admin/analytics',
              InstructorEarningsOverview: 'admin/instructor-earnings',
              AdminManageInstructorSchedule: 'admin/instructor-schedule',
              CreateAdmin: 'admin/create-admin',
              CompanyAdminHome: 'school/dashboard',
            },
          },
          UsersTab: {
            screens: {
              UserManagement: 'admin/users',
              CreateUser: 'admin/users/new',
              EditStudentProfile: 'admin/users/student/:userId',
              EditInstructorProfile: 'admin/users/instructor/:userId',
              EditAdminProfileFromUsers: 'admin/users/admin/:userId',
            },
          },
          BookingsTab: {
            screens: { BookingOversight: 'admin/bookings' },
          },
          SettingsTab: {
            screens: {
              AdminSettings: 'admin/settings',
              EditAdminProfile: 'admin/settings/profile',
              DatabaseInterface: 'admin/database',
            },
          },
          // --- Instructor / Student ---
          HomeTab: {
            screens: {
              InstructorHome: 'instructor/home',
              StudentHome: 'student/home',
            },
          },
          ScheduleTab: {
            screens: { ManageAvailability: 'instructor/availability' },
          },
          EarningsTab: {
            screens: { EarningsReport: 'instructor/earnings' },
          },
          FindTab: {
            screens: {
              InstructorList: 'student/instructors',
              Booking: 'student/book',
            },
          },
          ProfileTab: {
            screens: {
              Certifications: 'profile/certifications',
            },
          },
          // --- Company admin ---
          RosterTab: {
            screens: {
              CompanyRoster: 'school/roster',
              EnrolLearner: 'school/roster/enrol',
            },
          },
          PricingTab: {
            screens: { CompanyPricing: 'school/pricing' },
          },
          BillingTab: {
            screens: { CompanyStatement: 'school/statement' },
          },
        },
      },
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  // Per-account UI language: applied on sign-in, dropped on sign-out so a
  // shared browser never carries one user's language into the next session.
  const { setAccountLocale, clearAccountLocale } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [requiresSetup, setRequiresSetup] = useState<boolean>(false);
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(15); // Default 15 minutes
  const navigationRef = useRef<any>(null);
  // Stable ref so the session-invalidation handler registered with ApiService
  // always calls the latest handleLogout without breaking Rules of Hooks.
  const handleLogoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    checkInitialization();
  }, []);

  // Register once; the ref keeps it pointing at the current handleLogout.
  useEffect(() => {
    ApiService.registerSessionInvalidationHandler(() => handleLogoutRef.current());
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
        setAccountLocale(response.data.preferred_language);
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
    } catch (error: any) {
      // A 401 on startup simply means there is no active session yet.
      if (error?.response?.status !== 401) {
        console.error('Error checking auth:', error);
      }
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
      } else if (role === 'admin' || role === 'company_admin') {
        endpoint = '/auth/me';
      }

      if (endpoint) {
        const response = await ApiService.get(endpoint);
        const firstName = response.data.first_name || '';
        const lastName = response.data.last_name || '';
        const roleName =
          role === 'company_admin'
            ? 'Driving School'
            : role.charAt(0).toUpperCase() + role.slice(1);
        setUserName(`${firstName} ${lastName} (${roleName})`);
        setAccountLocale(response.data.preferred_language);
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
  const { colors, isDark } = useTheme();

  // React Navigation paints the screen background from its OWN theme, not ours.
  // Without this, NavigationContainer falls back to DefaultTheme
  // (background rgb(242,242,242) — always light), so dark mode rendered light
  // text on a light-grey backdrop. Bridge our tokens into its theme.
  const navigationTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

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
      clearAccountLocale();

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
  // Keep the ref current every render so the useEffect above always calls the latest version.
  handleLogoutRef.current = handleLogout;

  return (
    <AuthActionsContext.Provider value={{ onLogout: handleLogout, userName, userRole }}>
      <StatusBar style="auto" />
      {isAuthenticated && Platform.OS === 'web' && (
        <GlobalTopBar userName={userName} userRole={userRole} onLogout={handleLogout} />
      )}
      <View style={isAuthenticated && Platform.OS === 'web' ? styles.navigationWithTopBar : styles.navigationFull}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={navigationTheme}
      >
        <Stack.Navigator
          initialRouteName={requiresSetup ? 'Setup' : isAuthenticated ? 'Main' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: colors.headerBackground },
            headerTintColor: colors.headerText,
            headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
            headerBackTitle: 'Back',
            headerShown: Platform.OS !== 'web',
          }}
        >
          {/* Setup — shown only when no admin exists */}
          {requiresSetup && (
            <Stack.Screen
              name="Setup"
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
            >
              {/* First-run wizard is always English: no account exists yet, so
                  there is no per-user language to honour. */}
              {props => (
                <LocaleOverride locale="en">
                  <SetupScreen {...props} />
                </LocaleOverride>
              )}
            </Stack.Screen>
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
                  headerShown: Platform.OS !== 'web',
                  title: 'Payment',
                  headerStyle: { backgroundColor: colors.headerBackground },
                  headerTintColor: colors.headerText,
                  headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
                }}
              />
              <Stack.Screen name="PaymentMock" component={MockPaymentScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
              <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} />
              <Stack.Screen name="MyInstructors" component={MyInstructorsScreen} options={{ headerShown: Platform.OS !== 'web', title: 'My Company Instructors' }} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="Login" options={{ title: 'Login' }}>
                {/* Sign-in is always English: nobody is identified yet, so the
                    account language is unknown. Registration screens are NOT
                    overridden — they carry their own language picker. */}
                {props => (
                  <LocaleOverride locale="en">
                    <LoginScreen {...props} onAuthChange={handleAuthChange} />
                  </LocaleOverride>
                )}
              </Stack.Screen>
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
              <Stack.Screen name="RegisterChoice" component={RegisterChoiceScreen} options={{ title: 'Choose Account Type' }} />
              <Stack.Screen name="RegisterCompany" component={RegisterCompanyScreen} options={{ title: 'Register Company' }} />
              <Stack.Screen name="RegisterStudent" component={RegisterStudentScreen} options={{ title: 'Register as Student' }} />
              <Stack.Screen name="RegisterInstructor" component={RegisterInstructorScreen} options={{ title: 'Register as Instructor' }} />
              <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} options={{ title: 'Verify Your Account' }} />
              <Stack.Screen name="InstructorScheduleSetup" component={InstructorScheduleSetupScreen} options={{ title: 'Set Up Schedule' }} />
            </Stack.Group>
          )}

          {/* Deep-linked screens — always available regardless of auth state */}
          <Stack.Group>
            <Stack.Screen name="InstructorInvite" component={InstructorInviteScreen} options={{ title: 'School Invitation' }} />
            <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} options={{ title: 'Verify Account' }} />
            <Stack.Screen name="InstructorVerify" component={InstructorVerifyScreen} options={{ title: 'Verify Instructor' }} />
            <Stack.Screen name="InstructorCompanyVerify" component={InstructorCompanyVerifyScreen} options={{ title: 'Approve Instructor' }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
            {/* Public instructor profile — SEO-indexed, no auth required */}
            <Stack.Screen
              name="PublicInstructorProfile"
              component={PublicInstructorProfileScreen}
              options={{ headerShown: Platform.OS !== 'web', title: 'Instructor Profile' }}
            />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
      </View>
    </AuthActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  navigationFull: {
    flex: 1,
  },
  navigationWithTopBar: {
    flex: 1,
    marginTop: Platform.OS === 'web' ? 56 : 0,
  },
});
