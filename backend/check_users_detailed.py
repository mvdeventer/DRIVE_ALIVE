"""Check users with detailed information including phone and ID numbers"""

import sys

from app.database import SessionLocal
from app.models.user import Instructor, User

try:
    db = SessionLocal()
    users = db.query(User).all()

    print(f"\n{'='*80}")
    print(f"DATABASE USERS ({len(users)} total)")
    print(f"{'='*80}\n")

    for user in users:
        print(f"Email:      {user.email}")
        print(f"Phone:      {user.phone}")
        print(f"Role:       {user.role.value}")
        print(f"Name:       {user.first_name} {user.last_name}")

        # If instructor, get additional details
        if user.role.value == "instructor":
            instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            if instructor:
                print(f"ID Number:  {instructor.id_number}")
                print(f"License:    {instructor.license_number}")
                print(f"Verified:   {instructor.is_verified}")

        print(f"{'-'*80}\n")

    db.close()

except (ImportError, RuntimeError, ValueError) as e:
    print(f"Error: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
