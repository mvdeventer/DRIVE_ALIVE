"""
Test script to preview WhatsApp message formats
Shows exactly how messages will appear to students and instructors
"""

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.services.whatsapp_service import whatsapp_service


def print_separator():
    print("\n" + "=" * 80 + "\n")


def preview_booking_confirmation():
    """Preview booking confirmation message format"""
    print("📱 BOOKING CONFIRMATION MESSAGE (Sent immediately after booking)")
    print_separator()

    # Sample data
    student_name = "Sarah Johnson"
    instructor_name = "Gary Peterson"
    lesson_date = datetime(2026, 1, 23, 10, 30)
    pickup_address = "123 Main Street, Sandton, Johannesburg"
    amount = 350.00
    booking_reference = "BK71C18E9F"

    message = f"""✅ *Booking Confirmed!*

Hello {student_name},

Your driving lesson has been booked successfully.

📋 *Booking Details:*
• Reference: {booking_reference}
• Instructor: {instructor_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}
• Amount: R{amount:.2f}

You will receive a reminder 24 hours before your lesson.

Drive Safe! 🚗
- Drive Alive Team"""

    print(f"To: {student_name} (Student)")
    print(f"Message:\n{message}")
    print_separator()


def preview_student_reminder():
    """Preview 24-hour student reminder format"""
    print("⏰ STUDENT 24-HOUR REMINDER (Sent anytime within 24h before lesson)")
    print_separator()

    # Sample data
    student_name = "Sarah Johnson"
    instructor_name = "Gary Peterson"
    instructor_phone = "+27 82 123 4567"
    lesson_date = datetime(2026, 1, 23, 10, 30)
    pickup_address = "123 Main Street, Sandton, Johannesburg"
    booking_reference = "BK71C18E9F"

    message = f"""⏰ *Lesson Reminder*

Hello {student_name},

Your driving lesson is scheduled for tomorrow!

📋 *Lesson Details:*
• Reference: {booking_reference}
• Instructor: {instructor_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}

📞 Instructor Contact: {instructor_phone}

Please confirm your attendance or contact your instructor if you need to reschedule.

See you tomorrow! 🚗
- Drive Alive Team"""

    print(f"To: {student_name} (Student)")
    print(f"Message:\n{message}")
    print_separator()


def preview_instructor_reminder():
    """Preview 15-minute instructor reminder format"""
    print("⏰ INSTRUCTOR 15-MINUTE REMINDER (Sent 15 min before lesson)")
    print_separator()

    # Sample data
    instructor_name = "Gary Peterson"
    student_name = "Sarah Johnson"
    student_phone = "+27 71 987 6543"
    lesson_date = datetime(2026, 1, 23, 10, 30)
    pickup_address = "123 Main Street, Sandton, Johannesburg"
    booking_reference = "BK71C18E9F"

    message = f"""⏰ *Next Lesson in 15 Minutes*

Hello {instructor_name},

Your next lesson starts soon!

📋 *Lesson Details:*
• Reference: {booking_reference}
• Student: {student_name}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}

📞 Student Contact: {student_phone}

See you soon! 🚗
- Drive Alive Team"""

    print(f"To: {instructor_name} (Instructor)")
    print(f"Message:\n{message}")
    print_separator()


