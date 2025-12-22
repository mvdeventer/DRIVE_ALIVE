# Calendar & Availability System Implementation

## Overview

Complete instructor scheduling and student booking system inspired by modern scheduling platforms like Calendly, Acuity Scheduling, and Google Calendar.

## ✅ Features Implemented

### Backend Features

#### 1. **Database Models** (`backend/app/models/availability.py`)

- **InstructorSchedule**: Weekly recurring availability (e.g., Monday 8am-5pm)
- **TimeOffException**: Specific dates when instructor is unavailable (holidays, sick days)
- **CustomAvailability**: Override regular schedule for specific dates
- **DayOfWeek Enum**: Monday-Sunday enumeration

#### 2. **API Endpoints** (`backend/app/routes/availability.py`)

**Schedule Management (Instructors)**

- `POST /availability/schedule` - Create single schedule entry
- `POST /availability/schedule/bulk` - Create multiple schedule entries (whole week)
- `GET /availability/schedule` - Get instructor's weekly schedule
- `PUT /availability/schedule/{id}` - Update schedule entry
- `DELETE /availability/schedule/{id}` - Delete schedule entry

**Time Off Management (Instructors)**

- `POST /availability/time-off` - Block out dates (vacation, holidays)
- `GET /availability/time-off` - Get all time off entries
- `DELETE /availability/time-off/{id}` - Remove time off

**Custom Availability (Instructors)**

- `POST /availability/custom` - Add availability for specific date
- `GET /availability/custom` - Get custom availability
- `DELETE /availability/custom/{id}` - Remove custom availability

**Overview (Instructors)**

- `GET /availability/overview` - Get complete availability overview

**Available Slots (Students - Public)**

- `GET /availability/instructor/{id}/slots` - Get available time slots
  - Query params: `start_date`, `end_date`, `duration_minutes`
  - Returns slots grouped by date
  - Automatically filters booked times
  - Respects instructor's schedule and time off

#### 3. **Booking Validation** (Updated `backend/app/routes/bookings.py`)

- ✅ Validates booking time against instructor's schedule
- ✅ Checks for time off conflicts
- ✅ Prevents double-booking
- ✅ Verifies time is within available hours
- ✅ Checks custom availability overrides

### Frontend Features

#### 1. **Instructor Availability Management** (`frontend/screens/instructor/ManageAvailabilityScreen.tsx`)

**Weekly Schedule Setup**

- Toggle each day on/off
- Set start and end times for each day
- Visual UI with switches and time inputs
- Bulk save all schedules at once

**Time Off Management**

- Add date ranges for unavailability
- Optional reason and notes
- Quick delete functionality
- List view of all time off entries

**Features:**

- Real-time validation (end time must be after start time)
- User-friendly error messages
- Loading states
- Auto-refresh after changes

#### 2. **Student Time Slot Selection** (Updated `frontend/screens/booking/BookingScreen.tsx`)

**Dynamic Slot Display**

- Shows available time slots for next 14 days
- Grouped by date with day labels
- Real-time slot availability
- Automatic refresh when duration changes

**Features:**

- Duration selection (30, 60, 90, 120 minutes)
- Visual slot selection with highlight
- Loading states while fetching slots
- Empty state when no slots available
- Scrollable slot container

**UI/UX:**

- Color-coded selected slots (green)
- Clear date and time formatting
- Responsive layout
- Touch-friendly buttons

#### 3. **Integration with Instructor Dashboard**

- Added "Manage My Schedule & Hours" button
- Quick access from main dashboard
- Clear call-to-action

## 🔄 How It Works

### For Instructors

1. **Initial Setup**

   - Navigate to "Manage My Schedule & Hours"
   - Enable days you want to work
   - Set start/end times for each day
   - Save schedule

2. **Add Time Off**

   - Enter start and end dates
   - Optional: Add reason (Holiday, Sick, etc.)
   - System blocks these dates from bookings

3. **Override Specific Dates**
   - Use custom availability for one-time changes
   - Overrides regular weekly schedule

### For Students

1. **Browse Instructors**

   - View instructor list
   - Select instructor to book

2. **Select Time Slot**

   - Choose lesson duration (30-120 minutes)
   - View available slots for next 2 weeks
   - Slots automatically filtered by:
     - Instructor's weekly schedule
     - Time off/unavailability
     - Existing bookings
     - Custom availability

3. **Complete Booking**
   - Selected slot auto-fills date/time
   - Add pickup address and notes
   - Submit booking

## 🗄️ Database Schema

