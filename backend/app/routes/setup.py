"""
System initialization endpoints for first-time setup
"""
from pathlib import Path
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole, UserStatus
from ..schemas.admin import AdminCreateRequest
from ..utils.auth import get_password_hash
from ..utils.encryption import EncryptionService  # For SMTP password encryption

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/setup", tags=["setup"])


def _persist_twilio_to_env(account_sid: str | None, auth_token: str | None) -> None:
    """Write Twilio credentials into the project .env file so they survive server restarts."""
    if not account_sid and not auth_token:
        return
    try:
        from dotenv import set_key
        env_path = Path(__file__).resolve().parents[3] / ".env"
        if env_path.exists():
            if account_sid:
                set_key(str(env_path), "TWILIO_ACCOUNT_SID", account_sid.strip())
            if auth_token:
                set_key(str(env_path), "TWILIO_AUTH_TOKEN", auth_token.strip())
    except Exception as exc:
        logger.warning("Could not write Twilio credentials to .env: %s", exc)


@router.get("/status")
def get_setup_status(db: Session = Depends(get_db)):
    """
    Get system setup/initialization status
    Returns whether admin exists and system is ready for use
    """
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    
    return {
        "initialized": admin_exists is not None,
        "requires_setup": admin_exists is None,
        "message": (
            "System is initialized and ready"
            if admin_exists
            else "System requires initial admin setup"
        ),
    }


@router.post("/create-initial-admin", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_initial_admin(admin_data: AdminCreateRequest, db: Session = Depends(get_db)):
    """
    Create the initial admin user (only available before any admin exists)
    ⚠️ This endpoint is ONLY available on first run before admin is created
    """
    # Check if any admin already exists
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"System already initialized. Admin user exists: {existing_admin.email}. Please use login to continue.",
        )

    # Check if email is already used
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{admin_data.email}' is already registered. Please use a different email.",
        )

    # Create admin user (ACTIVE immediately - no verification needed for initial admin)
    new_admin = User(
        email=admin_data.email,
        phone=admin_data.phone,
        password_hash=get_password_hash(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        id_number=admin_data.id_number,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        address=admin_data.address,
        address_latitude=admin_data.address_latitude,
        address_longitude=admin_data.address_longitude,
        smtp_email=admin_data.smtp_email,
        # Encrypt SMTP password before saving to database
        smtp_password=EncryptionService.encrypt(admin_data.smtp_password) if admin_data.smtp_password else None,
        verification_link_validity_minutes=admin_data.verification_link_validity_minutes or 30,
        twilio_sender_phone_number=admin_data.twilio_sender_phone_number,
        twilio_phone_number=admin_data.twilio_phone_number,
        # Encrypt Twilio credentials before saving to database
        twilio_account_sid=EncryptionService.encrypt(admin_data.twilio_account_sid) if admin_data.twilio_account_sid else None,
        twilio_auth_token=EncryptionService.encrypt(admin_data.twilio_auth_token) if admin_data.twilio_auth_token else None,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    # Persist Twilio credentials to .env so WhatsAppService picks them up on next request
    _persist_twilio_to_env(admin_data.twilio_account_sid, admin_data.twilio_auth_token)

    return {
        "message": "Admin account created successfully! You can now log in.",
        "user_id": new_admin.id,
        "verification_sent": {
            "email_sent": False,
            "whatsapp_sent": False,
            "expires_in_minutes": 0,
        },
        "note": "Admin account is active immediately. No verification required.",
    }

