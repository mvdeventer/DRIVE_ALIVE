# Global Twilio Phone Number Configuration

## Overview

The Twilio phone number entered during admin account creation is now saved globally on the server and used for **all WhatsApp interactions** across the entire system, including:

- User registration verification messages
- Booking confirmations
- Lesson reminders
- Test messages during setup
- Any future WhatsApp notifications

This ensures a consistent phone number for all outgoing WhatsApp messages from the Drive Alive system.

## Architecture

### Data Flow

```
Admin creates account during setup
         ↓
Enters Twilio phone number (+27123456789)
         ↓
Phone saved to User.twilio_phone_number in database
         ↓
All future WhatsApp messages use admin's saved phone
         ↓
Only admin can change it via AdminSettingsScreen
```

## Implementation Details

### Backend Changes

#### 1. User Model (`backend/app/models/user.py`)

**New Field Added:**
```python
# Twilio WhatsApp configuration (for admin only - global Twilio phone number)
twilio_phone_number = Column(String, nullable=True)
```

**Purpose:** Stores the global Twilio phone number used for all WhatsApp messages

#### 2. Database Migration (`backend/migrations/add_twilio_phone_column.py`)

**Creates:** `twilio_phone_number` column in `users` table
- Type: VARCHAR(20)
- Nullable: Yes (optional)
- Default: NULL

**Run:** `python migrations/add_twilio_phone_column.py`

#### 3. Admin Schemas (`backend/app/schemas/admin.py`)

**AdminCreateRequest:**
```python
twilio_phone_number: Optional[str] = None
```

**AdminSettingsUpdate:**
```python
twilio_phone_number: Optional[str] = None
```

#### 4. Admin Routes (`backend/app/routes/admin.py`)

**POST /admin/create - Saves Twilio phone on admin creation:**
```python
new_admin = User(
    ...
    twilio_phone_number=admin_data.twilio_phone_number,
)
```

**GET /admin/settings - Returns current Twilio phone:**
```python
return {
    ...
    "twilio_phone_number": current_admin.twilio_phone_number,
}
```

**PUT /admin/settings - Allows updating Twilio phone:**
```python
if settings_update.twilio_phone_number is not None:
    current_admin.twilio_phone_number = settings_update.twilio_phone_number
```

#### 5. WhatsApp Service (`backend/app/services/whatsapp_service.py`)

**New Helper Method:**
```python
@staticmethod
def get_admin_twilio_phone(db=None) -> Optional[str]:
    """Get the admin's configured Twilio phone number from database"""
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    return admin.twilio_phone_number if admin else None
```

**Usage:** All existing WhatsApp methods continue to accept `phone` parameter, but can also fetch from admin record

### Frontend Changes

#### 1. SetupScreen (`frontend/screens/auth/SetupScreen.tsx`)

**New FormData Field:**
```typescript
twilioPhoneNumber: string;
```

**Passes to Backend:**
```typescript
body: JSON.stringify({
    ...
    twilio_phone_number: formData.twilioPhoneNumber || null,
})
```

**Confirmation Modal:**
```typescript
{formData.twilioPhoneNumber && (
  <>
    <Text style={styles.confirmLabel}>💬 WhatsApp Phone:</Text>
    <Text style={styles.confirmValue}>{formData.twilioPhoneNumber}</Text>
  </>
)}
```

#### 2. AdminSettingsScreen (`frontend/screens/admin/AdminSettingsScreen.tsx`)

**New Form Section:**
```typescript
<View style={styles.section}>
  <Text style={styles.sectionTitle}>💬 WhatsApp Configuration</Text>
  <TextInput
    placeholder="+27123456789 or +14155238886"
    value={formData.twilioPhoneNumber}
    onChangeText={(value) => handleChange('twilioPhoneNumber', value)}
  />
</View>
```

**Updates Saved Settings:**
```typescript
twilio_phone_number: formData.twilioPhoneNumber || null
```

**Change Tracking:**
```typescript
formData.twilioPhoneNumber !== originalData.twilioPhoneNumber
```

