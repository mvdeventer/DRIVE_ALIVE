"""Simple test to see actual error"""

import requests
import json

url = "http://localhost:8000/auth/register/student"
data = {
    "email": "newstudent@test.com",
    "password": "Test123!",
    "phone": "+27111111111",
    "first_name": "New",
    "last_name": "Student",
    "id_number": "9001015009088",
    "emergency_contact_name": "Emergency",
    "emergency_contact_phone": "+27222222222",
    "address_line1": "123 Test St",
    "city": "Johannesburg",
    "province": "Gauteng",
    "postal_code": "2000",
}

response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
