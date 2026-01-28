# Multi-Role User System

## Overview

The Drive Alive booking system now supports **multi-role users** - one person can have multiple roles (Student, Instructor, and/or Admin) using the same email, phone number, and ID number.

## Key Changes

### Database Schema

**Removed Unique Constraints:**
- `users.phone` - No longer has database-level unique constraint
- `instructors.id_number` - No longer has database-level unique constraint
- `students.id_number` - No longer has database-level unique constraint

**Still Unique:**
- `users.email` - Primary identifier for user accounts
- `instructors.license_number` - Must be unique per instructor
- `users.firebase_uid` - If using Firebase authentication

**Important Validation Rules:**
- ✅ **Same person** (same email/user_id) can have multiple roles with same phone/ID
- ❌ **Different people** (different emails/user_ids) CANNOT share phone numbers or ID numbers
- Application-level validation enforces these rules during registration

### Registration Behavior

#### New User Registration
When registering with a **new email**:
1. Creates new user account
2. Creates role-specific profile (Student or Instructor)
3. Returns access token

#### Adding Role to Existing User
When registering with an **existing email**:
1. Checks if user already has requested role
   - If yes → Error: "This email already has a [role] profile. Please log in instead."
2. Verifies password matches existing account
   - If no → Error: "Email is already registered with a different password."
3. Creates new role-specific profile (Student or Instructor)
4. Returns access token

## Use Cases

### Example 1: Instructor Who Is Also a Student (✅ Allowed)
```
1. Register as Student:
   - Email: john@example.com
   - Phone: +27123456789
   - ID: 9001015800088
   - Password: SecurePass123
   - Creates User + Student profile

2. Register as Instructor (same person):
   - Email: john@example.com (same)
   - Phone: +27123456789 (same - allowed for same user)
   - ID: 9001015800088 (same - allowed for same user)
   - Password: SecurePass123 (MUST match)
   - License: ABC123
   - Creates Instructor profile for existing user
   - Now has both Student + Instructor roles
```

### Example 2: Two Different People (❌ Not Allowed)
```
1. John registers as Student:
   - Email: john@example.com
   - Phone: +27123456789
   - ID: 9001015800088
   - Creates User + Student profile

2. Jane tries to register as Student:
   - Email: jane@example.com (different)
   - Phone: +27123456789 (SAME - ERROR!)
   - ID: 9001015800088 (SAME - ERROR!)
   
   ❌ Error: "Phone number '+27123456789' is already registered to another account"
   ❌ Error: "ID number '9001015800088' is already registered to another student"
```

### Example 3: Admin Who Is Also an Instructor (✅ Allowed)
```
1. Register as Instructor:
   - Email: admin@school.com
   - Password: AdminPass456
   - Creates User + Instructor profile

2. Admin creates admin role (via /admin/create):
   - Email: admin@school.com
   - Password: AdminPass456 (MUST match)
   - Upgrades user role to ADMIN
   - Retains Instructor profile
```

## Login Behavior

### Current Implementation
- User logs in with email + password
- System returns **primary role** (last assigned role in User table)
- User can only access features for their primary role

### Recommended Enhancement (Future)
Add role selection at login:
1. User logs in with email + password
2. System detects multiple roles (check for Student/Instructor profiles)
3. Show role selection screen
4. Return token with selected role

## API Changes

### Student Registration (`POST /auth/register/student`)

**Scenario 1: New User**
```json
Request:
{
  "email": "newuser@example.com",
  "password": "password123",
  "id_number": "9001015800088",
  ...
}

Response: 201 Created
{
  "user": { ... },
  "student_id": 1,
  "access_token": "..."
}
```

**Scenario 2: Existing User (Correct Password)**
```json
Request:
{
  "email": "existing@example.com",  // Already registered
  "password": "correctPassword",    // Matches existing
  "id_number": "9001015800088",     // Can be same or different
  ...
}

Response: 201 Created
{
  "user": { ... },
  "student_id": 2,
  "access_token": "..."
}
```

**Scenario 3: Existing User (Wrong Password)**
```json
Request:
{
  "email": "existing@example.com",
  "password": "wrongPassword",
  ...
}

Response: 401 Unauthorized
{
  "detail": "Email is already registered with a different password..."
}
```

**Scenario 4: Already Has Student Role**
```json
Request:
{
  "email": "student@example.com",  // Already has student profile
  ...
}

Response: 400 Bad Request
{
  "detail": "This email already has a student profile. Please log in instead."
}
```

### Instructor Registration (`POST /auth/register/instructor`)

