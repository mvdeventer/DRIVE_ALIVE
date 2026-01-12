"""
Direct test of earnings calculation logic
"""

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.user import Instructor, User

db = SessionLocal()

# Get Martin's instructor record
martin_user = db.query(User).filter(User.email == "mvdeventer123@gmail.com").first()
if not martin_user:
    print("❌ Martin user not found")
    db.close()
    exit(1)

print(
    f"✓ Found user: {martin_user.first_name} {martin_user.last_name} (user_id={martin_user.id})"
)

instructor = db.query(Instructor).filter(Instructor.user_id == martin_user.id).first()
if not instructor:
    print("❌ Instructor profile not found")
    db.close()
    exit(1)

print(f"✓ Found instructor profile (instructor_id={instructor.id})")

# Get all bookings
bookings = db.query(Booking).filter(Booking.instructor_id == instructor.id).all()
print(f"\nTotal bookings: {len(bookings)}")

# Test the filtering logic that was fixed
completed_bookings = [b for b in bookings if b.status == BookingStatus.COMPLETED]
pending_bookings = [b for b in bookings if b.status == BookingStatus.PENDING]
cancelled_bookings = [b for b in bookings if b.status == BookingStatus.CANCELLED]

print(f"\n📊 Booking Statistics:")
print(f"  Completed: {len(completed_bookings)}")
print(f"  Pending: {len(pending_bookings)}")
print(f"  Cancelled: {len(cancelled_bookings)}")

total_earnings = sum(float(b.amount) for b in completed_bookings)
print(f"\n💰 Total Earnings: R{total_earnings:.2f}")

# Show sample completed bookings
print(f"\nSample completed bookings:")
for b in completed_bookings[:3]:
    print(
        f"  Booking {b.id}: R{b.amount}, status={b.status}, status.value={b.status.value}"
    )

db.close()
