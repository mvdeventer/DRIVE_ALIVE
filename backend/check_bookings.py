"""
Check bookings in the database
"""

import sys
from datetime import datetime

from app.database import SessionLocal
from app.models.booking import Booking


def main():
    db = SessionLocal()
    try:
        # Get all bookings
        bookings = db.query(Booking).all()

        print(f"\n=== BOOKINGS ({len(bookings)} total) ===\n")

        for booking in bookings:
            print(f"ID: {booking.id}")
            print(f"Reference: {booking.booking_reference}")
            print(f"Instructor ID: {booking.instructor_id}")
            print(f"Student ID: {booking.student_id}")
            print(f"Lesson Date: {booking.lesson_date}")
            print(f"Duration: {booking.duration_minutes} min")
            print(f"Status: {booking.status}")
            print(f"Created: {booking.created_at}")
            print("-" * 50)

    finally:
        db.close()


if __name__ == "__main__":
    main()
