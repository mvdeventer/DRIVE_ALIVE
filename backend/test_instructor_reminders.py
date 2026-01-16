"""
Test script for instructor reminders:
1. Daily summary of upcoming bookings
2. 15-minute reminder before lesson

Tests with instructor: Martin van Deventer (mvdeventer123@gmail.com)
"""

import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

# Enable logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.user import Instructor, User
from app.services.whatsapp_service import whatsapp_service


def get_sast_now():
    """Get current time in SAST (UTC+2)"""
    return datetime.now(timezone.utc) + timedelta(hours=2)


def test_daily_summary():
    """Test sending daily summary to instructor Martin van Deventer"""
    print("\n" + "=" * 80)
    print("TEST 1: Daily Summary for Instructor")
    print("=" * 80)

    db = SessionLocal()

    # Find Martin van Deventer
    user = db.query(User).filter(User.email == "mvdeventer123@gmail.com").first()
    if not user:
        print("❌ User mvdeventer123@gmail.com not found!")
        db.close()
        return False

    instructor = user.instructor_profile
    if not instructor:
        print("❌ User is not an instructor!")
        db.close()
        return False

    print(f"✅ Found instructor: {user.first_name} {user.last_name}")
    print(f"   Phone: {user.phone}")
    print(f"   Instructor ID: {instructor.id}")

    # Get today's bookings for this instructor
    sast_now = get_sast_now()
    today_start = sast_now.replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=None
    )
    today_end = today_start + timedelta(days=1)

    # Also check tomorrow's bookings (since we're testing)
    tomorrow_end = today_end + timedelta(days=1)

    bookings = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor.id,
            Booking.lesson_date >= today_start,
            Booking.lesson_date < tomorrow_end,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        )
        .order_by(Booking.lesson_date)
        .all()
    )

    if not bookings:
        print("❌ No upcoming bookings found for this instructor!")
        db.close()
        return False

    print(f"\n📋 Found {len(bookings)} upcoming booking(s):")
    for idx, booking in enumerate(bookings, 1):
        student_user = booking.student.user
        print(
            f"   {idx}. {booking.lesson_date.strftime('%Y-%m-%d %I:%M %p')} - {student_user.first_name} {student_user.last_name}"
        )
        print(f"      Ref: {booking.booking_reference}")
        print(f"      Pickup: {booking.pickup_address}")

    # Build summary message
    summary_lines = []
    for idx, booking in enumerate(bookings, 1):
        lesson_time = booking.lesson_date.strftime("%I:%M %p")
        lesson_date = booking.lesson_date.strftime("%a %d %b")
        student_user = booking.student.user
        student_name = f"{student_user.first_name} {student_user.last_name}"
        summary_lines.append(
            f"{idx}. {lesson_date} {lesson_time} - {student_name} (Ref: {booking.booking_reference})\n   📍 {booking.pickup_address}\n   📞 {student_user.phone}"
        )

    bookings_summary = "\n\n".join(summary_lines)

    print(f"\n📤 Sending daily summary to {user.first_name} {user.last_name}...")

    success = whatsapp_service.send_daily_summary(
        instructor_name=f"{user.first_name} {user.last_name}",
        instructor_phone=user.phone,
        bookings_summary=bookings_summary,
    )

    if success:
        print("✅ Daily summary sent successfully!")
    else:
        print("❌ Failed to send daily summary!")

    db.close()
    return success


def test_instructor_15min_reminder():
    """Test sending 15-minute reminder to instructor"""
    print("\n" + "=" * 80)
    print("TEST 2: 15-Minute Instructor Reminder")
    print("=" * 80)

    db = SessionLocal()

    # Find Martin van Deventer
    user = db.query(User).filter(User.email == "mvdeventer123@gmail.com").first()
    if not user:
        print("❌ User mvdeventer123@gmail.com not found!")
        db.close()
        return False

    instructor = user.instructor_profile

    # Find a booking that hasn't had instructor reminder sent
    sast_now = get_sast_now().replace(tzinfo=None)

    booking = (
        db.query(Booking)
        .filter(
            Booking.instructor_id == instructor.id,
            Booking.lesson_date >= sast_now,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.instructor_reminder_sent == False,
        )
        .order_by(Booking.lesson_date)
        .first()
    )

    if not booking:
        print("❌ No bookings found that need instructor reminder!")
        db.close()
        return False

    student_user = booking.student.user
    print(f"✅ Found booking to test:")
    print(f"   Reference: {booking.booking_reference}")
    print(f"   Student: {student_user.first_name} {student_user.last_name}")
    print(f"   Date/Time: {booking.lesson_date.strftime('%Y-%m-%d %I:%M %p')}")
    print(f"   Pickup: {booking.pickup_address}")
    print(f"   Instructor Reminder Sent: {booking.instructor_reminder_sent}")

    print(
        f"\n📤 Sending 15-minute reminder to instructor {user.first_name} {user.last_name}..."
    )

    success = whatsapp_service.send_instructor_reminder(
        instructor_name=f"{user.first_name} {user.last_name}",
        instructor_phone=user.phone,
        student_name=f"{student_user.first_name} {student_user.last_name}",
        student_phone=student_user.phone,
        lesson_date=booking.lesson_date,
        pickup_address=booking.pickup_address,
        booking_reference=booking.booking_reference,
    )

    if success:
        print("✅ Instructor 15-min reminder sent successfully!")
        # Mark as sent
        booking.instructor_reminder_sent = True
        db.commit()
        print("✅ Database updated: instructor_reminder_sent = True")
    else:
        print("❌ Failed to send instructor reminder!")

    db.close()
    return success


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("  INSTRUCTOR REMINDER TESTS")
    print("  Instructor: Martin van Deventer (mvdeventer123@gmail.com)")
    print("=" * 80)

    sast_now = get_sast_now()
    print(f"\nCurrent time (SAST): {sast_now.strftime('%Y-%m-%d %H:%M:%S')}")

    # Test 1: Daily Summary
    result1 = test_daily_summary()

    # Test 2: 15-Minute Reminder
    result2 = test_instructor_15min_reminder()

    print("\n" + "=" * 80)
    print("  TEST RESULTS")
    print("=" * 80)
    print(f"  Daily Summary:        {'✅ PASSED' if result1 else '❌ FAILED'}")
    print(f"  15-Min Reminder:      {'✅ PASSED' if result2 else '❌ FAILED'}")
    print("=" * 80 + "\n")
