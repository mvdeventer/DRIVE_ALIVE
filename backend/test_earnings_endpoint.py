"""
Test the earnings endpoint directly
"""

import json

import requests

# Login as Martin (instructor)
login_data = {"username": "mvdeventer123@gmail.com", "password": "Test1234"}

print("🔐 Logging in as Martin...")
response = requests.post("http://localhost:8000/auth/login", data=login_data)
if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"✓ Login successful! Token: {token[:20]}...")

    # Get earnings report
    headers = {"Authorization": f"Bearer {token}"}
    print("\n📊 Fetching earnings report...")
    earnings_response = requests.get(
        "http://localhost:8000/instructors/earnings-report", headers=headers
    )

    if earnings_response.status_code == 200:
        data = earnings_response.json()
        print("\n✅ Earnings Report:")
        print(f"  Total Earnings: R{data['total_earnings']:.2f}")
        print(f"  Hourly Rate: R{data['hourly_rate']:.2f}")
        print(f"  Completed Lessons: {data['completed_lessons']}")
        print(f"  Pending Lessons: {data['pending_lessons']}")
        print(f"  Cancelled Lessons: {data['cancelled_lessons']}")
        print(f"  Total Lessons: {data['total_lessons']}")

        if data["earnings_by_month"]:
            print(f"\n  Monthly Breakdown:")
            for month in data["earnings_by_month"][:3]:
                print(
                    f"    {month['month']}: R{month['earnings']:.2f} ({month['lessons']} lessons)"
                )

        if data["recent_earnings"]:
            print(f"\n  Recent Earnings (first 3):")
            for earning in data["recent_earnings"][:3]:
                print(f"    {earning['student_name']}: R{earning['amount']:.2f}")
    else:
        print(f"❌ Error fetching earnings: {earnings_response.status_code}")
        print(earnings_response.text)
else:
    print(f"❌ Login failed: {response.status_code}")
    print(response.text)
    print(response.text)
