"""
Test script for Email & WhatsApp Verification System
Tests the new verification email and WhatsApp messages
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


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_subsection(title):
    """Print a formatted subsection header"""
    print(f"\n{'─' * 80}")
    print(f"  {title}")
    print(f"{'─' * 80}\n")


def test_verification_email_preview():
    """Preview what the verification email will look like"""
    print_section("📧 VERIFICATION EMAIL PREVIEW")

    # Sample verification token
    sample_token = "abc123def456ghi789jkl012mno345pqr"
    sample_frontend_url = "https://drivealive.co.za"
    sample_name = "Martin van Deventer"
    sample_email = "martin@example.com"
    
    # Generate the verification link
    verification_link = f"{sample_frontend_url}/verify-account?token={sample_token}"
    
    # Create HTML email preview
    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background-color: #007AFF; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f5f5f5; }}
                .box {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .button {{ display: inline-block; background-color: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 10px; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Verify Your Account</h1>
                </div>
                
                <div class="content">
                    <p>Hi {sample_name},</p>
                    
                    <p>Welcome to Drive Alive! To complete your registration, please verify your account by clicking the button below:</p>
                    
                    <center>
                        <a href="{verification_link}" class="button">✓ Verify Your Account</a>
                    </center>
                    
                    <div class="box">
                        <strong>📋 Verification Details:</strong><br>
                        Email: {sample_email}<br>
                        Link Valid For: 30 minutes<br>
                        Expires: {(datetime.now(timezone.utc).timestamp() + 1800).__format__("")}
                    </div>
                    
                    <p>Or copy and paste this link in your browser:</p>
                    <code style="background-color: #f0f0f0; padding: 10px; display: block; word-break: break-all;">
                        {verification_link}
                    </code>
                    
                    <div class="warning">
                        <strong>⏰ Important:</strong> This verification link will expire in 30 minutes. If it expires, you can request a new one during registration.
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        If you didn't create this account, please ignore this message.
                    </p>
                    
                    <div class="footer">
                        <p>© 2026 Drive Alive. All rights reserved.</p>
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """
    
    print(f"📧 EMAIL DETAILS:")
    print(f"  From: admin@drivealive.co.za")
    print(f"  To: {sample_email}")
    print(f"  Subject: Verify Your Driving School Account")
    print(f"\n📄 EMAIL CONTENT (HTML):\n")
    print(html_content)
    
    print(f"\n✉️  PLAIN TEXT VERSION:\n")
    print(f"""Hi {sample_name},

Welcome to Drive Alive! To complete your registration, please verify your account.

VERIFY YOUR ACCOUNT:
{verification_link}

VERIFICATION DETAILS:
Email: {sample_email}
Link Valid For: 30 minutes
Expires: Soon

Or copy and paste this link in your browser:
{verification_link}

⏰ IMPORTANT: This verification link will expire in 30 minutes. If it expires, you can request a new one during registration.

If you didn't create this account, please ignore this message.

---
© 2026 Drive Alive. All rights reserved.
This is an automated message. Please do not reply to this email.
""")


def test_verification_whatsapp_preview():
    """Preview what the verification WhatsApp message will look like"""
    print_section("💬 VERIFICATION WHATSAPP PREVIEW")
    
    sample_token = "abc123def456ghi789jkl012mno345pqr"
    sample_frontend_url = "https://drivealive.co.za"
    sample_name = "Martin"
    sample_phone = "+27821234567"
    
    # Generate the verification link
    verification_link = f"{sample_frontend_url}/verify-account?token={sample_token}"
    
    whatsapp_message = f"""Hi {sample_name}! 🎉

Your Drive Alive account verification is here!

📱 VERIFY YOUR ACCOUNT:
{verification_link}

⏰ Link expires in: 30 minutes

If you didn't create this account, ignore this message.

- Drive Alive Team 🚗"""
    
    print(f"📱 WHATSAPP MESSAGE DETAILS:")
    print(f"  To: {sample_phone}")
    print(f"  Via: Twilio Sandbox")
    print(f"  From: +14155238886 (Sandbox Number)")
    
    print(f"\n💬 MESSAGE CONTENT:\n")
    print(whatsapp_message)
    
    print(f"\n📊 CHARACTER COUNT: {len(whatsapp_message)} characters")
    print(f"📊 SMS SEGMENTS: {(len(whatsapp_message) + 159) // 160} segments (160 chars per segment)")


