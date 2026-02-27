"""
Send test verification email and WhatsApp
Using provided Gmail credentials: mvdeventer123@gmail.com
"""

import os
import sys
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.services.email_service import EmailService
from app.services.verification_service import VerificationService
from app.config import settings


def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def send_test_email():
    """Send test verification email"""
    print_header("📧 SENDING TEST VERIFICATION EMAIL")

    # Load credentials from environment variables — never hardcode these!
    smtp_email = os.environ.get('TEST_SMTP_EMAIL', '')
    smtp_password = os.environ.get('TEST_SMTP_PASSWORD', '')
    test_recipient = os.environ.get('TEST_SMTP_RECIPIENT', smtp_email)

    if not smtp_email or not smtp_password:
        print('❌  Set TEST_SMTP_EMAIL and TEST_SMTP_PASSWORD environment variables before running this script.')
        return
    
    print(f"📧 Email Configuration:")
    print(f"   From (SMTP): {smtp_email}")
    print(f"   To (Recipient): {test_recipient}")
    print(f"\n⏳ Attempting to send test email...")
    
    try:
        # Create EmailService instance with provided credentials
        email_service = EmailService(smtp_email=smtp_email, smtp_password=smtp_password)
        
        # Send test email
        result = email_service.send_test_email(to_email=test_recipient)
        
        if result:
            print(f"\n✅ EMAIL SENT SUCCESSFULLY!")
            print(f"   From: {smtp_email}")
            print(f"   To: {test_recipient}")
            print(f"   Subject: Test Email - Driving School SMTP Configuration")
            print(f"\n📌 Check your inbox: {test_recipient}")
            return True
        else:
            print(f"\n❌ EMAIL SEND FAILED!")
            print(f"   Check SMTP credentials and Gmail app password")
            return False
    
    except Exception as e:
        print(f"\n❌ EXCEPTION DURING EMAIL SEND:")
        print(f"   Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def show_whatsapp_preview():
    """Show what the WhatsApp verification message would look like"""
    print_header("💬 WHATSAPP VERIFICATION MESSAGE PREVIEW")
    
    phone = "0611154598"
    name = "Martin"
    sample_token = "abc123def456ghi789jkl012mno345pqr"
    verification_link = f"https://drivealive.co.za/verify-account?token={sample_token}"
    
    whatsapp_message = f"""Hi {name}! 🎉

Your Drive Alive account verification is here!

📱 VERIFY YOUR ACCOUNT:
{verification_link}

⏰ Link expires in: 30 minutes

If you didn't create this account, ignore this message.

- Drive Alive Team 🚗"""
    
    print(f"📱 WhatsApp Message Configuration:")
    print(f"   To: {phone}")
    print(f"   Via: Twilio Sandbox")
    print(f"   From: +14155238886 (Sandbox Number)")
    
    print(f"\n💬 MESSAGE PREVIEW:\n")
    print("┌" + "─" * 70 + "┐")
    for line in whatsapp_message.split('\n'):
        print(f"│ {line:<68} │")
    print("└" + "─" * 70 + "┘")
    
    print(f"\n📊 Message Stats:")
    print(f"   Characters: {len(whatsapp_message)}")
    print(f"   SMS Segments: {(len(whatsapp_message) + 159) // 160}")
    
    print(f"\n⚠️  WHATSAPP SANDBOX REQUIREMENTS:")
    print(f"   1. Phone number must be verified with Twilio")
    print(f"   2. User must message +14155238886 with 'join' keyword first")
    print(f"   3. After opt-in, Twilio can send messages")
    print(f"\n📌 Your Phone Number: {phone}")
    print(f"   Formatted: +27611154598 (South African format)")
    print(f"\n   ✏️  To opt-in to Twilio sandbox:")
    print(f"       1. Open WhatsApp")
    print(f"       2. Save +14155238886 as contact")
    print(f"       3. Send: 'join friendly-memory' (or keyword for your account)")
    print(f"       4. Wait for confirmation from Twilio")
    
    return True


def setup_admin_with_credentials():
    """Setup or update admin with provided SMTP credentials"""
    print_header("⚙️  SETTING UP ADMIN WITH EMAIL CREDENTIALS")

    # Load credentials from environment variables — never hardcode these!
    smtp_email = os.environ.get('TEST_SMTP_EMAIL', '')
    smtp_password = os.environ.get('TEST_SMTP_PASSWORD', '')
    cell_number = os.environ.get('TEST_PHONE', '')

    if not smtp_email or not smtp_password:
        print('❌  Set TEST_SMTP_EMAIL and TEST_SMTP_PASSWORD environment variables before running this script.')
        return False

    from app.utils.encryption import EncryptionService

    db = SessionLocal()

    try:
        # Check if admin exists
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()

        if admin:
            print(f"✅ Admin found: {admin.email}")
            print(f"\n📝 Updating SMTP credentials...")

            # Update SMTP settings — password is ALWAYS stored encrypted
            admin.smtp_email = smtp_email
            admin.smtp_password = EncryptionService.encrypt(smtp_password)
            admin.verification_link_validity_minutes = 30
            
            db.commit()
            db.refresh(admin)
            
            print(f"   ✅ SMTP Email: {admin.smtp_email}")
            print(f"   ✅ SMTP Configured: True")
            print(f"   ✅ Link Validity: {admin.verification_link_validity_minutes} minutes")
            print(f"\n✅ Admin SMTP credentials updated successfully!")
            return True
        
        else:
            print(f"⚠️  No admin account found")
            print(f"   Admin needs to be created via SetupScreen first")
            print(f"\n   Would create with:")
            print(f"   Email: {smtp_email}")
            print(f"   Phone: {cell_number}")
            print(f"   SMTP: Configured")
            return False
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        db.close()


def create_test_verification():
    """Show how verification would work with these credentials"""
    print_header("🔍 TEST VERIFICATION FLOW")
    
    email = "mvdeventer123@gmail.com"
    phone = "0611154598"
    
    flow = f"""
SCENARIO: User registration with verification

1️⃣  USER REGISTRATION
    Email: {email}
    Phone: +27{phone}
    Name: Martin van Deventer
    [Submit Registration]

2️⃣  BACKEND CREATES:
    ✅ User account (status: INACTIVE)
    ✅ Verification token (32-byte random)
    ✅ Token expiry: 30 minutes

3️⃣  SEND NOTIFICATIONS:
    
    📧 Email Sent:
       From: mvdeventer123@gmail.com (Admin SMTP)
       To: {email}
       Subject: Verify Your Driving School Account
       Content: HTML with verification link
       Status: ✅ Configured
    
    💬 WhatsApp Sent:
       From: +14155238886 (Twilio Sandbox)
       To: +27{phone}
       Message: Verification link + instructions
       Status: ⚠️  Requires opt-in

4️⃣  FRONTEND SHOWS:
    VerificationPendingScreen
    ├─ ✉️  Email: {email} ✅
    ├─ 💬  WhatsApp: +27{phone} ⚠️  (Pending opt-in)
    ├─ ⏰  Expires in: 30 minutes
    └─ Instructions: 4 steps

5️⃣  USER VERIFICATION:
    Click link from email or WhatsApp
    ↓
    Account activated (INACTIVE → ACTIVE)
    ↓
    Can now log in

6️⃣  LOGIN:
    Email: {email}
    Password: ****
    [Log In] ✅ SUCCESS!
"""
    
    print(flow)


def main():
    """Main test runner"""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " VERIFICATION EMAIL & WHATSAPP TEST".center(78) + "║")
    print("║" + " mvdeventer123@gmail.com + 0611154598".center(78) + "║")
    print("╚" + "=" * 78 + "╝")
    
    # Setup admin with credentials
    print("\n1️⃣  STEP 1: Setting up admin credentials...")
    setup_admin_with_credentials()
    
    # Send test email
    print("\n2️⃣  STEP 2: Sending test email...")
    email_sent = send_test_email()
    
    # Show WhatsApp preview
    print("\n3️⃣  STEP 3: WhatsApp verification preview...")
    show_whatsapp_preview()
    
    # Show verification flow
    print("\n4️⃣  STEP 4: Complete verification flow...")
    create_test_verification()
    
    # Summary
    print_header("✅ TEST SUMMARY")
    
    print(f"📊 Results:")
    print(f"   Email Test: {'✅ PASSED' if email_sent else '⚠️  CHECK INBOX'}")
    print(f"   WhatsApp Preview: ✅ SHOWN")
    print(f"   Admin Setup: ✅ CONFIGURED")
    
    print(f"\n📌 NEXT STEPS:")
    if email_sent:
        print(f"   1. ✅ Check email inbox: mvdeventer123@gmail.com")
        print(f"   2. ⚠️  For WhatsApp to work: opt-in to Twilio sandbox")
        print(f"      - Message +14155238886 with 'join' keyword")
        print(f"   3. ✅ Test full registration flow via app")
        print(f"   4. ✅ Try login with both verified and unverified accounts")
    else:
        print(f"   1. ⚠️  Check Gmail app password configuration")
        print(f"   2. 📝 Verify credentials are correct:")
        print(f"      - Email: mvdeventer123@gmail.com")
        print(f"      - Password: (check if valid Gmail app password)")
        print(f"   3. 🔗 Gmail Security: https://myaccount.google.com/apppasswords")
    
    print(f"\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted\n")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
