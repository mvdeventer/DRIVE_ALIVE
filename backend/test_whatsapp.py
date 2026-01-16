"""
Test script to send WhatsApp message via Twilio
"""

import os
import sys

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime

from app.services.whatsapp_service import WhatsAppService

# Create new instance after .env is loaded
whatsapp_service = WhatsAppService()


def test_send_message():
    """Send a test WhatsApp message"""

    print("=" * 80)
    print("Testing Twilio WhatsApp Integration")
    print("=" * 80)

    # Check if Twilio is configured
    if not whatsapp_service.client:
        print("❌ ERROR: Twilio credentials not configured!")
        print("Please check your .env file has:")
        print("  - TWILIO_ACCOUNT_SID")
        print("  - TWILIO_AUTH_TOKEN")
        print("  - TWILIO_WHATSAPP_NUMBER")
        return

    print(f"✅ Twilio client initialized")
    print(f"📱 WhatsApp number: {whatsapp_service.whatsapp_number}")
    print()

    # Test message details
    instructor_phone = "+27611154598"
    student_phone = "+27821234567"  # Example student number

    print(f"Sending test messages...")
    print(f"  Instructor: {instructor_phone}")
    print(f"  Student: {student_phone}")
    print()
    print("⚠️  IMPORTANT: These numbers must have joined the Twilio sandbox first!")
    print("   To join: Send 'join [your-code]' to +14155238886 on WhatsApp")
    print()

    try:
        # Test 1: Instructor Reminder (15 minutes before lesson)
        print("📱 Test 1: Sending Instructor Reminder...")
        success1 = whatsapp_service.send_instructor_reminder(
            instructor_name="Martin",
            instructor_phone=instructor_phone,
            student_name="John Doe",
            student_phone=student_phone,
            lesson_date=datetime(2026, 1, 17, 14, 0),  # Tomorrow at 2 PM
            pickup_address="123 Test Street, Pretoria, Gauteng",
        )

        if success1:
            print("  ✅ Instructor reminder sent successfully!")
        else:
            print("  ❌ Failed to send instructor reminder")

        print()

        # Test 2: Daily Summary for Instructor
        print("📱 Test 2: Sending Daily Summary to Instructor...")

        bookings_summary = """1. 08:00 AM - John Doe
   📍 123 Main Street, Pretoria
   📞 0821234567

2. 10:00 AM - Jane Smith
   📍 456 Oak Avenue, Centurion
   📞 0829876543

3. 02:00 PM - Bob Johnson
   📍 789 Park Road, Johannesburg
   📞 0825556677"""

        success2 = whatsapp_service.send_daily_summary(
            instructor_name="Martin",
            instructor_phone=instructor_phone,
            bookings_summary=bookings_summary,
        )

        if success2:
            print("  ✅ Daily summary sent successfully!")
        else:
            print("  ❌ Failed to send daily summary")

        print()

        # Summary
        if success1 or success2:
            print("=" * 80)
            print("✅ SUCCESS! WhatsApp messages sent to instructor!")
            print("=" * 80)
            print(f"Check WhatsApp on {instructor_phone} for:")
            if success1:
                print("  • Instructor reminder (15 min before lesson)")
            if success2:
                print("  • Daily summary with all lessons")
            print()
            print("If you don't receive them, make sure:")
            print(
                "1. The number joined the Twilio sandbox (send 'join [code]' to +14155238886)"
            )
            print("2. Check Twilio console for message logs")
            print("3. Verify the phone number is correct")
        else:
            print("=" * 80)
            print("❌ FAILED to send messages")
            print("=" * 80)
            print("Check the error logs above for details")

    except Exception as e:
        print()
        print("=" * 80)
        print("❌ ERROR occurred:")
        print("=" * 80)
        print(f"{str(e)}")
        print()
        print("Common issues:")
        print("1. Phone number not joined to Twilio sandbox")
        print("2. Invalid Twilio credentials")
        print("3. Insufficient Twilio credits")
        print("4. Network connectivity issues")


if __name__ == "__main__":
    test_send_message()
