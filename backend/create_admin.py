"""
Create initial admin user for system bootstrap
Usage: python create_admin.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.utils.auth import get_password_hash


def create_admin_user():
    """Create the initial admin user"""
    db = SessionLocal()

    try:
        # Check if any admin users exist
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            print(f"❌ Admin user already exists: {existing_admin.email}")
            print("Use the admin dashboard to create additional admins.")
            return

        # Admin credentials
        email = "admin@drivealive.test"
        phone = "+27123456789"
        password = "admin123"  # Change this in production!

        # Create admin user
        admin_user = User(
            email=email,
            phone=phone,
            password_hash=get_password_hash(password),
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("✅ Admin user created successfully!")
        print(f"Email: {email}")
        print(f"Phone: {phone}")
        print(f"Password: {password}")
        print("\n⚠️  IMPORTANT: Change the password after first login!")

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin_user()
