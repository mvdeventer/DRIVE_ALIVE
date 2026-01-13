"""
Update instructor phone numbers for WhatsApp testing
Usage: python update_instructor_phone.py <instructor_email> <new_phone>
Example: python update_instructor_phone.py koos@test.com +27821234567
"""

import sys

from app.database import get_db
from app.models.user import User


def update_phone(email: str, new_phone: str):
    """Update instructor's phone number"""
    db = next(get_db())
    try:
        # Find user by email
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"❌ User not found with email: {email}")
            return False

        # Validate phone format
        if not new_phone.startswith("+27"):
            print("❌ Phone must start with +27")
            return False

        if len(new_phone) != 12:
            print(
                f"❌ Phone must be 12 characters (+27 + 9 digits), got {len(new_phone)}"
            )
            return False

        # Update phone
        old_phone = user.phone
        user.phone = new_phone
        db.commit()

        print(f"✅ Updated {user.first_name} {user.last_name}")
        print(f"   Old: {old_phone}")
        print(f"   New: {new_phone}")
        print(f"\n💡 Test WhatsApp: https://wa.me/{new_phone.replace('+', '')}")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_instructor_phone.py <email> <phone>")
        print("Example: python update_instructor_phone.py koos@test.com +27821234567")
        sys.exit(1)

    email = sys.argv[1]
    phone = sys.argv[2]

    update_phone(email, phone)
