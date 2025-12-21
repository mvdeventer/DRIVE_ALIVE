# Instructor Verification Guide

## Quick Reference

**Development Mode:** Instructors auto-verified on registration
**Production Mode:** Manual verification via API endpoints or admin dashboard

---

## Development Mode (Current Default)

### Automatic Verification ✅

Instructors are **automatically verified** upon registration. Controlled by the `AUTO_VERIFY_INSTRUCTORS` setting.

**Configuration:**

```python
# backend/app/config.py
AUTO_VERIFY_INSTRUCTORS: bool = True  # Default
```

**How it works:**

1. Instructor registers
2. Automatically marked as verified
3. Immediately appears in student search results
4. No admin action needed

---

## Production Mode - Manual Verification

### Step 1: Disable Auto-Verification

Edit `backend/app/config.py`:

```python
AUTO_VERIFY_INSTRUCTORS: bool = False  # Production
```

Or set environment variable:

```bash
export AUTO_VERIFY_INSTRUCTORS=false
```

### Step 2: Use Admin API Endpoints

Three new endpoints are available for instructor verification:

#### 1. Get Unverified Instructors

```http
GET /instructors/unverified/list
Authorization: Bearer <token>
```

Returns list of all instructors awaiting verification.

**Example Response:**

```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "instructor_id": 1,
    "license_number": "ABC123",
    "is_verified": false,
    "created_at": "2025-12-21T10:00:00"
  }
]
```

#### 2. Verify an Instructor

```http
POST /instructors/{instructor_id}/verify
Authorization: Bearer <token>
```

Marks instructor as verified.

**Example Response:**

```json
{
  "message": "Instructor verified successfully",
  "instructor_id": 1,
  "instructor_name": "John Doe",
  "verified_at": "2025-12-21T17:30:00"
}
```

#### 3. Unverify an Instructor

```http
POST /instructors/{instructor_id}/unverify
Authorization: Bearer <token>
```

Removes verification (useful for suspensions or re-review).

### Step 3: API Usage Examples

**PowerShell:**

```powershell
# Get auth token (from login response)
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# List unverified instructors
Invoke-RestMethod -Uri "http://localhost:8000/instructors/unverified/list" `
  -Method Get `
  -Headers @{Authorization = "Bearer $token"} | ConvertTo-Json

# Verify instructor ID 1
Invoke-RestMethod -Uri "http://localhost:8000/instructors/1/verify" `
  -Method Post `
  -Headers @{Authorization = "Bearer $token"} | ConvertTo-Json

# Unverify instructor ID 1
Invoke-RestMethod -Uri "http://localhost:8000/instructors/1/unverify" `
  -Method Post `
  -Headers @{Authorization = "Bearer $token"} | ConvertTo-Json
```

**curl (Linux/Mac):**

```bash
# Get token first
TOKEN="your_jwt_token_here"

# List unverified
curl -X GET "http://localhost:8000/instructors/unverified/list" \
  -H "Authorization: Bearer $TOKEN"

# Verify instructor
curl -X POST "http://localhost:8000/instructors/1/verify" \
  -H "Authorization: Bearer $TOKEN"

# Unverify instructor
curl -X POST "http://localhost:8000/instructors/1/unverify" \
  -H "Authorization: Bearer $TOKEN"
```

**Python:**

```python
import requests

token = "your_jwt_token_here"
headers = {"Authorization": f"Bearer {token}"}

# Get unverified instructors
response = requests.get(
    "http://localhost:8000/instructors/unverified/list",
    headers=headers
)
print(response.json())

# Verify instructor
response = requests.post(
    "http://localhost:8000/instructors/1/verify",
    headers=headers
)
print(response.json())
```

---

## Database Scripts (Manual Verification)

If you need direct database access:

### Verify All Instructors

```bash
cd backend
.\venv\Scripts\python.exe verify_instructors.py
```

### Check Instructor Status

```bash
cd backend
.\venv\Scripts\python.exe check_instructors.py
```

---

## Future: Full Admin Dashboard (Phase 4)

Production-ready admin system will include:

- [ ] **Admin Role System**

  - Admin user role
  - Permission management
  - Role-based access control

- [ ] **Verification Workflow**

  - Review pending applications
  - View submitted documents
  - Approve/reject with reasons
  - Request additional information

- [ ] **Document Management**

  - Upload license scans
  - Upload ID documents
  - Upload vehicle registration
  - Vehicle insurance verification

- [ ] **Communication**

  - Email notifications to instructors
  - SMS alerts for status changes
  - In-app notifications

- [ ] **Audit & Reporting**

  - Verification history
  - Approval/rejection reasons
  - Admin action logs
  - Performance metrics

- [ ] **Bulk Operations**
  - Batch verification
  - Bulk export/import
  - Mass notifications

### Recommended Production Workflow:

1. **Registration**

   - Instructor submits application
   - Uploads required documents
   - Pays application fee (optional)

2. **Initial Review**

   - Automated checks (email, phone, ID format)
   - Document quality verification
   - Duplicate detection

3. **Manual Review**

   - Admin reviews application
   - Verifies documents against database
   - Checks criminal record (if required)
   - Reviews driving history

4. **Decision**

   - Approve with verification
   - Reject with detailed reason
   - Request more information

5. **Notification**

   - Email to instructor
   - SMS notification
   - In-app alert

6. **Post-Verification**
   - Instructor appears in search
   - Can accept bookings
   - Monitored for quality

---

## Configuration Reference

### Settings Location

`backend/app/config.py`

### Key Setting

```python
AUTO_VERIFY_INSTRUCTORS: bool = True  # Development
AUTO_VERIFY_INSTRUCTORS: bool = False # Production
```

### Environment Variable

```bash
# .env file
AUTO_VERIFY_INSTRUCTORS=true   # Development
AUTO_VERIFY_INSTRUCTORS=false  # Production
```

---

## Database Fields

**Instructor Model:**

- `is_verified` (boolean) - Verification status
- `verified_at` (datetime) - When verified
- `is_available` (boolean) - Accepting bookings

**Note:** Only `is_verified = true` instructors appear in student searches.

---

## Troubleshooting

### Instructor Not Showing in Search?

1. Check verification status:

   ```bash
   cd backend
   .\venv\Scripts\python.exe check_instructors.py
   ```

2. Verify instructor manually if needed:

   ```bash
   .\venv\Scripts\python.exe verify_instructors.py
   ```

3. Check `AUTO_VERIFY_INSTRUCTORS` setting in config.py

4. Restart backend server after config changes

### API Returns 401 Unauthorized?

- Ensure you're logged in and have a valid token
- Token expires after 30 minutes by default
- Get new token by logging in again

### Admin Endpoints Not Working?

- Currently, admin role checking is TODO
- Any authenticated user can call admin endpoints (temporary)
- Implement proper admin role in Phase 4

---

## Security Notes

**Current Implementation:**

- ⚠️ Admin endpoints accessible to all authenticated users
- ⚠️ No role-based access control yet
- ⚠️ Suitable for development only

**Production Requirements:**

- ✅ Implement admin role
- ✅ Add permission system
- ✅ Audit all verification actions
- ✅ Rate limiting on verification endpoints
- ✅ Email verification for admins
- ✅ Two-factor authentication for admin actions
