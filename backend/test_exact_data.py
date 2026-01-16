"""
Test if URL decoding affects signature
"""

import hashlib
from urllib.parse import unquote

# Raw data from backend
data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "17",
    "custom_str1": "PSB268A1ECD578",
    "email_address": "test@student.com",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    # merchant_id and merchant_key excluded
    "name_first": "Test",
    "name_last": "Student",
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

# Create signature string the way PayFast docs say
sig_str = "&".join([f"{k}={v}" for k, v in sorted(data.items())])
print("Signature String:")
print(sig_str)
print()

sig = hashlib.md5(sig_str.encode()).hexdigest()
print(f"Calculated: {sig}")
print(f"Backend:    e32fa420725e26432926474db8540a49")
print(f"Match: {sig == 'e32fa420725e26432926474db8540a49'}")
