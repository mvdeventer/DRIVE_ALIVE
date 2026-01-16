"""
Test PayFast using POST method instead of GET.
PayFast form submissions should use POST, not GET.
"""

import hashlib

import requests

# PayFast sandbox credentials
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"

# Minimal test data
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
print("TESTING POST METHOD")
print("=" * 80)

# Calculate signature (exclude merchant_key)
data_copy = {k: v for k, v in data.items() if k not in ["signature", "merchant_key"]}
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(data_copy.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()

print(f"\nSignature string: {param_string}")
print(f"Signature: {signature}")

# Add signature to data
data["signature"] = signature

# Test with POST
url = "https://sandbox.payfast.co.za/eng/process"
print(f"\nURL: {url}")
print("Method: POST")
print(f"Data: {data}")

response = requests.post(url, data=data, allow_redirects=False)

print(f"\n" + "=" * 80)
print(f"Response Status: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")

if response.status_code == 200:
    print("\n✅ SUCCESS! PayFast accepted the payment.")
    print("\nResponse body preview:")
    print(response.text[:500])
elif response.status_code == 302:
    print("\n✅ REDIRECT (Payment accepted, redirecting)")
    print(f"Location: {response.headers.get('Location', 'N/A')}")
else:
    print(f"\n❌ FAILED: {response.status_code}")
    print("\nResponse body:")
    print(response.text[:1000])

    if "signature" in response.text.lower():
        print("\n⚠️ Error mentions 'signature'")
