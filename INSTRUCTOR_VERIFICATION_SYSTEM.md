# Instructor Verification System - Implementation Summary

## Overview
Comprehensive instructor verification system where admins verify instructors via email/WhatsApp links or manually from dashboard. Instructors can set up their schedule immediately after registration (before admin verification).

## Key Features ✅

### 1. Instructor Can Setup Schedule Before Verification
- Instructors can create their availability schedule immediately after registration
- No need to wait for admin verification to configure working hours
- Schedule is saved and ready when verification completes

### 2. Admin Verification via Email & WhatsApp
- Verification links sent to **ALL admins** (not just first admin)
- Each admin receives both email + WhatsApp notification
- Links contain instructor details and direct verification link
- Links expire after configurable time (default 60 minutes)

### 3. Dual Verification Methods
- **Via Link**: Admins click link in email/WhatsApp → instant verification
- **Manual**: Admins can still verify from dashboard (Instructor Verification screen)

## Backend Changes

### New Files Created

**1. `backend/app/models/instructor_verification.py`**
- New model: `InstructorVerificationToken`
- Fields: instructor_id, token, expires_at, verified_at, verified_by_admin_id, is_used
- Relationship to Instructor model and User (admin who verified)

**2. `backend/app/services/instructor_verification_service.py`**
- `create_verification_token()` - Generate secure token
- `send_verification_to_all_admins()` - Send email + WhatsApp to all admins
- `verify_instructor_token()` - Verify instructor via token link
- `delete_expired_tokens()` - Cleanup expired tokens

**3. `backend/migrations/add_instructor_verification_tokens.py`**
- Migration script to create new table

### Modified Files

**1. `backend/app/routes/auth.py`**
- Updated `register_instructor` endpoint:
  - Creates instructor verification token
  - Sends notification to ALL admins
  - Returns message about setting up schedule

**2. `backend/app/routes/verification.py`**
- Added `GET /verify/instructor?token=...` endpoint
  - Verifies instructor from email/WhatsApp link
  - Returns success/error message

**3. `backend/app/models/user.py`**
- Added relationship: `instructor.verification_tokens`

**4. `backend/app/models/__init__.py`**
- Exported `InstructorVerificationToken`

## Email/WhatsApp Message Format

### Email to Admins

**Subject**: New Instructor Verification Required - [Instructor Name]

**Body**:
```
New Instructor Registration
-----------------------------
An instructor has registered and requires verification.

Instructor Details:
- Name: [Full Name]
- Email: [Email]
- Phone: [Phone]
- License Number: [License]
- License Types: [Types]
- Vehicle: [Year Make Model]
- City: [City]
- Hourly Rate: ZAR [Rate]

[Verify Instructor Button/Link]

Link expires in: 60 minutes

You can also verify instructors from the admin dashboard.
```

### WhatsApp to Admins

```
👤 New Instructor Verification Required

📋 Instructor: [Name]
📧 Email: [Email]
📱 Phone: [Phone]
🎓 License: [License Number]
🚗 Vehicle: [Year Make Model]
📍 City: [City]
💰 Rate: ZAR [Rate]/hour

🔗 Verification Link:
[Link]

⏰ Expires in: 60 minutes

You can also verify from the admin dashboard.
```

## API Changes

### Modified Endpoints

**POST `/auth/register/instructor`**

**New Response**:
```json
{
  "message": "Registration successful! Admins have been notified to verify your instructor profile. You can start creating your schedule while waiting for verification.",
  "user_id": 123,
  "instructor_id": 45,
  "verification_sent": {
    "emails_sent": 2,
    "whatsapp_sent": 2,
    "total_admins": 2
  },
  "note": "Verification link sent to 2 admin(s). You can start setting up your schedule immediately."
}
```

### New Endpoints

**GET `/verify/instructor?token=...`**

**Purpose**: Verify instructor from verification link

**Response Success**:
```json
{
  "status": "success",
  "message": "Instructor verified successfully"
}
```

**Response Error**:
```json
{
  "detail": "Invalid verification token | Link has expired | Link already used"
}
```

## Database Schema

### New Table: `instructor_verification_tokens`

