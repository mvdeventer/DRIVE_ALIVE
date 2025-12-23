"""
Test phone number validation
"""

from pydantic import ValidationError

from app.schemas.user import InstructorCreate, StudentCreate, UserUpdate


def test_phone_validation():
    """Test phone number validation"""

    print("=" * 60)
    print("Testing Phone Number Validation")
    print("=" * 60)

    # Test cases for phone numbers
    phone_test_cases = [
        ("+27821234567", True, "Valid: +27 followed by 9 digits"),
        ("+27611154598", True, "Valid: Example from user"),
        ("+2782123456", False, "Invalid: 8 digits after +27 (too short)"),
        ("+278212345678", False, "Invalid: 10 digits after +27 (too long)"),
        ("0821234567", False, "Invalid: Missing +27 prefix"),
        ("+27 821234567", False, "Invalid: Contains space"),
        ("+27ABC123456", False, "Invalid: Contains letters"),
        ("  +27821234567  ", True, "Valid: With whitespace (should be stripped)"),
        ("+2712345678", False, "Invalid: 8 digits (too short)"),
        ("+271234567890", False, "Invalid: 10 digits (too long)"),
    ]

    # Test Instructor phone validation
    print("\n📞 INSTRUCTOR PHONE VALIDATION TESTS:")
    print("-" * 60)
    for phone, should_pass, description in phone_test_cases:
        try:
            instructor_data = InstructorCreate(
                email="test@example.com",
                phone=phone,
                password="Test123",
                first_name="Test",
                last_name="User",
                id_number="1234567890123",
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
                print(f"   Phone: '{phone}' -> Validated as '{instructor_data.phone}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   Phone: '{phone}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    # Test Student phone validation (both regular and emergency contact)
    print("\n📞 STUDENT PHONE VALIDATION TESTS:")
    print("-" * 60)
    for phone, should_pass, description in phone_test_cases:
        try:
            student_data = StudentCreate(
                email="student@example.com",
                phone=phone,
                password="Test123",
                first_name="Test",
                last_name="Student",
                id_number="1234567890123",
                emergency_contact_name="Emergency Contact",
                emergency_contact_phone="+27821234567",  # Use valid emergency phone
                address_line1="123 Main St",
                province="Gauteng",
                city="Johannesburg",
                postal_code="2000",
            )
            if should_pass:
                print(f"✅ PASS: {description}")
                print(f"   Phone: '{phone}' -> Validated as '{student_data.phone}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   Phone: '{phone}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    # Test Emergency Contact Phone
    print("\n📞 EMERGENCY CONTACT PHONE VALIDATION TESTS:")
    print("-" * 60)
    for phone, should_pass, description in phone_test_cases:
        try:
            student_data = StudentCreate(
                email="student@example.com",
                phone="+27821234567",  # Use valid regular phone
                password="Test123",
                first_name="Test",
                last_name="Student",
                id_number="1234567890123",
                emergency_contact_name="Emergency Contact",
                emergency_contact_phone=phone,
                address_line1="123 Main St",
                province="Gauteng",
                city="Johannesburg",
                postal_code="2000",
            )
            if should_pass:
                print(f"✅ PASS: {description}")
                print(f"   Emergency Phone: '{phone}' -> Validated as '{student_data.emergency_contact_phone}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   Emergency Phone: '{phone}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    # Test UserUpdate phone validation (for profile editing)
    print("\n📞 USER UPDATE PHONE VALIDATION TESTS:")
    print("-" * 60)
    for phone, should_pass, description in phone_test_cases:
        try:
            update_data = UserUpdate(phone=phone)
            if should_pass:
                print(f"✅ PASS: {description}")
                print(f"   Phone: '{phone}' -> Validated as '{update_data.phone}'")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected validation error but got success")
        except ValidationError as e:
            if not should_pass:
                error_msg = str(e.errors()[0]["msg"])
                print(f"✅ PASS: {description}")
                print(f"   Phone: '{phone}' -> Error: {error_msg}")
            else:
                print(f"❌ FAIL: {description}")
                print(f"   Expected success but got error: {e.errors()[0]['msg']}")

    print("\n" + "=" * 60)
    print("Phone Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    test_phone_validation()
