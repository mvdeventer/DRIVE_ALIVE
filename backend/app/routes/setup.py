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


@router.post("/create-initial-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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

    # Create admin user
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
        smtp_password=admin_data.smtp_password,
        verification_link_validity_minutes=admin_data.verification_link_validity_minutes or 30,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return new_admin

