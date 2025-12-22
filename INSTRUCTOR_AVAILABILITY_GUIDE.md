# Instructor Availability Management Guide

## Overview

The availability management screen allows instructors to set their weekly schedule and manage time-off periods with an intuitive, user-friendly interface.

---

## Features

### 📅 Weekly Schedule Management

**Setting Your Regular Hours:**

1. **Navigate to Availability**

   - From your instructor dashboard, tap "Manage My Schedule & Hours"

2. **Enable Days You Work**

   - Toggle the switch for each day you want to work
   - Enabled days will show green switches

3. **Set Your Working Hours**

   - **Mobile/Tablet**: Tap the time button (shows current time with 🕐 icon)

     - A scrollable time picker will appear
     - Scroll to select hours and minutes
     - Times are in 15-minute intervals (8:00, 8:15, 8:30, 8:45, etc.)
     - Tap "Done" or confirm to save

   - **Web**: Tap the time button
     - A modal will appear
     - Enter time in HH:MM format (e.g., 08:00, 17:30)
     - Click "Done"

4. **Save Your Schedule**
   - After setting all your days and times, tap "💾 Save Schedule"
   - You'll see a confirmation message when saved successfully

**Example Weekly Schedule:**

```
Monday:    08:00 - 17:00 ✅
Tuesday:   08:00 - 17:00 ✅
Wednesday: 08:00 - 17:00 ✅
Thursday:  08:00 - 17:00 ✅
Friday:    08:00 - 17:00 ✅
Saturday:  08:00 - 13:00 ✅
Sunday:    Disabled ❌
```

---

### 🚫 Time Off Management

**Blocking Unavailable Dates:**

1. **Set Start Date**

   - **Mobile/Tablet**: Tap the start date field (shows 📅 icon)

     - A calendar picker will appear
     - Scroll through months if needed
     - Tap the date you want to start your time off

   - **Web**: Tap the start date field
     - A modal will appear
     - Enter date in YYYY-MM-DD format (e.g., 2024-12-25)
     - Click "Done"

2. **Set End Date**

   - Same process as start date
   - Can be the same day for single-day time off
   - Or a future date for multi-day periods

3. **Add Reason (Optional)**

   - Enter a reason like "Holiday", "Vacation", "Sick Leave"
   - This helps you track why you were unavailable

4. **Save Time Off**
   - Tap "➕ Add Time Off"
   - The blocked period will appear in your list

**Managing Existing Time Off:**

- All your time-off periods are listed below the form
- Each entry shows: `Start Date to End Date` with optional reason
- Tap the 🗑️ icon to delete a time-off period
- Confirm deletion when prompted

---

## How Students See Your Availability

### Time Slot Generation

When students view your profile and try to book a lesson, they will only see:

✅ **Available Slots:**

- Times within your weekly schedule
- Only on days you've enabled
- Not during time-off periods
- Not already booked by other students
- In 15-minute intervals

❌ **Hidden/Unavailable:**

- Times outside your working hours
- Disabled days
- Time-off dates
- Already booked slots

### Example Student View

If your Monday schedule is `08:00 - 12:00`, students will see:

```
Monday, Dec 23, 2024:
├─ 08:00 - 08:30 ✅ Available
├─ 08:30 - 09:00 ✅ Available
├─ 09:00 - 09:30 ❌ Booked
├─ 09:30 - 10:00 ✅ Available
├─ 10:00 - 10:30 ✅ Available
... (continues until 12:00)
```

---

## Tips & Best Practices

### ⏰ Time Selection

- **15-Minute Intervals**: All times snap to 15-minute increments (e.g., 8:00, 8:15, 8:30)
- **24-Hour Format**: Use 24-hour time (08:00, 14:30, 17:00) for consistency
- **Realistic Hours**: Set hours you can consistently maintain

### 📆 Planning Time Off

- **Book in Advance**: Add holidays and vacations as soon as you know about them
- **Update Promptly**: If plans change, delete or modify time-off entries
- **Be Specific**: Use the reason field to track different types of time off

### 🔄 Updating Schedule

- **Regular Reviews**: Check and update your schedule weekly
- **Seasonal Changes**: Adjust hours for different seasons or busy periods
- **Communication**: Students see real-time availability based on your latest settings

### 🎯 Maximizing Bookings

- **Consistent Schedule**: Keep a predictable weekly pattern
- **Peak Hours**: Enable popular booking times (early morning, after school)
- **Weekend Availability**: Consider Saturday slots for students with weekday commitments
- **Buffer Time**: Leave gaps between lessons for travel and breaks

---

## Troubleshooting

### "Invalid time range" Error

- **Cause**: End time is before or equal to start time
- **Solution**: Make sure end time is later than start time (e.g., Start: 08:00, End: 17:00)

### "Please enable at least one day" Error

- **Cause**: All days are disabled
- **Solution**: Toggle at least one day's switch to enable it

### Students Can't Book Slots

- **Check**: Is the day enabled in your weekly schedule?
- **Check**: Is the time within your working hours?
- **Check**: Have you added time-off that overlaps with the date?
- **Check**: Did you save your schedule after making changes?

### Time Picker Not Appearing (Mobile)

- **Android**: Picker shows immediately - select time and it auto-closes
- **iOS**: Picker shows as a spinner - scroll to select, then tap outside to confirm
- **Web**: Modal appears - type time manually in HH:MM format

### Date Picker Not Appearing (Mobile)

- **Android**: Calendar shows immediately - tap date and it auto-closes
- **iOS**: Calendar shows as a spinner - scroll to select month/day/year
- **Web**: Modal appears - type date manually in YYYY-MM-DD format

---

## Technical Details

### Time Slot Algorithm

```
For each enabled day:
  1. Get instructor's start_time and end_time
  2. Generate slots in 15-minute intervals
  3. Check each slot against:
     - Time-off exceptions
     - Custom availability overrides
     - Existing bookings
  4. Return only available slots to student
```

### Data Storage

- **Weekly Schedule**: Stored as recurring patterns (Mon-Sun)
- **Time Off**: Stored as date ranges with optional reasons
- **Custom Availability**: Override specific dates with different hours

---

## Support

For questions or issues with the availability system, contact your system administrator.

**Quick Reference:**

- 🕐 = Time picker
- 📅 = Date picker
- ✅ = Active/Available
- ❌ = Inactive/Unavailable
- 💾 = Save
- ➕ = Add
- 🗑️ = Delete

---

_Last Updated: December 22, 2024_
