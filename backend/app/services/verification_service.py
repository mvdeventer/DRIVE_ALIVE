"""
Account verification service
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.verification_token import VerificationToken
from app.models.user import User
from app.services.email_service import EmailService
from app.services.whatsapp_service import WhatsAppService
import logging

logger = logging.getLogger(__name__)


class VerificationService:
    """Service for handling account verification"""

    @staticmethod
    def _ensure_timezone_aware(dt: datetime) -> datetime:
        """
        Ensure a datetime is timezone-aware (UTC)
        
        Args:
            dt: Datetime object (may be naive or aware)
            
        Returns:
            Timezone-aware datetime in UTC
        """
        if dt.tzinfo is None:
            # If naive, assume UTC
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def generate_verification_token() -> str:
        """Generate a secure random verification token"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def create_verification_token(
        db: Session,
        user_id: int,
        token_type: str,
        validity_minutes: int = 30
    ) -> VerificationToken:
        """
        Create a new verification token

        Args:
            db: Database session
            user_id: ID of the user to verify
            token_type: Type of token ("email" or "phone")
            validity_minutes: How long the token is valid (default 30 minutes)

        Returns:
            VerificationToken object
        """
        token = VerificationService.generate_verification_token()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=validity_minutes)

        verification_token = VerificationToken(
            user_id=user_id,
            token=token,
            token_type=token_type,
            expires_at=expires_at
        )

        db.add(verification_token)
        db.commit()
        db.refresh(verification_token)

        logger.info(f"Created {token_type} verification token for user {user_id}, expires at {expires_at}")
        return verification_token

    @staticmethod
    def verify_token(db: Session, token: str) -> Optional[VerificationToken]:
        """
        Verify and retrieve a verification token

        Args:
            db: Database session
            token: The verification token string

        Returns:
            VerificationToken if valid, None otherwise
        """
        verification_token = db.query(VerificationToken).filter(
            VerificationToken.token == token
        ).first()

        if not verification_token:
            logger.warning(f"Verification token not found: {token[:10]}...")
            return None

        # Check if already used
        if verification_token.is_used:
            logger.warning(f"Verification token already used: {token[:10]}...")
            return None

        # Check if expired (ensure both datetimes are timezone-aware)
        expires_at = VerificationService._ensure_timezone_aware(verification_token.expires_at)
        
        if datetime.now(timezone.utc) > expires_at:
            logger.warning(f"Verification token expired: {token[:10]}...")
            return None

        return verification_token

    @staticmethod
    def mark_as_verified(db: Session, verification_token: VerificationToken) -> bool:
        """
        Mark a verification token as used and verify the user

        Args:
            db: Database session
            verification_token: The verification token object

        Returns:
            bool: True if successful
        """
        try:
            verification_token.is_used = True
            verification_token.verified_at = datetime.now(timezone.utc)
            
            # Activate the user (they were created as inactive)
            user = verification_token.user
            user.status = "active"
            
            db.commit()
            logger.info(f"User {user.id} verified successfully via {verification_token.token_type}")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to mark verification token as verified: {str(e)}")
            return False

    @staticmethod
    def send_verification_messages(
        db: Session,
        user: User,
        verification_token: VerificationToken,
        frontend_url: str,
        admin_smtp_email: str = None,
        admin_smtp_password: str = None
    ) -> dict:
        """
        Send verification email and WhatsApp message

        Args:
            db: Database session
            user: User object
            verification_token: VerificationToken object
            frontend_url: Frontend base URL
            admin_smtp_email: Admin's Gmail address
            admin_smtp_password: Admin's Gmail app password

        Returns:
            dict with email_sent and whatsapp_sent status
        """
        verification_link = f"{frontend_url}/verify-account?token={verification_token.token}"
        
        # Get admin settings from first admin user
        admin = db.query(User).filter(User.role == "admin").first()
        validity_minutes = admin.verification_link_validity_minutes if admin else 30

        # Send email
        email_sent = False
        if admin_smtp_email and admin_smtp_password:
            email_service = EmailService(admin_smtp_email, admin_smtp_password)
            email_sent = email_service.send_verification_email(
                to_email=user.email,
                first_name=user.first_name,
                verification_link=verification_link,
                validity_minutes=validity_minutes
            )
        else:
            logger.warning(f"Admin SMTP credentials not configured. Email not sent to {user.email}")

        # Send WhatsApp (using Twilio sandbox with button)
        whatsapp_sent = False
        try:
            whatsapp_service = WhatsAppService()
            # Send message with verification button instead of full URL
            whatsapp_sent = whatsapp_service.send_verification_message(
                phone=user.phone,
                first_name=user.first_name,
                verification_link=verification_link,
                validity_minutes=validity_minutes
            )
        except Exception as e:
            logger.error(f"Failed to send WhatsApp verification to {user.phone}: {str(e)}")

        return {
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
            "verification_link": verification_link,
            "expires_in_minutes": validity_minutes
        }

    @staticmethod
    def delete_unverified_users(db: Session) -> int:
        """
        Delete users with expired unverified tokens

        Returns:
            int: Number of users deleted
        """
        try:
            # Find all unused verification tokens
            all_tokens = db.query(VerificationToken).filter(
                VerificationToken.is_used == False
            ).all()

            # Filter expired tokens in Python (handles timezone comparison safely)
            current_time = datetime.now(timezone.utc)
            expired_tokens = [
                token for token in all_tokens
                if VerificationService._ensure_timezone_aware(token.expires_at) < current_time
            ]

            users_to_delete = []
            for token in expired_tokens:
                user = token.user
                # Only delete if user is still inactive (never verified)
                if user.status == "inactive":
                    users_to_delete.append(user)

            # Delete users (cascades to tokens, profiles, etc.)
            deleted_count = 0
            for user in users_to_delete:
                logger.info(f"Deleting unverified user {user.id} ({user.email}) - verification expired")
                db.delete(user)
                deleted_count += 1

            db.commit()
            logger.info(f"Deleted {deleted_count} unverified users with expired tokens")
            return deleted_count

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting unverified users: {str(e)}")
            return 0
