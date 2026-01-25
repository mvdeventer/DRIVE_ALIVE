"""
One-time setup endpoint for creating initial admin user
DELETE THIS FILE AFTER USE!
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole, UserStatus
from ..utils.auth import get_password_hash

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/create-admin")
def create_initial_admin(db: Session = Depends(get_db)):
    """
    Create the initial admin user
    ⚠️ This endpoint should be removed after first use!
    """
    # Check if any admin exists
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=400, detail=f"Admin user already exists: {existing_admin.email}"
        )

    # Create admin user
    admin_user = User(
        email="admin@drivealive.test",
        phone="+27123456789",
        password_hash=get_password_hash("admin123"),
        first_name="System",
        last_name="Administrator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    return {
        "message": "Admin user created successfully!",
        "email": admin_user.email,
        "password": "admin123",
        "warning": "Change password immediately after first login!",
        "next_step": "Remove this /setup endpoint from the codebase",
    }
