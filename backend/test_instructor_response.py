"""Test script to reproduce the instructor API error"""

import sys

sys.path.insert(0, "C:\\Projects\\DRIVE_ALIVE\\backend")

from app.database import SessionLocal
from app.models.user import Instructor, User, UserRole
from app.schemas.user import InstructorResponse

db = SessionLocal()

try:
    # Query first instructor
    instructor = db.query(Instructor).filter(Instructor.is_verified).first()
    user = db.query(User).filter(User.id == instructor.user_id).first()

    print(f"User: {user.first_name} {user.last_name}")
    print(f"User role type: {type(user.role)}, value: {user.role}")
    print(f"User role is enum: {isinstance(user.role, UserRole)}")

    # Try to create response
    try:
        response = InstructorResponse(
            id=user.id,
            email=user.email,
            phone=user.phone,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            instructor_id=instructor.id,
            id_number=instructor.id_number,
            license_number=instructor.license_number,
            license_types=instructor.license_types,
            vehicle_registration=instructor.vehicle_registration,
            vehicle_make=instructor.vehicle_make,
            vehicle_model=instructor.vehicle_model,
            vehicle_year=instructor.vehicle_year,
            province=instructor.province,
            city=instructor.city,
            suburb=instructor.suburb,
            is_available=instructor.is_available,
            hourly_rate=instructor.hourly_rate,
            service_radius_km=instructor.service_radius_km,
            max_travel_distance_km=instructor.max_travel_distance_km,
            rate_per_km_beyond_radius=instructor.rate_per_km_beyond_radius,
            bio=instructor.bio,
            rating=instructor.rating,
            total_reviews=instructor.total_reviews,
            is_verified=instructor.is_verified,
            current_latitude=instructor.current_latitude,
            current_longitude=instructor.current_longitude,
        )
        print(f"\n✅ SUCCESS! Created response for {user.first_name}")
        print(f"Response role: {response.role}")
    except Exception as e:
        print(f"\n❌ ERROR creating response: {e}")
        import traceback

        traceback.print_exc()

finally:
    db.close()
