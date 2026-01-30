# Email & WhatsApp Verification System - Complete Guide

## Overview

The Drive Alive app now implements a **mandatory email and WhatsApp verification system** to ensure users verify their accounts before accessing any part of the application. This system is designed to:

- ✅ Prevent unauthorized access
- ✅ Verify user contact information (email + phone)
- ✅ Provide clear guidance to users about verification requirements
- ✅ Support admin configuration of email settings and token expiry
- ✅ Automatically clean up unverified accounts after expiry

---

## System Architecture

### Backend Components

#### 1. **VerificationToken Model** (`app/models/verification_token.py`)
Stores secure verification tokens with metadata:
```python
- id: Unique identifier
- user_id: Link to User (foreign key)
- token: Secure 32-byte URL-safe random string
- token_type: "email" type
- created_at: When token was generated
- expires_at: Expiry timestamp
- verified_at: When user clicked link (NULL if not verified yet)
- used: Boolean flag
```

#### 2. **VerificationService** (`app/services/verification_service.py`)
Core verification logic:
- `create_verification_token()` - Generate secure token with expiry
- `verify_token()` - Validate token and mark as verified
- `mark_as_verified()` - Activate user account
- `send_verification_messages()` - Send email + WhatsApp
- `delete_unverified_users()` - Cleanup expired accounts

#### 3. **EmailService** (`app/services/email_service.py`)
Gmail SMTP integration:
- `send_verification_email()` - HTML email with verification link
- `send_test_email()` - Test SMTP configuration

#### 4. **VerificationCleanupScheduler** (`app/services/verification_cleanup_scheduler.py`)
Background task that runs every 5 minutes to:
- Find tokens that have expired
- Delete associated unverified users
- Log cleanup operations

#### 5. **User Model Updates** (`app/models/user.py`)
New fields:
```python
- status: ACTIVE | INACTIVE | SUSPENDED (default: INACTIVE)
- smtp_email: Admin's Gmail address for sending verification emails
- smtp_password: Admin's Gmail app password
- verification_link_validity_minutes: Configurable token expiry (default: 30)
- verification_tokens: Relationship to VerificationToken table
- last_login: Track when user last logged in
```

---

## Registration Flow

### User Registration (Student/Instructor/Admin)

```
1. User fills registration form
   ↓
2. User clicks "Confirm & Create Account" (confirmation modal)
   ↓
3. Backend creates User with status = INACTIVE
   ↓
4. Verification token generated (valid for 30 min or admin-configured time)
   ↓
5. Email sent (if admin configured SMTP)
   ↓
6. WhatsApp message sent (via Twilio sandbox)
   ↓
7. Frontend navigates to VerificationPendingScreen
   ↓
8. User receives email + WhatsApp links
   ↓
9. User clicks verification link
   ↓
10. User account activated (status = ACTIVE)
    ↓
11. User can now log in
```

### Frontend: VerificationPendingScreen

**New component**: `frontend/screens/auth/VerificationPendingScreen.tsx`

Displays:
- ✅ Which email address verification was sent to
- ✅ Which phone number WhatsApp message was sent to
- ✅ Step-by-step instructions (4 steps)
- ✅ Token expiry countdown (e.g., "expires in 30 minutes")
- ✅ "Didn't receive email?" button to resend verification
- ✅ "Back to Login" button
- ✅ Important notes about verification being mandatory

**Key Features:**
- Shows email/WhatsApp icons with checkmarks
- Color-coded statuses (green for sent, yellow for warnings)
- Auto-scrolls to top for visibility
- Responsive design (web and mobile)
- Resend functionality with loading state

---

## Email Configuration (Admin Setup)

### SetupScreen Configuration

When admin creates initial account, they configure:

1. **Gmail Address**: The admin's Gmail account
   - Example: `admin@company.com`
   - Used as FROM address in verification emails

2. **Gmail App Password**: One-time generated password (not Gmail password)
   - Get from Google Account → Security → App passwords
   - Example: `abc def ghi jkl mno`

3. **Link Validity (minutes)**: How long verification link stays active
   - Default: 30 minutes
   - Admin can customize: 15, 30, 60, 120 minutes

4. **Test Email**: Send test email to verify configuration
   - Button to send test email to configured SMTP
   - Confirms Gmail credentials work
   - User gets confirmation message

### SMTP Email Template

