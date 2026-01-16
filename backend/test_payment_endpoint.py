"""
Test actual payment initiation endpoint
"""

import json

import requests

# Login first to get token
print("=" * 80)
print("Testing Actual Payment Initiation Endpoint")
print("=" * 80)
print()

# Step 1: Login
print("1. Logging in as student...")
login_data = {"username": "test@student.com", "password": "password123"}

try:
    response = requests.post(
        "http://localhost:8000/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful!")
        print(f"   Token: {token[:50]}...")
        print()

        # Step 2: Initiate payment
        print("2. Initiating payment...")
        payment_request = {
            "instructor_id": 1,
            "bookings": [
                {
                    "lesson_date": "2026-01-20T10:00:00",
                    "duration_minutes": 60,
                    "pickup_address": "123 Test Street",
                    "student_notes": "Test booking",
                }
            ],
            "payment_gateway": "payfast",
        }

        response = requests.post(
            "http://localhost:8000/payments/initiate",
            json=payment_request,
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   ✓ Payment initiated successfully!")
            print()
            print("3. Payment Details:")
            print("-" * 80)
            print(f"   Session ID: {result['payment_session_id']}")
            print(f"   Amount: R{result['amount']:.2f}")
            print(f"   Booking Fee: R{result['booking_fee']:.2f}")
            print(f"   Total: R{result['total_amount']:.2f}")
            print()
            print("4. PayFast URL:")
            print("-" * 80)
            print(f"   {result['payment_url']}")
            print()
            print("=" * 80)
            print("✓ Test Successful!")
            print("=" * 80)
            print()
            print("Copy the URL above and test it in your browser!")
        else:
            print(f"   ✗ Payment initiation failed: {response.status_code}")
            print(f"   Error: {response.text}")
    else:
        print(f"   ✗ Login failed: {response.status_code}")
        print(f"   Error: {response.text}")

except Exception as e:
    print(f"   ✗ Error: {str(e)}")
    print()
    print("Make sure:")
    print("  - Backend is running on http://localhost:8000")
    print("  - A student user exists with email 'student@example.com'")
    print("  - An instructor exists with ID 1")
