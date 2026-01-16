"""
Verify the signature from the latest test
"""

import hashlib

# Extract data from URL
payment_data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "17",
    "custom_str1": "PS8088B3E6E3A9",
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

# Generate signature
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(payment_data.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()

print("=" * 80)
print("SIGNATURE VERIFICATION")
print("=" * 80)
print(f"\nCalculated: {signature}")
print(f"In URL:     3cdbde72ba27edaeb38d7d350f6085e5")
print(
    f"\nMatch: {'✅ YES' if signature == '3cdbde72ba27edaeb38d7d350f6085e5' else '❌ NO'}"
)
print()

if signature != "3cdbde72ba27edaeb38d7d350f6085e5":
    print("DEBUGGING:")
    print("Signature string:")
    print(param_string)
    print()

# Let me check if PayFast is rejecting because of the merchant_key being in the signature
# According to PayFast docs, merchant_key should NOT be in the signature for validation
print("=" * 80)
print("TESTING WITHOUT merchant_key IN SIGNATURE")
print("=" * 80)

data_without_key = {k: v for k, v in payment_data.items() if k != "merchant_key"}
param_string_no_key = "&".join(
    [f"{k}={str(v)}" for k, v in sorted(data_without_key.items())]
)
signature_no_key = hashlib.md5(param_string_no_key.encode()).hexdigest()

print(f"\nSignature WITHOUT merchant_key: {signature_no_key}")
print(f"Backend signature:               3cdbde72ba27edaeb38d7d350f6085e5")
print(
    f"\nMatch: {'✅ YES' if signature_no_key == '3cdbde72ba27edaeb38d7d350f6085e5' else '❌ NO'}"
)
