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

  // Development: Use local network IP
  return 'http://10.0.0.121:8000';
};

const API_BASE_URL = getApiUrl();

// Debug configuration
// Set ENABLED to true to pre-fill registration forms for faster testing
// Set to false for production-like behavior (empty forms with placeholders only)
export const DEBUG_CONFIG = {
  ENABLED: true, // Change to true to enable auto-fill in registration forms
  DEFAULT_EMAIL: 'mvdeventer123@gmail.com',
  DEFAULT_PHONE: '+27611154598',
  DEFAULT_PASSWORD: 'Test1234',
  // Student-specific debug values
  STUDENT_EMAIL: 'mvdeventer@lhar.co.za',
  STUDENT_PHONE: '+27611154599',
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
