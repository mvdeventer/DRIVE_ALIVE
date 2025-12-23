# Admin Dashboard Screens

## Overview

Admin dashboard screens for managing the Drive Alive platform. Provides comprehensive tools for system oversight, instructor verification, user management, booking oversight, and revenue analytics.

---

## Screens

### 1. AdminDashboardScreen.tsx

- [ ] **Main admin dashboard with system overview**

**Features:**

- System statistics display
  - Total users, active users
  - Instructor/student counts
  - Verification status
  - Booking statistics
  - Revenue overview
- Quick action cards
  - Verify Instructors (with pending count)
  - Manage Users
  - View Bookings
  - Revenue Analytics
- Color-coded metrics
  - Success (green): Active users, verified instructors, completed bookings
  - Warning (yellow): Pending items
  - Danger (red): Cancelled bookings
- Pull-to-refresh functionality

**Navigation:**

```typescript
navigation.navigate('InstructorVerification');
navigation.navigate('UserManagement');
navigation.navigate('BookingOversight');
navigation.navigate('RevenueAnalytics');
```

---

### 2. InstructorVerificationScreen.tsx

**Verify or reject pending instructor registrations**

**Features:**

- List of pending instructor verifications
- Detailed instructor information
  - Full name, contact details
  - License number and types
  - ID number
  - Vehicle details (make, model, year, registration)
- Verification actions
  - Approve button (green)
  - Reject button (red)
  - Optional account deactivation on rejection
- Confirmation alerts before actions
- Success/error messages
- Empty state when no pending verifications

**API Calls:**

```typescript
await apiService.getPendingInstructors();
await apiService.verifyInstructor(instructorId, approved, deactivate);
```

---

### 3. UserManagementScreen.tsx

**Manage all users across the system**

**Features:**

- User list with filtering
  - Filter by role (admin/instructor/student)
  - Filter by status (active/inactive/suspended)
- User information display
  - Full name, email, phone
  - Role badge (color-coded)
  - Status badge (color-coded)
  - Join date and last login
- Status management actions
  - Activate
  - Deactivate
  - Suspend
- Protection against self-deactivation
- Real-time filter updates

**Role Badge Colors:**

