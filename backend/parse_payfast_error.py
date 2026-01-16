"""
Extract detailed error message from PayFast 400 response.
"""

import hashlib
import re

import requests

# PayFast sandbox credentials
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"

data = {
    "merchant_id": MERCHANT_ID,
    "merchant_key": MERCHANT_KEY,
    "return_url": "https://www.example.com/success",
    "cancel_url": "https://www.example.com/cancel",
    "notify_url": "https://www.example.com/notify",
    "name_first": "John",
    "name_last": "Doe",
    "email_address": "john@example.com",
    "amount": "100.00",
    "item_name": "Test Item",
}

# Calculate signature
data_copy = {k: v for k, v in data.items() if k not in ["signature", "merchant_key"]}
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(data_copy.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()
data["signature"] = signature

# Make request
response = requests.post(
    "https://sandbox.payfast.co.za/eng/process", data=data, allow_redirects=False
)

print("=" * 80)
print("DETAILED ERROR ANALYSIS")
print("=" * 80)

# Parse HTML to extract error details
print(f"\nStatus Code: {response.status_code}")
print(f"\nFull HTML Response:\n{response.text}\n")

# Try to extract specific error messages using regex
error_messages = re.findall(r"<p[^>]*>(.*?)</p>", response.text, re.DOTALL)
if error_messages:
    print("\nExtracted error messages:")
    for msg in error_messages:
        clean_msg = re.sub("<[^<]+?>", "", msg).strip()
        if clean_msg:
            print(f"  - {clean_msg}")

# Look for validation errors
validation_errors = re.findall(
    r"(signature|merchant|invalid|mismatch|field)", response.text, re.IGNORECASE
)
if validation_errors:
    print(f"\nKeywords found: {set(validation_errors)}")
