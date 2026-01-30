# Email & WhatsApp Verification System

## Overview

Complete implementation of email and WhatsApp verification for user registration with the following features:

✅ **Backend Implemented:**
- Email verification tokens (30-minute expiry, configurable by admin)
- Gmail SMTP integration for sending verification emails
- WhatsApp verification messages via Twilio
- Automatic cleanup of unverified accounts after token expiration
- Admin configuration for Gmail credentials and token validity duration
- Test email functionality to verify SMTP setup

⏳ **Frontend Pending:**
- Setup screen email configuration UI
- Verification account screen
- Updated registration flows

---

## Backend Architecture

### Database Schema

**New Table: `verification_tokens`**
```sql
CREATE TABLE verification_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR NOT NULL UNIQUE,
    token_type VARCHAR NOT NULL,  -- "email" or "phone"
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    is_used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Updated `users` Table Columns:**
```sql
ALTER TABLE users ADD COLUMN smtp_email VARCHAR;  -- Admin's Gmail
ALTER TABLE users ADD COLUMN smtp_password VARCHAR;  -- Gmail App Password
ALTER TABLE users ADD COLUMN verification_link_validity_minutes INTEGER DEFAULT 30;
```

### API Endpoints

#### 1. Test Email Configuration
```
POST /verify/test-email
Body: {
  "smtp_email": "admin@gmail.com",
  "smtp_password": "app_password_here",
  "test_recipient": "test@example.com"
}
Response: {
  "success": true,
  "message": "Test email sent successfully"
}
```

#### 2. Verify Account
```
POST /verify/account
Body: {
  "token": "verification_token_from_email_link"
}
Response: {
  "success": true,
  "message": "Account verified successfully! You can now log in.",
  "user_email": "user@example.com",
  "user_name": "John Doe"
}
```

#### 3. Resend Verification
```
GET /verify/resend?email=user@example.com
Response: {
  "success": true,
  "message": "Verification link resent!",
  "email_sent": true,
  "whatsapp_sent": true,
  "expires_in_minutes": 30
}
```

### Services

**EmailService** (`app/services/email_service.py`)
- `send_verification_email()` - Sends HTML email with verification link
- `send_test_email()` - Tests SMTP configuration
- Supports dynamic Gmail credentials (from admin settings)

**VerificationService** (`app/services/verification_service.py`)
- `create_verification_token()` - Generates secure tokens
- `verify_token()` - Validates tokens (checks expiry, usage)
- `mark_as_verified()` - Activates user account
- `send_verification_messages()` - Sends email + WhatsApp
- `delete_unverified_users()` - Auto-cleanup expired tokens

**VerificationCleanupScheduler** (`app/services/verification_cleanup_scheduler.py`)
- Runs every 5 minutes
- Deletes users with expired unverified tokens
- Prevents database bloat from abandoned registrations

---

## Gmail Setup (Admin Configuration)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: "Mail"
3. Select device: "Other (Custom name)" → "Driving School App"
4. Click "Generate"
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Enter in Setup Screen
- **Gmail Address:** `admin@gmail.com`
- **App Password:** `abcdefghijklmnop` (no spaces)
- **Link Validity:** `30` minutes (default, can be changed)

### Step 4: Test Email
- Click "📧 Send Test Email" button
- Check recipient inbox for test message
- If successful, SMTP is configured correctly

---

## Frontend Implementation Guide

### 1. Update SetupScreen.tsx

**Add to FormData interface:**
```typescript
interface FormData {
  // ... existing fields
  smtpEmail: string;         // Gmail address
  smtpPassword: string;      // Gmail app password
  linkValidity: string;      // Minutes (default 30)
  testRecipient: string;     // For testing email
}
```

**Add UI fields (after address field):**
```tsx
{/* Email Configuration Section */}
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>📧 Email Configuration (Optional)</Text>
  <Text style={styles.sectionSubtitle}>
    Configure Gmail SMTP to send verification emails. You can skip this and configure later.
  </Text>
