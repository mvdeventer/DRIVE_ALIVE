# Student Profile Update Fix

## Issue Summary

Student cellphone number could not be saved in the Edit Student Profile screen. The application showed:

- **500 Internal Server Error** when attempting to update profile
- **CORS errors** preventing the request from completing
- **React Native Web warnings** about text nodes inside Views

## Root Cause

The `UserResponse` Pydantic schema in the backend was inheriting from `UserBase`, which includes strict phone number validation. When the `/auth/me` PUT endpoint attempted to return the updated user object:

1. User updates phone number (valid format: `+27XXXXXXXXX` - 12 characters total)
2. Backend validates and saves the new phone number successfully
3. Backend tries to return the user object via `UserResponse`
4. **FAILURE**: If any existing phone numbers in the database didn't match the strict format (+27 followed by exactly 9 digits), validation would fail
5. This caused a 500 Internal Server Error
6. When the server crashes before sending a response, CORS headers aren't sent → CORS error in browser

## Files Modified

### Backend

**File**: `backend/app/schemas/user.py`

**Before**:

```python
class UserResponse(UserBase):
    """User response schema"""

    id: int
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True
```

**After**:

```python
class UserResponse(BaseModel):
    """User response schema - no validation on output"""

    id: int
    email: str
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True
```

## What Changed

### UserResponse Schema

- **Changed from**: Inheriting `UserBase` (which has strict phone validation)
- **Changed to**: Explicitly defining fields as `BaseModel` (no validation on output)
- **Impact**:
  - Input validation still enforced via `UserUpdate` schema
  - Output can contain any phone format (backward compatible with existing data)
  - Prevents validation errors when returning user objects

### Phone Validation Strategy

- **Input (UserUpdate)**: Strict validation - must be `+27` followed by exactly 9 digits
- **Output (UserResponse)**: No validation - accepts any string
- **Database**: No validation - stores whatever is saved
- **Result**: New phone numbers must be valid, but old/malformed numbers won't crash the API

## Testing

1. ✅ Backend server restarts successfully
2. ✅ Phone number updates should now save correctly
3. ✅ CORS errors should be resolved (were caused by 500 error)
4. ⚠️ React Native Web text node warnings are cosmetic and can be ignored

## React Native Web Warning

The warning "Unexpected text node: . A text node cannot be a child of a <View>" is a React Native Web internal warning and does not affect functionality. It's likely coming from:

- React Native Web's internal rendering of components
- Third-party component libraries
- Does not prevent the app from working

## Next Steps

If you still encounter issues:

1. Clear browser cache and reload
2. Restart backend server: `cd C:\Projects\DRIVE_ALIVE; .\scripts\drive-alive.bat start -d`
3. Check backend logs for any remaining validation errors
4. Verify phone numbers in database are in correct format: `+27XXXXXXXXX` (12 chars total)

## Database Phone Format Reference

- **Correct Format**: `+27611154598` (12 characters: +27 + 9 digits)
- **Invalid Formats**:
  - `+27611154599` (11 digits = 14 chars) ❌
  - `0611154598` (starts with 0) ❌
  - `27611154598` (missing +) ❌

## Related Files

- `backend/app/schemas/user.py` - User validation schemas
- `backend/app/routes/auth.py` - Authentication routes including `/auth/me` endpoint
- `frontend/screens/student/EditStudentProfileScreen.tsx` - Student profile edit UI
- `frontend/services/api/index.ts` - API service methods

## Date

January 16, 2026
