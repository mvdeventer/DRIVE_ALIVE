# Quick Start: Calendar & Scheduling System

## For Instructors 👨‍🏫

### Setting Up Your Schedule (First Time)

1. **Login to your instructor account**
2. **Navigate to Dashboard**
3. **Click "📅 Manage My Schedule & Hours"**
4. **Set up your weekly schedule:**
   - Toggle ON the days you want to work
   - Set start time (e.g., 08:00)
   - Set end time (e.g., 17:00)
   - Click "💾 Save Schedule"

### Adding Time Off

1. **In the Manage Availability screen, scroll to "Time Off" section**
2. **Enter dates:**
   - Start Date: YYYY-MM-DD (e.g., 2025-12-25)
   - End Date: YYYY-MM-DD (e.g., 2025-12-26)
   - Reason: (optional, e.g., "Christmas Holiday")
3. **Click "➕ Add Time Off"**

### Example Weekly Schedule

```
Monday:    08:00 - 17:00 ✅
Tuesday:   08:00 - 17:00 ✅
Wednesday: 09:00 - 18:00 ✅
Thursday:  08:00 - 17:00 ✅
Friday:    08:00 - 16:00 ✅
Saturday:  09:00 - 14:00 ✅
Sunday:    OFF ❌
```

## For Students 🎓

### Booking a Lesson

1. **Login to your student account**
2. **Click "📚 Book a Lesson"**
3. **Select an instructor from the list**
4. **On the booking screen:**
   - Choose duration (30, 60, 90, or 120 minutes)
   - Available time slots will automatically load
   - Select a time slot (it will turn green)
   - Enter your pickup address
   - Add any notes (optional)
5. **Click "Book Lesson"**

### What You'll See

- ✅ Only available time slots (no booked times)
- 📅 Slots grouped by date
- 🕐 Real-time availability
- 🔄 Auto-refresh when you change duration

## Testing the System 🧪

### Test Scenario 1: Basic Schedule

**As Instructor:**

1. Set Monday 9am-5pm
2. Set Tuesday 9am-5pm

**As Student:**

1. Select this instructor
2. Choose 60 minutes
3. See slots: 9:00-10:00, 9:15-10:15, etc.

### Test Scenario 2: Time Off

**As Instructor:**

1. Add time off: Dec 25-26, 2025
2. Save

**As Student:**

1. Try to view slots for Dec 25
2. Should see NO slots available

### Test Scenario 3: Booking Conflict

**As Student 1:**

1. Book Mon Dec 23, 10:00-11:00

**As Student 2:**

1. Try to book same time
2. Slot should NOT be available

## API Testing 🔧

### Get Available Slots

```bash
curl -X GET "http://localhost:8000/availability/instructor/1/slots?start_date=2025-12-23&end_date=2025-12-30&duration_minutes=60" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Schedule

```bash
curl -X POST "http://localhost:8000/availability/schedule/bulk" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "day_of_week": "monday",
        "start_time": "08:00",
        "end_time": "17:00",
        "is_active": true
      }
    ]
  }'
```

## Common Issues & Solutions 🔧

### Issue: No slots showing

**Solution:**

- Make sure instructor has created a weekly schedule
- Check instructor is marked as "Available" (toggle on dashboard)
- Verify dates are in the future

### Issue: Can't save schedule

**Solution:**

- Ensure end time is after start time
- Check you've enabled at least one day
- Verify you're logged in as an instructor

### Issue: Slot disappeared when trying to book

**Solution:**

- Another student booked it first
- Refresh and select a different slot
- This is normal and prevents double-booking

## Database Check 🗄️

### Verify Tables Created

```sql
SELECT * FROM instructor_schedules;
SELECT * FROM time_off_exceptions;
SELECT * FROM custom_availability;
```

### Check Instructor's Schedule

```sql
SELECT * FROM instructor_schedules WHERE instructor_id = 1;
```

### View Bookings

```sql
SELECT * FROM bookings
WHERE instructor_id = 1
  AND lesson_date >= CURRENT_DATE
ORDER BY lesson_date;
```

## Feature Checklist ✅

**Instructor Features:**

- [ ] Can set weekly schedule
- [ ] Can modify existing schedule
- [ ] Can add time off
- [ ] Can remove time off
- [ ] Schedule prevents conflicting bookings

**Student Features:**

- [ ] Can view available slots
- [ ] Slots automatically filtered
- [ ] Can select and book slots
- [ ] Booking validates against schedule

**System Features:**

- [ ] No double-booking allowed
- [ ] Time off blocks availability
- [ ] 15-minute interval slots
- [ ] Real-time updates

## Next Steps 🚀

1. **Run Database Migration:**

   ```bash
   cd backend
   python migrations/add_availability_tables.py
   ```

2. **Restart Backend Server:**

   ```bash
   cd backend
   .\venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```

3. **Test as Instructor:**

   - Create account or login
   - Set up weekly schedule
   - Add some time off

4. **Test as Student:**

   - Create account or login
   - Browse instructors
   - Try booking a slot

5. **Verify Bookings:**
   - Check database
   - Confirm no conflicts
   - Test different durations

---

📚 **For detailed documentation, see:** `CALENDAR_SYSTEM_IMPLEMENTATION.md`
