"""
Test ID validation through API endpoint
"""

import json

import requests


def test_api_validation():
    """Test ID validation through actual API endpoint"""

    base_url = "http://localhost:8000"

    print("=" * 60)
    print("Testing ID Validation via API Endpoints")
    print("=" * 60)

    # Test cases with expected results
    test_cases = [
        {"id_number": "1234567890123", "should_pass": True, "description": "Valid: 13 digits"},
        {"id_number": "123456789012", "should_pass": False, "description": "Invalid: 12 digits (too short)", "expected_error": "too short"},
        {"id_number": "12345678901234", "should_pass": False, "description": "Invalid: 14 digits (too long)", "expected_error": "too long"},
        {"id_number": "123ABC7890123", "should_pass": False, "description": "Invalid: Contains letters", "expected_error": "only numbers"},
    ]

    # Test Instructor Registration
    print("\n📋 INSTRUCTOR REGISTRATION API TESTS:")
    print("-" * 60)

    for idx, test_case in enumerate(test_cases, 1):
        instructor_data = {
            "email": f"test{idx}@example.com",
            "phone": f"+2782123456{idx}",
            "password": "Test123",
            "first_name": "Test",
            "last_name": "Instructor",
            "id_number": test_case["id_number"],
            "license_number": f"LIC{idx}",
            "license_types": "B",
            "vehicle_registration": f"TST{idx}",
            "vehicle_make": "Toyota",
            "vehicle_model": "Corolla",
            "vehicle_year": 2020,
            "city": "Johannesburg",
            "hourly_rate": 350.0,
        }

        try:
            response = requests.post(f"{base_url}/auth/register/instructor", json=instructor_data, timeout=5)

            if test_case["should_pass"]:
                if response.status_code == 201:
                    print(f"✅ PASS: {test_case['description']}")
                    print(f"   Status: {response.status_code}")
                else:
                    print(f"❌ FAIL: {test_case['description']}")
                    print(f"   Expected 201, got {response.status_code}")
                    print(f"   Response: {response.json()}")
            else:
                if response.status_code == 422:
                    error_detail = response.json().get("detail", [])
                    # Get the error message
                    if isinstance(error_detail, list) and len(error_detail) > 0:
                        error_msg = error_detail[0].get("msg", "")
                    else:
                        error_msg = str(error_detail)

                    print(f"✅ PASS: {test_case['description']}")
                    print(f"   Status: {response.status_code} (Validation Error)")
                    print(f"   Error: {error_msg}")
                else:
                    print(f"⚠️  UNEXPECTED: {test_case['description']}")
                    print(f"   Expected 422, got {response.status_code}")
                    print(f"   Response: {response.json()}")

        except requests.exceptions.ConnectionError:
            print(f"⚠️  SKIP: {test_case['description']}")
            print("   Backend server not running (start with: .\scripts\drive-alive.bat start)")
            return
        except Exception as e:
            print(f"❌ ERROR: {test_case['description']}")
            print(f"   Exception: {str(e)}")

    # Test Student Registration
    print("\n📋 STUDENT REGISTRATION API TESTS:")
    print("-" * 60)

    for idx, test_case in enumerate(test_cases, 1):
        student_data = {
            "email": f"student{idx}@example.com",
            "phone": f"+2782765432{idx}",
            "password": "Test123",
            "first_name": "Test",
            "last_name": "Student",
            "id_number": test_case["id_number"],
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_phone": "+27821234567",
            "address_line1": "123 Main St",
            "province": "Gauteng",
            "city": "Johannesburg",
            "postal_code": "2000",
        }

        try:
            response = requests.post(f"{base_url}/auth/register/student", json=student_data, timeout=5)

            if test_case["should_pass"]:
                if response.status_code == 201:
                    print(f"✅ PASS: {test_case['description']}")
                    print(f"   Status: {response.status_code}")
                else:
                    print(f"❌ FAIL: {test_case['description']}")
                    print(f"   Expected 201, got {response.status_code}")
                    print(f"   Response: {response.json()}")
            else:
                if response.status_code == 422:
                    error_detail = response.json().get("detail", [])
                    # Get the error message
                    if isinstance(error_detail, list) and len(error_detail) > 0:
                        error_msg = error_detail[0].get("msg", "")
                    else:
                        error_msg = str(error_detail)

                    print(f"✅ PASS: {test_case['description']}")
                    print(f"   Status: {response.status_code} (Validation Error)")
                    print(f"   Error: {error_msg}")
                else:
                    print(f"⚠️  UNEXPECTED: {test_case['description']}")
                    print(f"   Expected 422, got {response.status_code}")
                    print(f"   Response: {response.json()}")

        except requests.exceptions.ConnectionError:
            print(f"⚠️  SKIP: {test_case['description']}")
            print("   Backend server not running")
            return
        except Exception as e:
            print(f"❌ ERROR: {test_case['description']}")
            print(f"   Exception: {str(e)}")

    print("\n" + "=" * 60)
    print("API Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    test_api_validation()
