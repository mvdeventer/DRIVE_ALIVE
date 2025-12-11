/**
 * Main App Component
 */
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterStudentScreen from './screens/auth/RegisterStudentScreen';
import RegisterInstructorScreen from './screens/auth/RegisterInstructorScreen';
import RegisterChoiceScreen from './screens/auth/RegisterChoiceScreen';

// Student Screens
import StudentHomeScreen from './screens/student/StudentHomeScreen';
import InstructorListScreen from './screens/student/InstructorListScreen';
import BookingScreen from './screens/booking/BookingScreen';

// Instructor Screens
import InstructorHomeScreen from './screens/instructor/InstructorHomeScreen';

// Payment Screens
import PaymentScreen from './screens/payment/PaymentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
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
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ title: 'Login' }}
              />
              <Stack.Screen 
                name="RegisterChoice" 
                component={RegisterChoiceScreen}
                options={{ title: 'Choose Account Type' }}
              />
              <Stack.Screen 
                name="RegisterStudent" 
                component={RegisterStudentScreen}
                options={{ title: 'Register as Student' }}
              />
              <Stack.Screen 
                name="RegisterInstructor" 
                component={RegisterInstructorScreen}
                options={{ title: 'Register as Instructor' }}
              />
            </>
          ) : (
            // Main App Stack
            <>
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
                name="InstructorHome" 
                component={InstructorHomeScreen}
                options={{ title: 'Instructor Dashboard' }}
              />
              <Stack.Screen 
                name="Payment" 
                component={PaymentScreen}
                options={{ title: 'Payment' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
