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
  if (isWeb) {
    return 'http://localhost:8000';
  }
  
  // Mobile development: Use EXPO_PUBLIC_API_URL if set, otherwise localhost
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

// Debug configuration — only active when EXPO_PUBLIC_DEBUG_MODE=true AND __DEV__.
// Set values in frontend/.env (git-ignored). Never hard-code secrets here.
export const DEBUG_CONFIG = {
  ENABLED: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true' && __DEV__,

  // ── Admin / personal ──────────────────────────────────────────────────────
  DEFAULT_EMAIL:    process.env.EXPO_PUBLIC_DEBUG_EMAIL    || '',
  DEFAULT_PHONE:    process.env.EXPO_PUBLIC_DEBUG_PHONE    || '',
  DEFAULT_PASSWORD: process.env.EXPO_PUBLIC_DEBUG_PASSWORD || '',
  ADMIN_FIRST_NAME: process.env.EXPO_PUBLIC_DEBUG_ADMIN_FIRST_NAME || '',
  ADMIN_LAST_NAME:  process.env.EXPO_PUBLIC_DEBUG_ADMIN_LAST_NAME  || '',
  ADMIN_ID_NUMBER:  process.env.EXPO_PUBLIC_DEBUG_ADMIN_ID_NUMBER  || '',
  ADMIN_ADDRESS:    process.env.EXPO_PUBLIC_DEBUG_ADMIN_ADDRESS    || '',

  // ── Student-specific ──────────────────────────────────────────────────────
  STUDENT_EMAIL: process.env.EXPO_PUBLIC_DEBUG_STUDENT_EMAIL || '',
  STUDENT_PHONE: process.env.EXPO_PUBLIC_DEBUG_STUDENT_PHONE || '',

  // ── SMTP / email ──────────────────────────────────────────────────────────
  SMTP_EMAIL:    process.env.EXPO_PUBLIC_DEBUG_SMTP_EMAIL    || '',
  SMTP_PASSWORD: process.env.EXPO_PUBLIC_DEBUG_SMTP_PASSWORD || '',

  // ── Twilio / WhatsApp ─────────────────────────────────────────────────────
  TWILIO_ACCOUNT_SID:  process.env.EXPO_PUBLIC_DEBUG_TWILIO_SID          || '',
  TWILIO_AUTH_TOKEN:   process.env.EXPO_PUBLIC_DEBUG_TWILIO_TOKEN         || '',
  TWILIO_SENDER_PHONE: process.env.EXPO_PUBLIC_DEBUG_TWILIO_SENDER_PHONE  || '',
  TWILIO_TEST_PHONE:   process.env.EXPO_PUBLIC_DEBUG_TWILIO_TEST_PHONE    || '',
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
// Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env / Render dashboard.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Firebase Configuration
// Set EXPO_PUBLIC_FIREBASE_* variables in your .env / Render dashboard.
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};
