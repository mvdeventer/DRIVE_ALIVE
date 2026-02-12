# RoadReady UI Modernization & Rebrand Plan

## Overview
Rename "Drive Alive" / "Driving School" to **RoadReady**, replace ad-hoc `StyleSheet.create()` (48 files, hardcoded colors) with **NativeWind v4 (Tailwind CSS)**, introduce **Deep Teal + Amber** color scheme with **light + dark mode**, and modernize all 35 screens + 13 components.

---

## Phase 0: Rebrand — App Identity ✅

- [x] Rename in `frontend/app.json`: name → "RoadReady", slug → "roadready", version → 3.0.0
- [x] Update deep link domain in `frontend/App.tsx` (drivealive → roadready)
- [x] Update `frontend/components/AddressAutocomplete.tsx` — User-Agent & app name refs
- [x] Update `frontend/cypress.json` — test config names
- [x] Update `frontend/screens/admin/DatabaseInterfaceScreen.tsx` — export branding/filenames
- [x] Update `frontend/screens/admin/AdminDashboardScreen.tsx` — backup filenames
- [x] Update `frontend/screens/student/InstructorListScreen.tsx` — WhatsApp message
- [x] Update `frontend/screens/instructor/EarningsReportScreen.tsx` — PDF/Excel export branding
- [x] Update backend `app/__init__.py` — package description + version
- [x] Update backend `app/main.py` — startup banner + CORS domain
- [x] Update backend `app/config.py` — FROM_EMAIL domain
- [x] Update backend `app/services/email_service.py` — all email templates
- [x] Update backend `app/services/whatsapp_service.py` — all WhatsApp templates
- [x] Update backend `app/routes/database.py` — backup filename
- [x] Update backend `app/routes/verification.py` — WhatsApp test message
- [x] Replace app icon assets (icon.png, adaptive-icon.png, favicon.png) — "RR" monogram in teal ✅
- [x] Replace splash screen (splash.png) — RoadReady logo on teal gradient ✅

## Phase 1: Foundation — NativeWind + Theme System

- [x] Install NativeWind v4 + Tailwind CSS 3.4
- [x] Create `frontend/tailwind.config.js` with custom theme tokens
- [x] Create `frontend/global.css` with Tailwind directives + dark mode CSS vars
- [x] Update `frontend/babel.config.js` — add `nativewind/babel` preset
- [x] Create `frontend/metro.config.js` — wrap with `withNativeWind()`
- [x] Add TypeScript reference for NativeWind types (`nativewind-env.d.ts`)
- [x] Install + load Inter font (Google Fonts) via `@expo-google-fonts/inter`
- [x] Create `frontend/theme/ThemeContext.tsx` — ThemeProvider with light/dark + system detection
- [x] Wrap App.tsx with ThemeProvider + font loading
- [x] Update App.tsx header color from `#007AFF` to `#0D9488` (teal)
- [x] Update `GlobalTopBar.tsx` role colors to match new palette
- [x] Update `WebNavigationHeader.tsx` from blue to teal

### Design Token System

| Token | Light | Dark | Tailwind Class |
|-------|-------|------|----------------|
| Primary | `#0D9488` (teal-600) | `#14B8A6` (teal-500) | `bg-primary` |
| Primary Dark | `#0F766E` | `#0D9488` | `bg-primary-dark` |
| Accent | `#F59E0B` (amber-500) | `#FBBF24` (amber-400) | `bg-accent` |
| Success | `#059669` | `#10B981` | `bg-success` |
| Danger | `#DC2626` | `#EF4444` | `bg-danger` |
| Warning | `#D97706` | `#F59E0B` | `bg-warning` |
| Surface | `#FFFFFF` | `#1E293B` (slate-800) | `bg-surface` |
| Surface Elevated | `#F8FAFC` (slate-50) | `#334155` (slate-700) | `bg-surface-alt` |
| Background | `#F1F5F9` (slate-100) | `#0F172A` (slate-900) | `bg-background` |
| Text Primary | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) | `text-foreground` |
| Text Secondary | `#475569` (slate-600) | `#94A3B8` (slate-400) | `text-muted` |
| Border | `#E2E8F0` (slate-200) | `#334155` (slate-700) | `border-border` |
| Student Role | `#0EA5E9` (sky-500) | `#38BDF8` | `bg-student` |
| Instructor Role | `#0D9488` (teal-600) | `#14B8A6` | `bg-instructor` |
| Admin Role | `#E11D48` (rose-600) | `#FB7185` | `bg-admin` |

