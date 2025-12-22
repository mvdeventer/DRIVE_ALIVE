# 60-Minute Standard Lesson Implementation

## Summary

Removed 30-minute and 120-minute lesson options, standardizing all lessons to 60 minutes with 15-minute spacing between bookings to allow instructor travel time.

## Changes Made

### Backend (Python)

**File**: `backend/app/routes/availability.py`

1. **Modified `get_available_slots_for_date()` function (Line 193)**:

   ```python
   # OLD: Move to next slot (15-minute intervals)
   # current_time += timedelta(minutes=15)

   # NEW: Move to next slot with 15min buffer (60min lesson + 15min spacing)
   current_time += timedelta(minutes=duration_minutes + 15)
   ```

2. **Modified `get_all_slots_with_booking_status()` function (Line 303)**:

   ```python
   # OLD: Move to next slot (15-minute intervals)
   # current_time += timedelta(minutes=15)

   # NEW: Move to next slot with 15min buffer (60min lesson + 15min spacing)
   current_time += timedelta(minutes=duration_minutes + 15)
   ```

### Frontend (TypeScript/React Native)

**File**: `frontend/screens/booking/BookingScreen.tsx`

**Modified Duration Selector (Lines 572-585)**:

```tsx
{
  /* OLD: Multiple duration options
{['60', '90', '120'].map(duration => (
  <TouchableOpacity onPress={() => updateField('duration_minutes', duration)}>
    <Text>{duration} min</Text>
  </TouchableOpacity>
))}
*/
}

{
  /* NEW: Fixed 60-minute duration */
}
<View style={styles.formGroup}>
  <Text style={styles.label}>Duration (minutes)</Text>
  <View style={styles.durationButtons}>
    <TouchableOpacity
      style={[styles.durationButton, styles.durationButtonActive]}
      disabled
    >
      <Text
        style={[styles.durationButtonText, styles.durationButtonTextActive]}
      >
        60 min (Standard)
      </Text>
    </TouchableOpacity>
  </View>
</View>;
```

## Slot Generation Pattern

### Before (15-minute intervals):

- 08:00-09:00 (60min)
- 08:15-09:15 (60min) ← Can overlap with previous
- 08:30-09:30 (60min) ← Can overlap with previous
- ...

### After (60min + 15min buffer = 75min intervals):

- 08:00-09:00 (60min)
- 09:15-10:15 (60min) ← 15min gap for travel
- 10:30-11:30 (60min) ← 15min gap for travel
- 11:45-12:45 (60min) ← 15min gap for travel
- ...

## Benefits

1. **Prevents Instructor Overload**: 15-minute buffer ensures no back-to-back lessons
2. **Travel Time**: Allows instructors to travel between pickup locations
3. **Standard Duration**: All lessons are 60 minutes, simplifying pricing and scheduling
4. **Student Clarity**: No confusion about different lesson lengths
5. **Booking Simplification**: Reduces complexity in booking UI

## Testing

Tested slot generation with sample instructor schedule:

```
✅ Found 7 slots

Slot Schedule (showing time spacing):

 1. 08:00 - 09:00 (60min lesson)
    └─ 15min gap until next slot

 2. 09:15 - 10:15 (60min lesson)
    └─ 15min gap until next slot

 3. 10:30 - 11:30 (60min lesson)
    └─ 15min gap until next slot

 4. 11:45 - 12:45 (60min lesson)
    └─ 15min gap until next slot

 5. 13:00 - 14:00 (60min lesson)
    └─ 15min gap until next slot

 6. 14:15 - 15:15 (60min lesson)
    └─ 15min gap until next slot

 7. 15:30 - 16:30 (60min lesson)
```

## Backward Compatibility

- ✅ Existing bookings with 90min or 120min durations remain valid
- ✅ Backend still accepts `duration_minutes` parameter (for future flexibility)
- ✅ API endpoint constraints unchanged: `ge=30, le=180` (kept for backward compat)
- ⚠️ Frontend now only allows 60min bookings for new lessons

## Future Considerations

If variable durations are needed again:

1. Update frontend to show multiple duration buttons
2. Backend slot generation already supports any duration with 15min buffer
3. Consider adding configurable buffer time per instructor

## Date

December 22, 2025

## Status

✅ Complete and Tested
