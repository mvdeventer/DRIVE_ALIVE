# Admin Settings System - Complete Guide

## Overview

Complete admin settings management system allowing admins to configure verification link validity time and email SMTP credentials through a dedicated settings screen.

## Problem Solved

- **Issue**: After creating admin account, no message explaining verification settings
- **Issue**: No way for admin to change verification link validity time after initial setup
- **Issue**: Verification settings only configurable during first-time setup

## Solution Implemented

1. **Post-Setup Message** - Admin account creation shows confirmation message with verification settings
2. **Settings Screen** - Dedicated admin settings page accessible from dashboard
3. **Backend API** - GET and PUT endpoints for admin settings management

---

## Features

### 1. Enhanced Setup Screen ✅

**File**: `frontend/screens/auth/SetupScreen.tsx`

**What Changed**:
- Success message now explains verification link validity setting
- Shows configured time (e.g., "30 minutes")
- Tells admin where to change settings later
- Extended message display time from 2s to 4s

**Message Shown**:
```
✅ Admin account created successfully!

📧 Verification links for new users will be valid for 30 minutes.

You can change this setting anytime in Admin Dashboard → Settings.
```

### 2. Admin Settings Screen ✅

**File**: `frontend/screens/admin/AdminSettingsScreen.tsx`

**Capabilities**:
- ⚙️ View current admin settings
- 📧 Configure Gmail SMTP credentials
- ⏰ Set verification link validity (15-120 minutes)
- 🧪 Test email configuration before saving
- ✅ Confirmation modal before saving changes
- 🔄 Unsaved changes detection (navigation blocker)
- 📱 Platform-responsive design (web and mobile)

**Sections**:
1. **Email Configuration**
   - Gmail Address input
   - App Password input (with show/hide toggle)
   - Link Validity input (minutes)
   - Hint: Generate app password at myaccount.google.com/apppasswords

2. **Test Email**
   - Test Recipient Email input
   - Send Test Email button
   - Real-time SMTP validation

3. **Info Box**
   - Explains verification system
   - Lists what settings affect

4. **Save Button**
   - Only enabled when changes detected
   - Shows "💾 Save Changes" or "✅ No Changes"
   - Confirmation modal before saving

### 3. Backend API Endpoints ✅

**File**: `backend/app/routes/admin.py`

**New Endpoints**:

#### GET /admin/settings
Returns current admin user's settings:
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "smtp_email": "mvdeventer123@gmail.com",
  "smtp_password": "zebg rkkp tllh frbs",
  "verification_link_validity_minutes": 30
}
```

#### PUT /admin/settings
Updates admin settings:
- **Body**: `{ smtp_email, smtp_password, verification_link_validity_minutes }`
- **Validation**: Link validity must be 15-120 minutes
- **Returns**: Success message and updated settings

**Example Request**:
```bash
curl -X PUT http://localhost:8000/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_email": "newadmin@gmail.com",
    "smtp_password": "xxxx xxxx xxxx xxxx",
    "verification_link_validity_minutes": 45
  }'
```

**Example Response**:
```json
{
  "message": "Settings updated successfully",
  "smtp_email": "newadmin@gmail.com",
  "verification_link_validity_minutes": 45
}
```

### 4. Frontend API Service ✅

**File**: `frontend/services/api/index.ts`

**New Methods**:
```typescript
// Get admin settings
async getAdminSettings() {
  const response = await this.api.get('/admin/settings');
  return response.data;
}

// Update admin settings
async updateAdminSettings(data: {
  smtp_email?: string | null;
  smtp_password?: string | null;
  verification_link_validity_minutes?: number;
}) {
  const response = await this.api.put('/admin/settings', data);
  return response.data;
}
```

### 5. Admin Dashboard Integration ✅

**File**: `frontend/screens/admin/AdminDashboardScreen.tsx`

**Changes**:
- Added "⚙️ Settings" quick action card (purple background)
- Navigates to AdminSettingsScreen
- Positioned alongside other admin tools

**Quick Actions**:
- ✅ Verify Instructors (blue)
- 👥 User Management (green)
- 📅 Booking Oversight (cyan)
- 💰 Revenue Analytics (yellow)
- 💵 Instructor Earnings (gray)
- ⚙️ **Settings** (purple) ← NEW

### 6. Navigation Setup ✅

**File**: `frontend/App.tsx`

**Changes**:
- Imported AdminSettingsScreen
- Added Stack.Screen route:
```tsx
<Stack.Screen
  name="AdminSettings"
  component={AdminSettingsScreen}
  options={{ title: 'Admin Settings' }}
