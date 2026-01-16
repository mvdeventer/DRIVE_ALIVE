"""
Test PayFast signature with optional passphrase.
Some users report sandbox requires empty passphrase to be appended.
"""

import hashlib
from urllib.parse import urlencode

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
print("TESTING SIGNATURES WITH AND WITHOUT PASSPHRASE")
print("=" * 80)

# Test 1: Without passphrase (current method)
data_copy = {k: v for k, v in data.items() if k not in ["signature", "merchant_key"]}
param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(data_copy.items())])
sig1 = hashlib.md5(param_string.encode()).hexdigest()
print(f"\n1. Without passphrase:")
print(f"   String: {param_string}")
print(f"   Signature: {sig1}")

# Test 2: With empty passphrase appended
param_string_with_empty = param_string  # No passphrase = don't append
sig2 = hashlib.md5(param_string_with_empty.encode()).hexdigest()
print(f"\n2. With empty passphrase (same as #1):")
print(f"   Signature: {sig2}")

# Test 3: Try using merchant_key as passphrase (some docs suggest this)
param_string_with_key = f"{param_string}&passphrase={MERCHANT_KEY}"
sig3 = hashlib.md5(param_string_with_key.encode()).hexdigest()
print(f"\n3. With merchant_key as passphrase:")
print(f"   String: {param_string_with_key}")
print(f"   Signature: {sig3}")

# Test 4: Include merchant_key in params but not signature
# (This is incorrect per docs, but let's test)
data_copy_with_key = {k: v for k, v in data.items() if k not in ["signature"]}
param_string_all = "&".join(
    [f"{k}={str(v)}" for k, v in sorted(data_copy_with_key.items())]
)
sig4 = hashlib.md5(param_string_all.encode()).hexdigest()
print(f"\n4. Include merchant_key in signature (incorrect):")
print(f"   String: {param_string_all}")
print(f"   Signature: {sig4}")

# Test with PayFast
print("\n" + "=" * 80)
print("TESTING WITH PAYFAST")
print("=" * 80)

url = "https://sandbox.payfast.co.za/eng/process"

for i, sig in enumerate([sig1, sig3], 1):
    test_data = data.copy()
    test_data["signature"] = sig

    print(f"\nTest {i}: Signature {sig}")
    response = requests.get(url, params=test_data, allow_redirects=False)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        print("✅ SUCCESS!")
        break
    elif response.status_code == 302:
        print("✅ REDIRECT (Payment form)")
        break
    else:
        if "signature" in response.text.lower():
            print("❌ Signature mismatch")
        else:
            print(f"❌ Other error: {response.text[:200]}")
