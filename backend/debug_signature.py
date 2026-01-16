"""
Test payment endpoint and capture backend signature generation
Run this while watching the backend console output
"""

import json
from urllib.parse import parse_qs, urlparse

import requests

print("=" * 80)
print("TESTING PAYFAST SIGNATURE MISMATCH")
print("=" * 80)
print()

# Login
print("Step 1: Login...")
response = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "test@student.com", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)

if response.status_code != 200:
    print(f"❌ Login failed: {response.status_code}")
    print(response.text)
    exit(1)

token = response.json()["access_token"]
print("✅ Login successful")
print()

# Initiate payment
print("Step 2: Initiating payment...")
print(">>> CHECK BACKEND CONSOLE FOR SIGNATURE DEBUG OUTPUT <<<")
print()

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

if response.status_code != 200:
    print(f"❌ Payment initiation failed: {response.status_code}")
    print(response.text)
    exit(1)

result = response.json()
print("✅ Payment initiated")
print()
print("=" * 80)
print("BACKEND RESPONSE:")
print("=" * 80)
print(f"Payment URL: {result['payment_url']}")
print()

# Parse the URL to extract signature
parsed = urlparse(result["payment_url"])
params = parse_qs(parsed.query)

print("Signature in URL:", params["signature"][0])
print()
print("=" * 80)
print("NOW CHECK THE BACKEND CONSOLE WINDOW")
print("Look for '🔐 SIGNATURE GENERATION' section")
print("Compare the MD5 Hash there with the signature in URL above")
print("=" * 80)
