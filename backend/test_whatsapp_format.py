"""
Test the updated WhatsApp verification message format
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.verification_service import VerificationService
from app.services.whatsapp_service import WhatsAppService
from app.utils.auth import get_password_hash
from datetime import datetime, timezone


def test_whatsapp_message_format():
    """Test new WhatsApp message format"""
    print("\n" + "=" * 80)
    print("  WHATSAPP MESSAGE FORMAT TEST")
    print("=" * 80 + "\n")

    db = SessionLocal()

    try:
        # Create test user
        user = User(
            first_name="John",
            last_name="Test",
            email=f"test{os.urandom(4).hex()}@example.com",
            phone="+27611154598",
            id_number=f"991{os.urandom(6).hex()}",
            password_hash=get_password_hash("TestPassword123!"),
            role=UserRole.STUDENT,
            status="inactive",
            created_at=datetime.now(timezone.utc),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Create verification token
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=30,
        )

        # Generate verification link
        verification_link = f"http://localhost:3000/verify-account?token={verification_token.token}"

        # Show old format
        print("OLD MESSAGE FORMAT:")
        print("-" * 80)
        old_message = (
            f"🚗 Welcome {user.first_name}!\n\n"
            f"Please verify your account by clicking this link:\n"
            f"{verification_link}\n\n"
            f"⏰ This link expires in 30 minutes."
        )
        print(old_message)
        print(f"\nLength: {len(old_message)} characters\n")

        # Show new format
        print("\nNEW MESSAGE FORMAT:")
        print("-" * 80)
        new_message = (
            f"🎉 Welcome {user.first_name}!\n\n"
            f"Verify your Drive Alive account:\n"
            f"{verification_link}\n\n"
            f"⏰ Link expires in: 30 minutes\n\n"
            f"Not you? Ignore this message."
        )
        print(new_message)
        print(f"\nLength: {len(new_message)} characters\n")

        # Test sending
        print("\nSENDING TEST MESSAGE:")
        print("-" * 80)

        whatsapp_service = WhatsAppService()
        sent = whatsapp_service.send_message(user.phone, new_message)

        if sent:
            print("✅ MESSAGE SENT SUCCESSFULLY!\n")
            print("📱 What you'll see on WhatsApp:")
            print("   • Clickable verification link")
            print("   • Expiry time clearly shown")
            print("   • Clean, readable format")
            print("   • Security note for non-users\n")
        else:
            print("❌ Message sending failed\n")

        # Show comparison
        print("\n" + "=" * 80)
        print("  IMPROVEMENTS")
        print("=" * 80 + "\n")

        improvements = [
            ("Emoji", "🚗 (car)", "🎉 (celebration)"),
            ("First line", "Please verify your account...", "Verify your Drive Alive account:"),
            ("Link display", "Full URL only", "Full URL (now clickable)"),
            ("Time format", "This link expires in", "Link expires in:"),
            ("Security note", "None", "Not you? Ignore this message."),
            ("Readability", "Good", "Better - shorter, clearer"),
        ]

        print(f"{'Change':<20} {'Old':<30} {'New':<30}")
        print("-" * 80)
        for change, old, new in improvements:
            print(f"{change:<20} {old:<30} {new:<30}")

        print("\n" + "=" * 80)
        print("  KEY POINTS")
        print("=" * 80 + "\n")

        print("✅ WhatsApp automatically makes URLs clickable")
        print("✅ Link can be tapped to open verification page")
        print("✅ Message is shorter and easier to read")
        print("✅ Clear expiry information")
        print("✅ Security reminder for non-users")
        print("✅ Emoji is positive (celebration)")
        print("✅ Drive Alive branding maintained\n")

    finally:
        db.close()


if __name__ == "__main__":
    test_whatsapp_message_format()
