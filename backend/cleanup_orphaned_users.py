"""Clean up orphaned user records (users without profiles)"""

import sys

from app.database import SessionLocal
from app.models.user import Instructor, Student, User

try:
    db = SessionLocal()

    # Find all users
    users = db.query(User).all()

    print(f"\n{'='*80}")
    print("CLEANING ORPHANED USER RECORDS")
    print(f"{'='*80}\n")

    orphaned_count = 0

    for user in users:
        # Check if user has a profile
        has_profile = False

        if user.role.value == "instructor":
            profile = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            has_profile = profile is not None
        elif user.role.value == "student":
            profile = db.query(Student).filter(Student.user_id == user.id).first()
            has_profile = profile is not None
        else:
            has_profile = True  # Admin or other roles

        if not has_profile:
            print("🗑️  Removing orphaned user:")
            print(f"   Email:  {user.email}")
            print(f"   Phone:  {user.phone}")
            print(f"   Role:   {user.role.value}")
            print(f"   Name:   {user.first_name} {user.last_name}\n")

            db.delete(user)
            orphaned_count += 1

    if orphaned_count > 0:
        db.commit()
        print(f"\n✅ Removed {orphaned_count} orphaned user record(s)")
    else:
        print("\n✨ No orphaned records found. Database is clean!")

    db.close()

except (OSError, RuntimeError) as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