- Admin: Red (#DC3545)
- Instructor: Blue (#0066CC)
- Student: Green (#28A745)

**Status Badge Colors:**

- Active: Green (#28A745)
- Inactive: Gray (#6C757D)
- Suspended: Yellow (#FFC107)

**API Calls:**

```typescript
await apiService.getAllUsers(roleFilter, statusFilter);
await apiService.updateUserStatus(userId, newStatus);
```

---

### 4. BookingOversightScreen.tsx

**View and manage all bookings**

**Features:**

- Booking list with status filter
  - All statuses
  - Pending, Confirmed, Completed, Cancelled
- Booking details
  - Student and instructor names
  - Date and time range
  - Amount
  - Creation date
  - Status badge
- Admin cancellation
  - Cancel any booking
  - Confirmation alert
  - Automatic conflict resolution
- Pull-to-refresh
- Empty states

**Status Colors:**

- Pending: Yellow (#FFC107)
- Confirmed: Blue (#0066CC)
- Completed: Green (#28A745)
- Cancelled: Red (#DC3545)

**API Calls:**

```typescript
await apiService.getAllBookingsAdmin(statusFilter);
await apiService.cancelBookingAdmin(bookingId);
```

---

### 5. RevenueAnalyticsScreen.tsx

**Financial overview and top performers**

**Features:**

- Revenue summary cards
  - Total revenue (green)
  - Pending revenue (yellow)
  - Completed bookings count
  - Average booking value
- Top earning instructors (top 10)
  - Rank badge (#1, #2, etc.)
  - Total earnings
  - Lesson count
  - Average per lesson
- Performance metrics
  - Revenue per booking
  - Average instructor revenue
- Pull-to-refresh

**API Calls:**

```typescript
await apiService.getRevenueStats();
```

**Data Structure:**

```typescript
interface RevenueStats {
  total_revenue: number;
  pending_revenue: number;
  completed_bookings: number;
  avg_booking_value: number;
  top_instructors: Array<{
    instructor_id: number;
    name: string;
    total_earnings: number;
    booking_count: number;
  }>;
}
```

---

## Common Components Used

### InlineMessage

- Success messages (green)
- Error messages (red)
- Auto-dismiss (5 seconds)
- Auto-scroll to top

### Styling Patterns

- Consistent color scheme
  - Primary: #0066CC (blue)
  - Success: #28A745 (green)
  - Warning: #FFC107 (yellow)
  - Danger: #DC3545 (red)
  - Gray: #6C757D
- Card-based layouts
- Box shadows for depth
- Responsive design
- Pull-to-refresh on all lists

---

## Navigation Setup

### App.tsx Integration

```typescript
// Admin Stack Navigator
const AdminStack = createStackNavigator();

function AdminNavigator() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin Dashboard' }}
      />
      <AdminStack.Screen
        name="InstructorVerification"
        component={InstructorVerificationScreen}
        options={{ title: 'Verify Instructors' }}
      />
      <AdminStack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'User Management' }}
      />
      <AdminStack.Screen
        name="BookingOversight"
        component={BookingOversightScreen}
        options={{ title: 'Booking Oversight' }}
      />
      <AdminStack.Screen
        name="RevenueAnalytics"
        component={RevenueAnalyticsScreen}
        options={{ title: 'Revenue Analytics' }}
      />
    </AdminStack.Navigator>
  );
}
```

---

## Authentication & Authorization

### Backend Middleware

```python
from app.middleware.admin import require_admin

@router.get("/admin/stats")
async def get_admin_stats(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    # Only admins can access
```

### Frontend Check

```typescript
// After login, check user role
const user = await apiService.getCurrentUser();
if (user.role === 'admin') {
  navigation.navigate('AdminDashboard');
} else if (user.role === 'instructor') {
  navigation.navigate('InstructorDashboard');
} else {
  navigation.navigate('StudentDashboard');
}
```

---

## Error Handling

All screens implement:

- Try-catch blocks for API calls
- Error message display via InlineMessage
- Loading states with ActivityIndicator
- Graceful fallbacks for empty data
- Refresh capability on errors

**Example:**

```typescript
try {
  setError('');
  const data = await apiService.getAdminStats();
  setStats(data);
} catch (err: any) {
  setError(err.response?.data?.detail || 'Failed to load statistics');
} finally {
  setLoading(false);
}
```

---

## Dependencies

### Required Packages

```json
{
  "@react-navigation/native": "^6.x",
  "@react-navigation/stack": "^6.x",
  "@react-native-picker/picker": "^2.x",
  "axios": "^1.x",
  "expo-secure-store": "^12.x"
}
```

### Installation

```bash
cd frontend
npm install @react-native-picker/picker
```

---

## Bootstrap Admin User

### Create Initial Admin

```bash
cd backend
python create_admin.py
```

**Default Credentials:**

- Email: admin@drivealive.test
- Phone: +27123456789
- Password: admin123

**⚠️ IMPORTANT:** Change password after first login!

---

## Security Considerations

1. **Role-Based Access:**

   - All admin endpoints protected by `require_admin` middleware
   - Frontend checks user role before navigation
   - API returns 403 Forbidden for non-admins

2. **Self-Protection:**

   - Admins cannot change their own status
   - Prevents accidental self-lockout

3. **Audit Logging:**

   - All admin actions logged
   - Track verification decisions
   - Monitor user status changes

4. **Data Protection:**

   - Sensitive operations require confirmation
   - No display of passwords or tokens
   - Minimal PII exposure

---

## Future Enhancements

- [ ] Admin activity logs viewer
- [ ] Bulk operations (verify multiple instructors)
- [ ] Advanced filtering (date ranges, search)
- [ ] Export functionality (CSV, PDF reports)
- [ ] Email notifications for admin actions
- [ ] Real-time dashboard updates (WebSocket)
- [ ] Multi-admin collaboration
- [ ] Audit trail with timestamps
- [ ] Data visualization (charts, graphs)
- [ ] Mobile-optimized layouts

---

## Testing

### Manual Testing Checklist

- [ ] Login as admin user
- [ ] View dashboard statistics
- [ ] Verify instructor (approve)
- [ ] Verify instructor (reject)
- [ ] Change user status (activate)
- [ ] Change user status (deactivate)
- [ ] Change user status (suspend)
- [ ] Filter users by role
- [ ] Filter users by status
- [ ] View all bookings
- [ ] Filter bookings by status
- [ ] Cancel booking as admin
- [ ] View revenue statistics
- [ ] Check top instructors list
- [ ] Test pull-to-refresh on all screens
- [ ] Verify error handling

---

## Screenshots Placeholder

```
[AdminDashboardScreen]
- Quick action cards grid
- Statistics sections
- Revenue overview

[InstructorVerificationScreen]
- Pending instructor cards
- Approve/Reject buttons
- Detail fields

[UserManagementScreen]
- User list with badges
- Filter dropdowns
- Action buttons

[BookingOversightScreen]
- Booking cards
- Status badges
- Cancel button

[RevenueAnalyticsScreen]
- Revenue summary
- Top instructors leaderboard
- Performance metrics
```

---

**Last Updated:** December 23, 2025
**Version:** 1.0.0
**Status:** Production Ready
