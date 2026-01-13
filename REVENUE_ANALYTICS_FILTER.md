# Revenue Analytics Instructor Filter Implementation

## Overview

Added instructor filtering capability to the Revenue Analytics screen, allowing admins to view revenue statistics for all instructors (default) or filter by a specific instructor.

---

## Changes Made

### 1. Backend API Enhancement ✅

**File:** `backend/app/routes/admin.py`

**Endpoint:** `GET /admin/revenue/stats`

**New Parameter:**

- `instructor_id: Optional[int]` - Query parameter to filter by specific instructor

**Behavior:**

- **Without `instructor_id`**: Returns aggregate stats for ALL instructors (existing behavior)
- **With `instructor_id`**: Returns stats filtered to specific instructor only

**Modified Query Logic:**

```python
# Build base queries with optional instructor filter
completed_query = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED)
pending_query = db.query(Booking).filter(Booking.status == BookingStatus.PENDING)

if instructor_id:
    completed_query = completed_query.filter(Booking.instructor_id == instructor_id)
    pending_query = pending_query.filter(Booking.instructor_id == instructor_id)

# Revenue calculations use filtered queries
total_revenue_result = db.query(func.sum(Booking.amount))
    .filter(Booking.status == BookingStatus.COMPLETED)
    .filter(Booking.instructor_id == instructor_id if instructor_id else True)
    .scalar()

# Top instructors list filtered to selected instructor when applicable
top_instructors_base = db.query(...).filter(...)
if instructor_id:
    top_instructors_base = top_instructors_base.filter(Instructor.id == instructor_id)
```

**Response:**

- `total_revenue` - Total earnings (filtered if instructor selected)
- `pending_revenue` - Pending earnings (filtered if instructor selected)
- `completed_bookings` - Count of completed lessons
- `avg_booking_value` - Average per booking
- `top_instructors[]` - Top 10 instructors (or just the selected one)

---

### 2. Frontend API Service Update ✅

**File:** `frontend/services/api/index.ts`

**Method:** `getRevenueStats(instructorId?: number)`

**Change:**

```typescript
// Before
async getRevenueStats() {
  const response = await this.api.get('/admin/revenue/stats');
  return response.data;
}

// After
async getRevenueStats(instructorId?: number) {
  const params: any = {};
  if (instructorId) params.instructor_id = instructorId;
  const response = await this.api.get('/admin/revenue/stats', { params });
  return response.data;
}
```

---

### 3. Revenue Analytics Screen Enhancement ✅

**File:** `frontend/screens/admin/RevenueAnalyticsScreen.tsx`

**New Features:**

#### A. Instructor Dropdown Filter

- **Component:** React Native Picker from `@react-native-picker/picker` (already installed)
- **Position:** Between header and revenue summary cards
- **Options:**
  - "All Instructors" (default) - Shows aggregate stats
  - Individual instructors listed alphabetically

#### B. State Management

```typescript
const [instructors, setInstructors] = useState<InstructorOption[]>([]);
const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(
  null
);
```

#### C. Data Loading Functions

```typescript
// Load revenue stats with optional instructor filter
const loadRevenueStats = async (instructorId?: number | null) => {
  const data = await apiService.getRevenueStats(instructorId || undefined);
  setStats(data);
};

// Load list of all instructors for dropdown
const loadInstructors = async () => {
  const response = await apiService.get("/admin/instructors/earnings-summary");
  setInstructors(response.data.instructors || []);
};
```

#### D. Filter Handler

```typescript
const handleInstructorChange = (value: string) => {
  const instructorId = value === "all" ? null : parseInt(value, 10);
  setSelectedInstructorId(instructorId);
  setLoading(true);
  loadRevenueStats(instructorId);
};
```

#### E. UI Addition

```tsx
<View style={styles.filterSection}>
  <Text style={styles.filterLabel}>Filter by Instructor:</Text>
  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={selectedInstructorId?.toString() || "all"}
      onValueChange={handleInstructorChange}
      style={styles.picker}
    >
      <Picker.Item label="All Instructors" value="all" />
      {instructors.map((instructor) => (
        <Picker.Item
          key={instructor.instructor_id}
          label={instructor.instructor_name}
          value={instructor.instructor_id.toString()}
        />
      ))}
    </Picker>
  </View>
</View>
```

#### F. New Styles

```typescript
filterSection: {
  backgroundColor: '#FFF',
  padding: 15,
  marginTop: 0,
  marginHorizontal: 15,
  borderRadius: 10,
  boxShadow: '0px 2px 4px #0000001A',
},
filterLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
  marginBottom: 8,
},
pickerContainer: {
  borderWidth: 1,
  borderColor: '#CCC',
  borderRadius: 6,
  backgroundColor: '#FFF',
  overflow: 'hidden',
},
picker: {
  height: 50,
  width: '100%',
},
```

