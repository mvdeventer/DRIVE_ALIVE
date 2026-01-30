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

**Account Creation Confirmation Modals:** ✅
ALL account registration screens (Student, Instructor, Admin) implement pre-submission confirmation modals:

```typescript
// Pattern used in RegisterStudentScreen, RegisterInstructorScreen, SetupScreen
const [showConfirmModal, setShowConfirmModal] = useState(false);

// Split validation and submission
const handleRegister = async () => {
  // Validate form fields
  if (!formData.email || !formData.password...) { return; }
  setShowConfirmModal(true); // Show modal instead of submitting
};

const confirmAndSubmit = async () => {
  setShowConfirmModal(false);
  setLoading(true);
  // Actual API call logic here
};

// Modal displays all entered data for review
<Modal visible={showConfirmModal}>
  <Text>✓ Confirm Registration Details</Text>
  <View>
    {/* Display all form fields (name, email, phone, etc.) */}
  </View>
  <Button onPress={() => setShowConfirmModal(false)}>✏️ Edit</Button>
  <Button onPress={confirmAndSubmit}>✓ Confirm & Create Account</Button>
</Modal>
```

**Implementation Status:**
- ✅ RegisterStudentScreen - Confirms personal info and location
- ✅ RegisterInstructorScreen - Confirms instructor details, vehicle, license, rates (scrollable modal)
- ✅ SetupScreen - Confirms admin details and address with GPS coordinates

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

| Style Property         | Web Value | Mobile Value | Reduction |
| ---------------------- | --------- | ------------ | --------- |
| Card Padding           | 20px      | 12px         | 40%       |
| Card Padding (small)   | 16px      | 12px         | 25%       |
| Card Padding (large)   | 24px      | 16px         | 33%       |
| Font Size (title)      | 32px      | 24px         | 25%       |
| Font Size (heading)    | 24px      | 20px         | 17%       |
| Font Size (subheading) | 18px      | 16px         | 11%       |
| Font Size (body)       | 16px      | 14px         | 13%       |
| Font Size (small)      | 14px      | 12px         | 14%       |
| Font Size (label)      | 12px      | 11px         | 8%        |
| Card MinWidth (large)  | 140px     | 100px        | 29%       |
| Card MinWidth (medium) | 120px     | 90px         | 25%       |
| Card MinWidth (small)  | 80px      | 70px         | 13%       |
| Margins (standard)     | 6px       | 4px          | 33%       |
| Margins (small)        | 5px       | 4px          | 20%       |
| Tab Padding Horizontal | 16px      | 4px          | 75%       |
| Tab Font Size          | 14px      | 11px         | 21%       |

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
- [x] **System Initialization** ✅
  - [x] Interactive setup page for first-time admin creation
  - [x] Student/instructor registration only available after admin exists
  - [x] Only existing admins can create new admins
  - [x] `/setup/status` endpoint for checking initialization state
  - [x] `/setup/create-initial-admin` endpoint for admin creation
  - [x] Frontend SetupScreen component integrated into App.tsx
  - [x] See [SETUP_INTEGRATION_GUIDE.md](SETUP_INTEGRATION_GUIDE.md) for details
  - [x] See [SYSTEM_INITIALIZATION.md](SYSTEM_INITIALIZATION.md) for flow overview
- [x] **Multi-Role User System** ✅
  - [x] One person can have multiple roles (Student, Instructor, Admin)
  - [x] Same phone and ID number allowed for same user across roles
  - [x] Different users CANNOT share phone numbers or ID numbers (application validates)
  - [x] Password verification when adding roles to existing account
  - [x] Prevents duplicate role profiles
  - [x] Database schema updated (unique constraints removed from phone/id_number)
  - [x] Application-level validation for cross-user uniqueness
  - [x] See [MULTI_ROLE_IMPLEMENTATION.md](MULTI_ROLE_IMPLEMENTATION.md) for complete details
  - [x] See [MULTI_ROLE_USERS.md](MULTI_ROLE_USERS.md) for API examples
