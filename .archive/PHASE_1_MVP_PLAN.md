# Phase 1: MVP Implementation Plan

## Overview
Build the core functionality for students to book driving lessons with instructors, including authentication, GPS location, booking system, and payment integration.

---

## Phase 1 Features Breakdown

### 1️⃣ User Registration & Authentication ✅

#### Backend Tasks
- [ ] Setup Firebase Admin SDK for token verification
- [ ] Create User model (SQLAlchemy)
  - Fields: id, email, first_name, last_name, phone, user_type, created_at
- [ ] Create authentication middleware
- [ ] Implement `/api/auth/register` endpoint
- [ ] Implement `/api/auth/login` endpoint
- [ ] Implement `/api/auth/refresh-token` endpoint
- [ ] Implement JWT token generation and validation
- [ ] Add phone number verification (optional for MVP)

#### Frontend Tasks
- [ ] Setup Firebase Authentication
- [ ] Create Login screen
- [ ] Create Register screen
- [ ] Create role selection (Student vs Instructor)
- [ ] Implement form validation (Formik + Yup)
- [ ] Store JWT tokens in AsyncStorage
- [ ] Create authenticated navigation flow
- [ ] Add logout functionality

#### Files to Create
**Backend:**
- `backend/app/models/user.py`
- `backend/app/routes/auth.py`
- `backend/app/services/auth_service.py`
- `backend/app/middleware/auth_middleware.py`
- `backend/app/utils/jwt_utils.py`

**Frontend:**
- `frontend/screens/auth/LoginScreen.js`
- `frontend/screens/auth/RegisterScreen.js`
- `frontend/screens/auth/RoleSelectionScreen.js`
- `frontend/services/firebase/authService.js`
- `frontend/services/api/authApi.js`
- `frontend/utils/validation.js`

---

### 2️⃣ Instructor GPS Location & Availability ✅

#### Backend Tasks
- [ ] Create Instructor model (extends User)
  - Fields: license_number, vehicle_type, hourly_rate, rating, location_lat, location_lng, is_available
- [ ] Create Vehicle model
  - Fields: make, model, year, transmission_type, license_plate
- [ ] Create Availability model
  - Fields: instructor_id, day_of_week, start_time, end_time, is_active
- [ ] Implement `/api/instructors` endpoint (list with GPS filtering)
- [ ] Implement `/api/instructors/{id}` endpoint (get details)
- [ ] Implement `/api/instructors/{id}/availability` endpoint
- [ ] Add location-based search (radius filter)
- [ ] Calculate distance between instructor and student

#### Frontend Tasks
- [ ] Request location permissions (expo-location)
- [ ] Get current user location
- [ ] Create instructor list screen with map view
- [ ] Create instructor card component
- [ ] Implement map markers for instructors
- [ ] Create instructor profile screen
- [ ] Display instructor rating and reviews
- [ ] Show distance from student location
- [ ] Filter instructors by distance/price/rating

#### Files to Create
**Backend:**
- `backend/app/models/instructor.py`
- `backend/app/models/vehicle.py`
- `backend/app/models/availability.py`
- `backend/app/routes/instructor.py`
- `backend/app/services/instructor_service.py`
- `backend/app/utils/geo_utils.py`

**Frontend:**
- `frontend/screens/student/InstructorListScreen.js`
- `frontend/screens/student/InstructorProfileScreen.js`
- `frontend/screens/student/MapViewScreen.js`
- `frontend/components/student/InstructorCard.js`
- `frontend/components/common/MapMarker.js`
- `frontend/services/api/instructorApi.js`
- `frontend/utils/location.js`

---

### 3️⃣ Student Booking System ✅

#### Backend Tasks
- [ ] Create Booking model
  - Fields: student_id, instructor_id, booking_date, start_time, duration, status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, total_price
- [ ] Create BookingStatus enum (pending, confirmed, cancelled, completed)
- [ ] Implement `/api/bookings` endpoint (create booking)
- [ ] Implement `/api/bookings/my-bookings` endpoint (list user bookings)
- [ ] Implement `/api/bookings/{id}` endpoint (get booking details)
- [ ] Implement `/api/bookings/{id}/cancel` endpoint
- [ ] Add booking validation (check instructor availability)
- [ ] Prevent double-booking
- [ ] Send booking confirmation (email/notification)

