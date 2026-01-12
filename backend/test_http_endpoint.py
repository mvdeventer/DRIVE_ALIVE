"""
Test the actual HTTP endpoint to see the 422 error details
"""

import requests

# Login first
login_resp = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "mvdeventer123@gmail.com", "password": "Test1234"},
)

if login_resp.status_code == 200:
    token = login_resp.json()["access_token"]
    print(f"✓ Logged in successfully")

    # Call earnings endpoint
    headers = {"Authorization": f"Bearer {token}"}
    earnings_resp = requests.get(
        "http://localhost:8000/instructors/earnings-report", headers=headers
    )

    print(f"\nStatus Code: {earnings_resp.status_code}")
    print(f"Response Headers: {dict(earnings_resp.headers)}")
    print(f"\nResponse Body:")
    print(earnings_resp.text)
else:
    print(f"Login failed: {login_resp.status_code}")
    print(login_resp.text)
