"""
Migration script to create availability tables
Run this script to add the new availability tables to the database
"""

import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import Base, engine
from app.models.availability import CustomAvailability, InstructorSchedule, TimeOffException


def migrate():
    """Create availability tables"""
    print("Creating availability tables...")

    try:
        # Create all tables (will skip existing ones)
        Base.metadata.create_all(bind=engine)
        print("✅ Availability tables created successfully!")
        print("   - instructor_schedules")
        print("   - time_off_exceptions")
        print("   - custom_availability")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise


if __name__ == "__main__":
    migrate()
