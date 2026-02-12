/**
 * API Configuration
 */

// Detect if running on web or mobile
const isWeb = typeof window !== 'undefined' && window.document;

// API Base URL - Use environment variable in production, local IP in development
const getApiUrl = () => {
  // Production: Use environment variable
  if (!__DEV__ && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Development: Use localhost for web, network IP for mobile
  //if (isWeb) {
  //  return 'http://localhost:8000';
  //}
  
  // Mobile development: Use local network IP (update if needed)
  return 'http://10.0.0.121:8000';
};

export const API_BASE_URL = getApiUrl();

// Debug configuration
// Set ENABLED to true to pre-fill registration forms for faster testing
// Set to false for production-like behavior (empty forms with placeholders only)
// Configure via environment variables in .env file (NOT committed to git)
export const DEBUG_CONFIG = {
  ENABLED: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true' && __DEV__, // Only in development
  DEFAULT_EMAIL: process.env.EXPO_PUBLIC_DEBUG_EMAIL || '',
  DEFAULT_PHONE: process.env.EXPO_PUBLIC_DEBUG_PHONE || '',
  DEFAULT_PASSWORD: process.env.EXPO_PUBLIC_DEBUG_PASSWORD || '',
  // Student-specific debug values
  STUDENT_EMAIL: process.env.EXPO_PUBLIC_DEBUG_STUDENT_EMAIL || '',
  STUDENT_PHONE: process.env.EXPO_PUBLIC_DEBUG_STUDENT_PHONE || '',
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER_STUDENT: '/auth/register/student',
    REGISTER_INSTRUCTOR: '/auth/register/instructor',
    ME: '/auth/me',

    // Instructors
    INSTRUCTORS: '/instructors',
    INSTRUCTOR_LOCATION: '/instructors/me/location',

    // Bookings
    BOOKINGS: '/bookings',
    BOOKING_CANCEL: (id: number) => `/bookings/${id}/cancel`,
    BOOKING_CONFIRM: (id: number) => `/bookings/${id}/confirm`,

    // Payments
    STRIPE_PAYMENT_INTENT: '/payments/stripe/create-payment-intent',
    PAYFAST_PAYMENT: '/payments/payfast/create-payment',
  },
};

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_stripe_publishable_key';

// Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: 'your-api-key',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-app.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
};