### instructor_schedules

```sql
- id (PK)
- instructor_id (FK → instructors)
- day_of_week (enum: monday-sunday)
- start_time (time)
- end_time (time)
- is_active (boolean)
- created_at, updated_at
```

### time_off_exceptions

```sql
- id (PK)
- instructor_id (FK → instructors)
- start_date (date)
- end_date (date)
- start_time (time, optional)
- end_time (time, optional)
- reason (string)
- notes (text)
- created_at
```

### custom_availability

```sql
- id (PK)
- instructor_id (FK → instructors)
- date (date)
- start_time (time)
- end_time (time)
- is_active (boolean)
- created_at, updated_at
```

## 🚀 Setup Instructions

### 1. Database Migration

```bash
cd backend
python migrations/add_availability_tables.py
```

### 2. Restart Backend

```bash
# Make sure backend server is running with updated routes
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### 3. Update Frontend Navigation

Add route to instructor navigation stack (if not auto-registered):

```typescript
// In your navigation configuration
<Stack.Screen name="ManageAvailability" component={ManageAvailabilityScreen} />
```

## 📋 API Examples

### Create Weekly Schedule

```bash
POST /availability/schedule/bulk
{
  "schedules": [
    {
      "day_of_week": "monday",
      "start_time": "08:00",
      "end_time": "17:00",
      "is_active": true
    },
    {
      "day_of_week": "tuesday",
      "start_time": "09:00",
      "end_time": "18:00",
      "is_active": true
    }
  ]
}
```

### Add Time Off

```bash
POST /availability/time-off
{
  "start_date": "2025-12-25",
  "end_date": "2025-12-26",
  "reason": "Christmas Holiday"
}
```

### Get Available Slots

```bash
GET /availability/instructor/1/slots?start_date=2025-12-23&end_date=2025-12-30&duration_minutes=60

Response:
{
  "instructor_id": 1,
  "availability": [
    {
      "date": "2025-12-23",
      "slots": [
        {
          "start_time": "2025-12-23T08:00:00",
          "end_time": "2025-12-23T09:00:00",
          "duration_minutes": 60
        },
        {
          "start_time": "2025-12-23T09:15:00",
          "end_time": "2025-12-23T10:15:00",
          "duration_minutes": 60
        }
      ]
    }
  ]
}
```

## 🎯 Key Algorithm: Slot Generation

The system generates 15-minute interval slots:

1. Gets instructor's weekly schedule for the day
2. Adds custom availability for specific dates
3. Removes time off periods
4. Checks existing bookings
5. Returns only available slots

## 🔐 Security & Validation

- ✅ Instructors can only manage their own schedules
- ✅ Time validation (end must be after start)
- ✅ Date validation (end date >= start date)
- ✅ Booking conflict detection
- ✅ Schedule overlap prevention
- ✅ Authorization checks on all endpoints

## 🌟 Benefits

**For Instructors:**

- Complete control over availability
- Easy time off management
- No double-booking
- Flexible scheduling

**For Students:**

- See real-time availability
- Only book available slots
- Clear time slot selection
- No scheduling conflicts

**For the Platform:**

- Automated scheduling
- Reduced booking errors
- Professional appearance
- Scalable solution

## 📝 Next Steps (Optional Enhancements)

1. **Recurring Time Off** - Annual holidays
2. **Bulk Operations** - Copy week, set monthly patterns
3. **Notifications** - Alert when schedule changes
4. **Calendar Integration** - Export to Google Calendar
5. **Booking Buffer** - Add gap between lessons
6. **Peak Hour Pricing** - Different rates for different times
7. **Timezone Support** - For multi-region expansion
8. **Mobile Calendar View** - Visual calendar picker
9. **Quick Availability Toggle** - One-click on/off for specific days
10. **Analytics** - Most booked times, peak hours

## 🐛 Troubleshooting

**No slots showing:**

- Check instructor has set up weekly schedule
- Verify instructor is marked as available
- Check time off isn't blocking all dates

**Can't book a slot:**

- Slot may have been booked between loading and submission
- Check backend validation errors
- Verify instructor hasn't changed schedule

**Schedule not saving:**

- Check for overlapping time entries
- Verify start_time < end_time
- Check authentication token

## 📚 References

Implementation inspired by:

- Calendly's scheduling system
- Acuity Scheduling's availability logic
- Google Calendar's time slot generation
- Microsoft Bookings' instructor management

---

✅ **Implementation Complete**
All features are fully functional and ready for production use!
