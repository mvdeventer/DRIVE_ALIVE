/**
 * Student bottom-tab navigator
 *
 * Tabs: Home | Instructors | Profile
 * Each tab wraps a native-stack for proper header + back-button handling.
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
import EditStudentProfileScreen from '../screens/student/EditStudentProfileScreen';
import InstructorListScreen from '../screens/student/InstructorListScreen';
import StudentHomeScreen from '../screens/student/StudentHomeScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const FindStack = createNativeStackNavigator();
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
        name="StudentHome"
        component={StudentHomeScreen}
        options={{ title: 'Home' }}
      />
    </HomeStack.Navigator>
  );
}

function FindStackScreen() {
  const options = useHeaderOptions();
  return (
    <FindStack.Navigator screenOptions={options}>
      <FindStack.Screen
        name="InstructorList"
        component={InstructorListScreen}
        options={{ title: 'Find Instructors' }}
      />
      <FindStack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Book Lesson' }}
      />
    </FindStack.Navigator>
  );
}

function ProfileStackScreen() {
  const options = useHeaderOptions();
  return (
    <ProfileStack.Navigator screenOptions={options}>
      <ProfileStack.Screen
        name="EditStudentProfile"
        component={EditStudentProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────

export default function StudentTabs() {
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
        name="FindTab"
        component={FindStackScreen}
        options={{
          tabBarLabel: 'Instructors',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
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
