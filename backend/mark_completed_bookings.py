"""
Mark some past bookings as completed for testing earnings reports
"""

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus, PaymentStatus


def mark_completed():
    db = SessionLocal()
    try:
        # Get all past bookings that are cancelled
        now = datetime.now(timezone.utc)
        past_bookings = db.query(Booking).filter(Booking.lesson_date < now, Booking.status == BookingStatus.CANCELLED).all()

        print(f"Found {len(past_bookings)} past cancelled bookings")

        # Mark first 20 as completed
        completed_count = 0
        for booking in past_bookings[:20]:
            booking.status = BookingStatus.COMPLETED
            booking.payment_status = PaymentStatus.PAID
            booking.completed_at = booking.lesson_date + timedelta(hours=1)
            completed_count += 1
            print(f"✓ Marked booking {booking.id} as completed (instructor_id={booking.instructor_id}, amount=R{booking.amount})")

        db.commit()
        print(f"\n✅ Successfully marked {completed_count} bookings as completed")

        # Show earnings by instructor
        from app.models.user import Instructor, User

        instructors = db.query(Instructor).all()

        print("\n📊 Earnings Summary:")
        for instructor in instructors:
            user = db.query(User).filter(User.id == instructor.user_id).first()
            completed = db.query(Booking).filter(Booking.instructor_id == instructor.id, Booking.status == BookingStatus.COMPLETED).all()

            total = sum(float(b.amount) for b in completed)
            print(f"  {user.first_name} {user.last_name}: R{total:.2f} ({len(completed)} lessons)")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    mark_completed()