def preview_daily_summary():
    """Preview daily summary format (6:00 AM)"""
    print("📅 DAILY SUMMARY MESSAGE (Sent at 6:00 AM SAST)")
    print_separator()

    # Sample data
    instructor_name = "Gary Peterson"
    bookings_summary = """1. 08:00 AM - John Smith (Ref: BK71C18E9F)
   📍 45 Oak Avenue, Rosebank, Johannesburg
   📞 +27 71 234 5678
   🗺️ https://www.google.com/maps/search/?api=1&query=45+Oak+Avenue,+Rosebank,+Johannesburg

2. 10:30 AM - Sarah Johnson (Ref: BK8D69B666)
   📍 123 Main Street, Sandton, Johannesburg
   📞 +27 82 345 6789
   🗺️ https://www.google.com/maps/search/?api=1&query=123+Main+Street,+Sandton,+Johannesburg

3. 01:00 PM - Michael Brown (Ref: BKB094862D)
   📍 78 Pine Road, Fourways, Johannesburg
   📞 +27 83 456 7890
   🗺️ https://www.google.com/maps/search/?api=1&query=78+Pine+Road,+Fourways,+Johannesburg"""

    message = f"""📅 *Today's Schedule*

Hello {instructor_name},

Here are your lessons for today:

{bookings_summary}

Have a great day! 🚗
- Drive Alive Team"""

    print(f"To: {instructor_name} (Instructor)")
    print(f"Message:\n{message}")
    print_separator()


def preview_with_real_data():
    """Preview messages using actual booking data from database"""
    print("📊 PREVIEWING WITH REAL DATABASE DATA")
    print_separator()

    db = SessionLocal()
    try:
        # Get an upcoming booking
        now = datetime.now(timezone.utc)
        sast_now = now + timedelta(hours=2)
        sast_now_naive = sast_now.replace(tzinfo=None)

        booking = (
            db.query(Booking)
            .filter(
                Booking.lesson_date >= sast_now_naive,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            )
            .first()
        )

        if not booking:
            print("⚠️  No upcoming bookings found in database")
            print("Using sample data instead...")
            return

        # Get real data
        student_user = booking.student.user
        instructor_user = booking.instructor.user

        print(f"📖 Using booking: {booking.booking_reference}")
        print(f"   Student: {student_user.first_name} {student_user.last_name}")
        print(
            f"   Instructor: {instructor_user.first_name} {instructor_user.last_name}"
        )
        print(f"   Date: {booking.lesson_date}")
        print_separator()

        # Show booking confirmation
        print("📱 BOOKING CONFIRMATION (Real Data)")
        print_separator()

        message = f"""✅ *Booking Confirmed!*

Hello {student_user.first_name} {student_user.last_name},

Your driving lesson has been booked successfully.

📋 *Booking Details:*
• Reference: {booking.booking_reference}
• Instructor: {instructor_user.first_name} {instructor_user.last_name}
• Date: {booking.lesson_date.strftime('%A, %d %B %Y')}
• Time: {booking.lesson_date.strftime('%I:%M %p')}
• Pickup: {booking.pickup_address}
• Amount: R{booking.amount:.2f}

You will receive a reminder 24 hours before your lesson.

Drive Safe! 🚗
- Drive Alive Team"""

        print(f"To: {student_user.phone}")
        print(f"Message:\n{message}")
        print_separator()

    except Exception as e:
        print(f"❌ Error accessing database: {str(e)}")
    finally:
        db.close()


def test_phone_formatting():
    """Test phone number formatting"""
    print("📞 PHONE NUMBER FORMATTING TEST")
    print_separator()

    test_numbers = [
        "0821234567",
        "+27821234567",
        "27821234567",
        "082 123 4567",
        "+27 82 123 4567",
    ]

    for number in test_numbers:
        formatted = whatsapp_service._format_phone_number(number)
        print(f"Input:  {number:20} → Output: {formatted}")

    print_separator()


def main():
    """Run all preview tests"""
    print("\n")
    print("🚗" * 40)
    print("DRIVE ALIVE - WHATSAPP MESSAGE PREVIEW TOOL")
    print("🚗" * 40)

    # Show all message formats
    preview_booking_confirmation()
    preview_student_reminder()
    preview_instructor_reminder()
    preview_daily_summary()

    # Phone number formatting test
    test_phone_formatting()

    # Try to use real data
    preview_with_real_data()

    print(
        "\n✅ Preview complete! These are the exact message formats your users will receive."
    )
    print("\nNOTE: To actually send test messages, use the Twilio Console:")
    print("→ https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn")
    print("\n")


if __name__ == "__main__":
    main()