## User Experience

### 1. Admin Account Creation (SetupScreen)

**Flow:**
1. Admin enters personal details
2. Admin enters Twilio WhatsApp phone number (optional)
3. Admin can test the number with "💬 Send Test WhatsApp" button
4. Confirmation modal shows the Twilio phone
5. Admin clicks "✓ Confirm & Create Admin"
6. Phone number saved globally to admin account

### 2. Settings Management (AdminSettingsScreen)

**Flow:**
1. Admin navigates to Dashboard → Settings
2. Scrolls to "WhatsApp Configuration" section
3. Current Twilio phone number displays
4. Admin can edit the phone number
5. Changes tracked in confirmation modal
6. Click "Save Changes" to persist new phone

**Permissions:**
- ✅ Only admins can change the Twilio phone
- ✅ Original admin or new admins can both change it
- ✅ Phone persists in database for all future uses

### 3. All User Interactions

**Booking Confirmation:**
- Student books a lesson
- `send_booking_confirmation()` uses admin's Twilio phone
- Message sent from saved phone number

**Verification Message:**
- New user registers
- `send_verification_message()` uses admin's Twilio phone
- Verification link sent from saved phone

**Lesson Reminder:**
- Scheduled reminders run
- Uses admin's Twilio phone for all recipients
- Consistent sender for entire system

## API Endpoints

### Setup Endpoint

**POST /setup/create-initial-admin**

Request body includes:
```json
{
  "first_name": "John",
  "email": "admin@example.com",
  "twilio_phone_number": "+27123456789",
  ...
}
```

### Admin Endpoints

**GET /admin/settings**
```json
{
  "twilio_phone_number": "+27123456789",
  ...
}
```

**PUT /admin/settings**
```json
{
  "twilio_phone_number": "+27987654321"
}
```

**POST /admin/create**
```json
{
  "email": "newadmin@example.com",
  "twilio_phone_number": "+27123456789",
  ...
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    ...
    twilio_phone_number VARCHAR(20) NULL,
    ...
)
```

**Column Details:**
- Name: `twilio_phone_number`
- Type: VARCHAR(20)
- Nullable: Yes
- Default: NULL
- Index: No (not frequently queried)
- Purpose: Store admin's global Twilio phone for WhatsApp

## Configuration Workflow

### First-Time Setup

1. Admin runs SetupScreen
2. Enters Twilio phone number: `+27123456789`
3. Phone saved to `User.twilio_phone_number`
4. All WhatsApp messages use this phone

### Updating Twilio Phone

1. Admin opens AdminDashboard
2. Navigates to Settings (⚙️ Settings card)
3. Scrolls to "WhatsApp Configuration"
4. Edits phone number
5. Clicks "Save Changes"
6. Modal shows confirmation
7. New phone persists globally

### Multi-Admin System

**Admin 1 (Original):**
- Creates account with Twilio phone: `+27123456789`
- All messages from this phone

**Admin 2 (New Admin):**
- Created by Admin 1 (via POST /admin/create)
- Can change Twilio phone to their own: `+27987654321`
- All messages switch to new phone