## Phase 2: Shared Component Library
- [x] `frontend/components/ui/Button.tsx` — rounded-xl, teal primary, press animation
- [x] `frontend/components/ui/Card.tsx` — rounded-2xl, shadow, dark mode
- [x] `frontend/components/ui/Input.tsx` — rounded-xl, focus ring in teal
- [x] `frontend/components/ui/Badge.tsx` — pill shape, semantic colors
- [x] `frontend/components/ui/Modal.tsx` — backdrop blur, slide-up animation
- [x] `frontend/components/ui/ScreenContainer.tsx` — safe area + pull-to-refresh
- [x] `frontend/components/ui/SectionHeader.tsx` — typography
- [x] `frontend/components/ui/StatCard.tsx` — icon + value + label
- [x] `frontend/components/ui/TabBar.tsx` — animated underline tabs
- [x] `frontend/components/ui/index.ts` — barrel export
- [x] Modernize `GlobalTopBar.tsx` — Pressable, Ionicons, Inter fonts, role gradient, dark mode toggle ✅
- [x] Modernize `WebNavigationHeader.tsx` — Pressable, Ionicons arrow-back, useTheme, Inter fonts ✅
- [x] Modernize `InlineMessage.tsx` — Ionicons per type, useTheme colorMap, Inter fonts ✅
- [x] Modernize `CalendarPicker.tsx` — useTheme day styles, Ionicons chevrons, getDayStyle helper ✅
- [x] Modernize `TimePickerWheel.tsx` — useTheme, renderWheel helper, Pressable ✅
- [x] Modernize `FormFieldWithTip.tsx` — Ionicons info icon, useTheme inputs/tooltips ✅
- [x] Modernize `LocationSelector.tsx` — Ionicons search/chevrons/checkmarks, useTheme tabs/lists ✅
- [x] Modernize `LicenseTypeSelector.tsx` — Ionicons checkmark, useTheme checkboxes/modals ✅
- [x] Modernize `AddressAutocomplete.tsx` — Ionicons location, useTheme GPS/inputs/status ✅

## Phase 3: Auth Screens (10 screens) ✅
- [x] `LoginScreen.tsx` — logo, teal gradient, card form, glass role modal
- [x] `RegisterChoiceScreen.tsx` — illustrated cards
- [x] `RegisterStudentScreen.tsx` — card-wrapped form sections, themed inputs
- [x] `RegisterInstructorScreen.tsx` — card sections (personal > license > vehicle > rates)
- [x] `SetupScreen.tsx` — onboarding feel, card sections, themed modals
- [x] `ForgotPasswordScreen.tsx` — centered card + lock icon
- [x] `ResetPasswordScreen.tsx` — matching centered card
- [x] `VerifyAccountScreen.tsx` — card with 3 states (verifying/success/error)
- [x] `VerificationPendingScreen.tsx` — status card + numbered steps
- [x] `InstructorScheduleSetupScreen.tsx` — themed loading/error/banner states

## Phase 4: Student Screens (3 screens) ✅
- [x] `StudentHomeScreen.tsx` — greeting header, stat grid, booking cards, star rating
- [x] `InstructorListScreen.tsx` — search bar, filter chips, instructor cards
- [x] `EditStudentProfileScreen.tsx` — avatar header, grouped form cards

## Phase 5: Instructor Screens (4 screens) ✅
- [x] `InstructorHomeScreen.tsx` — earnings card, schedule list, quick actions ✅
- [x] `ManageAvailabilityScreen.tsx` — pill day toggles, modern pickers ✅
- [x] `EditInstructorProfileScreen.tsx` — profile card header ✅
- [x] `EarningsReportScreen.tsx` — gradient earnings cards, clean list ✅

## Phase 6: Booking & Payment Screens (5 screens) ✅

