"""
Test PayFast with minimal required fields only
According to PayFast docs: https://developers.payfast.co.za/docs#step_1_form_html_page
"""

import hashlib
import urllib.parse

print("=" * 80)
print("PAYFAST MINIMAL TEST - Official Sandbox Credentials")
print("=" * 80)

# PayFast official sandbox test credentials
# From: https://developers.payfast.co.za/docs#sandbox_credentials
MERCHANT_ID = "10000100"
MERCHANT_KEY = "46f0cd694581a"

# Minimal required fields for testing
payment_data = {
    "merchant_id": MERCHANT_ID,
    "merchant_key": MERCHANT_KEY,
    "return_url": "https://example.com/success",  # Must be valid URL
    "cancel_url": "https://example.com/cancel",
    "notify_url": "https://example.com/notify",
    "amount": "10.00",  # Simple amount
    "item_name": "Test Item",
    # Optional fields
    "email_address": "test@example.com",
    "name_first": "Test",
    "name_last": "User",
}

print("\nPayment Data:")
print("-" * 80)
for k in sorted(payment_data.keys()):
    print(f"  {k:20s} = {payment_data[k]}")
print("-" * 80)

# Calculate signature (excluding merchant_key as per PayFast docs)
sig_data = {
    k: v for k, v in payment_data.items() if k not in ["signature", "merchant_key"]
}
sig_string = "&".join([f"{k}={v}" for k, v in sorted(sig_data.items())])
signature = hashlib.md5(sig_string.encode()).hexdigest()

print(f"\nSignature String (no merchant_key):")
print(sig_string)
print(f"\nSignature: {signature}")

# Add signature to data
payment_data["signature"] = signature

# Build URL
url = (
    f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(payment_data)}"
)

print("\n" + "=" * 80)
print("TEST URL:")
print("=" * 80)
print(url)
print("\n" + "=" * 80)
print("TEST THIS URL IN YOUR BROWSER")
print("=" * 80)
print("\nIf this works, the issue is with our return/cancel/notify URLs")
print("PayFast requires valid public HTTPS URLs, not localhost!")

# Test with requests
import requests

try:
    response = requests.get(url, timeout=10)
    print(f"\nPayFast Response: {response.status_code}")
    if response.status_code == 200:
        print("✅ SUCCESS! PayFast accepted the payment!")
    else:
        print(f"❌ FAILED: {response.status_code}")
        if "signature" in response.text.lower():
            print("Error: Signature mismatch")
        elif "url" in response.text.lower():
            print("Error: Invalid URL")
        else:
            print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
