"""
Generate correct PayFast URL for testing
"""

import hashlib
import urllib.parse

payment_data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "17",
    "custom_str1": "PS4F33EA2A5410",
    "email_address": "test@student.com",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    "merchant_id": "10000100",
    "merchant_key": "46f0cd694581a",
    "name_first": "Test",
    "name_last": "Student",
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

# Generate correct signature
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(payment_data.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()
payment_data["signature"] = signature

# Build URL with URL encoding
payfast_url = (
    f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(payment_data)}"
)

print("=" * 80)
print("CORRECT PAYFAST URL WITH MATCHING SIGNATURE")
print("=" * 80)
print()
print(f"Signature: {signature}")
print()
print("URL:")
print(payfast_url)
print()
print("=" * 80)
print("Copy the URL above and test it in your browser!")
print("=" * 80)