/>
```

---

## User Flow

### First-Time Setup Flow

1. User fills SetupScreen form (includes email config and link validity)
2. Clicks "Confirm & Create Admin Account"
3. **NEW**: Success message shows:
   - Account created successfully
   - Verification links valid for X minutes
   - Info about changing settings later
4. After 4 seconds, redirects to Login screen
5. User logs in as admin

### Changing Settings Later

1. Admin logs into dashboard
2. Clicks "⚙️ Settings" quick action card
3. AdminSettingsScreen loads current settings
4. Admin can edit:
   - Gmail address
   - App password
   - Link validity time
5. Click "📧 Send Test Email" to verify SMTP works
6. Click "💾 Save Changes"
7. Confirmation modal shows what will change
8. Click "✓ Confirm & Save"
9. Success message appears
10. Settings updated in database

### Unsaved Changes Protection

- If admin edits fields but navigates away without saving
- **Web**: Browser confirmation dialog appears
- **Mobile**: Alert dialog appears
- Options: "Stay" or "Discard Changes"

---

## Technical Details

### Database Schema

**No changes required** - uses existing User model fields:
- `smtp_email` (String, nullable)
- `smtp_password` (String, nullable)
- `verification_link_validity_minutes` (Integer, default 30)

### Validation Rules

- **smtp_email**: Optional, must be valid email format
- **smtp_password**: Optional, no specific format required
- **verification_link_validity_minutes**: 
  - Required
  - Minimum: 15 minutes
  - Maximum: 120 minutes
  - Default: 30 minutes

### State Management

**AdminSettingsScreen**:
- `formData` - Current form values
- `originalData` - Values loaded from database
- `hasUnsavedChanges()` - Compares formData vs originalData
- `loading`, `saving`, `refreshing`, `testingEmail` - Loading states
- `successMessage`, `errorMessage` - Inline messages
- `showPassword`, `showConfirmModal` - UI toggles

### Auto-Scroll Feature

All error/success messages auto-scroll to top for visibility:
```typescript
scrollViewRef.current?.scrollTo({ y: 0, animated: true });
setSuccessMessage('Settings saved!');
```

### Confirmation Modal

Shows only changed fields:
```
✓ Confirm Settings Update
Please review your changes

Gmail Address:
newadmin@gmail.com

Link Validity:
45 minutes

[✏️ Edit] [✓ Confirm & Save]
```

---

## Platform Responsiveness

All components use Platform-dependent styling:

**Web**:
- Larger fonts (16px+ for inputs)
- More padding (24px sections)
- Wider modals (40% width)

**Mobile**:
- Smaller fonts (14px for inputs)
- Less padding (16px sections)
- Narrower modals (90% width)

**Example**:
```typescript
fontSize: Platform.OS === 'web' ? 16 : 14,
padding: Platform.OS === 'web' ? 24 : 16,
```

---

## Testing Guide

### Test 1: Setup Screen Message

1. Reset database
2. Fill SetupScreen with admin details
3. **Include** Gmail credentials and set link validity to 45
4. Click "Confirm & Create Admin Account"
5. **Expected**: Success message shows:
   - "Admin account created successfully!"
   - "Verification links... valid for 45 minutes"
   - "You can change this setting... in Settings"
6. After 4 seconds, redirects to Login

### Test 2: Settings Screen Load

1. Log in as admin
2. Navigate to AdminDashboard
3. Click "⚙️ Settings" card
4. **Expected**: Settings screen loads with current values:
   - Gmail Address: mvdeventer123@gmail.com
   - App Password: •••• (masked)
   - Link Validity: 30 minutes

### Test 3: Test Email Functionality

1. In Settings screen, fill test recipient email
2. Click "📧 Send Test Email"
3. **Expected**: 
   - Button shows loading spinner
   - Success message: "✅ Test email sent successfully!"
   - Check email inbox for test message

### Test 4: Update Settings

1. Change link validity from 30 to 60 minutes
2. Click "💾 Save Changes"
3. **Expected**: Confirmation modal appears:
   - Shows: "Link Validity: 60 minutes"
4. Click "✓ Confirm & Save"
5. **Expected**: Success message "✅ Settings saved successfully!"
6. Refresh page and verify value persists

### Test 5: Validation

1. Try to set link validity to 10 minutes (< 15)
2. Click Save
3. **Expected**: Error message about 15-120 range
4. Try 200 minutes (> 120)
5. **Expected**: Same validation error

### Test 6: Unsaved Changes

1. Change any field
2. Try to navigate back
3. **Expected**: 
   - Web: Browser confirmation dialog
   - Mobile: Alert dialog
4. Choose "Stay" - remains on settings page
5. Choose "Discard" - navigates back without saving

---

## Files Modified/Created

### Frontend Files

**Created**:
- `frontend/screens/admin/AdminSettingsScreen.tsx` (700+ lines)

**Modified**:
- `frontend/screens/auth/SetupScreen.tsx` (success message)
- `frontend/screens/admin/AdminDashboardScreen.tsx` (Settings card + styles)
- `frontend/services/api/index.ts` (API methods)
- `frontend/App.tsx` (route setup)

### Backend Files

**Modified**:
- `backend/app/routes/admin.py` (GET /settings, PUT /settings endpoints)

### Documentation

**Created**:
- `ADMIN_SETTINGS_GUIDE.md` (this file)

---

## API Reference

### Authentication

All endpoints require admin authentication via JWT:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Endpoints

#### 1. Get Admin Settings

**GET** `/admin/settings`

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200**:
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "smtp_email": "mvdeventer123@gmail.com",
  "smtp_password": "zebg rkkp tllh frbs",
  "verification_link_validity_minutes": 30
}
```

