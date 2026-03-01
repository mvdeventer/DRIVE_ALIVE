# 🚗 Instructor Registration & Verification Overhaul
**Project:** Drive Alive  
**Branch:** `main`  
**Last Updated:** 2026-03-01  

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Changes](#1--database--models)
3. [Backend Schemas](#2--backend--schemas)
4. [Backend API Routes](#3--backend--api-routes)
5. [Backend Services](#4--backend--services)
6. [Frontend – Registration Flow](#5--frontend--registration-flow)
7. [Frontend – Login Flow](#6--frontend--login-flow)
8. [Frontend – Verification Screens](#7--frontend--verification-screens)
9. [Frontend – Admin Panel](#8--frontend--admin-panel)
10. [Frontend – Instructor Profile](#9--frontend--instructor-profile-company-owner)
11. [Deep Links & Routing](#10--deep-link--email-link-routing)
12. [Email & WhatsApp Templates](#11--email--whatsapp-templates)
13. [Implementation Order](#12--implementation-order)
14. [Verification State Machine](#13--verification-state-machine)
15. [API Reference](#14--api-reference-summary)

---

## Overview

### Goals
- Instructor sets up their **weekly schedule during registration** (no separate step later)
- Admin receives a **verification link** for every new instructor and can also verify from the admin panel
- **All admins** receive the verification link (not just one)
- If an instructor tries to **log in while unverified**, they see the admin's contact details
- Instructors can belong to a **company**:
  - Register a **new company** (becomes company owner)
  - Join an **existing company** (selected from dropdown)
  - Register as **independent** (no company)
- When joining an existing company:
  - The **company owner** receives a verification link
  - The **new instructor** receives a "pending" notification
  - **Both** admin AND company owner must approve before the instructor can log in
- Admin only needs to verify the **main (owner) instructor** of a company
- Company owner verifies their own company's instructors via **link or in their profile**

### Verification Rules

| Scenario | Who Approves | Status Flow |
|---|---|---|
| Independent instructor | Admin only | `pending_admin` → `verified` |
| New company owner | Admin only | `pending_admin` → `verified` |
| Joining existing company | Admin + Company Owner (both required) | `pending_admin` → `pending_company` → `verified` |

---

## Progress Tracking

### Phase 1 – Data Layer ✅
- [x] `Company` SQLAlchemy model (`backend/app/models/company.py`)
- [x] `InstructorSchedule` model — existing `backend/app/models/availability.py` (reused)
- [x] Update `Instructor` model with new columns (8 columns + enum)
- [x] Incremental migration applied via `main.py` `_apply_incremental_migrations()`

### Phase 2 – Backend Schemas ✅
- [x] `backend/app/schemas/company.py` — `CompanyListItem`, `CompanyCreate`, `CompanyOut`
- [x] `ScheduleSlotCreate` in `backend/app/schemas/user.py`
- [x] Updated `InstructorCreate` — added `schedule`, `company_id`, `company_name`
- [x] Updated `InstructorResponse` — added `verification_status`, `company_id`, `is_company_owner`

### Phase 3 – Backend Routes & Services ✅
- [x] `backend/app/routes/companies.py` (new) — `GET /companies`, `GET /companies/{id}`
- [x] `GET /setup/admin-contact` public endpoint
- [x] Update `POST /auth/register/instructor` — schedule + company + verification tokens
- [x] `POST /verify/instructor/company` (token-based) — via `verification.py`
- [x] `GET /admin/instructors` — all instructors with `verification_status` filter
- [x] `POST /admin/instructors/{id}/verify` — updated to use `InstructorVerificationStatus`
- [x] `POST /admin/instructors/{id}/reject` — explicit reject with optional reason
- [x] `POST /admin/instructors/{id}/resend-verification`
- [x] `POST /verify/instructor/admin` — token-based admin approve/reject endpoint
- [x] `GET /instructors/company/my-instructors` — company owner's instructors
- [x] `POST /instructors/company/instructors/{id}/verify`
- [x] `POST /instructors/company/instructors/{id}/reject`
- [x] Login 403 guard with contact info
- [x] `backend/app/services/company_service.py` (new)
- [x] Update `instructor_verification_service.py` — `send_company_verification()`, `verify_company_token()`

### Phase 4 – Frontend Registration ✅
- [x] Multi-step wizard scaffold (`RegisterInstructorScreen.tsx`) — 4-step
- [x] Step 1 – Personal Info + password
- [x] Step 2 – Professional details, vehicle, rates
- [x] Step 3 – Company Setup (Independent / Join / Create)
- [x] Step 4 – Schedule (`ScheduleEditor.tsx` component created)
- [x] Inline success screen with pending status message

### Phase 5 – Frontend Auth & Verify ✅
- [x] Login 403 pending verification modal (`LoginScreen.tsx`)
- [x] `InstructorVerifyScreen.tsx` — rewritten with useTheme, decision UI (approve/reject buttons), sub-components
- [x] `InstructorCompanyVerifyScreen.tsx` (new) — company owner approve/reject
- [x] Deep link routing in `App.tsx` — `company-instructor-verify` route

### Phase 6 – Frontend Panels ✅
- [x] Admin instructors list — status badges + filter tabs (`InstructorVerificationScreen.tsx`)
- [x] Admin instructor detail — verify/reject/resend UI
- [x] Instructor profile — "My Instructors" tab (company owners) — `MyInstructorsScreen.tsx`
- [x] `MyInstructors` registered in `App.tsx` Stack navigator

### Phase 7 – Notifications ✅
- [x] Company owner verification email + WhatsApp — `send_company_verification()`
- [x] Admin verification email — sent to ALL admins via `send_verification_to_all_admins()`
- [x] Instructor pending notification email + WhatsApp — `send_pending_notification()`
- [x] Instructor approved notification email + WhatsApp — `send_approval_notification()`
- [x] Instructor rejected notification email + WhatsApp — `send_rejection_notification()`
- [x] Notifications wired: registration → pending; admin verify → approved/rejected; admin reject endpoint → rejected

---

## 1. 🗄️ Database / Models

### 1.1 New `companies` Table
**File:** `backend/app/models/company.py`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `name` | VARCHAR(200) NOT NULL | Display name |
| `slug` | VARCHAR(200) UNIQUE NOT NULL | URL-safe, e.g. `cape-town-drivers` |
| `owner_instructor_id` | FK → `instructors.id` | The "main instructor"; nullable until created |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

### 1.2 New `instructor_schedules` Table
**File:** `backend/app/models/instructor_schedule.py`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `instructor_id` | FK → `instructors.id` CASCADE DELETE | |
| `day_of_week` | SMALLINT | 0=Mon … 6=Sun |
| `start_time` | TIME NOT NULL | |
| `end_time` | TIME NOT NULL | Must be > start_time |
| `is_available` | BOOLEAN DEFAULT TRUE | |

Unique constraint: `(instructor_id, day_of_week)`

### 1.3 `instructors` Table – New Columns

| Column | Type | Notes |
|---|---|---|
| `company_id` | FK → `companies.id` nullable | NULL = independent |
| `is_company_owner` | BOOLEAN DEFAULT FALSE | True for the company founder |
| `verification_status` | VARCHAR(30) DEFAULT `pending_admin` | See enum below |
| `verified_by_admin_id` | FK → `users.id` nullable | Which admin approved |
| `verified_by_instructor_id` | FK → `instructors.id` nullable | Which company owner approved |
| `admin_verification_token` | VARCHAR(200) UNIQUE nullable | For email link |
| `company_verification_token` | VARCHAR(200) UNIQUE nullable | For company owner link |
| `verification_token_expires` | TIMESTAMP nullable | 72hr from registration |

**`verification_status` values:**
| Value | Meaning |
|---|---|
| `pending_admin` | Awaiting admin approval |
| `pending_company` | Admin approved; awaiting company owner |
| `verified` | Fully approved; can log in |
| `rejected` | Rejected by admin or company owner |

---

## 2. 🔙 Backend – Schemas

### 2.1 `backend/app/schemas/company.py`
```python
class CompanyListItem(BaseModel):
    id: int
    name: str

class CompanyCreate(BaseModel):
    name: str  # min 3, max 200

class CompanyOut(BaseModel):
    id: int
    name: str
    slug: str
    owner_instructor_id: int | None
    is_active: bool
    class Config:
        from_attributes = True
```

### 2.2 `backend/app/schemas/instructor_schedule.py`
```python
class ScheduleSlot(BaseModel):
    day_of_week: int       # 0–6, validated
    start_time: time
    end_time: time         # must be > start_time
    is_available: bool = True
```

### 2.3 Updates to `InstructorCreate`
Add to existing schema:
```python
schedule:     list[ScheduleSlot]   # required, min 1 available slot
company_id:   int | None = None    # join existing company
company_name: str | None = None    # create new company
# validator: company_id and company_name are mutually exclusive
# validator: at least 1 slot with is_available=True
```

---

## 3. 🔙 Backend – API Routes

### 3.1 Companies Router (`backend/app/routes/companies.py`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/companies` | Public | Active company list for dropdown |
| `POST` | `/companies` | Admin JWT | Create company manually |

### 3.2 Registration Logic (`POST /auth/register/instructor`)

```
1. Validate schema (schedule, company fields)
2. Create user record (INACTIVE)
3. Determine company:
   a. company_name → create Company, instructor is_company_owner=True
   b. company_id → look up Company + owner, is_company_owner=False
   c. neither → independent
4. Set verification_status = 'pending_admin'
5. Generate admin_verification_token (always, expires 72h)
6. If joining company → generate company_verification_token
7. Save instructor + schedule slots
8. Send notifications:
   → All admins: admin verification link
   → If joining company: company owner receives company verification link
   → New instructor: "pending" notification with admin contact
9. Return 201
```

### 3.3 Verification Endpoints

#### `GET /verify/instructor/admin/{token}`
```
1. Look up instructor by admin_verification_token
2. Check not expired, not already used
3. Set verified_by_admin_id
4. If independent OR is_company_owner:
   → status = 'verified', activate account, send approval email
5. Else (joining company):
   → status = 'pending_company'
   → Send "waiting for company owner" to instructor
6. Clear admin_verification_token
7. Return success page
```

#### `GET /verify/instructor/company/{token}`
```
1. Look up instructor by company_verification_token
2. Check not expired, not already used
3. Set verified_by_instructor_id
4. If verified_by_admin_id is already set:
   → status = 'verified', activate account, send approval email
5. Else:
   → Store partial, send "waiting for admin" to instructor
6. Clear company_verification_token
7. Return success page
```

#### `POST /admin/instructors/{id}/verify` (Admin JWT)
Same logic as admin token verify, no token lookup needed.

#### `POST /admin/instructors/{id}/reject` (Admin JWT)
Set `verification_status = 'rejected'`, send rejection email to instructor.

#### `POST /instructor/company/instructors/{id}/verify` (Instructor JWT)
- Require `current_instructor.is_company_owner == True`
- Require `target.company_id == current_instructor.company_id`
- Same logic as company token verify.

#### `POST /instructor/company/instructors/{id}/reject` (Instructor JWT)
Same guards, set `verification_status = 'rejected'`.

#### `POST /admin/instructors/{id}/resend-verification` (Admin JWT)
Regenerate both tokens, extend expiry 72h, resend all relevant links.

### 3.4 Login Guard
In `POST /auth/login`, after password check:
```python
if user.role == 'instructor':
    instructor = get_instructor_by_user_id(db, user.id)
    if instructor and instructor.verification_status != 'verified':
        admin = get_first_admin(db)
        raise HTTPException(403, detail={
            "code": "ACCOUNT_PENDING_VERIFICATION",
            "verification_status": instructor.verification_status,
            "admin_email": admin.email,
            "admin_phone": admin.phone,
        })
```

### 3.5 Public Admin Contact Endpoint
`GET /setup/admin-contact`
```json
{ "email": "admin@example.com", "phone": "+27611234567" }
```
Used by registration success screen and login pending modal.

---

## 4. 🔙 Backend – Services

### 4.1 `backend/app/services/company_service.py` (new)
```python
def get_all_active_companies(db) -> list[Company]
def get_company_by_id(db, company_id: int) -> Company | None
def create_company(db, name: str) -> Company          # slug auto-generated
def get_company_owner(db, company_id: int) -> Instructor | None
def slugify(name: str) -> str
  # "Cape Town Drivers" → "cape-town-drivers"
  # collisions → append -2, -3 etc.
```

### 4.2 Updates to `instructor_verification_service.py`
```python
def send_admin_verification_links(db, instructor, admins, base_url)
  # Email + WhatsApp to EACH admin

def send_company_verification_link(db, instructor, company_owner, base_url)
  # Email + WhatsApp to company owner

def send_pending_notification(instructor, admin_email, admin_phone)
  # Instructor notified: "pending, here's who to contact"

def send_approval_notification(instructor, frontend_url)
  # "✅ Approved, you can now log in"

def send_rejection_notification(instructor, reason=None)
  # "❌ Registration not approved"

def activate_instructor(db, instructor)
  # Sets is_active=True, verification_status='verified', clears tokens
```

---

## 5. 📱 Frontend – Registration Flow

### Overview: 4-Step Wizard
**File:** `frontend/screens/auth/RegisterInstructorScreen.tsx`

```
[●]──────────[○]──────────[○]──────────[○]
Step 1       Step 2       Step 3       Step 4
Personal     Company      Schedule     Review
```

Progress bar at top. "Back" and "Next" / "Submit" at bottom.

---

### Step 1 – Personal Info (refactor existing)
- First name, Last name
- ID Number
- Email
- Phone number
- Password + Confirm password
- Hourly rate, License number, License types
- Vehicle details
- Bio (optional)
- Inline field validation + summary above "Next"

### Step 2 – Company Setup (NEW)

**Three modes (radio/tab):**

**A – Register New Company:**
```
Company Name: [__________________________]
ℹ️ You become the owner. Admin verifies you.
```

**B – Join Existing Company:**
```
Select Company: [🔍 Search...  ▼]
                (loaded from GET /companies)

ℹ️ Both the company owner AND an admin must
   approve your registration before you can log in.
```

**C – Independent (no company):**
```
ℹ️ Admin will verify your registration.
```

### Step 3 – Schedule Setup (NEW)
**Component:** `frontend/components/instructor/ScheduleEditor.tsx`

```
Weekly Availability

Mon  [✓]  08:00 ▼  to  17:00 ▼
Tue  [✓]  08:00 ▼  to  17:00 ▼
Wed  [ ]  ── not available ──
Thu  [✓]  08:00 ▼  to  17:00 ▼
Fri  [✓]  08:00 ▼  to  15:00 ▼
Sat  [✓]  08:00 ▼  to  13:00 ▼
Sun  [ ]  ── not available ──

[ Apply to all weekdays ]

Preview: Mon 08:00–17:00 · Tue 08:00–17:00 · Thu–Fri…
```

Validation:
- At least 1 day available
- End time must be after start time
- Times: 30-min increments, 06:00–20:00

### Step 4 – Review & Submit (NEW)

Summary of all sections with "Edit" links back to each step.
Validation summary above submit button.
Spinner on submit.

**On 201 Success:**
```
✅ Registration Submitted!

Your registration is pending verification.
You'll be notified once approved.

Need help? Contact:
📧 admin@drivalive.co.za
📞 +27 61 234 5678

[ Back to Login ]
```

---

## 6. 📱 Frontend – Login Flow

**File:** `frontend/screens/auth/LoginScreen.tsx`

Handle `403` with `code: "ACCOUNT_PENDING_VERIFICATION"`:
- Show modal (NOT a toast or error banner)
- Do NOT show "Invalid credentials" for this case

**Pending Modal:**
```
⏳ Account Pending Verification

Status: 🟡 Waiting for admin approval

Your account is awaiting approval.
Please contact the administrator:

📧 admin@drivalive.co.za
📞 +27 61 234 5678

          [ OK ]
```

**Status message by `verification_status`:**
| Value | Display |
|---|---|
| `pending_admin` | 🟡 Waiting for admin approval |
| `pending_company` | 🔵 Waiting for company owner approval |
| `rejected` | ❌ Not approved — contact admin |

---

## 7. 📱 Frontend – Verification Screens

### 7.1 `InstructorAdminVerifyScreen.tsx` (update)
Route: `/verify/instructor/admin/:token`

- Show instructor: name, email, phone, company name, schedule grid (read-only)
- Buttons: `[✅ Verify Instructor]` `[❌ Reject]`
- Rejection: optional reason text input
- After verify: show whether fully verified or still pending company
- Handle expired / already-used token gracefully

### 7.2 `InstructorCompanyVerifyScreen.tsx` (NEW)
**File:** `frontend/screens/verification/InstructorCompanyVerifyScreen.tsx`  
Route: `/verify/instructor/company/:token`

- Heading: *"New instructor wants to join [Company Name]"*
- Show instructor: name, email, phone, experience, schedule
- Buttons: `[✅ Accept into Company]` `[❌ Decline]`
- After accept: show whether fully verified or still pending admin
- Handle token errors gracefully

---

## 8. 📱 Frontend – Admin Panel

**File:** `frontend/screens/admin/InstructorVerificationScreen.tsx`

### Instructors List
- `verification_status` badge on each row:
  - 🟡 Pending Admin · 🔵 Pending Company · ✅ Verified · ❌ Rejected
- Filter tabs: `All | Pending | Verified | Rejected`
- Pending count badge on "Pending" tab
- Pending instructors sorted to top by default

### Instructor Detail
- Status shown prominently
- If `pending_admin`: `[✅ Verify]` and `[❌ Reject]` buttons with optional reason
- `[🔄 Resend Verification Link]` button
- Schedule read-only grid
- Company name + owner indicator
- When verified: show who verified + when

---

## 9. 📱 Frontend – Instructor Profile (Company Owner)

**File:** `frontend/screens/instructor/InstructorProfileScreen.tsx`

Only visible when `instructor.is_company_owner === true`:

### "My Instructors" Tab
- Badge count when any `pending_company` instructors exist
- List all instructors in the company with status badges
- Per instructor:
  - If `pending_company`: `[✅ Verify]` `[❌ Decline]` buttons
  - If `verified`: verified date shown
  - Schedule preview (collapsible)
  - `[Resend verification link]`

---

## 10. 🔗 Deep Link / Email Link Routing

### `App.tsx` linking config additions
```typescript
const linking = {
  prefixes: [...existing...],
  config: {
    screens: {
      ...existing,
      InstructorAdminVerify:   'verify/instructor/admin/:token',
      InstructorCompanyVerify: 'verify/instructor/company/:token',
    }
  }
};
```

### React Navigation
Both screens go in the **public (unauthenticated) stack** — accessible without login.

### Backend redirect strategy
`GET /verify/instructor/admin/{token}` → redirects to `{FRONTEND_URL}/verify/instructor/admin/{token}`  
`GET /verify/instructor/company/{token}` → redirects to `{FRONTEND_URL}/verify/instructor/company/{token}`

Frontend handles the UI; backend only validates token and redirects.

---

## 11. 📧 Email / WhatsApp Templates

### Admin Verification Email (update existing)
**Subject:** `New Instructor Registration – Action Required: {name}`

Body includes: instructor details, schedule summary, company name, verify + reject CTA buttons, 72hr expiry warning.

### Company Owner Verification Email (NEW)
**Subject:** `New instructor wants to join {company}: {name}`

Body includes: instructor details, schedule, accept + decline CTA buttons, note about admin also needing to approve, 72hr expiry.

### Instructor Pending Notification (NEW)
**Subject:** `Registration Received – Drive Alive`

Body includes: confirmation received, "what happens next" steps, admin contact details.

### Instructor Approved Notification (NEW)
**Subject:** `✅ You're Verified – Welcome to Drive Alive!`

Body includes: login link, schedule summary, welcome message.

### WhatsApp Versions (all 4)
Shorter plain-text equivalents:
- Admin: `"New instructor {name} needs verification. Tap: {link}"`
- Company owner: `"{name} wants to join {company}. Approve: {link}"`
- Instructor pending: `"Hi {name}, registration received. Contact {admin_phone} if needed."`
- Instructor approved: `"Hi {name}, you're verified! Log in at {url}"`

---

## 12. 🗺️ Implementation Order

```
Phase 1 – Data Layer
  [ ] Company SQLAlchemy model
  [ ] InstructorSchedule SQLAlchemy model
  [ ] Instructor model new columns
  [ ] Alembic migration + apply

Phase 2 – Backend Schemas
  [ ] company.py schemas
  [ ] instructor_schedule.py schemas
  [ ] Update instructor.py schemas

Phase 3 – Backend Services
  [ ] company_service.py
  [ ] Update instructor_verification_service.py

Phase 4 – Backend Routes
  [ ] companies.py router
  [ ] GET /setup/admin-contact
  [ ] Update POST /auth/register/instructor
  [ ] GET /verify/instructor/admin/{token}
  [ ] GET /verify/instructor/company/{token}
  [ ] POST /admin/instructors/{id}/verify|reject|resend
  [ ] POST /instructor/company/instructors/{id}/verify|reject
  [ ] Login 403 guard

Phase 5 – Frontend Registration
  [ ] Multi-step wizard scaffold
  [ ] Step 1 – Personal Info
  [ ] Step 2 – Company (ScheduleEditor component)
  [ ] Step 3 – Schedule
  [ ] Step 4 – Review & Submit + success screen

Phase 6 – Frontend Auth & Verify
  [ ] Login 403 pending modal
  [ ] InstructorAdminVerifyScreen update
  [ ] InstructorCompanyVerifyScreen (new)
  [ ] Deep link routing in App.tsx

Phase 7 – Frontend Panels
  [ ] Admin instructors list badges + filters
  [ ] Admin instructor detail verify/reject UI
  [ ] Instructor profile "My Instructors" tab

Phase 8 – Notifications
  [ ] All 4 email templates
  [ ] All 4 WhatsApp templates
```

---

## 13. Verification State Machine

```
REGISTRATION
     │
     ▼
pending_admin  ◄─────────── always starts here
     │
     ├── admin rejects ──────────────────► rejected
     │
     ├── independent or company owner
     │   admin approves
     │        │
     │        ▼
     │     verified ✅
     │
     └── company member
         admin approves
              │
              ▼
        pending_company  ◄─────── company owner rejects ──► rejected
              │
              company owner approves
              │
              ▼
           verified ✅
```

---

## 14. API Reference Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/companies` | Public | Company list for dropdown |
| `GET` | `/setup/admin-contact` | Public | Admin email + phone |
| `POST` | `/auth/register/instructor` | Public | Register + schedule + company |
| `POST` | `/auth/login` | Public | 403 if unverified (with contact) |
| `GET` | `/verify/instructor/admin/{token}` | Public | Admin verifies via link |
| `GET` | `/verify/instructor/company/{token}` | Public | Company owner verifies via link |
| `POST` | `/admin/instructors/{id}/verify` | Admin JWT | Admin verifies from panel |
| `POST` | `/admin/instructors/{id}/reject` | Admin JWT | Admin rejects from panel |
| `POST` | `/admin/instructors/{id}/resend-verification` | Admin JWT | Resend links |
| `POST` | `/instructor/company/instructors/{id}/verify` | Instructor JWT | Company owner verifies |
| `POST` | `/instructor/company/instructors/{id}/reject` | Instructor JWT | Company owner rejects |

---

*Drive Alive — Instructor Registration & Verification Overhaul*
