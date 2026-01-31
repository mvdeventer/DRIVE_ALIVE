# Twilio Phone Number Database Configuration

## Overview

The Twilio sender phone number is now **stored in the database** and retrieved dynamically for all WhatsApp messages. This allows admins to configure and change the Twilio sender number through the admin settings without modifying environment variables or restarting the server.

## Architecture

### Database Storage
- **Table:** `users`
- **Column:** `twilio_sender_phone_number` (VARCHAR(20), nullable)
- **User Role:** Only ADMIN users have this field populated
- **Default Value:** `+14155238886` (Twilio sandbox number)

### How It Works

1. **Admin Setup**: During initial admin account creation, the Twilio sender number is entered and saved to the database
2. **Global Usage**: All WhatsApp messages retrieve the sender number from the database at send-time
3. **Dynamic Updates**: Admins can change the sender number through Admin Settings
4. **Automatic Fallback**: If no number is configured, defaults to Twilio sandbox `+14155238886`

## Implementation Details

### WhatsApp Service Method

```python
@staticmethod
def get_admin_twilio_sender_phone(db=None) -> str:
    """
    Get the admin's configured Twilio sender phone number from database
    
    Returns:
        str: Admin's Twilio sender phone number in WhatsApp format (whatsapp:+...)
             Returns default sandbox number if not configured
    """
    try:
        # Get database session if not provided
        if db is None:
            from ..database import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        # Query admin user
        from ..models.user import User, UserRole
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if should_close:
            db.close()
        
        # Get sender number from database, fallback to sandbox
        sender_number = admin.twilio_sender_phone_number if admin and admin.twilio_sender_phone_number else "+14155238886"
        
        # Format for WhatsApp
        return f"whatsapp:{sender_number}"
        
    except Exception as e:
        logger.warning(f"Failed to get admin Twilio sender phone: {str(e)}")
        return "whatsapp:+14155238886"  # Default sandbox number
```

### Usage in Message Methods

All WhatsApp message methods now call `get_admin_twilio_sender_phone()` before sending:

```python
def send_message(self, phone: str, message: str) -> bool:
    """Send a generic WhatsApp message"""
    if not self.client:
        return False

    try:
        # Get sender number from database
        from_number = self.get_admin_twilio_sender_phone()
        to_number = self._format_phone_number(phone)
        
        msg = self.client.messages.create(
            body=message,
            from_=from_number,  # Database-stored number
            to=to_number
        )
        logger.info(f"WhatsApp message sent from {from_number} to {phone}: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {str(e)}")
        return False
```

## Admin Configuration

### During Initial Setup (SetupScreen)

1. Admin enters **Twilio Sender Phone Number** (e.g., `+14155238886`)
2. Number is validated (must be in format `+[10-15 digits]`)
3. Number is saved to database: `users.twilio_sender_phone_number`
4. Number is used immediately for all WhatsApp messages

### After Setup (Admin Settings)

1. Navigate to Admin Dashboard → Settings
2. Update **Twilio Sender Phone Number** field
3. Click **Save Settings**
4. Confirmation modal shows the change
5. New number is used immediately (no restart required)

## Validation

All Twilio sender phone numbers are validated with this pattern:

```python
import re

def validate_phone_number(phone: str) -> str:
    """Validate international phone number format"""
    if not phone:
        return None
    
    # Clean spaces, dashes, parentheses
    cleaned = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Validate format: +[10-15 digits]
    if not re.match(r'^\+\d{10,15}$', cleaned):
        raise ValueError(
            f"Invalid phone number format: '{phone}'. "
            "Must be in international format (e.g., +14155238886 or +27123456789)"
        )
    
    return cleaned
```

## Migration

### Database Migration Script

Run this to add the column to existing databases:

```bash
cd backend
python migrations/add_twilio_sender_phone_column.py
```

**Migration Details:**
- Adds `twilio_sender_phone_number` column to `users` table
- Column is nullable (optional)
- Default value: `NULL` (falls back to sandbox number)

## Environment Variables (Deprecated)

The old `TWILIO_WHATSAPP_NUMBER` environment variable is **no longer used** by the application.

**Old Approach (Deprecated):**
```env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**New Approach (Database-Driven):**
- Configured during admin setup
- Stored in database: `users.twilio_sender_phone_number`
- Managed via Admin Settings screen
- No environment variable needed

## Benefits

✅ **Dynamic Configuration**: Change sender number without server restart  
✅ **Admin-Controlled**: Non-technical admins can update settings  
✅ **Single Source of Truth**: One number used globally  
✅ **Validation**: Phone number format validated at input  
✅ **Fallback**: Automatic fallback to sandbox if not configured  
✅ **Persistent**: Survives server restarts and deployments  

## Testing

### Test WhatsApp During Setup

1. Enter your Twilio sender number: `+14155238886`
2. Click **"📧 Send Test WhatsApp"**
3. Check that message is sent from configured number
4. Verify no errors in backend logs

### Test After Setup

1. Login as admin
2. Navigate to Admin Dashboard → Settings
3. Update Twilio sender number
4. Save settings
5. Create a test booking
6. Verify WhatsApp confirmation sent from new number

## Troubleshooting

### Error: "Message cannot have the same To and From"

- **Cause**: Twilio sender number matches recipient phone number
- **Solution**: Use different numbers for sender (Twilio account) and recipient (your phone)

### Error: "Invalid phone number format"

- **Cause**: Phone number not in international format
- **Solution**: Use format `+[country code][number]` (e.g., `+14155238886` or `+27123456789`)

### Messages Not Sending

1. Check Twilio credentials in environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`

2. Verify sender number configured in Admin Settings

3. Check backend logs for detailed error messages

4. For sandbox: Ensure recipient has joined Twilio sandbox first

## Files Modified

**Backend:**
- `backend/app/models/user.py` - Added `twilio_sender_phone_number` column
- `backend/app/services/whatsapp_service.py` - Removed `self.whatsapp_number`, added `get_admin_twilio_sender_phone()`
- `backend/app/schemas/admin.py` - Added validation for phone numbers
- `backend/app/routes/admin.py` - Handle sender number in create/get/update
- `backend/migrations/add_twilio_sender_phone_column.py` - Migration script

**Frontend:**
- `frontend/screens/auth/SetupScreen.tsx` - Added Twilio sender phone input
- `frontend/screens/admin/AdminSettingsScreen.tsx` - Added WhatsApp configuration section

**Documentation:**
- `backend/.env.example` - Updated comments about deprecated env var

## Status

✅ **Complete**: Database-driven Twilio phone number configuration is fully implemented and tested.

**Last Updated:** January 31, 2026
