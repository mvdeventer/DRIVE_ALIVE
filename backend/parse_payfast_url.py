"""
Parse the PayFast URL from the test to see exactly what's being sent
"""

from urllib.parse import parse_qs, urlparse

url = "https://sandbox.payfast.co.za/eng/process?merchant_id=10000100&merchant_key=46f0cd694581a&return_url=http%3A%2F%2Flocalhost%3A3000%2Fpayment%2Fsuccess&cancel_url=http%3A%2F%2Flocalhost%3A3000%2Fpayment%2Fcancel&notify_url=https%3A%2F%2Flocalhost%3A3000%2Fapi%2Fpayments%2Fnotify&amount=261.00&item_name=1+Driving+Lesson&item_description=Booking+fee+%28R10.00%29+%2B+Lessons+%28R251.00%29&email_address=test%40student.com&name_first=Test&name_last=Student&custom_str1=PS4F33EA2A5410&custom_int1=17&signature=16b545f904bc844f97efb9327e28ed3b"

parsed = urlparse(url)
params = parse_qs(parsed.query, keep_blank_values=True)

print("=" * 80)
print("PAYFAST URL PARAMETERS")
print("=" * 80)
print()

# Sort alphabetically for signature generation
for key in sorted(params.keys()):
    value = params[key][0] if isinstance(params[key], list) else params[key]
    print(f"{key:25s} = {value}")

print()
print("=" * 80)
print("SIGNATURE STRING (for validation)")
print("=" * 80)

# Create signature string
signature_parts = []
for key in sorted(params.keys()):
    if key != "signature":
        value = params[key][0] if isinstance(params[key], list) else params[key]
        signature_parts.append(f"{key}={value}")

signature_string = "&".join(signature_parts)
print(signature_string)

# Calculate signature
import hashlib

calculated_signature = hashlib.md5(signature_string.encode()).hexdigest()

print()
print("=" * 80)
print(f"Signature in URL:    {params['signature'][0]}")
print(f"Calculated Signature: {calculated_signature}")
print(f"Match: {'✓ YES' if params['signature'][0] == calculated_signature else '✗ NO'}")
print("=" * 80)
