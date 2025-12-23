"""
Test ID number validation
"""

from pydantic import ValidationError

from app.schemas.user import InstructorCreate, StudentCreate


def test_id_validation():
    """Test ID number validation for both instructors and students"""

    print("=" * 60)
    print("Testing ID Number Validation")
    print("=" * 60)

    # Test cases
    test_cases = [
        ("1234567890123", True, "Valid: 13 digits"),
        ("123456789012", False, "Invalid: 12 digits (too short)"),
        ("12345678901234", False, "Invalid: 14 digits (too long)"),
        ("12345678901", False, "Invalid: 11 digits (too short)"),
        ("123456789012345", False, "Invalid: 15 digits (too long)"),
        ("123ABC7890123", False, "Invalid: Contains letters"),
        ("  1234567890123  ", True, "Valid: 13 digits with whitespace (should be stripped)"),
    ]

    # Test Instructor validation
    print("\n📋 INSTRUCTOR VALIDATION TESTS:")
    print("-" * 60)
    for id_num, should_pass, description in test_cases:
        try:
            instructor_data = InstructorCreate(
                email="test@example.com",
                phone="+27821234567",
                password="Test123",
                first_name="Test",
                last_name="User",
                id_number=id_num,
                license_number="ABC123",
                license_types="B",
                vehicle_registration="TST123",
                vehicle_make="Toyota",
                vehicle_model="Corolla",
                vehicle_year=2020,
                city="Johannesburg",
                hourly_rate=350.0,
            )
            if should_pass:
                print(f"✅ PASS: {description}")
                print(f"   ID: '{id_num}' -> Validated as '{instructor_data.id_number}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   ID: '{id_num}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    # Test Student validation
    print("\n📋 STUDENT VALIDATION TESTS:")
    print("-" * 60)
    for id_num, should_pass, description in test_cases:
        try:
            student_data = StudentCreate(
                email="student@example.com",
                phone="+27821234567",
                password="Test123",
                first_name="Test",
                last_name="Student",
                id_number=id_num,
                emergency_contact_name="Emergency Contact",
                emergency_contact_phone="+27821234567",
                address_line1="123 Main St",
                province="Gauteng",
                city="Johannesburg",
                postal_code="2000",
            )
            if should_pass:
                print(f"✅ PASS: {description}")
                print(f"   ID: '{id_num}' -> Validated as '{student_data.id_number}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   ID: '{id_num}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    print("\n" + "=" * 60)
    print("Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    test_id_validation()
