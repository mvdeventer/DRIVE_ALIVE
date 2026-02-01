# Instructor & Student Delete Feature

## Overview
Added delete buttons to the User Management screen for admins to delete instructor and student profiles.

## Implementation Date
January 31, 2026

## Features Added

### Delete Buttons
- **Instructor Delete**: Red "🗑️ Delete" button on instructor cards
- **Student Delete**: Red "🗑️ Delete" button on student cards
- Positioned alongside existing action buttons (Schedule, Manage Fee, etc.)

### Confirmation Modals
- **Instructor Deletion Modal**:
  - Title: "🗑️ Confirm Instructor Deletion"
  - Warning: "This removes the instructor profile only. The user account remains intact and they can re-register as an instructor later."
  - Buttons: Cancel, Delete Profile

- **Student Deletion Modal**:
  - Title: "🗑️ Confirm Student Deletion"
  - Warning: "This removes the student profile only. The user account remains intact and they can re-register as a student later."
  - Buttons: Cancel, Delete Profile

### Success Messages
- **Instructor**: "Instructor profile for {name} deleted successfully. User can re-register as instructor."
- **Student**: "Student profile for {name} deleted successfully. User can re-register as student."

## Backend Integration

### API Endpoints (Already Existed)
```
DELETE /admin/instructors/{user_id}
- Deletes instructor profile only
- Preserves user account
- Preserves bookings for history

DELETE /admin/students/{user_id}
- Deletes student profile only
- Preserves user account
- Preserves bookings for history
```

### Security Features
- Backend prevents self-deletion (returns 400 error)
- Backend prevents original admin deletion
- Requires admin authentication

## Frontend Implementation

### File Modified
`frontend/screens/admin/UserManagementScreen.tsx`

### Changes Made

1. **State Variables (Lines 68-69)**:
```typescript
const [confirmDeleteInstructor, setConfirmDeleteInstructor] = useState<User | null>(null);
const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<User | null>(null);
```

2. **Handler Functions (Lines 239-276)**:
```typescript
const handleDeleteInstructor = (user: User) => {
  setConfirmDeleteInstructor(user);
};

const confirmDeleteInstructorAction = async () => {
  // Calls apiService.deleteInstructor()
  // Shows success/error message
  // Reloads user list
};

const handleDeleteStudent = (user: User) => {
  setConfirmDeleteStudent(user);
};

const confirmDeleteStudentAction = async () => {
  // Calls apiService.deleteStudent()
  // Shows success/error message
  // Reloads user list
};
```

3. **Delete Buttons (Lines 691-719)**:
```typescript
// For instructors
{item.role === 'instructor' && (
  <>
    {/* Schedule button */}
    {/* Manage Fee button */}
    <TouchableOpacity
      style={[styles.actionButton, styles.deleteButton]}
      onPress={() => handleDeleteInstructor(item)}
    >
      <Text style={styles.actionButtonText}>🗑️ Delete</Text>
    </TouchableOpacity>
  </>
)}

// For students
{item.role === 'student' && (
  <TouchableOpacity
    style={[styles.actionButton, styles.deleteButton]}
    onPress={() => handleDeleteStudent(item)}
  >
    <Text style={styles.actionButtonText}>🗑️ Delete</Text>
  </TouchableOpacity>
)}
```

4. **Confirmation Modals (Lines 1098-1194)**:
- Added two new modals after the existing delete admin modal
- Both follow the same pattern as admin deletion
- Clear warnings about profile deletion vs account deletion

5. **Styling (Lines 1754-1757)**:
```typescript
deleteButton: {
  backgroundColor: '#DC3545', // Red color
},
```

## User Flow

### Deleting an Instructor
1. Admin navigates to User Management → Instructors tab
2. Finds instructor to delete
3. Clicks "🗑️ Delete" button
4. Confirmation modal appears with warning
5. Admin clicks "Delete Profile" or "Cancel"
6. If confirmed:
   - Instructor profile deleted
   - User account preserved
   - Success message displayed
   - User list refreshed

### Deleting a Student
1. Admin navigates to User Management → Students tab
2. Finds student to delete
3. Clicks "🗑️ Delete" button
4. Confirmation modal appears with warning
5. Admin clicks "Delete Profile" or "Cancel"
6. If confirmed:
   - Student profile deleted
   - User account preserved
   - Success message displayed
   - User list refreshed

## What Happens After Deletion

### Instructor Profile Deletion
- ✅ Instructor profile removed from database
- ✅ User account remains intact
- ✅ Bookings preserved for history
- ✅ Schedules removed
- ✅ User can re-register as instructor with same credentials
- ✅ User retains other roles (if they have student or admin roles)

### Student Profile Deletion
- ✅ Student profile removed from database
- ✅ User account remains intact
- ✅ Bookings preserved for history
- ✅ User can re-register as student with same credentials
- ✅ User retains other roles (if they have instructor or admin roles)

## Error Handling

### Backend Validation
- Self-deletion prevented: "Cannot delete your own account"
- Original admin protected: "Cannot delete the original admin"
- Invalid user ID: "User not found"

### Frontend Display
- Error messages auto-scroll to top
- Error messages display for 5 seconds
- Success messages display for 4 seconds
- Clear error details shown to user

## Testing Checklist

- [ ] Test instructor delete → Profile removed, user account remains
- [ ] Test student delete → Profile removed, user account remains
- [ ] Test re-registration after deletion → Works successfully
- [ ] Verify delete button appears only on Instructors/Students tabs
- [ ] Verify confirmation modal displays correct warnings
- [ ] Verify success/error messages display properly
- [ ] Test user list refreshes after deletion
- [ ] Verify bookings preserved after profile deletion

## Related Files

### Backend
- `backend/app/routes/admin.py` (Lines 504-658)
  - DELETE /admin/instructors/{user_id}
  - DELETE /admin/students/{user_id}
  - DELETE /admin/users/{user_id} (complete deletion)

### Frontend
- `frontend/services/api/index.ts` (Lines 436-452)
  - deleteInstructor(userId)
  - deleteStudent(userId)
  - deleteUser(userId)

- `frontend/screens/admin/UserManagementScreen.tsx` (1989 lines)
  - Delete handlers
  - Delete buttons
  - Confirmation modals
  - Success/error messaging

## Multi-Role Support

This feature fully supports multi-role users:
- Deleting instructor profile doesn't affect student or admin roles
- Deleting student profile doesn't affect instructor or admin roles
- User can re-register for deleted role later
- All bookings preserved for audit trail

## Status
✅ **Complete** - Delete functionality fully implemented and ready for testing

## Documentation Updates
- Updated AGENTS.md with delete feature details
- Created this implementation guide
- No changes needed to API documentation (endpoints already existed)
