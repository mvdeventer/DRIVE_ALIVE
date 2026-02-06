"""
Instructor Verification Service
Handles instructor verification, token generation, and admin notifications
"""

import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ..models.user import User, UserRole, Instructor
from ..models.instructor_verification import InstructorVerificationToken
from ..services.email_service import EmailService
from ..services.whatsapp_service import WhatsAppService
import logging

logger = logging.getLogger(__name__)


class InstructorVerificationService:
    """Service for instructor verification and admin notifications"""

    @staticmethod
    def create_verification_token(
        db: Session,
        instructor_id: int,
        validity_minutes: int = 60
    ) -> InstructorVerificationToken:
        """
        Create an instructor verification token
        """
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=validity_minutes)
        
        verification_token = InstructorVerificationToken(
            instructor_id=instructor_id,
            token=token,
            expires_at=expires_at,
        )
        
        db.add(verification_token)
        db.commit()
        db.refresh(verification_token)
        
        return verification_token

    @staticmethod
    def send_verification_to_all_admins(
        db: Session,
        instructor: Instructor,
        verification_token: InstructorVerificationToken,
        frontend_url: str,
    ) -> dict:
        """
        Send instructor verification link to all admins via email and WhatsApp
        Returns dict with counts of sent messages
        """
        # Get all admin users
        admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        
        if not admins:
            logger.warning("No admins found to send verification to")
            return {
                "emails_sent": 0,
                "whatsapp_sent": 0,
                "total_admins": 0,
            }
        
        emails_sent = 0
        whatsapp_sent = 0
        
        # Generate verification link
        verification_link = f"{frontend_url}/instructor-verify?token={verification_token.token}"
        
        # Email and message content
        instructor_name = instructor.user.full_name if instructor.user else "Instructor"
        email_subject = f"New Instructor Verification Required - {instructor_name}"
        
        email_body = f"""
<h2>New Instructor Registration</h2>
<p>An instructor has registered and requires verification.</p>

<h3>Instructor Details:</h3>
<ul>
    <li><strong>Name:</strong> {instructor_name}</li>
    <li><strong>Email:</strong> {instructor.user.email}</li>
    <li><strong>Phone:</strong> {instructor.user.phone}</li>
    <li><strong>License Number:</strong> {instructor.license_number}</li>
    <li><strong>License Types:</strong> {instructor.license_types}</li>
    <li><strong>Vehicle:</strong> {instructor.vehicle_year} {instructor.vehicle_make} {instructor.vehicle_model}</li>
    <li><strong>City:</strong> {instructor.city}</li>
    <li><strong>Hourly Rate:</strong> ZAR {instructor.hourly_rate}</li>
</ul>

<h3>Verification Required:</h3>
<p>Click the link below to verify this instructor:</p>
<a href="{verification_link}" style="background-color: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
    ✅ Verify Instructor
</a>

<p>Or copy this link: {verification_link}</p>
<p><em>This link expires in 60 minutes.</em></p>

<p>You can also verify instructors from the admin dashboard.</p>
"""
        
        whatsapp_message = f"""
👤 New Instructor Verification Required

📋 Instructor: {instructor_name}
📧 Email: {instructor.user.email}
📱 Phone: {instructor.user.phone}
🎓 License: {instructor.license_number}
🚗 Vehicle: {instructor.vehicle_year} {instructor.vehicle_make}
📍 City: {instructor.city}
💰 Rate: ZAR {instructor.hourly_rate}/hour

🔗 Verification Link:
{verification_link}

⏰ Expires in: 60 minutes

You can also verify from the admin dashboard.
"""
        
        # Send to each admin
        for admin in admins:
            # Send email if SMTP is configured
            if admin.smtp_email and admin.smtp_password:
                try:
                    from ..services.encryption_service import EncryptionService
                    smtp_password = EncryptionService.decrypt(admin.smtp_password)
                    
                    email_sent = EmailService.send_email(
                        recipient_email=admin.email,
                        subject=email_subject,
                        body=email_body,
                        smtp_email=admin.smtp_email,
                        smtp_password=smtp_password,
                    )
                    if email_sent:
                        emails_sent += 1
                        logger.info(f"Verification email sent to admin {admin.email}")
                except Exception as e:
                    logger.error(f"Failed to send verification email to {admin.email}: {str(e)}")
            
            # Send WhatsApp
            try:
                if admin.phone:
                    whatsapp_sent_result = WhatsAppService.send_message(
                        phone=admin.phone,
                        message=whatsapp_message,
                    )
                    if whatsapp_sent_result:
                        whatsapp_sent += 1
                        logger.info(f"Verification WhatsApp sent to admin {admin.email}")
            except Exception as e:
                logger.error(f"Failed to send verification WhatsApp to {admin.email}: {str(e)}")
        
        return {
            "emails_sent": emails_sent,
            "whatsapp_sent": whatsapp_sent,
            "total_admins": len(admins),
        }

    @staticmethod
    def verify_instructor_token(
        db: Session,
        token: str,
        admin_id: int = None,
    ) -> tuple[bool, str]:
        """
        Verify instructor using token
        Returns (success, message)
        """
        # Find token
        verification_token = db.query(InstructorVerificationToken).filter(
            InstructorVerificationToken.token == token
        ).first()
        
        if not verification_token:
            return False, "Invalid verification token"
        
        # Check if already used
        if verification_token.is_used:
            return False, "This verification link has already been used"
        
        # Check if expired
        if datetime.now(timezone.utc) > verification_token.expires_at:
            return False, "This verification link has expired"
        
        # Mark as used
        verification_token.is_used = True
        verification_token.verified_at = datetime.now(timezone.utc)
        if admin_id:
            verification_token.verified_by_admin_id = admin_id
        
        # Get instructor and mark as verified
        instructor = db.query(Instructor).filter(
            Instructor.id == verification_token.instructor_id
        ).first()
        
        if not instructor:
            return False, "Instructor not found"
        
        instructor.is_verified = True
        instructor.verified_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return True, "Instructor verified successfully"

    @staticmethod
    def delete_expired_tokens(db: Session) -> int:
        """
        Delete expired instructor verification tokens
        """
        now = datetime.now(timezone.utc)
        deleted = db.query(InstructorVerificationToken).filter(
            InstructorVerificationToken.expires_at < now,
            InstructorVerificationToken.is_used == False
        ).delete()
        db.commit()
        return deleted
