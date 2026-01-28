# System Initialization & Admin Setup

## First Server Startup

When the backend server starts for the **first time**:

### Automatic Steps (Handled by the System)

1. **Database tables are created** (if they don't exist)
2. **Default admin user is created automatically**:
   - Email: `admin@drivealive.local`
   - Password: `Admin@123456`
   - Status: Active (ready to use)

### Console Output

When the server starts, you'll see:

```
================================================================================
Drive Alive Backend API - Starting Up
================================================================================
Python Path: /path/to/venv/python.exe
Virtual Environment: Active
API Version: 1.0.0
WhatsApp Reminders: Disabled
================================================================================

🔐 Checking for admin user...

================================================================================
🎉 DEFAULT ADMIN CREATED
================================================================================
Email:    admin@drivealive.local
Password: Admin@123456
================================================================================
⚠️  IMPORTANT: Change this password immediately after first login!
================================================================================
```

## Registration Flow

### Phase 1: System Initialization (Admin Exists)

After the admin is created, the system is **initialized** and ready:

1. **Students can register** via `/auth/register/student`
2. **Instructors can register** via `/auth/register/instructor`
3. **New admins can be created** via `/admin/create` (admin-only endpoint)

### Phase 2: First Admin Login

1. Admin logs in with:
   - Email: `admin@drivealive.local`
   - Password: `Admin@123456`

2. Admin accesses dashboard at `/admin/*` endpoints

3. **Change the default password immediately**:
   - Use `/auth/change-password` endpoint
   - Or modify through admin dashboard

### Phase 3: System Operations

Once initialized:
- ✅ Students can register and book lessons
- ✅ Instructors can register and offer lessons
- ✅ Admins can manage users, verify instructors, view analytics
- ✅ New admins can be created by existing admins

## Admin-Only Operations

### Creating Additional Admins

**Endpoint**: `POST /admin/create`

**Requirements**:
- Request must be authenticated with an existing admin token
- Admin can create new admin by providing email/password

**Example**:
```bash
curl -X POST http://localhost:8000/admin/create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@company.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Admin"
  }'
```

### Adding Admin Role to Existing User

If a student or instructor should become admin:

1. Admin calls `/admin/create` with existing user's email
2. System verifies user exists and password is correct
3. System upgrades user to ADMIN role
4. User can now access all admin features

## Student/Instructor Registration Guard

### Registration Not Available Until Admin Exists

If somehow the admin is deleted or system not initialized:

**Student Registration**: 
```
Error: 503 Service Unavailable
"System is not yet initialized. Please contact administrator to set up the system first."
```

**Instructor Registration**:
```
Error: 503 Service Unavailable  
"System is not yet initialized. Please contact administrator to set up the system first."
```

This ensures the system always has an admin before users can register.

## Security Considerations

### Default Admin Password

⚠️ **CRITICAL**: The default password `Admin@123456` is publicly known (in code/docs).

**You MUST**:
1. Change the default admin password immediately after first login
2. Never use this password in production
3. Create a strong, unique password for the admin account

### Password Change

```bash
curl -X POST http://localhost:8000/auth/change-password \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Admin@123456",
    "new_password": "NewSecurePass123!",
    "new_password_confirm": "NewSecurePass123!"
  }'
```

## Initialization Checklist

- [ ] Server started successfully (check logs for admin creation message)
- [ ] Admin created with email `admin@drivealive.local`
- [ ] Admin can log in with temporary password `Admin@123456`
- [ ] Admin password changed to secure password
- [ ] Students can register
- [ ] Instructors can register
- [ ] System is ready for production use

## Troubleshooting

### "Admin user already exists" error on startup

**Cause**: Admin already exists in database
**Solution**: Normal behavior - system detected existing admin

### "System is not yet initialized" when registering

**Cause**: No admin user exists in database
**Solution**: 
1. Restart the server to trigger admin creation
2. Or manually create admin via `/setup/create-admin` endpoint (if still available)
3. Check database for corrupted admin record

### Can't log in to default admin account

**Cause**: Password is incorrect or not using correct email
**Solution**:
1. Verify you're using `admin@drivealive.local` (exact email)
2. Verify you're using `Admin@123456` (exact password)
3. Restart server and check startup logs for actual credentials
4. Clear database and restart server to recreate default admin

## Database Cleanup

If you need to reset the system:

```bash
cd backend
python force_clear_database.py
# Restart server - default admin will be recreated
```

## Multi-Role User Registration

After admin is created and system is initialized:

### Example: Student Becomes Instructor

1. **User registers as Student**:
   ```
   POST /auth/register/student
   Email: john@example.com
   Password: StudentPass123
   ```
   ✅ Student profile created

2. **Same user registers as Instructor**:
   ```
   POST /auth/register/instructor  
   Email: john@example.com (same)
   Password: StudentPass123 (must match)
   License: ABC123
   ```
   ✅ Instructor profile created
   ✅ User now has both Student + Instructor roles

3. **Same user becomes Admin** (if authorized by existing admin):
   ```
   POST /admin/create
   Email: john@example.com (same)
   Password: StudentPass123 (must match)
   ```
   ✅ User upgraded to Admin role
   ✅ Can now manage other users

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---|
| `/auth/register/student` | POST | Register new student | No (after admin exists) |
| `/auth/register/instructor` | POST | Register new instructor | No (after admin exists) |
| `/auth/login` | POST | Login (any role) | No |
| `/admin/create` | POST | Create/upgrade admin | Yes (admin role) |
| `/setup/create-admin` | GET | Manual admin creation | No (one-time setup) |

## Next Steps

1. Start the server: `python main.py`
2. Note the default admin credentials
3. Login to admin dashboard
4. Change default password immediately
5. Configure WhatsApp/Twilio (if needed)
6. System is ready for student/instructor registration
