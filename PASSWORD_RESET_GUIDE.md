# Password Reset System - Implementation Guide

## Overview

Email-based password reset system for Drive Alive app.

## Features Implemented

### Backend (FastAPI)

✅ **Models:**

- `PasswordResetToken` model with token generation and validation
- Relationship to User model

✅ **API Endpoints:**

- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

✅ **Email Service:**

- SMTP email sending with HTML templates
- Password reset link generation
- 1-hour token expiration

### Frontend (React Native + Web)

✅ **Screens:**

- `ForgotPasswordScreen` - Email input form
- `ResetPasswordScreen` - New password form with token
- Updated `LoginScreen` with "Forgot Password?" link

✅ **Navigation:**

- Routes added to App.tsx
- Deep linking support for reset tokens

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
python run_password_reset_migration.py
```

### 2. Configure Email (Optional)

Add to `backend/.env`:

```env
# Gmail SMTP (recommended for testing)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@drivealive.com

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:8081
```

**Gmail App Password:**

1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Create App Password (select "Mail" and "Other")
4. Use generated password in SMTP_PASSWORD

### 3. Test Without Email (Development)

If SMTP is not configured:

- Reset tokens are printed to console
- Copy token from logs: `http://localhost:8081/reset-password?token=XXXXX`

## User Flow

1. **Forgot Password:**
   - User clicks "Forgot Password?" on Login screen
   - Enters email address
   - Receives email with reset link (or token in console)

2. **Reset Password:**
   - User clicks link in email (or manually navigates with token)
   - Enters new password (min 6 characters)
   - Confirms password
   - Redirected to login with new credentials

3. **Security:**
   - Tokens expire after 1 hour
   - One-time use (marked as used after reset)
   - Email enumeration prevention (always returns success)
   - Old tokens deleted when new one is requested

## Testing

### Test Flow:

```bash
# 1. Start backend
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload

# 2. Start frontend
cd frontend
npx expo start

# 3. Test forgot password:
# - Open login screen
# - Click "Forgot Password?"
# - Enter: student1@test.com (or any user email)
# - Check console for reset token
# - Navigate to: http://localhost:8081/reset-password?token=TOKEN
# - Enter new password
# - Login with new credentials
```

### API Testing (Postman/cURL):

```bash
# Request reset
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@test.com"}'

# Reset password (use token from console)
curl -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_HERE","new_password":"newpass123"}'
```

## Files Created/Modified

### Backend:

- ✅ `app/models/password_reset.py` - Token model
- ✅ `app/services/email_service.py` - SMTP email sender
- ✅ `app/routes/auth.py` - Added forgot/reset endpoints
- ✅ `app/schemas/user.py` - Added request schemas
- ✅ `app/config.py` - Added SMTP config
- ✅ `run_password_reset_migration.py` - Migration script

### Frontend:

- ✅ `screens/auth/ForgotPasswordScreen.tsx` - Email input
- ✅ `screens/auth/ResetPasswordScreen.tsx` - Password reset
- ✅ `screens/auth/LoginScreen.tsx` - Added forgot link
- ✅ `App.tsx` - Added navigation routes

## Production Deployment

### Email Service Alternatives:

- **Gmail** (free, rate limited)
- **SendGrid** (free tier: 100 emails/day)
- **AWS SES** (pay-as-you-go, reliable)
- **Mailgun** (free tier available)

### Security Checklist:

- [ ] Use HTTPS in production
- [ ] Configure FRONTEND_URL to production domain
- [ ] Set strong SMTP credentials
- [ ] Enable rate limiting on endpoints
- [ ] Monitor reset request abuse
- [ ] Log all reset attempts

## Troubleshooting

**Emails not sending:**

- Check SMTP credentials in .env
- Verify Gmail App Password (not regular password)
- Check firewall allows port 587
- View console for error messages

**Token invalid/expired:**

- Tokens expire after 1 hour
- Request new reset link
- Check timezone settings

**Navigation issues:**

- Clear browser cache
- Restart Expo dev server
- Check deep linking configuration

## Future Enhancements

- [ ] SMS-based reset (Twilio integration)
- [ ] Rate limiting per IP/email
- [ ] Admin panel to view reset requests
- [ ] Multi-language email templates
- [ ] Password strength meter
