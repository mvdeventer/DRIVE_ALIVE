"""
Test the admin API endpoint for Gary's schedule
"""

import requests

# Gary's instructor ID from database
instructor_id = 3

# Test the schedule endpoint
try:
    response = requests.get(
        f"http://localhost:8000/admin/instructors/{instructor_id}/schedule",
        headers={"Authorization": "Bearer YOUR_ADMIN_TOKEN_HERE"},
        timeout=10
    )

    print("Schedule Endpoint Response:")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

except (requests.RequestException, requests.Timeout, requests.ConnectionError) as e:
    print(f"Error calling schedule endpoint: {e}")
    print("\nNote: You need to be logged in as admin and replace YOUR_ADMIN_TOKEN_HERE with your actual token")
