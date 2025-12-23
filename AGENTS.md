# Driving School Booking App – AGENTS.md

## Purpose

Cross-platform app for South African driving schools. Instructors register, students book lessons,
payments handled in-app, GPS pickup/drop-off, WhatsApp reminders, and compliance with POPIA/PCI DSS.

---

## Roles & Responsibilities

### Frontend Team

- Build React Native + Expo mobile app.
- Implement GPS pickup/drop-off (expo-location, react-native-maps).
- Integrate payment UI (Stripe/PayFast).
- Add push notifications & WhatsApp reminders.
- Ensure responsive design for React Native Web.

### Backend Team

- Setup FastAPI/Django in Python venv.
- Implement authentication (Firebase/Supabase).
- Create booking & cancellation APIs.
- Integrate payment gateways (Stripe, PayFast).
- Handle WhatsApp Business API messaging.
- Build admin dashboard APIs.

### DevOps Team

- Setup CI/CD pipelines.
- Containerize backend (Docker).
- Deploy frontend (Expo EAS, web hosting).
- Monitor compliance (POPIA, PCI DSS).

---

## Todo List by Priority

### Phase 1: Authentication & Core Backend ✅

- [x] User registration (Instructor + Student with form validation)
- [x] Authentication system (OAuth2 JWT, email/phone login)
- [x] Debug mode with pre-filled credentials
- [x] Database clearing functionality
- [x] Duplicate ID number error handling
- [x] Backend API endpoints:
  - [x] Auth routes (register, login, token refresh)
  - [x] Booking routes (create, update, cancel, list)
  - [x] Payment routes (Stripe, PayFast integration)
  - [x] Instructor routes (profile, availability)

### Phase 2: Core Features ✅

- [x] Login/Logout functionality
- [x] React Native Web support (working)
- [x] Form field tooltips and UX enhancements
- [x] Tab navigation in forms
- [x] Phone number normalization (supports local 0-prefix format)
- [x] **Student Dashboard** ✅
  - [x] View upcoming bookings
  - [x] Browse available instructors
  - [x] Book new lessons
  - [x] View booking history
  - [x] Profile management (full editing)
  - [x] **Rating System** ✅
    - [x] Rate completed lessons (1-5 stars with emoji feedback)
    - [x] Timezone-aware validation (SAST UTC+2)
    - [x] Prevent rating future lessons
    - [x] Update instructor average ratings
    - [x] Extended error message visibility (5s)
- [x] **Instructor Dashboard** ✅
  - [x] View upcoming lessons
  - [x] Manage availability
  - [x] View student bookings
  - [x] Earnings overview
  - [x] Profile management (full editing)
- [x] **Profile Editing** ✅
  - [x] Edit all registration fields (instructors)
  - [x] Edit all registration fields (students)
  - [x] Password change functionality
  - [x] Location selector integration
- [x] **Instructor Discovery** ✅
  - [x] List all registered & verified instructors
  - [x] Search by name, vehicle, city, suburb, province
  - [x] Filter by availability and city
  - [x] Sort alphabetically by suburb
  - [x] Auto-verify instructors on registration (dev mode)
- [x] **Calendar & Scheduling System** ✅
  - [x] Instructor weekly schedule management
  - [x] Time off/unavailability blocking
  - [x] Custom availability for specific dates
  - [x] Student time slot selection (shows only available slots)
  - [x] **Booking Conflict Detection** ✅
    - [x] Real-time conflict checking across ALL instructors
    - [x] Color-coded slots (red: different instructor, purple: same instructor, yellow: booked by others)
    - [x] Detailed conflict messages with instructor names and times
    - [x] Prevent overlapping bookings
    - [x] Navigate users to Student Home to cancel conflicting lessons
  - [x] 15-minute interval slot generation
  - [x] Real-time availability checking
  - [x] Scrollable time picker UI (15-min intervals)
  - [x] Calendar date picker for time-off
- [x] **Error Handling & UX** ✅
  - [x] Inline messages with auto-dismiss
  - [x] Auto-scroll to top on errors
  - [x] Field-specific error messages with actual values
  - [x] Atomic database transactions (prevent orphaned records)
  - [x] Timezone-aware datetime handling throughout backend
  - [x] Fixed deprecated shadow\* style props (replaced with boxShadow)
- [ ] WhatsApp reminders
- [ ] Push notifications

### Phase 3: Advanced Features

- [ ] GPS pickup/drop-off (expo-location, react-native-maps)
- [ ] Live lesson tracking
- [ ] Lesson packages
- [ ] Certification tracking
- [ ] Multi-language support
- [ ] Analytics dashboard

### Phase 4: Admin & Compliance ✅

- [x] Admin dashboard ✅
  - [x] Manual instructor verification system ✅
  - [x] User management (activate/deactivate accounts) ✅
  - [x] Booking oversight and conflict resolution ✅
  - [x] Revenue and analytics reporting ✅
  - [x] Admin statistics and overview ✅
  - [x] Admin role-based access control ✅
  - [x] Admin middleware for authorization ✅
- [x] POPIA compliance documentation ✅
- [x] PCI DSS compliance documentation ✅

---

## Notes

