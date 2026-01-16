"""
Test PayFast Sandbox Connection and Signature Generation
"""

import hashlib
import urllib.parse

# PayFast Sandbox Credentials (public test credentials)
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"

# Test payment data
payment_data = {
    "merchant_id": MERCHANT_ID,
    "merchant_key": MERCHANT_KEY,
    "return_url": "http://localhost:8081/payment/success",
    "cancel_url": "http://localhost:8081/payment/cancel",
    "notify_url": "https://localhost:8081/api/payments/notify",
    "amount": "20.00",
    "item_name": "1 Driving Lesson",
    "email_address": "test@example.com",
    "name_first": "Test",
    "name_last": "User",
    "custom_str1": "PS123456789ABC",
    "custom_int1": "1",
}

print("=" * 80)
print("PayFast Sandbox Connection Test")
print("=" * 80)
print()

# Step 1: Show payment data
print("1. Payment Data (before signature):")
print("-" * 80)
for key, value in sorted(payment_data.items()):
    print(f"   {key:20s} = {value}")
print()

# Step 2: Generate signature string
print("2. Generating Signature String:")
print("-" * 80)
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(payment_data.items())])
print(f"   {param_string}")
print()

# Step 3: Generate MD5 hash
print("3. Generating MD5 Signature:")
print("-" * 80)
signature = hashlib.md5(param_string.encode()).hexdigest()
print(f"   Signature: {signature}")
print()

# Step 4: Add signature to data
payment_data["signature"] = signature

# Step 5: Build PayFast URL
print("4. PayFast Sandbox URL:")
print("-" * 80)
payfast_url = (
    f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(payment_data)}"
)
print(f"   {payfast_url}")
print()

# Step 6: Show final data with signature
print("5. Final Payment Data (with signature):")
print("-" * 80)
for key, value in sorted(payment_data.items()):
    print(f"   {key:20s} = {value}")
print()

print("=" * 80)
print("Test Complete!")
print("=" * 80)
print()
print("Next Steps:")
print("  1. Copy the URL above and paste it in your browser")
print("  2. You should see the PayFast sandbox payment page")
print("  3. If you get a signature error, there's a configuration issue")
print()
