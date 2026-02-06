# Admin Instructor Schedule Management Feature

## Overview
Admins can now manage instructor schedules and time-off dates directly from the User Management screen.

## Implementation Date
February 6, 2026

## Changes Made

### Backend (Python/FastAPI)

#### New Admin Endpoints (`backend/app/routes/admin.py`)

1. **POST `/admin/instructors/{instructor_id}/schedule`**
   - Create a new weekly schedule entry for an instructor
   - Validates day doesn't already exist
   - Request body: `InstructorScheduleCreate` schema

2. **PUT `/admin/instructors/{instructor_id}/schedule/{schedule_id}`**
   - Update an existing schedule entry
   - Request body: `InstructorScheduleUpdate` schema
   - Can update: start_time, end_time, is_active

3. **DELETE `/admin/instructors/{instructor_id}/schedule/{schedule_id}`**
   - Delete a schedule entry for a specific day

4. **POST `/admin/instructors/{instructor_id}/time-off`**
   - Create a new time-off period for an instructor
   - Request body: `TimeOffExceptionCreate` schema

5. **DELETE `/admin/instructors/{instructor_id}/time-off/{time_off_id}`**
   - Delete a time-off entry

All endpoints require admin authentication via `require_admin` middleware.

### Frontend (React Native/TypeScript)

#### New Screen: `AdminManageInstructorScheduleScreen.tsx`

**Location:** `frontend/screens/admin/AdminManageInstructorScheduleScreen.tsx`

**Features:**
- ✅ **Weekly Schedule Management**
  - Toggle each day on/off
  - Set start and end times for each day
  - Visual time picker (TimePickerWheel component)
  - Delete individual schedule entries
  - Save all changes with single button

- ✅ **Time Off Management**
  - View all existing time-off periods (past and future)
  - Add new time-off with date range and reason
  - Calendar picker for date selection
  - Delete time-off entries with confirmation

- ✅ **UX Features**
  - Auto-scroll to top on errors/success messages
  - Unsaved changes detection with confirmation modal
  - Loading states during saves/deletes
  - Platform-responsive styling (web and mobile)
  - Inline success/error messages (auto-dismiss)
  - Confirmation modals for destructive actions

**Navigation:**
- Accessed from User Management screen via "📅 Schedule" button
- Passes instructor ID and name as route parameters
- Built-in back button via WebNavigationHeader

#### Updated Files

1. **`frontend/App.tsx`**
   - Added import for `AdminManageInstructorScheduleScreen`
   - Added Stack.Screen route: `AdminManageInstructorSchedule`

2. **`frontend/screens/admin/UserManagementScreen.tsx`**
   - Modified `handleViewSchedule()` to navigate instead of showing modal
   - Navigates to: `AdminManageInstructorSchedule` with params
   - Added `scrollViewRef` for error message auto-scroll
   - Added `useRef` to React imports
   - Attached `ref` to main ScrollView

## User Flow

1. Admin logs in → Admin Dashboard
2. Navigate to "User Management"
3. Filter by "Instructors" tab
4. Click "📅 Schedule" button on any instructor card
5. **New:** Opens dedicated schedule management screen
6. Admin can:
   - Set weekly availability (days and times)
   - Block out time-off periods
   - Save changes with visual confirmation
7. Click back button to return to User Management

## Old vs New Behavior

### Before
- Schedule button opened **read-only modal**
- Showed weekly schedule, time off, and bookings
- No editing capability
- Refresh button only reloaded data

### After
- Schedule button opens **full editing screen**
- Same data visibility PLUS:
  - Toggle days on/off
  - Edit times for each day
  - Add/delete time-off periods
  - Save changes directly
  - All CRUD operations available

## API Schema Dependencies

The implementation uses existing Pydantic schemas from `backend/app/schemas/availability.py`:
- `InstructorScheduleCreate`
- `InstructorScheduleUpdate`
- `TimeOffExceptionCreate`

No schema changes were needed.

## Database Tables Used

- `instructor_schedules` - Weekly schedule entries
- `time_off_exceptions` - Time-off periods

No database migrations required (tables already exist).

## Security

✅ All endpoints protected by `require_admin` middleware  
✅ Validates instructor exists before operations  
✅ Validates schedule/time-off ownership before updates/deletes  
✅ Uses existing admin authentication system  

## Code Quality

**Codacy Analysis:**
- ✅ ESLint: No errors
- ✅ Semgrep: No security issues
- ✅ Trivy: No vulnerabilities
- ⚠️ Lizard: Complexity warnings (acceptable for admin UI)

**Warnings (Non-blocking):**
- AdminManageInstructorScheduleScreen has high cyclomatic complexity (typical for React screens)
- File has 773 lines (expected for full CRUD screen with modals)

## Testing Recommendations

1. **Backend API Testing**
   - Test all 5 new endpoints via Swagger UI (`/docs`)
   - Verify admin authentication enforcement
   - Test validation (duplicate days, invalid dates)

2. **Frontend Testing**
   - Navigate from User Management to schedule screen
   - Create weekly schedule for instructor
   - Add time-off periods
   - Edit existing schedule
   - Delete schedule entries
   - Test unsaved changes modal
   - Verify auto-scroll on errors

3. **Integration Testing**
   - Student booking should respect admin-set schedules
   - Time-off should block bookings
   - Changes should persist after logout/login

## Future Enhancements

Potential improvements (not implemented):
- Bulk schedule operations (copy schedule to multiple instructors)
- Schedule templates (e.g., "Full-time", "Part-time")
- Conflict detection (warn if bookings exist during time-off)
- History tracking (audit log of schedule changes)
- Export schedule to CSV/PDF

## Related Files

**Backend:**
- `backend/app/routes/admin.py` (new endpoints)
- `backend/app/routes/availability.py` (existing instructor endpoints)
- `backend/app/schemas/availability.py` (schemas)
- `backend/app/models/availability.py` (database models)

**Frontend:**
- `frontend/screens/admin/AdminManageInstructorScheduleScreen.tsx` (new)
- `frontend/screens/admin/UserManagementScreen.tsx` (modified)
- `frontend/App.tsx` (modified)
- `frontend/components/TimePickerWheel.tsx` (reused)
- `frontend/components/CalendarPicker.tsx` (reused)
- `frontend/components/WebNavigationHeader.tsx` (reused)

## Status
✅ **Implementation Complete** (February 6, 2026)  
✅ **Code Analysis Passed**  
⏳ **Ready for Testing**