- Use **React Native + Expo** for cross-platform frontend.
- Use **FastAPI/Django** in Python venv for backend.
- Ensure secure handling of payments and user data.
- **Development Mode**: Instructors are auto-verified on registration for testing.
- **Production Mode**: Will require admin dashboard for manual verification.

## Recent Updates (Dec 23, 2025)

### Timezone & Rating System

- ✅ Fixed timezone handling throughout backend (SAST UTC+2 support)
- ✅ Converted all `datetime.utcnow()` to timezone-aware `datetime.now(timezone.utc)`
- ✅ Rating system now properly validates past vs future lessons
- ✅ Students can rate completed lessons with 1-5 stars and emoji feedback
- ✅ Instructor average ratings automatically recalculated

### Booking Conflict Detection

- ✅ Enhanced conflict detection across ALL instructors (not just current)
- ✅ Fixed `/my-bookings` endpoint to include `instructor_id` for proper conflict comparison
- ✅ Color-coded time slots:
  - **Red**: Conflict with different instructor
  - **Purple**: Conflict with same instructor
  - **Yellow**: Booked by another student
- ✅ Detailed error messages show instructor name, date, time, and navigation guidance

### Error Handling & Code Quality

- ✅ Inline messages with auto-dismiss (4-5s) and auto-scroll
- ✅ Field-specific error messages showing actual duplicate values
- ✅ Atomic database transactions preventing orphaned user records
- ✅ Fixed deprecated `shadow*` style props (replaced with `boxShadow`)
- ✅ Phone number normalization (accepts both +27 and 0 prefix formats)

### API Enhancements

- ✅ `/bookings/my-bookings` endpoint returns full instructor details
- ✅ Review creation endpoint validates booking completion and timezone
- ✅ All datetime comparisons now timezone-aware (preventing comparison errors)

## Recent Updates (Dec 23, 2025 - Phase 4)

### Admin Dashboard Implementation

- ✅ **Backend Infrastructure** ✅

  - Created admin middleware with role-based access control
  - Implemented comprehensive admin routes with 15+ endpoints
  - Added admin statistics aggregation
  - Built instructor verification system
  - Created user management endpoints (activate/deactivate/suspend)
  - Developed booking oversight functionality
  - Implemented revenue analytics with top instructors tracking
  - Added admin creation endpoint (admin-only)

- ✅ **Frontend Admin Screens** ✅

  - AdminDashboardScreen with system overview and quick actions
  - InstructorVerificationScreen for approving/rejecting instructors
  - UserManagementScreen with filtering and status management
  - BookingOversightScreen with cancellation capabilities
  - RevenueAnalyticsScreen with financial metrics and top performers
  - Fully responsive design with consistent styling
  - Real-time data refresh and pull-to-refresh

- ✅ **Admin Features** ✅
  - System statistics (users, bookings, revenue)
  - Instructor verification workflow (approve/reject)
  - User status management (active/inactive/suspended)
  - Booking conflict resolution
  - Revenue tracking and analytics
  - Top instructor leaderboard
  - Admin user creation (requires existing admin)
  - Role-based access control throughout

### Compliance Documentation

- ✅ **POPIA Compliance** ✅

  - Comprehensive compliance guide created
  - 8 core principles documented with implementation status
  - Data collection and processing documented
  - User rights implementation plan
  - Security safeguards documented
  - Privacy notice template provided
  - Compliance checklist created
  - Information Officer requirements outlined

- ✅ **PCI DSS Compliance** ✅
  - Complete PCI DSS guide for SAQ A compliance
  - All 12 requirements documented
  - Payment processor integration validated
  - No cardholder data storage (SAQ A eligible)
  - HTTPS/TLS encryption enforced
  - Security best practices implemented
  - Annual compliance process documented
  - Incident response plan outlined

### Security Enhancements

- ✅ Admin middleware with require_admin dependency
- ✅ Role-based endpoint protection
- ✅ Secure payment processing (Stripe/PayFast)
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Input validation throughout API
- ✅ SQL injection prevention (SQLAlchemy ORM)

### API Additions

**Admin Endpoints:**

- `POST /admin/create` - Create new admin user
- `GET /admin/stats` - System statistics
- `GET /admin/instructors/pending-verification` - Pending instructors
- `POST /admin/instructors/{id}/verify` - Verify/reject instructor
- `GET /admin/users` - List all users with filters
- `PUT /admin/users/{id}/status` - Update user status
- `GET /admin/bookings` - All bookings with filters
- `DELETE /admin/bookings/{id}` - Cancel booking (admin)
- `GET /admin/revenue/stats` - Revenue statistics
- `GET /admin/revenue/by-instructor/{id}` - Instructor revenue

**Frontend API Methods:**

- `getAdminStats()` - Fetch system statistics
- `getPendingInstructors()` - Get pending verifications
- `verifyInstructor()` - Approve/reject instructor
- `getAllUsers()` - List users with filters
- `updateUserStatus()` - Change user status
- `getAllBookingsAdmin()` - Admin booking overview
- `cancelBookingAdmin()` - Cancel any booking
- `getRevenueStats()` - Revenue analytics
- `getInstructorRevenue()` - Per-instructor revenue
- `createAdmin()` - Create new admin account
