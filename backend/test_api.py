"""
Test script for backend API
"""

import requests
import json

BASE_URL = "http://localhost:8000"


def test_root():
    """Test root endpoint"""
    print("Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200


def test_register_student():
    """Test student registration"""
    print("Testing student registration...")
    data = {
        "email": "student@test.com",
        "password": "Test123!@#",
        "phone": "+27123456789",
        "first_name": "John",
        "last_name": "Doe",
        "id_number": "9001015009087",
        "emergency_contact_name": "Jane Doe",
        "emergency_contact_phone": "+27987654321",
        "address_line1": "123 Main St",
        "city": "Johannesburg",
        "province": "Gauteng",
        "postal_code": "2000",
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/register/student", json=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}\n")
            return True
        else:
            print(f"Error: {response.text}\n")
            return False
    except Exception as e:
        print(f"Exception: {e}\n")
        return False


def test_register_instructor():
    """Test instructor registration"""
    print("Testing instructor registration...")
    data = {
        "email": "instructor@test.com",
        "password": "Test123!@#",
        "phone": "+27123456788",
        "first_name": "Mike",
        "last_name": "Smith",
        "license_number": "LIC123456",
        "id_number": "8505025008088",
        "vehicle_registration": "ABC123GP",
        "vehicle_make": "Toyota",
        "vehicle_model": "Corolla",
        "vehicle_year": 2020,
        "hourly_rate": 250.0,
        "current_latitude": -26.2041,
        "current_longitude": 28.0473,
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/register/instructor", json=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}\n")
            return True
        else:
            print(f"Error: {response.text}\n")
            return False
    except Exception as e:
        print(f"Exception: {e}\n")
        return False


def test_get_instructors():
    """Test getting instructors"""
    print("Testing get instructors...")
    params = {"latitude": -26.2041, "longitude": 28.0473, "max_distance_km": 50}

    response = requests.get(f"{BASE_URL}/instructors/", params=params)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        instructors = response.json()
        print(f"Found {len(instructors)} instructors")
        if instructors:
            print(f"First instructor: {json.dumps(instructors[0], indent=2)}\n")
    else:
        print(f"Error: {response.text}\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Backend API Tests")
    print("=" * 60)
    print()

    # Test root
    if not test_root():
        print("❌ Root endpoint failed!")
        exit(1)

    print("✅ Root endpoint working\n")

    # Test registrations
    test_register_student()
    test_register_instructor()

    # Test instructor search
    test_get_instructors()

    print("=" * 60)
    print("Tests complete!")
    print("=" * 60)