Sent to user's email address with:
```
Subject: Verify Your Driving School Account
From: admin@company.com

Body (HTML):
- Welcome message with first name
- Explanation of 2-channel verification
- Verification link
- Expiry time
- Instructions to click link
- Logo and branding
```

Example link: `https://drivealive.co.za/verify-account?token=<secure-token>`

---

## WhatsApp Verification

### Twilio Sandbox Configuration

**Important**: System uses Twilio Sandbox (free tier)

- **Sandbox Number**: +14155238886
- **User Requirement**: User must message the Twilio sandbox number first
- **Message Format**: User sends any message to +14155238886
- **Opt-in Activation**: After user's message, Twilio is authorized to send messages

### WhatsApp Message Sent

```
📱 Message to: +27821234567

Hi Martin! 🎉

Your email has been verified!

Please click the link below to complete account setup:
https://drivealive.co.za/verify-account?token=<secure-token>

Link expires in: 30 minutes

If you didn't create this account, please ignore this message.

- Drive Alive Team
```

---

## Verification Link Handling

### Web & Mobile Deep Linking

**URL Format**: `https://drivealive.co.za/verify-account?token=<secure-token>`

**Deep Linking Config** (App.tsx):
```typescript
linking: {
  prefixes: ['https://drivealive.co.za'],
  config: {
    screens: {
      VerifyAccount: 'verify-account',
    },
  },
}
```

### VerifyAccountScreen Component

Handles:
1. **Web Query Strings**: Extract token from `?token=...`
2. **Mobile Route Params**: Extract token from navigation params
3. **Token Validation**: POST to `/verify/account` endpoint
4. **User Activation**: Account status changes from INACTIVE → ACTIVE
5. **Redirect**: Auto-navigate to login after 3 seconds

**States**:
- ⏳ **Loading**: "Verifying your account..."
- ✅ **Success**: "Account verified! Welcome, [Name]! Redirecting to login..."
- ❌ **Error**: "Verification failed" with troubleshooting tips

---

## Authentication Enforcement

### Login Logic

**File**: `backend/app/services/auth.py` → `authenticate_user()`

```python
# After password verification:
if user.status == UserStatus.INACTIVE:
    raise HTTPException(
        status_code=403,
        detail="Your account is not verified. Please check your email and WhatsApp for the verification link."
    )
elif user.status == UserStatus.SUSPENDED:
    raise HTTPException(
        status_code=403,
        detail="Your account has been suspended. Please contact support."
    )
```

### Login Block for Unverified Users

- ✅ Student cannot log in if INACTIVE
- ✅ Instructor cannot log in if INACTIVE
- ✅ Admin must be manually activated by existing admin
- ✅ Error message guides user to check email/WhatsApp

---

## API Endpoints

### Registration Endpoints

#### POST `/auth/register/student`
**Response**: 
```json
{
  "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
  "user_id": 123,
  "student_id": 456,
  "verification_sent": {
    "email_sent": true,
    "whatsapp_sent": true,
    "expires_in_minutes": 30
  },
  "note": "Account will be activated after verification..."
}
```

#### POST `/auth/register/instructor`
**Response**: Same structure as student (includes `instructor_id` instead)

### Verification Endpoints

#### POST `/verify/account`
**Request**: 
```json
{
  "token": "<secure-token>"
}
```
**Response**:
```json
{
  "message": "Account verified successfully! You can now log in.",
  "status": "verified",
  "user_name": "Martin van Deventer"
}
```

#### POST `/verify/test-email`
**Request**:
```json
{
  "email": "admin@example.com",
  "password": "app-password",
  "recipient": "test@example.com"
}
```
**Response**: Success or failure message

#### GET `/verify/resend?email=user@example.com`
**Response**:
```json
{
  "message": "Verification links have been resent to your email and WhatsApp.",
  "expires_in_minutes": 30
}
```

---

## Database Schema Changes

### Users Table (Updated)

```sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'INACTIVE';
ALTER TABLE users ADD COLUMN smtp_email VARCHAR(255);
ALTER TABLE users ADD COLUMN smtp_password VARCHAR(255);
ALTER TABLE users ADD COLUMN verification_link_validity_minutes INTEGER DEFAULT 30;
ALTER TABLE users ADD COLUMN last_login DATETIME;
```

### Verification Tokens Table (New)

```sql
CREATE TABLE verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);
```

---

## Configuration Files

### Backend Settings (`backend/app/config.py`)

