"""
Test script for multi-role user system

This script tests the multi-role user functionality by:
1. Registering a new student
2. Adding instructor role to same email
3. Attempting duplicate role registration
4. Testing wrong password error
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "multirole_test@example.com"
TEST_PASSWORD = "TestPass123!"
WRONG_PASSWORD = "WrongPass456!"

# Test data
STUDENT_DATA = {
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD,
    "first_name": "Multi",
    "last_name": "Role",
    "phone": "+27123456789",
    "id_number": "9001015800088",
    "learners_permit_number": "LP123456",
    "emergency_contact_name": "Emergency Contact",
    "emergency_contact_phone": "+27987654321",
    "address_line1": "123 Test Street",
    "address_line2": "",
    "province": "Western Cape",
    "city": "Cape Town",
    "suburb": "City Bowl",
    "postal_code": "8001",
}

INSTRUCTOR_DATA = {
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD,
    "first_name": "Multi",
    "last_name": "Role",
    "phone": "+27123456789",
    "id_number": "9001015800088",  # Same ID number allowed
    "license_number": "TEST123456",  # Must be unique
    "license_types": "CODE8,CODE10",
    "vehicle_registration": "CA123456",
    "vehicle_make": "Toyota",
    "vehicle_model": "Corolla",
    "vehicle_year": 2020,
    "province": "Western Cape",
    "city": "Cape Town",
    "suburb": "City Bowl",
    "hourly_rate": 250.0,
    "service_radius_km": 20.0,
    "max_travel_distance_km": 50.0,
    "rate_per_km_beyond_radius": 5.0,
    "bio": "Multi-role test instructor",
}


def print_test(test_name):
    """Print test header"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}")


def print_result(success, message, data=None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status}: {message}")
    if data:
        print(f"Response: {json.dumps(data, indent=2)}")


def test_register_student():
    """Test 1: Register as student"""
    print_test("Register New Student")

    response = requests.post(
        f"{BASE_URL}/auth/register/student", json=STUDENT_DATA, timeout=10
    )

    if response.status_code == 201:
        data = response.json()
        print_result(
            True,
            f"Student registered successfully (ID: {data.get('student_id')})",
            data.get("user"),
        )
        return True
    else:
        print_result(False, f"Registration failed: {response.text}")
        return False


def test_add_instructor_role():
    """Test 2: Add instructor role to existing user"""
    print_test("Add Instructor Role to Existing User")

    response = requests.post(
        f"{BASE_URL}/auth/register/instructor", json=INSTRUCTOR_DATA, timeout=10
    )

    if response.status_code == 201:
        data = response.json()
        print_result(
            True,
            f"Instructor role added successfully (ID: {data.get('instructor_id')})",
            data.get("user"),
        )
        return True
    else:
        print_result(False, f"Adding instructor role failed: {response.text}")
        return False


def test_duplicate_student_error():
    """Test 3: Attempt to register duplicate student"""
    print_test("Attempt Duplicate Student Registration")

    response = requests.post(
        f"{BASE_URL}/auth/register/student", json=STUDENT_DATA, timeout=10
    )

    if response.status_code == 400:
        error = response.json().get("detail", "")
        if "already has a student profile" in error:
            print_result(True, f"Correctly rejected duplicate: {error}")
            return True
        else:
            print_result(
                False, f"Wrong error message: {error}", response.json()
            )
            return False
    else:
        print_result(
            False,
            f"Should return 400 Bad Request, got {response.status_code}",
            response.json(),
        )
        return False


def test_wrong_password_error():
    """Test 4: Attempt registration with wrong password"""
    print_test("Test Wrong Password Error")

    wrong_data = INSTRUCTOR_DATA.copy()
    wrong_data["password"] = WRONG_PASSWORD
    wrong_data["license_number"] = "WRONG123"  # Different license to avoid conflict

    response = requests.post(
        f"{BASE_URL}/auth/register/instructor", json=wrong_data, timeout=10
    )

    if response.status_code == 401:
        error = response.json().get("detail", "")
        if "different password" in error:
            print_result(True, f"Correctly rejected wrong password: {error}")
            return True
        else:
            print_result(
                False, f"Wrong error message: {error}", response.json()
            )
            return False
    else:
        print_result(
            False,
            f"Should return 401 Unauthorized, got {response.status_code}",
            response.json(),
        )
        return False


def test_login():
    """Test 5: Login with multi-role account"""
    print_test("Login with Multi-Role Account")

    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=10,
    )

    if response.status_code == 200:
        data = response.json()
        print_result(
            True, "Login successful", {"access_token": data.get("access_token")[:20] + "..."}
        )

        # Get user info
        token = data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)

        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"\nUser Info:")
            print(f"  Email: {user_data.get('email')}")
            print(f"  Role: {user_data.get('role')}")
            print(f"  Has Student Profile: {'student_id' in user_data}")
            print(f"  Has Instructor Profile: {'instructor_id' in user_data}")
        return True
    else:
        print_result(False, f"Login failed: {response.text}")
        return False


def main():
    """Run all tests"""
    print(f"\n{'#'*60}")
    print("# Multi-Role User System Test Suite")
    print(f"# Testing against: {BASE_URL}")
    print(f"# Test Email: {TEST_EMAIL}")
    print(f"{'#'*60}")

    results = []

    try:
        # Test 1: Register student
        results.append(("Register Student", test_register_student()))

        # Test 2: Add instructor role
        results.append(("Add Instructor Role", test_add_instructor_role()))

        # Test 3: Duplicate student error
        results.append(("Duplicate Student Error", test_duplicate_student_error()))

        # Test 4: Wrong password error
        results.append(("Wrong Password Error", test_wrong_password_error()))

        # Test 5: Login
        results.append(("Login Multi-Role", test_login()))

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend server")
        print(f"   Make sure the server is running at {BASE_URL}")
        return

    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        import traceback

        traceback.print_exc()
        return

    # Print summary
    print(f"\n{'#'*60}")
    print("# Test Summary")
    print(f"{'#'*60}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Multi-role system is working correctly.")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Please review the errors above.")


if __name__ == "__main__":
    main()
