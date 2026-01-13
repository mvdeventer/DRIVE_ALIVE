# Responsive Card Pattern - DRIVE ALIVE

## Overview

Consolidated all tile cards across the DRIVE ALIVE app to use a **consistent responsive pattern** that adapts to screen sizes:

- **4 cards per row** on large screens (>1200px)
- **2 cards per row** on tablets/medium screens (768-1200px)
- **1 card per row** on mobile screens (<768px)

## React Principles Used

1. **Flexbox Layout**: `flexDirection: 'row'` with `flexWrap: 'wrap'`
2. **Dynamic Sizing**: `flexBasis`, `minWidth`, `maxWidth`, `flexGrow`
3. **Negative Margins**: Parent container uses `marginHorizontal: -5` to offset child margins
4. **Box Sizing**: Each card has `margin: 5` for consistent spacing
5. **Platform-Agnostic**: Works across mobile, tablet, and web without media queries

## Standard Card Pattern

### Container Style

```typescript
containerGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginHorizontal: -5,
}
```

### Card Style

```typescript
card: {
  backgroundColor: '#fff',
  padding: 12,
  borderRadius: 8,
  margin: 5,
  flexBasis: '22%',      // ~4 cards on large screens
  minWidth: 150,         // Minimum card width (prevents too small)
  maxWidth: '48%',       // Maximum card width (~2 cards on tablets)
  flexGrow: 1,           // Fill available space
  alignItems: 'center',
  boxShadow: '0px 2px 4px #0000001A',
  elevation: 2,
}
```

### How It Works

1. **flexBasis: '22%'**: Each card takes ~22% of container width (allows 4 cards per row with margins)
2. **minWidth: 150**: When screen < ~680px, cards wrap to 2 per row (48% each)
3. **maxWidth: '48%'**: When screen < ~400px, cards wrap to 1 per row (96% width with margins)
4. **flexGrow: 1**: Cards expand to fill remaining space evenly

## Updated Screens

### Admin Screens

#### 1. AdminDashboardScreen.tsx

**Updated Sections:**

- `statsGrid` + `statCard` - System statistics (4/2/1 layout)
- `actionGrid` + `actionCard` - Quick action buttons (4/2/1 layout)

**Before:**

```typescript
statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }
statCard: { width: '48%', ... }
```

**After:**

```typescript
statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }
statCard: { flexBasis: '22%', minWidth: 150, maxWidth: '48%', flexGrow: 1, margin: 5, ... }
```

#### 2. RevenueAnalyticsScreen.tsx

**Status:** ✅ Already using responsive pattern

- `statsGrid` + `statCard` - Revenue summary cards

#### 3. BookingOversightScreen.tsx

**Updated Sections:**

- `bookingCard` - Booking cards in grid view

**Changes:**

- Updated `flexBasis: '22%'`, `minWidth: 280`, `maxWidth: '48%'`
- Increased padding from 10 to 12px
- Added `flexGrow: 1` and consistent margins

#### 4. InstructorEarningsOverviewScreen.tsx

**Updated Sections:**

- `summarySection` + `summaryCard` - Modal summary cards (Total Earnings, Completed, Hourly Rate)
- `statsGrid` + `statBadge` - Lesson statistics badges (Completed, Pending, Cancelled, Total)

**Changes:**

- Summary cards: `flexBasis: '30%'`, `minWidth: 120`, `maxWidth: '48%'`
- Stat badges: `flexBasis: '22%'`, `minWidth: 100`, `maxWidth: '48%'`

#### 5. UserManagementScreen.tsx

**Updated Sections:**

- `gridContainer` + `cardWrapper` - User cards

**Changes:**

- Replaced fixed widths (`32%` / `100%`) with responsive flexBasis
- `flexBasis: '22%'`, `minWidth: 280`, `maxWidth: '48%'`
- Removed platform-specific logic (`isLargeScreen` checks)

### Student Screens

#### 6. StudentHomeScreen.tsx

**Updated Sections:**

- `statsContainer` + `statCard` - Quick stats (Upcoming, Completed, Minutes Booked)
- `bookingsGrid` + `bookingCard` - Booking cards

**Changes:**

- Stats: `flexBasis: '30%'`, `minWidth: 120`, `maxWidth: '48%'` (allows 3/2/1 layout)
- Bookings: `flexBasis: '30%'`, `minWidth: 250`, `maxWidth: '48%'`
- Removed platform-specific `calc()` CSS

