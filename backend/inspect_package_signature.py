"""
Inspect the fastapi-payfast package signature generation.
"""

import inspect

from fastapi_payfast.utils import generate_signature

print("=" * 80)
print("FASTAPI-PAYFAST SIGNATURE GENERATION CODE")
print("=" * 80)

source = inspect.getsource(generate_signature)
print(source)

# Test it with our data
print("\n" + "=" * 80)
print("TESTING SIGNATURE GENERATION")
print("=" * 80)

from fastapi_payfast import PayFastPaymentData

payment_data = PayFastPaymentData(
    merchant_id="10000100",
    merchant_key="46f0cd694581a",
    amount=100.00,
    item_name="Test Item",
    return_url="https://www.example.com/success",
    cancel_url="https://www.example.com/cancel",
    notify_url="https://www.example.com/notify",
    name_first="John",
    name_last="Doe",
    email_address="john@example.com",
)

# Convert to dict
data_dict = payment_data.model_dump(exclude_none=True)
print(f"\nPayment data: {data_dict}")

# Generate signature
signature = generate_signature(data_dict, passphrase="")
print(f"\nGenerated signature: {signature}")

# Try with passphrase
signature_with_pass = generate_signature(data_dict, passphrase="jt7NOE43FZPn")
print(f"Signature with passphrase: {signature_with_pass}")
