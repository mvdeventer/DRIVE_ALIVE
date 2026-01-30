"""
Test WhatsApp message sending via Twilio
"""

import os
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.config import settings
from app.services.whatsapp_service import WhatsAppService


def test_whatsapp_connection():
    """Test if Twilio credentials are configured"""
    print("\n" + "=" * 80)
    print("  TWILIO WHATSAPP TEST")
    print("=" * 80 + "\n")

    print("📋 Configuration Status:")
    print("-" * 80)

    # Check configuration
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    whatsapp_number = settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"

    print(f"✅ TWILIO_ACCOUNT_SID:    Configured" if account_sid else "❌ TWILIO_ACCOUNT_SID:    NOT configured")
    print(f"✅ TWILIO_AUTH_TOKEN:     Configured" if auth_token else "❌ TWILIO_AUTH_TOKEN:     NOT configured")
    print(f"✅ TWILIO_WHATSAPP_NUMBER: {whatsapp_number}\n")

    if not account_sid or not auth_token:
        print("❌ Twilio credentials not configured in .env file")
        print("\n⚠️  To enable WhatsApp testing, you need to:")
        print("  1. Get Twilio account (twilio.com)")
        print("  2. Add to .env file:")
        print("     TWILIO_ACCOUNT_SID=your_account_sid")
        print("     TWILIO_AUTH_TOKEN=your_auth_token")
        print("  3. Save .env and restart")
        return False

    return True


def send_test_whatsapp():
    """Send test WhatsApp message"""
    print("\n" + "=" * 80)
    print("  SENDING TEST WHATSAPP MESSAGE")
    print("=" * 80 + "\n")

    # Initialize service
    service = WhatsAppService()

    if not service.client:
        print("❌ WhatsApp service not initialized")
        print("   Check Twilio credentials in .env file\n")
        return False

    try:
        # Send test message
        test_phone = "+27611154598"  # Your phone
        test_message = """✅ *Test WhatsApp Message*

Hello Martin!

This is a test message from Drive Alive verification system.

📋 *What This Means:*
• Your Twilio WhatsApp is properly configured
• Verification messages will now be sent via WhatsApp
• You can receive booking confirmations and reminders

🎉 Your WhatsApp integration is working!

- Drive Alive Team 🚗"""

        print(f"📱 Sending to: {test_phone}")
        print(f"📝 Message: {len(test_message)} characters\n")

        message = service.client.messages.create(
            body=test_message,
            from_=service.whatsapp_number,
            to=f"whatsapp:{test_phone}"
        )

        print("✅ MESSAGE SENT SUCCESSFULLY!\n")
        print(f"📊 Message Details:")
        print(f"   • Message SID: {message.sid}")
        print(f"   • From:        {service.whatsapp_number}")
        print(f"   • To:          whatsapp:{test_phone}")
        print(f"   • Status:      {message.status}")
        print(f"   • Type:        WhatsApp\n")

        print("📲 Check your WhatsApp for the message!")
        print("   (If you don't see it, you may need to opt-in to the Twilio sandbox)\n")

        return True

    except Exception as e:
        print(f"❌ FAILED TO SEND MESSAGE\n")
        print(f"Error: {str(e)}\n")

        if "recipient did not consent" in str(e).lower():
            print("⚠️  SOLUTION: Recipient hasn't opted into WhatsApp sandbox")
            print("   Steps to opt-in:")
            print("   1. Save contact: +14155238886 (Twilio Sandbox)")
            print("   2. Send WhatsApp message: 'join friendly-memory'")
            print("   3. Wait for confirmation")
            print("   4. Try again\n")

        return False


def show_verification_message_preview():
    """Show what verification message will look like"""
    print("\n" + "=" * 80)
    print("  VERIFICATION MESSAGE PREVIEW")
    print("=" * 80 + "\n")

    verification_message = """🎉 *Welcome to Drive Alive!*

Hi [Student Name],

Your account verification is here!

📱 *VERIFY YOUR ACCOUNT:*
https://drivealive.co.za/verify-account?token=...

⏰ Link expires in: 30 minutes

If you didn't create this account, ignore this message.

- Drive Alive Team 🚗"""

    print(f"Message Preview ({len(verification_message)} characters):\n")
    print(verification_message)
    print(f"\n✅ Message will be sent to student's phone on registration")
    print(f"✅ Student clicks link to verify account")
    print(f"✅ Account activated automatically\n")


def main():
    """Main test function"""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "  TWILIO WHATSAPP INTEGRATION TEST".center(78) + "║")
    print("║" + "  January 30, 2026".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "═" * 78 + "╝\n")

    # Step 1: Check configuration
    if not test_whatsapp_connection():
        print("\n⚠️  Skipping WhatsApp send test (credentials not configured)\n")
        show_verification_message_preview()
        return

    # Step 2: Send test message
    success = send_test_whatsapp()

    # Step 3: Show verification message preview
    show_verification_message_preview()

    # Summary
    print("=" * 80)
    print("  TEST SUMMARY")
    print("=" * 80 + "\n")

    if success:
        print("✅ WHATSAPP INTEGRATION WORKING!")
        print("   • Twilio client connected")
        print("   • Test message sent successfully")
        print("   • Verification messages ready\n")
        print("📋 Next Steps:")
        print("   1. Check WhatsApp for test message")
        print("   2. Test registration flow in app")
        print("   3. Should receive verification WhatsApp\n")
    else:
        print("⚠️  WHATSAPP INTEGRATION NEEDS SETUP")
        print("   • Add Twilio credentials to .env")
        print("   • OR opt-in to WhatsApp sandbox\n")
        print("📋 How to Opt-In to Twilio Sandbox:")
        print("   1. Save: +14155238886 on WhatsApp")
        print("   2. Send: 'join friendly-memory'")
        print("   3. Wait for confirmation")
        print("   4. Run this test again\n")

    print("=" * 80)
    print("Date: January 30, 2026")
    print("Status: " + ("✅ READY" if success else "⚠️  NEEDS SETUP"))
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