#### 7. InstructorListScreen.tsx

**Updated Sections:**

- `row` + `instructorCard` - Instructor cards

**Changes:**

- Added `flexWrap: 'wrap'` to row container
- `flexBasis: '30%'`, `minWidth: 280`, `maxWidth: '48%'`
- Replaced `gap: 10` with `marginHorizontal: -5` + card margins

### Instructor Screens

#### 8. EarningsReportScreen.tsx

**Status:** ✅ Already using responsive pattern

- `summaryGrid` + `summaryCard` - Earnings overview cards
- `statsGrid` + `statCard` - Lesson statistics cards

## Visual Examples

### Large Screen (>1200px)

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 │
└────────┘ └────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐
│ Card 5 │ │ Card 6 │
└────────┘ └────────┘
```

### Tablet (768-1200px)

```
┌──────────────┐ ┌──────────────┐
│    Card 1    │ │    Card 2    │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│    Card 3    │ │    Card 4    │
└──────────────┘ └──────────────┘
```

### Mobile (<768px)

```
┌────────────────────────────┐
│          Card 1            │
└────────────────────────────┘
┌────────────────────────────┐
│          Card 2            │
└────────────────────────────┘
```

## Benefits

1. **Consistency**: Same pattern across all screens
2. **Responsive**: Automatically adapts without media queries
3. **Maintainable**: Single pattern to update across codebase
4. **Accessible**: Works across mobile, tablet, and desktop
5. **Performance**: Pure Flexbox (no JavaScript calculations)
6. **Future-proof**: Easy to adjust breakpoints via `flexBasis` and `maxWidth`

## Common Variations

### 3 Cards Max (e.g., Stats with 3 items)

```typescript
statCard: {
  flexBasis: '30%',    // 3 cards per row
  minWidth: 120,
  maxWidth: '48%',     // 2 cards on tablet
  flexGrow: 1,
  margin: 5,
}
```

### Larger Cards (e.g., Booking Details)

```typescript
bookingCard: {
  flexBasis: '30%',
  minWidth: 280,       // Larger minimum width
  maxWidth: '48%',
  flexGrow: 1,
  margin: 5,
}
```

## Migration Checklist

When adding new card layouts:

- [ ] Use `flexDirection: 'row'` + `flexWrap: 'wrap'` on container
- [ ] Add `marginHorizontal: -5` to container
- [ ] Set `flexBasis: '22%'` (or '30%' for 3-card layouts)
- [ ] Set `minWidth` appropriate for content (100-280px)
- [ ] Set `maxWidth: '48%'` for tablet breakpoint
- [ ] Add `flexGrow: 1` to fill space
- [ ] Add `margin: 5` for consistent spacing
- [ ] Add `boxShadow` and `elevation` for depth
- [ ] Remove old `width`, `gap`, or platform-specific CSS

## Testing Checklist

Test on:

- [ ] Desktop (>1200px): Should show 4 cards per row
- [ ] Tablet (768-1200px): Should show 2 cards per row
- [ ] Mobile (<768px): Should show 1 card per row
- [ ] Edge cases: 3 cards total, 5 cards total
- [ ] Verify spacing is consistent (5px margins)
- [ ] Verify cards don't overflow container

## Files Modified

1. `frontend/screens/admin/AdminDashboardScreen.tsx`
2. `frontend/screens/admin/RevenueAnalyticsScreen.tsx` (verified)
3. `frontend/screens/admin/BookingOversightScreen.tsx`
4. `frontend/screens/admin/InstructorEarningsOverviewScreen.tsx`
5. `frontend/screens/admin/UserManagementScreen.tsx`
6. `frontend/screens/student/StudentHomeScreen.tsx`
7. `frontend/screens/student/InstructorListScreen.tsx`
8. `frontend/screens/instructor/EarningsReportScreen.tsx` (verified)

## Future Enhancements

1. **Shared Component**: Create `<ResponsiveCardGrid>` component
2. **Theme Support**: Centralize card styles in theme file
3. **Custom Breakpoints**: Add prop for custom `flexBasis` values
4. **Animation**: Add entrance animations for card grids

---

**Date**: January 12, 2026
**Author**: GitHub Copilot
**Version**: 1.0
