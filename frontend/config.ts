/**
 * API Configuration
 */

// Detect if running on web or mobile
const isWeb = typeof window !== 'undefined' && window.document;

// Detect if we're accessing from localhost or network IP
const isLocalhost =
  isWeb && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Change this to your backend URL
// Use local IP address (10.0.0.121) for mobile devices on same network
// Use localhost only when accessing from localhost, otherwise use IP
const API_BASE_URL = isWeb
  ? isLocalhost
    ? 'http://localhost:8000'
    : 'http://10.0.0.121:8000'
  : __DEV__
    ? 'http://10.0.0.121:8000'
    : 'https://your-production-api.com';

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

// OpenCage Geocoding API Configuration
// Free tier: 2,500 requests/day (no credit card required)
// Sign up at: https://opencagedata.com/users/sign_up
export const OPENCAGE_API_KEY = 'YOUR_OPENCAGE_API_KEY'; // Replace with your API key

// Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: 'your-api-key',
  authDomain: 'your-app.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-app.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
};
