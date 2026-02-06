"""
System initialization endpoints for first-time setup
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole, UserStatus
from ..schemas.admin import AdminCreateRequest
from ..schemas.user import UserResponse
from ..utils.auth import get_password_hash
from ..utils.encryption import EncryptionService  # For SMTP password encryption

router = APIRouter(prefix="/setup", tags=["setup"])


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

    # Create admin user (INACTIVE until verification)
    new_admin = User(
        email=admin_data.email,
        phone=admin_data.phone,
        password_hash=get_password_hash(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        id_number=admin_data.id_number,
        role=UserRole.ADMIN,
        status=UserStatus.INACTIVE,
        address=admin_data.address,
        address_latitude=admin_data.address_latitude,
        address_longitude=admin_data.address_longitude,
        smtp_email=admin_data.smtp_email,
        # Encrypt SMTP password before saving to database
        smtp_password=EncryptionService.encrypt(admin_data.smtp_password) if admin_data.smtp_password else None,
        verification_link_validity_minutes=admin_data.verification_link_validity_minutes or 30,
        twilio_sender_phone_number=admin_data.twilio_sender_phone_number,
        twilio_phone_number=admin_data.twilio_phone_number,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    # Create verification token and send messages
    from ..services.verification_service import VerificationService
    from ..config import settings

    validity_minutes = new_admin.verification_link_validity_minutes or 30
    verification_token = VerificationService.create_verification_token(
        db=db,
        user_id=new_admin.id,
        token_type="email",
        validity_minutes=validity_minutes,
    )

    verification_result = VerificationService.send_verification_messages(
        db=db,
        user=new_admin,
        verification_token=verification_token,
        frontend_url=settings.FRONTEND_URL,
        admin_smtp_email=new_admin.smtp_email,
        admin_smtp_password=new_admin.smtp_password,
    )

    return {
        "message": "Registration successful! Please check your email and WhatsApp to verify your account.",
        "user_id": new_admin.id,
        "verification_sent": {
            "email_sent": verification_result.get("email_sent", False),
            "whatsapp_sent": verification_result.get("whatsapp_sent", False),
            "expires_in_minutes": verification_result.get("expires_in_minutes", validity_minutes),
        },
        "note": f"Account will be activated after verification. The verification link is valid for {validity_minutes} minutes.",
    }