**Response 401** (Unauthorized):
```json
{
  "detail": "Not authenticated"
}
```

**Response 403** (Not Admin):
```json
{
  "detail": "Admin access required"
}
```

#### 2. Update Admin Settings

**PUT** `/admin/settings`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "smtp_email": "newadmin@gmail.com",
  "smtp_password": "xxxx xxxx xxxx xxxx",
  "verification_link_validity_minutes": 45
}
```

**All fields optional** - only include fields you want to update:
```json
{
  "verification_link_validity_minutes": 60
}
```

**Response 200**:
```json
{
  "message": "Settings updated successfully",
  "smtp_email": "newadmin@gmail.com",
  "verification_link_validity_minutes": 45
}
```

**Response 400** (Validation Error):
```json
{
  "detail": "Verification link validity must be between 15 and 120 minutes"
}
```

**Response 401** (Unauthorized):
```json
{
  "detail": "Not authenticated"
}
```

**Response 403** (Not Admin):
```json
{
  "detail": "Admin access required"
}
```

---

## Future Enhancements

Potential improvements:

1. **Multiple Admins**:
   - System-wide settings vs per-admin settings
   - Central SMTP config accessible to all admins

2. **Advanced Email Settings**:
   - Custom SMTP server (not just Gmail)
   - Port and TLS configuration
   - Email templates customization

3. **Notification Settings**:
   - WhatsApp reminder timing
   - Email templates selection
   - Notification frequency controls

4. **System Settings**:
   - Default booking duration
   - Cancellation policy time limits
   - Payment gateway configuration

5. **Audit Log**:
   - Track who changed settings and when
   - View settings history

---

## Troubleshooting

### Issue: Settings Not Saving

**Symptoms**: Click save but values don't persist

**Solution**:
1. Check browser console for errors
2. Verify authentication token is valid
3. Check backend logs for validation errors
4. Ensure link validity is 15-120 range

### Issue: Test Email Not Sending

**Symptoms**: Test email button succeeds but no email received

**Solution**:
1. Check Gmail app password is correct
2. Verify 2-factor authentication enabled on Gmail
3. Check spam/junk folder
4. Try generating new app password at myaccount.google.com/apppasswords

### Issue: Unsaved Changes Dialog Not Appearing

**Symptoms**: Can navigate away with unsaved changes

**Solution**:
1. Verify `beforeRemove` listener is registered
2. Check Platform detection is working
3. Ensure formData !== originalData comparison is correct

---

## Security Considerations

1. **Password Storage**:
   - SMTP passwords stored in plain text (required for email sending)
   - Masked in UI with show/hide toggle
   - Only accessible to admin users

2. **API Protection**:
   - All endpoints require admin authentication
   - JWT token validation
   - Admin middleware enforces role check

3. **Input Validation**:
   - Link validity range enforced (15-120 minutes)
   - Email format validation
   - SQL injection protection (SQLAlchemy ORM)

4. **HTTPS Required**:
   - Gmail SMTP requires TLS
   - Production deployment must use HTTPS

---

## Summary

✅ **Complete Implementation**:
- Post-setup success message with verification info
- Dedicated admin settings screen
- Email configuration management
- Link validity time configuration
- Test email functionality
- Unsaved changes protection
- Backend API endpoints
- Platform-responsive design
- Comprehensive validation

✅ **User Experience**:
- Clear feedback on admin creation
- Easy access to settings from dashboard
- Intuitive form with hints
- Test before save capability
- Confirmation modal for changes
- Inline success/error messages

✅ **Technical Quality**:
- Clean separation of concerns
- Reusable API service methods
- Type-safe TypeScript
- Consistent styling patterns
- Proper error handling
- Documentation included

**Status**: ✅ Complete and ready for testing (Jan 30, 2026)
