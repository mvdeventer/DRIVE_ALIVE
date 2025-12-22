"""
Check if instructor schedule exists in the database
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.availability import CustomAvailability, InstructorSchedule, TimeOffException
from app.models.user import Instructor

# Create database connection
DATABASE_URL = "sqlite:///./driving_school.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

db = SessionLocal()

print("\n" + "=" * 60)
print("INSTRUCTOR SCHEDULE CHECK")
print("=" * 60 + "\n")

# Get all instructors
instructors = db.query(Instructor).all()
print(f"Total Instructors: {len(instructors)}\n")

for instructor in instructors:
    print(f"\n{'='*60}")
    print(f"Instructor ID: {instructor.id}")
    print(f"Name: {instructor.user.first_name} {instructor.user.last_name}" if instructor.user else "No user")
    print(f"Email: {instructor.user.email}" if instructor.user else "No email")
    print(f"Is Available: {instructor.is_available}")
    print(f"Is Verified: {instructor.is_verified}")

    # Get schedules
    schedules = db.query(InstructorSchedule).filter(InstructorSchedule.instructor_id == instructor.id).all()

    print(f"\n📅 Weekly Schedules: {len(schedules)}")
    for schedule in schedules:
        print(f"  - {schedule.day_of_week.value}: {schedule.start_time} - {schedule.end_time} (Active: {schedule.is_active})")

    # Get time off
    time_off = db.query(TimeOffException).filter(TimeOffException.instructor_id == instructor.id).all()

    print(f"\n🚫 Time Off Periods: {len(time_off)}")
    for off in time_off:
        print(f"  - {off.start_date} to {off.end_date}: {off.reason or 'No reason'}")

    # Get custom availability
    custom = db.query(CustomAvailability).filter(CustomAvailability.instructor_id == instructor.id).all()

    print(f"\n⏰ Custom Availability: {len(custom)}")
    for cust in custom:
        print(f"  - {cust.date}: {cust.start_time} - {cust.end_time} (Active: {cust.is_active})")

print(f"\n{'='*60}\n")

db.close()
