# Booking Fee & Pricing Structure

## Overview

The Drive Alive app implements a two-component pricing model for driving lessons:

1. **Lesson Price** (Instructor Hourly Rate × Duration)
2. **Booking Fee** (Per-instructor configurable fee)

## Database Structure

### Instructor Model

- `hourly_rate` (Float, required): Base rate per hour (e.g., R90/hr)
- `booking_fee` (Float, default R10): Per-booking platform fee

### Booking Model

- `amount` (Float): **Lesson price ONLY** (hourly_rate × duration)
- `booking_fee` (Float): Booking fee at time of booking (copied from instructor)

## Pricing Display

### Students See: TOTAL PRICE

Students always see the **complete cost** including both components:

- **Display Formula**: `amount + booking_fee`
- **Example**: R90 lesson + R10 fee = **R100 total**

### Locations Showing Total Price:

1. **Instructor List** (`InstructorListScreen.tsx`):

   ```tsx
   R{((instructor.hourly_rate || 0) + (instructor.booking_fee || 10.0)).toFixed(2)}/hr
   ```

2. **Booking Screen** (`BookingScreen.tsx`):

   ```tsx
   R{((instructor.hourly_rate * duration_minutes) / 60 + (instructor.booking_fee || 10.0)).toFixed(2)}
   ```

3. **Student Home** (`StudentHomeScreen.tsx`):
   ```tsx
   total_price: booking.amount + booking.booking_fee; // From backend API
   ```

### Instructors See: FULL AMOUNT

Instructors see the complete booking amount (amount + booking_fee) for earnings tracking.

## Backend API Response

### `/bookings/my-bookings` Endpoint

Returns different data based on user role:

**For Students:**

```json
{
  "total_price": 100.0,  // amount + booking_fee (displayed to students)
  ...
}
```

**For Instructors:**

```json
{
  "total_price": 100.0,  // Full booking amount (same calculation)
  ...
}
```

## Admin Configuration

Admins can configure per-instructor booking fees through:

1. **Edit Instructor Profile**: Set custom `booking_fee` for each instructor
2. **Default Value**: R10.00 (if not set)

## WhatsApp Notifications

WhatsApp confirmations show the **TOTAL amount**:

```python
total_amount = booking.amount + booking.booking_fee
whatsapp_service.send_booking_confirmation(..., amount=total_amount)
```

## Payment Processing

When processing payments (Stripe/PayFast), the total is calculated as:

```python
payment_amount = booking.amount + booking.booking_fee
```

## Migration Notes

### Historical Data Fix

Old bookings stored `amount = lesson_price + booking_fee`. Fixed via `fix_booking_amounts.py`:

- Subtracted `booking_fee` from `amount` field
- Now `amount` contains only lesson price
- `booking_fee` stored separately

### Default Booking Fee Changes

- **Old Default**: R20.00
- **New Default**: R10.00
- Updated in `Instructor` model and all API defaults

## Code Locations

### Backend

- **Booking Creation**: `backend/app/routes/bookings.py` (lines 245-270)
- **API Response**: `backend/app/routes/bookings.py` (lines 735-770)
- **Instructor Model**: `backend/app/models/user.py` (line 100)

### Frontend

- **Booking Screen**: `frontend/screens/booking/BookingScreen.tsx` (line 1060)
- **Instructor List**: `frontend/screens/student/InstructorListScreen.tsx` (lines 349, 415)
- **Student Home**: `frontend/screens/student/StudentHomeScreen.tsx` (displays `total_price` from API)

## Testing

### Verify Pricing Display:

1. Login as student
2. Browse instructors - should see R100/hr (R90 + R10)
3. Book a lesson - should show R100 total
4. View upcoming lessons - should show R100

### Verify Database:

```python
from app.models.booking import Booking
from app.database import SessionLocal

db = SessionLocal()
booking = db.query(Booking).first()
print(f"Lesson Price: R{booking.amount}")
print(f"Booking Fee: R{booking.booking_fee}")
print(f"Total: R{booking.amount + booking.booking_fee}")
```

## Summary

- **Database**: Stores lesson price and booking fee separately
- **Display**: Always shows TOTAL (lesson + fee) to students
- **Admin**: Can configure per-instructor booking fees
- **Default**: R10 booking fee if not specified
