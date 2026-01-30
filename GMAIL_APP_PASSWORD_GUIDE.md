# Gmail App Password Setup Guide

## Issue: Email Test Failed with "Application-specific password required"

The error you received means that `ManniePokkie1@` is NOT a Gmail app password. It's your regular account password.

## Solution: Generate a Gmail App Password

### Steps:

1. **Open Gmail Security Settings**
   - Go to: https://myaccount.google.com/security
   - Or: https://myaccount.google.com/apppasswords (if 2FA is already enabled)

2. **Enable 2-Factor Authentication (if not already done)**
   - Click "2-Step Verification"
   - Follow Google's steps to enable

3. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google generates a 16-character password
   - Example: `abcd efgh ijkl mnop`

4. **Use the Generated Password**
   - Replace `ManniePokkie1@` with the generated app password
   - Keep spaces (or remove them, both work)

### Example:
```
Regular password: ManniePokkie1@       ❌ DON'T USE THIS
Gmail app password: abcd efgh ijkl mnop ✅ USE THIS INSTEAD
```

## For Drive Alive Setup:

When setting up Drive Alive through the SetupScreen:

**Email**: mvdeventer123@gmail.com  
**App Password**: (the 16-character password from Google)  
**Link Validity**: 30 minutes  

## Testing the Configuration:

After getting your app password:

```bash
cd c:\Projects\DRIVE_ALIVE\backend
C:\Projects\DRIVE_ALIVE\backend\venv\Scripts\python.exe send_test_verification.py
```

Then when prompted for credentials, use:
- **Email**: mvdeventer123@gmail.com
- **App Password**: (the 16-character one from Google)

## WhatsApp Setup (Twilio Sandbox):

For WhatsApp to work, you need to:

1. Save Twilio number in WhatsApp: **+14155238886**
2. Send the message: **join friendly-memory** (or the keyword for your account)
3. Wait for Twilio confirmation
4. After that, you can receive verification WhatsApp messages

## Resources:

- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **Twilio Sandbox**: https://www.twilio.com/console/sms/whatsapp-sandbox
- **Gmail 2FA Setup**: https://support.google.com/accounts/answer/185839

## Quick Check:

To verify your Gmail app password works:

```
SMTP Server: smtp.gmail.com
SMTP Port: 587
Email: mvdeventer123@gmail.com
App Password: (16-char generated password)
Encryption: TLS
```

Try connecting with an email client to verify it works before using in Drive Alive.
