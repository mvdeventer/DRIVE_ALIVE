"""
Test verification message sending with simulated admin setup
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.database import SessionLocal
from app.models.user import User, UserRole, Instructor, Student
from app.services.verification_service import VerificationService
from app.services.email_service import EmailService
from app.services.whatsapp_service import WhatsAppService
from app.config import settings
from app.utils.auth import get_password_hash
from datetime import datetime, timezone


def create_test_admin():
    """Create a test admin user with SMTP configuration"""
    db = SessionLocal()

    try:
        # Check if admin exists
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if admin:
            print(f"✅ Admin already exists: {admin.email}")
            return admin

        # Create admin user
        admin = User(
            first_name="Admin",
            last_name="User",
            email="admin@test.com",
            phone="+27611154598",
            id_number="9999999999999",
            password_hash=get_password_hash("AdminPassword123!"),
            role=UserRole.ADMIN,
            status="active",
            created_at=datetime.now(timezone.utc),
            # SMTP Configuration
            smtp_email="mvdeventer123@gmail.com",
            smtp_password="zebg rkkp tllh frbs",
            verification_link_validity_minutes=30,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"✅ Admin created: {admin.email}")
        print(f"   SMTP Email: {admin.smtp_email}")
        print(f"   Link Validity: {admin.verification_link_validity_minutes} min")

        return admin

    finally:
        db.close()


def test_verification_flow():
    """Test complete verification message sending"""
    print("\n" + "=" * 80)
    print("  VERIFICATION MESSAGES TEST")
    print("=" * 80 + "\n")

    db = SessionLocal()

    try:
        # Step 1: Ensure admin exists with SMTP config
        print("Step 1: Setting up admin with SMTP configuration...")
        print("-" * 80)

        admin = create_test_admin()

        print()

        # Step 2: Create test student
        print("Step 2: Creating test student...")
        print("-" * 80)

        email = f"student{os.urandom(2).hex()}@test.com"
        student = User(
            first_name="John",
            last_name="Student",
            email=email,
            phone="+27611154598",
            id_number=f"990000{os.urandom(3).hex()}",
            password_hash=get_password_hash("StudentPassword123!"),
            role=UserRole.STUDENT,
            status="inactive",  # Important: must be inactive before verification
            created_at=datetime.now(timezone.utc),
        )

        db.add(student)
        db.commit()
        db.refresh(student)

        print(f"✅ Student created:")
        print(f"   Email: {student.email}")
        print(f"   Phone: {student.phone}")
        print(f"   Status: {student.status}\n")

        # Step 3: Create verification token
        print("Step 3: Creating verification token...")
        print("-" * 80)

        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=student.id,
            token_type="email",
            validity_minutes=30,
        )

        print(f"✅ Token created: {verification_token.token[:20]}...")
        print(f"   Expires: {verification_token.expires_at}\n")

        # Step 4: Test Email Service directly
        print("Step 4: Testing Email Service...")
        print("-" * 80)

        verification_link = f"http://localhost:3000/verify-account?token={verification_token.token}"

        email_service = EmailService(admin.smtp_email, admin.smtp_password)
        email_sent = email_service.send_verification_email(
            to_email=student.email,
            first_name=student.first_name,
            verification_link=verification_link,
            validity_minutes=30,
        )

        print(f"Email Result: {'✅ SENT' if email_sent else '❌ FAILED'}")
        print(f"  To: {student.email}")
        print(f"  Link: {verification_link[:50]}...\n")

        # Step 5: Test WhatsApp Service directly
        print("Step 5: Testing WhatsApp Service...")
        print("-" * 80)

        whatsapp_service = WhatsAppService()
        whatsapp_message = (
            f"🚗 Welcome {student.first_name}!\n\n"
            f"Please verify your account by clicking this link:\n"
            f"{verification_link}\n\n"
            f"⏰ This link expires in 30 minutes."
        )

        whatsapp_sent = whatsapp_service.send_message(student.phone, whatsapp_message)

        print(f"WhatsApp Result: {'✅ SENT' if whatsapp_sent else '❌ FAILED'}")
        print(f"  To: {student.phone}")
        print(f"  Message: {len(whatsapp_message)} characters\n")

        # Step 6: Test complete verification service
        print("Step 6: Testing VerificationService.send_verification_messages()...")
        print("-" * 80)

        # Create another student for this test
        email2 = f"student{os.urandom(2).hex()}@test.com"
        student2 = User(
            first_name="Jane",
            last_name="TestUser",
            email=email2,
            phone="+27611154598",
            id_number=f"991000{os.urandom(3).hex()}",
            password_hash=get_password_hash("Password123!"),
            role=UserRole.STUDENT,
            status="inactive",
            created_at=datetime.now(timezone.utc),
        )

        db.add(student2)
        db.commit()
        db.refresh(student2)

        token2 = VerificationService.create_verification_token(
            db=db,
            user_id=student2.id,
            token_type="email",
            validity_minutes=30,
        )

        result = VerificationService.send_verification_messages(
            db=db,
            user=student2,
            verification_token=token2,
            frontend_url="http://localhost:3000",
            admin_smtp_email=admin.smtp_email,
            admin_smtp_password=admin.smtp_password,
        )

        print(f"Email Sent: {'✅ YES' if result['email_sent'] else '❌ NO'}")
        print(f"WhatsApp Sent: {'✅ YES' if result['whatsapp_sent'] else '❌ NO'}")
        print(f"Expires In: {result['expires_in_minutes']} minutes\n")

        # Step 7: Summary
        print("=" * 80)
        print("  TEST SUMMARY")
        print("=" * 80 + "\n")

        all_success = email_sent and whatsapp_sent and result['email_sent']

        if all_success:
            print("✅ ALL TESTS PASSED!")
            print("\nWhat happens next in the app:")
            print("  1. Student sees registration confirmation modal")
            print("  2. Clicks 'Confirm & Create Account'")
            print("  3. Backend creates INACTIVE user")
            print("  4. Sends verification email ✅")
            print("  5. Sends verification WhatsApp ✅")
            print("  6. Frontend gets verification_sent in response")
            print("  7. Navigates to VerificationPendingScreen")
            print("  8. Shows status messages (email ✅, WhatsApp ✅)")
            print("  9. User clicks link from email or WhatsApp")
            print("  10. Account activated → Can log in\n")
        else:
            print("⚠️  SOME TESTS FAILED\n")
            if not email_sent:
                print("  ❌ Email not sent - check Gmail credentials")
            if not whatsapp_sent:
                print("  ❌ WhatsApp not sent - check Twilio configuration")

        print("=" * 80 + "\n")

    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}\n")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_verification_flow()
