"""
Test PayFast signature generation with the exact data from backend
"""

import hashlib

# From backend output
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

print("=" * 80)
print("PAYFAST SIGNATURE GENERATION TEST")
print("=" * 80)
print()
print("Payment Data:")
print("-" * 80)
for key in sorted(payment_data.keys()):
    print(f"  {key:20s} = {payment_data[key]}")
print("-" * 80)
print()

# Generate signature string
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(payment_data.items())])

print("Signature String:")
print("-" * 80)
print(param_string)
print("-" * 80)
print()

# Generate MD5 hash
signature = hashlib.md5(param_string.encode()).hexdigest()

print(f"Generated Signature: {signature}")
print()
print("Expected in URL:     16b545f904bc844f97efb9327e28ed3b")
print(
    f"Match: {'✓ YES' if signature == '16b545f904bc844f97efb9327e28ed3b' else '✗ NO'}"
)
print("=" * 80)