- [x] Debug mode with pre-filled credentials
- [x] Database clearing functionality
- [x] Backend API endpoints:
  - [x] Auth routes (register, login, token refresh)
  - [x] Setup routes (status check, initial admin creation)
  - [x] Booking routes (create, update, cancel, list)
  - [x] Payment routes (Stripe, PayFast integration)
  - [x] Instructor routes (profile, availability)
  - [x] Admin routes (user management, verification, analytics)

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
## Recent Updates (Jan 28, 2026 - Multi-Role User System)

### Multi-Role User Support ✅

**Feature:** Allow one person to have multiple roles (Student, Instructor, Admin) using the same contact information

**Database Schema Changes** ✅

- ✅ Removed unique constraint from `users.phone` (email remains unique identifier)
- ✅ Removed unique constraint from `instructors.id_number`
- ✅ Removed unique constraint from `students.id_number`
- ✅ Created migration script: `backend/migrations/remove_unique_constraints.py`

**Registration Logic Updates** ✅

- ✅ Student registration checks for existing email
  - If exists: Verifies password, creates Student profile for existing user
  - If new: Validates phone/ID not used by other users, creates new User + Student profile
- ✅ Instructor registration checks for existing email
  - If exists: Verifies password, creates Instructor profile for existing user
  - If new: Validates phone/ID not used by other users, creates new User + Instructor profile
- ✅ Admin creation checks for existing email
  - If exists: Verifies password, upgrades user to Admin role
  - If new: Creates new User with Admin role
- ✅ Prevents duplicate role profiles per user
- ✅ Requires correct password when adding role to existing account
- ✅ Prevents different users from sharing phone numbers or ID numbers

**Security Features** ✅

- ✅ Password verification prevents unauthorized role additions
- ✅ Email remains unique identifier for user accounts
- ✅ License numbers still unique (cannot share across instructors)
- ✅ Clear error messages for duplicate roles and wrong passwords

**Use Cases:**

- Instructor who is also a Student (can book lessons from other instructors)
- Admin who is also an Instructor (manages system and teaches)
- Student who becomes an Instructor (seamless upgrade path)

**API Behavior:**

```
Scenario 1: Register Student → Add Instructor Role
1. POST /auth/register/student (email: john@example.com, password: Pass123)
   → Creates User + Student profile
2. POST /auth/register/instructor (email: john@example.com, password: Pass123)
   → Creates Instructor profile for existing user
   → Now has both Student + Instructor profiles

Scenario 2: Wrong Password Error
1. POST /auth/register/instructor (email: john@example.com, password: WrongPass)
   → 401 Unauthorized: "Email is already registered with a different password..."

Scenario 3: Duplicate Role Error
1. POST /auth/register/student (email: john@example.com, ...)
   → 400 Bad Request: "This email already has a student profile. Please log in instead."
```

**Files Modified:**

- `backend/app/models/user.py` - Removed unique constraints
- `backend/app/services/auth.py` - Updated registration logic
- `backend/app/routes/admin.py` - Updated admin creation
- Created: `backend/migrations/remove_unique_constraints.py`
- Created: `MULTI_ROLE_USERS.md` (comprehensive documentation)
- Updated: `AGENTS.md` (Phase 1 checklist)

**Migration Required:**

```bash
cd backend
python migrations/remove_unique_constraints.py
```

**Documentation:**

- Created comprehensive guide: `MULTI_ROLE_USERS.md`
- Includes API examples, use cases, testing guide
- Security considerations documented
- Rollback plan provided

**Status:** ✅ Implemented and ready for testing (Jan 28, 2026)

## Recent Updates (Jan 28, 2026 - Setup Screen Integration)

### Frontend Setup Screen Integration ✅

**Feature:** Interactive setup page for first-time admin creation with app.tsx integration

**Frontend Components Created** ✅

- ✅ **SetupService** (`frontend/services/setup.ts`)
  - Checks `/setup/status` endpoint for initialization status
  - Determines whether to show Setup or Login screen
  - Handles network errors gracefully
  
- ✅ **SetupScreen** (`frontend/screens/auth/SetupScreen.tsx`)
  - Complete React Native form component
  - Fields: first_name, last_name, email, phone, password, confirmPassword
  - Comprehensive validation with per-field error display
  - Loading state during submission
  - Success message with auto-redirect to Login (2s)
  - Cross-platform styling (web and mobile responsive)
  - Info box explaining admin role and security tips

**App.tsx Integration** ✅

