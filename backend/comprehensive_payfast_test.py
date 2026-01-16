"""
Comprehensive PayFast Sandbox Payment Test
Tests actual payment flow and validates signature
"""

import hashlib
from urllib.parse import parse_qs, unquote, urlparse

import requests

print("=" * 80)
print("PAYFAST SANDBOX PAYMENT TEST")
print("=" * 80)

# Step 1: Login
print("\n[1/5] Logging in as test student...")
response = requests.post(
    "http://localhost:8000/auth/login",
    data={"username": "test@student.com", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)

if response.status_code != 200:
    print(f"❌ Login failed: {response.status_code}")
    print(response.text)
    exit(1)

token = response.json()["access_token"]
print("✅ Login successful")

# Step 2: Initiate payment
print("\n[2/5] Initiating payment...")
payment_request = {
    "instructor_id": 1,
    "bookings": [
        {
            "lesson_date": "2026-01-20T10:00:00",
            "duration_minutes": 60,
            "pickup_address": "123 Test Street",
            "student_notes": "Test booking",
        }
    ],
    "payment_gateway": "payfast",
}

response = requests.post(
    "http://localhost:8000/payments/initiate",
    json=payment_request,
    headers={"Authorization": f"Bearer {token}"},
)

if response.status_code != 200:
    print(f"❌ Payment initiation failed: {response.status_code}")
    print(response.text)
    exit(1)

result = response.json()
payment_url = result["payment_url"]
print("✅ Payment URL generated")

# Step 3: Parse the URL
print("\n[3/5] Analyzing payment URL...")
parsed = urlparse(payment_url)
params = parse_qs(parsed.query)

# Decode all params
decoded_params = {}
for k in params:
    v = params[k][0] if isinstance(params[k], list) else params[k]
    decoded_params[k] = unquote(v)

print("\nURL Parameters:")
print("-" * 80)
for k in sorted(decoded_params.keys()):
    print(f"  {k:20s} = {decoded_params[k]}")
print("-" * 80)

# Step 4: Validate signature
print("\n[4/5] Validating signature...")

# Method 1: Include everything except signature
all_except_sig = {k: v for k, v in decoded_params.items() if k != "signature"}
sig1_string = "&".join([f"{k}={v}" for k, v in sorted(all_except_sig.items())])
sig1 = hashlib.md5(sig1_string.encode()).hexdigest()

# Method 2: Exclude merchant_key
no_merchant_key = {
    k: v for k, v in decoded_params.items() if k not in ["signature", "merchant_key"]
}
sig2_string = "&".join([f"{k}={v}" for k, v in sorted(no_merchant_key.items())])
sig2 = hashlib.md5(sig2_string.encode()).hexdigest()

# Method 3: Exclude merchant_id AND merchant_key
no_merchant = {
    k: v
    for k, v in decoded_params.items()
    if k not in ["signature", "merchant_key", "merchant_id"]
}
sig3_string = "&".join([f"{k}={v}" for k, v in sorted(no_merchant.items())])
sig3 = hashlib.md5(sig3_string.encode()).hexdigest()

backend_sig = decoded_params["signature"]

print(f"\nBackend signature:           {backend_sig}")
print(f"Test 1 (all fields):         {sig1} {'✅' if sig1 == backend_sig else '❌'}")
print(f"Test 2 (no merchant_key):    {sig2} {'✅' if sig2 == backend_sig else '❌'}")
print(f"Test 3 (no merchant fields): {sig3} {'✅' if sig3 == backend_sig else '❌'}")

# Step 5: Test with PayFast
print("\n[5/5] Testing with PayFast sandbox...")
print("\nAttempting to access PayFast with backend URL...")

# Try to access PayFast and capture the response
try:
    payfast_response = requests.get(payment_url, allow_redirects=False, timeout=10)
    print(f"\nPayFast Response Status: {payfast_response.status_code}")

    if payfast_response.status_code == 200:
        print("✅ PayFast accepted the signature!")
        print("\nThe payment form loaded successfully!")
    else:
        print(f"❌ PayFast returned: {payfast_response.status_code}")
        if "signature" in payfast_response.text.lower():
            print("⚠️  Error mentions 'signature' - signature mismatch!")

            # Try to fix it
            print("\n" + "=" * 80)
            print("ATTEMPTING FIX: Recalculating signature...")
            print("=" * 80)

            # PayFast official method from their docs
            # They use URL encoding for the signature string itself
            import urllib.parse

            # Build data without signature and merchant_key
            fix_data = {
                k: decoded_params[k]
                for k in sorted(decoded_params.keys())
                if k not in ["signature", "merchant_key"]
            }

            # Create string (no URL encoding)
            fix_string = "&".join([f"{k}={v}" for k, v in fix_data.items()])
            fix_sig = hashlib.md5(fix_string.encode()).hexdigest()

            print(f"\nCorrected signature: {fix_sig}")
            print(f"Backend signature:   {backend_sig}")
            print(f"Match: {'✅ YES' if fix_sig == backend_sig else '❌ NO'}")

            if fix_sig != backend_sig:
                # Build corrected URL
                corrected_params = dict(decoded_params)
                corrected_params["signature"] = fix_sig
                corrected_url = f"https://sandbox.payfast.co.za/eng/process?{urllib.parse.urlencode(corrected_params)}"

                print("\n" + "=" * 80)
                print("CORRECTED URL (copy and test in browser):")
                print("=" * 80)
                print(corrected_url)
                print("=" * 80)
        else:
            print("Response preview:")
            print(payfast_response.text[:500])

except requests.exceptions.RequestException as e:
    print(f"❌ Error accessing PayFast: {e}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
print("\nOriginal URL to test:")
print(payment_url)
print("\nOpen this URL in your browser to see the actual PayFast response.")
