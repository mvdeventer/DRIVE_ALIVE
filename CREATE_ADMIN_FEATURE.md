# Create Admin Feature - Implementation Guide

## Overview

This feature allows existing admins to create new admin accounts through the admin dashboard. Each new admin can have different email, ID number, name, surname, and contact information.

---

## Backend Implementation ✅

### Endpoint Details

**Route:** `POST /admin/create`

**Authentication:** Requires existing admin privileges (via `require_admin` middleware)

**Location:** `backend/app/routes/admin.py` (lines 36-130)

**Request Schema:** `AdminCreateRequest` (defined in `backend/app/schemas/admin.py`)

### Request Body

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone": "0611154598",  // Auto-formatted to +27611154598
  "id_number": "9001015009088",
  "address": "456 Oak Street, Cape Town",
  "address_latitude": -33.9249,
  "address_longitude": 18.4241,
  "password": "SecurePass123",
  "smtp_email": "jane@gmail.com",
  "smtp_password": "xxxx xxxx xxxx xxxx",
  "verification_link_validity_minutes": 30,
  "twilio_sender_phone_number": "+27123456789",
  "twilio_phone_number": "0611154599"
}
```

### Response

**Success (201 Created):**
```json
{
  "id": 2,
  "email": "jane@example.com",
  "role": "ADMIN",
  "status": "ACTIVE",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+27611154598",
  "created_at": "2026-01-31T10:30:00Z"
}
```

**Errors:**

- **400 Bad Request:** Email already has admin privileges
- **401 Unauthorized:** Incorrect password (for existing email trying to add admin role)
- **403 Forbidden:** Not authenticated as admin
- **422 Unprocessable Content:** Invalid phone format (should be auto-fixed by validators)

### Phone Number Auto-Formatting

All phone numbers are automatically formatted by Pydantic validators in `backend/app/schemas/admin.py`:

**Format Conversions:**
- `0611154598` → `+27611154598` (Local SA format)
- `27611154598` → `+27611154598` (International without +)
- `+27611154598` → `+27611154598` (Already formatted)

**Validator Function:** `validate_phone_number()` (lines 14-32 in admin.py schemas)

**Applied To:**
- `phone`
- `twilio_sender_phone_number`
- `twilio_phone_number`

### Global Settings Architecture ✅

**Email & WhatsApp Configuration:**
- ✅ Settings are GLOBAL (stored on the first admin)
- ✅ All admins share the same email/WhatsApp configuration
- ✅ When ANY admin updates settings, it affects ALL admins
- ✅ Ensures system-wide consistency

**GET /admin/settings Endpoint:**
- Returns GLOBAL settings from first admin (lowest user ID with ADMIN role)
- Used by all screens: CreateAdminScreen, AdminSettingsScreen, SetupScreen
- All admins retrieve the same settings

**PUT /admin/settings Endpoint:**
- Updates GLOBAL settings on first admin
- ANY admin can change settings
- Changes affect ALL admins system-wide
- Useful for multi-admin teams

**Settings Stored Globally:**
- `smtp_email` - Gmail address
- `smtp_password` - Gmail app password
- `verification_link_validity_minutes` - Link expiry time
- `twilio_sender_phone_number` - WhatsApp sender phone
- `twilio_phone_number` - Admin test phone
- `backup_interval_minutes` - Backup frequency
- `retention_days` - Backup retention
- `auto_archive_after_days` - Auto-archive delay

### Multi-Role Support

If the email already exists:
- User must provide correct password
- System verifies password matches existing account
- Admin role added to existing user (INACTIVE/ACTIVE → ADMIN)
- Prevents duplicate admin roles (returns 400 error)

If email is new:
- New User record created with role=ADMIN
- Status set to ACTIVE immediately
- All fields saved to database

### Automatic Backup

After successful admin creation, the system automatically creates a backup file:

**Backup Filename:** `role_creation_admin_{user_id}_{timestamp}.json`

**Location:** `backend/backups/`

**Triggered By:** `backup_scheduler.create_backup()` (lines 89-96)

---

## Frontend Implementation ✅

### Screen: CreateAdminScreen

**Location:** `frontend/screens/admin/CreateAdminScreen.tsx`

**Features:**
- ✅ Complete admin registration form
- ✅ Personal information section (name, email, phone, ID)
- ✅ Security section (password with show/hide)
- ✅ **Optional email configuration (Gmail SMTP) - pre-populated from current admin settings**
- ✅ **Optional WhatsApp configuration (Twilio) - pre-populated from current admin settings**
- ✅ **GPS location capture button with reverse geocoding**
- ✅ Confirmation modal before submission
- ✅ Platform-responsive design (web and mobile)
- ✅ Auto-scroll to top for error/success messages
- ✅ Inline validation with clear error messages
- ✅ Auto-navigate back after success (2s delay)

### Admin Settings Pre-Population

**On Component Mount:**
- Fetches GLOBAL admin settings from `/admin/settings` endpoint
- Settings are stored on the FIRST admin in the system (global configuration)
- Pre-populates these fields (editable by new admin):
  - Gmail SMTP email address
  - Gmail app password
  - Verification link validity (minutes)
  - Twilio sender phone number
  - Admin phone number (for test messages)

**Global Settings Architecture:**
- ✅ All admins share the same email/WhatsApp configuration
- ✅ Settings stored on first admin (lowest user ID with ADMIN role)
- ✅ When ANY admin changes settings, it affects ALL admins
- ✅ Ensures consistency across system

**Hint Text:**
- "Loading settings from database..." (while fetching)
- "Pre-populated from current admin settings (🌍 Global setting - shared by all admins)" (after loaded)

**Benefit:**
- New admins inherit email/WhatsApp config from system-wide settings
- Reduces duplicate configuration
- Ensures all admins use same sender numbers
- New admins can still view/edit shared settings
- Smooth onboarding experience

### GPS Location Capture

**Component:** AddressAutocomplete (same as SetupScreen)

**Features:**
- 📍 "Use Current Location (GPS)" button
- High-accuracy GPS capture
- Reverse geocoding via OpenStreetMap Nominatim
- Auto-fills address fields from coordinates
- Displays captured coordinates: "📍 GPS: -33.9249, 18.4241"
- Manual address entry fallback
- Mobile browser compatible (Android/iOS)

**In Confirmation Modal:**
- Shows address if provided
- Shows GPS coordinates if captured: "📍 GPS: {latitude}, {longitude}"


### Form Fields

**Required Fields:**
- First Name
- Last Name
- Email
- Phone Number
- ID Number
- Password
- Confirm Password

**Optional Fields:**
- Address
- Gmail Address (SMTP)
- Gmail App Password
- Verification Link Validity (minutes, default: 30)
- Twilio Sender Phone Number
- Admin Phone (for test messages)

### Validation Rules

**Email:**
- Must contain `@` symbol
- Example: `admin@example.com`

**Password:**
- Minimum 6 characters
- Must match Confirm Password field

**Phone Number:**
- Accepts local format: `0611154598`
- Accepts international: `+27611154598`
- Auto-formatted by backend validators

**ID Number:**
- Numeric only
- Example: `9001015009087`

### User Flow

1. **Access:** Admin clicks "👤 Create Admin" card on AdminDashboard
2. **Fill Form:** Enter required and optional fields
3. **Submit:** Click "Create Admin Account" button
4. **Confirm:** Review details in confirmation modal
5. **Create:** Click "✓ Confirm & Create"
6. **Success:** Green success message displays
7. **Auto-Navigate:** Returns to AdminDashboard after 2 seconds

### Confirmation Modal

**Purpose:** Prevent accidental admin account creation with incorrect data

**Displays:**
- Personal Information (name, email, phone, ID)
- Address (if provided)
- Email Configuration (if provided)
- WhatsApp Configuration (if provided)

**Actions:**
- **✏️ Edit** - Cancel and return to form
- **✓ Confirm & Create** - Submit to backend

**Styling:**
- Scrollable modal (handles long forms)
- Platform-responsive width (web: 50%, mobile: 90%)
- Green checkmark in title for positive reinforcement
- Organized sections with clear labels

---

## Navigation Integration ✅

### App.tsx Updates

**Import Added:** (line 56)
```typescript
import CreateAdminScreen from './screens/admin/CreateAdminScreen';
```

**Route Added:** (lines 434-438)
```typescript
<Stack.Screen
  name="CreateAdmin"
  component={CreateAdminScreen}
  options={{ title: 'Create Admin' }}
