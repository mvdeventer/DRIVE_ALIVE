"""
Verification routes for email/phone confirmation
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.verification_service import VerificationService
from app.services.email_service import EmailService
from app.models.user import User, UserRole
from app.utils.rate_limiter import limiter
from app.utils.encryption import EncryptionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verify", tags=["verification"])


def _get_admin(db: Session) -> User | None:
    """
    Get the first admin user (global settings holder)
    """
    return db.query(User).filter(User.role == UserRole.ADMIN).first()


def _resolve_email_config(db: Session, request: "TestEmailRequest") -> tuple[str, str, bool]:
    """
    Store email config in database (if admin exists) and return usable credentials
    This allows all admin roles to share the same email configuration.
    """
    admin = _get_admin(db)
    if admin:
        # Save email config to first admin (global settings holder)
        admin.smtp_email = request.smtp_email
        admin.smtp_password = EncryptionService.encrypt(request.smtp_password)
        admin.verification_link_validity_minutes = request.verification_link_validity_minutes
        db.commit()
        db.refresh(admin)
        
        # Retrieve decrypted password for testing
        smtp_password = (
            EncryptionService.decrypt(admin.smtp_password)
            if admin.smtp_password
            else None
        )
        return admin.smtp_email, smtp_password, True

    # Admin not yet created - just test without saving
    return request.smtp_email, request.smtp_password, False


def _get_user_or_404(db: Session, email: str) -> User:
    """
    Find user by email or raise 404
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found with this email address."
        )
    return user


def _get_admin_email_config_or_503(db: Session) -> tuple[User, str]:
    """
    Get admin email config or raise 503 if not configured
    """
    admin = _get_admin(db)
    if not admin or not admin.smtp_email or not admin.smtp_password:
        raise HTTPException(
            status_code=503,
            detail="Email service not configured. Please contact admin."
        )

    smtp_password = EncryptionService.decrypt(admin.smtp_password)
    return admin, smtp_password


def _format_phone(phone_num: str) -> str:
    """
    Convert local format to international format
    """
    cleaned = phone_num.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if cleaned.startswith("0"):
        cleaned = "+27" + cleaned[1:]
    elif cleaned.startswith("27") and not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    elif not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    return cleaned


def _validate_phone(phone_num: str, phone_label: str) -> None:
    """
    Validate international phone number format
    """
    import re
    if not re.match(r"^\+\d{10,15}$", phone_num):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid {phone_label.lower()} format: '{phone_num}'. "
                "Must be in international format (e.g., +27123456789 or +14155238886). "
                "Must have 10-15 digits after the + sign."
            )
        )


