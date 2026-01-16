"""
Final verification of PayFast signature
"""

import hashlib

# Exact data from the latest test (WITHOUT merchant_key in signature)
data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "17",
    "custom_str1": "PSC2AC5EDF1BF1",
    "email_address": "test@student.com",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    "merchant_id": "10000100",
    # NO merchant_key in signature!
    "name_first": "Test",
    "name_last": "Student",
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

print("=" * 80)
print("PAYFAST SIGNATURE VERIFICATION")
print("=" * 80)
print("\nPayment Data (sorted alphabetically):")
for k in sorted(data.keys()):
    print(f"  {k:20s} = {data[k]}")

sig_string = "&".join([f"{k}={v}" for k, v in sorted(data.items())])
sig = hashlib.md5(sig_string.encode()).hexdigest()

print("\n" + "-" * 80)
print("Signature String:")
print(sig_string)
print("-" * 80)
print(f"\nCalculated MD5: {sig}")
print(f"From Backend:   ffaa76032ee41b3d1423c50ac8ef6df6")
print(
    f"\nMatch: {'✅ YES!' if sig == 'ffaa76032ee41b3d1423c50ac8ef6df6' else '❌ NO - Something is wrong'}"
)
print("=" * 80)

if sig == "ffaa76032ee41b3d1423c50ac8ef6df6":
    print("\n✅ SIGNATURE IS CORRECT!")
    print("\nThe fix was successful:")
    print("  - merchant_key is EXCLUDED from signature calculation")
    print("  - merchant_key is still INCLUDED in the URL")
    print("\nOpen test_payfast.html in your browser to test!")
else:
    print("\n❌ SIGNATURES DON'T MATCH!")
    print("\nExpected signature breakdown:")
    print(f"  String: {sig_string[:100]}...")
    print(f"  MD5:    {sig}")
