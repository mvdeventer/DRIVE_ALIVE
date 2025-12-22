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

### Phase 2: Core Features

- [x] Login/Logout functionality
- [x] React Native Web support (working)
- [x] Form field tooltips and UX enhancements
- [x] Tab navigation in forms
- [x] **Student Dashboard** ✅
  - [x] View upcoming bookings
  - [x] Browse available instructors
  - [x] Book new lessons
  - [x] View booking history
  - [x] Profile management (full editing)
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
  - [x] Booking conflict prevention
  - [x] 15-minute interval slot generation
  - [x] Real-time availability checking
  - [x] Scrollable time picker UI (15-min intervals)
  - [x] Calendar date picker for time-off
- [ ] WhatsApp reminders
- [ ] Push notifications

### Phase 3: Advanced Features

- [ ] GPS pickup/drop-off (expo-location, react-native-maps)
- [ ] Live lesson tracking
- [ ] Lesson packages
- [ ] Certification tracking
- [ ] Multi-language support
- [ ] Analytics dashboard

### Phase 4: Admin & Compliance

- [ ] Admin dashboard
  - [ ] Manual instructor verification system
  - [ ] User management (activate/deactivate accounts)
  - [ ] Booking oversight and conflict resolution
  - [ ] Revenue and analytics reporting
- [ ] POPIA compliance audit
- [ ] PCI DSS compliance certification

---

## Notes

- Use **React Native + Expo** for cross-platform frontend.
- Use **FastAPI/Django** in Python venv for backend.
- Ensure secure handling of payments and user data.
- **Development Mode**: Instructors are auto-verified on registration for testing.
- **Production Mode**: Will require admin dashboard for manual verification.
