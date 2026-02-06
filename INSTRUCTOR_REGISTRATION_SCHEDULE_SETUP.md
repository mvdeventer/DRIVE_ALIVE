# Instructor Schedule Registration & Admin Management Enhancement

## Overview
Enhanced the system to allow instructors to set up their schedule during registration, and admins can manage instructor schedules using the same underlying component.

## Implementation Date
February 6, 2026

## Changes Made

### 1. Instructor Registration Flow Enhancement

#### Modified: `RegisterInstructorScreen.tsx`
**Purpose:** Add optional schedule setup after successful registration

**Changes:**
- After successful instructor registration, navigate to schedule setup screen
- Show success message: "✅ Registration Successful! You can now set up your schedule or skip and do it later."
- 2-second delay before navigation for message visibility
- Passes verification data to next screen for later use

**User Flow:**
```
Register Form → Submit → Success Message (2s) → Schedule Setup → Verification Pending
```

### 2. New Screen: InstructorScheduleSetupScreen

#### Created: `frontend/screens/auth/InstructorScheduleSetupScreen.tsx`
**Purpose:** Wrapper screen for schedule management during registration

**Features:**
- ✅ **Optional Setup:** Shows "Skip" button during initial registration
- ✅ **Banner Message:** Green info bar explaining setup is optional
- ✅ **Instructor ID Fetching:** Automatically fetches instructor_id for logged-in instructors
- ✅ **Reuses Admin Component:** Wraps `AdminManageInstructorScheduleScreen`
- ✅ **Error Handling:** Retry button if instructor profile fails to load
- ✅ **Loading States:** Activity indicator while fetching data

**Props:**
```typescript
{
  instructorId?: number,              // Instructor ID (null during registration)
  instructorName: string,             // Display name
  isInitialSetup: boolean,            // Show skip button
  verificationData?: {                // Pass-through for verification screen
    email: string,
    phone: string,
    firstName: string,
    emailSent: boolean,
    whatsappSent: boolean,
    expiryMinutes: number
  }
}
```

**Navigation Behavior:**
- **During Registration:** Skip button navigates to `VerificationPending`
- **After Login:** Back button navigates to previous screen
- **Error State:** Retry button refetches instructor ID

### 3. Updated Navigation (App.tsx)

#### Added Route:
```typescript
<Stack.Screen
  name="InstructorScheduleSetup"
  component={InstructorScheduleSetupScreen}
  options={{ title: 'Set Up Schedule', headerShown: !isAuthenticated }}
/>
```

#### Added Import:
```typescript
import InstructorScheduleSetupScreen from './screens/auth/InstructorScheduleSetupScreen';
```

### 4. Existing Components (No Changes Needed)

#### AdminManageInstructorScheduleScreen
**Usage:**
- **Admins:** Manage any instructor's schedule via User Management
- **Instructors (Initial Setup):** Set up schedule after registration
- **Instructors (Later):** Use existing ManageAvailabilityScreen from dashboard