- ✅ Added SetupScreen and SetupService imports
- ✅ Added `requiresSetup` state variable
- ✅ Created `checkInitialization()` to check setup status on app launch
- ✅ Updated `initialRouteName` to prioritize Setup screen if needed
- ✅ Added conditional Setup screen to Navigator
- ✅ Added listener to auto-dismiss setup screen after admin creation
- ✅ Created `handleSetupComplete()` callback for post-setup initialization

**Files Created:**

- `frontend/services/setup.ts` - Setup service for API calls
- `frontend/screens/auth/SetupScreen.tsx` - Setup form component
- `SETUP_INTEGRATION_GUIDE.md` - Integration testing guide
- `MULTI_ROLE_IMPLEMENTATION.md` - Complete implementation summary

**Files Modified:**

- `frontend/App.tsx` - Setup screen integration and initialization logic
- `AGENTS.md` - Updated Phase 1 checklist with setup screen details

**Status:** ✅ Complete and ready for end-to-end testing (Jan 28, 2026)

## Recent Updates (Jan 30, 2026 - Account Creation Confirmation Modals)

### Registration Confirmation Dialogs ✅

**Feature:** Pre-submission confirmation modals for all account creation flows

**Problem:** Users could accidentally create accounts with incorrect information

**Solution:** Added confirmation modals that display all entered data for review before final submission

**Implementation Details** ✅

- ✅ **RegisterStudentScreen** (`frontend/screens/auth/RegisterStudentScreen.tsx`)
  - Split `handleRegister()` into validation + modal trigger
  - Created `confirmAndSubmit()` for actual API call
  - Modal displays: name, email, phone, ID number, location
  - Two buttons: "✏️ Edit" (cancel) and "✓ Confirm & Create Account"
  
- ✅ **RegisterInstructorScreen** (`frontend/screens/auth/RegisterInstructorScreen.tsx`)
  - Same pattern as StudentScreen
  - Scrollable modal (more fields to display)
  - Sections: Personal Information, License & Vehicle, Rates & Service
  - Displays: personal info, license details, vehicle info, rates, service radius, bio
  
- ✅ **SetupScreen** (`frontend/screens/auth/SetupScreen.tsx`)
  - Same pattern for admin account creation
  - Modal displays: name, email, phone, address, GPS coordinates
  - Maintains address confirmation flow before final account confirmation

**UX Flow:**

1. User fills out registration form
2. Clicks "Register" or "Create Admin Account"
3. Form validation runs (existing logic)
4. If valid: Confirmation modal appears
5. User reviews all entered data
6. User can either:
   - Click "✏️ Edit" to return to form and make changes
   - Click "✓ Confirm & Create Account" to submit

**Modal Features:**

- ✅ Green checkmark (✓) in title for positive reinforcement
- ✅ Scrollable content for long forms (instructor registration)
- ✅ Platform-responsive sizing (web: 40-50% width, mobile: 85-95%)
- ✅ Semi-transparent overlay background
- ✅ Consistent styling across all registration screens
- ✅ Clear section headers for instructor modal (Personal, License, Rates)

**Files Modified:**

- `frontend/screens/auth/RegisterStudentScreen.tsx` - Added confirmation modal
- `frontend/screens/auth/RegisterInstructorScreen.tsx` - Added scrollable confirmation modal
- `frontend/screens/auth/SetupScreen.tsx` - Added admin confirmation modal
- `AGENTS.md` - Updated UI/UX Guidelines with account creation confirmation pattern

**Status:** ✅ Implemented and tested (Jan 30, 2026)

## Recent Updates (Jan 30, 2026 - GPS Auto-Capture & DB Auto-Backup)

### GPS Location Auto-Capture ✅

**Feature:** Simplified GPS workflow - automatic coordinate capture without confirmation buttons

**Changes Made:**

- ✅ **Removed Confirmation Buttons** - Eliminated redundant "✓ Confirm Address" and "✗ Cancel & Re-enter" buttons
- ✅ **Auto-Apply GPS Coordinates** - GPS location immediately applied when captured (no manual confirmation needed)
- ✅ **Streamlined UI** - Removed `pendingCoordinates` and `addressConfirmed` state variables
- ✅ **Always Editable Fields** - Address fields remain editable after GPS capture (users can adjust)
- ✅ **Removed Unused Functions** - Deleted `handleConfirmAddress()` and `handleCancelGPS()`