#### Frontend Tasks
- [ ] Create booking screen with date/time picker
- [ ] Show instructor availability calendar
- [ ] Implement location picker for pickup/dropoff
- [ ] Calculate estimated price
- [ ] Create booking confirmation screen
- [ ] Display booking history
- [ ] Show booking status (pending/confirmed/completed)
- [ ] Implement booking cancellation
- [ ] Add booking details screen

#### Files to Create
**Backend:**
- `backend/app/models/booking.py`
- `backend/app/routes/booking.py`
- `backend/app/services/booking_service.py`
- `backend/app/utils/booking_validator.py`

**Frontend:**
- `frontend/screens/student/BookingScreen.js`
- `frontend/screens/student/BookingHistoryScreen.js`
- `frontend/screens/student/BookingDetailsScreen.js`
- `frontend/components/student/DateTimePicker.js`
- `frontend/components/student/LocationPicker.js`
- `frontend/services/api/bookingApi.js`

---

### 4️⃣ Payment Integration ✅

#### Backend Tasks
- [ ] Setup Stripe/PayFast API keys
- [ ] Create Payment model
  - Fields: booking_id, amount, currency, status, payment_method, stripe_payment_id
- [ ] Implement `/api/payments/create-intent` endpoint
- [ ] Implement `/api/payments/confirm` endpoint
- [ ] Implement `/api/payments/refund` endpoint (for cancellations)
- [ ] Setup webhook handler for payment events
- [ ] Verify webhook signatures
- [ ] Update booking status on payment success
- [ ] Handle failed payments

#### Frontend Tasks
- [ ] Setup Stripe React Native SDK
- [ ] Create payment screen
- [ ] Implement card input form
- [ ] Show payment amount breakdown
- [ ] Handle payment confirmation
- [ ] Display payment success/failure
- [ ] Store payment method for future use
- [ ] Show payment history

#### Files to Create
**Backend:**
- `backend/app/models/payment.py`
- `backend/app/routes/payment.py`
- `backend/app/services/payment_service.py`
- `backend/app/routes/webhooks.py`

**Frontend:**
- `frontend/screens/payment/PaymentScreen.js`
- `frontend/screens/payment/PaymentSuccessScreen.js`
- `frontend/screens/payment/PaymentHistoryScreen.js`
- `frontend/components/payment/CardInput.js`
- `frontend/services/api/paymentApi.js`

---

### 5️⃣ Cancellation Policy Enforcement ✅

#### Backend Tasks
- [ ] Define cancellation rules (e.g., 24 hours before = full refund)
- [ ] Create CancellationPolicy model
- [ ] Implement cancellation fee calculation
- [ ] Add cancellation reason tracking
- [ ] Implement partial refunds
- [ ] Send cancellation notifications
- [ ] Update instructor availability on cancellation

#### Frontend Tasks
- [ ] Display cancellation policy on booking screen
- [ ] Show refund amount before cancellation
- [ ] Add cancellation reason dropdown
- [ ] Confirm cancellation with user
- [ ] Display cancellation confirmation

#### Files to Create
**Backend:**
- `backend/app/models/cancellation_policy.py`
- `backend/app/services/cancellation_service.py`

**Frontend:**
- `frontend/screens/student/CancelBookingScreen.js`
- `frontend/components/student/CancellationPolicy.js`

---

