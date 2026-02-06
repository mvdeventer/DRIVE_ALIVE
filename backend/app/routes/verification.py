"""
Verification routes for email/phone confirmation
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.verification_service import VerificationService
from app.services.email_service import EmailService
from app.models.user import User
from app.utils.rate_limiter import limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verify", tags=["verification"])


class TestEmailRequest(BaseModel):
    """Request schema for testing email configuration"""
    smtp_email: str
    smtp_password: str
    test_recipient: str
    verification_link_validity_minutes: int = 30


class VerifyAccountRequest(BaseModel):
    """Request schema for account verification"""
    token: str


@router.post("/test-email")
def test_email_configuration(request: TestEmailRequest, db: Session = Depends(get_db)):
    """
    Test email configuration by sending a test email

    This endpoint:
    1. Stores email config in database (creates/updates admin)
    2. Retrieves config from database
    3. Sends test email using retrieved config
    This validates the complete store → retrieve → use cycle.
    """
    try:
        from app.models.user import User, UserRole
        
        # STEP 1: Store email configuration in database
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if admin:
            # Update existing admin's email config
            admin.smtp_email = request.smtp_email
            admin.smtp_password = request.smtp_password
            admin.verification_link_validity_minutes = request.verification_link_validity_minutes
            db.commit()
            db.refresh(admin)
            logger.info(f"Updated admin email config in database for testing")
        else:
            # No admin exists yet - store in temporary pending config
            # This happens during initial setup before admin account is created
            logger.warning("No admin account exists yet. Testing with provided credentials without storing.")
        
        # STEP 2: Retrieve email configuration from database
        if admin:
            smtp_email = admin.smtp_email
            smtp_password = admin.smtp_password
            logger.info(f"Retrieved email config from database: {smtp_email}")
        else:
            # Use provided values if no admin exists
            smtp_email = request.smtp_email
            smtp_password = request.smtp_password
            logger.info("Using provided email config (admin not yet created)")
        
        # STEP 3: Send test email using retrieved configuration
        email_service = EmailService(smtp_email, smtp_password)
        success = email_service.send_test_email(request.test_recipient)

        if success:
            return {
                "success": True,
                "message": f"Test email sent successfully to {request.test_recipient}",
                "stored_in_db": admin is not None,
                "retrieved_from_db": admin is not None
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to send test email. Please check your Gmail credentials and ensure 'App Passwords' is enabled."
            )

    except Exception as e:
        logger.error(f"Email test failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Email test failed: {str(e)}"
        )


@router.post("/account")
@limiter.limit("10/hour")  # Max 10 verification attempts per hour per IP
def verify_account(
    request: Request,  # Required for rate limiter
    verify_data: VerifyAccountRequest,
    db: Session = Depends(get_db)
):
    """
    Verify a user's account using their verification token

    This endpoint is called when a user clicks the verification link
    in their email or WhatsApp message.
    """
    try:
        # Verify token
        verification_token = VerificationService.verify_token(db, verify_data.token)

        if not verification_token:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired verification token. Please register again."
            )

        # Mark as verified and activate user
        success = VerificationService.mark_as_verified(db, verification_token)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to verify account. Please try again or contact support."
            )

        user = verification_token.user
        return {
            "success": True,
            "message": "Account verified successfully! You can now log in.",
            "user_email": user.email,
            "user_name": user.full_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account verification failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )


@router.get("/resend")
@limiter.limit("3/hour")  # Max 3 resend requests per hour per IP
def resend_verification(
    request: Request,  # Required for rate limiter
    email: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Resend verification email/WhatsApp to a user

    This endpoint allows users to request a new verification link
    if their previous one expired.
    """
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found with this email address."
            )

        # Check if already verified
        if user.status == "active":
            raise HTTPException(
                status_code=400,
                detail="This account is already verified. Please log in."
            )

        # Get admin SMTP settings
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin or not admin.smtp_email or not admin.smtp_password:
            raise HTTPException(
                status_code=503,
                detail="Email service not configured. Please contact admin."
            )

        # Create new verification token
        validity_minutes = admin.verification_link_validity_minutes or 30
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=validity_minutes
        )

        # Send verification messages
        from app.config import settings
        result = VerificationService.send_verification_messages(
            db=db,
            user=user,
            verification_token=verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=admin.smtp_email,
            admin_smtp_password=admin.smtp_password
        )

        return {
            "success": True,
            "message": "Verification link resent! Please check your email and WhatsApp.",
            "email_sent": result["email_sent"],
            "whatsapp_sent": result["whatsapp_sent"],
            "expires_in_minutes": result["expires_in_minutes"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resend verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resend verification: {str(e)}"
        )


class TestWhatsAppRequest(BaseModel):
    """Request schema for testing WhatsApp configuration"""
    phone: str  # Admin's personal phone to receive test
    twilio_sender_phone_number: str  # Twilio sender number (FROM)


@router.post("/test-whatsapp")
def test_whatsapp_configuration(request: TestWhatsAppRequest, db: Session = Depends(get_db)):
    """
    Test WhatsApp messaging by sending a test message

    This endpoint:
    1. Stores Twilio config in database (creates/updates admin)
    2. Retrieves config from database
    3. Sends test WhatsApp using retrieved config
    This validates the complete store → retrieve → use cycle.
    """
    try:
        from app.services.whatsapp_service import WhatsAppService
        from app.models.user import User, UserRole
        import re
        
        logger.info(f"Test WhatsApp request: phone={request.phone}, sender={request.twilio_sender_phone_number}")
        
        phone = request.phone.strip() if request.phone else ""
        sender_phone = request.twilio_sender_phone_number.strip() if request.twilio_sender_phone_number else ""
        
        if not phone:
            logger.error("Phone number is empty")
            raise HTTPException(
                status_code=400,
                detail="Phone number is required for testing. Please enter your phone number to receive the test message."
            )
        
        if not sender_phone:
            logger.error("Twilio sender phone number is empty")
            raise HTTPException(
                status_code=400,
                detail="Twilio sender phone number is required for testing. Please enter your Twilio sender number (e.g., +14155238886 for sandbox)."
            )

        # Auto-format phone numbers before validation (handle local format like 0611154598)
        def format_phone(phone_num: str) -> str:
            """Convert local format to international format"""
            cleaned = phone_num.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            # Handle local format (starts with 0)
            if cleaned.startswith("0"):
                cleaned = "+27" + cleaned[1:]
            # Handle international without +
            elif cleaned.startswith("27") and not cleaned.startswith("+"):
                cleaned = "+" + cleaned
            # Already has +
            elif not cleaned.startswith("+"):
                cleaned = "+" + cleaned
            return cleaned
        
        phone = format_phone(phone)
        sender_phone = format_phone(sender_phone)
        
        logger.info(f"Formatted phone numbers: phone={phone}, sender={sender_phone}")

        # Validate both phone numbers (after formatting)
        for phone_num, phone_type in [(phone, "Recipient phone"), (sender_phone, "Twilio sender phone")]:
            if not re.match(r'^\+\d{10,15}$', phone_num):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid {phone_type.lower()} format: '{phone_num}'. Must be in international format (e.g., +27123456789 or +14155238886). Must have 10-15 digits after the + sign."
                )

        # Check sender and recipient are different
        if phone.replace("+", "").replace(" ", "") == sender_phone.replace("+", "").replace(" ", ""):
            raise HTTPException(
                status_code=400,
                detail="Cannot send test message to the Twilio sender number itself. Recipient phone must be different from Twilio sender phone."
            )

        # STEP 1: Store Twilio configuration in database
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if admin:
            # Update existing admin's Twilio config
            admin.twilio_sender_phone_number = sender_phone
            admin.twilio_phone_number = phone
            db.commit()
            db.refresh(admin)
            logger.info(f"Updated admin Twilio config in database for testing")
        else:
            # No admin exists yet - testing during setup
            logger.warning("No admin account exists yet. Testing with provided credentials without storing.")
        
        # STEP 2: Retrieve Twilio configuration from database
        whatsapp_service = WhatsAppService()
        if admin:
            # Get sender number from database (via WhatsAppService method)
            retrieved_sender = whatsapp_service.get_admin_twilio_sender_phone(db)
            retrieved_recipient = admin.twilio_phone_number
            logger.info(f"Retrieved Twilio config from database: sender={retrieved_sender}, recipient={retrieved_recipient}")
        else:
            # Use provided values if no admin exists
            retrieved_sender = f"whatsapp:{sender_phone}"
            retrieved_recipient = phone
            logger.info("Using provided Twilio config (admin not yet created)")
        
        # STEP 3: Send test message using retrieved configuration
        # Note: send_message already retrieves sender from DB internally,
        # but we're validating it here explicitly
        success = whatsapp_service.send_message(
            phone=retrieved_recipient,
            message="""🎉 Drive Alive WhatsApp Test

Your Twilio WhatsApp configuration is working correctly!

✅ Configuration stored in database
✅ Configuration retrieved from database
✅ Test message sent successfully

You're all set to receive booking confirmations and reminders."""
        )

        if success:
            return {
                "success": True,
                "message": f"Test WhatsApp message sent successfully to {retrieved_recipient}",
                "phone": retrieved_recipient,
                "sender": retrieved_sender,
                "stored_in_db": admin is not None,
                "retrieved_from_db": admin is not None
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to send test WhatsApp message. Please verify your Twilio credentials and phone number format (e.g., +27123456789). Make sure you're not sending to the Twilio number itself."
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send test WhatsApp: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test WhatsApp: {str(e)}"
        )
