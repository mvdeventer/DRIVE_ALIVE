/**
 * Admin bottom-tab navigator
 *
 * Tabs: Dashboard | Users | Bookings | Settings
 *
 * Dashboard tab contains sub-screens that are pushed onto its stack.
 * Settings tab contains admin settings, profile editing, and database.
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { useAuthActions } from './AuthContext';

// Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminManageInstructorScheduleScreen from '../screens/admin/AdminManageInstructorScheduleScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import BookingOversightScreen from '../screens/admin/BookingOversightScreen';
import CreateAdminScreen from '../screens/admin/CreateAdminScreen';
import EditAdminProfileScreen from '../screens/admin/EditAdminProfileScreen';
import InstructorEarningsOverviewScreen from '../screens/admin/InstructorEarningsOverviewScreen';
import InstructorVerificationScreen from '../screens/admin/InstructorVerificationScreen';
import RevenueAnalyticsScreen from '../screens/admin/RevenueAnalyticsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import EditInstructorProfileScreen from '../screens/instructor/EditInstructorProfileScreen';
import EditStudentProfileScreen from '../screens/student/EditStudentProfileScreen';

// Lazy-loaded heavy screen
const DatabaseInterfaceScreen = React.lazy(
  () => import('../screens/admin/DatabaseInterfaceScreen'),
);

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const UsersStack = createNativeStackNavigator();
const BookingsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

// ─── Shared header options hook ────────────────────────────

function useHeaderOptions() {
  const { colors } = useTheme();
  const { onLogout, userName } = useAuthActions();

  return ({ navigation }: any) => ({
    headerStyle: { backgroundColor: colors.headerBackground },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
    headerBackTitle: 'Back',
    headerLeft: navigation.canGoBack()
      ? undefined
      : Platform.OS !== 'web' && userName
        ? () => (
            <Text
              style={{
                color: colors.headerText,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 14,
                marginLeft: 15,
                maxWidth: 180,
              }}
              numberOfLines={1}
            >
              {userName}
            </Text>
          )
        : undefined,
    headerRight:
      Platform.OS !== 'web'
        ? () => (
            <Pressable
              onPress={onLogout}
              style={{
                marginRight: 15,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 5,
              }}
            >
              <Text
                style={{
                  color: colors.headerText,
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 14,
                }}
              >
                Logout
              </Text>
            </Pressable>
          )
        : undefined,
    headerShown: true,
  });
}

// ─── Stack screens ─────────────────────────────────────────

function DashboardStackScreen() {
  const options = useHeaderOptions();
  return (
    <DashboardStack.Navigator screenOptions={options}>
      <DashboardStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <DashboardStack.Screen
        name="InstructorVerification"
        component={InstructorVerificationScreen}
        options={{ title: 'Verify Instructors' }}
      />
      <DashboardStack.Screen
        name="RevenueAnalytics"
        component={RevenueAnalyticsScreen}
        options={{ title: 'Revenue Analytics' }}
      />
      <DashboardStack.Screen
        name="InstructorEarningsOverview"
        component={InstructorEarningsOverviewScreen}
        options={{ title: 'Instructor Earnings' }}
      />
      <DashboardStack.Screen
        name="AdminManageInstructorSchedule"
        component={AdminManageInstructorScheduleScreen}
        options={{ title: 'Manage Instructor Schedule' }}
      />
      <DashboardStack.Screen
        name="CreateAdmin"
        component={CreateAdminScreen}
        options={{ title: 'Create Admin' }}
      />
      {/* Screens also reachable from sibling tabs — duplicated here so
          the Dashboard quick-action buttons can push them onto this stack */}
      <DashboardStack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'User Management' }}
      />
      <DashboardStack.Screen
        name="EditStudentProfile"
        component={EditStudentProfileScreen}
        options={{ title: 'Edit Student' }}
      />
      <DashboardStack.Screen
        name="EditInstructorProfile"
        component={EditInstructorProfileScreen}
        options={{ title: 'Edit Instructor' }}
      />
      <DashboardStack.Screen
        name="EditAdminProfileFromUsers"
        component={EditAdminProfileScreen}
        options={{ title: 'Edit Admin' }}
      />
      <DashboardStack.Screen
        name="BookingOversight"
        component={BookingOversightScreen}
        options={{ title: 'Booking Oversight' }}
      />
      <DashboardStack.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ title: 'Admin Settings' }}
      />
      <DashboardStack.Screen name="DatabaseInterface" options={{ title: 'Database' }}>
        {(props) => (
          <React.Suspense
            fallback={
              <Text style={{ padding: 20, textAlign: 'center' }}>
                Loading Database Interface...
              </Text>
            }
          >
            <DatabaseInterfaceScreen {...props} />
          </React.Suspense>
        )}
      </DashboardStack.Screen>
    </DashboardStack.Navigator>
  );
}

function UsersStackScreen() {
  const options = useHeaderOptions();
  return (
    <UsersStack.Navigator screenOptions={options}>
      <UsersStack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Users' }}
      />
      <UsersStack.Screen
        name="EditStudentProfile"
        component={EditStudentProfileScreen}
        options={{ title: 'Edit Student' }}
      />
      <UsersStack.Screen
        name="EditInstructorProfile"
        component={EditInstructorProfileScreen}
        options={{ title: 'Edit Instructor' }}
      />
      <UsersStack.Screen
        name="EditAdminProfileFromUsers"
        component={EditAdminProfileScreen}
        options={{ title: 'Edit Admin' }}
      />
    </UsersStack.Navigator>
  );
}

function BookingsStackScreen() {
  const options = useHeaderOptions();
  return (
    <BookingsStack.Navigator screenOptions={options}>
      <BookingsStack.Screen
        name="BookingOversight"
        component={BookingOversightScreen}
        options={{ title: 'Bookings' }}
      />
    </BookingsStack.Navigator>
  );
}

function SettingsStackScreen() {
  const options = useHeaderOptions();
  return (
    <SettingsStack.Navigator screenOptions={options}>
      <SettingsStack.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ title: 'Settings' }}
      />
      <SettingsStack.Screen
        name="EditAdminProfile"
        component={EditAdminProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <SettingsStack.Screen name="DatabaseInterface" options={{ title: 'Database' }}>
        {(props) => (
          <React.Suspense
            fallback={
              <Text style={{ padding: 20, textAlign: 'center' }}>
                Loading Database Interface...
              </Text>
            }
          >
            <DatabaseInterfaceScreen {...props} />
          </React.Suspense>
        )}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────

export default function AdminTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 56 : undefined,
          paddingBottom: Platform.OS === 'web' ? 4 : undefined,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="UsersTab"
        component={UsersStackScreen}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsStackScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
