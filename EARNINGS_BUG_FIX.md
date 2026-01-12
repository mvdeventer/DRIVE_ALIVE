# Earnings Display Bug Fix - Route Ordering Issue

## Problem

Instructor earnings were showing R0.00 in the frontend despite having 29 completed lessons totaling R10,150.00 in the database.

## Root Cause

**FastAPI Route Ordering Conflict**

The `/earnings-report` endpoint was defined **AFTER** the `/{instructor_id}` catch-all route in `backend/app/routes/instructors.py`:

```python
# WRONG ORDER (original):
@router.get("/me")              # Line 122
async def get_instructor_profile(): ...

@router.get("/{instructor_id}") # Line 181 - Catches EVERYTHING after /instructors/
async def get_instructor(): ...

@router.get("/earnings-report") # Line 465 - NEVER REACHED!
async def get_earnings_report(): ...
```

When the frontend called `/instructors/earnings-report`, FastAPI matched it against `/{instructor_id}` first, treating `"earnings-report"` as the `instructor_id` parameter. Since `instructor_id: int`, FastAPI tried to parse the string "earnings-report" as an integer, resulting in:

```
422 Unprocessable Entity
{"detail":"instructor_id: Input should be a valid integer, unable to parse string as an integer"}
```

## Solution

**Move specific routes BEFORE parameterized routes:**

```python
# CORRECT ORDER (fixed):
@router.get("/me")              # Line 122
async def get_instructor_profile(): ...

@router.get("/earnings-report", response_model=None) # NEW POSITION - Line 178
async def get_earnings_report(): ...

@router.get("/{instructor_id}") # Line 291 - Now only catches truly numeric IDs
async def get_instructor(): ...
```

FastAPI matches routes in the order they're defined. More specific routes (literal paths like `/earnings-report`) must come **before** catch-all routes with path parameters (`/{instructor_id}`).

## Changes Made

### File: `backend/app/routes/instructors.py`

1. **Moved** `@router.get("/earnings-report")` from line 465 to line 178 (right after `/me`)
2. **Added** `response_model=None` to prevent automatic Pydantic validation
3. **Deleted** the duplicate endpoint from its original location

### Route Order (Final)

1. `/` - List all instructors
2. `/me` - Get current instructor profile
3. `/earnings-report` - Get earnings report (**FIXED POSITION**)
4. `/{instructor_id}` - Get specific instructor by ID
5. `/by-user/{user_id}` - Get instructor by user ID
6. `/my-bookings` - Get instructor's bookings
7. ... (other endpoints)

## Verification

**Test Command:**

```bash
cd backend
.\venv\Scripts\python.exe test_http_endpoint.py
```

**Expected Result:**

```
Status Code: 200
Response Body:
{
  "total_earnings": 10150.0,
  "hourly_rate": 350.0,
  "completed_lessons": 29,
  "pending_lessons": 0,
  "cancelled_lessons": 0,
  "total_lessons": 29,
  "earnings_by_month": [...],
  "recent_earnings": [...]
}
```

## Database State (Verified)

- **Martin van Deventer (instructor_id=1):**

  - Completed lessons: 29
  - Total earnings: R10,150.00
  - Hourly rate: R350.00

- **gary van Deventer (instructor_id=3):**

  - Completed lessons: 7
  - Total earnings: R2,450.00

- **LEEN van Deventer (instructor_id=2):**
  - Completed lessons: 1
  - Total earnings: R350.00

## Additional Fixes Applied

1. **Enum Comparison Fix:**

   - Changed `b.status.value == "completed"` to `b.status == BookingStatus.COMPLETED`
   - Added `from ..models.booking import Booking, BookingStatus`

2. **Null Safety:**

   - Added `float(instructor.hourly_rate) if instructor.hourly_rate else 0.0`

3. **Debug Logging:**
   - Added print statements to track endpoint calls and responses

## Lessons Learned

**FastAPI Route Ordering Rules:**

1. ✅ Specific literal paths FIRST: `/me`, `/earnings-report`, `/my-bookings`
2. ⚠️ Parameterized paths LAST: `/{instructor_id}`, `/{user_id}`
3. ❌ Never define specific routes after catch-all routes

**Example:**

```python
# ✅ CORRECT
@router.get("/special-action")  # Literal path
@router.get("/{item_id}")        # Catch-all

# ❌ WRONG
@router.get("/{item_id}")        # Catches everything
@router.get("/special-action")  # Never reached!
```

## Status

✅ **RESOLVED** - Earnings now display correctly in both instructor and admin dashboards.

## Files Modified

- `backend/app/routes/instructors.py` - Reordered earnings endpoint
- `backend/test_http_endpoint.py` - Created for testing
- `backend/reset_password.py` - Reset test user password
- `backend/quick_test.py` - Validated endpoint logic

## Date

January 12, 2026