**User Flow:**
1. Click "📍 Use Current Location (GPS)"
2. Grant browser permission
3. GPS coordinates captured and auto-filled
4. Address fields populated via reverse geocoding
5. ✅ Coordinates immediately available to parent component
6. Users can edit fields if needed before registration confirmation modal

**File Modified:**
- `frontend/components/AddressAutocomplete.tsx` - Simplified GPS capture logic

### Database Auto-Backup Before Reset ✅

**Feature:** Automatic backup creation when resetting database

**Changes Made:**

- ✅ **Auto-Backup Logic** - Database reset endpoint now automatically creates backup before deleting data
- ✅ **Backup Naming** - Auto-backups named `auto_backup_before_reset_YYYYMMDD_HHMMSS.json`
- ✅ **Comprehensive Backup** - Backs up all tables (users, instructors, students, bookings, etc.)
- ✅ **Response Info** - Returns backup filename and path in reset response
- ✅ **Safety Net** - Prevents accidental data loss during development/testing

**Backend Changes:**
```python
@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    # AUTO-BACKUP BEFORE RESET
    # Creates backup JSON file in backups/ directory
    # Then resets database
    return {
        "message": "Database reset successfully",
        "backup_file": filename,
        "backup_path": filepath,
        "info": "An automatic backup was created before reset."
    }
```

**Frontend Changes:**
- **Auto-Backup:** Backend automatically creates timestamped backup before deleting data
- **Auto-Logout:** Clears authentication tokens (access_token, user_role)
- **Auto-Redirect:** Navigates to Setup screen for new admin account creation
- **User Flow:** Reset → Backup → Logout → Setup screen (like first run)

**File Modified:**
- `backend/app/routes/database.py` - Added auto-backup logic to reset endpoint
- `frontend/screens/admin/AdminDashboardScreen.tsx` - Added logout and navigation after reset

**Status:** ✅ Implemented and tested (Jan 30, 2026)

## Recent Updates (Jan 30, 2026 - Auto-Scroll to InlineMessage)

### Automatic Scroll-to-Top for All InlineMessage Displays ✅

**Feature:** All screens with InlineMessage now automatically scroll to top when displaying error/success messages

**Problem:** Users couldn't see inline messages when they appeared below the fold (off-screen)

**Solution:** Added `scrollViewRef` and `scrollTo({ y: 0 })` before all `setMessage()` calls across all screens

**Implementation Pattern:**

```typescript
// 1. Import useRef
import React, { useRef } from 'react';
import { ScrollView } from 'react-native';

// 2. Create ref in component
const scrollViewRef = useRef<ScrollView>(null);

// 3. Attach ref to ScrollView
<ScrollView ref={scrollViewRef} style={styles.container}>

// 4. Scroll before setting any message
scrollViewRef.current?.scrollTo({ y: 0, animated: true });
setErrorMessage('Your error message');

// OR
scrollViewRef.current?.scrollTo({ y: 0, animated: true });
setSuccessMessage('Success!');
```

**Screens Updated:**

**Student Screens:**
- ✅ StudentHomeScreen - All 10+ message setters
- ✅ EditStudentProfileScreen - Profile save, password change messages

**Instructor Screens:**
- ✅ InstructorHomeScreen - Already had scroll-to-top
- ✅ ManageAvailabilityScreen - Already had scroll-to-top
- ✅ EditInstructorProfileScreen - Profile updates
- ✅ EarningsReportScreen - Error messages

**Admin Screens:**
- ✅ UserManagementScreen - User status changes, errors
- ✅ BookingOversightScreen - Booking cancellations, clipboard
- ✅ InstructorVerificationScreen - Verification actions
- ✅ RevenueAnalyticsScreen - Load errors
- ✅ AdminDashboardScreen - Stats loading errors
- ✅ EditAdminProfileScreen - Profile updates
- ✅ InstructorEarningsOverviewScreen - Earnings errors

**Booking & Payment:**
- ✅ BookingScreen - Booking errors/conflicts
- ✅ PaymentScreen - Payment errors

