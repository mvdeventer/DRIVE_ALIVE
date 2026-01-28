# Quick Start: Multi-Role System with Setup Screen

## 5-Minute Setup Test

### 1. Clear Database
```bash
cd backend
python force_clear_database.py
```

**Expected Output:**
```
Clearing all tables...
Dropped users table
Dropped students table
... (11 tables total)
All tables cleared successfully
```

### 2. Start Backend
```bash
cd backend
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Press CTRL+C to quit
```

### 3. Start Frontend
```bash
cd frontend
npm start
```

**Expected Output:**
```
On Your Network: http://192.168...
webpack compiled successfully
```

### 4. Open App
- **Web**: http://localhost:3000 (or displayed URL)
- **Mobile**: Scan Expo QR code

### 5. Verify Setup Screen
✅ App loads directly to SetupScreen (NOT LoginScreen)
✅ Form has fields: First Name, Last Name, Email, Phone, Password, Confirm Password
✅ Info box explains admin role

### 6. Create Admin Account
Fill form:
```
First Name:       John
Last Name:        Admin  
Email:            admin@drivealive.local
Phone:            0821234567
Password:         Admin@123456
Confirm Password: Admin@123456
```

Click "Create Admin Account"

**Expected Output:**
```
✓ Loading spinner appears
✓ Success message: "Admin account created successfully!"
✓ Auto-redirects to LoginScreen after 2 seconds
```

### 7. Login
```
Email:    admin@drivealive.local
Password: Admin@123456
```

**Expected Result:**
✅ AdminDashboard loads

### 8. Verify Multi-Role Works
1. Logout
2. Click "Register as Student"
3. Register with:
   ```
   Email: admin@drivealive.local  (same as admin)
   Password: Admin@123456  (verify password works)
   Phone: 0827654321  (different phone OK)
   ID: 1234567890123
   ```

**Expected Result:**
✅ Registration succeeds
✅ Student profile created for same user
✅ Admin now has BOTH admin + student roles

### 9. Verify Different Users Can't Share Phone
1. Logout
2. Register as new Student:
   ```
   Email: jane@drivealive.local  (different)
   Phone: 0821234567  (SAME as John's admin)
   ```

**Expected Result:**
❌ Error: "Phone number already used by another user"

## Backend Verification

```bash
# Check database state
python check_database.py

# Expected output:
# User Count: 1
# Student Count: 1
# Instructor Count: 0
# Admin Count: 1
#
# Users by Role:
#   admin@drivealive.local: ['admin', 'student']
```

## Troubleshooting

### SetupScreen doesn't appear
```bash
# Check setup status endpoint
curl http://localhost:8000/setup/status

# Should return:
# {"initialized": false, "requires_setup": true, ...}
```

### Validation errors
- Email format: Must contain @ and .
- Phone: 10+ digits
- Password: 8+ chars with uppercase, lowercase, number

### Setup form submission fails
Check browser console for error messages from backend

### Redirect doesn't work
1. Verify success response from `/setup/create-initial-admin`
2. Check `/setup/status` now returns `requires_setup: false`
3. Check AppNavigator is rendering LoginScreen

## Key Files to Review

1. **Frontend Setup**
   - `frontend/services/setup.ts` - API service
   - `frontend/screens/auth/SetupScreen.tsx` - Form component
   - `frontend/App.tsx` - Integration (lines with `requiresSetup` state)

2. **Backend Setup**
   - `backend/app/services/initialization.py` - Status checks
   - `backend/app/routes/setup.py` - Setup endpoints

3. **Multi-Role**
   - `backend/app/services/auth.py` - Registration logic
   - `backend/app/models/user.py` - Schema (no unique constraints)

4. **Documentation**
   - `SETUP_INTEGRATION_GUIDE.md` - Detailed testing
   - `MULTI_ROLE_IMPLEMENTATION.md` - Architecture
   - `MULTI_ROLE_USERS.md` - API examples

## Next Steps

- [ ] Run full test sequence above
- [ ] Test on actual mobile device (iOS/Android)
- [ ] Test error scenarios (duplicate phone, wrong password)
- [ ] Deploy to staging environment
- [ ] Production rollout

## Status

✅ All components implemented and integrated
✅ Ready for testing
✅ Documentation complete
✅ Support tools available
