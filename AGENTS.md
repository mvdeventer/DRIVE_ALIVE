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

### Phase 2: Core Features (IN PROGRESS)

- [x] Login/Logout functionality
- [x] React Native Web support (working)
- [x] Form field tooltips and UX enhancements
- [x] Tab navigation in forms
- [ ] **Student Dashboard** ← CURRENT FOCUS
  - [ ] View upcoming bookings
  - [ ] Browse available instructors
  - [ ] Book new lessons
  - [ ] View booking history
  - [ ] Profile management
- [ ] **Instructor Dashboard** ← CURRENT FOCUS
  - [ ] View upcoming lessons
  - [ ] Manage availability
  - [ ] View student bookings
  - [ ] Earnings overview
  - [ ] Profile management
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
- [ ] POPIA compliance audit
- [ ] PCI DSS compliance certification

---

## Notes

- Use **React Native + Expo** for cross-platform frontend.
- Use **FastAPI/Django** in Python venv for backend.
- Ensure secure handling of payments and user data.