Same behavior as Student registration, but checks for existing Instructor profile.

**Additional Validation:**
- License number must still be unique (cannot share licenses)

### Admin Creation (`POST /admin/create`)

**Scenario 1: Upgrade Existing User to Admin**
```json
Request:
{
  "email": "instructor@example.com",  // Existing instructor
  "password": "instructorPassword",   // MUST match
  ...
}

Response: 201 Created
{
  "id": 1,
  "email": "instructor@example.com",
  "role": "admin",  // Role upgraded
  ...
}
```

**Scenario 2: Create New Admin**
```json
Request:
{
  "email": "newadmin@example.com",  // New email
  ...
}

Response: 201 Created
```

## Migration

**Run Migration Script:**
```bash
cd backend
python migrations/remove_unique_constraints.py
```

**What It Does:**
- Removes unique constraints from `phone` and `id_number` fields
- Preserves all existing data
- Works with SQLite (development) and PostgreSQL/MySQL (production)

**⚠️ Important:**
- Backup database before running migration
- Run in development environment first
- Test multi-role registration before deploying

## Security Considerations

### Security Considerations

### Password Verification
When adding a role to an existing account, the system **requires the correct password**. This prevents:
- Unauthorized role additions
- Account takeover attempts
- Accidental duplicate registrations

### Email as Primary Identifier
- Email remains the unique identifier for user accounts
- One email = one person = one user account (can have multiple roles)

### Phone and ID Number Validation
- **For existing users (adding role)**: Phone and ID can be reused (same person)
- **For new users (first registration)**: Phone and ID must not belong to any other user
- Prevents two different people from sharing contact information
- Application-level validation enforces these rules

### License Numbers (Instructors Only)
- License numbers must always be unique (cannot share across any instructors)
- One license per instructor, even if same person has multiple accounts (which shouldn't happen)

## Frontend Updates Needed

### Registration Forms
Update error handling to show new error messages:
- "This email already has a [role] profile. Please log in instead."
- "Email is already registered with a different password..."

### Role Selection (Recommended)
Add role selection screen after login if user has multiple profiles:
```typescript
// Check for multiple roles
const hasStudentProfile = !!user.student_profile;
const hasInstructorProfile = !!user.instructor_profile;

if (hasStudentProfile && hasInstructorProfile) {
  // Show role selection screen
  navigation.navigate('SelectRole');
}
```

## Testing

### Test Case 1: Register Student → Add Instructor Role
```bash
# 1. Register as student
curl -X POST http://localhost:8000/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "id_number": "9001015800088",
    ...
  }'

# 2. Register same email as instructor
curl -X POST http://localhost:8000/auth/register/instructor \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",  // MUST match
    "id_number": "9001015800088",  // Can be same
    "license_number": "ABC123",  // MUST be unique
    ...
  }'

# Should succeed and create instructor profile
```

### Test Case 2: Wrong Password Error
```bash
curl -X POST http://localhost:8000/auth/register/instructor \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword",  // Doesn't match
    ...
  }'

# Should return 401 Unauthorized
```

### Test Case 3: Duplicate Role Error
```bash
# Try to register as student again
curl -X POST http://localhost:8000/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    ...
  }'

# Should return 400 Bad Request
```

## Rollback Plan

If issues arise, revert by:

1. **Restore unique constraints:**
```sql
-- For PostgreSQL/MySQL
ALTER TABLE users ADD CONSTRAINT uq_users_phone UNIQUE (phone);
ALTER TABLE instructors ADD CONSTRAINT uq_instructors_id_number UNIQUE (id_number);
ALTER TABLE students ADD CONSTRAINT uq_students_id_number UNIQUE (id_number);
```

2. **Revert code changes:**
```bash
git checkout HEAD -- backend/app/models/user.py
git checkout HEAD -- backend/app/services/auth.py
git checkout HEAD -- backend/app/routes/admin.py
```

## Future Enhancements

1. **Role Switching UI**
   - Add role selection at login
   - Allow switching between roles without logout
   - Show available roles in user menu

2. **Combined Dashboards**
   - Instructor who is also a student sees both dashboards
   - Quick toggle between instructor/student views

3. **Profile Management**
   - Edit student profile separately from instructor profile
   - Different contact preferences per role

4. **Access Control**
   - Role-based permissions (e.g., admin can access all features)
   - Hierarchical roles (admin > instructor > student)

## Support

For issues or questions:
- Check error messages in registration forms
- Verify password matches existing account
- Ensure license numbers are unique (instructors only)
- Contact system administrator for role management
