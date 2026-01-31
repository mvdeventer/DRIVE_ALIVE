# Test Store-Retrieve-Send Validation System

## Overview

The test email and test WhatsApp endpoints now validate the complete database storage and retrieval cycle by:
1. **Storing** configuration values in the database
2. **Retrieving** configuration values from the database
3. **Sending** test messages using the retrieved values

This ensures that the configuration is correctly persisted and can be retrieved for use in production.

## Implementation Details

### Test Email Endpoint

**Endpoint:** `POST /verify/test-email`

**Request Body:**
```json
{
  "smtp_email": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "test_recipient": "recipient@example.com",
  "verification_link_validity_minutes": 30
}
```

**Process:**
1. **Store**: Updates admin's `smtp_email`, `smtp_password`, and `verification_link_validity_minutes` in database
2. **Retrieve**: Fetches these values back from the database
3. **Send**: Uses retrieved credentials to send test email

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully to recipient@example.com",
  "stored_in_db": true,
  "retrieved_from_db": true
}
```

### Test WhatsApp Endpoint

**Endpoint:** `POST /verify/test-whatsapp`

**Request Body:**
```json
{
  "phone": "+27123456789",
  "twilio_sender_phone_number": "+14155238886"
}
```

**Process:**
1. **Store**: Updates admin's `twilio_phone_number` and `twilio_sender_phone_number` in database
2. **Retrieve**: Fetches these values back from the database
3. **Send**: Uses retrieved sender number to send test WhatsApp to retrieved recipient number

**Response:**
```json
{
  "success": true,
  "message": "Test WhatsApp message sent successfully to +27123456789",
  "phone": "+27123456789",
  "sender": "whatsapp:+14155238886",
  "stored_in_db": true,
  "retrieved_from_db": true
}
```

## Frontend Integration

### SetupScreen Updates

**Test Email Handler:**
```typescript
const handleTestEmail = async () => {
  const response = await fetch('http://localhost:8000/verify/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smtp_email: formData.smtpEmail,
      smtp_password: formData.smtpPassword,
      test_recipient: formData.testRecipient,
      verification_link_validity_minutes: parseInt(formData.verificationLinkValidityMinutes) || 30,
    }),
  });
  
  const data = await response.json();
  const storedMsg = data.stored_in_db 
    ? ' (Config saved to database ✅)' 
    : ' (Not stored - admin account will be created next)';
  setSuccessMessage(`✅ ${data.message}${storedMsg}`);
};
```

**Test WhatsApp Handler:**
```typescript
const handleTestWhatsApp = async () => {
  const response = await fetch('http://localhost:8000/verify/test-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: formData.twilioPhoneNumber,
      twilio_sender_phone_number: formData.twilioSenderPhoneNumber,
    }),
  });
  
  const data = await response.json();
  const storedMsg = data.stored_in_db 
    ? ' (Config saved to database ✅)' 
    : ' (Not stored - admin account will be created next)';
  setSuccessMessage(`✅ WhatsApp message sent!${storedMsg} Check your phone.`);
};
```

## User Experience

### During Initial Setup (No Admin Exists)

**Behavior:**
- Values are **NOT** stored in database (no admin account exists yet)
- Test uses provided values directly
- Success message shows: "(Not stored - admin account will be created next)"

**Why:**
- Admin account doesn't exist yet during initial setup
- Values will be stored when admin confirms account creation
- Test still validates that credentials work

### After Admin Account Exists

**Behavior:**
- Values **ARE** stored in database immediately
- Test retrieves values from database before sending
- Success message shows: "(Config saved to database ✅)"

**Why:**
- Admin account exists in database
- Full store → retrieve → send cycle can be validated
- Changes persist immediately (no restart needed)

## Validation Benefits

### 1. Database Storage Verification
✅ Confirms values are correctly saved to database  
✅ Validates database schema and constraints  
✅ Ensures no data loss during storage  

### 2. Database Retrieval Verification
✅ Confirms values can be retrieved from database  
✅ Validates query logic works correctly  
✅ Ensures data integrity after retrieval  

### 3. End-to-End Validation
✅ Full cycle: input → store → retrieve → use  
✅ Same process used in production  
✅ Catches configuration issues early  

## Test Message Updates

### Email Test Message
```
Subject: Drive Alive Email Configuration Test

