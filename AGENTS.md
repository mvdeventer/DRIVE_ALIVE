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

### Phase 1: MVP ✅
- [x] User registration & authentication.
- [x] Instructor GPS location & availability.
- [x] Student booking system.
- [x] Payment integration.
- [x] Cancellation policy enforcement.

### Phase 2: Core Features
- [ ] WhatsApp reminders.
- [ ] Push notifications.
- [ ] Instructor/student dashboards.
- [ ] Web support.

### Phase 3: Advanced Features
- [ ] Live lesson tracking.
- [ ] Lesson packages.
- [ ] Certification tracking.
- [ ] Multi-language support.
- [ ] Analytics.

### Phase 4: Admin & Compliance
- [ ] Admin dashboard.
- [ ] POPIA compliance.
- [ ] PCI DSS compliance.

---

## Notes
- Use **React Native + Expo** for cross-platform frontend.
- Use **FastAPI/Django** in Python venv for backend.
- Ensure secure handling of payments and user data.