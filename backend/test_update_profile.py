"""
Test script to debug profile update issue
"""

import json

import requests

# Configuration
BASE_URL = "http://localhost:8000"

# Test login first
login_data = {"username": "mvdeventer@lhar.co.za", "password": "password123"}

try:
    print("1. Attempting login...")
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data["access_token"]
        print(f"   ✓ Login successful! Token: {access_token[:20]}...")

        # Test getting current user
        print("\n2. Getting current user profile...")
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✓ Current user: {json.dumps(user_data, indent=2)}")

            # Test updating profile
            print("\n3. Attempting to update profile...")
            update_data = {
                "first_name": user_data.get("first_name", "Piet"),
                "last_name": user_data.get("last_name", "van Deventer"),
                "phone": "+27611154598",  # Changed phone number
            }
            print(f"   Update data: {json.dumps(update_data, indent=2)}")

            response = requests.put(
                f"{BASE_URL}/auth/me",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=update_data,
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")

            if response.status_code == 200:
                print("   ✓ Profile updated successfully!")
            else:
                print(f"   ✗ Failed to update profile")
                try:
                    error_data = response.json()
                    print(f"   Error details: {json.dumps(error_data, indent=2)}")
                except:
                    pass
        else:
            print(f"   ✗ Failed to get user profile: {response.text}")
    else:
        print(f"   ✗ Login failed: {response.text}")

except Exception as e:
    print(f"Error: {e}")
