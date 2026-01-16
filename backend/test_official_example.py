"""
Test with PayFast's exact official example from their documentation.
Reference: https://developers.payfast.co.za/docs#step_1_form_the_transaction_data
"""

import hashlib
from urllib.parse import urlencode

import requests

# PayFast sandbox credentials
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"

# Use PayFast's EXACT example from their docs
# This should generate signature: 52e2dbd55ac7fbc0a89c09e6a15f1c71
data = {
    "merchant_id": MERCHANT_ID,
    "merchant_key": MERCHANT_KEY,
    "return_url": "https://www.example.com/success",
    "cancel_url": "https://www.example.com/cancel",
    "notify_url": "https://www.example.com/notify",
    "name_first": "John",
    "name_last": "Doe",
    "email_address": "john@example.com",
    "m_payment_id": "01AB",
    "amount": "100.00",
    "item_name": "Test Item",
}

print("=" * 80)
print("TESTING WITH PAYFAST'S OFFICIAL EXAMPLE")
print("=" * 80)

# Calculate signature using PayFast's method
# Exclude signature and merchant_key from calculation
data_copy = {k: v for k, v in data.items() if k not in ["signature", "merchant_key"]}
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(data_copy.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()

print(f"\nSignature string: {param_string}")
print(f"Generated signature: {signature}")
print(f"Expected signature: 52e2dbd55ac7fbc0a89c09e6a15f1c71")
print(f"Match: {'✅' if signature == '52e2dbd55ac7fbc0a89c09e6a15f1c71' else '❌'}")

# Add signature to data for submission
data["signature"] = signature

# Test with PayFast sandbox
print("\n" + "=" * 80)
print("TESTING WITH PAYFAST SANDBOX")
print("=" * 80)

url = "https://sandbox.payfast.co.za/eng/process"
encoded_params = urlencode(data)
full_url = f"{url}?{encoded_params}"

print(f"\nFull URL: {full_url}")

response = requests.get(full_url, allow_redirects=False)
print(f"\nResponse Status: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")

if response.status_code == 200:
    print("✅ SUCCESS!")
elif response.status_code == 302:
    print("✅ REDIRECT (Payment form)")
    print(f"Location: {response.headers.get('Location', 'N/A')}")
else:
    print(f"❌ FAILED: {response.status_code}")
    print(f"Response Text: {response.text[:500]}")
