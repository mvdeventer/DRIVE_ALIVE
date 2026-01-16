"""
Test different signature calculation methods
PayFast might expect URL encoding in the signature string
"""

import hashlib
import urllib.parse

# Test data
data = {
    "merchant_id": "10000100",
    "amount": "10.00",
    "item_name": "Test Item",
    "return_url": "https://example.com/success",
    "cancel_url": "https://example.com/cancel",
    "notify_url": "https://example.com/notify",
}

print("=" * 80)
print("TESTING DIFFERENT SIGNATURE METHODS")
print("=" * 80)

# Method 1: Raw values (what we're doing now)
sig1_string = "&".join([f"{k}={v}" for k, v in sorted(data.items())])
sig1 = hashlib.md5(sig1_string.encode()).hexdigest()

# Method 2: URL encode values in signature string
sig2_parts = []
for k, v in sorted(data.items()):
    encoded_v = urllib.parse.quote(str(v), safe="")
    sig2_parts.append(f"{k}={encoded_v}")
sig2_string = "&".join(sig2_parts)
sig2 = hashlib.md5(sig2_string.encode()).hexdigest()

# Method 3: URL encode the entire string
sig3_string = urllib.parse.quote(sig1_string, safe="")
sig3 = hashlib.md5(sig3_string.encode()).hexdigest()

# Method 4: PayFast PHP example equivalent
# They use urlencode which encodes spaces as +
sig4_parts = []
for k, v in sorted(data.items()):
    encoded_v = urllib.parse.quote_plus(str(v))
    sig4_parts.append(f"{k}={encoded_v}")
sig4_string = "&".join(sig4_parts)
sig4 = hashlib.md5(sig4_string.encode()).hexdigest()

print(f"\nMethod 1 (raw):       {sig1}")
print(f"  String: {sig1_string[:80]}...")

print(f"\nMethod 2 (encode values): {sig2}")
print(f"  String: {sig2_string[:80]}...")

print(f"\nMethod 3 (encode all):    {sig3}")

print(f"\nMethod 4 (quote_plus):    {sig4}")
print(f"  String: {sig4_string[:80]}...")

# Test each with PayFast
import requests

print("\n" + "=" * 80)
print("TESTING WITH PAYFAST SANDBOX")
print("=" * 80)

for i, sig in enumerate([sig1, sig2, sig3, sig4], 1):
    test_data = dict(data)
    test_data["merchant_key"] = "46f0cd694581a"
    test_data["signature"] = sig

    url = (
        f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(test_data)}"
    )

    try:
        response = requests.get(url, timeout=5)
        status = (
            "✅ 200 OK" if response.status_code == 200 else f"❌ {response.status_code}"
        )
        print(f"\nMethod {i}: {status}")
        if response.status_code == 200:
            print(f"  SUCCESS! Use this method!")
            print(f"  Signature: {sig}")
            break
    except Exception as e:
        print(f"\nMethod {i}: ❌ Error - {e}")

print("\n" + "=" * 80)