def test_actual_email_send():
    """Test sending an actual verification email"""
    print_section("🧪 TESTING ACTUAL EMAIL SEND")
    
    print("⚠️  REQUIREMENTS FOR EMAIL TEST:")
    print("  1. Gmail account configured")
    print("  2. App password generated (not Gmail password)")
    print("  3. SMTP credentials set in environment or database")
    print("\n📌 NOTE: Email test requires admin account with SMTP configured")
    
    # Check if SMTP is configured
    db = SessionLocal()
    
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if not admin:
            print("\n❌ ERROR: No admin account found!")
            print("   First, set up admin account via SetupScreen with email configuration")
            return False
        
        if not admin.smtp_email or not admin.smtp_password:
            print("\n❌ ERROR: Admin SMTP not configured!")
            print("   Admin needs to configure Gmail during SetupScreen setup")
            print(f"   Admin email status: {admin.smtp_email if admin.smtp_email else 'NOT SET'}")
            return False
        
        print(f"\n✅ SMTP CONFIGURED:")
        print(f"   Gmail: {admin.smtp_email}")
        print(f"   Validity: {admin.verification_link_validity_minutes} minutes")
        
        # Test email sending
        print(f"\n📧 ATTEMPTING EMAIL TEST...")
        test_recipient = admin.smtp_email
        
        print(f"\n   Sending test email to: {test_recipient}")
        print(f"   Subject: Drive Alive - Verification System Test")
        print(f"   Type: HTML with verification link example")
        
        # Generate sample token and link
        sample_token = "TEST_TOKEN_" + "a" * 24
        test_link = f"https://drivealive.co.za/verify-account?token={sample_token}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial;">
                <h2>✅ Drive Alive - Verification Email Test</h2>
                <p>This is a test email from the Drive Alive verification system.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                    <li>Timestamp: {datetime.now(timezone.utc)}</li>
                    <li>Recipient: {test_recipient}</li>
                    <li>Link Validity: {admin.verification_link_validity_minutes} minutes</li>
                </ul>
                <p><a href="{test_link}" style="background-color: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Test Verification Link
                </a></p>
                <p style="color: #666; font-size: 12px;">
                    If you received this email, your SMTP configuration is working correctly!
                </p>
            </body>
        </html>
        """
        
        # Try to send test email
        result = EmailService.send_test_email(
            smtp_email=admin.smtp_email,
            smtp_password=admin.smtp_password,
            recipient=test_recipient
        )
        
        if result.get("success"):
            print(f"\n✅ TEST EMAIL SENT SUCCESSFULLY!")
            print(f"   Message: {result.get('message', 'Email sent')}")
            print(f"   Check inbox: {test_recipient}")
            return True
        else:
            print(f"\n❌ EMAIL SEND FAILED!")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            print(f"   Details: {result.get('details', 'No details available')}")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR DURING EMAIL TEST: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_whatsapp_info():
    """Show WhatsApp configuration info"""
    print_section("💬 WHATSAPP CONFIGURATION INFO")
    
    print("📱 TWILIO SANDBOX CONFIGURATION:")
    print(f"  Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}..." if settings.TWILIO_ACCOUNT_SID else "  ❌ NOT CONFIGURED")
    print(f"  Sandbox Number: {settings.TWILIO_WHATSAPP_NUMBER}")
    
    print("\n⚙️  USER REQUIREMENTS FOR WHATSAPP:")
    print("  1. User must have WhatsApp installed")
    print("  2. User must have Twilio Sandbox number (+14155238886) as contact")
    print("  3. User must send 'join <keyword>' to opt-in")
    print("     (Twilio provides specific keyword for each account)")
    print("  4. User receives confirmation that they're opted in")
    print("  5. Now they can receive verification WhatsApp messages")
    
    print("\n📌 DEVELOPMENT NOTE:")
    print("  Twilio Sandbox is free but requires opt-in")
    print("  For production: Use Twilio Business account + phone approval")
    print(f"  Current mode: {'SANDBOX (Development)' if 'sandbox' in str(settings.TWILIO_ACCOUNT_SID).lower() else 'CHECK SETTINGS'}")


def show_verification_flow():
    """Show the complete verification flow"""
    print_section("🔄 COMPLETE VERIFICATION FLOW")
    
    flow = """
