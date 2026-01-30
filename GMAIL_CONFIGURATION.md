# ✅ Application Configuration - Gmail App Password Setup

## Your Verified Credentials

```
Gmail Email:         mvdeventer123@gmail.com
App Password:        zebg rkkp tllh frbs
Phone Number:        +27611154598
Status:              ✅ VERIFIED (Email sent successfully)
Date Configured:     January 30, 2026
```

---

## 🎯 How to Use in Drive Alive App

### Step 1: Start the Application

```bash
cd frontend
npm start
```

The app will load and show the **SetupScreen** (first run initialization).

---

### Step 2: Complete Admin Setup

When you see the SetupScreen, fill in:

#### Personal Information Section:
```
Name:                Martin Deventer
Email:               mvdeventer123@gmail.com
Phone:               +27611154598
Password:            [Enter secure password]
Confirm Password:    [Repeat password]
Address:             [Your address]
GPS Coordinates:     [Will auto-fill from location button]
```

#### Email Configuration Section:
```
Gmail Email:         mvdeventer123@gmail.com
App Password:        zebg rkkp tllh frbs
Link Validity:       30 (minutes)

[✉️ Send Test Email]  ← Click to verify it works
```

---

### Step 3: Verify Email Configuration

1. Click **[✉️ Send Test Email]** button
2. A test email will be sent to `mvdeventer123@gmail.com`
3. You should see: ✅ **Email sent successfully!**
4. Check your inbox (or spam folder) for the test email

---

### Step 4: Create Admin Account

1. Review confirmation modal showing all entered data
2. Click **[✓ Confirm & Create Admin Account]**
3. Admin account created successfully
4. System redirects to login screen

---

### Step 5: System Ready

Your application is now configured to:
- ✅ Send verification emails via Gmail SMTP
- ✅ Create verification tokens (30 min expiry)
- ✅ Auto-cleanup unverified users
- ✅ Block unverified users from logging in
- ✅ Send WhatsApp notifications (when enabled)

---

## 🔐 How Credentials Are Used

### When Registering (Student/Instructor):

1. User fills registration form
2. Clicks "Confirm & Create Account"
3. ✅ Account created as INACTIVE
4. ✅ Verification token generated
5. ✅ **EmailService uses your Gmail credentials to send:**
   ```
   From:    mvdeventer123@gmail.com
   Subject: Verify Your Driving School Account
   Link:    https://drivealive.co.za/verify-account?token=...
   ```
6. ✅ WhatsApp also sent (after sandbox opt-in)
7. ✅ User sees VerificationPendingScreen
8. ✅ User clicks email link to verify
9. ✅ Account activated (INACTIVE → ACTIVE)
10. ✅ User can now log in

---

## 🔒 Security Features

✅ **Credentials stored securely** in admin user record  
✅ **Never exposed in frontend** code  
✅ **Only admin can change** via SetupScreen (password-protected)  
✅ **Used only for verification emails** (not for other communications)  
✅ **30-minute token expiry** (auto-cleanup)  
✅ **HTTPS only** in production  

---

## 📊 What Happens Behind the Scenes

```python
# When user registers:

1. EmailService receives credentials from admin user:
   EmailService(
       smtp_email='mvdeventer123@gmail.com',
       smtp_password='zebg rkkp tllh frbs'
   )

2. Generates secure verification token:
   token = secrets.token_urlsafe(32)  # 32-byte random token

3. Sends email via Gmail SMTP:
   to_email = user_email
   subject = "Verify Your Driving School Account"
   body = f"Click here: https://drivealive.co.za/verify-account?token={token}"

4. Stores token in database:
   verification_token.token = hashed_token
   verification_token.user_id = user.id
   verification_token.expires_at = datetime.now() + 30 min

5. User receives email and clicks link

6. System validates token:
   - Token exists in database
   - Token not expired (< 30 min)
   - Token not already used

7. Activates account:
   user.status = 'ACTIVE'
   verification_token.verified_at = datetime.now()

8. User can now log in successfully
```

---

## 🔄 Testing the Configuration

### Quick Test Steps:

1. ✅ **Email Configuration Test**
   - Click [✉️ Send Test Email] in SetupScreen
   - Result: ✅ Email sent to mvdeventer123@gmail.com

2. ✅ **Registration Flow Test**
   - Register as Student with test email/phone
   - See VerificationPendingScreen
   - Check inbox for verification email
   - Click verification link
   - Account activated
   - Log in successfully

3. ✅ **Login Blocking Test**
   - Try to log in BEFORE clicking verification link
   - Result: ❌ Account not verified error

4. ✅ **WhatsApp Test** (Optional)
   - Message +14155238886 with "join friendly-memory"
   - Register as Student
   - Should also receive WhatsApp message

---

## ⚠️ Important Notes

### About Your App Password:
- Generated from Google Account: `myaccount.google.com/apppasswords`
- Different from your Gmail password
- 16 characters: `zebg rkkp tllh frbs`
- Only works for SMTP authentication
- Never share this password

### If Email Not Received:
1. Check spam/junk folder
2. Check sender is `mvdeventer123@gmail.com`
3. Check token hasn't expired (30 minutes)
4. Click "Resend Verification" in app
5. Try registering again

### Verification Link Expiry:
- Default: 30 minutes
- Can change in SetupScreen (15-120 min recommended)
- After expiry: Account deleted, must register again
- Unverified accounts auto-delete by scheduler

### Token Security:
- Tokens stored hashed in database (cannot retrieve plaintext)
- Single-use only (deleted after verification)
- Time-limited (30 minutes default)
- URL-safe characters only

---

## 🚀 You're Ready!

Your application is now fully configured with:
- ✅ Email: mvdeventer123@gmail.com
- ✅ App Password: zebg rkkp tllh frbs
- ✅ Phone: +27611154598
- ✅ Status: VERIFIED & TESTED

Start the app and complete the SetupScreen to activate your verification system!

---

## 📞 Support Reference

For detailed information, see:
- `VERIFICATION_SYSTEM_COMPLETE.md` - Full system documentation
- `VERIFICATION_QUICK_START.txt` - Quick reference guide
- `SETUP_INTEGRATION_GUIDE.md` - Setup flow details
- `VERIFICATION_SYSTEM_GUIDE.md` - Technical implementation details

---

**Configuration Date**: January 30, 2026  
**Status**: ✅ READY TO USE  
**Next Action**: Start app and complete SetupScreen