</View>

{/* Gmail Address */}
<View style={styles.formGroup}>
  <Text style={styles.label}>Gmail Address (for sending emails)</Text>
  <TextInput
    style={styles.input}
    placeholder="admin@gmail.com"
    value={formData.smtpEmail}
    onChangeText={(val) => handleChange('smtpEmail', val)}
    keyboardType="email-address"
    autoCapitalize="none"
  />
</View>

{/* Gmail App Password */}
<View style={styles.formGroup}>
  <Text style={styles.label}>Gmail App Password</Text>
  <TextInput
    style={styles.input}
    placeholder="16-character app password"
    value={formData.smtpPassword}
    onChangeText={(val) => handleChange('smtpPassword', val)}
    secureTextEntry={!showSmtpPassword}
    autoCapitalize="none"
  />
  <TouchableOpacity
    onPress={() => setShowSmtpPassword(!showSmtpPassword)}
    style={styles.showPasswordButton}>
    <Text style={styles.showPasswordText}>
      {showSmtpPassword ? '🙈 Hide' : '👁️ Show'}
    </Text>
  </TouchableOpacity>
</View>

{/* Link Validity */}
<View style={styles.formGroup}>
  <Text style={styles.label}>Verification Link Validity (minutes)</Text>
  <TextInput
    style={styles.input}
    placeholder="30"
    value={formData.linkValidity}
    onChangeText={(val) => handleChange('linkValidity', val)}
    keyboardType="numeric"
  />
</View>

{/* Test Email Button */}
{formData.smtpEmail && formData.smtpPassword && (
  <View style={styles.formGroup}>
    <Text style={styles.label}>Test Email Recipient</Text>
    <TextInput
      style={styles.input}
      placeholder="test@example.com"
      value={formData.testRecipient}
      onChangeText={(val) => handleChange('testRecipient', val)}
      keyboardType="email-address"
    />
    <TouchableOpacity
      style={styles.testEmailButton}
      onPress={handleTestEmail}
      disabled={!formData.testRecipient || testingEmail}>
      <Text style={styles.testEmailButtonText}>
        {testingEmail ? '⏳ Sending...' : '📧 Send Test Email'}
      </Text>
    </TouchableOpacity>
  </View>
)}
```

**Add test email handler:**
```typescript
const [testingEmail, setTestingEmail] = useState(false);
const [showSmtpPassword, setShowSmtpPassword] = useState(false);

const handleTestEmail = async () => {
  setTestingEmail(true);
  setErrorMessage('');
  setSuccessMessage('');

  try {
    const response = await fetch('http://localhost:8000/verify/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtp_email: formData.smtpEmail,
        smtp_password: formData.smtpPassword,
        test_recipient: formData.testRecipient,
      }),
    });

    if (response.ok) {
      setSuccessMessage(`✅ Test email sent to ${formData.testRecipient}! Check your inbox.`);
    } else {
      const error = await response.json();
      setErrorMessage(`❌ Test failed: ${error.detail}`);
    }
  } catch (error) {
    setErrorMessage('❌ Network error while testing email');
  } finally {
    setTestingEmail(false);
  }
};
```

**Update confirmAndSubmit to include SMTP fields:**
```typescript
body: JSON.stringify({
  first_name: formData.firstName,
  last_name: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  id_number: formData.idNumber,
  password: formData.password,
  address: formData.address,
  address_latitude: pickupCoordinates?.latitude || -33.9249,
  address_longitude: pickupCoordinates?.longitude || 18.4241,
  smtp_email: formData.smtpEmail || null,
  smtp_password: formData.smtpPassword || null,
  verification_link_validity_minutes: formData.linkValidity ? parseInt(formData.linkValidity) : 30,
}),
```

---

### 2. Create VerifyAccountScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'VerifyAccount'>;

export default function VerifyAccountScreen({ route, navigation }: Props) {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const token = route.params?.token;

  useEffect(() => {
    if (token) {
      verifyAccount(token);
    } else {
      setVerifying(false);
      setErrorMessage('Invalid verification link. No token provided.');
    }
  }, [token]);

  const verifyAccount = async (verificationToken: string) => {
    try {
      const response = await fetch('http://localhost:8000/verify/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigation.replace('Login');
        }, 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || 'Verification failed');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      {verifying ? (
        <>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Verifying your account...</Text>
        </>
      ) : success ? (
        <>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Account Verified!</Text>
          <Text style={styles.successMessage}>
            Your account has been successfully verified. Redirecting to login...
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Text style={styles.helpText}>
            Please register again or contact support if the problem persists.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

---

### 3. Update App.tsx Navigation

Add VerifyAccountScreen to the navigation stack:

```tsx
import VerifyAccountScreen from './screens/auth/VerifyAccountScreen';