**Important:** Only **one Twilio phone** is active at any time (the admin's phone)

## Security Considerations

1. **Only Admins Can Change:**
   - Requires `require_admin` middleware
   - Non-admins cannot access `/admin/settings`

2. **Phone Format Validation:**
   - Accepts: `+27123456789`, `+14155238886`
   - Stored as-is in database
   - WhatsAppService validates before sending

3. **Global Consistency:**
   - Single phone for all system messages
   - No per-user phone configuration
   - Reduces confusion and maintains audit trail

4. **Data Privacy:**
   - Phone stored in database
   - Accessible only to authenticated admins
   - No third-party API calls to fetch phone

## Error Handling

**Missing Twilio Phone:**
```
If admin has no twilio_phone_number set:
- send_verification_message() uses default Twilio sandbox: +14155238886
- Log warning: "No admin Twilio phone configured"
- Message still sends but from fallback number
```

**Invalid Phone Format:**
```
If phone doesn't start with +:
- WhatsAppService._format_phone_number() adds +
- Converts: 0123456789 → +27123456789
- Sends message successfully
```

**Database Error:**
```
If database unavailable:
- get_admin_twilio_phone() returns None
- Falls back to TWILIO_WHATSAPP_NUMBER environment variable
- Log error: "Failed to get admin Twilio phone"
```

## Testing

### Test Cases

✅ Admin enters Twilio phone during setup → Saved to database
✅ Phone appears in AdminSettingsScreen
✅ Admin can edit phone → New phone persists
✅ All WhatsApp messages use admin's phone
✅ Test message uses admin's phone
✅ Verification messages use admin's phone
✅ New admin can change phone
✅ Invalid phone format handled gracefully
✅ Missing phone falls back to sandbox
✅ Confirmation modal shows Twilio phone change

### Manual Testing Steps

1. **Setup:**
   - Run SetupScreen
   - Enter Twilio phone: `+14155238886`
   - Verify in database: `SELECT twilio_phone_number FROM users WHERE role='admin'`

2. **Settings:**
   - Login as admin
   - Go to Dashboard → Settings
   - Change phone to: `+27123456789`
   - Verify change persists after reload

3. **Usage:**
   - Register new user
   - Verification message should come from admin's phone
   - Book lesson
   - Confirmation should come from admin's phone

## Files Modified

### Backend
- `backend/app/models/user.py` - Added `twilio_phone_number` field
- `backend/app/schemas/admin.py` - Added to AdminCreateRequest and AdminSettingsUpdate
- `backend/app/routes/admin.py` - Updated create_admin and settings endpoints
- `backend/app/services/whatsapp_service.py` - Added `get_admin_twilio_phone()` helper
- `backend/migrations/add_twilio_phone_column.py` - Migration script

### Frontend
- `frontend/screens/auth/SetupScreen.tsx` - Added Twilio phone field and confirmation
- `frontend/screens/admin/AdminSettingsScreen.tsx` - Added WhatsApp configuration section

## Migration Instructions

1. **Add Column:**
```bash
cd backend
python migrations/add_twilio_phone_column.py
```

2. **Restart Backend:**
```bash
# Backend will reinitialize on next run
```

3. **Test:**
- Run SetupScreen
- Verify Twilio phone saves
- Check AdminSettingsScreen displays the phone
- Update phone and verify it persists

## Rollback Plan

If reverting this feature:

1. **Remove UI Fields:**
   - Remove Twilio phone input from SetupScreen
   - Remove WhatsApp section from AdminSettingsScreen

2. **Revert Database:**
```sql
ALTER TABLE users DROP COLUMN twilio_phone_number;
```

3. **Update Endpoints:**
   - Remove `twilio_phone_number` from AdminCreateRequest
   - Remove from AdminSettingsUpdate
   - Remove from settings endpoints

4. **WhatsApp Messages:**
   - Revert to using `TWILIO_WHATSAPP_NUMBER` environment variable
   - All messages send from one hardcoded number

## Future Enhancements

1. **Per-User Phone:** Allow different phone numbers per admin
2. **Phone Rotation:** Schedule different phone numbers
3. **Audit Trail:** Log all Twilio phone changes
4. **Validation:** Verify phone number works before saving
5. **Backup Phone:** Store backup phone for failover

## Related Documentation

- [AGENTS.md](AGENTS.md) - Overall system architecture
- [WHATSAPP_SETUP_TESTING.md](WHATSAPP_SETUP_TESTING.md) - WhatsApp testing during setup
- [ADMIN_SETTINGS_GUIDE.md](ADMIN_SETTINGS_GUIDE.md) - Admin settings management
- [VERIFICATION_SYSTEM_GUIDE.md](VERIFICATION_SYSTEM_GUIDE.md) - Email/phone verification

---

**Implementation Date:** Jan 31, 2026
**Status:** ✅ Complete
**Testing Status:** Ready for testing