/>
```

### AdminDashboard Integration

**Quick Action Card Added:** (lines 407-412)
```typescript
<TouchableOpacity
  style={[styles.actionCard, styles.actionCreateAdmin]}
  onPress={() => navigation.navigate('CreateAdmin')}
>
  <Text style={styles.actionIcon}>👤</Text>
  <Text style={styles.actionTitle}>Create Admin</Text>
</TouchableOpacity>
```

**Style Added:** (lines 844-846)
```typescript
actionCreateAdmin: {
  backgroundColor: '#20C997',  // Teal color
},
```

---

## API Service Updates ✅

**File:** `frontend/services/api/index.ts`

**Method Added:** (lines 423-426)
```typescript
async createAdmin(data: any) {
  const response = await this.api.post('/admin/create', data);
  return response.data;
}
```

**Usage:**
```typescript
import api from '../../services/api';

await api.createAdmin({
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  // ... other fields
});
```

---

## Testing Guide

### Backend Testing (via API)

**1. Test with new email:**
```bash
curl -X POST http://localhost:8000/admin/create \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "0611154598",
    "id_number": "9001015009088",
    "password": "SecurePass123"
  }'
```

**Expected:** 201 Created with new admin user

**2. Test with existing email (wrong password):**
```bash
curl -X POST http://localhost:8000/admin/create \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "WrongPassword123",
    ...
  }'
