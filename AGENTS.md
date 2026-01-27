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

## UI/UX Guidelines

### Global Navigation Requirements ✅

**Back Button:**

- ✅ **USE REACT NAVIGATION'S BUILT-IN BACK BUTTON** - Automatically provided by React Navigation
- ✅ Configured globally in `App.tsx` with `headerBackVisible: true`
- ✅ Appears in `headerLeft` position (top-left corner) when navigation stack allows going back
- ✅ Works consistently across all platforms (mobile, web)
- ✅ Automatically respects `beforeRemove` navigation listeners for unsaved changes
- ❌ **NEVER** add custom "← Back" buttons in screen headers (duplicates built-in functionality)
- ❌ **NEVER** use `navigation.goBack()` in custom header buttons
- ❌ **NEVER** create `backButton` or `backButtonText` styles in screen stylesheets

**Implementation:**

```typescript
// In App.tsx navigation config (already configured)
screenOptions={{
  headerBackVisible: true,
  headerBackTitle: 'Back',
  // ... other options
}}

// Exception: Error states may show custom back button in content
// Example: BookingScreen when no instructor selected
if (!instructor) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>No instructor selected</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Logout Button:**

- ✅ **ALWAYS** include logout button in header for all authenticated screens
- ✅ Appears in `headerRight` position (top-right corner)
- ✅ **IMMEDIATE LOGOUT**: Logs out instantly on click (web: reloads page, mobile: resets navigation)
- ✅ **SINGLE BUTTON ONLY**: Blue logout button in header (never duplicate in screen content)
- ✅ Web-compatible: Works across all platforms (mobile, web)
- ✅ Implemented globally in `App.tsx` navigation configuration
- ✅ **MONITORS UNSAVED CHANGES**: Global logout button checks for unsaved changes via `beforeRemove` listeners
- ❌ **NEVER** create a screen without logout functionality when authenticated
- ❌ **NEVER** add red logout buttons within screen content (duplicates header button)
- ❌ **NEVER** add separate `handleLogout` functions inside individual screens

**Implementation:**

```typescript
// In App.tsx navigation config
screenOptions={{
  headerRight: isAuthenticated ? () => <LogoutButton /> : undefined,
}}