```python
FRONTEND_URL = "https://drivealive.co.za"  # For verification links
TWILIO_ACCOUNT_SID = "..."  # Sandbox account
TWILIO_AUTH_TOKEN = "..."  # Sandbox token
TWILIO_WHATSAPP_NUMBER = "+14155238886"  # Sandbox number
VERIFICATION_TOKEN_EXPIRY_MINUTES = 30  # Default
```

### Frontend Message Config (`frontend/config/messageConfig.json`)

```json
{
  "globalOverride": {
    "enabled": true,
    "defaultDuration": 4000
  },
  "screens": {
    "VerificationPendingScreen": {
      "resendSuccess": 4000,
      "resendError": 5000
    }
  }
}
```

---

## User Experience Examples

### Scenario 1: New Student Registration

```
1. Student opens app → "Choose Account Type"
2. Student selects "Register as Student"
3. Fills form: name, email, phone, ID, learner permit, etc.
4. Clicks "Register" button
5. Confirmation modal appears: "Confirm Registration Details"
6. Reviews all information and clicks "✓ Confirm & Create Account"
7. App shows: "Loading..." (spinner)
8. Backend processes registration, creates INACTIVE user, sends emails/WhatsApp
9. Frontend navigates to VerificationPendingScreen
10. Screen shows:
    - ✉️ "Email Verification sent to: martin@example.com"
    - 💬 "WhatsApp Verification sent to: +27821234567"
    - "Your verification link expires in 30 minutes"
    - 4-step instruction list
    - "Didn't receive email?" resend button
11. Student checks email inbox → clicks verification link
12. Browser opens → VerifyAccountScreen loads verification
13. Success: "Account verified! Welcome, Martin! Redirecting to login..."
14. Auto-redirects to Login screen (3 seconds)
15. Student logs in with email + password
16. ✅ Successfully authenticated, sees StudentHomeScreen
```

### Scenario 2: Resend Verification Link

```
1. Student on VerificationPendingScreen
2. Clicks "🔄 Resend Verification"
3. Button shows "⏳ Resending..." (disabled state)
4. Backend sends email + WhatsApp again
5. Button re-enables
6. Success message: "✅ Verification links resent! Check your email and WhatsApp."
7. Message auto-dismisses after 4 seconds
```

### Scenario 3: Failed Login - Unverified Account

```
1. Student tries to log in before verifying
2. Enters: email: martin@example.com, password: ****
3. Clicks "Log In"
4. Backend authenticates (email + password correct)
5. Backend checks status → INACTIVE
6. Returns error: "Your account is not verified. Please check your email and WhatsApp for the verification link."
7. Error shows in red InlineMessage
8. Student realizes they need to verify first
9. Student checks email/WhatsApp for link
10. Clicks link to verify
11. After verification, logs in successfully
```

### Scenario 4: Admin Configuration (First Setup)

```
1. System is fresh (no admin exists)
2. User opens app → SetupScreen automatically shown
3. Fills form: name, email, phone, address, password
4. Scrolls down to Email Configuration section
5. Enters:
   - Gmail Address: admin@drivealive.co.za
   - Gmail App Password: abc def ghi jkl
   - Link Validity: 30 minutes
   - Test Recipient: admin@drivealive.co.za
6. Clicks "✉️ Send Test Email"
7. Spinner appears during email send
8. Success: "✅ Test email sent successfully to admin@drivealive.co.za"
9. Admin clicks "✓ Confirm & Create Admin Account"
10. Success: "✅ Setup complete! Admin account created. Redirecting to login..."
11. Admin logs in
12. Can now manage verification settings from Admin Dashboard
```

---

## Testing the System

### Manual Testing Checklist

#### Setup Phase
- [ ] Admin creates account with Gmail SMTP credentials
- [ ] Test email successfully sends (check test recipient inbox)
- [ ] Gmail credentials are saved correctly
- [ ] Admin can change link validity and save

#### Student Registration
- [ ] Student completes registration form
- [ ] Confirmation modal appears with all details
- [ ] Student can edit or confirm
- [ ] After confirmation, VerificationPendingScreen shows
- [ ] Screen displays email and phone correctly
- [ ] Email arrives in user's inbox
- [ ] WhatsApp message arrives (if user is opted-in to sandbox)

#### Verification
- [ ] Clicking email link → browser navigates to VerifyAccountScreen
- [ ] Token successfully verified
- [ ] Success message shows user name
- [ ] Auto-redirects to Login
- [ ] User can now log in with email + password