// In Navigator:
<Stack.Screen
  name="VerifyAccount"
  component={VerifyAccountScreen}
  options={{ title: 'Verify Account' }}
/>
```

---

### 4. Update Registration Flows (TODO - Not Implemented Yet)

**RegisterStudentScreen.tsx** and **RegisterInstructorScreen.tsx** will need:

1. Create user with `status: "inactive"`
2. Create verification token via new endpoint
3. Send verification email + WhatsApp
4. Show "Check your email/WhatsApp to verify" message
5. Don't allow login until verified

**New Registration Endpoint Behavior:**
```
POST /auth/register/student
POST /auth/register/instructor

Response (when SMTP configured):
{
  "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
  "verification_sent": {
    "email_sent": true,
    "whatsapp_sent": true,
    "expires_in_minutes": 30
  },
  "user_id": 123
}
```

---

## User Flow

### Admin Setup Flow
1. Admin opens app → Setup screen (first run)
2. Fills admin details + Gmail SMTP configuration
3. Clicks "Send Test Email" to verify Gmail setup
4. Confirms admin account creation
5. Admin account created (active immediately, no verification needed)

### Student/Instructor Registration Flow
1. User registers via RegisterStudentScreen/RegisterInstructorScreen
2. Backend creates user with `status: "inactive"`
3. Backend creates verification token (30-minute expiry)
4. Backend sends:
   - **Email:** HTML email with verification link
   - **WhatsApp:** Text message with verification link
5. User receives messages within seconds
6. User clicks verification link → Opens app VerifyAccountScreen
7. App calls `/verify/account` with token
8. Backend validates token and activates user
9. User redirected to Login screen
10. **If user doesn't verify within 30 minutes:**
    - Background scheduler deletes user account
    - User must register again

---

## Email Templates

### Verification Email
- **Subject:** "Verify Your Driving School Account"
- **Content:**
  - Welcome message with user's first name
  - Blue verification button with link
  - Plain text link (for copy/paste)
  - Warning box with expiry time
  - Footer with branding

### Test Email
- **Subject:** "Test Email - Driving School SMTP Configuration"
- **Content:**
  - Success message confirming SMTP works
  - Green success box
  - Instructions for next steps

---

## Security Considerations

✅ **Implemented:**
- Secure random tokens (32 bytes, URL-safe)
- Token expiry (default 30 minutes, configurable)
- One-time use tokens (marked as used after verification)
- HTTPS required for production
- Gmail App Passwords (not plain passwords)
- Automatic cleanup of expired tokens

⚠️ **Important:**
- **Gmail App Passwords** must be used (not account password)
- Store `smtp_password` encrypted in production (currently plaintext)
- Rate limit verification endpoints to prevent abuse
- Log all verification attempts for security auditing

---

## Troubleshooting

### Email Not Sending
1. Check Gmail App Password is correct (16 characters, no spaces)
2. Verify 2-Factor Authentication is enabled on Gmail
3. Check backend logs for SMTP errors
4. Test with `/verify/test-email` endpoint
5. Ensure firewall allows outbound port 587 (SMTP)

### WhatsApp Not Sending
1. Verify Twilio credentials in `.env` (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
2. Check phone number format (+27 for South Africa)
3. Twilio sandbox requires opt-in message first
4. Check Twilio console for message delivery status

### Verification Link Expired
1. User can request new link via `/verify/resend?email=user@example.com`
2. Admin can adjust validity duration in setup (default 30 minutes)
3. Check system clock is synchronized (affects expiry calculation)

### Account Auto-Deleted
1. Verification cleanup runs every 5 minutes
2. Users with expired unverified tokens are deleted
3. User must register again with new email verification

---

## Testing Checklist

- [ ] Run migration: `python migrations/add_email_verification_system.py`
- [ ] Start backend: `.\s.bat`
- [ ] Create admin with Gmail SMTP config
- [ ] Click "Send Test Email" → Check inbox
- [ ] Register student (triggers verification email)
- [ ] Check email inbox for verification link
- [ ] Click verification link → Account activated
- [ ] Try logging in → Success
- [ ] Register another user but don't verify → Wait 30+ minutes → Account deleted
- [ ] Try `/verify/resend` endpoint → New email sent
- [ ] Test with invalid token → Error message
- [ ] Test with expired token → Error message

---

## Migration Status

✅ **Completed:**
- Database migration script created and executed
- New columns added to `users` table
- `verification_tokens` table created with indexes
- All backend services implemented
- Email service with Gmail SMTP support
- WhatsApp integration via Twilio
- Background cleanup scheduler
- API endpoints for test/verify/resend

⏳ **Pending:**
- Frontend SetupScreen email config UI
- Frontend VerifyAccountScreen component
- Update RegisterStudentScreen to send verification
- Update RegisterInstructorScreen to send verification
- Add navigation routes for VerifyAccountScreen
- Update auth service to handle inactive users
- Update login to prevent inactive user login
- Documentation and testing

---

## Files Modified/Created

### Backend
- ✅ `app/models/user.py` - Added smtp_email, smtp_password, verification_link_validity_minutes columns
- ✅ `app/models/verification_token.py` - New model for verification tokens
- ✅ `app/schemas/admin.py` - Added SMTP fields to AdminCreateRequest
- ✅ `app/services/email_service.py` - Added verification + test email methods
- ✅ `app/services/verification_service.py` - New service for verification logic
- ✅ `app/services/verification_cleanup_scheduler.py` - Background cleanup task
- ✅ `app/routes/verification.py` - New endpoints for test/verify/resend
- ✅ `app/routes/setup.py` - Updated to save SMTP config
- ✅ `app/main.py` - Added verification router and cleanup scheduler
- ✅ `migrations/add_email_verification_system.py` - Database migration

### Frontend (Pending)
- ⏳ `screens/auth/SetupScreen.tsx` - Add email config fields and test button
- ⏳ `screens/auth/VerifyAccountScreen.tsx` - New screen for verification
- ⏳ `screens/auth/RegisterStudentScreen.tsx` - Send verification on registration
- ⏳ `screens/auth/RegisterInstructorScreen.tsx` - Send verification on registration
- ⏳ `App.tsx` - Add VerifyAccountScreen to navigation
- ⏳ `services/api/index.ts` - Add testEmail, verifyAccount, resendVerification methods

---

## Next Steps for Developer

1. ✅ Run migration (DONE - columns added successfully)
2. ⏳ Update SetupScreen.tsx with email configuration UI
3. ⏳ Create VerifyAccountScreen.tsx component
4. ⏳ Update registration screens to send verification
5. ⏳ Add navigation routes
6. ⏳ Test complete flow end-to-end
7. ⏳ Document Gmail app password setup for admins
8. ⏳ Deploy and monitor verification emails

