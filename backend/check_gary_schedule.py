"""
Check Gary van Deventer's schedule in the database
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.availability import InstructorSchedule
from app.models.user import Instructor, User


def check_gary_schedule():
    db: Session = SessionLocal()
    try:
        # Find all users and filter for Gary
        all_users = db.query(User).all()
        gary_user = None
        for user in all_users:
            full_name = f"{user.first_name} {user.last_name}"
            if "gary" in full_name.lower() and "deventer" in full_name.lower():
                gary_user = user
                break

        if not gary_user:
            print("❌ Gary van Deventer not found in users table")
            return

        full_name = f"{gary_user.first_name} {gary_user.last_name}"
        print(f"✅ Found user: {full_name}")
        print(f"   User ID: {gary_user.id}")
        print(f"   Email: {gary_user.email}")
        print(f"   Role: {gary_user.role}")

        # Find instructor record
        instructor = db.query(Instructor).filter(Instructor.user_id == gary_user.id).first()

        if not instructor:
            print("❌ No instructor record found for Gary")
            return

        print(f"\n✅ Found instructor record")
        print(f"   Instructor ID: {instructor.id}")
        print(f"   Verified: {instructor.is_verified}")

        # Find schedule records
        schedules = db.query(InstructorSchedule).filter(InstructorSchedule.instructor_id == instructor.id).all()

        print(f"\n📅 Weekly Schedule Records: {len(schedules)}")

        if schedules:
            for schedule in schedules:
                print(f"\n   Day: {schedule.day_of_week.value}")
                print(f"   Start: {schedule.start_time}")
                print(f"   End: {schedule.end_time}")
                print(f"   Active: {schedule.is_active}")
        else:
            print("   ❌ No schedule records found")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_gary_schedule()
