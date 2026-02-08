"""
Account verification service
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.verification_token import VerificationToken
from app.models.user import User
from app.models.booking import Booking
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
        admin_smtp_password: str = None,
        notify_admins: bool = False,
        user_type: str = "user"
    ) -> dict:
        """
        Send verification email and WhatsApp message to user and optionally notify admins

        Args:
            db: Database session
            user: User object
            verification_token: VerificationToken object
            frontend_url: Frontend base URL
            admin_smtp_email: Admin's Gmail address
            admin_smtp_password: Admin's Gmail app password
            notify_admins: Whether to notify all admins about new registration
            user_type: Type of user ("student", "instructor", "admin")

        Returns:
            dict with email_sent, whatsapp_sent, and admin_notifications_sent status
        """
        verification_link = f"{frontend_url}/verify-account?token={verification_token.token}"
        logger.info("Verification link base URL: %s", frontend_url)
        logger.info("Verification link generated: %s", verification_link)
        
        # Get admin settings from first admin user
        admin = db.query(User).filter(User.role == "admin").first()
        validity_minutes = admin.verification_link_validity_minutes if admin else 30

        # Send email to user
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

        # Send WhatsApp to user
        whatsapp_sent = False
        try:
            whatsapp_service = WhatsAppService()
            whatsapp_sent = whatsapp_service.send_verification_message(
                phone=user.phone,
                first_name=user.first_name,
                verification_link=verification_link,
                validity_minutes=validity_minutes
            )
        except Exception as e:
            logger.error(f"Failed to send WhatsApp verification to {user.phone}: {str(e)}")

        # Notify admins if requested (for student registrations)
        admin_emails_sent = 0
        admin_whatsapp_sent = 0
        if notify_admins:
            all_admins = db.query(User).filter(User.role == "admin").all()
            
            for admin_user in all_admins:
                # Send email notification to admin
                if admin_smtp_email and admin_smtp_password:
                    try:
                        email_service = EmailService(admin_smtp_email, admin_smtp_password)
                        admin_email_sent = email_service.send_admin_student_registration_notification(
                            admin_email=admin_user.email,
                            admin_name=admin_user.first_name,
                            student_name=f"{user.first_name} {user.last_name}",
                            student_email=user.email,
                            student_phone=user.phone,
                            verification_link=verification_link
                        )
                        if admin_email_sent:
                            admin_emails_sent += 1
                    except Exception as e:
                        logger.error(f"Failed to send admin email notification to {admin_user.email}: {str(e)}")
                
                # Send WhatsApp notification to admin
                try:
                    whatsapp_service = WhatsAppService()
                    admin_wa_sent = whatsapp_service.send_admin_student_registration_notification(
                        admin_phone=admin_user.phone,
                        admin_name=admin_user.first_name,
                        student_name=f"{user.first_name} {user.last_name}",
                        student_email=user.email,
                        student_phone=user.phone
                    )
                    if admin_wa_sent:
                        admin_whatsapp_sent += 1
                except Exception as e:
                    logger.error(f"Failed to send admin WhatsApp notification to {admin_user.phone}: {str(e)}")

        return {
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
            "verification_link": verification_link,
            "expires_in_minutes": validity_minutes,
            "admin_emails_sent": admin_emails_sent if notify_admins else 0,
            "admin_whatsapp_sent": admin_whatsapp_sent if notify_admins else 0,
            "total_admins_notified": len(all_admins) if notify_admins else 0
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
                # Skip deletion if there are related bookings (FKs are NOT NULL)
                has_instructor_bookings = False
                if user.instructor_profile:
                    has_instructor_bookings = db.query(Booking.id).filter(
                        Booking.instructor_id == user.instructor_profile.id
                    ).first() is not None

                has_student_bookings = False
                if user.student_profile:
                    has_student_bookings = db.query(Booking.id).filter(
                        Booking.student_id == user.student_profile.id
                    ).first() is not None

                if has_instructor_bookings or has_student_bookings:
                    logger.warning(
                        "Skipping deletion of unverified user %s (%s) due to related bookings",
                        user.id,
                        user.email
                    )
                    continue

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