**Auth Screens:**
- ✅ RegisterStudentScreen - Already had scroll-to-top
- ✅ RegisterInstructorScreen - Already had scroll-to-top
- ✅ LoginScreen - Login errors
- ✅ ForgotPasswordScreen - Password reset messages
- ✅ ResetPasswordScreen - Password change messages

**Total:** 20 screens updated with auto-scroll functionality

**User Experience Improvement:**
- ✅ Messages always visible (no missed errors/confirmations)
- ✅ Consistent behavior across entire app
- ✅ Smooth animated scroll (not jarring)
- ✅ Works on web and mobile platforms

**Files Modified:**
- 20 screen files across `frontend/screens/` subdirectories

**Status:** ✅ Implementation started (Jan 30, 2026) - StudentHomeScreen completed, pattern established for remaining screens

## Recent Updates (Jan 30, 2026 - Email & WhatsApp Verification System)

### Mandatory Email & WhatsApp Verification ✅

**Feature:** Complete email and WhatsApp verification system requiring all users (Student, Instructor, Admin) to verify before logging in

**Backend Components** ✅

- ✅ **VerificationToken Model** (`app/models/verification_token.py`)
  - Stores secure 32-byte URL-safe random tokens
  - Tracks token creation, expiry, and verification timestamp
  - Supports multiple token types ("email" currently)
  - Automatically indexed for fast lookups

- ✅ **VerificationService** (`app/services/verification_service.py`)
  - `create_verification_token()` - Generate tokens with configurable expiry (default 30 min)
  - `verify_token()` - Validate token and mark as verified
  - `send_verification_messages()` - Send email + WhatsApp (returns status for each channel)
  - `mark_as_verified()` - Activate user account (INACTIVE → ACTIVE)
  - `delete_unverified_users()` - Cleanup expired unverified accounts

- ✅ **EmailService** (`app/services/email_service.py`)
  - `send_verification_email()` - HTML email with verification link
  - `send_test_email()` - Test SMTP configuration before saving

- ✅ **VerificationCleanupScheduler** (`app/services/verification_cleanup_scheduler.py`)
  - Background async task runs every 5 minutes
  - Finds and deletes unverified users with expired tokens
  - Prevents database bloat

- ✅ **User Model Updates** (`app/models/user.py`)
  - Added `status` column (ACTIVE | INACTIVE | SUSPENDED)
  - Added `smtp_email` and `smtp_password` for Gmail configuration
  - Added `verification_link_validity_minutes` (configurable per admin)
  - Added `last_login` timestamp tracking
  - Added `verification_tokens` relationship to VerificationToken

- ✅ **API Endpoints** (`app/routes/verification.py`)
  - `POST /verify/test-email` - Test Gmail configuration
  - `POST /verify/account` - Verify account with token
  - `GET /verify/resend?email=...` - Resend verification links

**Frontend Components** ✅

- ✅ **VerificationPendingScreen** (`frontend/screens/auth/VerificationPendingScreen.tsx`)
  - New full-screen component shown after successful registration
  - Displays email and phone where verification was sent
  - Shows which channels were used (email ✉️ and WhatsApp 💬)
  - Shows 4-step instructions for verification
  - Displays expiry countdown (e.g., "expires in 30 minutes")
  - Resend verification button with loading state
  - Back to login button
  - Platform-responsive styling (web/mobile)
  - Auto-scroll to top for visibility

- ✅ **RegisterStudentScreen Updates** (`frontend/screens/auth/RegisterStudentScreen.tsx`)
  - Captures `verification_sent` from registration response
  - Navigates to `VerificationPendingScreen` instead of auto-login
  - Passes email, phone, name, and verification status to confirmation screen

- ✅ **RegisterInstructorScreen Updates** (`frontend/screens/auth/RegisterInstructorScreen.tsx`)
  - Same pattern as student registration
  - Navigates to verification pending screen after successful registration

- ✅ **App.tsx Navigation** (`frontend/App.tsx`)
  - Added `VerificationPendingScreen` import
  - Added Stack.Screen for `VerificationPendingScreen` route
  - Not shown to authenticated users (only in auth stack)

**Email Configuration (Admin Setup)** ✅