// Logout handler (immediate action, web reload)
const handleLogout = async () => {
  try {
    await storage.removeItem('access_token');
    await storage.removeItem('user_role');
    setIsAuthenticated(false);
    setUserRole(null);
    if (Platform.OS === 'web') {
      window.location.reload();
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
};
```

**Unsaved Changes Detection:**

- Screens with Save/Apply/Confirm buttons track form changes via `beforeRemove` navigation listeners
- If unsaved changes exist when navigating away (including logout), show platform-specific confirmation dialog
- User can Stay (cancel navigation) or Discard Changes (proceed with navigation/logout)
- Applies to: ManageAvailabilityScreen, EditInstructorProfileScreen, EditStudentProfileScreen, BookingScreen
- Logout button in header automatically respects these listeners

### Inline Message System ✅

**NO Pop-up Alerts Policy:**

- ❌ **NEVER** use `Alert.alert()` (doesn't work on React Native Web)
- ❌ **NEVER** use `window.confirm()` or `window.alert()` (poor UX, blocking)
- ✅ **ALWAYS** use inline messages with `InlineMessage` component
- ✅ **ALWAYS** use confirmation modals for destructive actions

**Message Configuration:**
All inline message durations are centrally managed in `frontend/config/messageConfig.json`:

```json
{
  "globalOverride": {
    "enabled": true,
    "defaultDuration": 4000
  },
  "screens": {
    "UserManagementScreen": {
      "statusChange": 4000,
      "userUpdate": 4000,
      "passwordReset": 5000,
      "error": 5000
    },
    "BookingOversightScreen": {
      "bookingCancel": 4000,
      "error": 5000
    }
    // ... more screens
  }
}
```

**Global Override:**

- When `globalOverride.enabled = true`, ALL messages use `defaultDuration` (4000ms)
- Set `enabled = false` to use screen-specific durations
- Useful for quick adjustments during testing/production

**Implementation Pattern:**

```typescript
import { showMessage } from "../utils/messageConfig";

const SCREEN_NAME = "YourScreenName";

// Show success message
showMessage(
  setSuccessMessage, // State setter
  "Operation successful!", // Message text
  SCREEN_NAME, // Screen identifier
  "actionName", // Action identifier (matches config)
  "success", // Message type: 'success' | 'error'
);

// Show error message
showMessage(
  setErrorMessage,
  "Something went wrong",
  SCREEN_NAME,
  "error",
  "error",
);
```

**Confirmation Modals:**
For destructive actions (delete, deactivate, cancel), use modals:

```typescript
const [confirmAction, setConfirmAction] = useState<{
  user: User;
  newStatus: string;
} | null>(null);

// Trigger confirmation
const handleAction = (user: User, status: string) => {
  setConfirmAction({ user, newStatus: status });
};

// Confirm and execute
const confirmAction = async () => {
  // Execute action
  setConfirmAction(null); // Close modal
  showMessage(setSuccessMessage, 'Success!', SCREEN_NAME, 'action', 'success');
};

// Modal JSX
<Modal visible={!!confirmAction} ...>
  <Text>Are you sure?</Text>
  <Button onPress={() => setConfirmAction(null)}>Cancel</Button>
  <Button onPress={confirmAction}>Confirm</Button>
</Modal>
```

**Screen-Specific Rules:**

- **UserManagementScreen**: 4s for status/updates, 5s for password/errors
- **BookingOversightScreen**: 4s for cancellations, 5s for errors
- **StudentHomeScreen**: 4s for bookings, 5s for conflicts
- **InstructorListScreen**: 4s for general, 5s for errors

**Auto-Scroll on Error:**
Messages automatically scroll to top for visibility:

```typescript
scrollViewRef.current?.scrollTo({ y: 0, animated: true });
```

**Extended Visibility:**
Critical messages (conflicts, security warnings) use 5000ms duration.

### Platform-Dependent Responsive Design ✅

**Automatic Mobile Scaling:**

- ✅ **ALL SCREENS** use Platform-dependent responsive styling
- ✅ Automatic detection: `Platform.OS === 'web'` for conditional sizing
- ✅ Applies to: padding, margins, fontSize, minWidth, maxWidth on all cards, text, buttons, tabs
- ✅ Web gets larger values, iOS/Android get 20-40% smaller values
- ✅ Ensures optimal UX across desktop web, mobile web, and native mobile apps

**Responsive Pattern:**

```typescript
import { Platform } from 'react-native';

// Padding example
padding: Platform.OS === 'web' ? 20 : 12,

// Font size example
fontSize: Platform.OS === 'web' ? 18 : 16,

// Min width example
minWidth: Platform.OS === 'web' ? 140 : 100,

// Margin example
margin: Platform.OS === 'web' ? 6 : 4,
```

**Standard Scaling Values:**

| Style Property | Web Value | Mobile Value | Reduction |
|---------------|-----------|--------------|-----------|
| Card Padding | 20px | 12px | 40% |
| Card Padding (small) | 16px | 12px | 25% |
| Card Padding (large) | 24px | 16px | 33% |
| Font Size (title) | 32px | 24px | 25% |
| Font Size (heading) | 24px | 20px | 17% |
| Font Size (subheading) | 18px | 16px | 11% |
| Font Size (body) | 16px | 14px | 13% |
| Font Size (small) | 14px | 12px | 14% |
| Font Size (label) | 12px | 11px | 8% |
| Card MinWidth (large) | 140px | 100px | 29% |
| Card MinWidth (medium) | 120px | 90px | 25% |
| Card MinWidth (small) | 80px | 70px | 13% |
| Margins (standard) | 6px | 4px | 33% |
| Margins (small) | 5px | 4px | 20% |
| Tab Padding Horizontal | 16px | 4px | 75% |
| Tab Font Size | 14px | 11px | 21% |

**Card Layout Pattern:**

```typescript
statCard: {
  backgroundColor: '#F8F9FA',
  borderRadius: 8,
  padding: Platform.OS === 'web' ? 20 : 12,
  margin: Platform.OS === 'web' ? 6 : 4,
  flexBasis: '30%',
  minWidth: Platform.OS === 'web' ? 140 : 100,
  maxWidth: '100%',
  flexGrow: 1,
  alignItems: 'center',
}
```

**Tab Navigation Pattern:**

```typescript
tab: {
  fontSize: Platform.OS === 'web' ? 14 : 11,
  paddingHorizontal: Platform.OS === 'web' ? 16 : 4,
  paddingVertical: 8,
}
```

**Screens Updated:**

- ✅ **Admin Screens**: AdminDashboardScreen, BookingOversightScreen, InstructorVerificationScreen, RevenueAnalyticsScreen, InstructorEarningsOverviewScreen, UserManagementScreen
- ✅ **Instructor Screens**: InstructorHomeScreen, EarningsReportScreen, ManageAvailabilityScreen, EditInstructorProfileScreen
- ✅ **Student Screens**: StudentHomeScreen, InstructorListScreen, EditStudentProfileScreen
- ✅ **Booking Screens**: BookingScreen
- ✅ **Auth Screens**: LoginScreen, RegisterStudentScreen, RegisterInstructorScreen
- ✅ **Payment Screens**: PaymentScreen, MockPaymentScreen

**Implementation Rules:**

- ❌ **NEVER** use hard-coded pixel values without Platform checks for UI elements
- ❌ **NEVER** use CSS media queries (doesn't work in React Native)
- ✅ **ALWAYS** use `Platform.OS === 'web'` for responsive conditional styling
- ✅ **ALWAYS** test on mobile web browsers (Chrome/Safari mobile)
- ✅ **ALWAYS** apply responsive pattern to new screens during development

**Testing Checklist:**

- [ ] Test on desktop web browser (Chrome, Firefox, Edge)
- [ ] Test on mobile web browser (Chrome Android, Safari iOS)
- [ ] Test on Expo Go app (iOS/Android)
- [ ] Verify cards fit within screen width (no horizontal overflow)
- [ ] Verify text is readable (not too small or too large)
- [ ] Verify tabs display correctly (5+ tabs should fit)
- [ ] Verify buttons are tappable (min 44x44px touch target on mobile)

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
- [x] **GPS Location Capture** ✅
  - [x] Web Geolocation API integration (works on mobile browsers)
  - [x] High-accuracy GPS coordinate capture
  - [x] Reverse geocoding with OpenStreetMap Nominatim
  - [x] Auto-fill address from GPS coordinates
  - [x] Permission handling and error messages
  - [x] Manual address entry fallback
  - [x] Coordinates stored in database (pickup_latitude, pickup_longitude)
  - [x] Works on Android/iOS mobile web browsers
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
  - [x] **WhatsApp Automation** ✅
    - [x] Twilio Business API integration
    - [x] Immediate booking confirmation to students
    - [x] 1-hour reminder to students before lesson
    - [x] 15-minute reminder to instructors before lesson
    - [x] Daily summary at 6:00 AM (all lessons consolidated)
    - [x] Background scheduler running every 5 minutes
    - [x] R10 booking fee added to all bookings
    - [x] Phone number formatting (supports +27, 27, 0 formats)
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
- **Debug Mode** (DEBUG=True): Instructors are auto-verified on registration for testing only.
- **Production Mode** (DEBUG=False): Instructors require manual verification via admin dashboard.
- See [DEBUG_MODE_SETTINGS.md](DEBUG_MODE_SETTINGS.md) for configuration details.

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

### Inline Message System Implementation ✅

**Architecture:**

- ✅ Created centralized message configuration system
- ✅ `frontend/config/messageConfig.json` - Global and screen-specific durations
- ✅ `frontend/utils/messageConfig.ts` - Utility functions (getMessageDuration, autoClearMessage, showMessage)
- ✅ Global override feature (enabled by default, 4000ms duration)

**No Pop-up Alerts Policy:**

- ✅ Eliminated ALL `Alert.alert()` calls (React Native Web incompatible)
- ✅ Eliminated ALL `window.confirm()` and `window.alert()` (poor UX)
- ✅ Replaced with inline `InlineMessage` component
- ✅ Confirmation modals for destructive actions (delete, deactivate, cancel)

**Implementation Details:**

- ✅ Auto-dismiss after configured duration (default 4s, errors 5s)
- ✅ Auto-scroll to top on error messages for visibility
- ✅ Color-coded messages (green=success, red=error)
- ✅ Emoji support in confirmation modals (✅ activate, ⚠️ deactivate/suspend)
- ✅ Screen-specific duration configuration for fine-tuned UX

**Migrated Screens:**

- ✅ UserManagementScreen - Status changes, user edits, password resets
- ✅ BookingOversightScreen - Booking cancellations
- ✅ StudentHomeScreen - Booking conflicts, lesson cancellations
- ✅ InstructorListScreen - Booking confirmations

**Message Types:**

- **Success**: Green background, auto-dismiss after 4s
- **Error**: Red background, extended visibility (5s)
- **Conflict**: Red background, extended visibility (5s), scroll to top
- **Warning**: Yellow background (in modals), requires confirmation

**Developer Guidelines:**

```typescript
// Pattern for all screens:
import { showMessage } from "../utils/messageConfig";
const SCREEN_NAME = "YourScreenName";

// Success:
showMessage(setSuccessMessage, "Done!", SCREEN_NAME, "action", "success");

// Error:
showMessage(setErrorMessage, "Failed!", SCREEN_NAME, "error", "error");
```

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
- `GET /admin/revenue/stats?instructor_id={id}` - Revenue statistics (all or filtered by instructor)
- `GET /admin/revenue/by-instructor/{id}` - Instructor revenue

**Frontend API Methods:**

- `getAdminStats()` - Fetch system statistics
- `getPendingInstructors()` - Get pending verifications
- `verifyInstructor()` - Approve/reject instructor
- `getAllUsers()` - List users with filters
- `updateUserStatus()` - Change user status
- `getAllBookingsAdmin()` - Admin booking overview
- `cancelBookingAdmin()` - Cancel any booking
- `getRevenueStats(instructorId?)` - Revenue analytics (all instructors or filtered)
- `getInstructorRevenue()` - Per-instructor revenue
- `createAdmin()` - Create new admin account

## Recent Updates (Dec 23, 2025 - Revenue Analytics Filter)

### Revenue Analytics Instructor Filtering ✅

**Feature:** Enhanced Revenue Analytics screen with instructor filter dropdown

**Backend Changes** ✅

- Modified `/admin/revenue/stats` endpoint to accept optional `instructor_id` query parameter
- When `instructor_id` provided: Returns stats filtered to specific instructor
- When `instructor_id` omitted: Returns aggregate stats for all instructors (default behavior)
- Backward compatible with existing API calls
- File: `backend/app/routes/admin.py` (lines 463-540)

**Frontend Changes** ✅

- Added instructor dropdown filter using `@react-native-picker/picker` (already installed)
- Dropdown shows "All Instructors" (default) plus list of all registered instructors
- Real-time stats update when filter selection changes
- Filter positioned between header and revenue summary cards
- Maintains filter selection across pull-to-refresh
- File: `frontend/screens/admin/RevenueAnalyticsScreen.tsx` (lines 1-414)

**API Service Update** ✅

- Modified `getRevenueStats()` method to accept optional `instructorId` parameter
- Conditionally adds `instructor_id` to query params when provided
- File: `frontend/services/api/index.ts` (lines 290-296)

**User Experience:**

- **Default View**: Shows aggregate revenue across all instructors
- **Filtered View**: Shows revenue for specific selected instructor
- **Reset Filter**: Select "All Instructors" to return to aggregate view
- **Loading States**: Displays loading indicator while fetching filtered data

**Use Cases:**

- Admin wants to see overall business revenue → Default view
- Admin wants to analyze specific instructor's performance → Select instructor from dropdown
- Admin wants to compare instructors → Switch between different selections

**Documentation:**

- Created comprehensive implementation guide: `REVENUE_ANALYTICS_FILTER.md`

## Recent Updates (Jan 13, 2026 - iOS Encoding Fix)

### iOS ExcelJS Latin1 Encoding Issue ✅

**Problem:** App crashed on iOS Expo Go with `RangeError: Unknown encoding: latin1`

**Root Cause:**

- ExcelJS library uses `TextDecoder` with "latin1" encoding
- React Native's Hermes engine doesn't support "latin1" encoding natively
- Only UTF-8/UTF-16 are supported in mobile JavaScript environments

**Solution:** Created TextDecoder polyfill

- ✅ **Polyfill File:** `frontend/utils/textEncodingPolyfill.ts`
  - Implements TextEncoder/TextDecoder with latin1 support
  - Handles UTF-8, latin1 (ISO-8859-1), and ASCII encodings
  - Single-byte character mapping for latin1 (0-255)
- ✅ **App Entry:** `frontend/App.tsx`
  - Added polyfill import at top (BEFORE any other imports)
  - Ensures global.TextDecoder is available when ExcelJS loads
- ✅ **Documentation:** `IOS_EXCELJS_ENCODING_FIX.md`
  - Comprehensive guide with technical details
  - Testing procedures and alternative solutions

**Impact:**

- ✅ App now loads successfully on iOS Expo Go
- ✅ Excel export functionality works in admin screens
- ✅ No encoding errors in console
- ✅ Zero impact on web/Android platforms
- ✅ Maintains backward compatibility

**Files Modified:**

- Created: `frontend/utils/textEncodingPolyfill.ts`
- Modified: `frontend/App.tsx` (added polyfill import)
- Documentation: `IOS_EXCELJS_ENCODING_FIX.md`

**Status:** ✅ Fixed and tested (Jan 13, 2026)

## Recent Updates (Jan 25, 2026 - GPS Location Capture)

### GPS Location Capture Feature ✅

**Feature:** Students can capture GPS coordinates when booking lessons via web browsers (mobile & desktop)

**Frontend Changes** ✅

- Enhanced `AddressAutocomplete` component with GPS capture button
- HTML5 Geolocation API integration (works on mobile browsers)
- Automatic reverse geocoding using OpenStreetMap Nominatim
- High-accuracy GPS mode (`enableHighAccuracy: true`)
- Permission handling with user-friendly error messages
- Auto-fill address fields from GPS coordinates
- Manual address entry fallback
- Loading states and visual feedback
- File: `frontend/components/AddressAutocomplete.tsx`

**BookingScreen Integration** ✅

- Added `pickupCoordinates` state to store GPS data
- Updated `AddressAutocomplete` to capture coordinates via callback
- Modified booking submission to include coordinates in payment data
- Default coordinates: Cape Town (-33.9249, 18.4241) if GPS not used
- File: `frontend/screens/booking/BookingScreen.tsx`

**PaymentScreen Updates** ✅

- Updated booking data structure to include `pickup_latitude` and `pickup_longitude`
- Coordinates passed to backend during payment initiation
- File: `frontend/screens/payment/PaymentScreen.tsx`

**Backend Changes** ✅

- Updated Stripe webhook to extract GPS coordinates from booking data
- Updated mock payment handler to use GPS coordinates
- Default coordinates: Cape Town (-33.9249, 18.4241) when GPS not used
- File: `backend/app/routes/payments.py` (lines 275-310, 485-510)

**Database Schema:**

- Already supported via existing model fields:
  - `pickup_latitude` (Float, required)
  - `pickup_longitude` (Float, required)
  - `pickup_address` (String, required)

**User Experience:**

1. Student clicks "📍 Use Current Location (GPS)" button
2. Browser prompts for location permission (one-time)
3. GPS captures coordinates with high accuracy (15s timeout)
4. Reverse geocoding auto-fills address fields
5. Success message shows captured coordinates
6. Coordinates stored in database with booking
7. Fallback to manual entry if GPS fails

**Browser Support:**

- ✅ Mobile web browsers (Chrome, Safari on Android/iOS)
- ✅ Desktop browsers (Chrome, Firefox, Edge, Safari)
- ✅ Progressive Web Apps (PWAs)
- ⚠️ HTTPS required (enforced by browser)
- ⚠️ User permission required (browser prompt)

**Privacy & Security:**

- GPS captured only when user clicks button (no continuous tracking)
- Explicit user consent via browser permission prompt
- Coordinates used only for lesson pickup location
- Reverse geocoding via OpenStreetMap (free, no API key)
- POPIA compliant (user-initiated, no third-party sharing)

**Documentation:**

- Created comprehensive implementation guide: `GPS_LOCATION_CAPTURE.md`
- Updated AGENTS.md with feature details
- Troubleshooting guide included

**Status:** ✅ Implemented and tested (Jan 25, 2026)
