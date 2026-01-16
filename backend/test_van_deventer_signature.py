"""
Test signature with exact data from Piet van Deventer payment
"""

import hashlib

# Exact data from backend debug output
payment_data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "2",
    "custom_str1": "PSA06ACC0F0812",
    "email_address": "mvdeventer@lhar.co.za",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    "merchant_id": "10000100",
    "merchant_key": "46f0cd694581a",
    "name_first": "Piet",
    "name_last": "van Deventer",  # HAS SPACE!
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

# Calculate signature exactly as backend does
sig_string = "&".join([f"{k}={v}" for k, v in sorted(payment_data.items())])
signature = hashlib.md5(sig_string.encode()).hexdigest()

print("=" * 80)
print("SIGNATURE VERIFICATION")
print("=" * 80)
print("\nSignature String:")
print(sig_string)
print(f"\nCalculated MD5: {signature}")
print(f"Backend MD5:    26a66a1dc8709612d781bbb8dc6bed21")
print(f"Match: {signature == '26a66a1dc8709612d781bbb8dc6bed21'}")

# Now test what happens when PayFast receives URL-encoded values
import urllib.parse

# Build the URL as backend does
encoded_url = urllib.parse.urlencode(payment_data)
print("\n" + "=" * 80)
print("URL ENCODING TEST")
print("=" * 80)
print(f"\nname_last in URL: {urllib.parse.quote('van Deventer')}")
print(f"Encodes to: name_last={urllib.parse.quote('van Deventer')}")
print("\nWhen PayFast decodes 'van+Deventer' it becomes: 'van Deventer'")
print("When PayFast decodes 'van%20Deventer' it becomes: 'van Deventer'")

# The issue: PayFast might be using different encoding for special chars
# Check if parentheses and plus signs are the issue
print("\n" + "=" * 80)
print("SPECIAL CHARACTERS IN item_description")
print("=" * 80)
test_desc = "Booking fee (R10.00) + Lessons (R251.00)"
print(f"Original: {test_desc}")
print(f"URL encoded: {urllib.parse.quote(test_desc)}")
print(f"URL encoded (safe=''): {urllib.parse.quote(test_desc, safe='')}")

# PayFast might be rejecting because of special characters
# Let's see what the signature would be without special chars
safe_data = payment_data.copy()
safe_data["item_description"] = "Booking fee and Lessons"
safe_sig_string = "&".join([f"{k}={v}" for k, v in sorted(safe_data.items())])
safe_signature = hashlib.md5(safe_sig_string.encode()).hexdigest()

print(f"\n\nIf we remove special chars from item_description:")
print(f"  New signature: {safe_signature}")
