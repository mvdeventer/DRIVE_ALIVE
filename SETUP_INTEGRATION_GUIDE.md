# Setup Screen Integration Guide

## Overview

The frontend now includes automatic system initialization detection. When the app launches, it checks if an admin exists in the system. If no admin is found, users are directed to the Setup screen to create one. After setup completes, the app transitions to the normal Login screen.

## How It Works

### 1. App Launch Flow

```
App.tsx loads
  ↓
useEffect: checkInitialization()
  ↓
SetupService.checkSetupStatus() → GET /setup/status
  ↓
If requires_setup = true:  → Show SetupScreen
If requires_setup = false: → Show LoginScreen
```

### 2. Key Components

**SetupService** (`frontend/services/setup.ts`)
- `checkSetupStatus()`: Calls `/setup/status` endpoint to check if admin exists
- `getInitialScreen()`: Returns 'Setup' or 'Login' based on initialization status
- Handles network errors gracefully (defaults to initialized state)

**SetupScreen** (`frontend/screens/auth/SetupScreen.tsx`)
- Interactive form for creating initial admin account
- Fields: first_name, last_name, email, phone, password, confirmPassword
- Comprehensive validation with per-field error display
- Success message with auto-redirect to Login (2 seconds)
- Loading states during submission

**App.tsx Updates**
- Added `requiresSetup` state variable
- Modified `checkInitialization()` to check setup status before auth
- Added conditional rendering of Setup screen in Stack Navigator
- New `handleSetupComplete()` callback for post-setup actions

### 3. Backend Endpoints

**Setup Status Check**
```
GET /setup/status
Response: {
  "initialized": boolean,
  "requires_setup": boolean,
  "message": string
}
```

**Initial Admin Creation**
```
POST /setup/create-initial-admin
Body: {
  "first_name": string,
  "last_name": string,
  "email": string,
  "phone": string,
  "password": string
}
Response: {
  "id": string,
  "email": string,
  "roles": ["admin"],
  "message": "Admin account created successfully"
}
```

## Testing the Setup Flow

### Prerequisites
1. Fresh database (no users/admins)
2. Backend running: `python main.py`
3. Frontend running: `npm start` (web) or `expo start` (mobile)

### Test Steps

#### Step 1: Clear Database
```bash
cd backend
python force_clear_database.py
# Output should show: "All tables cleared successfully"
```

#### Step 2: Verify Empty State
```bash
python check_database.py
# Output should show: 0 users, 0 instructors, 0 students
```

#### Step 3: Start Backend
```bash
python main.py
# Should start on http://localhost:8000
```

#### Step 4: Start Frontend
```bash
cd frontend
npm start
# Or for Expo: expo start
```

#### Step 5: Verify Setup Screen Appears
- App should load directly to SetupScreen (not LoginScreen)
- Check browser console for successful `/setup/status` call
- SetupScreen form should be fully visible with all fields

#### Step 6: Create Initial Admin
1. Fill in form:
   - First Name: `John`
   - Last Name: `Admin`
   - Email: `admin@drivealive.local`
   - Phone: `0821234567`
   - Password: `Admin@123456`
   - Confirm Password: `Admin@123456`

2. Submit form (click "Create Admin Account")

3. Observe:
   - Loading spinner appears (form disabled)
   - Success message: "Admin account created successfully!"
   - Auto-redirect to LoginScreen after 2 seconds

#### Step 7: Verify Admin Created
```bash
python debug_multi_role.py
# Select option 1 (Check user status)
# Enter email: admin@drivealive.local
# Should show: User has 1 role(s): ['admin']
```

#### Step 8: Login with Admin Credentials
1. Email: `admin@drivealive.local`
2. Password: `Admin@123456`
3. Should redirect to AdminDashboard

#### Step 9: Test Registration Now Available
1. Logout from AdminDashboard
2. Click "Register as Student" or "Register as Instructor"
3. Both should now be available (previously would show error)
4. Create a student/instructor account
5. Login should show appropriate dashboard (StudentHome/InstructorHome)

### Expected Behavior Summary