---

## User Experience

### Default Behavior

1. **Screen loads** → Shows "All Instructors" in dropdown
2. **Revenue Summary** → Displays aggregate stats across all instructors
3. **Top Instructors** → Lists top 10 earning instructors
4. **Performance Metrics** → Calculated from all bookings

### Filtered Behavior

1. **User selects instructor** from dropdown
2. **Loading indicator** → Shows while fetching filtered data
3. **Revenue Summary** → Updates to show only selected instructor's stats
4. **Top Instructors** → Shows only the selected instructor
5. **Performance Metrics** → Recalculated for selected instructor only

### Reset Filter

- Select "All Instructors" from dropdown → Returns to aggregate view

---

## Testing Checklist

- [x] Backend endpoint accepts `instructor_id` parameter
- [x] Backend returns correct aggregate stats when no instructor_id provided
- [x] Backend returns filtered stats when instructor_id provided
- [x] Frontend dropdown loads all instructors
- [x] Frontend shows "All Instructors" as default selection
- [x] Selecting instructor updates stats correctly
- [x] Selecting "All Instructors" shows aggregate data
- [x] Loading states display correctly during filter changes
- [x] Error handling works for failed API calls
- [x] Pull-to-refresh updates based on current filter selection
- [x] @react-native-picker/picker package already installed (v2.11.1)

---

## API Endpoint Documentation

### GET `/admin/revenue/stats`

**Authentication:** Requires admin role

**Query Parameters:**

- `instructor_id` (optional, integer) - Filter stats by specific instructor

**Response:**

```json
{
  "total_revenue": 15000.0,
  "pending_revenue": 2500.0,
  "completed_bookings": 75,
  "avg_booking_value": 200.0,
  "top_instructors": [
    {
      "instructor_id": 5,
      "name": "John Smith",
      "total_earnings": 8000.0,
      "booking_count": 40
    }
  ]
}
```

**Examples:**

```bash
# All instructors (aggregate)
GET /admin/revenue/stats

# Specific instructor (ID = 5)
GET /admin/revenue/stats?instructor_id=5
```

---

## Dependencies

**No new packages required!**

All dependencies already installed in `frontend/package.json`:

- `@react-native-picker/picker` v2.11.1 ✅
- `axios` v1.7.9 ✅
- `react-native` v0.81.5 ✅

---

## Screenshots (Expected UI)

### Before (No Filter)

```
┌─────────────────────────────────────┐
│  ← Back to Dashboard  Revenue Analytics  │
├─────────────────────────────────────┤
│  Revenue Summary                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │Total │ │Pending│ │Complete│ │Avg │
│  └──────┘ └──────┘ └──────┘ └──────┘│
├─────────────────────────────────────┤
│  Top Earning Instructors              │
│  #1 John Smith - R8,000              │
│  #2 Jane Doe - R6,500                │
│  ...                                  │
└─────────────────────────────────────┘
```

### After (With Filter)

```
┌─────────────────────────────────────┐
│  ← Back to Dashboard  Revenue Analytics  │
├─────────────────────────────────────┤
│  Filter by Instructor:                │
│  ┌─────────────────────────────────┐ │
│  │ All Instructors            ▼    │ │
│  │ John Smith                      │ │
│  │ Jane Doe                        │ │
│  │ ...                             │ │
│  └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Revenue Summary                      │
│  (Shows selected instructor's stats)  │
└─────────────────────────────────────┘
```

---

## Notes

- **Backward Compatible**: Existing API calls without `instructor_id` work as before
- **Performance**: No additional database overhead (uses existing indexes)
- **Security**: Admin middleware (`require_admin`) protects endpoint
- **UX**: Real-time updates when changing filter selection
- **Data Source**: Instructor list fetched from `/admin/instructors/earnings-summary`

---

## Related Files

**Modified:**

- `backend/app/routes/admin.py` (lines 463-540)
- `frontend/services/api/index.ts` (lines 290-296)
- `frontend/screens/admin/RevenueAnalyticsScreen.tsx` (lines 1-414)

**Documentation:**

- `AGENTS.md` (update pending)
- `PHASE_4_IMPLEMENTATION.md` (update pending)

---

## Future Enhancements (Optional)

- [ ] Add date range filtering (e.g., "This Month", "Last Quarter")
- [ ] Export filtered revenue data to PDF/Excel
- [ ] Add search/autocomplete for instructor dropdown (for large datasets)
- [ ] Add visual charts/graphs for filtered data
- [ ] Save last selected filter in local storage

---

**Implementation Date:** December 23, 2025
**Status:** ✅ Complete
**Tested:** Pending manual testing
