"""
Instructor Verification Service
Handles instructor verification, token generation, and admin/company notifications
"""

import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ..models.user import User, UserRole, Instructor, InstructorVerificationStatus
from ..models.instructor_verification import InstructorVerificationToken
from ..services.email_service import EmailService
from ..services.whatsapp_service import whatsapp_service
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
        
        # Instructor details
        instructor_name = instructor.user.full_name if instructor.user else "Instructor"
        vehicle_info = f"{instructor.vehicle_year or ''} {instructor.vehicle_make or ''} {instructor.vehicle_model or ''}".strip() or "N/A"
        city = getattr(instructor, 'city', None) or 'N/A'
        hourly_rate = str(instructor.hourly_rate) if instructor.hourly_rate else 'N/A'
        
        whatsapp_message = f"""
👤 New Instructor Verification Required

📋 Instructor: {instructor_name}
📧 Email: {instructor.user.email if instructor.user else 'N/A'}
📱 Phone: {instructor.user.phone if instructor.user else 'N/A'}
🎓 License: {instructor.license_number or 'N/A'}
🚗 Vehicle: {vehicle_info}
📍 City: {city}
💰 Rate: ZAR {hourly_rate}/hour

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
                    from ..utils.encryption import EncryptionService
                    smtp_password = EncryptionService.decrypt(admin.smtp_password)

                    admin_email_service = EmailService(
                        smtp_email=admin.smtp_email,
                        smtp_password=smtp_password,
                    )
                    email_sent = admin_email_service.send_admin_instructor_verification_notification(
                        admin_email=admin.email,
                        admin_name=admin.first_name or 'Admin',
                        instructor_name=instructor_name,
                        instructor_email=instructor.user.email,
                        instructor_phone=instructor.user.phone or 'N/A',
                        license_number=instructor.license_number or 'N/A',
                        vehicle_info=vehicle_info,
                        city=city,
                        hourly_rate=hourly_rate,
                        verification_link=verification_link,
                    )
                    if email_sent:
                        emails_sent += 1
                        logger.info(f"Verification email sent to admin {admin.email}")
                except Exception as e:
                    logger.error(f"Failed to send verification email to {admin.email}: {str(e)}")
            
            # Send WhatsApp
            try:
                if admin.phone:
                    whatsapp_sent_result = whatsapp_service.send_message(
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
        expires_at = verification_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
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
        instructor.verification_status = InstructorVerificationStatus.VERIFIED.value
        if admin_id:
            instructor.verified_by_admin_id = admin_id

        # Also activate the user account if still INACTIVE
        # Admin verification of instructor credentials implies trust
        from ..models.user import User, UserStatus
        user = db.query(User).filter(User.id == instructor.user_id).first()
        if user and user.status == UserStatus.INACTIVE:
            user.status = UserStatus.ACTIVE

        db.commit()

        return True, "Instructor verified successfully"

    @staticmethod
    def send_company_verification(
        db: Session,
        instructor: Instructor,
        frontend_url: str,
    ) -> dict:
        """
        Send a verification request to the company owner so they can approve
        or reject this instructor joining their company.
        Returns {"sent": bool}.
        """
        if not instructor.company_verification_token or not instructor.company_id:
            logger.warning(
                "send_company_verification called but no company_verification_token / company_id on instructor %d",
                instructor.id,
            )
            return {"sent": False}

        from ..models.company import Company
        company = db.query(Company).filter(Company.id == instructor.company_id).first()
        if not company or not company.owner_instructor_id:
            logger.warning(
                "Company %s has no owner — skipping company verification notify",
                instructor.company_id,
            )
            return {"sent": False}

        owner = db.query(Instructor).filter(Instructor.id == company.owner_instructor_id).first()
        if not owner or not owner.user:
            return {"sent": False}

        owner_user = owner.user
        verify_link = (
            f"{frontend_url}/company-instructor-verify"
            f"?token={instructor.company_verification_token}"
        )
        instructor_name = instructor.user.full_name if instructor.user else "A new instructor"

        message = (
            f"👋 *New Instructor Joining {company.name}*\n\n"
            f"📋 Instructor: {instructor_name}\n"
            f"📧 Email: {instructor.user.email if instructor.user else 'N/A'}\n"
            f"📱 Phone: {instructor.user.phone if instructor.user else 'N/A'}\n\n"
            f"🔗 Approve / Reject:\n{verify_link}\n\n"
            f"⏰ Link expires in 72 hours."
        )

        sent = False
        if owner_user.phone:
            try:
                sent = bool(whatsapp_service.send_message(phone=owner_user.phone, message=message))
            except Exception as exc:
                logger.error("Failed to WhatsApp company owner %s: %s", owner_user.email, exc)

        # Email fallback — use the admin's SMTP settings
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if admin and admin.smtp_email and admin.smtp_password:
            try:
                from ..utils.encryption import EncryptionService
                smtp_pw = EncryptionService.decrypt(admin.smtp_password)
                svc = EmailService(smtp_email=admin.smtp_email, smtp_password=smtp_pw)
                svc.send_simple_email(
                    to_email=owner_user.email,
                    subject=f"[Drive Alive] New instructor joining {company.name}",
                    body=message,
                )
                sent = True
            except Exception as exc:
                logger.error("Failed to email company owner %s: %s", owner_user.email, exc)

        return {"sent": sent, "owner_email": owner_user.email}

    @staticmethod
    def verify_company_token(
        db: Session,
        token: str,
        approve: bool = True,
    ) -> tuple[bool, str]:
        """
        Company owner approves (approve=True) or rejects (approve=False) an instructor.
        Uses the `company_verification_token` stored directly on the Instructor row.
        Returns (success, message).
        """
        instructor = db.query(Instructor).filter(
            Instructor.company_verification_token == token
        ).first()

        if not instructor:
            return False, "Invalid or expired company verification token"

        if instructor.verification_status == InstructorVerificationStatus.VERIFIED.value:
            return False, "This instructor has already been verified"

        # Check expiry
        if instructor.verification_token_expires:
            exp = instructor.verification_token_expires
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return False, "This verification link has expired"

        if approve:
            # Company approval done — still needs admin verification
            # Move to pending_admin
            instructor.verification_status = InstructorVerificationStatus.PENDING_ADMIN.value
            instructor.company_verification_token = None  # invalidate

            # Create admin token and notify admins
            admin_token_value = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
            admin_token = InstructorVerificationToken(
                instructor_id=instructor.id,
                token=admin_token_value,
                expires_at=expires_at,
            )
            db.add(admin_token)
            db.commit()
            db.refresh(admin_token)

            from ..config import settings as _settings
            try:
                InstructorVerificationService.send_verification_to_all_admins(
                    db=db,
                    instructor=instructor,
                    verification_token=admin_token,
                    frontend_url=_settings.FRONTEND_URL,
                )
            except Exception as exc:
                logger.error("Failed to notify admins after company approval: %s", exc)

            return True, "Instructor approved by company. Admin verification pending."

        # Reject: remove from company, set rejected status
        instructor.company_id = None
        instructor.company_verification_token = None
        instructor.verification_status = InstructorVerificationStatus.REJECTED.value
        db.commit()
        return True, "Instructor rejected by company owner."

    @staticmethod
    def send_admin_verification_links(
        db: Session,
        instructor: "Instructor",
        admins: list,
        base_url: str,
    ) -> dict:
        """
        Sends an admin verification link directly using
        instructor.admin_verification_token.
        Convenience alias used by the resend-verification endpoint.
        """
        from ..models.instructor_verification import InstructorVerificationToken as IVT

        tok = IVT(
            instructor_id=instructor.id,
            token=instructor.admin_verification_token,
            expires_at=instructor.verification_token_expires,
        )
        # Save so send_verification_to_all_admins can read it
        db.add(tok)
        try:
            db.flush()
        except Exception:
            db.rollback()
            tok = None

        if tok is None:
            return {"emails_sent": 0, "whatsapp_sent": 0, "total_admins": 0}

        return InstructorVerificationService.send_verification_to_all_admins(
            db=db,
            instructor=instructor,
            verification_token=tok,
            frontend_url=base_url,
        )

    # ------------------------------------------------------------------ #
    # Instructor-facing notification helpers  (Phase 7)                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _get_smtp_service(db: Session):
        """Return (EmailService | None, admin_email, admin_phone) using first admin's SMTP."""
        from ..utils.encryption import EncryptionService as ES

        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            return None, None, None
        if not admin.smtp_email or not admin.smtp_password:
            return None, admin.email, admin.phone
        try:
            pw = ES.decrypt(admin.smtp_password)
            svc = EmailService(smtp_email=admin.smtp_email, smtp_password=pw)
            return svc, admin.email, admin.phone
        except Exception as exc:
            logger.error("SMTP init failed: %s", exc)
            return None, admin.email, admin.phone

    @staticmethod
    def _notify_instructor(
        instructor_id: int,
        email: str,
        phone: str,
        svc,
        subject: str,
        body: str,
        wa_msg: str,
    ) -> bool:
        """Send email + WhatsApp to the instructor. Returns True if at least one succeeded."""
        sent = False
        if svc and email:
            try:
                sent = bool(svc.send_simple_email(email, subject, body))
            except Exception as exc:
                logger.error("Instructor email failed (id=%s): %s", instructor_id, exc)
        if phone:
            try:
                whatsapp_service.send_message(phone=phone, message=wa_msg)
                sent = True
            except Exception as exc:
                logger.error("Instructor WA failed (id=%s): %s", instructor_id, exc)
        return sent

    @staticmethod
    def send_pending_notification(db: Session, instructor: "Instructor") -> dict:
        """Tell the instructor their application is received and pending review."""
        if not instructor.user:
            return {"sent": False}

        svc, admin_email, admin_phone = InstructorVerificationService._get_smtp_service(db)
        name = instructor.user.full_name or "Instructor"
        ae = admin_email or "N/A"
        ap = admin_phone or "N/A"

        subject = "Registration Received – Drive Alive"
        body = (
            f"Hi {name},\n\nThank you for registering as an instructor with Drive Alive!\n\n"
            "Your application has been received and is pending verification.\n\n"
            "What happens next:\n"
            "  1. Our admin team will review your details (1–2 business days).\n"
            "  2. You'll be notified once approved.\n"
            "  3. After approval you can log in and accept bookings.\n\n"
            f"Need help? Contact us: 📧 {ae}  📞 {ap}\n\n— The Drive Alive Team"
        )
        wa = (
            f"Hi {name}! 🚗 Your Drive Alive instructor registration is received and pending "
            f"review. We'll notify you once approved. Questions? {ap} / {ae}"
        )
        sent = InstructorVerificationService._notify_instructor(
            instructor.id, instructor.user.email, instructor.user.phone, svc, subject, body, wa
        )
        return {"sent": sent}

    @staticmethod
    def send_approval_notification(db: Session, instructor: "Instructor") -> dict:
        """Tell the instructor their account is verified and they can log in."""
        if not instructor.user:
            return {"sent": False}

        from ..config import settings as _settings

        svc, _, _ = InstructorVerificationService._get_smtp_service(db)
        name = instructor.user.full_name or "Instructor"
        url = _settings.FRONTEND_URL

        subject = "✅ You're Verified – Welcome to Drive Alive!"
        body = (
            f"Hi {name},\n\n🎉 Your instructor account has been verified!\n\n"
            f"Log in and start accepting bookings: {url}\n\n"
            "Welcome to the Drive Alive family!\n\n— The Drive Alive Team"
        )
        wa = (
            f"Hi {name}! 🎉 Your Drive Alive instructor account is verified. "
            f"Log in and start accepting bookings at {url}"
        )
        sent = InstructorVerificationService._notify_instructor(
            instructor.id, instructor.user.email, instructor.user.phone, svc, subject, body, wa
        )
        return {"sent": sent}

    @staticmethod
    def send_rejection_notification(
        db: Session,
        instructor: "Instructor",
        reason: str = "",
    ) -> dict:
        """Tell the instructor their application was not approved."""
        if not instructor.user:
            return {"sent": False}

        svc, admin_email, admin_phone = InstructorVerificationService._get_smtp_service(db)
        name = instructor.user.full_name or "Instructor"
        ae = admin_email or "N/A"
        ap = admin_phone or "N/A"
        reason_line = f"\nReason: {reason}\n" if reason else ""

        subject = "Drive Alive – Instructor Registration Update"
        body = (
            f"Hi {name},\n\nThank you for your interest in joining Drive Alive.\n\n"
            f"Unfortunately, we were unable to approve your registration at this time.{reason_line}\n"
            f"Questions? Contact us: 📧 {ae}  📞 {ap}\n\n— The Drive Alive Team"
        )
        reason_suffix = f" Reason: {reason}" if reason else ""
        wa = (
            f"Hi {name}, your Drive Alive instructor registration was not approved.{reason_suffix} "
            f"For more info contact {ap}."
        )
        sent = InstructorVerificationService._notify_instructor(
            instructor.id, instructor.user.email, instructor.user.phone, svc, subject, body, wa
        )
        return {"sent": sent}

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