def _resolve_twilio_config(
    db: Session,
    sender_phone: str,
    recipient_phone: str,
) -> tuple[str, str, bool]:
    """
    Store Twilio config in database (if admin exists) and return sender/recipient
    This allows all admin roles to share the same WhatsApp configuration.
    """
    from app.services.whatsapp_service import WhatsAppService

    admin = _get_admin(db)
    if admin:
        # Save Twilio config to first admin (global settings holder)
        admin.twilio_sender_phone_number = sender_phone
        admin.twilio_phone_number = recipient_phone
        db.commit()
        db.refresh(admin)

        # Retrieve config from database (validates storage)
        whatsapp_service = WhatsAppService()
        retrieved_sender = whatsapp_service.get_admin_twilio_sender_phone(db)
        return retrieved_sender, admin.twilio_phone_number, True

    # Admin not yet created - just test without saving
    return f"whatsapp:{sender_phone}", recipient_phone, False


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
    1. Saves email config to database (updates first admin's settings)
    2. Retrieves config from database (validates encryption/decryption)
    3. Sends test email using retrieved credentials
    
    All admin roles share the same email configuration stored in the first admin user.
    This ensures consistent email settings across all admins.
    """
    try:
        smtp_email, smtp_password, stored_in_db = _resolve_email_config(db, request)
        if stored_in_db:
            logger.info(f"Retrieved email config from database: {smtp_email}")
        else:
            logger.info("Using provided email config (admin not yet created)")

        email_service = EmailService(smtp_email, smtp_password)
        success = email_service.send_test_email(request.test_recipient)

        if not success:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Failed to send test email. Please check your Gmail credentials and "
                    "ensure 'App Passwords' is enabled."
                )
            )

        return {
            "success": True,
            "message": f"✅ Test email sent successfully to {request.test_recipient}! (Settings saved to database for all admin roles)",
            "stored_in_db": stored_in_db,
            "retrieved_from_db": stored_in_db,
        }
    except Exception as e:
        logger.error(f"Email test failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Email test failed: {str(e)}"
        )


@router.post("/account")
@limiter.limit("10/hour")  # Max 10 verification attempts per hour per IP
async def verify_account(
    request: Request,  # Required for rate limiter
    response: Response,  # Required for rate limiter to inject headers
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
async def resend_verification(
    request: Request,  # Required for rate limiter
    response: Response,  # Required for rate limiter to inject headers
    email: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Resend verification email/WhatsApp to a user

    This endpoint allows users to request a new verification link
    if their previous one expired.
    """
    try:
        user = _get_user_or_404(db, email)
        if user.status == "active":
            raise HTTPException(
                status_code=400,
                detail="This account is already verified. Please log in."
            )

        admin, smtp_password = _get_admin_email_config_or_503(db)
        validity_minutes = admin.verification_link_validity_minutes or 30
        verification_token = VerificationService.create_verification_token(
            db=db,
            user_id=user.id,
            token_type="email",
            validity_minutes=validity_minutes
        )

        from app.config import settings
        result = VerificationService.send_verification_messages(
            db=db,
            user=user,
            verification_token=verification_token,
            frontend_url=settings.FRONTEND_URL,
            admin_smtp_email=admin.smtp_email,
            admin_smtp_password=smtp_password,
        )

        return {
            "success": True,
            "message": "Verification link resent! Please check your email and WhatsApp.",
            "email_sent": result["email_sent"],
            "whatsapp_sent": result["whatsapp_sent"],
            "expires_in_minutes": result["expires_in_minutes"],
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

        logger.info(
            f"Test WhatsApp request: phone={request.phone}, sender={request.twilio_sender_phone_number}"
        )

        phone = request.phone.strip() if request.phone else ""
        sender_phone = request.twilio_sender_phone_number.strip() if request.twilio_sender_phone_number else ""

        if not phone:
            logger.error("Phone number is empty")
            raise HTTPException(
                status_code=400,
                detail=(
                    "Phone number is required for testing. Please enter your phone "
                    "number to receive the test message."
                )
            )

        if not sender_phone:
            logger.error("Twilio sender phone number is empty")
            raise HTTPException(
                status_code=400,
                detail=(
                    "Twilio sender phone number is required for testing. Please enter "
                    "your Twilio sender number (e.g., +14155238886 for sandbox)."
                )
            )

        phone = _format_phone(phone)
        sender_phone = _format_phone(sender_phone)
        logger.info(f"Formatted phone numbers: phone={phone}, sender={sender_phone}")

        _validate_phone(phone, "Recipient phone")
        _validate_phone(sender_phone, "Twilio sender phone")

        if phone.replace("+", "") == sender_phone.replace("+", ""):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot send test message to the Twilio sender number itself. "
                    "Recipient phone must be different from Twilio sender phone."
                )
            )

        retrieved_sender, retrieved_recipient, stored_in_db = _resolve_twilio_config(
            db,
            sender_phone,
            phone,
        )

        whatsapp_service = WhatsAppService()
        success = whatsapp_service.send_message(
            phone=retrieved_recipient,
            message="""🎉 RoadReady WhatsApp Test

Your Twilio WhatsApp configuration is working correctly!

✅ Configuration stored in database
✅ Configuration retrieved from database
✅ Test message sent successfully

You're all set to receive booking confirmations and reminders.""",
        )

        if not success:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Failed to send test WhatsApp message. Please verify your Twilio "
                    "credentials and phone number format (e.g., +27123456789). Make "
                    "sure you're not sending to the Twilio number itself."
                )
            )

        return {
            "success": True,
            "message": f"✅ Test WhatsApp message sent successfully to {retrieved_recipient}! (Settings saved to database for all admin roles)",
            "phone": retrieved_recipient,
            "sender": retrieved_sender,
            "stored_in_db": stored_in_db,
            "retrieved_from_db": stored_in_db,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send test WhatsApp: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test WhatsApp: {str(e)}"
        )

@router.get("/instructor")
@limiter.limit("10/minute")
async def verify_instructor(
    request: Request,  # Required for rate limiter
    response: Response,  # Required for rate limiter to inject headers
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Verify an instructor using a verification token
    This endpoint is accessed by admins clicking the verification link in email/WhatsApp
    """
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Verification token is required"
        )
    
    try:
        from app.services.instructor_verification_service import InstructorVerificationService
        
        success, message = InstructorVerificationService.verify_instructor_token(
            db=db,
            token=token,
        )
        
        if success:
            return {
                "status": "success",
                "message": message,
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=message
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying instructor: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error verifying instructor: {str(e)}"
        )