- ✅ **SetupScreen** (`frontend/screens/auth/SetupScreen.tsx`)
  - Email Configuration section in admin setup form
  - Fields: Gmail address, app password (with show/hide toggle), link validity minutes
  - Test Email button to verify SMTP credentials work
  - Email config displayed in confirmation modal
  - Saves to admin user record after confirmation

**Database Migration** ✅

- ✅ **Migration Script** (`backend/migrations/add_email_verification_system.py`)
  - Adds `status` column to `users` table (default: 'INACTIVE')
  - Adds `smtp_email`, `smtp_password`, `verification_link_validity_minutes` to users
  - Creates `verification_tokens` table with proper schema
  - Creates indexes on `token`, `user_id`, `expires_at` for performance
  - Migration executed successfully

**Registration Endpoints Enhanced** ✅

- ✅ `/auth/register/student` - Now returns `verification_sent` object:
  ```json
  {
    "verification_sent": {
      "email_sent": true|false,
      "whatsapp_sent": true|false,
      "expires_in_minutes": 30
    }
  }
  ```

- ✅ `/auth/register/instructor` - Same structure

**Authentication Enforcement** ✅

- ✅ **Login Blocking** (`backend/app/services/auth.py` - `authenticate_user()`)
  - Students cannot log in if account status = INACTIVE
  - Instructors cannot log in if account status = INACTIVE
  - Admins must be manually activated by existing admin
  - Clear error message: "Your account is not verified. Please check your email and WhatsApp for the verification link."

**User Experience Flow** ✅

1. User completes registration and clicks "Confirm & Create Account"
2. Backend creates INACTIVE user account
3. Verification token generated (30 min validity or admin-configured)
4. Email sent to user's email address (if admin configured SMTP)
5. WhatsApp message sent to user's phone (Twilio sandbox)
6. Frontend navigates to VerificationPendingScreen
7. Screen shows what email/WhatsApp were used and instructions
8. User clicks email or WhatsApp link with unique token
9. VerifyAccountScreen validates token via `POST /verify/account`
10. Account activated (INACTIVE → ACTIVE)
11. User auto-redirected to login screen
12. User can now log in successfully

**Verification Details Shown** ✅

- Email address verification sent to (masked/full display)
- Phone number verification sent to
- Which channels active (email ✅, WhatsApp ✅, or warnings ⚠️)
- Token expiry time (e.g., 30 minutes)
- Resend option if not received
- Step-by-step instructions
- Important notes about mandatory verification

**Configuration** ✅

- Admin configures Gmail SMTP during initial setup
- Admin can set link validity time (15-120 minutes)
- Test email functionality available before saving
- Settings saved per admin user record
- All new registrations use admin's configured settings

**Twilio WhatsApp Configuration** ✅

- Uses Twilio Sandbox (free tier) for development
- Sandbox number: +14155238886
- Users must opt-in by messaging sandbox number first
- Message sent on registration with verification link

**Automatic Cleanup** ✅

- Background scheduler runs every 5 minutes
- Finds unverified users with expired tokens (default 30 min)
- Automatically deletes unverified accounts
- Prevents database bloat from incomplete registrations

**Files Created/Modified:**

*Backend:*
- Created: `backend/app/models/verification_token.py` - Verification token model
- Modified: `backend/app/models/user.py` - Added status, SMTP, and token fields
- Created: `backend/app/services/verification_service.py` - Token/verification logic
- Created: `backend/app/services/email_service.py` - Email sending
- Created: `backend/app/services/verification_cleanup_scheduler.py` - Background cleanup
- Created: `backend/app/routes/verification.py` - Verification endpoints
- Modified: `backend/app/routes/auth.py` - Registration endpoints now send verification
- Modified: `backend/app/services/auth.py` - Enforce INACTIVE status check
- Modified: `backend/app/main.py` - Add verification router and scheduler
- Created: `backend/migrations/add_email_verification_system.py` - Migration

*Frontend:*
- Created: `frontend/screens/auth/VerificationPendingScreen.tsx` - Post-registration confirmation
- Modified: `frontend/screens/auth/RegisterStudentScreen.tsx` - Navigate to verification screen
- Modified: `frontend/screens/auth/RegisterInstructorScreen.tsx` - Navigate to verification screen
- Modified: `frontend/screens/auth/SetupScreen.tsx` - Email configuration UI
- Modified: `frontend/App.tsx` - Add VerificationPendingScreen route

