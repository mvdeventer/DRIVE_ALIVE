/**
 * API Configuration
 */

// Detect if running on web or mobile
const isWeb = typeof window !== 'undefined' && window.document;

// Change this to your backend URL
const API_BASE_URL = isWeb
  ? 'http://localhost:8000'
  : __DEV__
  ? 'http://localhost:8000'
  : 'https://your-production-api.com';

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
