#!/usr/bin/env python3
"""Send test email via the test-email endpoint"""
import requests
import json
import sys

payload = {
    "smtp_email": "mvdeventer123@gmail.com",
    "smtp_password": "layj gnly vlmo jcqm",
    "test_recipient": "mvdeventer123@gmail.com",
    "verification_link_validity_minutes": 30
}

print("📧 Sending test email...")
print(f"From: {payload['smtp_email']}")
print(f"To: {payload['test_recipient']}")
print()

try:
    response = requests.post(
        "http://localhost:8000/verify/test-email",
        json=payload,
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS! Status: {response.status_code}")
        print(f"Message: {data.get('message')}")
        print(f"Stored in DB: {data.get('stored_in_db')}")
        print()
        print("📬 Check your inbox for the test email!")
        sys.exit(0)
    else:
        print(f"❌ Failed with status: {response.status_code}")
        print(f"Error: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)