```

**Expected:** 401 Unauthorized - "Email is already registered with a different password..."

**3. Test with duplicate admin:**
```bash
# Create admin with email jane@example.com
# Then try to create again with same email
```

**Expected:** 400 Bad Request - "This email already has admin privileges."

### Frontend Testing

**1. Access CreateAdminScreen:**
- Login as admin
- Navigate to AdminDashboard
- Click "👤 Create Admin" card
- Verify CreateAdminScreen loads

**2. Form Validation:**
- Try submitting with empty fields → Error message
- Try invalid email (no @) → Error message
- Try short password (< 6 chars) → Error message
- Try mismatched passwords → Error message

**3. Confirmation Modal:**
- Fill form with valid data
- Click "Create Admin Account"
- Verify confirmation modal displays all entered data
- Click "✏️ Edit" → Returns to form
- Click "✓ Confirm & Create" → Submits to backend

**4. Success Flow:**
- Create admin with valid data
- Verify green success message displays
- Verify auto-navigation to AdminDashboard after 2s
- Verify backup file created in `backend/backups/`

**5. Phone Auto-Formatting:**
- Enter phone as `0611154598`
- Submit form
- Check backend logs: Should show auto-conversion to `+27611154598`
- Verify account created successfully

**6. Platform Responsiveness:**
- Test on desktop web browser → Wider modal (50% width)
- Test on mobile web browser → Narrower modal (90% width)
- Verify all fields display correctly
- Verify buttons are tappable

---

## Security Considerations

**Authorization:**
- Only existing admins can create new admins
- Enforced via `require_admin` middleware
- JWT token required in Authorization header

**Password Verification:**
- When adding admin role to existing user
- Prevents unauthorized role escalation
- Uses bcrypt password hashing

**Multi-Role Prevention:**
- Checks if user already has admin role
- Prevents duplicate admin privileges
- Returns clear error message

**Automatic Backup:**
- Every admin creation triggers backup
- Backup includes all database tables
- Prevents data loss from accidental changes

---

## Files Modified

**Backend:**
- `backend/app/routes/admin.py` - Existing endpoint (no changes)
- `backend/app/schemas/admin.py` - Existing schemas (no changes)

**Frontend:**
- ✅ **Created:** `frontend/screens/admin/CreateAdminScreen.tsx` (547 lines)
- ✅ **Modified:** `frontend/App.tsx` (added import and route)
- ✅ **Modified:** `frontend/screens/admin/AdminDashboardScreen.tsx` (added button + style)
- ✅ **Modified:** `frontend/services/api/index.ts` (added createAdmin method)

**Documentation:**
- ✅ **Created:** `CREATE_ADMIN_FEATURE.md` (this file)

---

## Troubleshooting

**Error: "Email already has admin privileges"**
- Check if email already exists as admin
- Verify database: `SELECT * FROM users WHERE email = 'jane@example.com' AND role = 'ADMIN';`
- Solution: Use different email or update existing admin

**Error: "Email is already registered with a different password"**
- Email exists but password doesn't match
- Solution: Provide correct password for existing account

**Error: 422 Unprocessable Content (phone validation)**
- Phone format issue (should be auto-fixed)
- Verify Pydantic validators in `admin.py` schemas
- Check if backend restarted after schema changes

**Error: 403 Forbidden**
- Not authenticated as admin
- Verify JWT token in request headers
- Check token hasn't expired

**Success message but no navigation:**
- Check 2-second delay in `confirmAndSubmit()` (line 157)
- Verify navigation object available
- Check console for navigation errors

**Modal not displaying:**
- Check `showConfirmModal` state
- Verify modal visibility toggle
- Check Platform.OS responsive styling

---

## Future Enhancements

**Potential Improvements:**
- [ ] Email verification for new admin accounts
- [ ] Admin role permissions (super admin vs regular admin)
- [ ] Admin account expiration/deactivation
- [ ] Admin activity logging
- [ ] Admin profile pictures
- [ ] Admin role transfer functionality
- [ ] Admin password reset via email
- [ ] Admin account audit trail

---

## Related Documentation

- [MULTI_ROLE_IMPLEMENTATION.md](MULTI_ROLE_IMPLEMENTATION.md) - Multi-role user system
- [ADMIN_SETTINGS_GUIDE.md](ADMIN_SETTINGS_GUIDE.md) - Admin settings management
- [SYSTEM_INITIALIZATION.md](SYSTEM_INITIALIZATION.md) - Initial admin creation
- [SETUP_INTEGRATION_GUIDE.md](SETUP_INTEGRATION_GUIDE.md) - Setup screen details

---

## Status

✅ **Complete and ready for testing** (Jan 31, 2026)

**Implemented By:** AI Assistant (GitHub Copilot)

**Backend Endpoint:** Already existed (POST /admin/create)

**Frontend Screen:** Newly created (CreateAdminScreen.tsx)

**Integration:** Complete (navigation, API service, dashboard button)

**Testing Status:** Awaiting user testing

**Documentation:** Complete
