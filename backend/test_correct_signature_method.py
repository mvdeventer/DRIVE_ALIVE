"""
Test signature generation using URL-encoded values like the official package.
The key difference: use urllib.parse.quote_plus on VALUES before hashing.
"""

import hashlib
import urllib.parse

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

print("=" * 80)
print("SIGNATURE GENERATION - OFFICIAL PACKAGE METHOD")
print("=" * 80)


# Method from fastapi-payfast package
def generate_signature_official_way(dataArray, passPhrase=""):
    payload = ""
    for key in dataArray:
        # URL-encode the value BEFORE adding to payload
        encoded_value = urllib.parse.quote_plus(str(dataArray[key]).replace("+", " "))
        payload += f"{key}={encoded_value}&"

    # Remove last &
    payload = payload[:-1]

    # Add passphrase if provided
    if passPhrase != "":
        payload += f"&passphrase={passPhrase}"

    return hashlib.md5(payload.encode()).hexdigest()


# Test WITHOUT passphrase (exclude merchant_key)
data_for_sig = {k: v for k, v in data.items() if k not in ["signature", "merchant_key"]}
signature = generate_signature_official_way(data_for_sig, passPhrase="")

print(f"\nSignature (no passphrase): {signature}")

# Test with PayFast
test_data = data.copy()
test_data["signature"] = signature

url = "https://sandbox.payfast.co.za/eng/process"
response = requests.post(url, data=test_data, allow_redirects=False)

print(f"\nPayFast Response: {response.status_code}")
if response.status_code in [200, 302]:
    print("✅ SUCCESS!")
else:
    print("❌ Still failing")
    if "signature" in response.text.lower():
        print("⚠️ Signature mismatch")
