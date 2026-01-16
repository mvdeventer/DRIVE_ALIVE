"""
Test PayFast with passphrase included in signature.
Based on GitHub examples, passphrase is REQUIRED even in sandbox.

The passphrase should be appended to the signature string BEFORE hashing.
"""

import hashlib

import requests

# PayFast sandbox credentials
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"
# Common sandbox passphrases to try:
PASSPHRASES = [
    "",  # Empty
    "jt7NOE43FZPn",  # Common test passphrase from docs
    "payfast",  # Generic
    MERCHANT_KEY,  # Using merchant key as passphrase
]

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
print("TESTING WITH DIFFERENT PASSPHRASES")
print("=" * 80)

url = "https://sandbox.payfast.co.za/eng/process"

for i, passphrase in enumerate(PASSPHRASES, 1):
    print(f"\nTest {i}: Passphrase = '{passphrase}'")

    # Calculate signature (exclude merchant_key)
    data_copy = {
        k: v for k, v in data.items() if k not in ["signature", "merchant_key"]
    }
    param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(data_copy.items())])

    # Append passphrase if not empty
    if passphrase:
        signature_string = f"{param_string}&passphrase={passphrase}"
    else:
        signature_string = param_string

    signature = hashlib.md5(signature_string.encode()).hexdigest()

    print(f"  Signature string: {signature_string[:100]}...")
    print(f"  Signature: {signature}")

    # Test with PayFast
    test_data = data.copy()
    test_data["signature"] = signature

    response = requests.post(url, data=test_data, allow_redirects=False)

    if response.status_code == 200:
        print("  ✅ SUCCESS!")
        print(f"\n🎉 WORKING PASSPHRASE: '{passphrase}'")
        break
    elif response.status_code == 302:
        print("  ✅ REDIRECT (Success!)")
        print(f"\n🎉 WORKING PASSPHRASE: '{passphrase}'")
        break
    else:
        if "signature" in response.text.lower():
            print("  ❌ Signature mismatch")
        else:
            print(f"  ❌ Other error: {response.status_code}")

print("\n" + "=" * 80)
