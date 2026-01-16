"""
Test WhatsApp booking confirmation
"""

import sys
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.booking import Booking
from app.models.user import Instructor, Student, User
from app.services.whatsapp_service import whatsapp_service

print("=" * 80)
print("WhatsApp Booking Confirmation Test")
print("=" * 80)

db = SessionLocal()

try:
    # Get a test student (Piet van Deventer - ID 1)
    student = db.query(Student).filter(Student.id == 1).first()
    if not student:
        print("❌ Test student not found (ID 1)")
        sys.exit(1)

    student_user = db.query(User).filter(User.id == student.user_id).first()
    if not student_user:
        print("❌ Student user not found")
        sys.exit(1)

    print(f"✓ Student: {student_user.first_name} {student_user.last_name}")
    print(f"  Phone: {student_user.phone}")

    # Get a test instructor (Martin van Deventer - ID 1)
    instructor = db.query(Instructor).filter(Instructor.id == 1).first()
    if not instructor:
        print("❌ Test instructor not found (ID 1)")
        sys.exit(1)

    instructor_user = db.query(User).filter(User.id == instructor.user_id).first()
    if not instructor_user:
        print("❌ Instructor user not found")
        sys.exit(1)

    print(f"✓ Instructor: {instructor_user.first_name} {instructor_user.last_name}")
    print(f"  Phone: {instructor_user.phone}")

    # Check WhatsApp service initialization
    print("\n" + "=" * 80)
    print("WhatsApp Service Status")
    print("=" * 80)
    print(f"Account SID: {'Set' if whatsapp_service.account_sid else 'NOT SET'}")
    print(f"Auth Token: {'Set' if whatsapp_service.auth_token else 'NOT SET'}")
    print(f"WhatsApp Number: {whatsapp_service.whatsapp_number}")
    print(f"Client Initialized: {'Yes' if whatsapp_service.client else 'No'}")

    if not whatsapp_service.client:
        print("\n❌ WhatsApp service not initialized - check Twilio credentials")
        sys.exit(1)

    # Test phone number formatting
    print("\n" + "=" * 80)
    print("Phone Number Formatting Test")
    print("=" * 80)
    formatted_phone = whatsapp_service._format_phone_number(student_user.phone)
    print(f"Original: {student_user.phone}")
    print(f"Formatted: {formatted_phone}")

    # Create test booking data
    test_lesson_date = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
    test_pickup = "123 Test Street, Johannesburg"
    test_amount = 350.0
    test_reference = "BK12345TEST"

    print("\n" + "=" * 80)
    print("Test Booking Details")
    print("=" * 80)
    print(f"Student: {student_user.first_name} {student_user.last_name}")
    print(f"Student Phone: {student_user.phone}")
    print(f"Instructor: {instructor_user.first_name} {instructor_user.last_name}")
    print(f"Lesson Date: {test_lesson_date}")
    print(f"Pickup: {test_pickup}")
    print(f"Amount: R{test_amount:.2f}")
    print(f"Reference: {test_reference}")

    # Attempt to send confirmation
    print("\n" + "=" * 80)
    print("Sending WhatsApp Confirmation...")
    print("=" * 80)

    try:
        result = whatsapp_service.send_booking_confirmation(
            student_name=f"{student_user.first_name} {student_user.last_name}",
            student_phone=student_user.phone,
            instructor_name=f"{instructor_user.first_name} {instructor_user.last_name}",
            lesson_date=test_lesson_date,
            pickup_address=test_pickup,
            amount=test_amount,
            booking_reference=test_reference,
        )

        if result:
            print("✅ WhatsApp confirmation sent successfully!")
            print(f"\nMessage should be delivered to: {student_user.phone}")
        else:
            print("❌ Failed to send WhatsApp confirmation (returned False)")

    except Exception as e:
        print(f"❌ Exception while sending WhatsApp: {e}")
        import traceback

        traceback.print_exc()

    print("\n" + "=" * 80)
    print("Test Complete")
    print("=" * 80)

except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
