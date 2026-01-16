"""
Test signature WITHOUT merchant_key (PayFast requirement)
"""

import hashlib

# Data WITHOUT merchant_key
payment_data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "2",
    "custom_str1": "PSA06ACC0F0812",
    "email_address": "mvdeventer@lhar.co.za",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    "merchant_id": "10000100",
    # merchant_key EXCLUDED!
    "name_first": "Piet",
    "name_last": "van Deventer",
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

sig_string = "&".join([f"{k}={v}" for k, v in sorted(payment_data.items())])
signature = hashlib.md5(sig_string.encode()).hexdigest()

print("=" * 80)
print("PAYFAST SIGNATURE - MERCHANT_KEY EXCLUDED")
print("=" * 80)
print("\nSignature String:")
print(sig_string)
print(f"\nMD5: {signature}")
print("\n" + "=" * 80)
print("Now restart backend and test payment again")
print("The new signature should match this:")
print(signature)
print("=" * 80)

# Build test URL
import urllib.parse

full_data = dict(payment_data)
full_data["merchant_key"] = "46f0cd694581a"  # Add back for URL
full_data["signature"] = signature

url = f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(full_data)}"
print("\nTest URL:")
print(url)