1️⃣  USER REGISTRATION
    └─ Student fills registration form
    └─ Clicks "Confirm & Create Account"
    └─ Form validation passes
    
2️⃣  BACKEND PROCESSING
    └─ Create INACTIVE user account
    └─ Create Student/Instructor profile
    └─ Generate verification token (32-byte random)
    └─ Set token expiry (30 minutes by default)
    
3️⃣  SEND NOTIFICATIONS
    └─ EmailService.send_verification_email()
       ├─ Connect to Gmail SMTP (admin configured)
       ├─ Send HTML email with verification link
       └─ Return: email_sent = true/false
    
    └─ WhatsApp via Twilio
       ├─ Connect to Twilio Sandbox API
       ├─ Send WhatsApp message with verification link
       └─ Return: whatsapp_sent = true/false
    
4️⃣  FRONTEND DISPLAY
    └─ VerificationPendingScreen shows:
       ├─ ✉️  Email address (confirmation)
       ├─ 💬  WhatsApp number (confirmation)
       ├─ ⏰  Expiry countdown (30 minutes)
       ├─ 4-step instructions
       ├─ [Resend Verification] button
       └─ [Back to Login] button
    
5️⃣  USER ACTION
    └─ User checks email inbox
    └─ User checks WhatsApp
    └─ User clicks verification link from either channel
    
6️⃣  VERIFICATION LINK CLICK
    └─ Browser/App opens with token in URL
    └─ VerifyAccountScreen validates token:
       ├─ Token exists in database
       ├─ Token is not expired
       ├─ Token hasn't been used yet
       └─ Mark token as used
    
7️⃣  ACCOUNT ACTIVATION
    └─ Update user.status: INACTIVE → ACTIVE
    └─ Set verified_at timestamp
    └─ Return success message
    └─ Auto-redirect to LoginScreen (3 seconds)
    
8️⃣  USER LOGIN
    └─ User enters email + password
    └─ Backend checks:
       ├─ Email exists ✓
       ├─ Password matches ✓
       ├─ Status = ACTIVE ✓
       └─ Generate JWT token → LOGIN SUCCESS
    
9️⃣  BACKGROUND CLEANUP (Every 5 minutes)
    └─ VerificationCleanupScheduler.cleanup()
    └─ Find expired tokens (expires_at < now)
    └─ If verified_at is NULL (not verified):
       ├─ Delete verification_token
       ├─ Delete User account
       ├─ Delete Student/Instructor profiles
       └─ Log: "Deleted X unverified accounts"
"""
    
    print(flow)


def main():
    """Main test runner"""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 15 + "EMAIL & WHATSAPP VERIFICATION SYSTEM - TEST SUITE" + " " * 13 + "║")
    print("║" + " " * 25 + "Drive Alive - Jan 30, 2026" + " " * 26 + "║")
    print("╚" + "=" * 78 + "╝")
    
    # Show tests available
    while True:
        print("\n" + "=" * 80)
        print("SELECT TEST TO RUN:")
        print("=" * 80)
        print("  1️⃣  Preview Verification Email")
        print("  2️⃣  Preview Verification WhatsApp")
        print("  3️⃣  Show Complete Verification Flow")
        print("  4️⃣  WhatsApp Configuration Info")
        print("  5️⃣  Test Email Send (actual)")
        print("  6️⃣  Run All Tests")
        print("  7️⃣  Exit")
        print("=" * 80)
        
        choice = input("\nEnter your choice (1-7): ").strip()
        
        if choice == "1":
            test_verification_email_preview()
        
        elif choice == "2":
            test_verification_whatsapp_preview()
        
        elif choice == "3":
            show_verification_flow()
        
        elif choice == "4":
            test_whatsapp_info()
        
        elif choice == "5":
            success = test_actual_email_send()
            if success:
                print("\n✅ Check your email inbox for the test message!")
            else:
                print("\n⚠️  Email test failed - check configuration")
        
        elif choice == "6":
            test_verification_email_preview()
            test_verification_whatsapp_preview()
            show_verification_flow()
            test_whatsapp_info()
            test_actual_email_send()
        
        elif choice == "7":
            print("\n👋 Goodbye!\n")
            break
        
        else:
            print("\n❌ Invalid choice. Please enter 1-7")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user\n")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