## Database Schema (Phase 1)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    user_type VARCHAR(20) CHECK (user_type IN ('student', 'instructor')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instructors table
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE,
    vehicle_type VARCHAR(50),
    hourly_rate DECIMAL(10, 2),
    rating DECIMAL(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    transmission_type VARCHAR(20) CHECK (transmission_type IN ('manual', 'automatic')),
    license_plate VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Availability table
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_address TEXT,
    dropoff_lat DECIMAL(10, 8),
    dropoff_lng DECIMAL(11, 8),
    dropoff_address TEXT,
    total_price DECIMAL(10, 2),
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_id VARCHAR(255),
    payfast_payment_id VARCHAR(255),
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_instructors_user_id ON instructors(user_id);
CREATE INDEX idx_instructors_location ON instructors(location_lat, location_lng);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_instructor ON bookings(instructor_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_payments_booking ON payments(booking_id);
```

---

## API Endpoints (Phase 1)

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/logout            - Logout user
GET    /api/auth/me                - Get current user profile
```

### Instructors
```
GET    /api/instructors            - List instructors (with GPS filtering)
GET    /api/instructors/{id}       - Get instructor details
GET    /api/instructors/{id}/availability - Get instructor availability
GET    /api/instructors/{id}/reviews      - Get instructor reviews
```

### Bookings
```
POST   /api/bookings               - Create booking
GET    /api/bookings/my-bookings   - List user bookings
GET    /api/bookings/{id}          - Get booking details
PUT    /api/bookings/{id}          - Update booking
POST   /api/bookings/{id}/cancel   - Cancel booking
```

### Payments
```
POST   /api/payments/create-intent - Create payment intent (Stripe)
POST   /api/payments/confirm       - Confirm payment
POST   /api/payments/refund        - Process refund
GET    /api/payments/history       - Get payment history
POST   /api/webhooks/stripe        - Stripe webhook handler
POST   /api/webhooks/payfast       - PayFast webhook handler
```

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. ✅ Run `python complete_setup.py`
2. ✅ Setup backend virtual environment
3. ✅ Setup frontend dependencies
4. ✅ Configure Firebase project
5. ✅ Setup PostgreSQL database
6. ✅ Run database migrations (Alembic)
7. ✅ Test FastAPI server
8. ✅ Test Expo app

### Week 2: Authentication
1. Implement User model and database
2. Create authentication routes
3. Setup Firebase Admin SDK
4. Build login/register screens
5. Test authentication flow end-to-end

### Week 3: Instructor Features
1. Create Instructor, Vehicle, Availability models
2. Implement instructor listing API
3. Build instructor list screen with map
4. Add GPS location functionality
5. Test location-based search

### Week 4: Booking System
1. Create Booking model
2. Implement booking creation API
3. Build booking screen with date/time picker
4. Add availability checking
5. Test booking flow

### Week 5: Payment Integration
1. Setup Stripe/PayFast accounts
2. Create Payment model
3. Implement payment routes
4. Build payment screen with card input
5. Setup webhook handlers
6. Test payment flow end-to-end

### Week 6: Polish & Testing
1. Implement cancellation policy
2. Add error handling throughout
3. Write unit tests (backend)
4. Write integration tests
5. Test on real devices
6. Fix bugs and optimize

---

## Environment Variables Needed

Add to `config/.env`:

```bash
# Firebase
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/drivealive

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# PayFast (South African payments)
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_SANDBOX=True

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

---

## Testing Checklist

### Authentication
- [ ] User can register as student
- [ ] User can register as instructor
- [ ] User can login with email/password
- [ ] Invalid credentials return error
- [ ] JWT token is generated and stored
- [ ] Token refresh works
- [ ] Logout clears token

### Instructor Features
- [ ] Instructors appear on map
- [ ] Location permission is requested
- [ ] Distance calculation is accurate
- [ ] Instructor profile shows all details
- [ ] Availability is displayed correctly
- [ ] Filtering by distance works

### Booking System
- [ ] Student can create booking
- [ ] Date/time picker works
- [ ] Location picker works
- [ ] Availability is checked
- [ ] Double-booking is prevented
- [ ] Booking appears in history
- [ ] Booking details are correct

### Payments
- [ ] Payment intent is created
- [ ] Card input works
- [ ] Payment processes successfully
- [ ] Webhook updates booking status
- [ ] Failed payment shows error
- [ ] Refunds work for cancellations

### Cancellation
- [ ] Policy is displayed
- [ ] Refund amount is calculated correctly
- [ ] Cancellation reason is captured
- [ ] Booking status updates
- [ ] Instructor availability updates

---

## Success Criteria

Phase 1 MVP is complete when:

✅ Students can register and login
✅ Students can see instructors on map with GPS location
✅ Students can view instructor profiles and availability
✅ Students can book lessons with date/time/location
✅ Students can pay for lessons via Stripe/PayFast
✅ Cancellation policy is enforced with refunds
✅ All critical bugs are fixed
✅ App runs on iOS, Android, and Web
✅ Backend API is documented and tested
✅ Code is clean and follows standards

---

## Next Phase Preview

After Phase 1 MVP, we'll add:
- WhatsApp reminders (Twilio)
- Push notifications (Expo)
- Instructor/student dashboards
- Lesson tracking
- Reviews and ratings

---

**Let's build this! Start with `python complete_setup.py` 🚀**

Last Updated: 2025-12-11 | Phase: 1 - MVP
