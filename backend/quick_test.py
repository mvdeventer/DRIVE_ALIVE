"""
Quick test of earnings calculation without running server
"""

import sys

sys.path.insert(0, "C:\\Projects\\DRIVE_ALIVE\\backend")

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.user import Instructor, User

db = SessionLocal()

# Get Martin
martin = db.query(User).filter(User.email == "mvdeventer123@gmail.com").first()
instructor = db.query(Instructor).filter(Instructor.user_id == martin.id).first()

# Get bookings
bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).all()

# EXACT SAME LOGIC AS ENDPOINT
completed_bookings = [b for b in bookings if b.status == BookingStatus.COMPLETED]
pending_bookings = [b for b in bookings if b.status == BookingStatus.PENDING]
cancelled_bookings = [b for b in bookings if b.status == BookingStatus.CANCELLED]

total_earnings = sum(float(b.amount) for b in completed_bookings)

print(f"\n✅ Endpoint Logic Test:")
print(f"   Total Bookings: {len(bookings)}")
print(f"   Completed: {len(completed_bookings)}")
print(f"   Pending: {len(pending_bookings)}")
print(f"   Cancelled: {len(cancelled_bookings)}")
print(f"   Total Earnings: R{total_earnings:.2f}")
print(
    f"   Hourly Rate: R{float(instructor.hourly_rate) if instructor.hourly_rate else 0.0:.2f}"
)

# Build the response dict
response = {
    "total_earnings": total_earnings,
    "hourly_rate": float(instructor.hourly_rate) if instructor.hourly_rate else 0.0,
    "completed_lessons": len(completed_bookings),
    "pending_lessons": len(pending_bookings),
    "cancelled_lessons": len(cancelled_bookings),
    "total_lessons": len(bookings),
}

print(f"\n📊 Response would be:")
import json

print(json.dumps(response, indent=2))

db.close()
