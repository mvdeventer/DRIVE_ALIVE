"""
Verification routes for email/phone confirmation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.verification_service import VerificationService
from app.services.email_service import EmailService
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verify", tags=["verification"])


class TestEmailRequest(BaseModel):
    """Request schema for testing email configuration"""
    smtp_email: str
    smtp_password: str
    test_recipient: str


class VerifyAccountRequest(BaseModel):
    """Request schema for account verification"""
    token: str


@router.post("/test-email")
def test_email_configuration(request: TestEmailRequest, db: Session = Depends(get_db)):
    """
    Test email configuration by sending a test email

    This endpoint allows admins to test their Gmail SMTP configuration
    before saving it.
    """
    try:
        email_service = EmailService(request.smtp_email, request.smtp_password)
        success = email_service.send_test_email(request.test_recipient)

        if success:
            return {
                "success": True,
                "message": f"Test email sent successfully to {request.test_recipient}"
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
def verify_account(request: VerifyAccountRequest, db: Session = Depends(get_db)):
    """
    Verify a user's account using their verification token

    This endpoint is called when a user clicks the verification link
    in their email or WhatsApp message.
    """
    try:
        # Verify token
        verification_token = VerificationService.verify_token(db, request.token)

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
def resend_verification(email: str = Query(...), db: Session = Depends(get_db)):
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