Your email configuration is working correctly!

This test validates:
✅ Gmail SMTP credentials are correct
✅ Email configuration stored in database
✅ Email configuration retrieved from database
✅ Emails can be sent using stored configuration

You're all set for sending verification emails.
```

### WhatsApp Test Message
```
🎉 Drive Alive WhatsApp Test

Your Twilio WhatsApp configuration is working correctly!

✅ Configuration stored in database
✅ Configuration retrieved from database
✅ Test message sent successfully

You're all set to receive booking confirmations and reminders.
```

## Error Handling

### No Admin Account During Setup
- **Scenario**: Testing during initial setup before admin creation
- **Behavior**: Uses provided values, doesn't store
- **Message**: "No admin account exists yet. Testing with provided credentials without storing."

### Invalid Phone Format
- **Scenario**: Phone number not in international format
- **Error**: "Invalid phone number format: '+1234'. Must be in international format (e.g., +27123456789)"

### Sender = Recipient
- **Scenario**: Twilio sender number same as recipient phone
- **Error**: "Cannot send test message to the Twilio sender number itself. Recipient phone must be different."

### Email Credentials Invalid
- **Scenario**: Wrong Gmail password or app password
- **Error**: "Failed to send test email. Please check your Gmail credentials and ensure 'App Passwords' is enabled."

## Database Schema

### Users Table Fields Updated

```sql
-- Email configuration
smtp_email VARCHAR(255)
smtp_password VARCHAR(255)
verification_link_validity_minutes INTEGER DEFAULT 30

-- WhatsApp configuration
twilio_sender_phone_number VARCHAR(20)  -- Twilio sender (FROM)
twilio_phone_number VARCHAR(20)         -- Admin's phone (TO for tests)
```

## Testing Workflow

### 1. Initial Setup (First Time)

```
1. Admin fills in setup form
2. Admin clicks "📧 Send Test Email"
   → Email config NOT stored (no admin exists)
   → Test email sent using provided credentials
   → Message: "(Not stored - admin account will be created next)"

3. Admin clicks "💬 Send Test WhatsApp"
   → Twilio config NOT stored (no admin exists)
   → Test WhatsApp sent using provided credentials
   → Message: "(Not stored - admin account will be created next)"

4. Admin confirms and creates account
   → ALL values stored to database
   → Admin account created with verified configuration
```

### 2. Admin Settings Update (After Setup)

```
1. Admin navigates to Admin Dashboard → Settings
2. Admin updates email or Twilio configuration
3. Admin clicks test button
   → Values STORED in database immediately
   → Values RETRIEVED from database
   → Test message sent using retrieved values
   → Message: "(Config saved to database ✅)"

4. Changes take effect immediately (no restart)
```

## Files Modified

**Backend:**
- `backend/app/routes/verification.py`
  - Updated `TestEmailRequest` schema (added `verification_link_validity_minutes`)
  - Updated `TestWhatsAppRequest` schema (added `twilio_sender_phone_number`)
  - Updated `test_email_configuration()` endpoint (store → retrieve → send)
  - Updated `test_whatsapp_configuration()` endpoint (store → retrieve → send)

**Frontend:**
- `frontend/screens/auth/SetupScreen.tsx`
  - Updated `handleTestEmail()` to send `verification_link_validity_minutes`
  - Updated `handleTestWhatsApp()` to send `twilio_sender_phone_number`
  - Added database storage status messages

**Documentation:**
- Created: `TEST_STORE_RETRIEVE_VALIDATION.md` (this file)

## Status

✅ **Complete**: Test endpoints now validate full database store → retrieve → send cycle  
✅ **Tested**: Email and WhatsApp test endpoints working correctly  
✅ **Production-Ready**: Configuration changes take effect immediately  

**Last Updated:** January 31, 2026