#### Login Enforcement
- [ ] Unverified user tries to log in
- [ ] Gets clear error message about verification
- [ ] Can click link to resend verification
- [ ] After verification, login succeeds

#### Error Handling
- [ ] Expired token shows error on VerifyAccountScreen
- [ ] Invalid token shows error
- [ ] Network error handled gracefully
- [ ] Can resend verification from VerificationPendingScreen

### Debug Mode Testing

**File**: `frontend/config.ts`

```typescript
export const DEBUG_CONFIG = {
  ENABLED: true,  // Auto-fill registration forms
  STUDENT_EMAIL: 'martin@example.com',
  STUDENT_PHONE: '+27821234567',
};
```

With debug enabled:
- Registration forms auto-populate
- Faster testing of verification flow
- Can test with dummy data

---

## Troubleshooting

### Issue: Email Not Sending

**Symptoms**: Registration succeeds but verification_sent.email_sent = false

**Possible Causes**:
1. Admin hasn't configured SMTP settings yet
2. Gmail app password is incorrect
3. Gmail account has 2FA disabled or app password not generated
4. SMTP credentials were cleared

**Solution**:
1. Admin goes to Admin Dashboard
2. Enters correct Gmail address and app password
3. Clicks "Test Email"
4. Verifies email received
5. New registrations will send emails

### Issue: WhatsApp Not Sending

**Symptoms**: WhatsApp message never arrives

**Possible Causes**:
1. User hasn't opted in to Twilio sandbox
   - Users must text "join <keyword>" to +14155238886 first
2. User is in production but sandbox is configured
3. Twilio credentials are invalid

**Solution**:
1. For sandbox testing: User must message Twilio number first
2. Check Twilio console for message logs
3. Verify TWILIO_ACCOUNT_SID and AUTH_TOKEN in settings

### Issue: Verification Link Expired

**Symptoms**: User clicks link after 30+ minutes, gets error

**Possible Causes**:
1. Link validity time passed
2. Unverified account was automatically deleted

**Solution**:
1. User clicks "Resend Verification"
2. New token generated
3. New email/WhatsApp with fresh link

### Issue: User Deleted After Expiry

**Symptoms**: User tries to register again with same email, succeeds

**Expected Behavior**: User account was cleaned up

**Solution**:
1. Background scheduler deletes unverified users after expiry
2. User can register again with same email
3. Gets new verification token

---

## Security Considerations

### Token Security

- ✅ 32-byte cryptographically secure random tokens
- ✅ URL-safe Base64 encoding
- ✅ Stored in database (cannot be recreated)
- ✅ Tokens have hard expiry (15-120 minutes configurable)
- ✅ Can only be used once (marked as used after verification)

### Email Security

- ✅ Gmail app passwords (not account passwords)
- ✅ HTTPS for verification links
- ✅ Link contains unique token (cannot guess)
- ✅ Verification links expire
- ✅ User activity logged with last_login timestamp

### Account Security

- ✅ Passwords hashed with bcrypt
- ✅ Unverified accounts cannot log in (INACTIVE status)
- ✅ Automatic cleanup of unverified accounts
- ✅ Admin can suspend accounts (SUSPENDED status)

### POPIA Compliance

- ✅ User initiated verification (explicit consent)
- ✅ Email/phone only used for verification
- ✅ Data not shared with third parties
- ✅ User can request data deletion
- ✅ Automated cleanup of stale accounts

---

## Migration & Rollout

### For Existing Deployments

Run migration script:
```bash
cd backend
python migrations/add_email_verification_system.py
```

This will:
1. Add status column to users table
2. Add SMTP columns to users table
3. Create verification_tokens table
4. Create indexes

### For Fresh Installations

Migration runs automatically on first app startup.

---

## Future Enhancements

- [ ] SMS verification as alternative/backup to WhatsApp
- [ ] Two-factor authentication (2FA)
- [ ] Email verification rate limiting
- [ ] Biometric verification for mobile
- [ ] Backup verification codes (printed)
- [ ] Account recovery without email/phone
- [ ] Admin dashboard for viewing verification status
- [ ] Bulk resend verification to unverified users
- [ ] Verification analytics and reporting

---

## Support & Contact

For issues or questions:
- Check troubleshooting section above
- Review logs in `backend/logs/verification.log`
- Check Twilio console for WhatsApp delivery status
- Check Gmail sending logs in admin settings

---

**Version**: 1.0  
**Last Updated**: Jan 30, 2026  
**Status**: ✅ Production Ready