```sql
CREATE TABLE instructor_verification_tokens (
    id INTEGER PRIMARY KEY,
    instructor_id INTEGER NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    token VARCHAR UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by_admin_id INTEGER REFERENCES users(id),
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instructor_verification_token ON instructor_verification_tokens(token);
```

## Frontend Changes Needed

### 1. Registration Flow Update

**RegisterInstructorScreen.tsx**:
- Update success message after registration
- Show that admins will verify
- Navigate to schedule setup immediately (don't wait)

### 2. New Verification Success Screen

**InstructorVerifyScreen.tsx** (NEW):
- Accessed via: `/instructor-verify?token=...`
- Calls: `GET /verify/instructor?token=...`
- Shows success/error message
- Redirects to login after 3 seconds

### 3. Schedule Setup Permission

**ManageAvailabilityScreen.tsx**:
- Allow access for unverified instructors
- Show warning: "Your schedule will be visible after admin verification"

## Migration Steps

### 1. Run Database Migration

```bash
cd backend
python migrations/add_instructor_verification_tokens.py
```

### 2. Restart Backend

Backend will auto-reload if using uvicorn --reload

### 3. Test Registration Flow

1. Register a new instructor
2. Check that email/WhatsApp sent to all admins
3. Click verification link in email/WhatsApp
4. Verify instructor verified successfully
5. Check instructor can create schedule before verification

## Security Features

✅ Secure random tokens (32-byte URL-safe)
✅ Token expiration (configurable, default 60 min)
✅ One-time use tokens (marked as used after verification)
✅ Tracks which admin verified (audit trail)
✅ Automatic cleanup of expired tokens

## Configuration

### Admin Settings (/admin/settings)

- **Verification Link Validity**: How long links remain valid (currently applies to email verification, will need update for instructor verification)
- **Email Config**: Gmail SMTP for sending verification emails
- **WhatsApp Config**: Twilio phone for sending verification messages

## Benefits

1. **Faster Onboarding**: Instructors can set up schedule immediately
2. **Multi-Admin Notification**: All admins get notified, faster response time
3. **Flexible Verification**: Admins can verify via link OR manually from dashboard
4. **Audit Trail**: Track which admin verified which instructor
5. **Security**: Tokens expire, one-time use, secure generation

## Next Steps

### Optional Enhancements

1. **Email Admin on Verification**: Send confirmation email to admins who verified
2. **Instructor Notification**: Notify instructor when verified (email/WhatsApp)
3. **Re-send Verification**: Allow admin to resend verification link
4. **Bulk Verification**: Allow admins to verify multiple instructors at once
5. **Verification Statistics**: Dashboard showing pending/verified counts
6. **Configurable Expiry**: Admin can set instructor verification link expiry time (separate from email verification)

## Testing Checklist

- [ ] Register new instructor
- [ ] Verify all admins receive email + WhatsApp
- [ ] Click verification link - verify instructor verified
- [ ] Try using link again - verify shows "already used"
- [ ] Register instructor, wait for expiry - verify shows "expired"
- [ ] Instructor can create availability before verification
- [ ] Manual verification from dashboard still works
- [ ] Instructor status changes after verification

## Files Modified/Created

**Backend**:
- ✅ Created: `backend/app/models/instructor_verification.py`
- ✅ Created: `backend/app/services/instructor_verification_service.py`
- ✅ Created: `backend/migrations/add_instructor_verification_tokens.py`
- ✅ Modified: `backend/app/routes/auth.py`
- ✅ Modified: `backend/app/routes/verification.py`
- ✅ Modified: `backend/app/models/user.py`
- ✅ Modified: `backend/app/models/__init__.py`

**Frontend** (TO DO):
- ⏳ Create: `frontend/screens/instructor/InstructorVerifyScreen.tsx`
- ⏳ Modify: `frontend/screens/auth/RegisterInstructorScreen.tsx`
- ⏳ Modify: `frontend/screens/instructor/ManageAvailabilityScreen.tsx`
- ⏳ Modify: `frontend/App.tsx` (add route for InstructorVerifyScreen)

## Status

✅ **Backend: COMPLETE**
⏳ **Frontend: PENDING**
⏳ **Migration: PENDING**
⏳ **Testing: PENDING**
