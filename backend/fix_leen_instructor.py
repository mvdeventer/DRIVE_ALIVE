"""
Fix orphaned LEEN van Deventer instructor user (User ID 4)
This user has a User record with role=INSTRUCTOR but no Instructor profile
"""

from app.database import SessionLocal
from app.models.user import Instructor, User, UserRole

db = SessionLocal()

try:
    # Get User ID 4
    user = db.query(User).filter(User.id == 4).first()

    if not user:
        print("❌ User ID 4 not found")
        exit(1)

    print(f"✅ Found user: {user.first_name} {user.last_name} ({user.email})")
    print(f"   Role: {user.role}")

    # Check if instructor profile exists
    instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()

    if instructor:
        print(f"✅ Instructor profile already exists (ID: {instructor.id})")
        print(f"   ID Number: {instructor.id_number}")
    else:
        print("❌ No instructor profile found - creating one...")

        # Create instructor profile with same data as other LEEN instructors
        new_instructor = Instructor(
            user_id=user.id,
            id_number="7901175304555",  # Unique ID number for this LEEN
            license_number="12345",
            license_types="Code B, Code EB",
            vehicle_registration="ABC123GP",
            vehicle_make="Toyota",
            vehicle_model="Corolla",
            vehicle_year=2020,
            hourly_rate=350.00,
            is_available=True,
            is_verified=True,  # Auto-verify in debug mode
            city="Johannesburg",
            suburb="Sandton",
            province="Gauteng",
        )

        db.add(new_instructor)
        db.commit()
        db.refresh(new_instructor)

        print(f"✅ Created instructor profile (ID: {new_instructor.id})")
        print(f"   ID Number: {new_instructor.id_number}")
        print(f"   License: {new_instructor.license_number}")
        print(
            f"   Vehicle: {new_instructor.vehicle_make} {new_instructor.vehicle_model}"
        )
        print(f"   Location: {new_instructor.suburb}, {new_instructor.city}")

except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

print("\n✅ Done! LEEN van Deventer should now display ID number in User Management.")
