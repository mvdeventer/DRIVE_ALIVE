"""
Test registration endpoint directly
"""

import sys
import traceback

from app.database import SessionLocal
from app.schemas.user import InstructorCreate
from app.services.auth import AuthService


def test_registration():
    """Test creating an instructor"""
    db = SessionLocal()
    try:
        instructor_data = InstructorCreate(
            email="test_direct@example.com",
            phone="+27611999888",
            password="Test123",
            first_name="Test",
            last_name="Direct",
            id_number="9999888877766",
            license_number="TESTLIC999",
            license_types="B,EB",
            vehicle_registration="TST999",
            vehicle_make="Toyota",
            vehicle_model="Corolla",
            vehicle_year=2020,
            hourly_rate=350,
            service_radius_km=20,
            max_travel_distance_km=50,
            rate_per_km_beyond_radius=5,
            bio="Test instructor",
        )

        print("Creating instructor...")
        user, instructor = AuthService.create_instructor(db, instructor_data)
        print(f"Success! User ID: {user.id}, Instructor ID: {instructor.id}")

    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_registration()
