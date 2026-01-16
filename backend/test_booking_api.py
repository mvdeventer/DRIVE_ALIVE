"""Test API to check booking_reference is returned"""

import requests

# Get a token first by logging in
login_resp = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "admin@drivealive.co.za", "password": "admin123"},
)
if login_resp.status_code == 200:
    token = login_resp.json().get("access_token")
    print(f"Got token: {token[:20]}...")

    # Now get bookings
    bookings_resp = requests.get(
        "http://localhost:8000/admin/bookings?limit=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    print(f"Status: {bookings_resp.status_code}")
    if bookings_resp.status_code == 200:
        bookings = bookings_resp.json()
        print(f"Got {len(bookings)} bookings")
        for b in bookings:
            print(
                f"  ID: {b.get('id')}, booking_reference: {b.get('booking_reference')}"
            )
    else:
        print(f"Error: {bookings_resp.text}")
else:
    print(f"Login failed: {login_resp.status_code} - {login_resp.text}")
