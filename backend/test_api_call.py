"""
Test earnings endpoint with proper authentication
"""

import json

import requests

# First, login
print("🔐 Logging in...")
login_response = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "mvdeventer123@gmail.com", "password": "Test1234"},
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    exit(1)

token = login_response.json()["access_token"]
print(f"✅ Login successful")

# Now call earnings endpoint
print("\n📊 Calling earnings endpoint...")
headers = {"Authorization": f"Bearer {token}"}
earnings_response = requests.get(
    "http://localhost:8000/instructors/earnings-report", headers=headers
)

print(f"Status Code: {earnings_response.status_code}")
print(f"\nResponse:")
print(json.dumps(earnings_response.json(), indent=2))

if earnings_response.status_code == 200:
    data = earnings_response.json()
    print(f"\n✅ SUCCESS!")
    print(f"Total Earnings: R{data['total_earnings']:.2f}")
    print(f"Completed Lessons: {data['completed_lessons']}")
else:
    print(f"\n❌ ERROR!")
