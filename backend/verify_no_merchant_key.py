"""
Verify signature WITHOUT merchant_key
"""

import hashlib

# Data WITHOUT merchant_key
payment_data = {
    "amount": "261.00",
    "cancel_url": "http://localhost:3000/payment/cancel",
    "custom_int1": "17",
    "custom_str1": "PS0779BC9E3B64",
    "email_address": "test@student.com",
    "item_description": "Booking fee (R10.00) + Lessons (R251.00)",
    "item_name": "1 Driving Lesson",
    "merchant_id": "10000100",
    # merchant_key EXCLUDED from signature!
    "name_first": "Test",
    "name_last": "Student",
    "notify_url": "https://localhost:3000/api/payments/notify",
    "return_url": "http://localhost:3000/payment/success",
}

param_string = "&".join([f"{k}={str(v)}" for k, v in sorted(payment_data.items())])
signature = hashlib.md5(param_string.encode()).hexdigest()

print("=" * 80)
print("SIGNATURE VERIFICATION (merchant_key EXCLUDED)")
print("=" * 80)
print()
print("Signature string:")
print(param_string)
print()
print(f"Calculated: {signature}")
print(f"Backend:    b841047f4fa166aa187a70936dcc5ba1")
print()
print(
    f"Match: {'✅ YES - SIGNATURE IS CORRECT!' if signature == 'b841047f4fa166aa187a70936dcc5ba1' else '❌ NO'}"
)
print("=" * 80)

if signature == "b841047f4fa166aa187a70936dcc5ba1":
    print()
    print("✅ THE FIX IS CORRECT!")
    print("merchant_key must be EXCLUDED from signature calculation")
    print("Now test this URL in your browser:")
    print()
    import urllib.parse

    full_data = dict(payment_data)
    full_data["merchant_key"] = "46f0cd694581a"
    full_data["signature"] = signature
    url = (
        f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(full_data)}"
    )
    print(url)