| Scenario | Expected Result |
|----------|-----------------|
| First app launch (no admin) | SetupScreen appears |
| Setup form validation | Per-field errors display correctly |
| Submit valid setup form | Success message → Auto-redirect to Login |
| Login after setup | AdminDashboard loads |
| Try register without admin | Would show error (now available) |
| Create student/instructor | Successful registration, app routes correctly |

## Troubleshooting

### SetupScreen Not Appearing
1. Check browser console for errors
2. Verify `/setup/status` endpoint is reachable:
   ```bash
   curl http://localhost:8000/setup/status
   ```
3. Verify database is truly empty:
   ```bash
   python check_database.py
   ```

### Setup Form Errors
1. Check per-field validation:
   - Email format: Must be valid email (@ and .)
   - Phone: Must be 10+ digits
   - Password: Must be 8+ characters with uppercase, lowercase, number
   - Passwords must match

2. Check backend console for detailed error messages

### Redirect Not Working
1. Check that `/setup/status` response shows `requires_setup: false` after creation
2. Verify LoginScreen is properly registered in Stack Navigator
3. Check App.tsx listeners are firing correctly

## Files Modified/Created

### Created
- `frontend/services/setup.ts` - Setup service for status checks
- `frontend/screens/auth/SetupScreen.tsx` - Setup form component

### Modified
- `frontend/App.tsx`:
  - Added SetupScreen import
  - Added SetupService import
  - Added `requiresSetup` state
  - Modified `checkInitialization()` to check setup status
  - Updated `initialRouteName` to consider requiresSetup
  - Added SetupScreen to Navigator
  - Added `handleSetupComplete()` callback

### Backend (Already Implemented)
- `backend/app/services/initialization.py` - Initialization service
- `backend/app/routes/setup.py` - Setup endpoints
- `backend/app/routes/auth.py` - Auth with setup checks

## Security Considerations

### Current Implementation
✅ Only first admin can be created (checks `admin_exists`)
✅ Email must be unique
✅ Password validation enforced
✅ Setup screen only shown when no admin exists
✅ After first admin, normal registration flow applies

### Future Hardening
- [ ] Rate limiting on `/setup/create-initial-admin` endpoint
- [ ] Time window for setup completion (e.g., 24 hours after first run)
- [ ] Setup token generation (expire after first use)
- [ ] Audit logging of admin creation
- [ ] Email verification for initial admin

## API Contract

### SetupService.checkSetupStatus()
```typescript
const status = await SetupService.checkSetupStatus();
// Returns: SetupStatus {
//   initialized: boolean,
//   requires_setup: boolean,
//   message: string
// }

// Example:
if (status.requires_setup) {
  // Show SetupScreen
}
```

### SetupService.getInitialScreen()
```typescript
const screen = await SetupService.getInitialScreen();
// Returns: 'Setup' | 'Login'

// Example:
const screen = await SetupService.getInitialScreen();
if (screen === 'Setup') {
  // Redirect to SetupScreen
}
```

## Next Steps

1. **Run End-to-End Test**
   - Follow the testing steps above
   - Verify all flows work correctly

2. **Test Multi-Role Flow**
   - Create admin
   - Create instructor account with same email
   - Create student account with same email
   - Verify all roles accessible after login

3. **Production Deployment**
   - Run migration script on production database
   - Verify `/setup/status` returns `requires_setup: false` (admin exists)
   - Verify LoginScreen appears on first launch (not SetupScreen)

4. **Documentation Updates**
   - Add setup process to README
   - Document initialization flow for DevOps team
   - Create deployment runbook with setup steps

## Useful Commands

```bash
# Backend
python force_clear_database.py          # Clear all data
python check_database.py                # Check user/role counts
python debug_multi_role.py              # Interactive debugging

# Frontend
npm start                               # Start web dev server
expo start                              # Start Expo dev server
npm run web                             # Build web

# Testing
curl http://localhost:8000/setup/status # Check setup status
curl -X POST http://localhost:8000/setup/create-initial-admin \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Admin","email":"admin@test.com","phone":"0821234567","password":"Test@1234"}'
```

## Status

✅ **Setup Integration Complete** (Jan 28, 2026)

All components implemented and integrated:
- SetupService created
- SetupScreen integrated into App.tsx
- App initialization flow updated
- Backend setup endpoints ready
- Comprehensive testing guide provided