#### InstructorHomeScreen
**Existing Button:**
- "📅 Schedule" button already exists
- Navigates to `ManageAvailabilityScreen` (instructor's own screen)
- No changes needed

#### UserManagementScreen
**Existing Button:**
- "📅 Schedule" button remains
- Navigates to `AdminManageInstructorSchedule` (admin management)
- No changes needed

## User Flows

### Instructor Registration Flow (New)

```
1. Fill Registration Form
   ↓
2. Click "Confirm & Create Account"
   ↓
3. Success Message (2 seconds)
   ↓
4. Navigate to Schedule Setup
   ↓
5. Options:
   a) Set up weekly schedule → Save → Verification Pending
   b) Click "Skip" → Verification Pending
   ↓
6. Verify email/WhatsApp → Login
```

### Admin Managing Instructor Schedule (Unchanged)

```
1. Admin Dashboard
   ↓
2. User Management
   ↓
3. Instructors Tab
   ↓
4. Click "📅 Schedule" on instructor card
   ↓
5. AdminManageInstructorScheduleScreen
   ↓
6. Edit schedule, add time-off, save
```

### Instructor Managing Own Schedule (Unchanged)

```
1. Instructor Dashboard
   ↓
2. Click "📅 Schedule" in Quick Actions
   ↓
3. ManageAvailabilityScreen
   ↓
4. Set weekly schedule, add time-off, save
```

## Component Reusability

### AdminManageInstructorScheduleScreen
**Used By:**
1. **Admins** (via UserManagementScreen)
   - Full access to any instructor's schedule
   - No skip button
   - Back button returns to User Management

2. **New Instructors** (via InstructorScheduleSetupScreen)
   - Set up own schedule after registration
   - Skip button available (isInitialSetup=true)
   - Skip navigates to VerificationPending

3. **Logged-in Instructors** (via ManageAvailabilityScreen)
   - Use dedicated instructor screen
   - NOT using AdminManageInstructorScheduleScreen
   - Optimized for instructor workflow

## API Dependencies

### Existing Endpoints (No Changes)

**Backend:**
- `POST /admin/instructors/{id}/schedule` - Create schedule entry
- `PUT /admin/instructors/{id}/schedule/{id}` - Update schedule
- `DELETE /admin/instructors/{id}/schedule/{id}` - Delete schedule
- `POST /admin/instructors/{id}/time-off` - Add time-off
- `DELETE /admin/instructors/{id}/time-off/{id}` - Delete time-off
- `GET /instructors/me` - Get current instructor profile

**Frontend:**
- `ApiService.get('/instructors/me')` - Fetch instructor ID

## Benefits

✅ **Reduced Onboarding Friction:** New instructors can set up schedule immediately  
✅ **Optional Setup:** Skip button allows delayed setup without blocking registration  
✅ **Component Reuse:** Single schedule management component serves multiple use cases  
✅ **Admin Control:** Admins retain full control via User Management  
✅ **Instructor Autonomy:** Instructors can use their dedicated screen after login  
✅ **Verification Flow:** Seamless transition to email/WhatsApp verification  

## Code Quality

**Codacy Analysis:**
- ✅ ESLint: No errors
- ✅ Semgrep: No security issues  
- ✅ Trivy: No vulnerabilities
- ⚠️ Lizard: Complexity warnings (expected for React components)

**Warnings (Non-blocking):**
- RegisterInstructorScreen: High cyclomatic complexity (form validation)
- InstructorScheduleSetupScreen: 97 lines of code in render (acceptable for wrapper)

## Testing Checklist

### Instructor Registration
- [ ] Register new instructor → Success message appears
- [ ] After 2 seconds → Navigate to schedule setup
- [ ] Skip button → Navigate to verification pending
- [ ] Set up schedule → Save → Navigate to verification pending
- [ ] Verify email/WhatsApp → Login successful

### Admin Management
- [ ] User Management → Instructors tab
- [ ] Click Schedule on any instructor
- [ ] AdminManageInstructorScheduleScreen opens
- [ ] Edit schedule → Save → Changes persist
- [ ] Back button → Return to User Management

### Instructor Dashboard
- [ ] Login as instructor
- [ ] Quick Actions → "📅 Schedule"
- [ ] ManageAvailabilityScreen opens (NOT AdminManageInstructorScheduleScreen)
- [ ] Edit schedule → Save → Changes persist

## Navigation Architecture

```
RegisterInstructorScreen
└─→ InstructorScheduleSetupScreen (isInitialSetup=true)
    ├─→ Skip → VerificationPending
    └─→ Set Up Schedule → AdminManageInstructorScheduleScreen → Save → VerificationPending

UserManagementScreen
└─→ Schedule Button → AdminManageInstructorScheduleScreen (admin managing instructor)

InstructorHomeScreen
└─→ Schedule Button → ManageAvailabilityScreen (instructor managing self)
```

## Files Modified

**New Files:**
- `frontend/screens/auth/InstructorScheduleSetupScreen.tsx` (118 lines)

**Modified Files:**
- `frontend/screens/auth/RegisterInstructorScreen.tsx` (navigation change)
- `frontend/App.tsx` (added import and route)

**Existing Files (No Changes):**
- `frontend/screens/admin/AdminManageInstructorScheduleScreen.tsx` (reused)
- `frontend/screens/admin/UserManagementScreen.tsx` (unchanged)
- `frontend/screens/instructor/InstructorHomeScreen.tsx` (unchanged)
- `frontend/screens/instructor/ManageAvailabilityScreen.tsx` (unchanged)

## Future Enhancements

Potential improvements (not implemented):
- Email reminder after 3 days if instructor hasn't set up schedule
- Admin notifications for instructors with incomplete schedules
- Schedule template selection during registration (e.g., "Full-time", "Part-time")
- Bulk import of schedule from CSV
- Mobile calendar integration

## Status
✅ **Implementation Complete** (February 6, 2026)  
✅ **Code Analysis Passed**  
✅ **Component Reusability Achieved**  
⏳ **Ready for End-to-End Testing**  

---

## Summary

Instructors can now optionally set up their schedule immediately after registration using a wrapper screen that reuses the admin schedule management component. Admins retain full control via User Management, and instructors can use their dedicated schedule screen from the dashboard. The implementation maximizes code reuse while maintaining separation of concerns.
