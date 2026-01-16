"""
Debug endpoint to see what signature string backend generates
"""

import requests

response = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "test@student.com", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)

token = response.json()["access_token"]

response = requests.post(
    "http://localhost:8000/payments/initiate",
    json={
        "instructor_id": 1,
        "bookings": [
            {
                "lesson_date": "2026-01-20T10:00:00",
                "duration_minutes": 60,
                "pickup_address": "123 Test",
                "student_notes": "Test",
            }
        ],
        "payment_gateway": "payfast",
    },
    headers={"Authorization": f"Bearer {token}"},
)

import hashlib
from urllib.parse import parse_qs, urlparse

url = response.json()["payment_url"]
parsed = urlparse(url)
params = parse_qs(parsed.query)

print("=" * 80)
print("ALL PARAMETERS IN URL:")
print("=" * 80)
for k in sorted(params.keys()):
    v = params[k][0] if isinstance(params[k], list) else params[k]
    print(f"{k:20s} = {v}")

print("\n" + "=" * 80)
print("TESTING DIFFERENT SIGNATURE COMBINATIONS:")
print("=" * 80)

# Test 1: All params except signature
data1 = {k: params[k][0] for k in params if k != "signature"}
sig1 = hashlib.md5(
    "&".join([f"{k}={v}" for k, v in sorted(data1.items())]).encode()
).hexdigest()
print(f"\n1. ALL params:          {sig1}")

# Test 2: Exclude merchant_key
data2 = {k: v for k, v in data1.items() if k != "merchant_key"}
sig2 = hashlib.md5(
    "&".join([f"{k}={v}" for k, v in sorted(data2.items())]).encode()
).hexdigest()
print(f"2. No merchant_key:     {sig2}")

# Test 3: Exclude merchant_id AND merchant_key
data3 = {k: v for k, v in data1.items() if k not in ["merchant_key", "merchant_id"]}
sig3 = hashlib.md5(
    "&".join([f"{k}={v}" for k, v in sorted(data3.items())]).encode()
).hexdigest()
print(f"3. No merchant fields:  {sig3}")

# Test 4: Only required fields (no custom fields)
data4 = {k: v for k, v in data1.items() if not k.startswith("custom")}
sig4 = hashlib.md5(
    "&".join([f"{k}={v}" for k, v in sorted(data4.items())]).encode()
).hexdigest()
print(f"4. No custom fields:    {sig4}")

print(f"\nBackend signature:      {params['signature'][0]}")
print("\n" + "=" * 80)

for i, sig in enumerate([sig1, sig2, sig3, sig4], 1):
    if sig == params["signature"][0]:
        print(f"*** MATCH FOUND: Test {i} ***")
