"""
Debug script to test the complete registration flow with verification
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth import AuthService
from app.services.verification_service import VerificationService
from app.schemas.user import StudentCreate
from app.config import settings


def test_registration_and_verification():
    """Test complete registration flow"""
    print("\n" + "=" * 80)
    print("  REGISTRATION & VERIFICATION DEBUG TEST")
    print("=" * 80 + "\n")

    db = SessionLocal()

    try:
        # Step 1: Check if admin exists and has SMTP config
        print("Step 1: Checking admin configuration...")
        print("-" * 80)
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()

        if not admin:
            print("❌ No admin user found!")
            print("   Admin must be created first via SetupScreen\n")
            return

        print(f"✅ Admin found: {admin.email}")
        print(f"   SMTP Email: {admin.smtp_email}")
        print(f"   SMTP Password: {'*' * len(admin.smtp_password) if admin.smtp_password else 'NOT SET'}")
        print(f"   Link Validity: {admin.verification_link_validity_minutes} minutes")

        if not admin.smtp_email or not admin.smtp_password:
            print("\n❌ SMTP NOT CONFIGURED!")
            print("   Admin must configure Gmail credentials via SetupScreen\n")
            return

        print("✅ SMTP Configuration complete\n")

        # Step 2: Create test student
        print("Step 2: Creating test student...")
        print("-" * 80)

        student_data = StudentCreate(
            first_name="Test",
            last_name="Student",
            email=f"teststudent{os.urandom(2).hex()}@example.com",
            phone="+27611154598",
            id_number="9512345678901",
            preferred_language="en",
            city="Cape Town",
            suburb="Brackenfell",
            province="Western Cape",
            address="123 Test Street",
            latitude=-33.9249,
            longitude=18.4241,
        )

        print(f"Creating student: {student_data.email}")

        # Create student
        user, student = AuthService.create_student(db, student_data)
        print(f"✅ Student created: {user.id}")
        print(f"   Status: {user.status}")
        print(f"   Email: {user.email}")
        print(f"   Phone: {user.phone}\n")

        # Step 3: Create verification token
        print("Step 3: Creating verification token...")
        print("-" * 80)

        validity_minutes = admin.verification_link_validity_minutes or 30
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=validity_minutes
        )

        print(f"✅ Token created:")
        print(f"   Token: {verification_token.token[:20]}...")
        print(f"   Expires in: {validity_minutes} minutes")
        print(f"   Valid until: {verification_token.expires_at}\n")

        # Step 4: Send verification messages
        print("Step 4: Sending verification messages...")
        print("-" * 80)

        verification_url = f"{settings.FRONTEND_URL}/verify-account?token={verification_token.token}"
        print(f"Verification URL: {verification_url}\n")

        result = VerificationService.send_verification_messages(
            db=db,
            user=user,
            verification_token=verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=admin.smtp_email,
            admin_smtp_password=admin.smtp_password
        )

        print("📧 Email Result:")
        print(f"   ✅ Sent: {result['email_sent']}")
        print(f"   To: {user.email}\n")

        print("💬 WhatsApp Result:")
        print(f"   ✅ Sent: {result['whatsapp_sent']}")
        print(f"   To: {user.phone}\n")

        # Step 5: Verify what response backend would return
        print("Step 5: Frontend registration response...")
        print("-" * 80)

        response_data = {
            "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
            "user_id": user.id,
            "student_id": student.id,
            "verification_sent": {
                "email_sent": result['email_sent'],
                "whatsapp_sent": result['whatsapp_sent'],
                "expires_in_minutes": validity_minutes
            },
            "note": f"Account will be activated after verification. The verification link is valid for {validity_minutes} minutes."
        }

        print("✅ Frontend would receive:")
        import json

        print(json.dumps(response_data, indent=2, default=str))

        # Step 6: Summary
        print("\n" + "=" * 80)
        print("  TEST SUMMARY")
        print("=" * 80 + "\n")

        if result['email_sent'] and result['whatsapp_sent']:
            print("✅ COMPLETE SUCCESS!")
            print("   • Student created as INACTIVE")
            print("   • Verification token generated")
            print("   • Email sent successfully")
            print("   • WhatsApp sent successfully")
            print("   • Frontend receives proper response")
            print("   • VerificationPendingScreen should display\n")
        else:
            print("⚠️  PARTIAL SUCCESS")
            if not result['email_sent']:
                print("   ❌ Email NOT sent - check SMTP configuration")
            if not result['whatsapp_sent']:
                print("   ❌ WhatsApp NOT sent - check Twilio configuration")
            print()

        print("📋 What should happen in frontend:")
        print("   1. RegisterStudentScreen receives response")
        print("   2. Extract verification_sent from response")
        print("   3. Navigate to VerificationPendingScreen with data:")
        print(f"      - email: {user.email}")
        print(f"      - phone: {user.phone}")
        print(f"      - firstName: {user.first_name}")
        print(f"      - emailSent: {result['email_sent']}")
        print(f"      - whatsappSent: {result['whatsapp_sent']}")
        print(f"      - expiryMinutes: {validity_minutes}")
        print("   4. VerificationPendingScreen displays confirmation\n")

        print("=" * 80)

    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}\n")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_registration_and_verification()
