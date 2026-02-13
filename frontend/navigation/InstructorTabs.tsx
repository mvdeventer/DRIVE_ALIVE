/**
 * Instructor bottom-tab navigator
 *
 * Tabs: Home | Schedule | Earnings | Profile
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { useAuthActions } from './AuthContext';

// Screens
import BookingScreen from '../screens/booking/BookingScreen';
import EarningsReportScreen from '../screens/instructor/EarningsReportScreen';
import EditInstructorProfileScreen from '../screens/instructor/EditInstructorProfileScreen';
import InstructorHomeScreen from '../screens/instructor/InstructorHomeScreen';
import ManageAvailabilityScreen from '../screens/instructor/ManageAvailabilityScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ScheduleStack = createNativeStackNavigator();
const EarningsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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

function HomeStackScreen() {
  const options = useHeaderOptions();
  return (
    <HomeStack.Navigator screenOptions={options}>
      <HomeStack.Screen
        name="InstructorHome"
        component={InstructorHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <HomeStack.Screen
        name="EditInstructorProfile"
        component={EditInstructorProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <HomeStack.Screen
        name="ManageAvailability"
        component={ManageAvailabilityScreen}
        options={{ title: 'Manage Schedule' }}
      />
      <HomeStack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Reschedule Lesson' }}
      />
    </HomeStack.Navigator>
  );
}

function ScheduleStackScreen() {
  const options = useHeaderOptions();
  return (
    <ScheduleStack.Navigator screenOptions={options}>
      <ScheduleStack.Screen
        name="ManageAvailability"
        component={ManageAvailabilityScreen}
        options={{ title: 'Schedule' }}
      />
    </ScheduleStack.Navigator>
  );
}

function EarningsStackScreen() {
  const options = useHeaderOptions();
  return (
    <EarningsStack.Navigator screenOptions={options}>
      <EarningsStack.Screen
        name="EarningsReport"
        component={EarningsReportScreen}
        options={{ title: 'Earnings' }}
      />
    </EarningsStack.Navigator>
  );
}

function ProfileStackScreen() {
  const options = useHeaderOptions();
  return (
    <ProfileStack.Navigator screenOptions={options}>
      <ProfileStack.Screen
        name="EditInstructorProfile"
        component={EditInstructorProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────

export default function InstructorTabs() {
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
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleStackScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsStackScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
