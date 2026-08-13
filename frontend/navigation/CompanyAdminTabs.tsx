/**
 * Company administrator bottom-tab navigator.
 *
 * Tabs: Dashboard | Instructors | Pricing | Billing
 *
 * The billing statement gains its own tab once the charge ledger exists.
 *
 * Modelled on AdminTabs.tsx; the header options behave identically.
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useResponsiveTabBar } from '../hooks/useResponsiveTabBar';
import { useT } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAuthActions } from './AuthContext';

import CreateUserScreen from '../screens/admin/CreateUserScreen';
import CompanyAdminHomeScreen from '../screens/company/CompanyAdminHomeScreen';
import CompanyLearnersScreen from '../screens/company/CompanyLearnersScreen';
import CompanyPricingScreen from '../screens/company/CompanyPricingScreen';
import CompanyRosterScreen from '../screens/company/CompanyRosterScreen';
import CompanyStatementScreen from '../screens/company/CompanyStatementScreen';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const PricingStack = createNativeStackNavigator();
const RosterStack = createNativeStackNavigator();
const BillingStack = createNativeStackNavigator();

// ─── Shared header options hook ────────────────────────────

function useHeaderOptions() {
  const { colors } = useTheme();
  const t = useT();
  const { onLogout, userName, companyName } = useAuthActions();

  return ({ navigation }: any) => ({
    headerStyle: { backgroundColor: colors.headerBackground },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: 'bold' as const, fontFamily: 'Inter_700Bold' },
    headerBackTitle: 'Back',
    // Native has no persistent top bar, and `headerLeft` gives way to the back
    // button on nested screens — so the school goes under the title, where it
    // survives every push.
    // Native only: on web the fixed GlobalTopBar already names the school on
    // every screen, and a second copy under the title just repeats itself.
    headerTitle: companyName && Platform.OS !== 'web'
      ? ({ children }: any) => (
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: colors.headerText,
                fontFamily: 'Inter_700Bold',
                fontSize: 17,
              }}
              numberOfLines={1}
            >
              {children}
            </Text>
            <Text
              style={{
                color: colors.headerText,
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                opacity: 0.9,
              }}
              numberOfLines={1}
            >
              {companyName}
            </Text>
          </View>
        )
      : undefined,
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
              {companyName || userName}
            </Text>
          )
        : undefined,
    headerRight:
      Platform.OS !== 'web'
        ? () => (
            <Pressable
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel={t('common.logout')}
              hitSlop={8}
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
                {t('common.logout')}
              </Text>
            </Pressable>
          )
        : undefined,
  });
}

// ─── Stacks ────────────────────────────────────────────────

function DashboardStackScreen() {
  const headerOptions = useHeaderOptions();
  const t = useT();

  return (
    <DashboardStack.Navigator screenOptions={headerOptions}>
      <DashboardStack.Screen
        name="CompanyAdminHome"
        component={CompanyAdminHomeScreen}
        options={{ title: t('nav.dashboard') }}
      />
    </DashboardStack.Navigator>
  );
}

function PricingStackScreen() {
  const headerOptions = useHeaderOptions();
  const t = useT();

  return (
    <PricingStack.Navigator screenOptions={headerOptions}>
      <PricingStack.Screen
        name="CompanyPricing"
        component={CompanyPricingScreen}
        options={{ title: t('nav.pricing') }}
      />
    </PricingStack.Navigator>
  );
}

function RosterStackScreen() {
  const headerOptions = useHeaderOptions();
  const t = useT();

  return (
    <RosterStack.Navigator screenOptions={headerOptions}>
      <RosterStack.Screen
        name="CompanyRoster"
        component={CompanyRosterScreen}
        options={{ title: t('nav.instructors') }}
      />
      {/* Signing up a learner the school brought itself. The same form the
          platform operator uses, scoped so it can only create learners and
          only for this school. */}
      {/* The learners this school signed up, and the fallback for one who never
          received their verification link. */}
      <RosterStack.Screen
        name="CompanyLearners"
        component={CompanyLearnersScreen}
        options={{ title: t('nav.learners') }}
      />
      <RosterStack.Screen
        name="EnrolLearner"
        component={CreateUserScreen}
        initialParams={{ scope: 'company' }}
        options={{ title: t('createUser.enrolTitle') }}
      />
    </RosterStack.Navigator>
  );
}

function BillingStackScreen() {
  const headerOptions = useHeaderOptions();
  const t = useT();

  return (
    <BillingStack.Navigator screenOptions={headerOptions}>
      <BillingStack.Screen
        name="CompanyStatement"
        component={CompanyStatementScreen}
        options={{ title: t('nav.billing') }}
      />
    </BillingStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────

export default function CompanyAdminTabs() {
  const { colors } = useTheme();
  const t = useT();
  const { tabBarPosition, tabBarStyle } = useResponsiveTabBar(colors);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarPosition,
        tabBarStyle,
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
          tabBarLabel: t('nav.dashboard'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="RosterTab"
        component={RosterStackScreen}
        options={{
          tabBarLabel: t('nav.instructors'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="PricingTab"
        component={PricingStackScreen}
        options={{
          tabBarLabel: t('nav.pricing'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'pricetag' : 'pricetag-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="BillingTab"
        component={BillingStackScreen}
        options={{
          tabBarLabel: t('nav.billing'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
