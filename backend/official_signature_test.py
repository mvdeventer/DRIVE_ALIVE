"""
FINAL PayFast Signature Test - Following Official Documentation
https://developers.payfast.co.za/docs#signature

PayFast signature rules:
1. All fields EXCEPT signature itself
2. Sorted alphabetically
3. URL decode any encoded values
4. Create string: key1=value1&key2=value2
5. Add passphrase if live mode (NOT for sandbox)
6. MD5 hash

merchant_key SHOULD be included!
"""

import hashlib

# Get the latest payment URL and test it
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

from urllib.parse import parse_qs, unquote, urlparse

url = response.json()["payment_url"]
parsed = urlparse(url)
params = parse_qs(parsed.query)

# URL decode all values (PayFast requirement!)
decoded_params = {}
for k in params:
    v = params[k][0] if isinstance(params[k], list) else params[k]
    decoded_params[k] = unquote(v)  # URL decode!

print("=" * 80)
print("PAYFAST SIGNATURE GENERATION - OFFICIAL METHOD")
print("=" * 80)
print("\nDecoded Parameters:")
for k in sorted(decoded_params.keys()):
    print(f"  {k:20s} = {decoded_params[k]}")

# Remove signature for calculation
sig_data = {k: v for k, v in decoded_params.items() if k != "signature"}

# Create signature string (ALL fields, sorted, URL-decoded)
sig_str = "&".join([f"{k}={v}" for k, v in sorted(sig_data.items())])

print("\n" + "-" * 80)
print("Signature String:")
print(sig_str[:200] + "...")
print("-" * 80)

sig = hashlib.md5(sig_str.encode()).hexdigest()

print(f"\nCalculated: {sig}")
print(f"Backend:    {decoded_params['signature']}")
print(f"\n{'✅ MATCH!' if sig == decoded_params['signature'] else '❌ NO MATCH'}")

if sig == decoded_params["signature"]:
    print("\n🎉 SUCCESS! Signature is correct!")
    print("\nTest the payment URL in your browser:")
    print(url)
else:
    print(f"\nDifference:")
    print(f"  Expected length: {len(sig)}")
    print(f"  Actual length:   {len(decoded_params['signature'])}")