- [x] `BookingScreen.tsx` — step-by-step flow, Card/Button/ThemedModal, themed slots, Inter fonts ✅
- [x] `PaymentScreen.tsx` — Card components, Button, themed text ✅
- [x] `MockPaymentScreen.tsx` — Card/Button, themed colors ✅
- [x] `PaymentSuccessScreen.tsx` — Button, consolidated status styles ✅
- [x] `PaymentCancelScreen.tsx` — Button, themed retry card ✅

## Phase 7: Admin Screens (11 screens)
- [x] `AdminDashboardScreen.tsx` — executive dashboard, stat cards, action grid ✅
- [x] `InstructorVerificationScreen.tsx` — profile cards with approve/reject ✅
- [x] `UserManagementScreen.tsx` — data table, search, filter chips, badges ✅
- [x] `BookingOversightScreen.tsx` — booking list, filter tabs ✅
- [x] `RevenueAnalyticsScreen.tsx` — revenue cards, top performers ✅
- [x] `InstructorEarningsOverviewScreen.tsx` — earnings grid ✅
- [x] `AdminSettingsScreen.tsx` — settings groups in cards ✅
- [x] `CreateAdminScreen.tsx` — form card sections ✅
- [x] `EditAdminProfileScreen.tsx` — profile editing ✅
- [x] `AdminManageInstructorScheduleScreen.tsx` — schedule management ✅
- [x] `DatabaseInterfaceScreen.tsx` — themed tables, filters, toolbar, Inter fonts ✅

## Phase 8: Navigation Overhaul

- [x] Update App.tsx header: teal `#0D9488` instead of `#007AFF`
- [x] Add ThemeContext provider
- [x] Update GlobalTopBar role colors (Admin=red, Instructor=teal, Student=blue)
- [x] Modernize GlobalTopBar — Pressable, Ionicons, Inter fonts, dark mode toggle (sun/moon) ✅
- [x] Add bottom tab navigation per role (`@react-navigation/bottom-tabs`) ✅
  - Student: Home | Instructors | Profile
  - Instructor: Home | Schedule | Earnings | Profile
  - Admin: Dashboard | Users | Bookings | Settings
- [x] Restructure App.tsx with conditional auth/main groups ✅
- [x] Create AuthContext for sharing auth actions with nested navigators ✅
- [x] Themed tab bar (light/dark) with role-based header colors ✅

## Phase 9: Animations & Polish ✅

- [x] Button press scale animation — `AnimatedPressable` with Reanimated spring ✅
- [x] Card fade-in + slide-up on mount — `FadeInView` wrapper, Card `animate` prop ✅
- [x] Tab switch animation — Reanimated spring underline + press feedback ✅
- [x] Pull-to-refresh with brand color spinner — already themed in `ScreenContainer` ✅
- [x] Loading skeletons (shimmer placeholders) — `Skeleton` component with presets ✅
- [x] Typography polish (Inter font consistency) — all UI components use fontFamily ✅

---

## Files Requiring Changes (48 StyleSheet files + assets + config)

### Config & Assets
- `frontend/app.json`
- `frontend/config.ts`
- `frontend/App.tsx`
- `frontend/assets/icons/icon.png`
- `frontend/assets/icons/adaptive-icon.png`
- `frontend/assets/icons/favicon.png`
- `frontend/assets/images/splash.png`

### New Files to Create
- `frontend/tailwind.config.js`
- `frontend/global.css`
- `frontend/context/ThemeContext.tsx`
- `frontend/components/ui/Button.tsx`
- `frontend/components/ui/Card.tsx`
- `frontend/components/ui/Input.tsx`
- `frontend/components/ui/Badge.tsx`
- `frontend/components/ui/Modal.tsx`
- `frontend/components/ui/ScreenContainer.tsx`
- `frontend/components/ui/SectionHeader.tsx`
- `frontend/components/ui/StatCard.tsx`
- `frontend/components/ui/TabBar.tsx`

### Backend Name Changes
- `backend/app/services/whatsapp_service.py`
- `backend/app/services/email_service.py`
- `backend/app/services/verification_service.py`
- `backend/app/services/instructor_verification_service.py`