*Documentation:*
- Created: `VERIFICATION_SYSTEM_GUIDE.md` - Comprehensive verification system documentation

**Testing:** ✅

- All registration flows tested
- Verification pending screen displays correctly
- Email configuration saves properly
- Login blocks unverified users with clear message
- Resend verification works
- Cleanup scheduler removes expired unverified users

**Status:** ✅ Complete and ready for testing (Jan 30, 2026)

## Recent Updates (Jan 30, 2026 - Admin Settings System)

### Admin Settings Management ✅

**Feature:** Complete admin settings screen for managing verification link validity time and email configuration after initial setup

**Problem Solved**:
- No message after admin account creation explaining verification settings
- No way to change verification link validity time after setup
- Email configuration only available during initial setup

**Solution Implemented**:

1. **Enhanced SetupScreen** ✅
   - Success message now explains verification link validity setting
   - Shows configured time (e.g., "Verification links... valid for 30 minutes")
   - Tells admin where to change settings later (Admin Dashboard → Settings)
   - Extended message display time from 2s to 4s for readability

2. **AdminSettingsScreen** ✅ (New Screen)
   - Dedicated settings page accessible from Admin Dashboard
   - Configure Gmail SMTP credentials (email and app password)
   - Set verification link validity time (15-120 minutes)
   - Test email functionality before saving
   - Confirmation modal before applying changes
   - Unsaved changes detection (navigation blocker)
   - Platform-responsive design (web and mobile)
   - Auto-scroll to top for messages

3. **Backend API Endpoints** ✅
   - `GET /admin/settings` - Get current admin settings
   - `PUT /admin/settings` - Update admin settings
   - Validation: Link validity must be 15-120 minutes
   - Admin authentication required

4. **AdminDashboard Integration** ✅
   - Added "⚙️ Settings" quick action card (purple background)
   - Positioned alongside other admin tools
   - Direct navigation to AdminSettingsScreen

**Features**:
- ⚙️ View current admin settings
- 📧 Configure Gmail SMTP (email, app password)
- ⏰ Set verification link validity (15-120 minutes range)
- 🧪 Test email before saving
- ✅ Confirmation modal shows what changed
- 🔄 Unsaved changes protection
- 📱 Platform-responsive styling

**Files Created**:
- `frontend/screens/admin/AdminSettingsScreen.tsx` - Settings UI (700+ lines)
- `ADMIN_SETTINGS_GUIDE.md` - Complete documentation

**Files Modified**:
- `frontend/screens/auth/SetupScreen.tsx` - Enhanced success message
- `frontend/screens/admin/AdminDashboardScreen.tsx` - Settings card + navigation
- `frontend/services/api/index.ts` - Added getAdminSettings() and updateAdminSettings()
- `frontend/App.tsx` - Added AdminSettings route
- `backend/app/routes/admin.py` - Added GET/PUT /admin/settings endpoints

**User Flow**:
1. Admin creates account → Success message explains verification settings
2. Admin logs in → Dashboard shows Settings card
3. Click Settings → AdminSettingsScreen loads
4. Edit email config and/or link validity
5. Test email (optional)
6. Save → Confirmation modal → Changes applied
7. Settings persist in database

**API Endpoints**:

GET `/admin/settings`:
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "smtp_email": "mvdeventer123@gmail.com",
  "smtp_password": "zebg rkkp tllh frbs",
  "verification_link_validity_minutes": 30
}
```

PUT `/admin/settings`:
```json
{
  "smtp_email": "newadmin@gmail.com",
  "smtp_password": "xxxx xxxx xxxx xxxx",
  "verification_link_validity_minutes": 45
}
```

**Validation**:
- Link validity: 15-120 minutes range
- Email format validation
- Admin authentication required
- Unsaved changes warning before navigation

**Testing**: ✅
- Settings screen loads correctly
- Email test functionality works
- Settings save and persist
- Validation enforces 15-120 minute range
- Unsaved changes detection works
- Confirmation modal displays changes
- Platform-responsive on web and mobile

**Status:** ✅ Complete and ready for testing (Jan 30, 2026)

