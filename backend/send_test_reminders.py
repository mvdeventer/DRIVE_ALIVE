"""
Send actual test WhatsApp messages using Twilio
WARNING: This sends real messages and may incur charges
"""

from datetime import datetime, timedelta

from app.services.whatsapp_service import whatsapp_service


def send_test_booking_confirmation():
    """Send a test booking confirmation"""
    print("\n📱 Sending TEST BOOKING CONFIRMATION...")
    print("=" * 80)

    success = whatsapp_service.send_booking_confirmation(
        student_name="Test Student",
        student_phone="+27611154598",  # Your test number
        instructor_name="Gary Peterson",
        lesson_date=datetime(2026, 1, 25, 10, 30),
        pickup_address="123 Main Street, Sandton, Johannesburg",
        amount=350.00,
        booking_reference="TEST-" + datetime.now().strftime("%H%M%S"),
    )

    if success:
        print("✅ Booking confirmation sent successfully!")
    else:
        print("❌ Failed to send booking confirmation")

    print("=" * 80)
    return success


def send_test_student_reminder():
    """Send a test student reminder"""
    print("\n⏰ Sending TEST STUDENT 24-HOUR REMINDER...")
    print("=" * 80)

    tomorrow = datetime.now() + timedelta(days=1)

    success = whatsapp_service.send_student_reminder(
        student_name="Test Student",
        student_phone="+27611154598",  # Your test number
        instructor_name="Gary Peterson",
        instructor_phone="+27821234567",
        lesson_date=tomorrow.replace(hour=10, minute=30),
        pickup_address="123 Main Street, Sandton, Johannesburg",
        booking_reference="TEST-" + datetime.now().strftime("%H%M%S"),
    )

    if success:
        print("✅ Student reminder sent successfully!")
    else:
        print("❌ Failed to send student reminder")

    print("=" * 80)
    return success


def send_test_instructor_reminder():
    """Send a test instructor reminder"""
    print("\n⏰ Sending TEST INSTRUCTOR 15-MINUTE REMINDER...")
    print("=" * 80)

    in_15_min = datetime.now() + timedelta(minutes=15)

    success = whatsapp_service.send_instructor_reminder(
        instructor_name="Test Instructor",
        instructor_phone="+27611154598",  # Your test number
        student_name="Sarah Johnson",
        student_phone="+27719876543",
        lesson_date=in_15_min,
        pickup_address="123 Main Street, Sandton, Johannesburg",
        booking_reference="TEST-" + datetime.now().strftime("%H%M%S"),
    )

    if success:
        print("✅ Instructor reminder sent successfully!")
    else:
        print("❌ Failed to send instructor reminder")

    print("=" * 80)
    return success


def send_test_daily_summary():
    """Send a test daily summary"""
    print("\n📅 Sending TEST DAILY SUMMARY...")
    print("=" * 80)

    bookings_summary = """1. 08:00 AM - John Smith (Ref: TEST-001)
   📍 45 Oak Avenue, Rosebank, Johannesburg
   📞 +27 71 234 5678

2. 10:30 AM - Sarah Johnson (Ref: TEST-002)
   📍 123 Main Street, Sandton, Johannesburg
   📞 +27 82 345 6789

3. 01:00 PM - Michael Brown (Ref: TEST-003)
   📍 78 Pine Road, Fourways, Johannesburg
   📞 +27 83 456 7890"""

    success = whatsapp_service.send_daily_summary(
        instructor_name="Test Instructor",
        instructor_phone="+27611154598",  # Your test number
        bookings_summary=bookings_summary,
    )

    if success:
        print("✅ Daily summary sent successfully!")
    else:
        print("❌ Failed to send daily summary")

    print("=" * 80)
    return success


def main():
    """Send all test messages"""
    print("\n")
    print("🚗" * 40)
    print("DRIVE ALIVE - SEND TEST WHATSAPP MESSAGES")
    print("🚗" * 40)
    print("\n⚠️  WARNING: This will send REAL WhatsApp messages!")
    print(f"📱 Test messages will be sent to: +27611154598")
    print("\n" + "=" * 80)

    # Check if Twilio is configured
    if not whatsapp_service.client:
        print("\n❌ ERROR: Twilio client not initialized!")
        print("Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env")
        return

    print("\n✅ Twilio client initialized successfully")
    print(f"📞 Using WhatsApp number: {whatsapp_service.whatsapp_number}")

    # Send all test messages
    results = []

    results.append(("Booking Confirmation", send_test_booking_confirmation()))
    print("\n⏳ Waiting 2 seconds before next message...")
    import time

    time.sleep(2)

    results.append(("Student Reminder", send_test_student_reminder()))
    print("\n⏳ Waiting 2 seconds before next message...")
    time.sleep(2)

    results.append(("Instructor Reminder", send_test_instructor_reminder()))
    print("\n⏳ Waiting 2 seconds before next message...")
    time.sleep(2)

    results.append(("Daily Summary", send_test_daily_summary()))

    # Summary
    print("\n\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)

    for message_type, success in results:
        status = "✅ SENT" if success else "❌ FAILED"
        print(f"{message_type:25} → {status}")

    total_sent = sum(1 for _, success in results if success)
    print(f"\nTotal: {total_sent}/{len(results)} messages sent successfully")

    print("\n💡 NEXT STEPS:")
    print("1. Check your phone (+27611154598) for WhatsApp messages")
    print("2. If you don't see messages, check the Twilio Console:")
    print("   → https://console.twilio.com/us1/develop/sms/logs")
    print("3. Make sure you've joined the WhatsApp sandbox:")
    print("   → https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn")
    print("=" * 80)
    print("\n")


if __name__ == "__main__":
    main()
