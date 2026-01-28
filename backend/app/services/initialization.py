"""
System initialization service - checks if system is set up
"""

from sqlalchemy.orm import Session
from ..models.user import User, UserRole


class InitializationService:
    """Service to manage system initialization status"""

    @staticmethod
    def admin_exists(db: Session) -> bool:
        """Check if any admin user exists"""
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        return admin is not None

    @staticmethod
    def get_initialization_status(db: Session) -> dict:
        """Get system initialization status"""
        admin_exists = InitializationService.admin_exists(db)
        
        return {
            "initialized": admin_exists,
            "requires_setup": not admin_exists,
            "message": (
                "System is initialized and ready"
                if admin_exists
                else "System requires initial admin setup"
            ),
        }
